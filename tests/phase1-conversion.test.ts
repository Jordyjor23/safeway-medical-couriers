import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const conversionSource = readFileSync(path.join(process.cwd(), "lib/applications/conversion.ts"), "utf8");
const actionSource = readFileSync(path.join(process.cwd(), "app/(portal)/dashboard/applicants/actions.ts"), "utf8");
const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("applicant to employee conversion", () => {
  it("relinks existing documents instead of copying blobs", () => {
    expect(conversionSource).toContain("employeeDocument.create");
    expect(conversionSource).toContain("documentId: link.documentId");
    expect(conversionSource).not.toMatch(/storePrivateFile|copyBlob|duplicate.*blob/i);
    expect(conversionSource).toContain("applicant.converted_to_employee");
  });

  it("is idempotent on applicationId", () => {
    expect(conversionSource).toContain("existingConversion");
    expect(conversionSource).toContain("created: false");
    expect(conversionSource).toContain("applicantEmployeeConversion.upsert");
    expect(schema).toContain("model ApplicantEmployeeConversion");
    expect(schema).toContain("applicationId   String      @unique");
  });

  it("is invoked from the HIRED status path", () => {
    expect(actionSource).toContain("convertApplicationToEmployee");
    expect(actionSource).toContain('status === "HIRED"');
    expect(actionSource).not.toContain("prisma.employee.create");
  });

  it("removes the active APPLICANT role after a successful conversion", () => {
    expect(conversionSource).toContain("revokeApplicantRoleAfterHire");
    expect(conversionSource).toContain("applicant.role.revoked_after_hire");
    expect(conversionSource).toContain('where: { key: "APPLICANT" }');
    expect(conversionSource).toContain("userRole.deleteMany");
    expect(conversionSource).not.toMatch(/keep.*APPLICANT|retain.*APPLICANT/i);
  });

  it("prepares signature tables without implementing a provider", () => {
    expect(schema).toContain("model SignatureRequest");
    expect(schema).toContain("model SignatureSigner");
    expect(schema).toContain("model SignatureEvent");
    expect(schema).toContain("providerEnvelopeId");
    const conversionDoesNotSign = !conversionSource.includes("DocuSign") && !conversionSource.includes("Dropbox Sign");
    expect(conversionDoesNotSign).toBe(true);
  });
});

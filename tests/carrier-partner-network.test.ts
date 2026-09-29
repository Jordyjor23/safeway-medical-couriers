import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatScopedId } from "@/lib/ids";

describe("carrier partner network", () => {
  const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const listPage = readFileSync(
    path.join(process.cwd(), "app/(portal)/dashboard/carriers/page.tsx"),
    "utf8",
  );
  const detailPage = readFileSync(
    path.join(process.cwd(), "app/(portal)/dashboard/carriers/[carrierId]/page.tsx"),
    "utf8",
  );
  const actions = readFileSync(
    path.join(process.cwd(), "app/(portal)/dashboard/carriers/actions.ts"),
    "utf8",
  );
  const permissions = readFileSync(path.join(process.cwd(), "lib/permissions.ts"), "utf8");
  const sidebar = readFileSync(
    path.join(process.cwd(), "components/portal/PortalSidebar.tsx"),
    "utf8",
  );

  it("adds durable carrier and contract-assignment models", () => {
    expect(schema).toContain("model CarrierPartner {");
    expect(schema).toContain("model CarrierContractPartner {");
    expect(schema).toContain("@@unique([contractId, carrierPartnerId])");
    expect(schema).toContain("carrierPartners CarrierContractPartner[]");
  });

  it("adds a scoped carrier identifier", () => {
    expect(formatScopedId("CAR", 7)).toBe("SC-CAR-0007");
  });

  it("enforces carrier-partner permissions on the workflow", () => {
    expect(permissions).toContain('"carrierPartners.view"');
    expect(permissions).toContain('"carrierPartners.edit"');
    expect(permissions).toContain('"carrierPartners.manage"');
    expect(listPage).toContain('requirePermission("carrierPartners.view")');
    expect(actions).toContain('requirePermission("carrierPartners.edit")');
    expect(actions).toContain('requirePermission("carrierPartners.manage")');
    expect(sidebar).toContain('href: "/dashboard/carriers"');
  });

  it("tracks compliance readiness and contract capacity", () => {
    for (const field of [
      "w9Received",
      "coiReceived",
      "autoInsuranceVerified",
      "cargoInsuranceVerified",
      "hipaaVerified",
      "bloodbornePathogensVerified",
      "backgroundProcessVerified",
      "agreementStatus",
      "contractAssignments",
    ]) {
      expect(detailPage).toContain(field);
    }
    expect(actions).toContain("carrierContractPartner.upsert");
    expect(actions).toContain("carrierPartner.contract.assigned");
  });
});

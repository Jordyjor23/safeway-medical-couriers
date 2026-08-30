import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");

const forbiddenApplicationFields = [
  "previousSalary",
  "previousHourlyRate",
  "currentSalary",
  "salaryHistory",
  "ssn",
  "socialSecurity",
  "dateOfBirth",
  "date_of_birth",
  "photograph",
  "maritalStatus",
  "pregnancy",
  "childcare",
  "disabilityDiagnosis",
  "religion",
  "sexualOrientation",
  "genderIdentity",
  "geneticInformation",
  "workersCompensation",
];

describe("application schema employment-law guards", () => {
  it("does not store salary history or prohibited demographic fields on Application", () => {
    const applicationBlock = schema.slice(
      schema.indexOf("model Application {"),
      schema.indexOf("model ApplicationEmployment {"),
    );

    for (const field of forbiddenApplicationFields) {
      expect(applicationBlock.toLowerCase()).not.toContain(field.toLowerCase());
    }
  });

  it("keeps SSN off the public application model", () => {
    const applicationBlock = schema.slice(
      schema.indexOf("model Application {"),
      schema.indexOf("model ApplicationEmployment {"),
    );
    expect(applicationBlock).not.toMatch(/ssn/i);
    expect(schema).toContain("encryptedSsn");
  });

  it("extends ManagedDocument instead of replacing it", () => {
    expect(schema).toContain("model ManagedDocument");
    expect(schema).toContain("expirationDate");
    expect(schema).not.toMatch(/model ManagedDocument \{[^}]*expiresAt/);
    expect(schema).toContain("blobKey");
    expect(schema).toContain("model EmployeeDocument");
    expect(schema).toContain("model DeliveryDocument");
    expect(schema).toContain("extractionStatus");
    expect(schema).toContain("OCR_DISABLED");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applicantAccountAlreadyLinked,
  applicantLinkConflicts,
  decideApplicationWrite,
  decideDraftWrite,
  PUBLIC_APPLY_REQUIRES_LOGIN,
  shouldGrantApplicantRole,
} from "@/lib/applications/identity";
import { canAccessApplication, canEditApplications, canReviewApplications } from "@/lib/applications/authorization";
import { canAccessManagedDocument, type DocumentAccessRecord, type DocumentActor } from "@/lib/documents/access";
import { documentMayCountTowardRequirement } from "@/lib/documents/compliance-gate";
import { isExtractionRawTextEncryptionReady, persistExtractionRawText } from "@/lib/documents/extraction/encryption";
import { isExtractionEnabled } from "@/lib/documents/extraction/provider";
import {
  malwareScanIsVerifiedSafe,
  normalizeMalwareScanResult,
  shouldRejectUploadForMalware,
  unconfiguredMalwareScanResult,
} from "@/lib/documents/malware";
import {
  canGrantPermissionToRole,
  hasHrReviewSystemRole,
  PHASE1_RESTRICTED_PERMISSIONS,
} from "@/lib/permissions";

function actor(overrides: { roles: string[]; permissions?: string[]; user?: Partial<DocumentActor["user"]> }): DocumentActor {
  return {
    user: { id: "user-1", employeeId: null, customerId: null, applicantId: null, ...overrides.user },
    roles: overrides.roles,
    permissions: new Set(overrides.permissions ?? []),
  };
}

function document(overrides: Partial<DocumentAccessRecord> = {}): DocumentAccessRecord {
  return {
    id: "doc-1",
    isSensitive: true,
    category: "APPLICANT",
    employeeLinks: [],
    customerLinks: [],
    contractLinks: [],
    deliveryLinks: [],
    applicantLinks: [{ application: { id: "appl-1", applicantId: "app-1" } }],
    ...overrides,
  };
}

describe("public status lookup removal", () => {
  const careersRoute = readFileSync(path.join(process.cwd(), "app/api/careers/applications/route.ts"), "utf8");
  const statusPage = readFileSync(path.join(process.cwd(), "app/(marketing)/careers/status/page.tsx"), "utf8");
  const confirmation = readFileSync(
    path.join(process.cwd(), "app/(marketing)/careers/apply/confirmation/[trackingNumber]/page.tsx"),
    "utf8",
  );

  it("rejects unauthenticated GET status lookup", () => {
    expect(careersRoute).toContain("export async function GET");
    expect(careersRoute).toContain("status: 401");
    expect(careersRoute).not.toContain("searchParams.get(\"tracking\")");
    expect(careersRoute).not.toContain("applicant: { email }");
    expect(statusPage).toContain("/login?next=/applicant/dashboard");
    expect(statusPage).not.toContain("StatusLookupForm");
    expect(confirmation).not.toContain("prisma.application.findFirst");
    expect(confirmation).not.toContain("publicApplicationView");
  });
});

describe("deterministic applicant linkage", () => {
  it("refuses public apply when the email already has a userId", () => {
    expect(applicantAccountAlreadyLinked({ userId: "user-1" })).toBe(true);
    expect(
      decideApplicationWrite({
        mode: "public",
        applicantUserId: "user-1",
        existingForJob: null,
      }),
    ).toEqual({ action: "refuse_login_required", message: PUBLIC_APPLY_REQUIRES_LOGIN });
  });

  it("reuses an existing open application instead of creating a duplicate", () => {
    expect(
      decideApplicationWrite({
        mode: "public",
        existingForJob: { id: "app-1", status: "SUBMITTED" },
      }),
    ).toEqual({ action: "reuse", applicationId: "app-1" });
    expect(
      decideApplicationWrite({
        mode: "authenticated",
        applicantUserId: "user-1",
        existingForJob: { id: "app-2", status: "HIRED" },
      }),
    ).toEqual({ action: "reuse", applicationId: "app-2" });
    expect(
      decideApplicationWrite({
        mode: "authenticated",
        existingForJob: { id: "draft-1", status: "DRAFT" },
      }),
    ).toEqual({ action: "submit_draft", applicationId: "draft-1" });
    expect(decideDraftWrite({ id: "live-1", status: "UNDER_REVIEW" })).toEqual({
      action: "reuse",
      applicationId: "live-1",
    });
  });

  it("does not overwrite another user's applicant link or re-grant APPLICANT after hire", () => {
    expect(applicantLinkConflicts({ userId: "other" }, "me")).toBe(true);
    expect(applicantLinkConflicts({ userId: null }, "me")).toBe(false);
    expect(shouldGrantApplicantRole({ roles: ["EMPLOYEE"], employeeId: "emp-1" })).toBe(false);
    expect(shouldGrantApplicantRole({ roles: ["DRIVER"], employeeId: "emp-2" })).toBe(false);
    expect(shouldGrantApplicantRole({ roles: ["APPLICANT"] })).toBe(false);
    expect(shouldGrantApplicantRole({ roles: [], employeeId: null })).toBe(true);
  });
});

describe("malware scanner fail-safe", () => {
  it("never treats an unconfigured scan as verified safe", () => {
    const skipped = unconfiguredMalwareScanResult();
    expect(skipped.verifiedSafe).toBe(false);
    expect(skipped.clean).toBeNull();
    expect(skipped.status).toBe("UNSCANNED");
    expect(malwareScanIsVerifiedSafe(skipped)).toBe(false);
    expect(shouldRejectUploadForMalware(skipped)).toBe(false);
    expect(malwareScanIsVerifiedSafe({ malwareScanStatus: "UNSCANNED" })).toBe(false);
    expect(
      documentMayCountTowardRequirement({
        documentType: "RESUME",
        verificationStatus: "UNVERIFIED",
        suggestedTypeStatus: "CONFIRMED",
        malwareScanStatus: "UNSCANNED",
        employeeLinks: [{ employeeId: "e1" }],
        customerLinks: [],
        contractLinks: [],
        deliveryLinks: [],
      }),
    ).toBe(false);
  });

  it("normalizes noop/skip engines to UNSCANNED and rejects infected files", () => {
    expect(normalizeMalwareScanResult({ clean: true, engine: "noop", skipped: true, verifiedSafe: true, status: "CLEAN" })).toMatchObject({
      status: "UNSCANNED",
      verifiedSafe: false,
      clean: null,
    });
    const infected = normalizeMalwareScanResult({ clean: false, engine: "clamav", skipped: false, status: "INFECTED" });
    expect(shouldRejectUploadForMalware(infected)).toBe(true);
    expect(malwareScanIsVerifiedSafe(infected)).toBe(false);
    expect(
      documentMayCountTowardRequirement({
        documentType: "DRIVERS_LICENSE",
        verificationStatus: "VERIFIED",
        suggestedTypeStatus: "CONFIRMED",
        malwareScanStatus: "INFECTED",
        employeeLinks: [{ employeeId: "e1" }],
        customerLinks: [],
        contractLinks: [],
        deliveryLinks: [],
      }),
    ).toBe(false);
  });
});

describe("OCR encryption gate", () => {
  afterEach(() => {
    delete process.env.DATA_ENCRYPTION_KEY;
  });

  it("disables extraction in production unless the encryption key is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOCUMENT_EXTRACTION_PROVIDER", "azure");
    vi.stubEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", "https://example.cognitiveservices.azure.com");
    vi.stubEnv("AZURE_DOCUMENT_INTELLIGENCE_KEY", "test-key");
    vi.stubEnv("DATA_ENCRYPTION_KEY", "");
    try {
      expect(isExtractionRawTextEncryptionReady()).toBe(false);
      expect(isExtractionEnabled()).toBe(false);
      expect(persistExtractionRawText("raw OCR dump")).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("custom role Phase 1 guards", () => {
  it("cannot grant applicant or HR document permissions to a custom role", () => {
    for (const permission of PHASE1_RESTRICTED_PERMISSIONS) {
      expect(
        canGrantPermissionToRole({ roleKey: "CONTRACTOR_TEMP", system: false, permission }),
      ).toBe(false);
    }
    expect(canGrantPermissionToRole({ roleKey: "HR_RECRUITER", system: true, permission: "applicants.view" })).toBe(true);
    expect(canGrantPermissionToRole({ roleKey: "OWNER", system: true, permission: "applicants.view" })).toBe(false);
  });

  it("does not let a custom role review applications or applicant documents", () => {
    const custom = actor({
      roles: ["CONTRACTOR_TEMP"],
      permissions: [
        "applicants.view",
        "applicants.edit",
        "documents.view",
        "documents.viewSensitive",
        "documents.verify",
      ],
    });
    expect(hasHrReviewSystemRole(custom.roles)).toBe(false);
    expect(canReviewApplications(custom)).toBe(false);
    expect(canEditApplications(custom)).toBe(false);
    expect(canAccessApplication(custom, { applicantId: "app-1" })).toBe(false);
    expect(canAccessManagedDocument(custom, document(), "view")).toBe(false);
    expect(canAccessManagedDocument(custom, document(), "verify")).toBe(false);
  });

  it("still lets system HR review applicant files", () => {
    const hr = actor({
      roles: ["HR_RECRUITER"],
      permissions: ["applicants.view", "documents.view", "documents.viewSensitive", "documents.verify"],
    });
    expect(canReviewApplications(hr)).toBe(true);
    expect(canAccessManagedDocument(hr, document())).toBe(true);
  });
});

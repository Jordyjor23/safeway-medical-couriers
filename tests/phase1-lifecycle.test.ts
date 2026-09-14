import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { documentReviewState } from "@/lib/documents/review-status";
import { derivedDocumentState } from "@/lib/documents/lifecycle";
import { PHASE1_REQUIREMENT_SEEDS } from "@/lib/compliance/requirements";
import { applicationDraftSchema } from "@/lib/application-schema";

describe("document review states", () => {
  it("maps uploaded, pending, approved, rejected, expiring, and expired", () => {
    expect(documentReviewState(null)).toBe("REQUIRED");
    expect(
      documentReviewState({ lifecycleStatus: "UPLOADED", verificationStatus: "UNVERIFIED" }),
    ).toBe("UPLOADED");
    expect(
      documentReviewState({ lifecycleStatus: "NEEDS_REVIEW", verificationStatus: "UNVERIFIED" }),
    ).toBe("PENDING_REVIEW");
    expect(
      documentReviewState({ lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED" }),
    ).toBe("APPROVED");
    expect(
      documentReviewState({ lifecycleStatus: "REJECTED", verificationStatus: "REJECTED" }),
    ).toBe("REJECTED");
    const now = new Date("2026-09-14T00:00:00Z");
    expect(
      documentReviewState(
        { lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-09-15T00:00:00Z") },
        now,
      ),
    ).toBe("EXPIRING_SOON");
    expect(
      documentReviewState(
        { lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-09-01T00:00:00Z") },
        now,
      ),
    ).toBe("EXPIRED");
  });

  it("still derives expiration instead of storing EXPIRING_SOON as lifecycle", () => {
    expect(
      derivedDocumentState(
        { lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-09-15T00:00:00Z") },
        new Date("2026-09-14T00:00:00Z"),
        [90, 30, 7],
      ),
    ).toBe("EXPIRING_SOON");
  });
});

describe("requirement catalog", () => {
  it("includes HIPAA, BBP, OSHA, DOT, DL, insurance, MVR, and background auth without duplicating keys", () => {
    const keys = PHASE1_REQUIREMENT_SEEDS.map((item) => item.key);
    for (const key of ["hipaa", "bloodborne_pathogens", "osha", "hazmat_awareness", "driver_qualification", "insurance", "mvr_authorization", "background_authorization"]) {
      expect(keys).toContain(key);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("server-side drafts", () => {
  it("accepts a partial draft without acknowledgements", () => {
    const parsed = applicationDraftSchema.safeParse({
      jobPublicId: "job_test",
      legalFirstName: "Ada",
    });
    expect(parsed.success).toBe(true);
  });

  it("does not use localStorage as the authenticated persist path", () => {
    const source = readFileSync(path.join(process.cwd(), "components/careers/ApplicationForm.tsx"), "utf8");
    expect(source).toContain("/api/applicant/applications");
    expect(source).toContain("signedIn");
    expect(source).not.toMatch(/localStorage\.setItem/);
  });
});

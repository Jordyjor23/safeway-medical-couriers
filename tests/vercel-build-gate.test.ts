import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getMigrateOnBuildDecision,
  RUN_MIGRATE_ON_BUILD,
} from "../scripts/vercel-build.mjs";

const SECRET_URL =
  "postgresql://safeway:super-secret-preview@db.example.internal:5432/production";

function decision(
  env: Record<string, string | undefined>,
): ReturnType<typeof getMigrateOnBuildDecision> {
  return getMigrateOnBuildDecision(env);
}

describe("getMigrateOnBuildDecision", () => {
  it("runs migrate + ensure-rbac when VERCEL_ENV=production", () => {
    const result = decision({ VERCEL_ENV: "production" });
    expect(result.run).toBe(true);
    expect(result.log).toContain("VERCEL_ENV=production");
    expect(result.log).toMatch(/migrate deploy/i);
    expect(result.log).toMatch(/ensure-rbac/i);
    expect(result.log).not.toContain(SECRET_URL);
  });

  it("runs migrate + ensure-rbac on Preview when RUN_MIGRATE_ON_BUILD=1", () => {
    const result = decision({
      VERCEL_ENV: "preview",
      [RUN_MIGRATE_ON_BUILD]: "1",
      DATABASE_URL: SECRET_URL,
    });
    expect(result.run).toBe(true);
    expect(result.log).toContain("RUN_MIGRATE_ON_BUILD=1");
    expect(result.log).toMatch(/opt-in/i);
    expect(result.log).not.toContain(SECRET_URL);
    expect(result.log).not.toContain("super-secret-preview");
  });

  it("skips DB writes on Preview without opt-in", () => {
    const result = decision({
      VERCEL_ENV: "preview",
      DATABASE_URL: SECRET_URL,
    });
    expect(result.run).toBe(false);
    expect(result.log).toContain("VERCEL_ENV=preview");
    expect(result.log).toMatch(/Skipping prisma migrate deploy and ensure-rbac/);
    expect(result.log).toMatch(/prisma generate and next build will still run/);
    expect(result.log).not.toContain(SECRET_URL);
    expect(result.log).not.toContain("super-secret-preview");
  });

  it("skips DB writes on Development without opt-in", () => {
    const result = decision({ VERCEL_ENV: "development" });
    expect(result.run).toBe(false);
    expect(result.log).toContain("VERCEL_ENV=development");
    expect(result.log).toMatch(/RUN_MIGRATE_ON_BUILD is not 1/);
  });

  it("skips DB writes when VERCEL_ENV is unset and there is no opt-in (local npm run build)", () => {
    const result = decision({});
    expect(result.run).toBe(false);
    expect(result.log).toContain("VERCEL_ENV is unset");
    expect(result.log).toMatch(/Skipping prisma migrate deploy and ensure-rbac/);
  });

  it("does not treat RUN_MIGRATE_ON_BUILD=true or empty as opt-in", () => {
    expect(
      decision({ VERCEL_ENV: "preview", RUN_MIGRATE_ON_BUILD: "true" }).run,
    ).toBe(false);
    expect(
      decision({ VERCEL_ENV: "preview", RUN_MIGRATE_ON_BUILD: "" }).run,
    ).toBe(false);
    expect(
      decision({ VERCEL_ENV: "preview", RUN_MIGRATE_ON_BUILD: "0" }).run,
    ).toBe(false);
  });

  it("is case-sensitive on VERCEL_ENV=production", () => {
    expect(decision({ VERCEL_ENV: "Production" }).run).toBe(false);
    expect(decision({ VERCEL_ENV: "PRODUCTION" }).run).toBe(false);
  });

  it("prefers Production even if RUN_MIGRATE_ON_BUILD is unset", () => {
    const result = decision({ VERCEL_ENV: "production" });
    expect(result.run).toBe(true);
    expect(result.log).toContain("VERCEL_ENV=production");
    expect(result.log).not.toContain("opt-in");
  });
});

describe("vercel-build.mjs wiring", () => {
  const source = readFileSync(
    path.join(process.cwd(), "scripts/vercel-build.mjs"),
    "utf8",
  );

  it("always runs prisma generate and next build", () => {
    expect(source).toContain('run("npx", ["prisma", "generate"])');
    expect(source).toContain('run("npx", ["next", "build"])');
  });

  it("gates migrate deploy and ensure-rbac behind getMigrateOnBuildDecision", () => {
    expect(source).toContain("getMigrateOnBuildDecision");
    expect(source).toContain("if (decision.run)");
    expect(source).toContain('run("node", ["scripts/migrate-deploy.mjs"])');
    expect(source).toContain('run("npx", ["tsx", "scripts/ensure-rbac.ts"])');

    const generateAt = source.indexOf('run("npx", ["prisma", "generate"])');
    const decisionAt = source.indexOf("const decision = getMigrateOnBuildDecision()");
    const migrateAt = source.indexOf(
      'run("node", ["scripts/migrate-deploy.mjs"])',
    );
    const rbacAt = source.indexOf(
      'run("npx", ["tsx", "scripts/ensure-rbac.ts"])',
    );
    const nextAt = source.indexOf('run("npx", ["next", "build"])');

    expect(generateAt).toBeGreaterThan(-1);
    expect(decisionAt).toBeGreaterThan(generateAt);
    expect(migrateAt).toBeGreaterThan(decisionAt);
    expect(rbacAt).toBeGreaterThan(migrateAt);
    expect(nextAt).toBeGreaterThan(rbacAt);
  });

  it("does not print connection string env values", () => {
    expect(source).not.toMatch(/console\.(log|error|info).*DATABASE_URL/);
    expect(source).not.toMatch(/console\.(log|error|info).*DIRECT_URL/);
  });
});

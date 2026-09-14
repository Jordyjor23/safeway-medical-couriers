import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isPostgresUrl,
  migrateUrlError,
  MIGRATE_URL_SOURCES,
  resolveMigrateUrl,
} from "../scripts/migrate-deploy.mjs";

const schema = readFileSync(
  path.join(process.cwd(), "prisma/schema.prisma"),
  "utf8",
);

describe("migrate URL resolution", () => {
  it("prefers DIRECT_URL, then DATABASE_URL_UNPOOLED, then DATABASE_URL", () => {
    expect(MIGRATE_URL_SOURCES).toEqual([
      "DIRECT_URL",
      "DATABASE_URL_UNPOOLED",
      "DATABASE_URL",
    ]);

    expect(
      resolveMigrateUrl({
        DIRECT_URL: "postgresql://direct",
        DATABASE_URL_UNPOOLED: "postgresql://unpooled",
        DATABASE_URL: "postgresql://pooled",
      }),
    ).toEqual({ source: "DIRECT_URL", value: "postgresql://direct" });

    expect(
      resolveMigrateUrl({
        DATABASE_URL_UNPOOLED: "postgresql://unpooled",
        DATABASE_URL: "postgresql://pooled",
      }),
    ).toEqual({
      source: "DATABASE_URL_UNPOOLED",
      value: "postgresql://unpooled",
    });

    expect(
      resolveMigrateUrl({
        DATABASE_URL: "postgresql://pooled",
      }),
    ).toEqual({ source: "DATABASE_URL", value: "postgresql://pooled" });
  });

  it("skips empty sources and still selects the first non-empty var even if it is invalid", () => {
    expect(
      resolveMigrateUrl({
        DIRECT_URL: "   ",
        DATABASE_URL_UNPOOLED: "not-postgres",
        DATABASE_URL: "postgresql://pooled",
      }),
    ).toEqual({ source: "DATABASE_URL_UNPOOLED", value: "not-postgres" });
  });

  it("returns null when no migrate URL is set", () => {
    expect(resolveMigrateUrl({})).toBeNull();
    expect(migrateUrlError(null)).toContain("DIRECT_URL");
    expect(migrateUrlError(null)).toContain("DATABASE_URL_UNPOOLED");
    expect(migrateUrlError(null)).toContain("DATABASE_URL");
  });
});

describe("migrate URL validation", () => {
  it("accepts postgresql:// and postgres://", () => {
    expect(isPostgresUrl("postgresql://safeway@localhost:5432/safeway")).toBe(
      true,
    );
    expect(isPostgresUrl("postgres://safeway@localhost:5432/safeway")).toBe(
      true,
    );
  });

  it("rejects non-postgres values and names the chosen env var without echoing the secret", () => {
    const secret = "mysql://user:super-secret@host/db";
    const message = migrateUrlError({
      source: "DIRECT_URL",
      value: secret,
    });

    expect(message).toContain("DIRECT_URL");
    expect(message).toContain("postgresql://");
    expect(message).toContain("postgres://");
    expect(message).toMatch(/wrapping quotes/i);
    expect(message).not.toContain(secret);
    expect(message).not.toContain("super-secret");
  });

  it("rejects quoted Postgres URLs so wrapping quotes fail before Prisma P1012", () => {
    const quoted = '"postgresql://safeway:secret@localhost:5432/safeway"';
    const message = migrateUrlError({
      source: "DATABASE_URL",
      value: quoted,
    });

    expect(isPostgresUrl(quoted)).toBe(false);
    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("secret");
    expect(message).not.toContain(quoted);
  });
});

describe("migrate-deploy script error output", () => {
  it("exits before prisma when DIRECT_URL is not a Postgres URL", () => {
    const secret = "https://not-a-postgres-url.example/secret-token";
    const result = spawnSync(process.execPath, ["scripts/migrate-deploy.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        DIRECT_URL: secret,
        DATABASE_URL_UNPOOLED: "postgresql://unused",
        DATABASE_URL: "postgresql://unused",
      },
    });

    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain("DIRECT_URL");
    expect(output).toMatch(/postgresql:\/\/|postgres:\/\//);
    expect(output).toMatch(/wrapping quotes/i);
    expect(output).not.toContain(secret);
    expect(output).not.toContain("secret-token");
    expect(output).not.toMatch(/P1012/);
  });
});

describe("prisma schema datasource", () => {
  it("keeps url = env(\"DATABASE_URL\") and does not hardcode a connection string", () => {
    expect(schema).toMatch(/url\s+=\s+env\("DATABASE_URL"\)/);
    expect(schema).not.toMatch(/directUrl/);
    expect(schema).not.toMatch(/url\s+=\s+"postgres(ql)?:\/\//);
  });
});

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {readonly ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "DATABASE_URL"]} */
export const MIGRATE_URL_SOURCES = [
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "DATABASE_URL",
];

/**
 * Prefer DIRECT_URL, then Neon’s DATABASE_URL_UNPOOLED, then DATABASE_URL.
 * The first non-empty source wins, even if its value is not a Postgres URL.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ source: (typeof MIGRATE_URL_SOURCES)[number], value: string } | null}
 */
export function resolveMigrateUrl(env = process.env) {
  for (const source of MIGRATE_URL_SOURCES) {
    const value = env[source];
    if (typeof value === "string" && value.trim() !== "") {
      return { source, value };
    }
  }
  return null;
}

/** @param {string} value */
export function isPostgresUrl(value) {
  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}

/**
 * @param {{ source: string, value: string } | null} resolved
 * @returns {string | null} Error message, or null when the URL is usable.
 */
export function migrateUrlError(resolved) {
  if (!resolved) {
    return "A Postgres connection URL is required for prisma migrate deploy. Set DIRECT_URL, DATABASE_URL_UNPOOLED, or DATABASE_URL.";
  }
  if (!isPostgresUrl(resolved.value)) {
    return `${resolved.source} must be a Postgres URL starting with postgresql:// or postgres://, with no wrapping quotes.`;
  }
  return null;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function main() {
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));

  const resolved = resolveMigrateUrl();
  const error = migrateUrlError(resolved);
  if (error || !resolved) {
    console.error(error);
    process.exit(1);
  }

  console.log(
    "Running prisma migrate deploy (pending migrations only; does not reset, seed, or delete data).",
  );
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: resolved.value },
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}

const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === path.resolve(entry)) {
  main();
}

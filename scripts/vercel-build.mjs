import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Explicit opt-in for Preview/Development/local builds. Production does not need this. */
export const RUN_MIGRATE_ON_BUILD = "RUN_MIGRATE_ON_BUILD";

/**
 * Decide whether this Vercel/local build may run prisma migrate deploy + ensure-rbac.
 * Always keep prisma generate and next build outside this gate.
 *
 * Safe to run mutations when:
 * - VERCEL_ENV === "production" (Production deploys), or
 * - RUN_MIGRATE_ON_BUILD=1 (explicit opt-in against a dedicated database)
 *
 * Preview/Development without opt-in must not mutate a shared Production DB.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {{ run: boolean, log: string }}
 */
export function getMigrateOnBuildDecision(env = process.env) {
  if (env.VERCEL_ENV === "production") {
    return {
      run: true,
      log: "Running prisma migrate deploy and ensure-rbac because VERCEL_ENV=production.",
    };
  }

  if (env[RUN_MIGRATE_ON_BUILD] === "1") {
    return {
      run: true,
      log: "Running prisma migrate deploy and ensure-rbac because RUN_MIGRATE_ON_BUILD=1 (explicit opt-in). Use this only against a dedicated non-production Neon database or branch — never Production DATABASE_URL.",
    };
  }

  const vercelEnv = env.VERCEL_ENV;
  const envLabel =
    typeof vercelEnv === "string" && vercelEnv.trim() !== ""
      ? `VERCEL_ENV=${vercelEnv}`
      : "VERCEL_ENV is unset";

  return {
    run: false,
    log: `Skipping prisma migrate deploy and ensure-rbac (${envLabel}; RUN_MIGRATE_ON_BUILD is not 1). prisma generate and next build will still run. Preview/Development builds must not mutate Production. Point Preview at a separate Neon database or branch, or set RUN_MIGRATE_ON_BUILD=1 only for that isolated database.`,
  };
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

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));

  console.log("Generating Prisma client…");
  run("npx", ["prisma", "generate"]);

  const decision = getMigrateOnBuildDecision();
  console.log(decision.log);
  if (decision.run) {
    console.log("Applying database migrations…");
    run("node", ["scripts/migrate-deploy.mjs"]);
    console.log("Ensuring additive RBAC permission keys…");
    run("npx", ["tsx", "scripts/ensure-rbac.ts"]);
    console.log("Ensuring additive portal reference data…");
    run("npx", ["tsx", "scripts/ensure-reference-data.ts"]);
  }

  console.log("Building Next.js…");
  run("npx", ["next", "build"]);
}

const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === path.resolve(entry)) {
  main();
}

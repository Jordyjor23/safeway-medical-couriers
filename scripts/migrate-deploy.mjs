import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const migrateUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!migrateUrl) {
  console.error("DATABASE_URL is required for prisma migrate deploy.");
  process.exit(1);
}

console.log(
  "Running prisma migrate deploy (pending migrations only; does not reset, seed, or delete data).",
);
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: root,
  env: { ...process.env, DATABASE_URL: migrateUrl },
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);

import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";

export function createTrackingNumber(now = new Date()) {
  const year = now.getUTCFullYear();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[randomInt(alphabet.length)];
  }
  return `SWC-${year}-${suffix}`;
}

export function createPublicJobId() {
  return `job_${randomBytes(6).toString("hex")}`;
}

export function createEmployeeNumber(now = new Date()) {
  const year = String(now.getUTCFullYear()).slice(-2);
  return `SC-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function createContractNumber(now = new Date()) {
  const year = now.getUTCFullYear();
  return `CTR-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function createActivationToken() {
  return randomBytes(32).toString("hex");
}

export function createTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + numbers + symbols;
  const required = [
    upper[randomInt(upper.length)],
    lower[randomInt(lower.length)],
    numbers[randomInt(numbers.length)],
    symbols[randomInt(symbols.length)],
  ];
  while (required.length < 16) {
    required.push(all[randomInt(all.length)]);
  }
  for (let i = required.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }
  return required.join("");
}

export function formatScopedId(kind: "EMP" | "DRV" | "CLI" | "DLV", value: number) {
  const prefix =
    kind === "EMP" ? "SC-EMP" : kind === "DRV" ? "SC-DRV" : kind === "CLI" ? "SC-CLI" : "SC-DLV";
  return `${prefix}-${String(value).padStart(4, "0")}`;
}

export async function nextScopedId(kind: "EMP" | "DRV" | "CLI" | "DLV") {
  const row = await prisma.idSequence.upsert({
    where: { key: kind },
    update: { value: { increment: 1 } },
    create: { key: kind, value: 1 },
  });
  return formatScopedId(kind, row.value);
}

export async function allocateUsername(firstName: string, lastName: string) {
  const first = firstName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const last = lastName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const base = `${first.slice(0, 1)}${last}`.slice(0, 24) || "user";
  let candidate = base;
  let n = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}

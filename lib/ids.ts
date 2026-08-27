import { randomBytes, randomInt } from "node:crypto";

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

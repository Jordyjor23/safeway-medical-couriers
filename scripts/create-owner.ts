import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  const { auth } = await import("../lib/auth");
  const { prisma } = await import("../lib/db");

  const email = (process.env.OWNER_BOOTSTRAP_EMAIL ?? "owner@safewaycouriers.com").toLowerCase();
  const password = process.env.OWNER_BOOTSTRAP_PASSWORD ?? "";
  const name = process.env.OWNER_BOOTSTRAP_NAME ?? "Owner";
  const setupSecret = process.env.OWNER_SETUP_SECRET ?? "";

  if (!password) {
    throw new Error("OWNER_BOOTSTRAP_PASSWORD is not set in .env.local");
  }
  if (!setupSecret) {
    throw new Error("OWNER_SETUP_SECRET is not set in .env.local");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const { hashPassword } = await import("better-auth/crypto");
    const passwordHash = await hashPassword(password);
    await prisma.account.updateMany({
      where: { userId: existing.id, providerId: "credential" },
      data: { password: passwordHash },
    });
    const ownerRole = await prisma.role.findUnique({ where: { key: "OWNER" } });
    if (ownerRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: existing.id, roleId: ownerRole.id } },
        update: {},
        create: { userId: existing.id, roleId: ownerRole.id },
      });
    }
    console.log(`Owner password updated: ${email}`);
    return;
  }

  const headers = new Headers();
  headers.set("x-owner-setup", setupSecret);

  const result = await auth.api.signUpEmail({
    body: { name, email, password },
    headers,
  });

  if (!result || !("user" in result) || !result.user) {
    throw new Error("Could not create the owner account.");
  }

  const ownerRole = await prisma.role.findUnique({ where: { key: "OWNER" } });
  if (!ownerRole) {
    throw new Error("Roles have not been seeded. Run prisma db seed first.");
  }

  await prisma.userRole.create({
    data: { userId: result.user.id, roleId: ownerRole.id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: result.user.id,
      actorEmail: result.user.email,
      action: "owner.setup",
      targetType: "user",
      targetId: result.user.id,
    },
  });

  console.log(`Owner account created: ${email}`);
}

main()
  .then(async () => {
    const { prisma } = await import("../lib/db");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    try {
      const { prisma } = await import("../lib/db");
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });

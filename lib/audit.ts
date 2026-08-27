import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const headerList = await headers().catch(() => null);
  const ip =
    input.ipAddress ??
    headerList?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList?.get("x-real-ip") ??
    null;
  const userAgent = input.userAgent ?? headerList?.get("user-agent") ?? null;

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      ipAddress: ip,
      userAgent,
    },
  });
}

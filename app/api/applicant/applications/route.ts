import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { saveApplicantDraft, submitApplicantApplication } from "@/lib/applications/service";
import { applicantSafeStatusLabel } from "@/lib/applications/status";
import { requireApiAuth } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function clientMeta() {
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "unknown",
    userAgent: headerList.get("user-agent"),
  };
}

export async function GET() {
  const { error, ctx } = await requireApiAuth();
  if (error || !ctx) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.roles.includes("APPLICANT") && !ctx.permissions.has("applicants.view")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!ctx.user.applicantId) {
    return NextResponse.json({ applications: [] });
  }
  const applications = await prisma.application.findMany({
    where: { applicantId: ctx.user.applicantId },
    include: { jobOpening: { select: { title: true, publicId: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    applications: applications.map((application) => ({
      id: application.id,
      trackingNumber: application.trackingNumber,
      status: application.status,
      statusLabel: applicantSafeStatusLabel(application.status),
      jobTitle: application.jobOpening.title,
      jobPublicId: application.jobOpening.publicId,
      submittedAt: application.submittedAt,
    })),
  });
}

export async function POST(request: Request) {
  const { error, ctx } = await requireApiAuth();
  if (error || !ctx) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.roles.includes("APPLICANT") && !ctx.permissions.has("applicants.self.edit")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const submit = Boolean(body && typeof body === "object" && (body as { submit?: boolean }).submit);
  const payload = body && typeof body === "object" ? { ...(body as Record<string, unknown>) } : null;
  if (payload) delete payload.submit;
  const meta = await clientMeta();
  const result = submit
    ? await submitApplicantApplication({ userId: ctx.user.id, payload, ...meta })
    : await saveApplicantDraft({ userId: ctx.user.id, payload });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  return POST(request);
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { submitLegacyPublicApplication } from "@/lib/applications/service";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

async function clientIp() {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  const ip = await clientIp();
  const userAgent = (await headers()).get("user-agent");

  const recent = await prisma.application.count({
    where: {
      ipAddress: ip,
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
  if (recent >= 5) {
    return NextResponse.json({ error: "Too many applications from this network. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const result = await submitLegacyPublicApplication({
    payload: body,
    ipAddress: ip,
    userAgent,
  });
  if ("error" in result) {
    return NextResponse.json(
      {
        error: result.error,
        loginRequired: "loginRequired" in result ? result.loginRequired : undefined,
        loginUrl: "loginRequired" in result && result.loginRequired ? "/login?next=/applicant/dashboard" : undefined,
      },
      { status: result.status },
    );
  }

  if (!result.reused) {
    try {
      await sendTransactionalEmail({
        to: result.applicantEmail,
        subject: `Application received — ${result.jobTitle}`,
        html: `<p>Hello ${result.applicantName},</p>
<p>Safeway Couriers received your application for ${result.jobTitle}.</p>
<p>Reference number: <strong>${result.application.trackingNumber}</strong></p>
<p>Create an account or sign in at ${site.url}/register to view status, drafts, and documents. Unauthenticated status lookup is no longer available.</p>`,
      });
    } catch {
      // Email is best-effort; the application is already stored.
    }
  }

  return NextResponse.json({
    application: result.application,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Sign in to view your application status. Unauthenticated lookup is no longer available.",
      loginUrl: "/login?next=/applicant/dashboard",
    },
    { status: 401 },
  );
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { registerApplicantAccount } from "@/lib/applicant-account";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const result = await registerApplicantAccount({
    email: String((body as { email?: string }).email ?? ""),
    password: String((body as { password?: string }).password ?? ""),
    legalFirstName: String((body as { legalFirstName?: string }).legalFirstName ?? ""),
    legalLastName: String((body as { legalLastName?: string }).legalLastName ?? ""),
    phone: String((body as { phone?: string }).phone ?? ""),
    city: String((body as { city?: string }).city ?? ""),
    state: String((body as { state?: string }).state ?? ""),
    zip: String((body as { zip?: string }).zip ?? ""),
    preferredName: String((body as { preferredName?: string }).preferredName ?? ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const headerList = await headers();
  await auth.api.signInEmail({
    body: {
      email: result.email,
      password: String((body as { password?: string }).password ?? ""),
    },
    headers: headerList,
  });

  return NextResponse.json({ ok: true, applicantId: result.applicantId });
}

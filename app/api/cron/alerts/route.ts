import { NextResponse } from "next/server";
import { createExpirationNotifications } from "@/lib/expiration-alerts";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await createExpirationNotifications();
  return NextResponse.json(result);
}

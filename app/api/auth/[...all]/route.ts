import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

function requireRuntimeAuthSecret() {
  if (process.env.VERCEL === "1" && !process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required on Vercel.");
  }
}

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  requireRuntimeAuthSecret();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  requireRuntimeAuthSecret();
  return handlers.POST(request);
}

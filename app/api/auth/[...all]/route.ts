import { auth } from "@/lib/auth";
import { assertRuntimeAuthSecret } from "@/lib/auth-secret";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  assertRuntimeAuthSecret();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  assertRuntimeAuthSecret();
  return handlers.POST(request);
}

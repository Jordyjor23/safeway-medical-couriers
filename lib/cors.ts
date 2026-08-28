import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/app-url";

export function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = new Headers();
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

export function withCors(request: NextRequest, response: NextResponse) {
  const extra = corsHeaders(request);
  extra.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export function corsPreflight(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return new NextResponse(null, { status: 204 });
  }
  if (!isAllowedOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

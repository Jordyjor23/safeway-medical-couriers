import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import {
  isLocalHostname,
  isMarketingHostname,
  isPortalPath,
  isProtectedPortalPath,
  isVercelPreviewHost,
  portalHost,
} from "@/lib/app-url";
import { corsPreflight, withCors } from "@/lib/cors";

function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  const https =
    request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  if (https) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.nextUrl.hostname;
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (
    !isLocalHostname(hostname) &&
    !isVercelPreviewHost(hostname) &&
    forwardedProto === "http"
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    httpsUrl.port = "";
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    if (forwardedHost && !isLocalHostname(forwardedHost.split(":")[0] ?? "")) {
      httpsUrl.host = forwardedHost;
    }
    return NextResponse.redirect(httpsUrl, 308);
  }

  if (
    isMarketingHostname(hostname) &&
    isPortalPath(pathname) &&
    !isLocalHostname(hostname)
  ) {
    const destination = request.nextUrl.clone();
    destination.protocol = "https:";
    destination.hostname = portalHost();
    destination.port = "";
    return NextResponse.redirect(destination, 308);
  }

  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return applySecurityHeaders(request, corsPreflight(request));
  }

  const sessionCookie = getSessionCookie(request);

  if (hostname === portalHost() && pathname === "/") {
    const destination = sessionCookie ? "/portal" : "/login";
    return applySecurityHeaders(request, NextResponse.redirect(new URL(destination, request.url)));
  }

  if (isProtectedPortalPath(pathname) && !sessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return applySecurityHeaders(request, NextResponse.redirect(login));
  }

  if (pathname === "/login" && sessionCookie) {
    return applySecurityHeaders(request, NextResponse.redirect(new URL("/portal", request.url)));
  }

  if (pathname === "/setup" && sessionCookie) {
    return applySecurityHeaders(request, NextResponse.redirect(new URL("/portal", request.url)));
  }

  const response = NextResponse.next();
  if (pathname.startsWith("/api/")) {
    withCors(request, response);
  }
  return applySecurityHeaders(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

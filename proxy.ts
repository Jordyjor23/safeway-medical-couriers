import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/portal",
  "/owner",
  "/admin",
  "/operations",
  "/dispatch",
  "/driver",
  "/employee",
  "/customer",
  "/set-password",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);
  const protectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (protectedPath && !sessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/login" && sessionCookie) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  if (pathname === "/setup" && sessionCookie) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/portal",
    "/owner/:path*",
    "/admin/:path*",
    "/operations/:path*",
    "/dispatch/:path*",
    "/driver/:path*",
    "/employee/:path*",
    "/customer/:path*",
    "/set-password",
    "/login",
    "/setup",
  ],
};

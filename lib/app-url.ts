function stripSlash(value: string) {
  return value.replace(/\/$/, "");
}

function fromHost(host: string, protocol = "https") {
  return `${protocol}://${host.replace(/^https?:\/\//, "")}`;
}

const LOCAL_DEV_ORIGIN = "http://localhost:3000";

export const PRODUCTION_PORTAL_HOST = "portal.safewaycouriers.com";
export const PRODUCTION_PORTAL_ORIGIN = `https://${PRODUCTION_PORTAL_HOST}`;
export const PRODUCTION_MARKETING_HOSTS = ["www.safewaycouriers.com", "safewaycouriers.com"] as const;

export function isProductionDeploy() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

/** Public origin for auth, emails, and redirects. Localhost is a development-only fallback. */
export function appOrigin() {
  const configured =
    process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return stripSlash(configured);
  if (process.env.VERCEL_URL) return fromHost(process.env.VERCEL_URL);
  if (process.env.VERCEL === "1") return PRODUCTION_PORTAL_ORIGIN;
  return LOCAL_DEV_ORIGIN;
}

export function portalHost() {
  return process.env.PORTAL_HOST || PRODUCTION_PORTAL_HOST;
}

export function allowedOrigins() {
  const extras = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => stripSlash(value.trim()))
    .filter(Boolean);
  return Array.from(
    new Set(
      [
        appOrigin(),
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.NEXT_PUBLIC_SITE_URL,
        PRODUCTION_PORTAL_ORIGIN,
        "https://www.safewaycouriers.com",
        "https://safewaycouriers.com",
        ...extras,
        process.env.NODE_ENV !== "production" ? LOCAL_DEV_ORIGIN : null,
      ]
        .filter(Boolean)
        .map((value) => stripSlash(value as string)),
    ),
  );
}

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  return allowedOrigins().includes(stripSlash(origin));
}

export function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isMarketingHostname(hostname: string) {
  return (PRODUCTION_MARKETING_HOSTS as readonly string[]).includes(hostname);
}

export function isVercelPreviewHost(hostname: string) {
  return hostname.endsWith(".vercel.app");
}

const PORTAL_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/activate",
  "/setup",
  "/two-factor",
  "/set-password",
  "/dashboard",
  "/portal",
  "/owner",
  "/admin",
  "/operations",
  "/dispatch",
  "/driver",
  "/employee",
  "/customer",
  "/api/auth",
  "/api/portal",
];

export function isPortalPath(pathname: string) {
  return PORTAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isProtectedPortalPath(pathname: string) {
  return [
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
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

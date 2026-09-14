export const REQUEST_PATHNAME_HEADER = "x-safeway-pathname";

export function isTwoFactorSetupPath(pathname: string) {
  return pathname === "/dashboard/security" || pathname.startsWith("/dashboard/security/");
}

export function isPasswordChangePath(pathname: string) {
  return pathname === "/set-password" || pathname.startsWith("/set-password/");
}

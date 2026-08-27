const SPECIAL = /[^A-Za-z0-9]/;

export function passwordIssues(password: string) {
  const issues: string[] = [];
  if (password.length < 12) issues.push("Use at least 12 characters.");
  if (!/[a-z]/.test(password)) issues.push("Include a lowercase letter.");
  if (!/[A-Z]/.test(password)) issues.push("Include an uppercase letter.");
  if (!/[0-9]/.test(password)) issues.push("Include a number.");
  if (!SPECIAL.test(password)) issues.push("Include a symbol.");
  return issues;
}

export function isStrongPassword(password: string) {
  return passwordIssues(password).length === 0;
}

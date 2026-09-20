const marketingBase = (process.env.SMOKE_MARKETING_URL || process.argv[2] || "https://www.safewaycouriers.com").replace(/\/$/, "");
const portalBase = (process.env.SMOKE_PORTAL_URL || process.argv[3] || "https://portal.safewaycouriers.com").replace(/\/$/, "");

const failures = [];

async function check(url, options = {}) {
  const response = await fetch(url, {
    redirect: options.redirect ?? "follow",
    headers: { "user-agent": "SafewayReadOnlySmoke/1.0" },
  });
  const expected = options.expected ?? ((status) => status >= 200 && status < 400);
  if (!expected(response.status, response)) {
    failures.push(`${url} returned ${response.status}`);
  }
  return response;
}

for (const path of ["/", "/careers", "/drivers", "/careers/status", "/careers/accessibility", "/careers/privacy", "/privacy", "/terms", "/contact"]) {
  await check(marketingBase + path);
}

await check(portalBase + "/login");
await check(portalBase + "/forgot-password");

for (const path of ["/opengraph-image", "/driver-recruiting-share-v2.png", "/driver-recruiting-share-v3.png"]) {
  const response = await check(marketingBase + path);
  const type = response.headers.get("content-type") || "";
  if (response.ok && path.endsWith(".png") && !type.includes("image/png")) {
    failures.push(`${marketingBase}${path} returned ${type || "no content type"} instead of image/png`);
  }
}

for (const path of [
  "/dashboard",
  "/dashboard/roles",
  "/dashboard/users",
  "/dashboard/applicants",
  "/dashboard/interviews",
  "/dashboard/jobs",
  "/dashboard/employees",
  "/dashboard/workforce",
  "/dashboard/payroll",
  "/dashboard/documents",
  "/dashboard/compliance",
  "/dashboard/customers",
  "/dashboard/contracts",
  "/dashboard/notifications",
  "/dashboard/settings",
  "/dashboard/security",
]) {
  const response = await check(portalBase + path, {
    redirect: "manual",
    expected: (status) => [301, 302, 303, 307, 308].includes(status),
  });
  const location = response.headers.get("location") || "";
  if (!location.includes("/login")) {
    failures.push(`${portalBase}${path} did not redirect unauthenticated traffic to /login`);
  }
}

const root = await check(portalBase + "/", {
  redirect: "manual",
  expected: (status) => [301, 302, 303, 307, 308].includes(status),
});
if (root.headers.get("location") && !root.headers.get("location").includes("/login")) {
  failures.push(`${portalBase}/ redirected somewhere other than /login`);
}

const dashboard = await check(portalBase + "/dashboard", {
  redirect: "manual",
  expected: (status) => [301, 302, 303, 307, 308].includes(status),
});
if (dashboard.headers.get("location") && !dashboard.headers.get("location").includes("/login")) {
  failures.push(`${portalBase}/dashboard did not redirect unauthenticated traffic to /login`);
}

if (failures.length) {
  console.error("Read-only smoke failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Read-only smoke passed.");

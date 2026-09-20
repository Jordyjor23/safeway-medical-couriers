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

for (const path of ["/", "/careers", "/careers/accessibility", "/careers/privacy", "/privacy", "/terms", "/contact"]) {
  await check(marketingBase + path);
}

await check(portalBase + "/login");
await check(portalBase + "/forgot-password");

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

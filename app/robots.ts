import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/login",
        "/setup",
        "/forgot-password",
        "/reset-password",
        "/two-factor",
        "/activate",
        "/set-password",
        "/portal",
        "/owner",
        "/admin",
        "/operations",
        "/dispatch",
        "/driver",
        "/employee",
        "/customer",
        "/api/",
      ],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}

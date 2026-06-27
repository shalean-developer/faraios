import type { MetadataRoute } from "next";

import { getMainAppDomain } from "@/lib/services/websites";

const DISALLOW_PATHS = [
  "/admin/",
  "/auth/",
  "/app/",
  "/onboarding/",
  "/book/",
  "/preview/",
  "/api/",
  "/*/dashboard/",
];

export default function robots(): MetadataRoute.Robots {
  const appHost = getMainAppDomain();
  const sitemap = appHost ? [`https://${appHost}/sitemap.xml`] : [];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW_PATHS,
    },
    sitemap,
  };
}

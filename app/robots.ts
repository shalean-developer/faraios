import type { MetadataRoute } from "next";

import { getMainAppDomain } from "@/lib/services/websites";

export default function robots(): MetadataRoute.Robots {
  const appHost = getMainAppDomain();
  const sitemap = appHost ? [`https://${appHost}/sitemap.xml`] : [];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap,
  };
}

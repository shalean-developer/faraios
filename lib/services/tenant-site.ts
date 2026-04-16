import { headers } from "next/headers";
import type { Metadata } from "next";

import { getDomain } from "@/lib/getDomain";
import {
  getWebsiteByDomain,
  getWebsiteContentByWebsiteId,
  isMainHost,
} from "@/lib/services/websites";
import type { WebsiteContent } from "@/types/database";

export type TenantPageKind = "home" | "services" | "about" | "contact";

export async function getTenantContext() {
  const requestHeaders = await headers();
  const host = getDomain(requestHeaders);
  const mainHost = isMainHost(host);
  if (mainHost) {
    return { host, mainHost: true as const, website: null, content: [] as WebsiteContent[] };
  }

  const website = await getWebsiteByDomain(host);
  if (!website) {
    return { host, mainHost: false as const, website: null, content: [] as WebsiteContent[] };
  }

  const content = await getWebsiteContentByWebsiteId(website.id);
  return { host, mainHost: false as const, website, content };
}

export async function getTenantMetadata(kind: TenantPageKind): Promise<Metadata> {
  const ctx = await getTenantContext();
  if (ctx.mainHost || !ctx.website) {
    return {};
  }

  const suffix =
    kind === "home" ? "" : ` | ${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
  const title = `${ctx.website.seo_title || ctx.website.name}${suffix}`;
  const description = ctx.website.seo_description || undefined;
  const keywords = ctx.website.seo_keywords
    ? ctx.website.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : undefined;
  const image = ctx.website.og_image || undefined;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: image ? [image] : [],
      type: "website",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

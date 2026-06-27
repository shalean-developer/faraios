import type { Metadata } from "next";

import type { Website } from "@/types/database";

type TenantWebsiteSeo = Pick<
  Website,
  "name" | "seo_title" | "seo_description" | "og_title" | "og_description" | "og_image"
>;

export function buildTenantSocialMetadata(input: {
  website: TenantWebsiteSeo;
  title: string;
  description?: string;
  image?: string | null;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const { website, title, description, image } = input;
  const ogTitle = website.og_title?.trim() || title;
  const ogDescription = website.og_description?.trim() || description;
  const ogImage = image ?? website.og_image ?? undefined;

  return {
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : [],
      type: "website",
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

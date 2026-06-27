import type { Metadata } from "next";

import {
  HERO_HEADLINE,
  HERO_SUBHEADLINE,
} from "@/lib/data/home-marketing";

export const FARAIOS_SITE_NAME = "FaraiOS";

export const FARAIOS_DEFAULT_TITLE = `FaraiOS — ${HERO_HEADLINE}`;

export const FARAIOS_DEFAULT_DESCRIPTION = HERO_SUBHEADLINE;

export const FARAIOS_OG_IMAGE_PATH = "/og-image.png";

/** Public marketing routes indexed on the main FaraiOS host. */
export const FARAIOS_MARKETING_PATHS = [
  "/",
  "/features",
  "/pricing",
  "/industries",
  "/hosting",
  "/marketplace",
  "/platform/about",
  "/platform/contact",
  "/terms",
  "/privacy",
] as const;

export function getPlatformMetadataBase(): URL | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return undefined;
  try {
    return new URL(appUrl);
  } catch {
    return undefined;
  }
}

export function buildPlatformOpenGraph(overrides?: {
  title?: string;
  description?: string;
  path?: string;
}): NonNullable<Metadata["openGraph"]> {
  const base = getPlatformMetadataBase();
  const title = overrides?.title ?? FARAIOS_DEFAULT_TITLE;
  const description = overrides?.description ?? FARAIOS_DEFAULT_DESCRIPTION;
  const url =
    base && overrides?.path ? new URL(overrides.path, base).href : base?.href;

  return {
    type: "website",
    siteName: FARAIOS_SITE_NAME,
    title,
    description,
    url,
    images: [
      {
        url: FARAIOS_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: FARAIOS_SITE_NAME,
      },
    ],
  };
}

export function buildPlatformTwitter(overrides?: {
  title?: string;
  description?: string;
}): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: overrides?.title ?? FARAIOS_DEFAULT_TITLE,
    description: overrides?.description ?? FARAIOS_DEFAULT_DESCRIPTION,
    images: [FARAIOS_OG_IMAGE_PATH],
  };
}

export const PLATFORM_ROOT_METADATA: Metadata = {
  metadataBase: getPlatformMetadataBase(),
  title: {
    default: FARAIOS_DEFAULT_TITLE,
    template: "%s",
  },
  description: FARAIOS_DEFAULT_DESCRIPTION,
  openGraph: buildPlatformOpenGraph(),
  twitter: buildPlatformTwitter(),
};

export const PLATFORM_NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
};

export function platformPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: buildPlatformOpenGraph({
      title: input.title,
      description: input.description,
      path: input.path,
    }),
    twitter: buildPlatformTwitter({
      title: input.title,
      description: input.description,
    }),
  };
}

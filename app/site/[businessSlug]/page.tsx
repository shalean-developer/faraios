import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSite } from "@/components/website-builder/public-site";
import { getPublicBuilderSiteData } from "@/lib/website-builder/service";
import type { LandingPageContent } from "@/types/website-builder";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ businessSlug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessSlug } = await params;
  const data = await getPublicBuilderSiteData(businessSlug);
  if (!data?.website) {
    return { title: "Website not found" };
  }
  return {
    title: data.website.seo_title ?? data.company?.name ?? "Business website",
    description: data.website.seo_description ?? undefined,
    keywords: data.website.seo_keywords?.split(",").map((k) => k.trim()),
    openGraph: {
      title: data.website.og_title ?? data.website.seo_title ?? undefined,
      description: data.website.og_description ?? data.website.seo_description ?? undefined,
      images: data.website.og_image_url ? [data.website.og_image_url] : undefined,
    },
  };
}

export default async function PublicBusinessSitePage({ params, searchParams }: Props) {
  const { businessSlug } = await params;
  const { preview } = await searchParams;
  const slug = decodeURIComponent(businessSlug);
  const data = await getPublicBuilderSiteData(slug, preview ? { previewToken: preview } : undefined);

  if (!data?.company || !data.website) {
    notFound();
  }

  const landingPage = data.pages.find((p) => p.page_type === "landing");
  const landing = (landingPage?.content ?? null) as LandingPageContent | null;

  return (
    <PublicSite
      companySlug={slug}
      companyId={data.company.id as string}
      companyName={data.company.name as string}
      website={data.website}
      landing={landing}
      servicePages={data.servicePages}
      contentPosts={data.contentPosts}
      preview={data.preview}
    />
  );
}

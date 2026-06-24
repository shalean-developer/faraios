import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FaraiIndustriesPage } from "@/components/marketing/farai-industries-page";
import { INDUSTRY_CARDS } from "@/lib/data/home-marketing";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return INDUSTRY_CARDS.map((ind) => ({ slug: ind.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = INDUSTRY_CARDS.find((ind) => ind.slug === slug);
  if (!industry) {
    return { title: "Industry not found — FaraiOS" };
  }
  return {
    title: `${industry.name} — FaraiOS Industries`,
    description: industry.description,
  };
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const industry = INDUSTRY_CARDS.find((ind) => ind.slug === slug);
  if (!industry) {
    notFound();
  }

  return <FaraiIndustriesPage highlightSlug={slug} />;
}

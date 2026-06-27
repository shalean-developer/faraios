import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { getLocalSeoSettingsAdmin } from "@/lib/services/local-seo";
import { getPublishedServiceAreaPage } from "@/lib/services/service-area-pages";
import { buildTenantSocialMetadata } from "@/lib/seo/tenant-metadata";
import {
  buildServiceAreaPageSchemas,
  schemaToJsonLd,
} from "@/lib/services/schema-markup";
import { getTenantContext } from "@/lib/services/tenant-site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getTenantContext();
  if (!ctx.website) return {};

  const page = await getPublishedServiceAreaPage(ctx.website.client_id, slug);
  if (!page) return {};

  const title = page.seo_title ?? page.h1 ?? undefined;
  const description = page.meta_description ?? undefined;

  return {
    title,
    description,
    ...buildTenantSocialMetadata({
      website: ctx.website,
      title: title ?? ctx.website.seo_title ?? ctx.website.name,
      description,
    }),
  };
}

export default async function ServiceAreaPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getTenantContext();

  if (!ctx.website || ctx.website.status !== "published") {
    notFound();
  }

  const page = await getPublishedServiceAreaPage(ctx.website.client_id, slug);
  if (!page) notFound();

  const localSeo = await getLocalSeoSettingsAdmin(ctx.website.client_id);
  const baseUrl = `https://${ctx.host}`;
  const schemas = buildServiceAreaPageSchemas({
    page,
    settings: localSeo,
    businessName: ctx.website.name,
    baseUrl,
  });

  const bookingUrl = ctx.bookingUrl ?? "/contact";

  return (
    <>
      <SchemaJsonLd data={schemaToJsonLd(schemas)} />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-violet-700">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>{page.area_name}</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {page.h1 || `${page.service_name} in ${page.area_name}`}
        </h1>

        {page.intro_content ? (
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{page.intro_content}</p>
        ) : null}

        {page.services_offered.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-slate-900">Services offered</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
              {page.services_offered.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {page.nearby_areas.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-slate-900">Areas nearby</h2>
            <p className="mt-2 text-slate-600">{page.nearby_areas.join(", ")}</p>
          </section>
        ) : null}

        {page.faq.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-slate-900">FAQ</h2>
            <div className="mt-4 space-y-4">
              {page.faq.map((item) => (
                <div key={item.question} className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{item.question}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-12">
          <Link
            href={bookingUrl}
            className="inline-flex rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {page.cta_text || `Book ${page.service_name}`}
          </Link>
        </div>
      </main>
    </>
  );
}

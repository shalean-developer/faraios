import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { getLocalSeoSettingsAdmin } from "@/lib/services/local-seo";
import {
  buildFaqSchema,
  buildLocalBusinessSchema,
  buildOrganizationSchema,
  schemaToJsonLd,
} from "@/lib/services/schema-markup";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type FaqItem = { question: string; answer: string };

export async function TenantHomeSchema({
  companyId,
  websiteName,
  host,
  websiteContent,
}: {
  companyId: string;
  websiteName: string;
  host: string;
  websiteContent: { section: string; content: Record<string, unknown> }[];
}) {
  const settings = await getLocalSeoSettingsAdmin(companyId);
  if (!settings) return null;

  const baseUrl = `https://${host}`;
  const schemas = [
    buildLocalBusinessSchema({
      settings,
      websiteUrl: baseUrl,
      businessName: websiteName,
    }),
    buildOrganizationSchema({
      settings,
      websiteUrl: baseUrl,
      businessName: websiteName,
    }),
  ];

  const faqSection = websiteContent.find((c) => c.section === "faq");
  const faqItems = (faqSection?.content?.items as FaqItem[] | undefined) ?? [];
  const faqSchema = buildFaqSchema(faqItems);
  if (faqSchema) schemas.push(faqSchema);

  return <SchemaJsonLd data={schemaToJsonLd(schemas)} />;
}

export async function getTenantSitemapExtras(companyId: string): Promise<string[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const [{ data: areas }, { data: posts }] = await Promise.all([
    admin.client
      .from("service_area_pages")
      .select("slug")
      .eq("company_id", companyId)
      .eq("status", "published"),
    admin.client
      .from("content_posts")
      .select("slug")
      .eq("company_id", companyId)
      .eq("status", "published"),
  ]);

  const paths: string[] = ["/blog"];
  for (const area of areas ?? []) {
    paths.push(`/areas/${area.slug as string}`);
  }
  for (const post of posts ?? []) {
    paths.push(`/blog/${post.slug as string}`);
  }
  return paths;
}

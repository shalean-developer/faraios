import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentBody } from "@/components/content/content-body";
import { getPublishedContentPost } from "@/lib/services/content-posts";
import { getPublicBuilderSiteData } from "@/lib/website-builder/service";
import { publicSiteBlogPath, publicSitePath } from "@/lib/paths/company";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ businessSlug: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessSlug, slug: postSlug } = await params;
  const data = await getPublicBuilderSiteData(decodeURIComponent(businessSlug));
  if (!data?.company) return {};

  const post = await getPublishedContentPost(data.company.id as string, postSlug);
  if (!post) return {};

  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? undefined,
  };
}

export default async function BuilderSiteBlogPostPage({ params }: Props) {
  const { businessSlug, slug: postSlug } = await params;
  const companySlug = decodeURIComponent(businessSlug);
  const data = await getPublicBuilderSiteData(companySlug);

  if (!data?.company || !data.website) {
    notFound();
  }

  const post = await getPublishedContentPost(data.company.id as string, postSlug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href={publicSitePath(companySlug)} className="hover:text-violet-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href={publicSiteBlogPath(companySlug)} className="hover:text-violet-700">
          Blog
        </Link>
      </nav>

      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
        {post.category.replace(/_/g, " ")}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{post.title}</h1>

      {post.author || post.published_at ? (
        <p className="mt-2 text-sm text-slate-500">
          {post.author ? `By ${post.author}` : null}
          {post.author && post.published_at ? " · " : null}
          {post.published_at ? new Date(post.published_at).toLocaleDateString() : null}
        </p>
      ) : null}

      {post.featured_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featured_image}
          alt=""
          className="mt-6 w-full rounded-2xl object-cover"
        />
      ) : null}

      {post.content_body ? <ContentBody content={post.content_body} className="mt-8" /> : null}

      {post.cta_text && post.cta_link ? (
        <div className="mt-10">
          <Link
            href={post.cta_link}
            className="inline-flex rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {post.cta_text}
          </Link>
        </div>
      ) : null}
    </main>
  );
}

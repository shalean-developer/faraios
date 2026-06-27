import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentBody } from "@/components/content/content-body";
import { getPublishedContentPost } from "@/lib/services/content-posts";
import { buildTenantSocialMetadata } from "@/lib/seo/tenant-metadata";
import { getTenantContext } from "@/lib/services/tenant-site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getTenantContext();
  if (!ctx.website) return {};

  const post = await getPublishedContentPost(ctx.website.client_id, slug);
  if (!post) return {};

  const title = post.meta_title ?? post.title;
  const description = post.meta_description ?? undefined;

  return {
    title,
    description,
    ...buildTenantSocialMetadata({
      website: ctx.website,
      title,
      description,
      image: post.featured_image,
    }),
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getTenantContext();

  if (!ctx.website || ctx.website.status !== "published") {
    notFound();
  }

  const post = await getPublishedContentPost(ctx.website.client_id, slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-violet-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-violet-700">
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
          {post.published_at
            ? new Date(post.published_at).toLocaleDateString()
            : null}
        </p>
      ) : null}

      {post.featured_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featured_image}
          alt={post.title}
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

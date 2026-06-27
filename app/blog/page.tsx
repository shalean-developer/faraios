import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { listPublishedContentPosts } from "@/lib/services/content-posts";
import { buildTenantSocialMetadata } from "@/lib/seo/tenant-metadata";
import { getTenantContext } from "@/lib/services/tenant-site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getTenantContext();
  if (!ctx.website) return {};
  const title = `Blog | ${ctx.website.seo_title || ctx.website.name}`;
  const description = ctx.website.seo_description ?? undefined;
  return {
    title,
    description,
    ...buildTenantSocialMetadata({
      website: ctx.website,
      title,
      description,
    }),
  };
}

export default async function BlogIndexPage() {
  const ctx = await getTenantContext();

  if (!ctx.website || ctx.website.status !== "published") {
    notFound();
  }

  const posts = await listPublishedContentPosts(ctx.website.client_id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Blog</h1>
      <p className="mt-2 text-slate-600">Tips, guides, and updates from our team.</p>

      <div className="mt-10 space-y-6">
        {posts.length === 0 ? (
          <p className="text-slate-500">No posts published yet.</p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase text-violet-600">
                {post.category.replace(/_/g, " ")}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                <Link href={`/blog/${post.slug}`} className="hover:text-violet-700">
                  {post.title}
                </Link>
              </h2>
              {post.meta_description ? (
                <p className="mt-2 text-sm text-slate-600">{post.meta_description}</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </main>
  );
}

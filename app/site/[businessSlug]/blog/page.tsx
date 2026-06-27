import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicBuilderSiteData } from "@/lib/website-builder/service";
import { publicSiteBlogPostPath, publicSitePath } from "@/lib/paths/company";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ businessSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessSlug } = await params;
  const data = await getPublicBuilderSiteData(decodeURIComponent(businessSlug));
  if (!data?.website) return { title: "Blog" };
  return {
    title: `Blog | ${data.website.seo_title ?? data.company?.name ?? "Business website"}`,
    description: data.website.seo_description ?? undefined,
  };
}

export default async function BuilderSiteBlogIndexPage({ params }: Props) {
  const { businessSlug } = await params;
  const slug = decodeURIComponent(businessSlug);
  const data = await getPublicBuilderSiteData(slug);

  if (!data?.company || !data.website) {
    notFound();
  }

  const posts = data.contentPosts;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href={publicSitePath(slug)} className="hover:text-violet-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Blog</span>
      </nav>

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
                <Link
                  href={publicSiteBlogPostPath(slug, post.slug)}
                  className="hover:text-violet-700"
                >
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

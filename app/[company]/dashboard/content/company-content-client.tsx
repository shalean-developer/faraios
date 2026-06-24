"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, BarChart3, Search } from "lucide-react";

import { createContentPostAction, updateContentPostAction } from "@/app/actions/growth-engine";
import type { ContentPostSummary } from "@/lib/services/content-posts";
import { cn } from "@/lib/utils";
import type { ContentPost, ContentPostCategory } from "@/types/growth-engine";

const CATEGORIES: { value: ContentPostCategory; label: string }[] = [
  { value: "blog", label: "Blog" },
  { value: "guide", label: "Guide" },
  { value: "service_article", label: "Service article" },
  { value: "faq", label: "FAQ" },
];

function MetricCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        highlight
          ? "border-2 border-violet-200 bg-gradient-to-br from-violet-50/70 to-white"
          : "border-slate-200 bg-white"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function statusBadgeClass(status: ContentPost["status"]): string {
  return status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
}

export function CompanyContentClient({
  slug,
  companyId,
  posts,
  summary,
}: {
  slug: string;
  companyId: string;
  posts: ContentPost[];
  summary: ContentPostSummary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    contentBody: "",
    metaDescription: "",
    category: "blog" as ContentPostCategory,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = `/${encodeURIComponent(slug)}/dashboard`;

  const statCards = [
    { label: "Total posts", value: String(summary.total), hint: "All content" },
    { label: "Published", value: String(summary.published), hint: "Live on your site" },
    { label: "Drafts", value: String(summary.drafts), hint: "Ready to publish" },
    {
      label: "Blog posts",
      value: String(summary.byCategory.blog),
      hint: "Organic content",
      highlight: true,
    },
  ];

  function create() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await createContentPostAction({
        companyId,
        companySlug: slug,
        post: {
          title: form.title.trim(),
          contentBody: form.contentBody,
          category: form.category,
          metaDescription: form.metaDescription || undefined,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Post created as draft.");
      setForm({ title: "", contentBody: "", metaDescription: "", category: "blog" });
      router.refresh();
    });
  }

  function publish(post: ContentPost) {
    if (!window.confirm(`Publish "${post.title}"? It will be visible publicly.`)) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateContentPostAction({
        companyId,
        companySlug: slug,
        postId: post.id,
        post: { status: "published" },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`"${post.title}" is now published.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">New post</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a draft article. Publish when meta tags and content are ready.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-400">Title</span>
                <input
                  placeholder="How to choose the right service for your needs"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-400">Category</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as ContentPostCategory }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Meta description
                </span>
                <input
                  placeholder="Optional SEO description"
                  value={form.metaDescription}
                  onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-400">Content</span>
                <textarea
                  placeholder="Write your article..."
                  value={form.contentBody}
                  onChange={(e) => setForm((f) => ({ ...f, contentBody: e.target.value }))}
                  rows={8}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={create}
                className="w-fit rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Create draft
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Content library</h2>
              <p className="mt-1 text-sm text-slate-500">
                Drafts can be published to your public site. Published posts are read-only here.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No content yet. Create your first post above.
                      </td>
                    </tr>
                  ) : (
                    posts.map((post) => (
                      <tr key={post.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{post.title}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">/{post.slug}</p>
                        </td>
                        <td className="px-5 py-3 capitalize">
                          {post.category.replace(/_/g, " ")}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                              statusBadgeClass(post.status)
                            )}
                          >
                            {post.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {new Date(post.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          {post.status === "draft" ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => publish(post)}
                              className="font-medium text-violet-700 hover:underline disabled:opacity-50"
                            >
                              Publish
                            </button>
                          ) : (
                            <span className="text-slate-400">
                              {post.published_at
                                ? new Date(post.published_at).toLocaleDateString()
                                : "Live"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">By category</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {CATEGORIES.map((cat) => (
                <div key={cat.value} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{cat.label}</dt>
                  <dd className="font-medium text-slate-900">
                    {summary.byCategory[cat.value]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Related</h3>
            <ul className="mt-3 space-y-1">
              <SidebarLink href={`${base}/seo`} icon={Search} label="SEO dashboard" />
              <SidebarLink href={`${base}/marketing`} icon={BarChart3} label="Marketing overview" />
            </ul>
            {summary.published === 0 ? (
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                Publishing your first post improves organic visibility and your SEO audit score.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-violet-800"
      >
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        {label}
        <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
      </Link>
    </li>
  );
}

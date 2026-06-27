"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Columns3,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";

import { createContentPostAction, updateContentPostAction } from "@/app/actions/growth-engine";
import {
  companyMarketingPath,
  companySeoPath,
} from "@/lib/paths/company";
import type { ContentPostSummary } from "@/lib/services/content-posts";
import { cn } from "@/lib/utils";
import type { ContentPost, ContentPostCategory, ContentPostStatus } from "@/types/growth-engine";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

const CATEGORIES: { value: ContentPostCategory; label: string }[] = [
  { value: "blog", label: "Blog" },
  { value: "guide", label: "Guide" },
  { value: "service_article", label: "Service article" },
  { value: "faq", label: "FAQ" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type StatusFilter = "all" | ContentPostStatus;
type CategoryFilter = "all" | ContentPostCategory;

function formatRiseDate(value: string): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function statusDisplay(status: ContentPostStatus): { label: string; className: string } {
  return status === "published"
    ? { label: "Published", className: "bg-emerald-50 text-emerald-700 ring-emerald-200/80" }
    : { label: "Draft", className: "bg-amber-50 text-amber-700 ring-amber-200/80" };
}

function ToolbarButton({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50",
        active && "border-[#5c86f2] bg-[#eef2ff] text-[#4a6fd8]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function CompanyContentClient({
  slug,
  companyId,
  posts: initialPosts,
  summary,
}: {
  slug: string;
  companyId: string;
  posts: ContentPost[];
  summary: ContentPostSummary;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialPosts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    contentBody: "",
    metaDescription: "",
    category: "blog" as ContentPostCategory,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialPosts);
  }, [initialPosts]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (categoryFilter !== "all" && post.category !== categoryFilter) return false;
      if (!query) return true;
      return (
        post.title.toLowerCase().includes(query) ||
        post.slug.toLowerCase().includes(query) ||
        (post.content_body ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
      setShowPostForm(false);
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
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-800">Content</h1>
            <p className="mt-1 text-sm text-slate-500">
              Publish blog posts, guides, and service articles to improve organic visibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={companySeoPath(slug)} className={riseOutlineButtonClassName}>
              SEO settings
            </Link>
            <Link href={companyMarketingPath(slug)} className={riseOutlineButtonClassName}>
              Marketing
            </Link>
            <button
              type="button"
              className={riseOutlineButtonClassName}
              aria-expanded={showPostForm}
              onClick={() => setShowPostForm((open) => !open)}
            >
              <Plus className="h-4 w-4 text-[#5a8dee]" strokeWidth={1.75} />
              New post
            </button>
          </div>
        </div>

        {showPostForm ? (
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
            <p className="mb-3 text-sm text-slate-600">
              Create a draft article. Publish when meta tags and content are ready.
            </p>
            <div className="grid gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Title</span>
                <input
                  placeholder="How to choose the right service for your needs"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Category</span>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value as ContentPostCategory }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Meta description</span>
                  <input
                    placeholder="Optional SEO description"
                    value={form.metaDescription}
                    onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Content</span>
                <textarea
                  placeholder="Write your article..."
                  value={form.contentBody}
                  onChange={(e) => setForm((f) => ({ ...f, contentBody: e.target.value }))}
                  rows={8}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={create}
                  className="inline-flex h-9 items-center rounded-md bg-[#5a8dee] px-4 text-sm font-medium text-white hover:bg-[#4a7de0] disabled:opacity-50"
                >
                  Create draft
                </button>
                <button
                  type="button"
                  onClick={() => setShowPostForm(false)}
                  className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
          <ToolbarButton>
            <Columns3 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="relative">
            <ToolbarButton active={showFilters} onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-3.5 w-3.5" />
              Filters
            </ToolbarButton>
            {showFilters ? (
              <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-medium uppercase text-slate-400">Status</p>
                {(["all", "draft", "published"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(value);
                      setPage(1);
                    }}
                    className={cn(
                      "flex w-full rounded-md px-2 py-1.5 text-left text-sm capitalize transition hover:bg-slate-50",
                      statusFilter === value && "bg-[#eef2ff] text-[#4a6fd8]"
                    )}
                  >
                    {value === "all" ? "All statuses" : value}
                  </button>
                ))}
                <p className="mt-2 px-2 py-1 text-xs font-medium uppercase text-slate-400">
                  Category
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("all");
                    setPage(1);
                  }}
                  className={cn(
                    "flex w-full rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-slate-50",
                    categoryFilter === "all" && "bg-[#eef2ff] text-[#4a6fd8]"
                  )}
                >
                  All categories
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(cat.value);
                      setPage(1);
                    }}
                    className={cn(
                      "flex w-full rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-slate-50",
                      categoryFilter === cat.value && "bg-[#eef2ff] text-[#4a6fd8]"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <ToolbarButton
            active={statusFilter === "all" && categoryFilter === "all"}
            onClick={() => {
              setStatusFilter("all");
              setCategoryFilter("all");
              setPage(1);
            }}
          >
            All
          </ToolbarButton>
          <ToolbarButton
            active={statusFilter === "draft"}
            onClick={() => {
              setStatusFilter("draft");
              setPage(1);
            }}
          >
            Draft
          </ToolbarButton>
          <ToolbarButton
            active={statusFilter === "published"}
            onClick={() => {
              setStatusFilter("published");
              setPage(1);
            }}
          >
            Published
          </ToolbarButton>
          <ToolbarButton onClick={() => router.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => window.print()} className="px-3">
            <Printer className="h-3.5 w-3.5" />
            Print
          </ToolbarButton>
          <div className="ml-auto flex min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              placeholder="Search"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          {[
            { label: "Total posts", value: String(summary.total) },
            { label: "Published", value: String(summary.published) },
            { label: "Drafts", value: String(summary.drafts) },
            { label: "Blog", value: String(summary.byCategory.blog) },
            { label: "Guides", value: String(summary.byCategory.guide) },
            {
              label: "Service articles",
              value: String(summary.byCategory.service_article),
            },
            { label: "FAQ", value: String(summary.byCategory.faq) },
          ].map((card) => (
            <div key={card.label} className="text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-0.5 font-semibold text-slate-800">{card.value}</p>
            </div>
          ))}
        </div>

        {message ? (
          <p className="border-b border-slate-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 sm:px-5">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium text-red-600 sm:px-5">
            {error}
          </p>
        ) : null}

        {summary.published === 0 ? (
          <p className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
            Publishing your first post improves organic visibility and your SEO audit score.
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3 font-medium sm:px-5">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium sm:pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    {rows.length === 0
                      ? "No content yet. Use New post to create your first article."
                      : "No posts match your filters."}
                  </td>
                </tr>
              ) : (
                pageRows.map((post) => {
                  const statusMeta = statusDisplay(post.status);
                  return (
                    <tr key={post.id} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3 sm:px-5">
                        <p className="font-medium text-slate-800">{post.title}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">/{post.slug}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {post.category.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                            statusMeta.className
                          )}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatRiseDate(post.updated_at)}
                      </td>
                      <td className="px-4 py-3 sm:pr-5">
                        {post.status === "draft" ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => publish(post)}
                            className="text-sm font-medium text-[#4a6fd8] hover:underline disabled:opacity-50"
                          >
                            Publish
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">
                            {post.published_at
                              ? formatRiseDate(post.published_at)
                              : "Live"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p>
            Showing {pageRows.length} of {filteredRows.length} post
            {filteredRows.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs">
              Rows
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                  setPage(1);
                }}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

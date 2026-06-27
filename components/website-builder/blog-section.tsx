"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ExternalLink,
  FolderOpen,
  Loader2,
  Plus,
  Pencil,
  Search,
  Tag,
  Trash2,
} from "lucide-react";

import {
  createBlogCategoryAction,
  createBlogPostAction,
  createBlogTagAction,
  deleteBlogCategoryAction,
  deleteBlogPostAction,
  deleteBlogTagAction,
  updateBlogPostAction,
} from "@/app/actions/website-builder";
import { BuilderLockedCard } from "@/components/website-builder/builder-locked-card";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import { canAccessWebsiteBuilderFeature } from "@/lib/website-builder/access";
import { useMounted } from "@/lib/hooks/use-mounted";
import { companyContentPath, publicSiteBlogPath } from "@/lib/paths/company";
import type { ContentPostSummary } from "@/lib/services/content-posts";
import { cn } from "@/lib/utils";
import type { ContentPost, ContentPostStatus } from "@/types/growth-engine";
import type { BlogCategory, BlogTag } from "@/types/website-builder-blog";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import type { BuilderWebsite } from "@/types/website-builder";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
const inputClass = "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm";

type Tab = "posts" | "categories" | "tags";

type Props = {
  slug: string;
  companyId: string;
  company: SubscriptionCompanyFields;
  posts: ContentPost[];
  summary: ContentPostSummary;
  categories: BlogCategory[];
  tags: BlogTag[];
  postTagIds: Record<string, string[]>;
  taxonomyReady?: boolean;
  website?: BuilderWebsite | null;
  mediaItems?: WebsiteMediaRecord[];
};

function statusDisplay(status: ContentPostStatus): { label: string; className: string } {
  return status === "published"
    ? { label: "Published", className: "bg-emerald-50 text-emerald-700 ring-emerald-200/80" }
    : { label: "Draft", className: "bg-amber-50 text-amber-700 ring-amber-200/80" };
}

export function BlogSection({
  slug,
  companyId,
  company,
  posts,
  summary,
  categories,
  tags,
  postTagIds,
  taxonomyReady = true,
  website = null,
  mediaItems = [],
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("posts");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [tagName, setTagName] = useState("");
  const [postForm, setPostForm] = useState({
    title: "",
    contentBody: "",
    metaDescription: "",
    blogCategoryId: "",
    tagIds: [] as string[],
  });

  const canBuild = canAccessWebsiteBuilderFeature(company, "websiteBuilder");
  const mounted = useMounted();

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.slug.toLowerCase().includes(query) ||
        (post.content_body ?? "").toLowerCase().includes(query)
    );
  }, [posts, search]);

  function resetPostForm() {
    setPostForm({
      title: "",
      contentBody: "",
      metaDescription: "",
      blogCategoryId: "",
      tagIds: [],
    });
    setEditingPostId(null);
  }

  function openCreatePostForm() {
    resetPostForm();
    setShowPostForm(true);
  }

  function startEditPost(post: ContentPost) {
    setPostForm({
      title: post.title,
      contentBody: post.content_body ?? "",
      metaDescription: post.meta_description ?? "",
      blogCategoryId: post.blog_category_id ?? "",
      tagIds: postTagIds[post.id] ?? [],
    });
    setEditingPostId(post.id);
    setShowPostForm(true);
    setTab("posts");
  }

  function closePostForm() {
    setShowPostForm(false);
    resetPostForm();
  }

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  function createCategory() {
    if (!categoryName.trim()) {
      setError("Category name is required.");
      return;
    }
    clearFeedback();
    startTransition(async () => {
      const result = await createBlogCategoryAction({
        companyId,
        companySlug: slug,
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCategoryName("");
      setCategoryDescription("");
      setMessage("Category created.");
      router.refresh();
    });
  }

  function removeCategory(category: BlogCategory) {
    if (!window.confirm(`Delete category "${category.name}"? Posts keep their content type.`)) return;
    clearFeedback();
    startTransition(async () => {
      const result = await deleteBlogCategoryAction({
        companyId,
        companySlug: slug,
        categoryId: category.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Category deleted.");
      router.refresh();
    });
  }

  function createTag() {
    if (!tagName.trim()) {
      setError("Tag name is required.");
      return;
    }
    clearFeedback();
    startTransition(async () => {
      const result = await createBlogTagAction({
        companyId,
        companySlug: slug,
        name: tagName.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTagName("");
      setMessage("Tag created.");
      router.refresh();
    });
  }

  function removeTag(tag: BlogTag) {
    if (!window.confirm(`Delete tag "${tag.name}"?`)) return;
    clearFeedback();
    startTransition(async () => {
      const result = await deleteBlogTagAction({
        companyId,
        companySlug: slug,
        tagId: tag.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Tag deleted.");
      router.refresh();
    });
  }

  function savePost() {
    if (!postForm.title.trim()) {
      setError("Post title is required.");
      return;
    }
    clearFeedback();
    startTransition(async () => {
      const payload = {
        title: postForm.title.trim(),
        contentBody: postForm.contentBody,
        metaDescription: postForm.metaDescription || undefined,
        category: "blog" as const,
        blogCategoryId: postForm.blogCategoryId || null,
        tagIds: postForm.tagIds,
      };

      const result = editingPostId
        ? await updateBlogPostAction({
            companyId,
            companySlug: slug,
            postId: editingPostId,
            post: payload,
          })
        : await createBlogPostAction({
            companyId,
            companySlug: slug,
            post: payload,
          });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      closePostForm();
      setMessage(editingPostId ? "Post updated." : "Post created as draft.");
      router.refresh();
    });
  }

  function publishPost(post: ContentPost) {
    if (!window.confirm(`Publish "${post.title}"? It will appear on your public site.`)) return;
    clearFeedback();
    startTransition(async () => {
      const result = await updateBlogPostAction({
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

  function removePost(post: ContentPost) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    clearFeedback();
    startTransition(async () => {
      const result = await deleteBlogPostAction({
        companyId,
        companySlug: slug,
        postId: post.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Post deleted.");
      router.refresh();
    });
  }

  function togglePostTag(tagId: string) {
    setPostForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId)
        ? f.tagIds.filter((id) => id !== tagId)
        : [...f.tagIds, tagId],
    }));
  }

  if (!canBuild) {
    return (
      <div className="py-8">
        <BuilderLockedCard slug={slug} feature="websiteBuilder" />
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className={riseCardClassName}>
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-4 max-w-xl animate-pulse rounded bg-slate-100" />
          </div>
          <div className="flex gap-2 border-b border-slate-100 px-4 py-2 sm:px-5">
            <div className="h-8 w-16 animate-pulse rounded-md bg-slate-100" />
            <div className="h-8 w-24 animate-pulse rounded-md bg-slate-100" />
            <div className="h-8 w-14 animate-pulse rounded-md bg-slate-100" />
          </div>
          <div className="h-72 animate-pulse bg-slate-50/80" />
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "categories", label: "Categories" },
    { key: "tags", label: "Tags" },
  ];

  return (
    <div className="space-y-4">
      {!taxonomyReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Blog database migration required</p>
          <p className="mt-1 text-amber-800">
            Paste{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
              supabase/apply-content-blog-taxonomy-combined.sql
            </code>{" "}
            into Supabase Dashboard → SQL Editor → Run. CLI needs a pooler{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">DATABASE_URL</code>{" "}
            (direct <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">db.*.supabase.co</code>{" "}
            is IPv6-only and often fails on Windows).
          </p>
        </div>
      ) : null}
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between sm:px-5">
          <div>
            <p className="text-sm text-slate-500">
              Posts sync with{" "}
              <Link href={companyContentPath(slug)} className="font-medium text-violet-700 hover:text-violet-900">
                Growth content
              </Link>
              . Published posts appear in blog sections and at{" "}
              <a
                href={publicSiteBlogPath(slug)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-violet-700 hover:text-violet-900"
              >
                /blog
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={companyContentPath(slug)} className={riseOutlineButtonClassName}>
              Open Growth content
            </Link>
            {tab === "posts" ? (
            <button
              type="button"
              className={riseOutlineButtonClassName}
              onClick={() => (showPostForm ? closePostForm() : openCreatePostForm())}
            >
                <Plus className="h-4 w-4 text-violet-600" strokeWidth={1.75} />
                New post
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 py-2 sm:px-5">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                tab === item.key
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          {[
            { label: "Total posts", value: String(summary.total) },
            { label: "Published", value: String(summary.published) },
            { label: "Categories", value: String(categories.length) },
            { label: "Tags", value: String(tags.length) },
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

        {tab === "posts" ? (
          <>
            {showPostForm ? (
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
                <p className="mb-3 text-sm font-medium text-slate-700">
                  {editingPostId ? "Edit post" : "New post"}
                </p>
                <div className="grid gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">Title</span>
                    <input
                      value={postForm.title}
                      onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))}
                      className={inputClass}
                      placeholder="5 tips for choosing a local service provider"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">Meta description</span>
                    <input
                      value={postForm.metaDescription}
                      onChange={(e) =>
                        setPostForm((f) => ({ ...f, metaDescription: e.target.value }))
                      }
                      className={inputClass}
                      placeholder="Short summary for search engines"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">Category</span>
                    <select
                      value={postForm.blogCategoryId}
                      onChange={(e) =>
                        setPostForm((f) => ({ ...f, blogCategoryId: e.target.value }))
                      }
                      className={inputClass}
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {tags.length > 0 ? (
                    <div>
                      <span className="text-xs font-medium text-slate-500">Tags</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => togglePostTag(tag.id)}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition",
                              postForm.tagIds.includes(tag.id)
                                ? "bg-violet-50 text-violet-700 ring-violet-200"
                                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                            )}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-xs font-medium text-slate-500">Content</span>
                    <div className="mt-1">
                      <RichTextEditor
                        key={editingPostId ?? "new-post"}
                        value={postForm.contentBody}
                        onChange={(contentBody) => setPostForm((f) => ({ ...f, contentBody }))}
                        placeholder="Write your article with headings, lists, links, images, and video embeds…"
                        media={
                          website
                            ? {
                                websiteId: website.id,
                                companyId,
                                mediaItems,
                              }
                            : undefined
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={savePost}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {editingPostId ? "Save changes" : "Save draft"}
                    </button>
                    <button
                      type="button"
                      onClick={closePostForm}
                      className={riseOutlineButtonClassName}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 font-medium sm:px-5">Title</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium sm:pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                        {posts.length === 0
                          ? "No posts yet. Create your first article or use Growth content."
                          : "No posts match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map((post) => {
                      const statusMeta = statusDisplay(post.status);
                      const blogCategory = post.blog_category_id
                        ? categoryById.get(post.blog_category_id)
                        : null;
                      const postTags = (postTagIds[post.id] ?? [])
                        .map((id) => tagById.get(id)?.name)
                        .filter(Boolean);

                      return (
                        <tr key={post.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-3 sm:px-5">
                            <p className="font-medium text-slate-800">{post.title}</p>
                            <p className="mt-0.5 font-mono text-xs text-slate-400">/{post.slug}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {blogCategory?.name ?? post.category.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-3">
                            {postTags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {postTags.map((name) => (
                                  <span
                                    key={name}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
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
                          <td className="px-4 py-3 sm:pr-5">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => startEditPost(post)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-violet-800 disabled:opacity-60"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              {post.status === "draft" ? (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => publishPost(post)}
                                  className="text-xs font-medium text-violet-700 hover:text-violet-900 disabled:opacity-60"
                                >
                                  Publish
                                </button>
                              ) : null}
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => removePost(post)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {tab === "categories" ? (
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-500">Category name</span>
                <input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className={inputClass}
                  placeholder="News, Tips, Case studies..."
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-500">Description (optional)</span>
                <input
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={createCategory}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  <FolderOpen className="h-4 w-4" />
                  Add category
                </button>
              </div>
            </div>

            {categories.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No categories yet. Create one to organize posts on your site.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{category.name}</p>
                      <p className="font-mono text-xs text-slate-400">/{category.slug}</p>
                      {category.description ? (
                        <p className="mt-1 text-sm text-slate-500">{category.description}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeCategory(category)}
                      className="text-slate-400 hover:text-red-600 disabled:opacity-60"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "tags" ? (
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <label className="min-w-[200px] flex-1">
                <span className="text-xs font-medium text-slate-500">Tag name</span>
                <input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className={inputClass}
                  placeholder="seasonal, plumbing, tips..."
                />
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={createTag}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                <Tag className="h-4 w-4" />
                Add tag
              </button>
            </div>

            {tags.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No tags yet. Tags help visitors find related posts.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-700"
                  >
                    {tag.name}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeTag(tag)}
                      className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-red-600 disabled:opacity-60"
                      aria-label={`Delete ${tag.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

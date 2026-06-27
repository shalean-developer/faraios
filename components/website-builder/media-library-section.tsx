"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Crop,
  FolderOpen,
  ImagePlus,
  Loader2,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  deleteWebsiteMediaAction,
  updateWebsiteMediaAction,
} from "@/app/actions/website-builder";
import { BuilderLockedCard } from "@/components/website-builder/builder-locked-card";
import { MediaCropModal } from "@/components/website-builder/media-crop-modal";
import { canAccessWebsiteBuilderFeature } from "@/lib/website-builder/access";
import { uploadWebsiteMediaClient } from "@/lib/website-builder/media-client";
import { cn } from "@/lib/utils";
import {
  WEBSITE_MEDIA_FOLDERS,
  type WebsiteMediaRecord,
} from "@/types/website-builder-media";
import type { BuilderWebsite } from "@/types/website-builder";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

type Props = {
  slug: string;
  companyId: string;
  company: SubscriptionCompanyFields;
  website: BuilderWebsite | null;
  mediaItems?: WebsiteMediaRecord[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaDetailPanel({
  item,
  slug,
  companyId,
  folders,
  onClose,
  onCrop,
  onDeleted,
  onUpdated,
}: {
  item: WebsiteMediaRecord;
  slug: string;
  companyId: string;
  folders: string[];
  onClose: () => void;
  onCrop: () => void;
  onDeleted: () => void;
  onUpdated: (item: WebsiteMediaRecord) => void;
}) {
  const [pending, startTransition] = useTransition();
  const isPresetFolder = WEBSITE_MEDIA_FOLDERS.includes(
    item.folder as (typeof WEBSITE_MEDIA_FOLDERS)[number]
  );
  const [filename, setFilename] = useState(item.filename);
  const [altText, setAltText] = useState(item.alt_text ?? "");
  const [folder, setFolder] = useState(isPresetFolder ? item.folder : "custom");
  const [customFolder, setCustomFolder] = useState(isPresetFolder ? "" : item.folder);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resolvedFolder = customFolder.trim() || folder;

  function saveMetadata() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateWebsiteMediaAction({
        companyId,
        companySlug: slug,
        mediaId: item.id,
        filename,
        altText,
        folder: resolvedFolder,
        tags,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Saved.");
      onUpdated({
        ...item,
        filename: filename.trim(),
        alt_text: altText.trim() || null,
        folder: resolvedFolder,
        tags,
        updated_at: new Date().toISOString(),
      });
    });
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((value) => value !== tag));
  }

  function addTag() {
    const next = tagInput.trim();
    if (!next || tags.includes(next)) {
      setTagInput("");
      return;
    }
    setTags((current) => [...current, next]);
    setTagInput("");
  }

  function onDelete() {
    if (!window.confirm(`Delete "${item.filename}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteWebsiteMediaAction({
        companyId,
        companySlug: slug,
        mediaId: item.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy URL.");
    }
  }

  return (
    <aside className="flex w-full flex-col border-l border-slate-200 bg-white lg:w-80">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.alt_text ?? item.filename}
            className="aspect-video w-full object-cover"
          />
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Filename</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Alt text</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={2}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image for accessibility"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Folder</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={folder}
            onChange={(e) => {
              setFolder(e.target.value);
              if (e.target.value !== "custom") setCustomFolder("");
            }}
          >
            {folders.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="custom">Custom folder…</option>
          </select>
          {folder === "custom" ? (
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={customFolder}
              onChange={(e) => setCustomFolder(e.target.value)}
              placeholder="Folder name"
            />
          ) : null}
        </label>

        <div className="text-sm">
          <span className="font-medium text-slate-700">Tags</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
              >
                <Tag className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-violet-400 hover:text-violet-900"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tag"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Add
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs text-slate-500">
          <div>
            <dt className="font-medium uppercase tracking-wide">Size</dt>
            <dd className="mt-0.5 text-slate-700">{formatBytes(item.size_bytes)}</dd>
          </div>
          <div>
            <dt className="font-medium uppercase tracking-wide">Type</dt>
            <dd className="mt-0.5 text-slate-700">{item.mime_type.replace("image/", "").toUpperCase()}</dd>
          </div>
          <div className="col-span-2">
            <dt className="font-medium uppercase tracking-wide">Uploaded</dt>
            <dd className="mt-0.5 text-slate-700">
              {new Date(item.created_at).toLocaleString()}
            </dd>
          </div>
        </dl>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      </div>

      <div className="space-y-2 border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={saveMetadata}
          disabled={pending}
          className="w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCrop}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Crop className="h-4 w-4" />
            Crop
          </button>
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </aside>
  );
}

export function MediaLibrarySection({
  slug,
  companyId,
  company,
  website,
  mediaItems = [],
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(mediaItems);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadFolder, setUploadFolder] = useState<string>("General");
  const [cropItem, setCropItem] = useState<WebsiteMediaRecord | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setItems(mediaItems);
  }, [mediaItems]);

  const canBuild = canAccessWebsiteBuilderFeature(company, "websiteBuilder");

  const folders = useMemo(() => {
    const fromItems = items.map((item) => item.folder).filter(Boolean);
    return Array.from(new Set([...WEBSITE_MEDIA_FOLDERS, ...fromItems])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [items]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const item of items) {
      for (const tag of item.tags ?? []) tagSet.add(tag);
    }
    return Array.from(tagSet).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeFolder !== "all" && item.folder !== activeFolder) return false;
      if (selectedTag && !(item.tags ?? []).includes(selectedTag)) return false;
      if (!query) return true;
      return (
        item.filename.toLowerCase().includes(query) ||
        (item.alt_text ?? "").toLowerCase().includes(query) ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [items, activeFolder, selectedTag, search]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (!canBuild) {
    return <BuilderLockedCard slug={slug} feature="websiteBuilder" />;
  }

  if (!website) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ImagePlus className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-600">
          Create your website first, then upload images for pages and sections.
        </p>
      </section>
    );
  }

  async function uploadFiles(fileList: FileList | File[] | null) {
    if (!fileList?.length || !website) return;
    setUploading(true);
    setError(null);
    setMessage(null);

    let uploaded = 0;
    for (const file of Array.from(fileList)) {
      const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const result = await uploadWebsiteMediaClient(website.id, file, {
        companyId,
        folder: uploadFolder,
        altText: baseName || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        break;
      }
      uploaded += 1;
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded > 0) {
      setMessage(
        uploaded === 1 ? "Image uploaded." : `${uploaded} images uploaded.`
      );
      router.refresh();
    }
  }

  async function handleCropApply(blob: Blob, filename: string): Promise<void> {
    if (!cropItem || !website) return;
    setCropping(true);
    setError(null);

    const result = await uploadWebsiteMediaClient(
      website.id,
      blob,
      {
        companyId,
        folder: cropItem.folder,
        altText: cropItem.alt_text ?? undefined,
        tags: cropItem.tags,
        replaceStoragePath: cropItem.storage_path,
      },
      filename
    );

    setCropping(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCropItem(null);
    setMessage("Image cropped and saved.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Upload images for your website, organize them into folders, add alt text and tags, and
          crop before using them in the page builder.
        </p>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex-row lg:min-h-[560px]">
        <div className="w-full border-b border-slate-200 p-4 lg:w-52 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Folders
          </p>
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveFolder("all")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                activeFolder === "all"
                  ? "bg-violet-50 font-medium text-violet-700"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              All media
              <span className="ml-auto text-xs text-slate-400">{items.length}</span>
            </button>
            {folders.map((folder) => {
              const count = items.filter((item) => item.folder === folder).length;
              return (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setActiveFolder(folder)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                    activeFolder === folder
                      ? "bg-violet-50 font-medium text-violet-700"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  {folder}
                  <span className="ml-auto text-xs text-slate-400">{count}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                placeholder="Search filename, alt text, or tags"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              aria-label="Upload folder"
            >
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  Upload to {folder}
                </option>
              ))}
            </select>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => void uploadFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload
                </>
              )}
            </button>
          </div>

          {allTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-2">
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  !selectedTag
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                All tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    selectedTag === tag
                      ? "bg-violet-600 text-white"
                      : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className={cn(
              "flex-1 p-4 transition-colors",
              dragOver && "bg-violet-50/60"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void uploadFiles(e.dataTransfer.files);
            }}
          >
            {filtered.length === 0 ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="flex h-full min-h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center hover:border-violet-300 hover:bg-violet-50/40 disabled:opacity-60"
              >
                <ImagePlus className="mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">
                  {items.length === 0 ? "No media yet" : "No matches"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Drop images here or click Upload · JPG, PNG, WebP, GIF · max 5 MB
                </p>
              </button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "group overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md",
                      selectedId === item.id
                        ? "border-violet-400 ring-2 ring-violet-100"
                        : "border-slate-200"
                    )}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.alt_text ?? item.filename}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                      <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                        {item.folder}
                      </span>
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="truncate text-sm font-medium text-slate-900">{item.filename}</p>
                      <p className="truncate text-xs text-slate-500">
                        {item.alt_text || "No alt text"} · {formatBytes(item.size_bytes)}
                      </p>
                      {(item.tags ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(item.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selected ? (
          <MediaDetailPanel
            item={selected}
            slug={slug}
            companyId={companyId}
            folders={folders}
            onClose={() => setSelectedId(null)}
            onCrop={() => setCropItem(selected)}
            onDeleted={() => {
              setItems((current) => current.filter((item) => item.id !== selected.id));
              setSelectedId(null);
              router.refresh();
            }}
            onUpdated={(updated) => {
              setItems((current) =>
                current.map((item) => (item.id === updated.id ? updated : item))
              );
            }}
          />
        ) : null}
      </div>

      {cropItem ? (
        <MediaCropModal
          key={cropItem.id}
          item={cropItem}
          onClose={() => setCropItem(null)}
          onApply={handleCropApply}
          applying={cropping}
        />
      ) : null}
    </div>
  );
}

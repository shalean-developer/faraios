"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { uploadWebsiteImageClient } from "@/lib/website-builder/upload-website-image-client";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  websiteId: string;
  companyId?: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  compact?: boolean;
  className?: string;
};

export function BuilderImageUploadField({
  label,
  websiteId,
  companyId,
  value,
  onChange,
  compact = false,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = (value ?? "").trim();

  async function onPickFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await uploadWebsiteImageClient(websiteId, file, {
      companyId,
      folder: "General",
    });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.url);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <ImagePlus className="h-3.5 w-3.5" />
                {url ? "Replace" : "Upload"}
              </>
            )}
          </button>
          {url ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className={cn(
            "rounded-lg border border-slate-200 object-cover",
            compact ? "h-20 w-20" : "h-36 w-full"
          )}
        />
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500 hover:border-[#4a6fd8] hover:bg-[#eef2ff]/40 disabled:opacity-60",
            compact ? "h-20 w-20 p-2" : "h-32 w-full"
          )}
        >
          <ImagePlus className={cn("text-slate-400", compact ? "h-5 w-5" : "mb-1 h-6 w-6")} />
          {!compact ? <span>JPG, PNG, WebP, GIF · max 5 MB</span> : null}
        </button>
      )}
    </div>
  );
}

type GalleryProps = {
  label: string;
  websiteId: string;
  companyId?: string;
  images: string[];
  onChange: (images: string[]) => void;
};

export function BuilderImageGalleryUpload({
  label,
  websiteId,
  companyId,
  images,
  onChange,
}: GalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setError(null);
    const next = [...images];
    for (const file of Array.from(fileList)) {
      const result = await uploadWebsiteImageClient(websiteId, file, {
      companyId,
      folder: "General",
    });
      if (!result.ok) {
        setError(result.error);
        break;
      }
      next.push(result.url);
    }
    onChange(next);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-xs font-medium text-slate-500">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {images.filter(Boolean).map((url) => (
          <div key={url} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((item) => item !== url))}
              className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-0.5 text-slate-500 shadow-sm hover:text-red-600"
              aria-label="Remove image"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-500 hover:border-[#4a6fd8] disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              Add
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        disabled={uploading}
        onChange={(e) => void onPickFiles(e.target.files)}
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      <p className="mt-2 text-[10px] text-slate-400">JPG, PNG, WebP, or GIF · max 5 MB each</p>
    </fieldset>
  );
}

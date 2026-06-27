"use client";

import { ImagePlus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { uploadWebsiteMediaClient } from "@/lib/website-builder/media-client";
import { cn } from "@/lib/utils";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";

type Props = {
  open: boolean;
  onClose: () => void;
  websiteId: string;
  companyId: string;
  mediaItems: WebsiteMediaRecord[];
  onSelect: (url: string, alt?: string) => void;
};

export function RichTextMediaPicker({
  open,
  onClose,
  websiteId,
  companyId,
  mediaItems,
  onSelect,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const images = mediaItems.filter((item) => item.mime_type.startsWith("image/"));

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    const result = await uploadWebsiteMediaClient(websiteId, file, {
      companyId,
      folder: "Blog",
      altText: file.name.replace(/\.[^.]+$/, ""),
      tags: ["blog"],
    });
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSelect(result.url, file.name.replace(/\.[^.]+$/, ""));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Insert image</h3>
            <p className="text-xs text-slate-500">Upload a new file or choose from your media library.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleUpload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-4">
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-slate-500">
              <ImagePlus className="mb-2 h-8 w-8 text-slate-300" />
              No images in your library yet. Upload one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.url, item.alt_text ?? item.filename);
                    onClose();
                  }}
                  className={cn(
                    "group overflow-hidden rounded-lg border border-slate-200 text-left transition hover:border-violet-300 hover:ring-2 hover:ring-violet-100"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.alt_text ?? item.filename}
                    className="aspect-video w-full object-cover"
                  />
                  <p className="truncate px-2 py-1.5 text-xs text-slate-600 group-hover:text-violet-700">
                    {item.filename}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

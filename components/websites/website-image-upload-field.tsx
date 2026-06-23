"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const labelClass = "text-sm font-medium text-slate-700";
const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm";

type Props = {
  label: string;
  websiteId: string;
  value: string;
  alt: string;
  onValueChange: (value: string) => void;
  onAltChange: (value: string) => void;
  altLabel?: string;
  className?: string;
};

export function WebsiteImageUploadField({
  label,
  websiteId,
  value,
  alt,
  onValueChange,
  onAltChange,
  altLabel = "Image alt text",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReady(true);
  }, []);

  const onPickFile = async (file: File | null) => {
    if (!file || !ready) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch(`/api/websites/${websiteId}/images`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        setError(payload.error ?? "Upload failed. Please try again.");
        return;
      }

      onValueChange(payload.url);
      if (!alt.trim() && file.name) {
        const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
        if (baseName) onAltChange(baseName);
      }
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={labelClass}>{label}</p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={!ready || uploading}
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!ready || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                {value ? "Replace image" : "Upload image"}
              </>
            )}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => onValueChange("")}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <label className={labelClass}>
        {altLabel}
        <input
          className={inputClass}
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Describe the image for accessibility"
        />
      </label>

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

      {value.trim() ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.trim()}
          alt={alt || "Uploaded preview"}
          className="h-36 w-full rounded-lg border border-slate-200 object-cover"
        />
      ) : (
        <button
          type="button"
          disabled={!ready || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500 transition hover:border-violet-300 hover:bg-violet-50/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="mb-2 h-6 w-6 text-slate-400" />
          Click to upload JPG, PNG, WebP, or GIF (max 5 MB)
        </button>
      )}
    </div>
  );
}

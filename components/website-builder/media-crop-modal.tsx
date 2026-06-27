"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, Loader2, X } from "lucide-react";

import { cropImageToBlob, loadImageElement } from "@/lib/website-builder/media-client";
import { cn } from "@/lib/utils";
import type { WebsiteMediaCropRect, WebsiteMediaRecord } from "@/types/website-builder-media";

type AspectPreset = "free" | "1:1" | "16:9" | "4:3";

const ASPECT_VALUES: Record<Exclude<AspectPreset, "free">, number> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
};

type Props = {
  item: WebsiteMediaRecord;
  onClose: () => void;
  onApply: (file: Blob, filename: string) => Promise<void>;
  applying?: boolean;
};

export function MediaCropModal({ item, onClose, onApply, applying = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aspect, setAspect] = useState<AspectPreset>("free");
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<WebsiteMediaCropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const dragRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startCrop: WebsiteMediaCropRect;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadImageElement(item.url)
      .then((img) => {
        if (cancelled) return;
        setError(null);
        setImageEl(img);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.url]);

  const initCrop = useCallback(
    (width: number, height: number, preset: AspectPreset) => {
      if (!width || !height) return;

      let cropWidth = width * 0.8;
      let cropHeight = height * 0.8;

      if (preset !== "free") {
        const ratio = ASPECT_VALUES[preset];
        if (cropWidth / cropHeight > ratio) {
          cropWidth = cropHeight * ratio;
        } else {
          cropHeight = cropWidth / ratio;
        }
      }

      setCrop({
        x: (width - cropWidth) / 2,
        y: (height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    },
    []
  );

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const width = img.clientWidth;
    const height = img.clientHeight;
    setDisplaySize({ width, height });
    initCrop(width, height, aspect);
  }

  function handleAspectChange(preset: AspectPreset) {
    setAspect(preset);
    if (displaySize.width && displaySize.height) {
      initCrop(displaySize.width, displaySize.height, preset);
    }
  }

  function clampCrop(next: WebsiteMediaCropRect): WebsiteMediaCropRect {
    const maxW = displaySize.width;
    const maxH = displaySize.height;
    const width = Math.max(40, Math.min(next.width, maxW));
    const height = Math.max(40, Math.min(next.height, maxH));
    const x = Math.max(0, Math.min(next.x, maxW - width));
    const y = Math.max(0, Math.min(next.y, maxH - height));
    return { x, y, width, height };
  }

  function onPointerDown(
    e: React.PointerEvent,
    mode: "move" | "resize"
  ) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: crop,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const start = drag.startCrop;

    if (drag.mode === "move") {
      setCrop(
        clampCrop({
          ...start,
          x: start.x + dx,
          y: start.y + dy,
        })
      );
      return;
    }

    let nextWidth = start.width + dx;
    let nextHeight = start.height + dy;

    if (aspect !== "free") {
      const ratio = ASPECT_VALUES[aspect];
      if (nextWidth / nextHeight > ratio) {
        nextWidth = nextHeight * ratio;
      } else {
        nextHeight = nextWidth / ratio;
      }
    }

    setCrop(
      clampCrop({
        ...start,
        width: nextWidth,
        height: nextHeight,
      })
    );
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  async function handleApply() {
    if (!imageEl) return;
    setError(null);
    try {
      const blob = await cropImageToBlob(imageEl, crop, item.mime_type);
      const ext = item.mime_type === "image/png" ? "png" : "jpg";
      await onApply(blob, `${item.filename.replace(/\.[^.]+$/, "")}-cropped.${ext}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not crop image.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close crop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Crop image</h2>
            <p className="mt-0.5 text-sm text-slate-500">{item.filename}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {(["free", "1:1", "16:9", "4:3"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleAspectChange(preset)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                aspect === preset
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {preset === "free" ? "Free" : preset}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-[#f0f2f5] p-5">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : error && !imageEl ? (
            <p className="text-center text-sm text-red-600">{error}</p>
          ) : imageEl ? (
            <div
              ref={containerRef}
              className="relative mx-auto w-fit max-w-full select-none"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.alt_text ?? item.filename}
                className="max-h-[50vh] w-auto max-w-full rounded-lg"
                onLoad={onImageLoad}
                draggable={false}
              />
              <div
                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height,
                  cursor: "move",
                }}
                onPointerDown={(e) => onPointerDown(e, "move")}
              >
                <span
                  className="absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm border-2 border-white bg-violet-600"
                  onPointerDown={(e) => onPointerDown(e, "resize")}
                />
              </div>
            </div>
          ) : null}
          {error && imageEl ? (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={applying || loading || !imageEl}
            onClick={() => void handleApply()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Crop className="h-4 w-4" />
                Apply crop
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

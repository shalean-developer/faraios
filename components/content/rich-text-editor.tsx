"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/hooks/use-mounted";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";

import { RichTextMediaPicker } from "./rich-text-media-picker";

type MediaContext = {
  websiteId: string;
  companyId: string;
  mediaItems?: WebsiteMediaRecord[];
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClassName?: string;
  media?: MediaContext;
};

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-violet-50 text-violet-700"
      )}
    >
      {children}
    </button>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your article…",
  className,
  minHeightClassName = "min-h-[220px]",
  media,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const mounted = useMounted();

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !mounted) return;
    if (value !== lastValueRef.current && editor.innerHTML !== value) {
      editor.innerHTML = value || "";
      lastValueRef.current = value;
    }
  }, [value, mounted]);

  function syncChange() {
    const html = editorRef.current?.innerHTML ?? "";
    const normalized = html === "<br>" ? "" : html;
    lastValueRef.current = normalized;
    onChange(normalized);
  }

  function runCommand(command: string, argument?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    syncChange();
  }

  function insertHtml(html: string) {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncChange();
  }

  function insertInlineCode() {
    const selection = window.getSelection();
    const text = selection?.toString() || "code";
    insertHtml(`<code>${escapeHtml(text)}</code>`);
  }

  function insertLink() {
    const url = window.prompt("Link URL", "https://");
    if (!url?.trim()) return;
    runCommand("createLink", url.trim());
  }

  function insertImage(url: string, alt = "") {
    const safeAlt = escapeHtml(alt);
    insertHtml(
      `<figure><img src="${url}" alt="${safeAlt}" loading="lazy" /><figcaption>${safeAlt}</figcaption></figure><p><br></p>`
    );
  }

  function insertImageFromUrl() {
    const url = window.prompt("Image URL", "https://");
    if (!url?.trim()) return;
    const alt = window.prompt("Alt text (optional)", "") ?? "";
    insertImage(url.trim(), alt.trim());
  }

  function insertVideoEmbed() {
    const url = window.prompt("YouTube or Vimeo URL");
    if (!url?.trim()) return;
    const trimmed = url.trim();
    let embedUrl: string | null = null;

    const youtubeMatch = trimmed.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/i
    );
    if (youtubeMatch?.[1]) {
      embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/i);
    if (!embedUrl && vimeoMatch?.[1]) {
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    if (embedUrl) {
      insertHtml(
        `<div><iframe src="${embedUrl}" title="Embedded video" loading="lazy" allowfullscreen="true"></iframe></div><p><br></p>`
      );
      return;
    }

    insertHtml(
      `<p><a href="${escapeHtml(trimmed)}" target="_blank" rel="noopener noreferrer">Watch video</a></p>`
    );
  }

  function openImagePicker() {
    if (media?.websiteId) {
      setMediaPickerOpen(true);
      return;
    }
    insertImageFromUrl();
  }

  if (!mounted) {
    return (
      <div className={cn("overflow-hidden rounded-md border border-slate-200 bg-white", className)}>
        <div className="h-11 border-b border-slate-100 bg-slate-50/80" />
        <div className={cn("animate-pulse bg-slate-50", minHeightClassName)} />
      </div>
    );
  }

  return (
    <>
      <div className={cn("overflow-hidden rounded-md border border-slate-200 bg-white", className)}>
        <div className="flex flex-wrap gap-0.5 border-b border-slate-100 bg-slate-50/80 p-1.5">
          <ToolbarButton label="Undo" onClick={() => runCommand("undo")}>
            <Undo2 className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => runCommand("redo")}>
            <Redo2 className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <span className="mx-1 w-px self-stretch bg-slate-200" aria-hidden />
          <ToolbarButton label="Bold" onClick={() => runCommand("bold")}>
            <Bold className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => runCommand("italic")}>
            <Italic className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => runCommand("underline")}>
            <Underline className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" onClick={() => runCommand("strikeThrough")}>
            <Strikethrough className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Inline code" onClick={insertInlineCode}>
            <Code className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <span className="mx-1 w-px self-stretch bg-slate-200" aria-hidden />
          <ToolbarButton label="Heading 2" onClick={() => runCommand("formatBlock", "h2")}>
            <Heading2 className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Heading 3" onClick={() => runCommand("formatBlock", "h3")}>
            <Heading3 className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <span className="mx-1 w-px self-stretch bg-slate-200" aria-hidden />
          <ToolbarButton label="Bullet list" onClick={() => runCommand("insertUnorderedList")}>
            <List className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => runCommand("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Quote" onClick={() => runCommand("formatBlock", "blockquote")}>
            <Quote className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Divider" onClick={() => runCommand("insertHorizontalRule")}>
            <Minus className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <span className="mx-1 w-px self-stretch bg-slate-200" aria-hidden />
          <ToolbarButton label="Align left" onClick={() => runCommand("justifyLeft")}>
            <AlignLeft className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Align center" onClick={() => runCommand("justifyCenter")}>
            <AlignCenter className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <span className="mx-1 w-px self-stretch bg-slate-200" aria-hidden />
          <ToolbarButton label="Link" onClick={insertLink}>
            <Link2 className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Remove link" onClick={() => runCommand("unlink")}>
            <Unlink className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Image" onClick={openImagePicker}>
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton label="Video embed" onClick={insertVideoEmbed}>
            <Video className="h-4 w-4" strokeWidth={1.75} />
          </ToolbarButton>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline
          data-placeholder={placeholder}
          onInput={syncChange}
          onBlur={syncChange}
          className={cn(
            "rich-text-editor prose prose-sm max-w-none px-3 py-3 text-sm text-slate-800 focus:outline-none",
            "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold",
            "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold",
            "[&_p]:my-2 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600",
            "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
            "[&_a]:text-violet-700 [&_a]:underline",
            "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:text-xs",
            "[&_hr]:my-6 [&_hr]:border-slate-200",
            "[&_figure]:my-4 [&_figure_img]:w-full [&_figure_img]:rounded-lg",
            "[&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-slate-500",
            "[&_iframe]:my-4 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-lg",
            minHeightClassName,
            "[&:empty]:before:pointer-events-none [&:empty]:before:text-slate-400 [&:empty]:before:content-[attr(data-placeholder)]"
          )}
        />
      </div>

      {media?.websiteId ? (
        <RichTextMediaPicker
          open={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          websiteId={media.websiteId}
          companyId={media.companyId}
          mediaItems={media.mediaItems ?? []}
          onSelect={insertImage}
        />
      ) : null}
    </>
  );
}

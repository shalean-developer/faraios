import { looksLikeHtml, plainTextFromHtml, sanitizeContentHtml } from "@/lib/content/html";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
};

export function ContentBody({ content, className }: Props) {
  if (!content.trim()) return null;

  if (!looksLikeHtml(content)) {
    return (
      <article className={cn("prose prose-slate max-w-none whitespace-pre-wrap", className)}>
        {content}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "prose prose-slate max-w-none [&_a]:text-violet-700 [&_a]:no-underline hover:[&_a]:underline",
        "[&_img]:rounded-lg [&_figure]:my-6 [&_figure_img]:w-full",
        "[&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-slate-500",
        "[&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-lg",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-4",
        "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(content) }}
    />
  );
}

export function contentExcerpt(content: string, maxLength = 160): string {
  const text = looksLikeHtml(content) ? plainTextFromHtml(content) : content;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

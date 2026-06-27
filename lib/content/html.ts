const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "div",
  "span",
  "img",
  "figure",
  "figcaption",
  "hr",
  "pre",
  "code",
  "iframe",
]);

const VIDEO_EMBED_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
];

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

function sanitizeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href || /^javascript:/i.test(href) || /^data:/i.test(href)) return null;
  return href.replace(/"/g, "&quot;");
}

function sanitizeImageSrc(raw: string): string | null {
  const src = raw.trim();
  if (!src || /^javascript:/i.test(src) || /^data:/i.test(src)) return null;
  if (!/^https?:\/\//i.test(src)) return null;
  return src.replace(/"/g, "&quot;");
}

function sanitizeIframeSrc(raw: string): string | null {
  const src = sanitizeImageSrc(raw);
  if (!src) return null;
  try {
    const host = new URL(src).hostname.toLowerCase();
    if (!VIDEO_EMBED_HOSTS.includes(host)) return null;
    return src;
  } catch {
    return null;
  }
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sanitizeContentHtml(input: string): string {
  let html = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");

  html = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, (iframe) => {
    const srcMatch = iframe.match(/src\s*=\s*("([^"]*)"|'([^']*)')/i);
    const src = sanitizeIframeSrc(srcMatch?.[2] ?? srcMatch?.[3] ?? "");
    if (!src) return "";
    return `<iframe src="${src}" title="Embedded video" loading="lazy" allowfullscreen="true"></iframe>`;
  });

  html = html.replace(/<img\b[^>]*>/gi, (match) => {
    const srcMatch = match.match(/src\s*=\s*("([^"]*)"|'([^']*)')/i);
    const altMatch = match.match(/alt\s*=\s*("([^"]*)"|'([^']*)')/i);
    const src = sanitizeImageSrc(srcMatch?.[2] ?? srcMatch?.[3] ?? "");
    if (!src) return "";
    const alt = escapeText(altMatch?.[2] ?? altMatch?.[3] ?? "");
    return `<img src="${src}" alt="${alt}" loading="lazy" />`;
  });

  html = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
    const hrefMatch = anchor.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
    const href = sanitizeHref(hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
    if (!href) return "";
    const inner = anchor.replace(/<a\b[^>]*>/i, "").replace(/<\/a>/i, "");
    return `<a href="${href}" rel="noopener noreferrer" target="_blank">${inner}</a>`;
  });

  html = html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName: string) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";

    if (match.startsWith("</")) return `</${tag}>`;
    if (tag === "br" || tag === "hr") return `<${tag}>`;
    if (tag === "img" || tag === "iframe") return match;
    if (tag === "a") return "";

    return `<${tag}>`;
  });

  return html.trim();
}

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

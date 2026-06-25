import type { PageAnalysisInput } from "@/types/seo-v10";
import { analyzeKeyword, scorePage } from "./scoring-engine";

export { scorePage, analyzeKeyword, aggregateHealthScore } from "./scoring-engine";

export type ParsedPageHtml = {
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  h2Count: number;
  h3Count: number;
  headings: string[];
  firstParagraph: string;
  conclusion: string;
  internalLinks: number;
  externalLinks: number;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  hasOgTags: boolean;
  hasTwitterCards: boolean;
  hasSchema: boolean;
  imageAlts: string[];
  imageAltMissing: number;
  imageIssues: { url: string; issue: string }[];
  contentLength: number;
  isHttps: boolean;
  httpStatus: number | null;
};

export function parseHtmlForSeo(html: string, url: string): ParsedPageHtml {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const metaDescMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  ) ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  const h2Count = (html.match(/<h2[\s>]/gi) ?? []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) ?? []).length;

  const headings: string[] = [];
  const headingRegex = /<h[2-3][^>]*>([^<]*)<\/h[2-3]>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = headingRegex.exec(html)) !== null) {
    headings.push(hm[1].trim());
  }

  const pMatch = html.match(/<p[^>]*>([^<]{20,})<\/p>/i);
  const allP = [...html.matchAll(/<p[^>]*>([^<]+)<\/p>/gi)].map((m) => m[1].trim());
  const firstParagraph = pMatch?.[1]?.trim() ?? allP[0] ?? "";
  const conclusion = allP.length > 1 ? allP[allP.length - 1] : "";

  const linkMatches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)];
  let internalLinks = 0;
  let externalLinks = 0;
  try {
    const base = new URL(url);
    for (const m of linkMatches) {
      try {
        const href = m[1];
        if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === base.hostname) internalLinks++;
        else externalLinks++;
      } catch {
        // skip invalid
      }
    }
  } catch {
    internalLinks = linkMatches.length;
  }

  const canonicalMatch =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  const robotsMatch =
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i);

  const hasOgTags = /<meta[^>]+property=["']og:/i.test(html);
  const hasTwitterCards = /<meta[^>]+name=["']twitter:/i.test(html);
  const hasSchema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);

  const imageAlts: string[] = [];
  let imageAltMissing = 0;
  const imageIssues: { url: string; issue: string }[] = [];
  const imgRegex = /<img[^>]*>/gi;
  let im: RegExpExecArray | null;
  while ((im = imgRegex.exec(html)) !== null) {
    const tag = im[0];
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    const src = srcMatch?.[1] ?? "unknown";
    if (!altMatch || !altMatch[1].trim()) {
      imageAltMissing++;
      imageIssues.push({ url: src, issue: "Missing ALT text" });
    } else {
      imageAlts.push(altMatch[1]);
    }
    if (src && !/\.(webp|avif)$/i.test(src) && /\.(png|jpg|jpeg)$/i.test(src)) {
      const name = src.split("/").pop() ?? "";
      if (/^(img|image|photo|untitled)/i.test(name)) {
        imageIssues.push({ url: src, issue: "Poor filename — use descriptive names" });
      }
    }
    if (!/width=/i.test(tag) || !/height=/i.test(tag)) {
      imageIssues.push({ url: src, issue: "Missing width/height dimensions" });
    }
  }

  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let isHttps = true;
  try {
    isHttps = new URL(url).protocol === "https:";
  } catch {
    isHttps = false;
  }

  return {
    metaTitle: titleMatch?.[1]?.trim() ?? null,
    metaDescription: metaDescMatch?.[1]?.trim() ?? null,
    h1: h1Match?.[1]?.trim() ?? null,
    h2Count,
    h3Count,
    headings,
    firstParagraph,
    conclusion,
    internalLinks,
    externalLinks,
    canonicalUrl: canonicalMatch?.[1]?.trim() ?? null,
    robotsMeta: robotsMatch?.[1]?.trim() ?? null,
    hasOgTags,
    hasTwitterCards,
    hasSchema,
    imageAlts,
    imageAltMissing,
    imageIssues,
    contentLength: textContent.length,
    isHttps,
    httpStatus: 200,
  };
}

export function buildAnalysisInput(
  url: string,
  parsed: ParsedPageHtml,
  focusKeywords: string[],
  brokenLinks = 0
): PageAnalysisInput {
  return {
    url,
    metaTitle: parsed.metaTitle,
    metaDescription: parsed.metaDescription,
    h1: parsed.h1,
    h2Count: parsed.h2Count,
    h3Count: parsed.h3Count,
    contentLength: parsed.contentLength,
    internalLinks: parsed.internalLinks,
    externalLinks: parsed.externalLinks,
    brokenLinks,
    hasSchema: parsed.hasSchema,
    hasOgTags: parsed.hasOgTags,
    hasTwitterCards: parsed.hasTwitterCards,
    canonicalUrl: parsed.canonicalUrl,
    robotsMeta: parsed.robotsMeta,
    isHttps: parsed.isHttps,
    isIndexable: !parsed.robotsMeta?.toLowerCase().includes("noindex"),
    httpStatus: parsed.httpStatus,
    focusKeywords,
    imageAltMissing: parsed.imageAltMissing,
    imageIssues: parsed.imageIssues,
  };
}

export function analyzePageFromHtml(
  html: string,
  url: string,
  focusKeywords: string[] = []
) {
  const parsed = parseHtmlForSeo(html, url);
  const input = buildAnalysisInput(url, parsed, focusKeywords);
  const score = scorePage(input);
  const keywordResults = focusKeywords.map((kw) =>
    analyzeKeyword(kw, {
      url,
      metaTitle: parsed.metaTitle,
      metaDescription: parsed.metaDescription,
      h1: parsed.h1,
      headings: parsed.headings,
      firstParagraph: parsed.firstParagraph,
      conclusion: parsed.conclusion,
      imageAlts: parsed.imageAlts,
      fullContent: html.replace(/<[^>]+>/g, " "),
    })
  );
  return { parsed, input, score, keywordResults };
}

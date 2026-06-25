import type {
  KeywordAnalysisResult,
  PageAnalysisInput,
  PageScoreResult,
  SeoIssue,
  SeoIssueSeverity,
} from "@/types/seo-v10";

let issueCounter = 0;
function issue(
  severity: SeoIssueSeverity,
  category: string,
  message: string,
  field?: string
): SeoIssue {
  issueCounter += 1;
  return { id: `issue-${issueCounter}`, severity, category, message, field };
}

function containsKeyword(text: string | null | undefined, keyword: string): boolean {
  if (!text || !keyword) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function keywordDensity(content: string, keyword: string): number {
  if (!content || !keyword) return 0;
  const words = content.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const kw = keyword.toLowerCase();
  const count = words.filter((w) => w.includes(kw)).length;
  return Math.round((count / words.length) * 10000) / 100;
}

export function scorePage(input: PageAnalysisInput): PageScoreResult {
  issueCounter = 0;
  const issues: SeoIssue[] = [];
  const primaryKw = input.focusKeywords[0] ?? "";

  // Title
  if (!input.metaTitle?.trim()) {
    issues.push(issue("critical", "title", "Missing meta title", "meta_title"));
  } else {
    const len = input.metaTitle.length;
    if (len < 30) issues.push(issue("warning", "title", `Title too short (${len} chars). Aim for 50–60.`, "meta_title"));
    else if (len > 60) issues.push(issue("warning", "title", `Title too long (${len} chars). Aim for 50–60.`, "meta_title"));
    else issues.push(issue("passed", "title", "Title length is optimal", "meta_title"));
    if (primaryKw && !containsKeyword(input.metaTitle, primaryKw)) {
      issues.push(issue("warning", "keyword", `Focus keyword "${primaryKw}" not in title`, "meta_title"));
    } else if (primaryKw) {
      issues.push(issue("passed", "keyword", "Focus keyword found in title", "meta_title"));
    }
  }

  // Meta description
  if (!input.metaDescription?.trim()) {
    issues.push(issue("critical", "description", "Missing meta description", "meta_description"));
  } else {
    const len = input.metaDescription.length;
    if (len < 120) issues.push(issue("warning", "description", `Description too short (${len} chars). Aim for 150–160.`, "meta_description"));
    else if (len > 160) issues.push(issue("warning", "description", `Description too long (${len} chars).`, "meta_description"));
    else issues.push(issue("passed", "description", "Description length is good", "meta_description"));
    if (primaryKw && !containsKeyword(input.metaDescription, primaryKw)) {
      issues.push(issue("recommendation", "keyword", `Add focus keyword "${primaryKw}" to meta description`, "meta_description"));
    }
  }

  // H1
  if (!input.h1?.trim()) {
    issues.push(issue("critical", "headings", "Missing H1 heading", "h1"));
  } else {
    issues.push(issue("passed", "headings", "H1 present", "h1"));
    if (primaryKw && !containsKeyword(input.h1, primaryKw)) {
      issues.push(issue("recommendation", "keyword", `Consider including "${primaryKw}" in H1`, "h1"));
    }
  }

  // Structure
  if (input.h2Count === 0) {
    issues.push(issue("recommendation", "structure", "No H2 headings found — add subheadings for readability"));
  } else {
    issues.push(issue("passed", "structure", `${input.h2Count} H2 heading(s) found`));
  }

  // Content length
  if (input.contentLength < 300) {
    issues.push(issue("warning", "content", `Thin content (${input.contentLength} chars). Aim for 300+ words.`));
  } else {
    issues.push(issue("passed", "content", "Content length is adequate"));
  }

  // Links
  if (input.internalLinks < 2) {
    issues.push(issue("recommendation", "links", "Add more internal links for site structure"));
  } else {
    issues.push(issue("passed", "links", `${input.internalLinks} internal link(s)`));
  }
  if (input.brokenLinks > 0) {
    issues.push(issue("critical", "links", `${input.brokenLinks} broken link(s) detected`));
  }

  // Technical
  if (!input.isHttps) issues.push(issue("critical", "technical", "Page is not served over HTTPS"));
  else issues.push(issue("passed", "technical", "HTTPS enabled"));

  if (input.robotsMeta?.toLowerCase().includes("noindex")) {
    issues.push(issue("warning", "indexability", "Page has noindex — will not appear in search results"));
  } else if (!input.isIndexable) {
    issues.push(issue("warning", "indexability", "Page marked as not indexable"));
  } else {
    issues.push(issue("passed", "indexability", "Page is indexable"));
  }

  if (input.httpStatus && input.httpStatus >= 400) {
    issues.push(issue("critical", "technical", `HTTP status ${input.httpStatus}`));
  }

  // Schema & social
  if (!input.hasSchema) issues.push(issue("recommendation", "schema", "Add structured data (JSON-LD)"));
  else issues.push(issue("passed", "schema", "Structured data present"));

  if (!input.hasOgTags) issues.push(issue("warning", "social", "Missing Open Graph tags"));
  else issues.push(issue("passed", "social", "Open Graph tags present"));

  if (!input.hasTwitterCards) issues.push(issue("recommendation", "social", "Add Twitter Card tags"));
  else issues.push(issue("passed", "social", "Twitter Card tags present"));

  if (!input.canonicalUrl) issues.push(issue("recommendation", "technical", "Set a canonical URL"));
  else issues.push(issue("passed", "technical", "Canonical URL set"));

  // URL keyword
  if (primaryKw && !containsKeyword(input.url, primaryKw.replace(/\s+/g, "-"))) {
    issues.push(issue("recommendation", "keyword", `Focus keyword not reflected in URL slug`, "url"));
  }

  // Images
  if (input.imageAltMissing > 0) {
    issues.push(issue("warning", "images", `${input.imageAltMissing} image(s) missing ALT text`));
  }

  for (const img of input.imageIssues) {
    issues.push(issue("warning", "images", img.issue, img.url));
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const passedCount = issues.filter((i) => i.severity === "passed").length;
  const recommendationCount = issues.filter((i) => i.severity === "recommendation").length;

  const deductions = criticalCount * 12 + warningCount * 5 + recommendationCount * 2;
  const score = Math.max(0, Math.min(100, 100 - deductions));

  return { score, issues, criticalCount, warningCount, passedCount, recommendationCount };
}

export function analyzeKeyword(
  keyword: string,
  input: {
    url: string;
    metaTitle: string | null;
    metaDescription: string | null;
    h1: string | null;
    headings: string[];
    firstParagraph: string;
    conclusion: string;
    imageAlts: string[];
    fullContent: string;
  }
): KeywordAnalysisResult {
  const recommendations: string[] = [];
  const inTitle = containsKeyword(input.metaTitle, keyword);
  const inUrl = containsKeyword(input.url.replace(/-/g, " "), keyword);
  const inMetaDescription = containsKeyword(input.metaDescription, keyword);
  const inFirstParagraph = containsKeyword(input.firstParagraph, keyword);
  const inHeadings = input.headings.some((h) => containsKeyword(h, keyword));
  const inImageAlt = input.imageAlts.some((a) => containsKeyword(a, keyword));
  const inConclusion = containsKeyword(input.conclusion, keyword);
  const densityPercent = keywordDensity(input.fullContent, keyword);

  if (!inTitle) recommendations.push(`Add "${keyword}" to the SEO title`);
  if (!inUrl) recommendations.push(`Include "${keyword}" in the URL slug`);
  if (!inMetaDescription) recommendations.push(`Add "${keyword}" to the meta description`);
  if (!inFirstParagraph) recommendations.push(`Use "${keyword}" in the first paragraph`);
  if (!inHeadings) recommendations.push(`Include "${keyword}" in a heading (H2/H3)`);
  if (!inImageAlt) recommendations.push(`Add "${keyword}" to an image ALT attribute`);
  if (!inConclusion) recommendations.push(`Mention "${keyword}" in the conclusion`);
  if (densityPercent < 0.5) recommendations.push(`Keyword density is low (${densityPercent}%). Aim for 1–2%.`);
  if (densityPercent > 3) recommendations.push(`Keyword density is high (${densityPercent}%). Avoid keyword stuffing.`);

  return {
    keyword,
    inTitle,
    inUrl,
    inMetaDescription,
    inFirstParagraph,
    inHeadings,
    inImageAlt,
    inConclusion,
    densityPercent,
    recommendations,
  };
}

export function aggregateHealthScore(pageScores: number[]): number {
  if (pageScores.length === 0) return 0;
  return Math.round(pageScores.reduce((a, b) => a + b, 0) / pageScores.length);
}

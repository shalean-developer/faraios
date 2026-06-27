import { describe, expect, it } from "vitest";

import { looksLikeHtml, plainTextFromHtml, sanitizeContentHtml } from "../lib/content/html";

describe("content html helpers", () => {
  it("detects html content", () => {
    expect(looksLikeHtml("Hello world")).toBe(false);
    expect(looksLikeHtml("<p>Hello</p>")).toBe(true);
  });

  it("sanitizes unsafe markup", () => {
    expect(sanitizeContentHtml('<p onclick="alert(1)">Hi</p>')).toBe("<p>Hi</p>");
    expect(sanitizeContentHtml('<script>alert(1)</script><p>Safe</p>')).toBe("<p>Safe</p>");
    expect(sanitizeContentHtml('<a href="javascript:alert(1)">Bad</a>')).toBe("");
  });

  it("keeps allowed formatting", () => {
    const html = "<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em></p>";
    expect(sanitizeContentHtml(html)).toBe(html);
  });

  it("keeps allowed images and video embeds", () => {
    expect(
      sanitizeContentHtml('<img src="https://cdn.example.com/a.jpg" alt="Photo" />')
    ).toBe('<img src="https://cdn.example.com/a.jpg" alt="Photo" loading="lazy" />');
    expect(
      sanitizeContentHtml(
        '<iframe src="https://www.youtube.com/embed/abc123" title="x"></iframe>'
      )
    ).toContain("https://www.youtube.com/embed/abc123");
  });

  it("converts html to plain text", () => {
    expect(plainTextFromHtml("<p>Line one</p><p>Line two</p>")).toContain("Line one");
    expect(plainTextFromHtml("<p>Line one</p><p>Line two</p>")).toContain("Line two");
  });
});

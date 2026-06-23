import { describe, expect, it } from "vitest";
import {
  BLOG_PAGE,
  syncBlogPageWithFeatures,
} from "../lib/constants/onboarding-pages";

describe("syncBlogPageWithFeatures", () => {
  it("adds Blog page when blog feature is enabled", () => {
    expect(syncBlogPageWithFeatures(["Home", "About"], ["blog"])).toEqual([
      "Home",
      "About",
      BLOG_PAGE,
    ]);
  });

  it("removes Blog page when blog feature is disabled", () => {
    expect(
      syncBlogPageWithFeatures(["Home", BLOG_PAGE, "Contact"], [])
    ).toEqual(["Home", "Contact"]);
  });
});

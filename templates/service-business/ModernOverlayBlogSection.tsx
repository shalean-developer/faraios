import { ArrowUpRight } from "lucide-react";

import type { BlogPostCard, ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
import { sectionContainer } from "@/templates/service-business/template-styles";
import type { TemplatePaths } from "@/templates/service-business/paths";
import { resolveTemplateHref } from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
};

const DEFAULT_POSTS: BlogPostCard[] = [
  {
    category: "Maintenance",
    title: "Renovation Insights: Tools to Transform Your House",
    excerpt: "Discover the latest tips, tools, and techniques.",
    image:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
  },
  {
    category: "Furniture",
    title: "Modern Kitchen Ideas for Everyday Living",
    excerpt: "Explore layouts, finishes, and smart upgrades for your home.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  },
];

function BlogCard({ post, index }: { post: BlogPostCard; index: number }) {
  return (
    <article className="flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200 sm:aspect-[3/4]">
        <LuxuryImage
          src={post.image || luxuryFallbackImage(index)}
          alt={post.title}
          fill
          fallbackIndex={index}
        />
        <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-md">
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <span className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-sm">
          {post.category}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-bold leading-snug text-slate-900 sm:text-xl">{post.title}</h3>
      {post.excerpt ? (
        <p className="mt-2 text-base leading-relaxed text-slate-600">{post.excerpt}</p>
      ) : null}
    </article>
  );
}

export function ModernOverlayBlogSection({ site, paths }: Props) {
  const { homeBlog, theme } = site;
  const posts = homeBlog.posts.length >= 2 ? homeBlog.posts.slice(0, 2) : DEFAULT_POSTS;
  const exploreHref = resolveTemplateHref(homeBlog.ctaHref, paths);

  return (
    <section id="blog" className="bg-white">
      <div className="py-16 sm:py-20 lg:py-24">
        <div className={sectionContainer}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-14">
            <div className="lg:pt-4">
              <p
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: theme.accent }}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                  aria-hidden
                />
                {homeBlog.label}
              </p>
              <h2 className="mt-4 max-w-md text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
                {homeBlog.heading}
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-slate-600 sm:text-lg">
                {homeBlog.body}
              </p>
              <a
                href={exploreHref}
                className="mt-8 inline-flex rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                style={{ backgroundColor: theme.accent }}
              >
                {homeBlog.ctaLabel}
              </a>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
              {posts.map((post, index) => (
                <BlogCard key={`${post.title}-${index}`} post={post} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

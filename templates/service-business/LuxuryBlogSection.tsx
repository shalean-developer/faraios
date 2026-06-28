import { ArrowUpRight, Calendar, Clock } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
import { luxury } from "@/templates/service-business/luxury-styles";
import { sectionContainer } from "@/templates/service-business/template-styles";
import type { TemplatePaths } from "@/templates/service-business/paths";

const FALLBACK_IMAGE = luxuryFallbackImage(4);

type BlogCard = {
  category: string;
  title: string;
  excerpt?: string;
  image?: string;
  date: string;
  readTime: string;
  featured?: boolean;
};

const DEFAULT_POSTS: BlogCard[] = [
  {
    category: "Wellness",
    title: "Frequent Bodywork Improves Your Total Vitality",
    date: "20/09/25",
    readTime: "10min",
  },
  {
    category: "Wellness",
    title: "Stillness enhances healing journeys.",
    excerpt:
      "Mentored stillness encourages serenity, awareness, and profound resting throughout spa visits.",
    image: FALLBACK_IMAGE,
    date: "20/09/25",
    readTime: "10min",
    featured: true,
  },
  {
    category: "Wellness",
    title: "Warm Tranquility and Comfort Benefits Clarified",
    date: "20/09/25",
    readTime: "10min",
  },
];

function buildPosts(site: ParsedSiteContent): BlogCard[] {
  const { howItWorks, services } = site;
  const steps = howItWorks.steps.slice(0, 3);
  if (steps.length < 3) return DEFAULT_POSTS;

  const images = services.items.map((s) => s.image).filter(Boolean) as string[];

  return steps.map((step, index) => ({
    category: "Wellness",
    title: step.title,
    excerpt: index === 1 ? step.description : undefined,
    image: index === 1 ? images[0] || FALLBACK_IMAGE : undefined,
    date: "20/09/25",
    readTime: "10min",
    featured: index === 1,
  }));
}

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
  showExploreMore?: boolean;
};

export function LuxuryBlogSection({ site, paths, showExploreMore = true }: Props) {
  const posts = buildPosts(site);

  return (
    <section id="blog" className="bg-[#f5f3e7] py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="text-sm font-medium tracking-wide text-[#2d2926]/70"
              style={{ fontFamily: luxury.sans }}
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#2d2926]/50" aria-hidden />
              Wellness Blog
            </p>
            <h2
              className="mt-4 max-w-xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.12] text-[#2d2926]"
              style={{ fontFamily: luxury.serif }}
            >
              Holistic perspectives for Being and Spirit
            </h2>
          </div>
          {showExploreMore ? (
          <a
            href={paths.blog}
            className="inline-flex shrink-0 items-stretch overflow-hidden rounded-sm bg-[#2a2018] text-[#f5f3e7] shadow-md transition hover:bg-[#1f1612]"
            style={{ fontFamily: luxury.sans }}
          >
            <span className="flex items-center px-5 py-3.5 text-sm font-semibold">Explore More</span>
            <span className="flex w-12 items-center justify-center border-l border-[#f5f3e7]/15 bg-[#342820]">
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </a>
          ) : null}
        </div>

        <ul className="mt-12 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {posts.map((post) => (
            <li key={post.title}>
              <article
                className={`flex h-full flex-col rounded-sm bg-[#ebe7d8] p-6 sm:p-7 ${
                  post.featured ? "lg:flex-row lg:gap-6 lg:p-7" : ""
                }`}
              >
                <div className={post.featured ? "flex min-w-0 flex-1 flex-col" : "flex flex-1 flex-col"}>
                  <p
                    className="text-xs font-medium uppercase tracking-wide text-[#2d2926]/55"
                    style={{ fontFamily: luxury.sans }}
                  >
                    {post.category}
                  </p>
                  <h3
                    className="mt-3 text-xl font-medium leading-snug text-[#2d2926] sm:text-2xl"
                    style={{ fontFamily: luxury.serif }}
                  >
                    {post.title}
                  </h3>
                  {post.excerpt ? (
                    <p
                      className="mt-3 text-sm leading-relaxed text-[#2d2926]/75"
                      style={{ fontFamily: luxury.sans }}
                    >
                      {post.excerpt}
                    </p>
                  ) : null}
                  <div
                    className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-xs text-[#2d2926]/55"
                    style={{ fontFamily: luxury.sans }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {post.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {post.readTime}
                    </span>
                  </div>
                </div>
                {post.featured && post.image ? (
                  <div className="relative mt-5 aspect-[3/4] w-full shrink-0 overflow-hidden bg-[#d8d0c0] lg:mt-0 lg:w-[140px]">
                    <LuxuryImage src={post.image} alt="" fill fallbackIndex={4} />
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

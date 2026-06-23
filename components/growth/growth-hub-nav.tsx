import Link from "next/link";

import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "seo", label: "SEO", href: (slug: string) => `/${slug}/dashboard/seo` },
  { key: "marketing", label: "Marketing", href: (slug: string) => `/${slug}/dashboard/marketing` },
  { key: "reviews", label: "Reviews", href: (slug: string) => `/${slug}/dashboard/reviews` },
  { key: "campaigns", label: "Campaigns", href: (slug: string) => `/${slug}/dashboard/campaigns` },
  { key: "content", label: "Content", href: (slug: string) => `/${slug}/dashboard/content` },
  { key: "analytics", label: "Analytics", href: (slug: string) => `/${slug}/dashboard/analytics` },
] as const;

export function GrowthHubNav({
  slug,
  active,
}: {
  slug: string;
  active: (typeof ITEMS)[number]["key"];
}) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href(slug)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            active === item.key
              ? "bg-violet-100 text-violet-800"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

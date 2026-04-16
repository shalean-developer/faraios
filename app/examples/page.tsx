import Link from "next/link";

import { Navbar } from "@/components/Navbar";

const EXAMPLES = [
  {
    businessName: "Luxe Interiors Co.",
    description: "Luxury interior design studio website with project showcase.",
    imageAlt: "Preview for Luxe Interiors Co. website",
    siteUrl: "#",
  },
  {
    businessName: "GreenLeaf Dental",
    description: "Patient-focused dental practice site with booking highlights.",
    imageAlt: "Preview for GreenLeaf Dental website",
    siteUrl: "#",
  },
  {
    businessName: "Summit Legal Group",
    description: "Professional law firm website with service pages and contact funnel.",
    imageAlt: "Preview for Summit Legal Group website",
    siteUrl: "#",
  },
  {
    businessName: "Urban Fitness Hub",
    description: "Modern gym website built for memberships and class discovery.",
    imageAlt: "Preview for Urban Fitness Hub website",
    siteUrl: "#",
  },
];

export const metadata = {
  title: "Website Examples - FaraiOS",
  description: "See sample websites built by FaraiOS.",
};

export default async function ExamplesPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <header className="mb-10 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#7C3AED]">
            Our Work
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Website Examples
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Explore sample websites to see the quality and style FaraiOS delivers.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((example) => (
            <article
              key={example.businessName}
              className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm"
            >
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-[#7C3AED]/15 to-[#4F46E5]/15 px-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {example.imageAlt}
                </p>
              </div>
              <div className="space-y-3 p-5">
                <h2 className="text-lg font-semibold text-foreground">
                  {example.businessName}
                </h2>
                <p className="text-sm text-muted-foreground">{example.description}</p>
                <Link
                  href={example.siteUrl}
                  className="inline-flex text-sm font-medium text-[#7C3AED] transition-colors hover:text-[#4F46E5]"
                >
                  View Site
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

import { Star } from "lucide-react";

import type { ParsedSiteContent, TestimonialCard } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { sectionContainer } from "@/templates/service-business/template-styles";

type Props = {
  site: ParsedSiteContent;
};

const DEFAULT_TESTIMONIALS: TestimonialCard[] = [
  {
    quote:
      "They transformed our outdated kitchen into a modern masterpiece. The team was professional, punctual, and truly cared about every detail.",
    name: "Anya Petrova",
    company: "GlobalTech",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    quote:
      "From start to finish, the renovation process was seamless. Our home feels brand new, and we couldn't be happier.",
    name: "Kenji Tanaka",
    company: "InnovCorp",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    quote:
      "Their attention to detail and commitment to quality really set them apart. Highly recommended for any home renovation.",
    name: "Isabelle Dubois",
    company: "Zenith Dynamics",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    quote:
      "Our living room makeover was done perfectly. Every step of the process was handled with professionalism and care.",
    name: "Ricardo Silva",
    company: "Apex Solutions",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
  },
  {
    quote:
      "We appreciated their transparency and dedication throughout the renovation. The outcome is beyond what we hoped for.",
    name: "Mei Chen",
    company: "Stellar Innovations",
    avatar: "https://randomuser.me/api/portraits/women/26.jpg",
  },
  {
    quote:
      "Exceptional craftsmanship and attention to detail. Our home looks amazing and feels more functional than ever.",
    name: "Ethan Blackwood",
    company: "Nova Enterprises",
    avatar: "https://randomuser.me/api/portraits/men/46.jpg",
  },
];

function Avatar({ src, name }: { src?: string; name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-200">
        <LuxuryImage src={src} alt={name} fill fallbackIndex={0} className="rounded-full" />
      </span>
    );
  }

  return (
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
      {initials}
    </span>
  );
}

export function ModernOverlayTestimonialsSection({ site }: Props) {
  const { clientTestimonials, theme } = site;
  const items =
    clientTestimonials.items.length >= 6
      ? clientTestimonials.items.slice(0, 6)
      : DEFAULT_TESTIMONIALS;

  return (
    <section id="testimonials" className="bg-[#f7f5f0] py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="flex items-center justify-center gap-2 text-sm font-medium"
            style={{ color: theme.accent }}
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: theme.accent }}
              aria-hidden
            />
            {clientTestimonials.label}
          </p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
            {clientTestimonials.heading}
          </h2>
        </div>

        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-slate-300/70">
          {items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className="flex flex-col lg:px-8 first:lg:pl-0 last:lg:pr-0"
            >
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-current sm:h-[18px] sm:w-[18px]" />
                ))}
              </div>
              <blockquote className="mt-5 flex-1 text-base leading-relaxed text-slate-700">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <Avatar src={item.avatar} name={item.name} />
                <div>
                  <p className="text-base font-bold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.company}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

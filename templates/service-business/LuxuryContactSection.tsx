import type { ParsedSiteContent } from "@/templates/service-business/content";
import { luxury } from "@/templates/service-business/luxury-styles";
import { LuxuryContactForm } from "@/templates/service-business/LuxuryContactForm";
import { sectionContainer } from "@/templates/service-business/template-styles";

type Props = {
  site: ParsedSiteContent;
  bookingUrl?: string | null;
};

export function LuxuryContactSection({ site, bookingUrl }: Props) {
  const { contact, topbar, services } = site;
  const serviceNames = services.items.map((s) => s.title).filter(Boolean);

  return (
    <section id="contact" className="bg-[#ebe7d1] py-16 sm:py-20 lg:py-24">
      <div className={`${sectionContainer} mx-auto max-w-2xl`}>
        <div className="text-center">
          <h2
            className="text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] text-[#2d2926]"
            style={{ fontFamily: luxury.serif }}
          >
            Stay Connected, stay healthy
          </h2>
          <p
            className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#2d2926]/75"
            style={{ fontFamily: luxury.sans }}
          >
            Our team is always ready to support you with expert care and compassion
          </p>
        </div>
        <div className="mt-10">
          <LuxuryContactForm
            services={serviceNames.length > 0 ? serviceNames : ["General enquiry"]}
            bookingUrl={bookingUrl}
            email={contact.email || topbar.email}
          />
        </div>
      </div>
    </section>
  );
}

import { FaraiPricingPage } from "@/components/pricing/farai-pricing-page";
import { platformPageMetadata } from "@/lib/seo/platform-metadata";

export const metadata = platformPageMetadata({
  title: "Pricing — FaraiOS",
  description:
    "Simple pricing for service businesses. Start with the workspace tools you need today and add websites, hosting, SEO, and marketing as you grow.",
  path: "/pricing",
});

export default function PricingPage() {
  return <FaraiPricingPage />;
}

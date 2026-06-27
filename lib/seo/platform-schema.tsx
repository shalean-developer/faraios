import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import {
  FARAIOS_DEFAULT_DESCRIPTION,
  FARAIOS_OG_IMAGE_PATH,
  FARAIOS_SITE_NAME,
  getPlatformMetadataBase,
} from "@/lib/seo/platform-metadata";

export function PlatformHomeSchema() {
  const base = getPlatformMetadataBase();
  if (!base) return null;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: FARAIOS_SITE_NAME,
        url: base.href,
        logo: new URL(FARAIOS_OG_IMAGE_PATH, base).href,
      },
      {
        "@type": "WebSite",
        name: FARAIOS_SITE_NAME,
        url: base.href,
        description: FARAIOS_DEFAULT_DESCRIPTION,
      },
    ],
  };

  return <SchemaJsonLd data={JSON.stringify(schema)} />;
}

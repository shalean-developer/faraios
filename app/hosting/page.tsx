import { FaraiHostingPage } from "@/components/hosting/farai-hosting-page";
import { platformPageMetadata } from "@/lib/seo/platform-metadata";

export const metadata = platformPageMetadata({
  title: "Hosting — FaraiOS",
  description:
    "Fast, secure cloud hosting for your websites. Buy a FaraiOS hosting plan with free SSL, daily backups, and global CDN.",
  path: "/hosting",
});

export default function HostingPage() {
  return <FaraiHostingPage />;
}

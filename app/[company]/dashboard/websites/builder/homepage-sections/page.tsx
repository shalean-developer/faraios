import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Homepage sections — Website builder",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderHomepageSectionsPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "homepage-sections");
  return renderWebsiteBuilderPage(data);
}

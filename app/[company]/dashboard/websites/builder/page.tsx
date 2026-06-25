import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "./load-page";

export const metadata = {
  title: "Website builder — FaraiOS",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderOverviewPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "overview");
  return renderWebsiteBuilderPage(data);
}

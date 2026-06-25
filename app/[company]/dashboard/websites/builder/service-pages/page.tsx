import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Service pages — Website builder",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderServicePagesPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "service-pages");
  return renderWebsiteBuilderPage(data);
}

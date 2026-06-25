import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "SEO — Website builder",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderSeoPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "seo");
  return renderWebsiteBuilderPage(data);
}

import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Pages — Website builder",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderPagesPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "pages");
  return renderWebsiteBuilderPage(data);
}

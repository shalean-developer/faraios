import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Preview — Website builder",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderPreviewPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "preview");
  return renderWebsiteBuilderPage(data);
}

import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Contact form — Website builder",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderContactPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "contact");
  return renderWebsiteBuilderPage(data);
}

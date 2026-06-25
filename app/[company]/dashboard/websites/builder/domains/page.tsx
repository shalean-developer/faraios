import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Domains — Website builder",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderDomainsPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "domains");
  return renderWebsiteBuilderPage(data);
}

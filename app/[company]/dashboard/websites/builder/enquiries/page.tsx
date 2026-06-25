import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Enquiries — Website builder",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderEnquiriesPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "enquiries");
  return renderWebsiteBuilderPage(data);
}

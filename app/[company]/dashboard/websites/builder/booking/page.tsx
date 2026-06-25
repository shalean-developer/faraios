import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Booking button — Website builder",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ company: string }> };

export default async function WebsiteBuilderBookingPage({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "booking");
  return renderWebsiteBuilderPage(data);
}

import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

type Props = { params: Promise<{ company: string }> };

export default async function PageBuilderRoute({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "page-builder");
  return renderWebsiteBuilderPage(data);
}

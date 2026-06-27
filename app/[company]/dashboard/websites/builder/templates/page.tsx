import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

type Props = { params: Promise<{ company: string }> };

export default async function BuilderTemplatesRoute({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "templates");
  return renderWebsiteBuilderPage(data);
}

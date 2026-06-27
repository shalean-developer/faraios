import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

type Props = { params: Promise<{ company: string }> };

export default async function BuilderThemeRoute({ params }: Props) {
  const { company } = await params;
  const data = await loadWebsiteBuilderPage(company, "theme");
  return renderWebsiteBuilderPage(data);
}

import { renderWebsiteTemplate } from "@/lib/services/render-website-template";
import {
  getWebsiteById,
  getWebsiteContentByWebsiteId,
} from "@/lib/services/websites";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PreviewWebsitePage({ params }: Props) {
  const { id } = await params;
  const website = await getWebsiteById(id);

  if (!website) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Website not configured
      </div>
    );
  }

  const content = await getWebsiteContentByWebsiteId(website.id);
  return renderWebsiteTemplate(website, content, "home");
}

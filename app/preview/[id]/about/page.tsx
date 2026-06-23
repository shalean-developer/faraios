import { renderPreviewWebsitePage } from "@/lib/services/preview-website";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PreviewAboutPage({ params }: Props) {
  const { id } = await params;
  const page = await renderPreviewWebsitePage(id, "about");

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Website not configured
      </div>
    );
  }

  return page;
}

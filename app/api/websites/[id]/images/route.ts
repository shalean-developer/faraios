import { NextResponse } from "next/server";

import {
  assertWebsiteImageUploadAccess,
  uploadWebsiteImage,
} from "@/lib/services/website-image-upload";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: websiteId } = await context.params;

  const access = await assertWebsiteImageUploadAccess(websiteId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid upload request." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Choose an image file to upload." },
      { status: 400 }
    );
  }

  const companyId = String(formData.get("companyId") ?? "").trim() || undefined;
  const folder = String(formData.get("folder") ?? "").trim() || undefined;
  const altText = String(formData.get("altText") ?? "").trim() || undefined;
  const replaceStoragePath =
    String(formData.get("replaceStoragePath") ?? "").trim() || undefined;
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : undefined;

  const result = await uploadWebsiteImage({
    websiteId,
    file,
    companyId,
    folder,
    altText,
    tags,
    replaceStoragePath,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    url: result.url,
    path: result.path,
    mediaId: result.mediaId,
  });
}

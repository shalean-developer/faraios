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

  const result = await uploadWebsiteImage({ websiteId, file });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, url: result.url });
}

import { randomUUID } from "crypto";

import {
  WEBSITE_ASSETS_BUCKET,
  WEBSITE_IMAGE_EXTENSIONS,
  WEBSITE_IMAGE_MAX_BYTES,
  WEBSITE_IMAGE_MIME_TYPES,
} from "@/lib/constants/website-assets";
import { getAdminQueryClient, isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { registerWebsiteMediaRecord } from "@/lib/website-builder/media";
import { createClient } from "@/lib/supabase/server";

export type WebsiteImageUploadInput = {
  websiteId: string;
  file: File;
  companyId?: string;
  filename?: string;
  altText?: string | null;
  folder?: string;
  tags?: string[];
  replaceStoragePath?: string | null;
};

export type WebsiteImageUploadResult =
  | { ok: true; url: string; path: string; mediaId?: string }
  | { ok: false; error: string };

function extensionForFile(file: File): string | null {
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (fromName && WEBSITE_IMAGE_EXTENSIONS.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  switch (file.type) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return null;
  }
}

export async function assertWebsiteImageUploadAccess(websiteId: string): Promise<
  | { ok: true; isAdmin: boolean }
  | { ok: false; error: string }
> {
  const isAdmin = await isCurrentUserPlatformAdmin();
  const authClient = await createClient();

  if (!isAdmin) {
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in again." };

    const { data: website, error: websiteError } = await authClient
      .from("websites")
      .select("id,client_id")
      .eq("id", websiteId)
      .maybeSingle();

    if (websiteError || !website) {
      return { ok: false, error: websiteError?.message ?? "Website not found." };
    }

    const { data: membership, error: membershipError } = await authClient
      .from("memberships")
      .select("id")
      .eq("company_id", website.client_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return { ok: false, error: "You do not have access to this website." };
    }
  }

  return { ok: true, isAdmin };
}

export async function uploadWebsiteImage(
  input: WebsiteImageUploadInput
): Promise<WebsiteImageUploadResult> {
  const websiteId = input.websiteId.trim();
  if (!websiteId) return { ok: false, error: "Website is required." };

  const access = await assertWebsiteImageUploadAccess(websiteId);
  if (!access.ok) return access;

  const file = input.file;
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image file to upload." };
  }

  if (file.size > WEBSITE_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." };
  }

  if (!WEBSITE_IMAGE_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Use a JPG, PNG, WebP, or GIF image." };
  }

  const extension = extensionForFile(file);
  if (!extension) {
    return { ok: false, error: "Unsupported image type." };
  }

  const replacePath = input.replaceStoragePath?.trim();
  const path = replacePath || `${websiteId}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  // Access is verified above; use service role when configured so storage RLS
  // does not block member uploads (policies still apply when only anon key exists).
  const supabase = await getAdminQueryClient();

  const { error: uploadError } = await supabase.storage
    .from(WEBSITE_ASSETS_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: Boolean(replacePath),
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data } = supabase.storage.from(WEBSITE_ASSETS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    return { ok: false, error: "Upload succeeded but the public URL could not be generated." };
  }

  let mediaId: string | undefined;
  if (input.companyId) {
    const displayName =
      input.filename?.trim() ||
      file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() ||
      path.split("/").pop() ||
      "image";

    const registered = await registerWebsiteMediaRecord({
      websiteId,
      companyId: input.companyId,
      storagePath: path,
      url: data.publicUrl,
      filename: displayName,
      mimeType: file.type,
      sizeBytes: file.size,
      altText: input.altText,
      folder: input.folder,
      tags: input.tags,
    });

    if (registered.ok) {
      mediaId = registered.record.id;
    }
  }

  return { ok: true, url: data.publicUrl, path, mediaId };
}

import { WEBSITE_ASSETS_BUCKET } from "@/lib/constants/website-assets";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";

export type RegisterWebsiteMediaInput = {
  websiteId: string;
  companyId: string;
  storagePath: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string | null;
  folder?: string;
  tags?: string[];
};

function filenameFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base;
}

export async function listWebsiteMedia(websiteId: string): Promise<WebsiteMediaRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_media")
    .select("*")
    .eq("website_id", websiteId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01" || error.message.includes("website_media")) {
      return [];
    }
    return [];
  }

  return (data ?? []) as WebsiteMediaRecord[];
}

export async function registerWebsiteMediaRecord(
  input: RegisterWebsiteMediaInput
): Promise<{ ok: true; record: WebsiteMediaRecord } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save media metadata." };

  const now = new Date().toISOString();
  const folder = (input.folder ?? "General").trim() || "General";

  const { data, error } = await admin.client
    .from("website_media")
    .upsert(
      {
        website_id: input.websiteId,
        company_id: input.companyId,
        storage_path: input.storagePath,
        url: input.url,
        filename: input.filename.trim() || filenameFromPath(input.storagePath),
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        alt_text: input.altText?.trim() || null,
        tags: input.tags ?? [],
        folder,
        updated_at: now,
      },
      { onConflict: "website_id,storage_path" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save media metadata." };
  }

  return { ok: true, record: data as WebsiteMediaRecord };
}

/** Import storage objects that lack a website_media row (legacy uploads). */
export async function syncWebsiteMediaFromStorage(
  websiteId: string,
  companyId: string
): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const supabase = admin.client;
  const { data: existing, error: existingError } = await supabase
    .from("website_media")
    .select("storage_path")
    .eq("website_id", websiteId);

  if (existingError) return;

  const knownPaths = new Set((existing ?? []).map((row) => row.storage_path as string));

  const { data: objects, error } = await supabase.storage
    .from(WEBSITE_ASSETS_BUCKET)
    .list(websiteId, { limit: 500, sortBy: { column: "created_at", order: "desc" } });

  if (error || !objects?.length) return;

  const now = new Date().toISOString();
  const inserts = objects
    .filter((obj) => obj.name && !obj.name.endsWith("/"))
    .map((obj) => {
      const storagePath = `${websiteId}/${obj.name}`;
      if (knownPaths.has(storagePath)) return null;

      const { data: urlData } = supabase.storage
        .from(WEBSITE_ASSETS_BUCKET)
        .getPublicUrl(storagePath);

      const mimeType =
        obj.metadata?.mimetype ??
        (obj.name.endsWith(".png")
          ? "image/png"
          : obj.name.endsWith(".webp")
            ? "image/webp"
            : obj.name.endsWith(".gif")
              ? "image/gif"
              : "image/jpeg");

      return {
        website_id: websiteId,
        company_id: companyId,
        storage_path: storagePath,
        url: urlData.publicUrl,
        filename: obj.name,
        mime_type: mimeType,
        size_bytes: obj.metadata?.size ?? 0,
        alt_text: null,
        tags: [] as string[],
        folder: "General",
        created_at: now,
        updated_at: now,
      };
    })
    .filter(Boolean);

  if (!inserts.length) return;

  await supabase.from("website_media").upsert(inserts, {
    onConflict: "website_id,storage_path",
    ignoreDuplicates: true,
  });
}

export async function getWebsiteMediaForCompany(
  websiteId: string,
  companyId: string
): Promise<WebsiteMediaRecord[]> {
  await syncWebsiteMediaFromStorage(websiteId, companyId);
  return listWebsiteMedia(websiteId);
}

export async function deleteWebsiteMediaStorage(path: string): Promise<string | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return "Could not delete file from storage.";

  const { error } = await admin.client.storage.from(WEBSITE_ASSETS_BUCKET).remove([path]);
  if (error) return error.message;
  return null;
}

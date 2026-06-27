"use client";

export type WebsiteImageUploadResponse =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadWebsiteImageClient(
  websiteId: string,
  file: File,
  options?: { companyId?: string; folder?: string; altText?: string }
): Promise<WebsiteImageUploadResponse> {
  const formData = new FormData();
  formData.set("file", file);
  if (options?.companyId) formData.set("companyId", options.companyId);
  if (options?.folder) formData.set("folder", options.folder);
  if (options?.altText) formData.set("altText", options.altText);

  try {
    const response = await fetch(`/api/websites/${websiteId}/images`, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string };
    if (!response.ok || !payload.ok || !payload.url) {
      return { ok: false, error: payload.error ?? "Upload failed. Please try again." };
    }
    return { ok: true, url: payload.url };
  } catch {
    return { ok: false, error: "Upload failed. Check your connection and try again." };
  }
}

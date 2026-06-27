import type { WebsiteMediaCropRect } from "@/types/website-builder-media";

export async function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for cropping."));
    img.src = url;
  });
}

export async function cropImageToBlob(
  image: HTMLImageElement,
  crop: WebsiteMediaCropRect,
  mimeType = "image/jpeg"
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const pixelCrop = {
    x: Math.round(crop.x * scaleX),
    y: Math.round(crop.y * scaleY),
    width: Math.round(crop.width * scaleX),
    height: Math.round(crop.height * scaleY),
  };

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context.");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const outputType = mimeType === "image/png" ? "image/png" : "image/jpeg";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export cropped image."));
          return;
        }
        resolve(blob);
      },
      outputType,
      outputType === "image/jpeg" ? 0.92 : undefined
    );
  });
}

export type WebsiteMediaUploadOptions = {
  companyId: string;
  folder?: string;
  altText?: string;
  tags?: string[];
  replaceStoragePath?: string;
};

export type WebsiteMediaUploadResponse =
  | { ok: true; url: string; path: string; mediaId?: string }
  | { ok: false; error: string };

export async function uploadWebsiteMediaClient(
  websiteId: string,
  file: File | Blob,
  options: WebsiteMediaUploadOptions,
  filename = "image.jpg"
): Promise<WebsiteMediaUploadResponse> {
  const formData = new FormData();
  const uploadFile = file instanceof File ? file : new File([file], filename, { type: file.type });
  formData.set("file", uploadFile);
  formData.set("companyId", options.companyId);
  if (options.folder) formData.set("folder", options.folder);
  if (options.altText) formData.set("altText", options.altText);
  if (options.tags?.length) formData.set("tags", options.tags.join(","));
  if (options.replaceStoragePath) {
    formData.set("replaceStoragePath", options.replaceStoragePath);
  }

  try {
    const response = await fetch(`/api/websites/${websiteId}/images`, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      url?: string;
      path?: string;
      mediaId?: string;
      error?: string;
    };
    if (!response.ok || !payload.ok || !payload.url || !payload.path) {
      return { ok: false, error: payload.error ?? "Upload failed. Please try again." };
    }
    return {
      ok: true,
      url: payload.url,
      path: payload.path,
      mediaId: payload.mediaId,
    };
  } catch {
    return { ok: false, error: "Upload failed. Check your connection and try again." };
  }
}

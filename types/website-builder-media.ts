export const WEBSITE_MEDIA_FOLDERS = [
  "General",
  "Hero",
  "Services",
  "Gallery",
  "Team",
  "Logo",
] as const;

export type WebsiteMediaFolder = (typeof WEBSITE_MEDIA_FOLDERS)[number] | string;

export type WebsiteMediaRecord = {
  id: string;
  website_id: string;
  company_id: string;
  storage_path: string;
  url: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  tags: string[];
  folder: string;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteMediaCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

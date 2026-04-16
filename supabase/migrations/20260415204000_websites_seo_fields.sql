alter table public.websites
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text,
  add column if not exists og_image text;

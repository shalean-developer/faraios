create unique index if not exists website_content_website_section_unique_idx
  on public.website_content (website_id, section);

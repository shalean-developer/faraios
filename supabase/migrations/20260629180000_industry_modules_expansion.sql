-- Expand industries table for multi-industry platform support.
-- Aligns database seeds with lib/industry-modules registry.

alter table public.industries
  add column if not exists is_active boolean default true,
  add column if not exists sort_order int default 0,
  add column if not exists icon text,
  add column if not exists module_version text default '1.0.0';

insert into public.industries (name, slug, description, sort_order, is_active) values
  ('Cleaning Services', 'cleaning', 'Residential and commercial cleaning', 1, true),
  ('Beauty & Spa', 'beauty', 'Salons, spas, and wellness studios', 2, true),
  ('Technology Services', 'technology', 'IT support, repairs, and technology projects', 3, true),
  ('Tourism & Travel', 'tourism', 'Tours, travel experiences, and hospitality', 4, true),
  ('Plumbing', 'plumbing', 'Plumbing repairs, installations, and maintenance', 5, true),
  ('Electrical Services', 'electrical', 'Electrical installation, repair, and inspection', 6, true),
  ('Security Services', 'security', 'Security systems, monitoring, and guarding', 7, true),
  ('Gardening & Landscaping', 'gardening', 'Garden maintenance, landscaping, and outdoor services', 8, true),
  ('Real Estate', 'real-estate', 'Property services, agencies, and management', 9, true),
  ('Fitness & Gyms', 'fitness', 'Gyms, studios, and personal training', 10, true),
  ('Consulting', 'consulting', 'Professional consulting and advisory services', 11, true),
  ('Construction & Painting', 'construction', 'Construction, painting, and renovation projects', 12, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

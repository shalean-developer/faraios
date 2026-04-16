alter table public.websites
  add column if not exists industry text not null default 'general';

-- V2 Website Builder: blog categories and tags (bridges Growth content_posts).

do $$
begin
  if to_regclass('public.content_posts') is null then
    raise exception
      'Missing public.content_posts. Apply V5 growth engine migrations first.';
  end if;
end $$;

create table if not exists public.content_blog_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_blog_categories_company_slug_idx
  on public.content_blog_categories (company_id, lower(slug));

create index if not exists content_blog_categories_company_sort_idx
  on public.content_blog_categories (company_id, sort_order, name);

create table if not exists public.content_blog_tags (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists content_blog_tags_company_slug_idx
  on public.content_blog_tags (company_id, lower(slug));

create index if not exists content_blog_tags_company_name_idx
  on public.content_blog_tags (company_id, name);

alter table public.content_posts
  add column if not exists blog_category_id uuid references public.content_blog_categories (id) on delete set null;

create table if not exists public.content_post_blog_tags (
  post_id uuid not null references public.content_posts (id) on delete cascade,
  tag_id uuid not null references public.content_blog_tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

create index if not exists content_post_blog_tags_tag_idx
  on public.content_post_blog_tags (tag_id);

alter table public.content_blog_categories enable row level security;
alter table public.content_blog_tags enable row level security;
alter table public.content_post_blog_tags enable row level security;

drop policy if exists "content_blog_categories_member" on public.content_blog_categories;
create policy "content_blog_categories_member" on public.content_blog_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_blog_categories.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_blog_categories.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "content_blog_tags_member" on public.content_blog_tags;
create policy "content_blog_tags_member" on public.content_blog_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_blog_tags.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_blog_tags.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "content_post_blog_tags_member" on public.content_post_blog_tags;
create policy "content_post_blog_tags_member" on public.content_post_blog_tags
  for all to authenticated
  using (
    exists (
      select 1
      from public.content_posts p
      join public.memberships m on m.company_id = p.company_id
      where p.id = content_post_blog_tags.post_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.content_posts p
      join public.memberships m on m.company_id = p.company_id
      where p.id = content_post_blog_tags.post_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.content_blog_categories to authenticated;
grant select, insert, update, delete on table public.content_blog_tags to authenticated;
grant select, insert, update, delete on table public.content_post_blog_tags to authenticated;

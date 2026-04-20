-- Enable extension for UUID generation
create extension if not exists pgcrypto;

-- Users table: linked to NextAuth identities and Telegram account
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  github_id text unique,
  telegram_user_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saved content items
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('link', 'image', 'text', 'pdf')),
  title text not null,
  description text,
  url text,
  file_url text,
  preview_image text,
  tags text[] not null default '{}',
  status text not null default 'unread' check (status in ('unread', 'read')),
  source text not null default 'telegram' check (source in ('telegram', 'web', 'import')),
  url_hash text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, url_hash)
);

-- Optional tag registry for suggestions and stats
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  count int not null default 1,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create index if not exists idx_items_user_created_at on public.items(user_id, created_at desc);
create index if not exists idx_items_user_status on public.items(user_id, status);
create index if not exists idx_items_user_tags on public.items using gin(tags);
create index if not exists idx_items_title_search on public.items using gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
before update on public.items
for each row execute function public.set_updated_at();

-- RLS: keep strict by default, allow service_role access (server-side only)
alter table public.users enable row level security;
alter table public.items enable row level security;
alter table public.tags enable row level security;

drop policy if exists users_service_role_all on public.users;
create policy users_service_role_all on public.users
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists items_service_role_all on public.items;
create policy items_service_role_all on public.items
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists tags_service_role_all on public.tags;
create policy tags_service_role_all on public.tags
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

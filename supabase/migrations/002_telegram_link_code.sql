alter table public.users
  add column if not exists telegram_link_code text,
  add column if not exists telegram_link_code_expires_at timestamptz;

create unique index if not exists idx_users_telegram_link_code
  on public.users(telegram_link_code)
  where telegram_link_code is not null;

alter table public.users
  add column if not exists shortcut_api_key text unique;

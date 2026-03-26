create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  google_access_token text,
  google_refresh_token text,
  token_expires_at timestamptz
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  type text check (type in ('calendar_event', 'reminder', 'note')),
  title text not null,
  description text,
  event_date timestamptz,
  raw_note text,
  created_at timestamptz default now(),
  status text default 'processed'
);

create table if not exists public.api_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  endpoint text,
  called_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.api_calls enable row level security;

create policy "users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users can only see own events"
  on public.events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can only see own api calls"
  on public.api_calls for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

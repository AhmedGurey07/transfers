create table if not exists public.orders (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.drivers (
  driver_key text primary key,
  name text not null,
  phone text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff')) default 'staff',
  updated_at timestamptz not null default now()
);

create unique index if not exists workspace_user_roles_single_owner
  on public.workspace_user_roles (role)
  where role = 'owner';

alter table public.orders enable row level security;
alter table public.drivers enable row level security;
alter table public.workspace_user_roles enable row level security;

drop policy if exists "Authenticated workspace access" on public.orders;
create policy "Authenticated workspace access"
  on public.orders
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated workspace access" on public.drivers;
create policy "Authenticated workspace access"
  on public.drivers
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.drivers to authenticated;
grant select on public.workspace_user_roles to authenticated;

drop policy if exists "Users can read their own workspace role" on public.workspace_user_roles;
create policy "Users can read their own workspace role"
  on public.workspace_user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

insert into public.workspace_user_roles (user_id, role)
select id, 'owner'
from auth.users
where lower(email) = 'engahmedgurey@gmail.com'
on conflict (user_id) do update
set role = 'owner',
    updated_at = now();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'drivers'
  ) then
    alter publication supabase_realtime add table public.drivers;
  end if;
end
$$;

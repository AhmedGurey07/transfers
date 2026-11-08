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

create table if not exists public.workspace_catalog (
  catalog_key text primary key default 'default',
  data jsonb not null,
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
alter table public.workspace_catalog enable row level security;
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

drop policy if exists "Authenticated workspace access" on public.workspace_catalog;
create policy "Authenticated workspace access"
  on public.workspace_catalog
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.drivers to authenticated;
grant select, insert, update, delete on public.workspace_catalog to authenticated;
grant select on public.workspace_user_roles to authenticated;

drop policy if exists "Users can read their own workspace role" on public.workspace_user_roles;
create policy "Users can read their own workspace role"
  on public.workspace_user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own profile photo" on storage.objects;
create policy "Users can upload their own profile photo"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read their own profile photo" on storage.objects;
create policy "Users can read their own profile photo"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own profile photo" on storage.objects;
create policy "Users can update their own profile photo"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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

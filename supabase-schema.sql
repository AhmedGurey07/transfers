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

create table if not exists public.returned_tile_records (
  id text primary key,
  data jsonb not null,
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
alter table public.returned_tile_records enable row level security;
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

drop policy if exists "Authenticated workspace access" on public.returned_tile_records;
create policy "Authenticated workspace access"
  on public.returned_tile_records
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
grant select, insert, update, delete on public.returned_tile_records to authenticated;
grant select, insert, update, delete on public.workspace_catalog to authenticated;
grant select on public.workspace_user_roles to authenticated;

create or replace function public.is_workspace_approval_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if auth.role() = 'service_role' then
    return true;
  end if;
  select role into caller_role
  from public.workspace_user_roles
  where user_id = auth.uid();
  return caller_role in ('owner', 'admin');
end;
$$;

create or replace function public.enforce_workflow_approval_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_request jsonb;
  next_request jsonb;
  previous_requests jsonb;
  next_requests jsonb;
begin
  if public.is_workspace_approval_admin() then
    return new;
  end if;

  if tg_table_name = 'orders' then
    if tg_op = 'INSERT' then
      if coalesce(new.data->>'approvalStatus', '') in ('approved', 'rejected') then
        raise exception 'Only a workspace admin can decide order approvals.';
      end if;
      if new.data->>'approvalStatus' = 'pending'
        and new.data->>'approvalRequestedById' is distinct from auth.uid()::text then
        raise exception 'Staff can only submit their own order approval requests.';
      end if;
      return new;
    end if;

    if old.data->>'approvalStatus' = 'pending'
      and (
        old.data->>'approvalRequestedById' is distinct from new.data->>'approvalRequestedById'
        or old.data->>'approvalRequestedAt' is distinct from new.data->>'approvalRequestedAt'
      ) then
      raise exception 'Staff cannot change the requester of a pending order approval.';
    end if;
    if old.data->>'approvalStatus' is distinct from new.data->>'approvalStatus' then
      if old.data->>'approvalStatus' = 'pending'
        or new.data->>'approvalStatus' in ('approved', 'rejected')
        or old.data->>'approvalStatus' = 'approved' then
        raise exception 'Only a workspace admin can decide order approvals.';
      end if;
      if new.data->>'approvalStatus' = 'pending'
        and new.data->>'approvalRequestedById' is distinct from auth.uid()::text then
        raise exception 'Staff can only submit their own order approval requests.';
      end if;
    end if;
    return new;
  end if;

  next_requests := coalesce(new.data->'catalogApprovals', '[]'::jsonb);
  if tg_op = 'INSERT' then
    for next_request in select value from jsonb_array_elements(next_requests)
    loop
      if next_request->>'status' <> 'pending'
        or next_request->>'requestedById' is distinct from auth.uid()::text then
        raise exception 'Staff can only submit their own pending stock approval requests.';
      end if;
    end loop;
    return new;
  end if;

  previous_requests := coalesce(old.data->'catalogApprovals', '[]'::jsonb);

  for previous_request in select value from jsonb_array_elements(previous_requests)
  loop
    if not exists (
      select 1
      from jsonb_array_elements(next_requests) as candidate(value)
      where candidate.value = previous_request
    ) then
      raise exception 'Only a workspace admin can change or remove stock approval requests.';
    end if;
  end loop;

  for next_request in select value from jsonb_array_elements(next_requests)
  loop
    if not exists (
      select 1
      from jsonb_array_elements(previous_requests) as candidate(value)
      where candidate.value = next_request
    ) and (
      next_request->>'status' <> 'pending'
      or next_request->>'requestedById' is distinct from auth.uid()::text
    ) then
      raise exception 'Staff can only submit their own pending stock approval requests.';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.is_workspace_approval_admin() from public, anon, authenticated;
revoke all on function public.enforce_workflow_approval_permissions() from public, anon, authenticated;

drop trigger if exists orders_workflow_approval_permissions on public.orders;
create trigger orders_workflow_approval_permissions
  before insert or update on public.orders
  for each row execute function public.enforce_workflow_approval_permissions();

drop trigger if exists catalog_workflow_approval_permissions on public.workspace_catalog;
create trigger catalog_workflow_approval_permissions
  before insert or update on public.workspace_catalog
  for each row execute function public.enforce_workflow_approval_permissions();

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
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'returned_tile_records'
  ) then
    alter publication supabase_realtime add table public.returned_tile_records;
  end if;
  if not exists (
    select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workspace_catalog'
  ) then
    alter publication supabase_realtime add table public.workspace_catalog;
  end if;
end
$$;

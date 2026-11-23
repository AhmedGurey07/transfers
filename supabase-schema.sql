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

create table if not exists public.workspace_locations (
  id text primary key,
  name text not null unique,
  sort_order integer not null default 0
);

insert into public.workspace_locations (id, name, sort_order) values
  ('warehouse-200', 'Warehouse 200', 10),
  ('warehouse-150', 'Warehouse 150', 20),
  ('main-branch-store', 'Main Branch Store', 30),
  ('jjr-store', 'JJR Store', 40),
  ('idc-store', 'IDC Store', 50),
  ('nh-store', 'NH Store', 60),
  ('dum-store', 'Dum Store', 70),
  ('borama-store', 'Borama Store', 80),
  ('elec-store', 'ELEC Store', 90)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

create table if not exists public.workspace_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff', 'driver')) default 'staff',
  driver_key text,
  updated_at timestamptz not null default now()
);

alter table public.workspace_user_roles
  add column if not exists driver_key text;
alter table public.workspace_user_roles
  add column if not exists location_id text references public.workspace_locations(id);

alter table public.orders
  add column if not exists location_id text references public.workspace_locations(id);
alter table public.drivers
  add column if not exists location_id text references public.workspace_locations(id);
alter table public.returned_tile_records
  add column if not exists location_id text references public.workspace_locations(id);
alter table public.workspace_catalog
  add column if not exists location_id text references public.workspace_locations(id);

alter table public.workspace_catalog
  alter column location_id set default 'warehouse-200';
update public.workspace_catalog
set location_id = 'warehouse-200'
where location_id is null;
alter table public.workspace_catalog
  alter column location_id set not null;

do $$
declare
  catalog_primary text;
begin
  select conname into catalog_primary
  from pg_constraint
  where conrelid = 'public.workspace_catalog'::regclass
    and contype = 'p';
  if catalog_primary is not null then
    execute format('alter table public.workspace_catalog drop constraint %I', catalog_primary);
  end;
end
$$;
drop index if exists public.workspace_catalog_location_key;
alter table public.workspace_catalog
  add constraint workspace_catalog_pkey primary key (location_id, catalog_key);

alter table public.workspace_user_roles
  drop constraint if exists workspace_user_roles_role_check;

alter table public.workspace_user_roles
  add constraint workspace_user_roles_role_check
  check (role in ('owner', 'admin', 'staff', 'driver'));

update public.workspace_user_roles
set driver_key = null
where role <> 'driver'
  and driver_key is not null;

update public.workspace_user_roles
set location_id = null
where role = 'owner';

update public.workspace_user_roles
set location_id = 'warehouse-200'
where role = 'admin'
  and location_id is null;

update public.workspace_user_roles
set location_id = 'warehouse-200'
where role in ('staff', 'driver')
  and location_id is null;

alter table public.workspace_user_roles
  drop constraint if exists workspace_user_roles_location_check;

alter table public.workspace_user_roles
  add constraint workspace_user_roles_location_check
  check (
    (role = 'owner' and location_id is null)
    or (role in ('admin', 'staff', 'driver') and location_id is not null)
  );

with ranked_drivers as (
  select driver_key,
    regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') as phone_digits,
    row_number() over (
      partition by regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
      order by updated_at desc, driver_key
    ) as duplicate_rank
  from public.drivers
)
delete from public.drivers driver
using ranked_drivers ranked
where driver.driver_key = ranked.driver_key
  and ranked.phone_digits <> ''
  and ranked.duplicate_rank > 1;

alter table public.drivers alter column location_id drop not null;
update public.drivers
set driver_key = 'global:' || regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'),
    location_id = null
where regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') <> '';
update public.drivers set location_id = null where location_id is not null;
create unique index if not exists drivers_phone_global_unique
  on public.drivers (regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'))
  where regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') <> '';

alter table public.workspace_user_roles
  drop constraint if exists workspace_user_roles_driver_link_check;

alter table public.workspace_user_roles
  add constraint workspace_user_roles_driver_link_check
  check (
    (role = 'driver' and driver_key is not null and btrim(driver_key) <> '')
    or (role <> 'driver' and driver_key is null)
  );

create unique index if not exists workspace_user_roles_single_owner
  on public.workspace_user_roles (role)
  where role = 'owner';

create or replace function public.location_id_from_branch(value text)
returns text
language sql
immutable
strict
as $$
  with normalized as (
    select lower(regexp_replace(coalesce(value, ''), '[^a-z0-9]+', '', 'g')) as v
  )
  select case
    when v = '200' or v like '%warehouse200%' or v like '%wh200%' or v = 'wh2' or v like 'wh2%' then 'warehouse-200'
    when v = '150' or v like '%warehouse150%' or v like '%wh150%' then 'warehouse-150'
    when v in ('mainbranchstore', 'mainbranch', 'mainstore', 'mbs') then 'main-branch-store'
    when v in ('jjrstore', 'jjr') then 'jjr-store'
    when v in ('idcstore', 'idc') then 'idc-store'
    when v in ('nhstore', 'nh') then 'nh-store'
    when v in ('dumstore', 'dum') then 'dum-store'
    when v in ('boramastore', 'borama') then 'borama-store'
    when v in ('elecstore', 'elec') then 'elec-store'
    else null
  end
  from normalized
$$;

update public.orders
set location_id = public.location_id_from_branch(coalesce(data->>'branch', data->>'location', data->>'fromBranch', data->>'warehouse'))
where location_id is null;

update public.returned_tile_records
set location_id = public.location_id_from_branch(
  coalesce(data->>'branch', data->>'location', data->>'fromLocation')
)
where location_id is null;

alter table public.orders enable row level security;
alter table public.drivers enable row level security;
alter table public.returned_tile_records enable row level security;
alter table public.workspace_catalog enable row level security;
alter table public.workspace_user_roles enable row level security;

create or replace function public.current_workspace_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.workspace_user_roles
  where user_id = auth.uid()
$$;

create or replace function public.current_workspace_driver_key()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select driver_key
  from public.workspace_user_roles
  where user_id = auth.uid()
    and role = 'driver'
$$;

create or replace function public.current_workspace_location_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select location_id
  from public.workspace_user_roles
  where user_id = auth.uid()
$$;

create or replace function public.can_access_workspace_location(target_location_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
  when public.current_workspace_role() = 'owner' then true
  when public.current_workspace_role() in ('admin', 'staff', 'driver')
      then public.current_workspace_location_id() is not null
        and public.current_workspace_location_id() = target_location_id
    else false
  end
$$;

revoke all on function public.current_workspace_role() from public, anon, authenticated;
revoke all on function public.current_workspace_driver_key() from public, anon, authenticated;
revoke all on function public.current_workspace_location_id() from public, anon, authenticated;
revoke all on function public.can_access_workspace_location(text) from public, anon, authenticated;
grant execute on function public.current_workspace_role() to authenticated;
grant execute on function public.current_workspace_driver_key() to authenticated;
grant execute on function public.current_workspace_location_id() to authenticated;
grant execute on function public.can_access_workspace_location(text) to authenticated;

drop policy if exists "Authenticated workspace access" on public.orders;
drop policy if exists "Workspace staff can manage orders" on public.orders;
drop policy if exists "Drivers can read assigned orders" on public.orders;
create policy "Workspace staff can manage orders"
  on public.orders
  for all
  to authenticated
  using (
    public.current_workspace_role() = 'owner'
    or (
      public.current_workspace_role() in ('admin', 'staff')
      and public.can_access_workspace_location(location_id)
    )
  )
  with check (
    public.current_workspace_role() = 'owner'
    or (
      public.current_workspace_role() in ('admin', 'staff')
      and public.can_access_workspace_location(location_id)
    )
  );

create policy "Drivers can read assigned orders"
  on public.orders
  for select
  to authenticated
  using (
    public.current_workspace_role() = 'driver'
    and public.current_workspace_driver_key() is not null
    and public.can_access_workspace_location(location_id)
    and exists (
      select 1
      from public.drivers linked_driver
      where regexp_replace(coalesce(linked_driver.phone, ''), '[^0-9]', '', 'g')
        = regexp_replace(public.current_workspace_driver_key(), '[^0-9]', '', 'g')
        and (
          (
            regexp_replace(coalesce(data->>'driverPhone', ''), '[^0-9]', '', 'g') <> ''
            and regexp_replace(coalesce(data->>'driverPhone', ''), '[^0-9]', '', 'g')
              = regexp_replace(linked_driver.phone, '[^0-9]', '', 'g')
          )
          or (
            btrim(coalesce(data->>'driver', '')) <> ''
            and lower(btrim(data->>'driver')) = lower(btrim(linked_driver.name))
          )
        )
    )
  );

drop policy if exists "Authenticated workspace access" on public.drivers;
drop policy if exists "Workspace staff can manage drivers" on public.drivers;
drop policy if exists "Drivers can read their linked driver record" on public.drivers;
drop policy if exists "Workspace users can read shared drivers" on public.drivers;
drop policy if exists "Workspace staff can add shared drivers" on public.drivers;
drop policy if exists "Workspace owner can update shared drivers" on public.drivers;
drop policy if exists "Workspace owner can delete shared drivers" on public.drivers;
create policy "Workspace users can read shared drivers"
  on public.drivers
  for select
  to authenticated
  using (
    public.current_workspace_role() in ('owner', 'admin', 'staff')
  );
create policy "Workspace staff can add shared drivers"
  on public.drivers
  for insert
  to authenticated
  with check (
    public.current_workspace_role() in ('owner', 'admin', 'staff')
  );
create policy "Workspace owner can update shared drivers"
  on public.drivers
  for update
  to authenticated
  using (public.current_workspace_role() = 'owner')
  with check (public.current_workspace_role() = 'owner');
create policy "Workspace owner can delete shared drivers"
  on public.drivers
  for delete
  to authenticated
  using (public.current_workspace_role() = 'owner');

create policy "Drivers can read their linked driver record"
  on public.drivers
  for select
  to authenticated
  using (
    public.current_workspace_role() = 'driver'
    and public.current_workspace_driver_key() is not null
    and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') <> ''
    and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
      = regexp_replace(public.current_workspace_driver_key(), '[^0-9]', '', 'g')
  );

drop policy if exists "Authenticated workspace access" on public.returned_tile_records;
drop policy if exists "Workspace staff can manage returned tiles" on public.returned_tile_records;
create policy "Workspace staff can manage returned tiles"
  on public.returned_tile_records
  for all
  to authenticated
  using (
    public.current_workspace_role() = 'owner'
    or (
      public.current_workspace_role() in ('admin', 'staff')
      and public.can_access_workspace_location(location_id)
    )
  )
  with check (
    public.current_workspace_role() = 'owner'
    or (
      public.current_workspace_role() in ('admin', 'staff')
      and public.can_access_workspace_location(location_id)
    )
  );

drop policy if exists "Authenticated workspace access" on public.workspace_catalog;
drop policy if exists "Workspace staff can manage the catalog" on public.workspace_catalog;
create policy "Workspace staff can manage the catalog"
  on public.workspace_catalog
  for all
  to authenticated
  using (
    public.current_workspace_role() = 'owner'
    or (
      public.current_workspace_role() in ('admin', 'staff')
      and public.can_access_workspace_location(location_id)
    )
  )
  with check (
    public.current_workspace_role() = 'owner'
    or (
      public.current_workspace_role() in ('admin', 'staff')
      and public.can_access_workspace_location(location_id)
    )
  );

grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.drivers to authenticated;
grant select, insert, update, delete on public.returned_tile_records to authenticated;
grant select, insert, update, delete on public.workspace_catalog to authenticated;
grant select on public.workspace_user_roles to authenticated;
alter table public.workspace_locations enable row level security;
grant select on public.workspace_locations to authenticated;
drop policy if exists "Authenticated users can read locations" on public.workspace_locations;
create policy "Authenticated users can read locations"
  on public.workspace_locations
  for select
  to authenticated
  using (public.current_workspace_role() in ('owner', 'admin', 'staff', 'driver'));

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
      if coalesce(new.data->>'deliveryConfirmationStatus', '') in ('pending', 'approved', 'rejected') then
        raise exception 'Only the assigned driver and workspace admins can manage delivery confirmations.';
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
    if jsonb_build_object(
      'deliveryConfirmationStatus', new.data->'deliveryConfirmationStatus',
      'deliveryConfirmationRequestedBy', new.data->'deliveryConfirmationRequestedBy',
      'deliveryConfirmationRequestedById', new.data->'deliveryConfirmationRequestedById',
      'deliveryConfirmationRequestedAt', new.data->'deliveryConfirmationRequestedAt',
      'deliveryConfirmationDecidedBy', new.data->'deliveryConfirmationDecidedBy',
      'deliveryConfirmationDecidedAt', new.data->'deliveryConfirmationDecidedAt',
      'deliveredTo', new.data->'deliveredTo',
      'deliveredToPhone', new.data->'deliveredToPhone',
      'deliveryNote', new.data->'deliveryNote',
      'deliveredAt', new.data->'deliveredAt',
      'takenAt', new.data->'takenAt'
    ) is distinct from jsonb_build_object(
      'deliveryConfirmationStatus', old.data->'deliveryConfirmationStatus',
      'deliveryConfirmationRequestedBy', old.data->'deliveryConfirmationRequestedBy',
      'deliveryConfirmationRequestedById', old.data->'deliveryConfirmationRequestedById',
      'deliveryConfirmationRequestedAt', old.data->'deliveryConfirmationRequestedAt',
      'deliveryConfirmationDecidedBy', old.data->'deliveryConfirmationDecidedBy',
      'deliveryConfirmationDecidedAt', old.data->'deliveryConfirmationDecidedAt',
      'deliveredTo', old.data->'deliveredTo',
      'deliveredToPhone', old.data->'deliveredToPhone',
      'deliveryNote', old.data->'deliveryNote',
      'deliveredAt', old.data->'deliveredAt',
      'takenAt', old.data->'takenAt'
    ) then
      raise exception 'Only the assigned driver and workspace admins can manage delivery confirmations.';
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
    and public.current_workspace_role() in ('owner', 'admin', 'staff', 'driver')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read their own profile photo" on storage.objects;
create policy "Users can read their own profile photo"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and public.current_workspace_role() in ('owner', 'admin', 'staff', 'driver')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own profile photo" on storage.objects;
create policy "Users can update their own profile photo"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and public.current_workspace_role() in ('owner', 'admin', 'staff', 'driver')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and public.current_workspace_role() in ('owner', 'admin', 'staff', 'driver')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

insert into public.workspace_user_roles (user_id, role)
select id, 'owner'
from auth.users
where lower(email) = 'engahmedgurey@gmail.com'
on conflict (user_id) do update
set role = 'owner',
    driver_key = null,
    location_id = null,
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

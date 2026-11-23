create table if not exists public.returned_tile_records (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.returned_tile_records
  add column if not exists location_id text references public.workspace_locations(id);

alter table public.returned_tile_records enable row level security;

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

grant select, insert, update, delete on public.returned_tile_records to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'returned_tile_records'
  ) then
    alter publication supabase_realtime add table public.returned_tile_records;
  end if;
end
$$;

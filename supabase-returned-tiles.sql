create table if not exists public.returned_tile_records (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.returned_tile_records enable row level security;

drop policy if exists "Authenticated workspace access" on public.returned_tile_records;
create policy "Authenticated workspace access"
  on public.returned_tile_records
  for all
  to authenticated
  using (true)
  with check (true);

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

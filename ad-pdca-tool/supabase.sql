create table if not exists public.ad_pdca_state (
  workspace_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ad_pdca_state enable row level security;

create policy "allow anon read ad pdca state"
on public.ad_pdca_state
for select
to anon
using (true);

create policy "allow anon upsert ad pdca state"
on public.ad_pdca_state
for insert
to anon
with check (true);

create policy "allow anon update ad pdca state"
on public.ad_pdca_state
for update
to anon
using (true)
with check (true);

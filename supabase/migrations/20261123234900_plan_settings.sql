-- One row per user holding the numbers their training plan is built from
-- (they used to be the PLAN constant in src/plan/settings.ts). Total weeks is
-- not stored: it is worked out from the two dates, so it can never disagree
-- with them. Week 1 starts on a Monday and the race is the Sunday that ends
-- the last week, so the span is always a whole number of weeks.

create table public.plan_settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date not null check (extract(isodow from start_date) = 1),
  race_date date not null check (extract(isodow from race_date) = 7),
  start_miles numeric not null check (start_miles > 0),
  peak_miles numeric not null,
  start_long_run_miles numeric not null check (start_long_run_miles > 0),
  primary key (user_id),
  check (race_date > start_date),
  check (peak_miles > start_miles)
);

alter table public.plan_settings enable row level security;

create policy "plan_settings: owner can read" on public.plan_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "plan_settings: owner can insert" on public.plan_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "plan_settings: owner can update" on public.plan_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "plan_settings: owner can delete" on public.plan_settings
  for delete to authenticated using (user_id = (select auth.uid()));

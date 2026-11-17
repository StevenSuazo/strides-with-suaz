-- Tables for AppStorage (src/storage/types.ts). Every table is private to its
-- owner: RLS is switched on here, in the same file that creates the table.
-- Planned workouts are not stored; they are regenerated from the target curve
-- and the week's saved availability.

create table public.week_results (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_index integer not null check (week_index >= 1),
  target_miles numeric not null check (target_miles >= 0),
  actual_miles numeric not null check (actual_miles >= 0),
  long_run_miles numeric not null check (long_run_miles >= 0),
  highest_pain integer not null check (highest_pain between 0 and 10),
  primary key (user_id, week_index)
);

alter table public.week_results enable row level security;

create policy "week_results: owner can read" on public.week_results
  for select to authenticated using (user_id = (select auth.uid()));
create policy "week_results: owner can insert" on public.week_results
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "week_results: owner can update" on public.week_results
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "week_results: owner can delete" on public.week_results
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.gate_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reduced_mode boolean not null,
  good_weeks_in_row integer not null check (good_weeks_in_row >= 0),
  last_long_run_miles numeric not null check (last_long_run_miles >= 0),
  week_before_recovery jsonb,
  primary key (user_id)
);

alter table public.gate_state enable row level security;

create policy "gate_state: owner can read" on public.gate_state
  for select to authenticated using (user_id = (select auth.uid()));
create policy "gate_state: owner can insert" on public.gate_state
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "gate_state: owner can update" on public.gate_state
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "gate_state: owner can delete" on public.gate_state
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.week_availability (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_index integer not null check (week_index >= 1),
  days text[] not null check (
    cardinality(days) = 7 and days <@ array['open', 'morning', 'off']
  ),
  primary key (user_id, week_index)
);

alter table public.week_availability enable row level security;

create policy "week_availability: owner can read" on public.week_availability
  for select to authenticated using (user_id = (select auth.uid()));
create policy "week_availability: owner can insert" on public.week_availability
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "week_availability: owner can update" on public.week_availability
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "week_availability: owner can delete" on public.week_availability
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.runs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (id <> ''),
  date date not null,
  miles numeric not null check (miles >= 0),
  source text not null check (source in ('strava', 'in_app')),
  primary key (user_id, id)
);

alter table public.runs enable row level security;

create policy "runs: owner can read" on public.runs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "runs: owner can insert" on public.runs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "runs: owner can update" on public.runs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "runs: owner can delete" on public.runs
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.check_ins (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (id <> ''),
  date date not null,
  workout_id text,
  activity_id text,
  feel text not null check (feel in ('good', 'okay', 'rough')),
  kind text not null check (kind in ('afterRun', 'nextMorning')),
  note text,
  entries jsonb not null default '[]' check (jsonb_typeof(entries) = 'array'),
  primary key (user_id, id)
);

alter table public.check_ins enable row level security;

create policy "check_ins: owner can read" on public.check_ins
  for select to authenticated using (user_id = (select auth.uid()));
create policy "check_ins: owner can insert" on public.check_ins
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "check_ins: owner can update" on public.check_ins
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "check_ins: owner can delete" on public.check_ins
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.overrides (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  run_id text not null check (run_id <> ''),
  workout_id text not null check (workout_id <> ''),
  primary key (user_id, run_id)
);

alter table public.overrides enable row level security;

create policy "overrides: owner can read" on public.overrides
  for select to authenticated using (user_id = (select auth.uid()));
create policy "overrides: owner can insert" on public.overrides
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "overrides: owner can update" on public.overrides
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "overrides: owner can delete" on public.overrides
  for delete to authenticated using (user_id = (select auth.uid()));

-- A race can fall on any day of the week, not only a Sunday: its week is the
-- plan's last week. Replace the Sunday rule with a shortest plan of 8 weeks
-- (the race's week number, counting from the Monday start, is at least 8).
alter table public.plan_settings
  drop constraint plan_settings_race_date_check;

alter table public.plan_settings
  add constraint plan_settings_at_least_8_weeks
  check (race_date - start_date >= 49);

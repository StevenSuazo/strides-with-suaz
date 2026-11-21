-- Optional details for a run: time, heart rate, cadence and how hard it felt.
-- All columns are nullable, so every run saved before this stays valid.
alter table public.runs
  add column duration_seconds integer
    check (duration_seconds between 1 and 86400),
  add column avg_heart_rate integer
    check (avg_heart_rate between 30 and 250),
  add column max_heart_rate integer
    check (max_heart_rate between 30 and 250),
  add column cadence integer
    check (cadence between 40 and 300),
  add column effort integer
    check (effort between 1 and 10),
  add constraint runs_max_hr_at_least_avg
    check (
      max_heart_rate is null
      or avg_heart_rate is null
      or max_heart_rate >= avg_heart_rate
    );

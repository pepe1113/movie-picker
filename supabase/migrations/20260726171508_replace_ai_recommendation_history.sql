delete from public.ai_recommendation_runs;

alter table public.ai_recommendation_runs
  rename column answers to intent;

alter table public.ai_recommendation_runs
  add column discover_plan jsonb not null default '{}'::jsonb;

alter table public.ai_recommendation_runs
  alter column discover_plan drop default;

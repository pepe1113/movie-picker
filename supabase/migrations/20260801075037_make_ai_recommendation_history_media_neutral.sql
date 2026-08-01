alter table public.ai_recommendation_runs
  rename column candidate_movie_ids to candidate_media_ids;

alter table public.ai_recommendation_runs
  add column media_type text not null default 'movie';

alter table public.ai_recommendation_runs
  add constraint ai_recommendation_runs_media_type_check
  check (media_type in ('movie', 'tv'));

alter table public.ai_recommendation_runs
  alter column media_type drop default;

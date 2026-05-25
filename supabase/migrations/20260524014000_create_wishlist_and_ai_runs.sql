create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  movie_snapshot jsonb not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, movie_id)
);

create table if not exists public.ai_recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  candidate_movie_ids integer[] not null,
  recommendations jsonb not null,
  provider text not null,
  model text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists wishlist_items_user_id_idx
  on public.wishlist_items (user_id);

create index if not exists wishlist_items_movie_id_idx
  on public.wishlist_items (movie_id);

create index if not exists ai_recommendation_runs_user_created_idx
  on public.ai_recommendation_runs (user_id, created_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select, insert, delete on public.ai_recommendation_runs to authenticated;

alter table public.wishlist_items enable row level security;
alter table public.ai_recommendation_runs enable row level security;

create policy "Users can select their own wishlist items"
on public.wishlist_items
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own wishlist items"
on public.wishlist_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own wishlist items"
on public.wishlist_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own wishlist items"
on public.wishlist_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can select their own recommendation runs"
on public.ai_recommendation_runs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own recommendation runs"
on public.ai_recommendation_runs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own recommendation runs"
on public.ai_recommendation_runs
for delete
to authenticated
using ((select auth.uid()) = user_id);

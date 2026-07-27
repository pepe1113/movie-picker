alter table public.wishlist_items
  add column if not exists media_type text not null default 'movie';

alter table public.wishlist_items
  drop constraint if exists wishlist_items_user_id_movie_id_key;

alter table public.wishlist_items
  add constraint wishlist_items_media_type_check
  check (media_type in ('movie', 'tv'));

alter table public.wishlist_items
  add constraint wishlist_items_user_media_type_movie_id_key
  unique (user_id, media_type, movie_id);

create index if not exists wishlist_items_media_lookup_idx
  on public.wishlist_items (user_id, media_type, movie_id);

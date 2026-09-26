create schema if not exists private;

create table private.anonymous_recommendation_daily_usage (
  usage_date date primary key default current_date,
  request_count integer not null default 0 check (request_count >= 0)
);

alter table private.anonymous_recommendation_daily_usage enable row level security;

revoke all on schema private from public, anon, authenticated;
revoke all on table private.anonymous_recommendation_daily_usage from public, anon, authenticated;

create or replace function public.consume_anonymous_recommendation_quota(
  p_daily_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  consumed boolean;
begin
  if p_daily_limit < 1 or p_daily_limit > 1000 then
    return false;
  end if;

  insert into private.anonymous_recommendation_daily_usage (
    usage_date,
    request_count
  )
  values (current_date, 1)
  on conflict (usage_date) do update
    set request_count = private.anonymous_recommendation_daily_usage.request_count + 1
    where private.anonymous_recommendation_daily_usage.request_count < p_daily_limit
  returning true into consumed;

  return coalesce(consumed, false);
end;
$$;

revoke all on function public.consume_anonymous_recommendation_quota(integer)
from public, anon, authenticated;
grant execute on function public.consume_anonymous_recommendation_quota(integer)
to service_role;

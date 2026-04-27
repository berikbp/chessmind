begin;

create table if not exists public.daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now())::date),
  coach_review_uses integer not null default 0 check (coach_review_uses >= 0),
  puzzle_uses integer not null default 0 check (puzzle_uses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.daily_usage enable row level security;

drop policy if exists "Users can read own daily usage" on public.daily_usage;
create policy "Users can read own daily usage"
  on public.daily_usage
  for select
  using (auth.uid() = user_id);

create or replace function public.set_daily_usage_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_daily_usage_updated_at on public.daily_usage;
create trigger set_daily_usage_updated_at
  before update on public.daily_usage
  for each row execute function public.set_daily_usage_updated_at();

notify pgrst, 'reload schema';

commit;

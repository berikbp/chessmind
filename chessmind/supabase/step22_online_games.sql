begin;

create table if not exists public.online_games (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  white_id uuid references auth.users(id) on delete set null,
  black_id uuid references auth.users(id) on delete set null,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text not null default '',
  turn text not null default 'w' check (turn in ('w', 'b')),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed', 'abandoned')),
  result text check (result in ('1-0', '0-1', '1/2-1/2')),
  termination text,
  time_control text not null default 'untimed',
  white_time integer,
  black_time integer,
  last_move jsonb,
  last_move_at timestamptz,
  saved_game_id uuid references public.games(id) on delete set null,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint online_games_host_is_player check (host_id = white_id or host_id = black_id),
  constraint online_games_has_host_color check (white_id is not null or black_id is not null)
);

alter table public.online_games enable row level security;

drop policy if exists "Players can read their online games" on public.online_games;
create policy "Players can read their online games"
  on public.online_games
  for select
  using (auth.uid() = white_id or auth.uid() = black_id);

drop policy if exists "Players can create online games" on public.online_games;
create policy "Players can create online games"
  on public.online_games
  for insert
  with check (
    auth.uid() = host_id
    and (auth.uid() = white_id or auth.uid() = black_id)
  );

drop policy if exists "Players can update their online games" on public.online_games;
create policy "Players can update their online games"
  on public.online_games
  for update
  using (auth.uid() = white_id or auth.uid() = black_id)
  with check (auth.uid() = white_id or auth.uid() = black_id);

create or replace function public.set_online_games_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_online_games_updated_at on public.online_games;
create trigger set_online_games_updated_at
  before update on public.online_games
  for each row execute function public.set_online_games_updated_at();

alter table public.online_games replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'online_games'
    )
  then
    alter publication supabase_realtime add table public.online_games;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;

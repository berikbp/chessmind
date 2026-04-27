begin;

drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_username text;
  next_city text;
begin
  next_username := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'username',
        new.raw_user_meta_data ->> 'full_name',
        split_part(new.email, '@', 1)
      )
    ),
    ''
  );

  next_city := nullif(trim(coalesce(new.raw_user_meta_data ->> 'city', 'Unknown')), '');

  insert into public.profiles (id, username, city)
  values (
    new.id,
    next_username,
    coalesce(next_city, 'Unknown')
  )
  on conflict (id) do update
  set
    username = excluded.username,
    city = excluded.city;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;

-- Preserve learner profile context collected during the registration journey.
-- Auth metadata is copied into validated public.profile fields when the auth user is created.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_age smallint;
  requested_avatar_key text;
  requested_background_key text;
  requested_timezone text;
begin
  if coalesce(new.raw_user_meta_data ->> 'age', '') ~ '^[0-9]{1,3}$' then
    requested_age := (new.raw_user_meta_data ->> 'age')::smallint;
    if requested_age < 5 or requested_age > 120 then
      requested_age := null;
    end if;
  end if;

  requested_avatar_key := case
    when coalesce(new.raw_user_meta_data ->> 'avatar_key', '') ~ '^avatar-(0[1-9]|[12][0-9]|3[0-6])$'
      then new.raw_user_meta_data ->> 'avatar_key'
    else null
  end;

  requested_background_key := case
    when new.raw_user_meta_data ->> 'avatar_background_key' in (
      'cream', 'orange', 'terracotta', 'mustard', 'sage', 'dusty-blue', 'rose', 'navy'
    )
      then new.raw_user_meta_data ->> 'avatar_background_key'
    else null
  end;

  requested_timezone := nullif(trim(new.raw_user_meta_data ->> 'timezone'), '');

  insert into public.profiles (
    id,
    display_name,
    profession,
    age,
    avatar_key,
    avatar_background_key,
    interface_language,
    timezone,
    role,
    status
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), ''),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'profession', '')), 80), ''),
    requested_age,
    requested_avatar_key,
    case
      when requested_avatar_key is not null then coalesce(requested_background_key, 'cream')
      else null
    end,
    'it',
    coalesce(requested_timezone, 'Europe/Rome'),
    'learner',
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

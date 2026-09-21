begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '8f4d31f2-a2e7-4f2e-8b91-2e4d1f8bcb71'::uuid,
  'registration-canary@example.test',
  jsonb_build_object(
    'display_name', 'Giulia Test',
    'profession', 'Software developer',
    'age', 34,
    'avatar_key', 'avatar-07',
    'avatar_background_key', 'dusty-blue',
    'timezone', 'Europe/Rome'
  )
);

do $$
declare
  learner_profile public.profiles%rowtype;
begin
  select *
  into learner_profile
  from public.profiles
  where id = '8f4d31f2-a2e7-4f2e-8b91-2e4d1f8bcb71'::uuid;

  if not found then
    raise exception 'Registration canary failed: auth trigger did not create a profile.';
  end if;

  if learner_profile.display_name is distinct from 'Giulia Test' then
    raise exception 'Registration canary failed: display_name was not preserved.';
  end if;

  if learner_profile.profession is distinct from 'Software developer' then
    raise exception 'Registration canary failed: profession was not preserved.';
  end if;

  if learner_profile.age is distinct from 34 then
    raise exception 'Registration canary failed: age was not preserved.';
  end if;

  if learner_profile.avatar_key is distinct from 'avatar-07' then
    raise exception 'Registration canary failed: avatar_key was not preserved.';
  end if;

  if learner_profile.avatar_background_key is distinct from 'dusty-blue' then
    raise exception 'Registration canary failed: avatar background was not preserved.';
  end if;

  if learner_profile.timezone is distinct from 'Europe/Rome' then
    raise exception 'Registration canary failed: timezone was not preserved.';
  end if;

  if learner_profile.interface_language is distinct from 'it' then
    raise exception 'Registration canary failed: interface language default changed unexpectedly.';
  end if;

  if learner_profile.role is distinct from 'learner' then
    raise exception 'Registration canary failed: role must be learner.';
  end if;

  if learner_profile.status is distinct from 'active' then
    raise exception 'Registration canary failed: status must be active.';
  end if;
end;
$$;

rollback;

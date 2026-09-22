-- Admin-only speaking activity library for live lessons.
create table if not exists public.admin_speaking_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  activity_type text not null default 'speaking_game',
  levels text[] not null default '{}',
  goals text[] not null default '{}',
  tags text[] not null default '{}',
  duration_minutes integer,
  group_size text,
  instructions text not null default '',
  prompts jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  teacher_notes text,
  favorite boolean not null default false,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_speaking_activities enable row level security;

drop policy if exists "Admins can view speaking activities" on public.admin_speaking_activities;
drop policy if exists "Admins can insert speaking activities" on public.admin_speaking_activities;
drop policy if exists "Admins can update speaking activities" on public.admin_speaking_activities;
drop policy if exists "Admins can delete speaking activities" on public.admin_speaking_activities;

create policy "Admins can view speaking activities" on public.admin_speaking_activities for select to authenticated using ((select public.is_admin()));
create policy "Admins can insert speaking activities" on public.admin_speaking_activities for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update speaking activities" on public.admin_speaking_activities for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete speaking activities" on public.admin_speaking_activities for delete to authenticated using ((select public.is_admin()));

grant select, insert, update, delete on public.admin_speaking_activities to authenticated;
revoke all on public.admin_speaking_activities from anon;

insert into public.admin_speaking_activities (title,summary,activity_type,levels,goals,tags,duration_minutes,group_size,instructions,prompts,variants,favorite)
select
  seed.title, seed.summary, seed.activity_type, seed.levels, seed.goals, seed.tags,
  seed.duration_minutes, seed.group_size, seed.instructions, seed.prompts, seed.variants, seed.favorite
from (values
  (
    'Conversation Roulette',
    'Rapid speaking rounds: answer, extend, then ask a follow-up.',
    'conversation',
    array['A2','B1','B2'],
    array['fluency','follow-up questions','confidence'],
    array['warm-up','low prep'],
    12,
    '1–4',
    'Answer for at least 30 seconds. Add one detail that was not asked for. Finish by asking a related question back.',
    '["What is something you used to dislike but now enjoy?","What makes a place feel comfortable to you?","What is one small decision that improved your daily life?","What is something people often misunderstand about your job or studies?","If you had one extra free hour every day, how would you use it?","Which skill is more useful than people think?"]'::jsonb,
    '["Speed round: 20 seconds only.","Depth round: ask Why? three times.","No-safe-answer round: ban yes/no openings."]'::jsonb,
    true
  ),
  (
    'Defend the Opposite',
    'Argue for the position you would not normally choose.',
    'debate',
    array['B1','B2','C1'],
    array['argumentation','hedging','spontaneous speaking'],
    array['debate','opinions'],
    15,
    '1–4',
    'Give your real opinion first. Then defend the opposite side for 60–90 seconds using at least two reasons and one example.',
    '["Working from home is better than working in an office.","University is still the best route to a good career.","People should answer work messages outside working hours.","It is better to be extremely organised than spontaneous.","Artificial intelligence makes people less creative."]'::jsonb,
    '["Ban good, bad, better and worse.","Add a 30-second rebuttal.","Require one softener such as arguably or to some extent."]'::jsonb,
    true
  ),
  (
    'Repair the Conversation',
    'Improve awkward lines, then continue the interaction naturally.',
    'speaking_game',
    array['B1','B2','C1'],
    array['pragmatics','natural chunks','conversation repair'],
    array['roleplay','real life'],
    18,
    '1–2',
    'Read the awkward line. Explain what sounds wrong, blunt or unnatural. Replace it, say it aloud, then continue for at least three turns.',
    '["At work: “Give me the file today.”","Small talk: “Why are you not married?”","Restaurant: “I want another table because this is bad.”","Meeting: “You are wrong.”","Email follow-up: “Why didn’t you answer me?”","Travel: “Tell me where the station is.”"]'::jsonb,
    '["Register shift: casual, neutral, professional.","Use one chunk from the learner’s Word & Chunk Bank.","Pressure mode: five seconds to repair the line."]'::jsonb,
    true
  )
) as seed(title,summary,activity_type,levels,goals,tags,duration_minutes,group_size,instructions,prompts,variants,favorite)
where not exists (
  select 1 from public.admin_speaking_activities existing
  where lower(existing.title) = lower(seed.title)
);

notify pgrst, 'reload schema';

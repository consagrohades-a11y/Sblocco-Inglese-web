-- Teacher-only learner context subtitle + reusable live speaking activity library.

alter table public.profiles add column if not exists admin_context_note text;

alter table public.profiles
  drop constraint if exists profiles_admin_context_note_length_check;
alter table public.profiles
  add constraint profiles_admin_context_note_length_check
  check (admin_context_note is null or char_length(btrim(admin_context_note)) between 1 and 280);

create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at
      or new.updated_at is distinct from old.updated_at
      or new.admin_context_note is distinct from old.admin_context_note then
      raise exception 'Only learner-editable profile fields can be updated by learners.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.admin_set_learner_context_note(target_learner_id uuid, context_note text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_note text := nullif(btrim(context_note), '');
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if v_note is not null and char_length(v_note) > 280 then raise exception 'Context note cannot exceed 280 characters.'; end if;
  update public.profiles set admin_context_note = v_note where id = target_learner_id and role = 'learner';
  if not found then raise exception 'Learner not found.'; end if;
  return v_note;
end;
$$;
revoke all on function public.admin_set_learner_context_note(uuid,text) from public, anon;
grant execute on function public.admin_set_learner_context_note(uuid,text) to authenticated;

drop function if exists public.admin_list_learners();
create function public.admin_list_learners()
returns table (
  id uuid, display_name text, email text, avatar_key text, avatar_background_key text,
  profession text, age smallint, admin_context_note text, interface_language text,
  status text, created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
  select p.id, p.display_name, u.email::text, p.avatar_key, p.avatar_background_key,
         p.profession, p.age, p.admin_context_note, p.interface_language, p.status, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'learner'
  order by p.created_at desc;
end;
$$;
revoke all on function public.admin_list_learners() from public, anon;
grant execute on function public.admin_list_learners() to authenticated;

drop function if exists public.admin_get_learner_detail(uuid);
create function public.admin_get_learner_detail(target_learner_id uuid)
returns table (
  id uuid, display_name text, email text, avatar_key text, avatar_background_key text,
  profession text, age smallint, admin_context_note text, interface_language text,
  timezone text, status text, created_at timestamptz, relationships jsonb, assignments jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  return query
  select p.id, p.display_name, u.email::text, p.avatar_key, p.avatar_background_key,
         p.profession, p.age, p.admin_context_note, p.interface_language, p.timezone, p.status, p.created_at,
         coalesce((select jsonb_agg(jsonb_build_object(
           'id', r.id, 'relationship_type', r.relationship_type, 'status', r.status,
           'starts_at', r.starts_at, 'ends_at', r.ends_at, 'teacher_id', r.teacher_id
         ) order by r.created_at desc) from public.teaching_relationships r where r.learner_id = p.id), '[]'::jsonb),
         coalesce((select jsonb_agg(jsonb_build_object(
           'id', a.id, 'title', a.title, 'status', a.status, 'required', a.required,
           'deadline_at', a.deadline_at, 'estimated_minutes', a.estimated_minutes,
           'published_at', a.published_at, 'created_at', a.created_at, 'display_order', a.display_order
         ) order by case when a.status = 'archived' then 1 else 0 end, a.display_order, a.created_at desc)
         from public.assignments a where a.learner_id = p.id), '[]'::jsonb)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = target_learner_id and p.role = 'learner';
end;
$$;
revoke all on function public.admin_get_learner_detail(uuid) from public, anon;
grant execute on function public.admin_get_learner_detail(uuid) to authenticated;

create table if not exists public.admin_speaking_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 140),
  summary text,
  activity_type text not null default 'speaking_game'
    check (activity_type in ('speaking_game','conversation','roleplay','vocabulary','warmup','debate','storytelling','fluency','other')),
  levels text[] not null default '{}'::text[],
  goals text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 180),
  group_size text,
  instructions text not null default '',
  prompts jsonb not null default '[]'::jsonb check (jsonb_typeof(prompts) = 'array'),
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  teacher_notes text,
  favorite boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_speaking_activities enable row level security;

create policy "Admins can view speaking activities"
on public.admin_speaking_activities for select to authenticated
using ((select public.is_admin()));
create policy "Admins can insert speaking activities"
on public.admin_speaking_activities for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins can update speaking activities"
on public.admin_speaking_activities for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "Admins can delete speaking activities"
on public.admin_speaking_activities for delete to authenticated
using ((select public.is_admin()));

revoke all on public.admin_speaking_activities from anon;
grant select, insert, update, delete on public.admin_speaking_activities to authenticated;

insert into public.admin_speaking_activities
(title, summary, activity_type, levels, goals, tags, duration_minutes, group_size, instructions, prompts, variants, favorite)
values
('Odd One Out — Conversation Edition','Scegli l’intruso e difendi la scelta; la discussione conta più della risposta.','speaking_game',array['B1','B2','C1'],array['fluency','vocabulary','justifying opinions'],array['conversation','chunks'],12,'1–4','Mostra un set alla volta. Lo studente sceglie l’intruso, giustifica con almeno due frasi e prova una seconda interpretazione plausibile.','["deadline · schedule · postpone · exhausted","convincing · awkward · persuasive · believable","bring up · point out · run into · mention","budget · afford · expensive · negotiate","apologise · admit · deny · confess"]','["A2: usa categorie concrete e “I think ___ is different because…”","C1: richiedi una seconda interpretazione e una controargomentazione."]',true),
('Would You Rather — No Easy Answers','Scelte realistiche senza risposta perfetta: priorità, conseguenze e compromessi.','conversation',array['A2','B1','B2','C1'],array['fluency','opinions'],array['decision making'],15,'1–6','Lo studente sceglie subito, spiega perché e poi risponde a una complicazione che rende la scelta meno comoda.','["Would you rather have a job you love with an average salary, or a boring job that pays extremely well?","Would you rather always arrive 30 minutes early or 10 minutes late?","Would you rather live abroad for five years without your family or stay home and turn down your dream opportunity?","Would you rather work with a brilliant but difficult boss or a kind but disorganised one?"]','["A2: choice + because + one example.","B2+: What would make you switch sides?"]',true),
('One Minute, No Escape','Parlato continuo con follow-up: ottimo per scioltezza e sicurezza.','fluency',array['A2','B1','B2','C1'],array['fluency','confidence'],array['timed','warmup'],10,'1–4','15 secondi per pensare, 60 per parlare senza fermarsi. Correggi solo 1–2 cose alla fine e ripeti per 30 secondi con un upgrade.','["A habit you would like to change","Something people spend too much money on","A place you could happily visit again","A skill everybody should learn","Something you used to believe but changed your mind about"]','["A2: 30 secondi e tre parole-guida.","B2/C1: vieta tre parole troppo facili."]',true),
('Explain It Without Saying It','Taboo lessicale: descrivi il target senza usare le parole vietate.','vocabulary',array['A2','B1','B2','C1'],array['vocabulary','paraphrasing'],array['retrieval'],15,'1–6','Descrivi il target senza tradurre. Quando viene indovinato, usalo in una frase personale o professionale.','["deadline | forbidden: time, finish, date","overwhelmed | forbidden: stress, busy, too much","run out of | forbidden: finish, none, empty","reschedule | forbidden: change, meeting, time"]','["A2: una sola parola vietata.","C1: aggiungi contrasto con un termine simile."]',false),
('Bad Advice Only','Prima il peggior consiglio possibile, poi una soluzione vera.','speaking_game',array['A2','B1','B2'],array['fluency','advice'],array['creative'],12,'1–5','Dai un problema. Lo studente propone un consiglio volutamente pessimo, spiega perché è terribile e lo sostituisce con un consiglio sensato.','["I have an important interview tomorrow and I haven’t prepared.","My colleague keeps interrupting me in meetings.","I’m always late because I snooze my alarm five times.","I accidentally sent a private message to the wrong person."]','["B1+: obbliga should / shouldn’t / if I were you.","Tu difendi il cattivo consiglio e lo studente deve convincerti."]',true),
('Story Chain — But Something Changes','Storia a turni con twist improvvisi che obbligano a reagire.','storytelling',array['A2','B1','B2','C1'],array['storytelling','past tenses'],array['improvisation'],15,'1–6','Aggiungete 1–3 frasi a turno. Ogni due turni inserisci un cambiamento e incorporalo senza ricominciare.','["You wake up in a hotel room and don’t remember how you got there.","A stranger gives you an envelope and says: Don’t open it here.","You miss your train, and that turns out to be the best thing that happened all week.","Your phone receives a photo taken five minutes in the future."]','["Twist: someone is lying.","Twist: one detail from the beginning becomes important."]',false),
('Convince Me','Difendi o vendi qualcosa di difficile rispondendo a obiezioni reali.','debate',array['B1','B2','C1'],array['persuasion','fluency'],array['argument'],15,'1–3','Dai una posizione difficile. Tu opponi 2–3 obiezioni; lo studente deve rispondere senza riciclare lo stesso argomento.','["Convince me to wake up at 5:00 every day.","Convince me that meetings are useful.","Sell me a holiday in a place where it rains every day.","Convince me to delete all social media for one month."]','["Business: usa objection-handling chunks.","C1: cambia target audience a metà."]',true),
('The Missing Detail','Information gap: lo studente deve fare domande per ricostruire la situazione.','conversation',array['A2','B1','B2'],array['questions','interaction'],array['information gap'],12,'1–2','Leggi solo la situazione iniziale. Rispondi esclusivamente alle domande che lo studente fa, senza regalare dettagli.','["I arrived at work this morning and everyone looked at me.","I bought something yesterday and immediately regretted it.","My friend cancelled our plans for a very strange reason.","I received an email that completely changed my week."]','["A2: dai question starters.","Teacher swap: lo studente inventa il mistero."]',false),
('Upgrade That Answer','Trasforma risposte piatte in risposte più naturali, precise e personali.','fluency',array['A2','B1','B2','C1'],array['extended answers','chunks'],array['reformulation'],15,'1–3','Parti da una risposta debole. Aggiungi dettaglio, motivo/esempio e almeno un chunk più naturale.','["I like travelling.","My job is stressful.","I think social media is bad.","I want to improve my English.","The meeting was difficult."]','["A2: answer + because + example.","C1: cambia registro."]',true),
('Three Questions Deeper','Tre follow-up obbligatori per trasformare risposte brevi in vera conversazione.','warmup',array['A2','B1','B2','C1'],array['interaction','questions'],array['follow-up'],10,'1–4','Dopo ogni risposta fai tre follow-up progressivamente più specifici. Vietato cambiare subito argomento.','["What did you do this weekend?","What are you working on at the moment?","What kind of places do you enjoy visiting?","What is something you are looking forward to?"]','["A2: mostra Why / How often / Who with / What happened next?","Reverse: lo studente conduce tutta la conversazione."]',false);

notify pgrst, 'reload schema';

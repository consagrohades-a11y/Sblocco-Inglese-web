-- Universal Precision codes, trend classification, and generic-error suppression.

insert into public.exercise_builder_diagnostic_codes (
  code, label, primary_skill, topic, subtopic, group_key, severity, category, status
) values
  ('SPELLING', 'Spelling', 'spelling', 'precision', 'spelling', 'spelling', 'precision', 'precision', 'active'),
  ('PUNCTUATION', 'Punctuation', 'writing', 'precision', 'punctuation', 'punctuation', 'precision', 'precision', 'active'),
  ('CAPITALIZATION', 'Capitalization', 'writing', 'precision', 'capitalization', 'capitalization', 'precision', 'precision', 'active'),
  ('APOSTROPHE', 'Apostrophes', 'writing', 'precision', 'apostrophes', 'apostrophes', 'precision', 'precision', 'active'),
  ('SPACING', 'Spacing', 'writing', 'precision', 'spacing', 'spacing', 'precision', 'precision', 'active')
on conflict (code) do nothing;

insert into public.exercise_builder_diagnostic_messages (
  diagnostic_code, language, message_level, message_text
) values
  ('SPELLING', 'it', 'reminder', 'Controlla lo spelling delle parole prima di consegnare.'),
  ('SPELLING', 'en', 'reminder', 'Check the spelling of your words before submitting.'),
  ('SPELLING', 'it', 'weakness', 'Gli errori di spelling sono ricorrenti: rileggi con attenzione le parole chiave.'),
  ('SPELLING', 'en', 'weakness', 'Spelling errors are recurring: review the key words carefully.'),
  ('PUNCTUATION', 'it', 'reminder', 'Presta attenzione alla punteggiatura finale e interna.'),
  ('PUNCTUATION', 'en', 'reminder', 'Pay attention to final and internal punctuation.'),
  ('CAPITALIZATION', 'it', 'reminder', 'Controlla le maiuscole, soprattutto a inizio frase e con i nomi propri.'),
  ('CAPITALIZATION', 'en', 'reminder', 'Check capital letters, especially at the start of sentences and with proper nouns.'),
  ('APOSTROPHE', 'it', 'reminder', 'Controlla gli apostrofi nelle contrazioni inglesi.'),
  ('APOSTROPHE', 'en', 'reminder', 'Check apostrophes in English contractions.'),
  ('SPACING', 'it', 'reminder', 'Controlla gli spazi tra le parole e intorno alla punteggiatura.'),
  ('SPACING', 'en', 'reminder', 'Check spacing between words and around punctuation.')
on conflict (diagnostic_code, language, message_level) do nothing;

create or replace function public.classify_exercise_builder_learner_diagnostic()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.total_opportunities < 3 then
    new.diagnostic_status := 'not_enough_data';
  elsif new.total_opportunities >= 10 and new.error_rate < 0.10 then
    new.diagnostic_status := 'mastered';
  elsif new.recent_opportunities >= 3 and new.recent_error_rate + 0.10 < new.error_rate then
    new.diagnostic_status := 'improving';
    new.last_improved_at := coalesce(new.last_improved_at, now());
  elsif new.error_rate >= 0.50 then
    new.diagnostic_status := 'weakness';
  elsif new.error_rate >= 0.30 then
    new.diagnostic_status := 'emerging_weakness';
  else
    new.diagnostic_status := 'stable';
  end if;
  return new;
end;
$$;

create trigger exercise_builder_learner_diagnostics_classify
before insert or update on public.exercise_builder_learner_diagnostic_summaries
for each row execute function public.classify_exercise_builder_learner_diagnostic();

create or replace function public.suppress_generic_exercise_builder_spelling()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.diagnostic_code = 'SPELLING' and exists (
    select 1
    from public.exercise_builder_diagnostic_events existing
    join public.exercise_builder_diagnostic_codes code on code.code = existing.diagnostic_code
    where existing.attempt_question_id = new.attempt_question_id
      and existing.diagnostic_code <> 'SPELLING'
      and existing.error_count > 0
      and code.category = 'precision'
  ) then
    return null;
  end if;
  return new;
end;
$$;

create trigger exercise_builder_diagnostic_events_specific_precision
before insert or update on public.exercise_builder_diagnostic_events
for each row execute function public.suppress_generic_exercise_builder_spelling();

create or replace function public.admin_rebuild_exercise_builder_diagnostics(p_attempt_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  for v_attempt in
    select id from public.exercise_builder_attempts
    where status = 'submitted' and (p_attempt_id is null or id = p_attempt_id)
    order by submitted_at
  loop
    perform public.record_exercise_builder_attempt_diagnostics(v_attempt.id);
    v_count := v_count + 1;
  end loop;

  delete from public.exercise_builder_learner_diagnostic_summaries summary
  where not exists (
    select 1 from public.exercise_builder_diagnostic_events event
    where event.learner_id = summary.learner_id
      and event.diagnostic_code = summary.diagnostic_code
  );

  return v_count;
end;
$$;

revoke all on function public.admin_rebuild_exercise_builder_diagnostics(uuid) from public;
grant execute on function public.admin_rebuild_exercise_builder_diagnostics(uuid) to authenticated;

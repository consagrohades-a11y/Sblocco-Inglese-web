-- Replace code-count diagnostic patterns with evidence-based pedagogical learning signals.
-- Legacy taxonomy remains only for backwards compatibility with older authored content.

drop trigger if exists exercise_builder_attempts_build_diagnostics
  on public.exercise_builder_attempts;

update public.exercise_builder_attempts
set result_summary = result_summary - 'diagnostic_summary'
where result_summary ? 'diagnostic_summary';

delete from public.exercise_builder_attempt_diagnostic_summaries;
delete from public.exercise_builder_learner_diagnostic_summaries;
delete from public.exercise_builder_diagnostic_events;

CREATE OR REPLACE FUNCTION public.admin_get_learner_learning_signals(p_learner_id uuid, p_days integer DEFAULT 90)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_days integer := case when p_days in (30, 90, 3650) then p_days else 90 end;
  v_since timestamptz;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_learner_id
      and role = 'learner'
  ) then
    raise exception 'Learner not found.';
  end if;

  v_since := now() - make_interval(days => v_days);

  with
  evidence as (
    select
      attempt.learner_id,
      attempt.id attempt_id,
      attempt.submitted_at,
      coalesce(nullif(trim(question.question_snapshot ->> 'topic'), ''), 'General') topic,
      coalesce(nullif(trim(question.question_snapshot ->> 'primary_skill'), ''), 'other') primary_skill,
      coalesce(nullif(trim(question.question_snapshot ->> 'learning_objective'), ''), '') learning_objective,
      coalesce(nullif(trim(question.question_snapshot ->> 'type'), ''), 'unknown') question_type,
      greatest(coalesce((question.grading_result ->> 'max_points')::numeric, 0), 0) max_points,
      greatest(
        least(
          coalesce((question.grading_result ->> 'earned_points')::numeric, 0),
          coalesce((question.grading_result ->> 'max_points')::numeric, 0)
        ),
        0
      ) earned_points,
      case
        when question.question_snapshot ->> 'type' in (
          'translation',
          'open_answer',
          'open_answer_set',
          'written_response',
          'dialogue_roleplay',
          'audio_response'
        ) then 'active'
        when question.question_snapshot ->> 'type' in (
          'gap_fill',
          'select_gap',
          'word_order',
          'error_correction',
          'use_of_english'
        ) then 'guided'
        when lower(coalesce(question.question_snapshot ->> 'learning_objective', '')) ~
          '(actively retrieve|retrieve .* with reduced support|retrieve .* without|produce|write|describe|respond|transfer .* to)'
          then 'active'
        else 'recognition'
      end stage
    from public.exercise_builder_attempt_questions question
    join public.exercise_builder_attempts attempt
      on attempt.id = question.attempt_id
    where attempt.learner_id = p_learner_id
      and attempt.status = 'submitted'
      and attempt.submitted_at >= v_since
      and coalesce((question.grading_result ->> 'max_points')::numeric, 0) > 0
      and coalesce(question.grading_result ->> 'status', '') in (
        'correct',
        'nearly_correct',
        'incorrect'
      )
  ),
  attempt_concepts as (
    select
      learner_id,
      attempt_id,
      submitted_at,
      topic,
      primary_skill,
      sum(earned_points) earned_points,
      sum(max_points) max_points,
      sum(earned_points) / nullif(sum(max_points), 0) performance
    from evidence
    group by learner_id, attempt_id, submitted_at, topic, primary_skill
  ),
  concepts as (
    select
      learner_id,
      topic,
      primary_skill,
      count(*) attempt_count,
      count(*) filter (where performance < 0.70) weak_attempts,
      sum(earned_points) earned_points,
      sum(max_points) max_points,
      sum(earned_points) / nullif(sum(max_points), 0) overall_performance,
      (array_agg(performance order by submitted_at asc))[1] first_performance,
      (array_agg(performance order by submitted_at desc))[1] latest_performance,
      min(submitted_at) first_seen_at,
      max(submitted_at) last_seen_at
    from attempt_concepts
    group by learner_id, topic, primary_skill
  ),
  stages as (
    select
      learner_id,
      topic,
      primary_skill,
      stage,
      count(*) item_count,
      sum(earned_points) earned_points,
      sum(max_points) max_points,
      sum(earned_points) / nullif(sum(max_points), 0) performance
    from evidence
    group by learner_id, topic, primary_skill, stage
  ),
  concept_evidence as (
    select
      concept.*,
      max(stage.performance) filter (where stage.stage = 'recognition') recognition_performance,
      max(stage.max_points) filter (where stage.stage = 'recognition') recognition_points,
      max(stage.item_count) filter (where stage.stage = 'recognition') recognition_items,
      max(stage.performance) filter (where stage.stage = 'guided') guided_performance,
      max(stage.max_points) filter (where stage.stage = 'guided') guided_points,
      max(stage.item_count) filter (where stage.stage = 'guided') guided_items,
      max(stage.performance) filter (where stage.stage = 'active') active_performance,
      max(stage.max_points) filter (where stage.stage = 'active') active_points,
      max(stage.item_count) filter (where stage.stage = 'active') active_items
    from concepts concept
    left join stages stage
      using (learner_id, topic, primary_skill)
    group by
      concept.learner_id,
      concept.topic,
      concept.primary_skill,
      concept.attempt_count,
      concept.weak_attempts,
      concept.earned_points,
      concept.max_points,
      concept.overall_performance,
      concept.first_performance,
      concept.latest_performance,
      concept.first_seen_at,
      concept.last_seen_at
  ),
  objective_losses as (
    select
      learner_id,
      topic,
      primary_skill,
      learning_objective,
      count(distinct attempt_id) attempt_count,
      sum(max_points - earned_points) lost_points,
      sum(max_points) observed_points,
      max(submitted_at) last_seen_at
    from evidence
    where learning_objective <> ''
      and earned_points / nullif(max_points, 0) < 0.85
    group by learner_id, topic, primary_skill, learning_objective
  ),
  ranked_objectives as (
    select
      objective_losses.*,
      row_number() over (
        partition by learner_id, topic, primary_skill
        order by lost_points desc, last_seen_at desc, learning_objective
      ) objective_rank
    from objective_losses
  ),
  candidates as (
    select
      concept_evidence.*,
      'transfer_gap'::text signal_type,
      100 priority
    from concept_evidence
    where recognition_points >= 3
      and active_points >= 3
      and recognition_performance >= 0.80
      and active_performance <= 0.70
      and recognition_performance - active_performance >= 0.20

    union all

    select
      concept_evidence.*,
      'persistent_gap'::text signal_type,
      90 priority
    from concept_evidence
    where attempt_count >= 2
      and weak_attempts >= 2
      and max_points >= 6
      and overall_performance <= 0.70

    union all

    select
      concept_evidence.*,
      'guided_instability'::text signal_type,
      80 priority
    from concept_evidence
    where coalesce(guided_points, 0) >= 3
      and coalesce(guided_items, 0) >= 2
      and guided_performance <= 0.65

    union all

    select
      concept_evidence.*,
      'improving'::text signal_type,
      60 priority
    from concept_evidence
    where attempt_count >= 2
      and first_performance <= 0.75
      and latest_performance >= 0.75
      and latest_performance - first_performance >= 0.15
  ),
  deduped as (
    select
      candidates.*,
      row_number() over (
        partition by learner_id, topic, primary_skill
        order by priority desc, max_points desc
      ) concept_rank
    from candidates
  ),
  final_signals as (
    select
      signal.*,
      case
        when signal.signal_type = 'improving' then 'confirmed'
        when signal.attempt_count >= 2 then 'confirmed'
        else 'observed'
      end confidence,
      case signal.primary_skill
        when 'grammar' then 'grammatica'
        when 'vocabulary' then 'lessico'
        when 'listening' then 'ascolto'
        when 'reading' then 'comprensione scritta'
        when 'writing' then 'scrittura'
        when 'speaking' then 'parlato'
        when 'interaction' then 'interazione'
        when 'functional_language' then 'lingua funzionale'
        when 'word_order' then 'costruzione della frase'
        else replace(signal.primary_skill, '_', ' ')
      end skill_label
    from deduped signal
    where concept_rank = 1
  ),
  limited_signals as (
    select *
    from final_signals
    order by
      case confidence when 'confirmed' then 0 else 1 end,
      priority desc,
      max_points desc,
      last_seen_at desc
    limit 4
  ),
  signal_payload as (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'signal_type', signal.signal_type,
            'confidence', signal.confidence,
            'confidence_label', case signal.confidence
              when 'confirmed' then 'Confermato'
              else 'Da verificare'
            end,
            'topic', signal.topic,
            'primary_skill', signal.primary_skill,
            'skill_label', signal.skill_label,
            'title', case signal.signal_type
              when 'transfer_gap' then signal.topic || ': riconosce più di quanto riesca a recuperare'
              when 'persistent_gap' then signal.topic || ': la difficoltà ritorna in più tentativi'
              when 'guided_instability' then signal.topic || ': non è ancora stabile anche con supporto'
              when 'improving' then signal.topic || ': il controllo sta diventando più stabile'
            end,
            'what_is_happening', case signal.signal_type
              when 'transfer_gap' then
                'Nel ' || signal.skill_label || ' il riconoscimento è al ' ||
                round(100 * signal.recognition_performance)::text || '%, mentre il recupero o uso attivo è al ' ||
                round(100 * signal.active_performance)::text || '%.'
              when 'persistent_gap' then
                signal.weak_attempts::text || ' tentativi su ' || signal.attempt_count::text ||
                ' sono rimasti sotto il 70% nello stesso ambito; risultato complessivo ' ||
                round(100 * signal.overall_performance)::text || '%.'
              when 'guided_instability' then
                'Anche nella pratica guidata il controllo resta al ' ||
                round(100 * signal.guided_performance)::text || '% su ' ||
                round(signal.guided_points, 1)::text || ' punti osservati.'
              when 'improving' then
                'Le prove comparabili passano dal ' ||
                round(100 * signal.first_performance)::text || '% al ' ||
                round(100 * signal.latest_performance)::text || '%.'
            end,
            'why_it_matters', case signal.signal_type
              when 'transfer_gap' then 'Il contenuto sembra riconoscibile, ma non è ancora disponibile con la stessa sicurezza quando lo studente deve recuperarlo o usarlo.'
              when 'persistent_gap' then 'Non è più un errore isolato: la stessa difficoltà ricompare in momenti diversi.'
              when 'guided_instability' then 'Se la forma cede già con supporto, aumentare subito la produzione libera rischia di consolidare l’errore.'
              when 'improving' then 'Il segnale suggerisce consolidamento: riaprire tutta la teoria sarebbe probabilmente ridondante.'
            end,
            'next_action', case
              when signal.signal_type = 'improving' then
                'Non ripartire dalla teoria. Fai una verifica breve in un contesto nuovo e aumenta gradualmente l’autonomia.'
              when signal.primary_skill in ('grammar', 'word_order') then
                'Usa 2–3 contrasti brevi, poi togli le opzioni e chiudi con una mini-produzione che richieda la stessa scelta.'
              when signal.primary_skill = 'vocabulary' then
                'Riduci il riconoscimento: fai recuperare 3–5 parole o chunk senza lista e usali subito in una risposta personale.'
              when signal.primary_skill = 'listening' then
                'Verifica lo stesso obiettivo con un audio nuovo e breve; separa gist, dettaglio e recupero della lingua invece di ripetere lo stesso ascolto.'
              when signal.primary_skill = 'reading' then
                'Verifica lo stesso obiettivo su un testo nuovo e breve; cambia contesto prima di concludere che la difficoltà è stabile.'
              when signal.primary_skill = 'writing' then
                'Isola un solo criterio, fai correggere o riscrivere una produzione breve e confronta la seconda versione con la prima.'
              when signal.primary_skill in ('functional_language', 'interaction', 'speaking') then
                'Porta il target in un micro-dialogo nuovo, prima con un piccolo supporto e poi senza traccia.'
              else
                'Verifica lo stesso obiettivo in un contesto nuovo prima di aumentare la difficoltà.'
            end,
            'attempt_count', signal.attempt_count,
            'weak_attempts', signal.weak_attempts,
            'overall_percent', round(100 * signal.overall_performance),
            'recognition_percent', case when signal.recognition_performance is null then null else round(100 * signal.recognition_performance) end,
            'guided_percent', case when signal.guided_performance is null then null else round(100 * signal.guided_performance) end,
            'active_percent', case when signal.active_performance is null then null else round(100 * signal.active_performance) end,
            'observed_points', round(signal.max_points, 1),
            'first_seen_at', signal.first_seen_at,
            'last_seen_at', signal.last_seen_at,
            'evidence', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'learning_objective', objective.learning_objective,
                  'attempt_count', objective.attempt_count,
                  'lost_points', round(objective.lost_points, 1),
                  'observed_points', round(objective.observed_points, 1)
                )
                order by objective.objective_rank
              )
              from ranked_objectives objective
              where objective.learner_id = signal.learner_id
                and objective.topic = signal.topic
                and objective.primary_skill = signal.primary_skill
                and objective.objective_rank <= 2
            ), '[]'::jsonb)
          )
          order by
            case signal.confidence when 'confirmed' then 0 else 1 end,
            signal.priority desc,
            signal.max_points desc,
            signal.last_seen_at desc
        ),
        '[]'::jsonb
      ) payload
    from limited_signals signal
  ),
  evidence_summary as (
    select jsonb_build_object(
      'scored_questions', count(*),
      'attempt_count', count(distinct attempt_id),
      'topic_skill_pairs', count(distinct (topic, primary_skill)),
      'period_days', v_days
    ) payload
    from evidence
  )
  select jsonb_build_object(
    'generated_at', now(),
    'period_days', v_days,
    'evidence', evidence_summary.payload,
    'signals', signal_payload.payload
  )
  into v_result
  from signal_payload, evidence_summary;

  return v_result;
end;
$function$;

revoke all on function public.admin_get_learner_learning_signals(uuid, integer) from public;
grant execute on function public.admin_get_learner_learning_signals(uuid, integer) to authenticated;

notify pgrst, 'reload schema';

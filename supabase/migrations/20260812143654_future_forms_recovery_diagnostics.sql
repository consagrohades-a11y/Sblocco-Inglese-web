-- Recovery content diagnostics required by the Future Forms Wave 1 topic.
-- Production migration version: 20260812143654.

insert into public.exercise_builder_diagnostic_codes (
  code, label, primary_skill, topic, subtopic, group_key,
  severity, category, recommended_resources, status
) values
  ('FUTURE_WILL_INSTANT_DECISION','Will for an instant decision','grammar','future_forms','instant_decision','future_forms','major','learning','[]'::jsonb,'active'),
  ('FUTURE_WILL_BASE_FORM','Base verb after will','grammar','future_forms','will_form','future_forms','major','learning','[]'::jsonb,'active'),
  ('FUTURE_GOING_TO_BE','Correct be form in be going to','grammar','future_forms','going_to_form','future_forms','major','learning','[]'::jsonb,'active'),
  ('FUTURE_GOING_TO_EVIDENCE','Be going to for an evidence-based prediction','grammar','future_forms','evidence_prediction','future_forms','major','learning','[]'::jsonb,'active')
on conflict (code) do update set
  label=excluded.label,
  primary_skill=excluded.primary_skill,
  topic=excluded.topic,
  subtopic=excluded.subtopic,
  group_key=excluded.group_key,
  severity=excluded.severity,
  category=excluded.category,
  status='active',
  updated_at=now();

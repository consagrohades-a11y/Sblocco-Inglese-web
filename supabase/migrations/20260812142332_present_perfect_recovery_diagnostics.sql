-- Recovery content diagnostics required by the Present Perfect core topic.
-- Production migration version: 20260812142332.

insert into public.exercise_builder_diagnostic_codes (
  code, label, primary_skill, topic, subtopic, group_key,
  severity, category, recommended_resources, status
) values
  ('PRESENT_PERFECT_AUXILIARY','Have and has in the Present Perfect','grammar','present_perfect','auxiliary','present_perfect','major','learning','[]'::jsonb,'active'),
  ('PRESENT_PERFECT_PARTICIPLE_FORM','Past participle in the Present Perfect','grammar','present_perfect','participle_form','present_perfect','major','learning','[]'::jsonb,'active'),
  ('PRESENT_PERFECT_QUESTION_STRUCTURE','Present Perfect question structure','grammar','present_perfect','questions','present_perfect','major','learning','[]'::jsonb,'active'),
  ('PRESENT_PERFECT_NEGATIVE_STRUCTURE','Present Perfect negative structure','grammar','present_perfect','negative','present_perfect','major','learning','[]'::jsonb,'active'),
  ('PRESENT_PERFECT_RECENT_RESULT','Present Perfect for a recent result connected to now','grammar','present_perfect','recent_result','present_perfect','major','learning','[]'::jsonb,'active'),
  ('PRESENT_PERFECT_UNFINISHED_TIME','Present Perfect in an unfinished time period','grammar','present_perfect','unfinished_time','present_perfect','minor','learning','[]'::jsonb,'active')
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

-- Recovery content diagnostics required by the Irregular Verbs curriculum topic.
-- Production migration version: 20260812141622.

insert into public.exercise_builder_diagnostic_codes (
  code, label, primary_skill, topic, subtopic, group_key,
  severity, category, recommended_resources, status
) values
  (
    'IRREGULAR_PAST_PARTICIPLE_FORM',
    'Irregular past participle form',
    'grammar',
    'irregular_verbs',
    'past_participle',
    'irregular_verbs',
    'major',
    'learning',
    '[]'::jsonb,
    'active'
  ),
  (
    'IRREGULAR_PAST_VS_PARTICIPLE',
    'Choose Past Simple form vs past participle',
    'grammar',
    'irregular_verbs',
    'past_vs_participle',
    'irregular_verbs',
    'major',
    'learning',
    '[]'::jsonb,
    'active'
  )
on conflict (code) do update set
  label = excluded.label,
  primary_skill = excluded.primary_skill,
  topic = excluded.topic,
  subtopic = excluded.subtopic,
  group_key = excluded.group_key,
  severity = excluded.severity,
  category = excluded.category,
  status = 'active',
  updated_at = now();

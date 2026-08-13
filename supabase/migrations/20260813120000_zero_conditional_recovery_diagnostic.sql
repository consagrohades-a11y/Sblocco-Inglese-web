-- Recovery diagnostic for Zero Conditional meaning/form.

insert into public.exercise_builder_diagnostic_codes (
  code, label, primary_skill, topic, subtopic, group_key,
  severity, category, recommended_resources, status
) values
  ('CONDITIONAL_ZERO','Zero Conditional for general truths and repeated results','grammar','conditionals','zero','conditionals','major','learning','[]'::jsonb,'active')
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

insert into public.exercise_builder_diagnostic_messages (
  diagnostic_code, language, message_level, message_text
) values
  ('CONDITIONAL_ZERO','it','reminder','Usa lo Zero Conditional per una regola, una verità generale o un risultato che si verifica normalmente quando la condizione è vera: present + present.'),
  ('CONDITIONAL_ZERO','it','subtopic_review','Rivedi la differenza tra una conseguenza generale e una singola possibilità futura: lo Zero Conditional descrive ciò che succede normalmente, non un futuro specifico.'),
  ('CONDITIONAL_ZERO','it','weakness','Lo Zero Conditional non è ancora stabile. Parti dal significato: stai descrivendo una regola o un risultato generale che vale ogni volta che si verifica la condizione?')
on conflict (diagnostic_code, language, message_level)
do update set
  message_text=excluded.message_text,
  updated_at=now();
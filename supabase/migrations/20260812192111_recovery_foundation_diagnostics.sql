-- Recovery diagnostics required by Possessives and Prepositions.

insert into public.exercise_builder_diagnostic_codes (
  code, label, primary_skill, topic, subtopic, group_key,
  severity, category, recommended_resources, status
) values
  ('POSSESSIVE_PRONOUN_CHOICE','Possessive pronoun choice','grammar','possession','possessive_pronouns','possession','major','learning','[]'::jsonb,'active'),
  ('PREPOSITIONS_MOVEMENT','Prepositions of movement','grammar','prepositions','movement','prepositions','major','learning','[]'::jsonb,'active')
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
  ('POSSESSIVE_PRONOUN_CHOICE','it','reminder','Usa un possessive pronoun senza un nome dopo: mine, yours, his, hers, ours, theirs.'),
  ('POSSESSIVE_PRONOUN_CHOICE','it','subtopic_review','Rivedi la differenza tra possessive adjective + nome (my book) e possessive pronoun da solo (mine).'),
  ('POSSESSIVE_PRONOUN_CHOICE','it','weakness','La scelta dei possessive pronouns non è ancora stabile. Controlla se dopo il possessivo compare un nome: se non compare, serve spesso mine/yours/his/hers/ours/theirs.'),
  ('PREPOSITIONS_MOVEMENT','it','reminder','Le preposizioni di movimento descrivono la direzione: to, into, out of, across, through, up, down e simili.'),
  ('PREPOSITIONS_MOVEMENT','it','subtopic_review','Rivedi la differenza tra posizione e movimento: in = dentro; into = movimento verso l’interno, quando il contrasto è richiesto.'),
  ('PREPOSITIONS_MOVEMENT','it','weakness','Le preposizioni di movimento non sono ancora stabili. Visualizza il percorso: verso, dentro, fuori, attraverso o da un lato all’altro?')
on conflict (diagnostic_code, language, message_level)
do update set
  message_text=excluded.message_text,
  updated_at=now();

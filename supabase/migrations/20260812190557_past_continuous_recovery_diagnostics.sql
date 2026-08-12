-- Recovery diagnostics for the Past Continuous topic.

insert into public.exercise_builder_diagnostic_codes (
  code, label, primary_skill, topic, subtopic, group_key,
  severity, category, recommended_resources, status
) values
  ('PAST_CONTINUOUS_USE','Past Continuous for an action in progress at a past time','grammar','past_continuous','use','past_continuous','major','learning','[]'::jsonb,'active'),
  ('PAST_CONTINUOUS_AUXILIARY','Was/were agreement in the Past Continuous','grammar','past_continuous','auxiliary','past_continuous','major','learning','[]'::jsonb,'active'),
  ('PAST_CONTINUOUS_VERB_ING','Verb -ing form in the Past Continuous','grammar','past_continuous','verb_ing','past_continuous','major','learning','[]'::jsonb,'active'),
  ('PAST_CONTINUOUS_NEGATIVE','Past Continuous negative structure','grammar','past_continuous','negative','past_continuous','major','learning','[]'::jsonb,'active'),
  ('PAST_CONTINUOUS_QUESTION_STRUCTURE','Past Continuous question structure','grammar','past_continuous','questions','past_continuous','major','learning','[]'::jsonb,'active'),
  ('PAST_CONTINUOUS_BACKGROUND','Past Continuous for background action','grammar','past_continuous','background','past_continuous','major','learning','[]'::jsonb,'active')
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
  ('PAST_CONTINUOUS_USE','it','reminder','Il Past Continuous descrive un’azione che era in corso in un preciso momento passato: was/were + verbo in -ing.'),
  ('PAST_CONTINUOUS_USE','it','subtopic_review','Rivedi quando usare il Past Continuous per mostrare un’azione in svolgimento nel passato, non semplicemente un fatto passato concluso.'),
  ('PAST_CONTINUOUS_USE','it','weakness','L’uso del Past Continuous non è ancora stabile. Parti dal significato: l’azione era in corso in quel momento passato?'),
  ('PAST_CONTINUOUS_AUXILIARY','it','reminder','Scegli was con I/he/she/it e were con you/we/they.'),
  ('PAST_CONTINUOUS_AUXILIARY','it','subtopic_review','Rivedi l’accordo di was/were prima di aggiungere il verbo in -ing.'),
  ('PAST_CONTINUOUS_AUXILIARY','it','weakness','Was/were nel Past Continuous non è ancora stabile. Controlla prima il soggetto, poi costruisci il resto della forma.'),
  ('PAST_CONTINUOUS_VERB_ING','it','reminder','Dopo was/were serve il verbo in -ing, non la forma base.'),
  ('PAST_CONTINUOUS_VERB_ING','it','subtopic_review','Rivedi la struttura completa was/were + verbo in -ing e le regole di spelling già usate nel Present Continuous.'),
  ('PAST_CONTINUOUS_VERB_ING','it','weakness','La forma in -ing dopo was/were non è ancora stabile. Ricostruisci sempre entrambe le parti del tempo verbale.'),
  ('PAST_CONTINUOUS_NEGATIVE','it','reminder','La negativa è was not / were not + verbo in -ing; puoi usare wasn’t / weren’t.'),
  ('PAST_CONTINUOUS_NEGATIVE','it','subtopic_review','Rivedi la posizione di not nel Past Continuous e non usare did/didn’t.'),
  ('PAST_CONTINUOUS_NEGATIVE','it','weakness','La negativa del Past Continuous non è ancora stabile. Mantieni was/were e aggiungi not prima del verbo in -ing.'),
  ('PAST_CONTINUOUS_QUESTION_STRUCTURE','it','reminder','Nelle domande del Past Continuous, was/were va prima del soggetto.'),
  ('PAST_CONTINUOUS_QUESTION_STRUCTURE','it','subtopic_review','Rivedi l’ordine: question word + was/were + soggetto + verbo in -ing?'),
  ('PAST_CONTINUOUS_QUESTION_STRUCTURE','it','weakness','Le domande al Past Continuous non sono ancora stabili. Non usare did: sposta was/were prima del soggetto.'),
  ('PAST_CONTINUOUS_BACKGROUND','it','reminder','Il Past Continuous può descrivere ciò che stava succedendo sullo sfondo di una scena passata.'),
  ('PAST_CONTINUOUS_BACKGROUND','it','subtopic_review','Rivedi il Past Continuous per costruire lo sfondo: persone, tempo, ambiente e azioni già in corso.'),
  ('PAST_CONTINUOUS_BACKGROUND','it','weakness','L’uso del Past Continuous come sfondo non è ancora stabile. Immagina la scena e descrivi ciò che era già in corso.')
on conflict (diagnostic_code, language, message_level)
do update set
  message_text=excluded.message_text,
  updated_at=now();
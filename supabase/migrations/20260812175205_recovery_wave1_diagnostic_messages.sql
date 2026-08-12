-- Complete Italian learner-facing diagnostics required by the Wave 1 publishability guard.

insert into public.exercise_builder_diagnostic_messages (
  diagnostic_code,
  language,
  message_level,
  message_text
) values
  ('IRREGULAR_PAST_PARTICIPLE_FORM','it','reminder','Controlla la terza forma del verbo irregolare: dopo have/has serve il past participle, non il Past Simple.'),
  ('IRREGULAR_PAST_PARTICIPLE_FORM','it','subtopic_review','Rivedi le forme irregolari del past participle e recuperale dentro una frase, non come lista isolata.'),
  ('IRREGULAR_PAST_PARTICIPLE_FORM','it','weakness','Il past participle dei verbi irregolari non è ancora stabile. Ripassa le forme più frequenti e distinguilo dal Past Simple.'),
  ('IRREGULAR_PAST_VS_PARTICIPLE','it','reminder','Guarda la struttura: senza have/has serve spesso la forma del Past Simple; dopo have/has serve il past participle.'),
  ('IRREGULAR_PAST_VS_PARTICIPLE','it','subtopic_review','Rivedi la differenza tra seconda e terza forma dei verbi irregolari e scegli la forma dalla struttura della frase.'),
  ('IRREGULAR_PAST_VS_PARTICIPLE','it','weakness','La scelta tra Past Simple e past participle non è ancora stabile. Concentrati sulla struttura che precede il verbo, non solo sulla memoria della lista.'),
  ('PRESENT_PERFECT_AUXILIARY','it','reminder','Nel Present Perfect scegli have o has in base al soggetto.'),
  ('PRESENT_PERFECT_AUXILIARY','it','subtopic_review','Rivedi have/has nel Present Perfect: I/you/we/they have; he/she/it has.'),
  ('PRESENT_PERFECT_AUXILIARY','it','weakness','La scelta tra have e has nel Present Perfect non è ancora stabile. Concentrati prima sul soggetto, poi completa la struttura.'),
  ('PRESENT_PERFECT_PARTICIPLE_FORM','it','reminder','Dopo have/has serve il past participle: controlla soprattutto i verbi irregolari.'),
  ('PRESENT_PERFECT_PARTICIPLE_FORM','it','subtopic_review','Rivedi la forma del past participle nel Present Perfect e distinguila dal Past Simple.'),
  ('PRESENT_PERFECT_PARTICIPLE_FORM','it','weakness','Il past participle nel Present Perfect non è ancora stabile. Ripassa le forme frequenti e usale dopo have/has.'),
  ('PRESENT_PERFECT_NEGATIVE_STRUCTURE','it','reminder','La negativa è have/has + not + past participle: non usare do/does.'),
  ('PRESENT_PERFECT_NEGATIVE_STRUCTURE','it','subtopic_review','Rivedi haven’t/hasn’t + past participle e la posizione di not nel Present Perfect.'),
  ('PRESENT_PERFECT_NEGATIVE_STRUCTURE','it','weakness','La forma negativa del Present Perfect non è ancora stabile. Ricostruisci la struttura completa prima di scegliere il participio.'),
  ('PRESENT_PERFECT_QUESTION_STRUCTURE','it','reminder','Nelle domande del Present Perfect, have/has va prima del soggetto.'),
  ('PRESENT_PERFECT_QUESTION_STRUCTURE','it','subtopic_review','Rivedi l’ordine: Have/Has + soggetto + past participle...?'),
  ('PRESENT_PERFECT_QUESTION_STRUCTURE','it','weakness','Le domande al Present Perfect non sono ancora stabili. Controlla posizione dell’ausiliare e forma del participio.'),
  ('PRESENT_PERFECT_RECENT_RESULT','it','reminder','Usa il Present Perfect quando un evento passato ha un risultato rilevante adesso.'),
  ('PRESENT_PERFECT_RECENT_RESULT','it','subtopic_review','Rivedi il Present Perfect per risultati recenti collegati alla situazione presente.'),
  ('PRESENT_PERFECT_RECENT_RESULT','it','weakness','Il collegamento tra evento passato e risultato presente non è ancora stabile. Leggi il contesto prima di scegliere il tempo.'),
  ('PRESENT_PERFECT_UNFINISHED_TIME','it','reminder','Con un periodo di tempo non ancora concluso, il Present Perfect può collegare ciò che è successo al presente.'),
  ('PRESENT_PERFECT_UNFINISHED_TIME','it','subtopic_review','Rivedi il Present Perfect nei periodi ancora in corso, come today o this week quando il periodo non è finito.'),
  ('PRESENT_PERFECT_UNFINISHED_TIME','it','weakness','La scelta del Present Perfect nei periodi non conclusi non è ancora stabile. Controlla se il periodo è ancora aperto nel momento in cui parli.'),
  ('FUTURE_WILL_BASE_FORM','it','reminder','Dopo will usa sempre il verbo base senza to.'),
  ('FUTURE_WILL_BASE_FORM','it','subtopic_review','Rivedi la struttura will + verbo base nelle affermative, negative e domande.'),
  ('FUTURE_WILL_BASE_FORM','it','weakness','La forma dopo will non è ancora stabile. Ricorda che will non cambia e il verbo resta alla forma base.'),
  ('FUTURE_WILL_INSTANT_DECISION','it','reminder','Will è adatto per una decisione presa nel momento in cui parli.'),
  ('FUTURE_WILL_INSTANT_DECISION','it','subtopic_review','Rivedi la differenza tra decisione immediata con will e piano già deciso con going to.'),
  ('FUTURE_WILL_INSTANT_DECISION','it','weakness','La scelta di will per decisioni immediate non è ancora stabile. Chiediti quando è stata presa la decisione.'),
  ('FUTURE_GOING_TO_BE','it','reminder','Be going to richiede la forma corretta di be: am/is/are + going to + verbo base.'),
  ('FUTURE_GOING_TO_BE','it','subtopic_review','Rivedi am/is/are nella struttura be going to prima di concentrarti sul verbo principale.'),
  ('FUTURE_GOING_TO_BE','it','weakness','La struttura be going to non è ancora stabile. Controlla prima il soggetto e scegli am, is o are.'),
  ('FUTURE_GOING_TO_EVIDENCE','it','reminder','Usa be going to per una previsione quando c’è un’evidenza presente visibile o concreta.'),
  ('FUTURE_GOING_TO_EVIDENCE','it','subtopic_review','Rivedi going to per previsioni basate su evidenza e distinguilo da will per opinioni o previsioni non basate su un segnale presente.'),
  ('FUTURE_GOING_TO_EVIDENCE','it','weakness','La previsione con going to non è ancora stabile. Cerca nel contesto l’evidenza presente che sostiene la previsione.')
on conflict (diagnostic_code, language, message_level)
do update set
  message_text = excluded.message_text,
  updated_at = now();

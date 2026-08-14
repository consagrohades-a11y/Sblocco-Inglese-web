# Recupero Debito: Verifica mista v1

## Perimetro

Questa release abilita un solo checkpoint misto nel profilo `h30_checkpoint_v1` quando il pool è realmente sufficiente. Il programma scolastico selezionato dal learner resta autorevole: entrano soltanto argomenti richiesti dalla scuola e supportati dal catalogo Recovery attualmente live. Non abilita ripasso errori autonomo, simulazione intermedia, simulazione finale o Readiness v2 learner-facing.

Il catalogo live attuale contiene 24 topic `ready-for-content`. La Verifica mista v1 dispone di due forme fresche per ciascuno: 48 frammenti totali. Ogni checkpoint continua a selezionare 4 topic × 2 forme = 8 parti, circa 24 minuti, con 12–16 decisioni valutate complessive e almeno 3 decisioni per topic selezionato.

## Azioni production dopo il merge

1. Attendere che il deployment Vercel di `main` sia `READY`.
2. Applicare, in ordine, le migration non ancora presenti in produzione:
   - `20260814094844_recovery_mixed_checkpoint_v1.sql`
   - `20260814125000_recovery_mixed_checkpoint_launch_complete.sql`
3. Aprire **Admin → Recupero Debito → Contenuti e mapping Recovery**.
4. Premere **Pubblica Verifica mista v1**.
5. Verificare il messaggio di pubblicazione e poi il controllo database qui sotto.
6. Non inserire manualmente righe in `recovery_assessment_fragments`.
7. Non attivare `full_curriculum`, mock o Readiness v2 learner-facing.

## Controllo database

Eseguire in SQL Editor:

```sql
select
  count(*) as approved_fragments,
  count(distinct metadata -> 'topic_keys' ->> 0) as covered_topics,
  count(distinct form_family_key) as form_families,
  min(coalesce((metadata ->> 'scored_decisions')::integer, 0)) as min_decisions_per_fragment,
  max(coalesce((metadata ->> 'scored_decisions')::integer, 0)) as max_decisions_per_fragment
from public.recovery_assessment_fragments
where status = 'approved'
  and active
  and metadata ->> 'launch_profile' = 'h30_checkpoint_v1';
```

Risultato atteso: `48` frammenti, `24` topic, `48` form family. Ogni topic deve avere esattamente due form family e almeno 3 decisioni valutate sommate sulle due forme.

Controllo per topic:

```sql
select
  metadata -> 'topic_keys' ->> 0 as topic_key,
  count(*) as forms,
  sum(coalesce((metadata ->> 'scored_decisions')::integer, 0)) as scored_decisions
from public.recovery_assessment_fragments
where status = 'approved'
  and active
  and metadata ->> 'launch_profile' = 'h30_checkpoint_v1'
group by 1
order by 1;
```

Risultato atteso: 24 righe; `forms = 2`; `scored_decisions` tra 3 e 4.

## Accettazione end to end con learner pulito

Eseguire almeno un percorso pulito per classe prima, seconda e terza. Per la classe terza usare quattro topic live che abbiano outcome attualmente in scope per Year 3; non usare strutture Curriculum v2 ancora `planned`.

1. Completare la diagnostica.
2. Selezionare almeno quattro argomenti live effettivamente assegnati dalla scuola.
3. Impostare una data esame in modalità Complete o Intensive, non SOS.
4. Aprire il piano e verificare che spieghi diagnostica, programma scolastico e data esame.
5. Completare il lavoro precedente al checkpoint.
6. Aprire **Verifica mista**.
7. Verificare 8 parti intercalate, 4 argomenti, circa 24 minuti e almeno 12 decisioni valutate complessive.
8. Verificare che titolo e istruzioni non nominino la regola richiesta.
9. Verificare che durante la prova non compaiano corretto/errato, soluzione, spiegazione o punteggio progressivo.
10. Aggiornare la pagina a metà prova e verificare la ripresa dello stesso tentativo.
11. Consegnare una sola volta e provare subito un doppio clic sul comando di consegna.
12. **Subito dopo la consegna dell’ultima parte, chiudere il tab/browser senza tornare a RecoverySession.**
13. Riaprire il sito e accedere di nuovo.
14. Verificare che il checkpoint sia già `completed` e che il piano sia già reprioritizzato: il browser non deve causare il ricalcolo.
15. Verificare risultato complessivo e sezioni **Bene**, **Da consolidare**, **Torna tra le priorità**.
16. Verificare la spiegazione **Che cosa cambia nel tuo piano?**.
17. Verificare che un argomento debole salga nel lavoro futuro e che uno forte non generi una ripetizione immediata non necessaria.
18. Verificare che sessioni completate, tentativi completati ed evidenze storiche siano ancora presenti.
19. Verificare che un eventuale ciclo Recovery obbligatorio già pianificato non sia duplicato.
20. Verificare che non compaiano `mock_intermediate`, `mock_final`, `error_review` autonomi o un secondo checkpoint.
21. Logout/login: verificare risultato, piano già aggiornato e CTA **Continua da dove avevi lasciato**.

## Casi di gate

- Meno di quattro argomenti richiesti dalla scuola: checkpoint omesso con motivo `fewer_than_four_required_school_topics`.
- Meno di quattro topic richiesti con almeno due forme fresche e sufficiente evidenza: checkpoint omesso con motivo `fewer_than_four_required_topics_with_sufficient_fresh_evidence`.
- Programma composto soltanto da topic non supportati/in scope per l’anno: checkpoint omesso in modo sicuro.
- Classe 1: checkpoint disponibile quando quattro topic scolastici richiesti hanno copertura live sufficiente.
- Classe 2: checkpoint disponibile quando quattro topic scolastici richiesti hanno copertura live sufficiente.
- Classe 3: checkpoint disponibile dove il catalogo live e gli outcome Year 3 attuali forniscono quattro topic sufficienti.
- Modalità SOS: checkpoint omesso anche con pool pronto.
- Forme già usate: il gate usa soltanto form family non ancora utilizzate. Se la composizione non è più valida, non materializza una verifica debole.

## Verifica evidenze, adattamento e idempotenza

Dopo la consegna controllare, usando gli ID del learner e della sessione:

```sql
select outcome_id, fragment_id, evidence_source, score, form_family_key, observed_at
from public.recovery_outcome_evidence
where session_id = '<checkpoint_session_id>'::uuid
order by observed_at, outcome_id;

select topic_key, evidence_type, score, evidence_key, observed_at
from public.recovery_mastery_evidence
where session_id = '<checkpoint_session_id>'::uuid
order by topic_key;

select
  status,
  metadata -> 'checkpoint_plan_update_summary' as plan_update_summary,
  metadata ->> 'checkpoint_server_reprioritized_at' as server_reprioritized_at
from public.recovery_plan_sessions
where id = '<checkpoint_session_id>'::uuid;
```

Il checkpoint deve essere già completato con `checkpoint_server_reprioritized_at` valorizzato prima che React ricarichi la pagina.

Ripetere `select public.sync_recovery_session('<checkpoint_session_id>'::uuid);`. Il risultato deve indicare `already_completed`; conteggi delle evidenze e future remediation obbligatorie non devono aumentare. Sessioni `completed`/`in_progress` non devono essere riscritte.

## Checklist qualità pedagogica

- Ogni topic live supportato ha due forme fresche e almeno tre decisioni valutate complessive.
- Future forms richiede scelta da contesto tra decisione immediata con `will`, previsione da evidenza con `going to` e arrangement con Present Continuous.
- Present Perfect non è limitato alla life experience: include anche risultato presente e unfinished time, oltre al controllo del participio.
- Present Simple / Continuous distingue routine/now e permanente/temporaneo.
- Past Simple controlla completed past, `did` e base form in negativo/domanda.
- Question formation controlla scelta dell’ausiliare, word order e `be` vs do-support.
- Countable / uncountable controlla countability e compatibilità articolo/quantificatore.
- Comparatives / superlatives includono forma, contesto e irregolari.
- Difficoltà da retrieval/discriminazione, non da vocabolario oscuro o domande-trabocchetto.

## Checklist guida learner

- Plan reveal: dice cosa ha determinato le priorità e cosa può far cambiare l’ordine.
- Topic session: mostra perché l’argomento è attuale e cosa succede dopo.
- Recupera: spiega che ricostruisce regola o pattern di errore.
- Allenati: spiega il passaggio dalla comprensione all’applicazione guidata.
- Modalità scuola: spiega meno aiuti e maggiore autonomia; la microcopy resta visibile.
- Mini-verifica: chiarisce che può ridurre la priorità, non predice il voto e può produrre lavoro mirato.
- Risultato debole: non usa “fallito” e spiega che cosa resta instabile.
- Risultato forte: chiarisce che l’argomento è stabile per ora e può ricomparire in controlli misti.
- Verifica mista: prima dell’avvio spiega mescolamento, assenza di etichette, feedback nascosto e uso del risultato.
- Risultato checkpoint: mostra fasce e conseguenze, non soltanto la percentuale.
- Ricalcolo: è già concluso lato server; React visualizza il riepilogo persistito e non causa l’adattamento.
- Resume: la prossima azione è esplicita dopo refresh e nuovo login.

## Stop condition

La capability è pronta per merge quando PR, build e migration validation sono verdi. È production-ready soltanto dopo merge, deployment `main` READY, entrambe le migration applicate, pubblicazione dei 48 frammenti e accettazione E2E completa. Non applicare migration o pubblicare contenuti prima del merge/review.

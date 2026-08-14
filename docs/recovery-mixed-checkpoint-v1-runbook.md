# Recovery Debito: Verifica mista v1

## Perimetro

Questa release abilita un solo checkpoint misto nel profilo `h30_checkpoint_v1` quando il pool è realmente sufficiente. Non abilita ripasso errori autonomo, simulazione intermedia, simulazione finale o Readiness v2 learner-facing.

## Azioni production dopo il merge

1. Attendere che il deployment Vercel di `main` sia `READY`.
2. Applicare la migration `20260814094844_recovery_mixed_checkpoint_v1.sql` al progetto Supabase `crzgvhonevrmkueajddy` una sola volta.
3. Aprire Admin, Recupero Debito, Contenuti e mapping Recovery.
4. Premere **Pubblica Verifica mista v1**.
5. Verificare il messaggio: 16 frammenti approvati e registrati.
6. Non inserire manualmente righe in `recovery_assessment_fragments`.
7. Non attivare `full_curriculum`.

## Controllo database

Eseguire in SQL Editor:

```sql
select
  count(*) as approved_fragments,
  count(distinct metadata -> 'topic_keys' ->> 0) as covered_topics,
  count(distinct form_family_key) as form_families
from public.recovery_assessment_fragments
where status = 'approved'
  and active
  and metadata ->> 'launch_profile' = 'h30_checkpoint_v1';
```

Risultato atteso: `16`, `8`, `16`.

## Accettazione end to end con learner pulito

Usare un account senza storico Recovery e una classe seconda.

1. Completare la diagnostica.
2. Selezionare almeno quattro tra gli argomenti coperti dal pool: Present Simple vs Present Continuous, Past Continuous, Future forms, Present Perfect, Question formation, Countable and uncountable nouns, Comparatives, Superlatives.
3. Impostare una data esame in modalità Complete o Intensive, non SOS.
4. Aprire il piano e verificare che spieghi diagnostica, programma scolastico e data esame.
5. Completare il lavoro precedente al checkpoint.
6. Aprire **Verifica mista**.
7. Verificare che compaiano 8 parti intercalate, 4 argomenti e circa 24 minuti.
8. Verificare che titolo, prompt e istruzioni non nominino la regola richiesta.
9. Verificare che durante la prova non compaiano corretto/errato, soluzione, spiegazione o punteggio progressivo.
10. Aggiornare la pagina a metà prova e verificare la ripresa dello stesso tentativo.
11. Consegnare una sola volta e provare subito un doppio clic sul comando di consegna.
12. Verificare risultato complessivo e sezioni **Bene**, **Da consolidare**, **Torna tra le priorità**.
13. Verificare la spiegazione **Che cosa cambia nel tuo piano?**.
14. Verificare che un argomento debole salga nel lavoro futuro e che uno forte non generi una ripetizione non necessaria.
15. Verificare che sessioni e tentativi già completati siano ancora presenti.
16. Verificare che non compaiano `mock_intermediate`, `mock_final` o `error_review` nuovi.
17. Uscire, rientrare e verificare risultato, piano aggiornato e CTA **Continua da dove avevi lasciato**.

## Casi di gate

- Classe prima o terza: checkpoint omesso con motivo `checkpoint_v1_not_available_for_class_year`.
- Meno di quattro argomenti richiesti: checkpoint omesso con motivo `fewer_than_four_required_school_topics`.
- Meno di quattro argomenti coperti con due forme fresche: checkpoint omesso con motivo `fewer_than_four_required_topics_with_two_fresh_forms`.
- Data in modalità SOS: checkpoint omesso anche con pool pronto.
- Forme già usate: il gate usa soltanto form family non ancora utilizzate. Se la composizione non è più valida, non materializza una verifica debole.

## Verifica evidenze e idempotenza

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
```

Ripetere `select public.sync_recovery_session('<checkpoint_session_id>'::uuid);`. Il risultato deve indicare `already_completed` e i conteggi delle evidenze non devono aumentare.

## Checklist guida learner

- Plan reveal: dice cosa ha determinato le priorità e cosa può far cambiare l’ordine.
- Topic session: mostra perché l’argomento è attuale e cosa succede dopo.
- Recupera: spiega che ricostruisce regola o pattern di errore.
- Allenati: spiega il passaggio dalla comprensione all’applicazione guidata.
- Modalità scuola: al primo incontro spiega meno aiuti e maggiore autonomia; la microcopy resta visibile.
- Mini-verifica: chiarisce che può ridurre la priorità, non predice il voto e può produrre lavoro mirato.
- Risultato debole: non usa “fallito” e spiega che cosa resta instabile.
- Risultato forte: chiarisce che l’argomento è stabile per ora e può ricomparire in controlli misti.
- Verifica mista: prima dell’avvio spiega mescolamento, assenza di etichette, feedback nascosto e uso del risultato.
- Risultato checkpoint: mostra fasce e conseguenze, non soltanto la percentuale.
- Ricalcolo: non avviene senza una spiegazione visibile e persistita nella sessione completata.
- Resume: la prossima azione è esplicita dopo refresh e nuovo login.

## Stop condition

La capability è production-ready soltanto dopo migration, pubblicazione dei 16 frammenti e accettazione end to end. Prima di queste azioni il risultato corretto è **CHECKPOINT PRODUCTION NO-GO**.

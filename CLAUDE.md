# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Documento operativo in italiano. Oltre alla guida al codice contiene i **bug aperti** su cui stiamo lavorando (sezione "Bug aperti") e le proposte di miglioramento. Aggiornalo quando un bug viene chiuso o cambia diagnosi.

## Comandi

```bash
npm run dev        # Vite su http://127.0.0.1:5173
npm run build      # esegue validate:exercise-templates + validate:assessment, poi vite build
npm run preview    # anteprima della build su 127.0.0.1

npm run validate:srs                 # obbligatorio dopo modifiche ai dati trainer (src/data/*Cards.js)
npm run validate:exercise-templates  # coerenza template JSON exercise builder
npm run validate:assessment          # scoring assessment
npm run validate:supabase            # config Supabase
npm run generate:exercise-templates  # rigenera public/templates/*.json da src/lib/exerciseBuilderTemplatesV2.js
```

- Non ci sono linter né test suite configurati: la verifica è `npm run build` + gli script `validate:*`.
- Lockfile: `pnpm-lock.yaml` (workspace pnpm); la CI usa `npm install`. Se aggiungi dipendenze, aggiorna il lockfile pnpm.
- CI (`.github/workflows/build.yml`): Node 24, validate+build, e **applica tutte le migrazioni in ordine su Postgres 16**. Le migrazioni esistenti non si modificano mai: solo nuovi file `supabase/migrations/<timestamp>_*.sql`.
- Deploy: Vercel collegato a GitHub (`main`). `api/send-assessment-result.js` è una serverless function Vercel.
- Env richieste (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (validate all'avvio in `src/main.js`).

## Stack e architettura

React 18 + Vite 5 + Tailwind 3 (`darkMode: 'class'`) + React Router 6 + Supabase (auth, Postgres con RLS, RPC `security definer`). Solo JSX, niente TypeScript. Icone lucide-react.

- **Entry reale**: `index.html` → `src/main.js` (monta `AuthProvider`, valida la config Supabase). **`src/main.jsx` è un duplicato obsoleto NON usato** — vedi "File morti".
- **Routing**: tutto in `src/App.jsx`. Tre aree: pubblica/marketing (Home, `/percorsi`, `/simulazione-39`, `/prenota`, trainer…), studente autenticato (`ProtectedRoute`: `/assignments`, `/exercises`, `/progressi`, `/collections`), admin (`AdminRoute` + `AdminShell` su `/admin/*`; Navbar/Footer pubblici sono nascosti in admin).
- **Ruoli**: tabella `profiles` (`role`, `status`) letta da `src/auth/AuthContext.jsx`; lato DB la funzione `public.is_admin()` protegge le RPC admin.
- **Contenuti marketing centralizzati**: `src/config/site.js` (link, offerte, CTA, recensioni) e `src/data/content.js` (nav, FAQ, corsi). Modificare lì, non nelle pagine.
- **Trainer SRS**: versione client-side con progressi in localStorage (`src/data/*Cards.js`, `src/data/trainerConfig.js`, `src/components/SrsTrainer.jsx`) + versione a database per studenti loggati (`DatabaseSrsTrainerPage`).
- **Supabase**: ~75 migrazioni in `supabase/migrations/` sono la fonte di verità dello schema e delle RPC. Il client sta in `src/lib/supabaseClient.js`; ogni dominio ha il suo modulo API in `src/lib/*Api.js`.
- I documenti `CODEX_CONTEXT.md` / `CODEX_PROJECT_CONTEXT.md` restano validi per posizionamento, tono, brand e funnel, ma sono **precedenti al backend**: la parte "non esiste database/auth" non è più vera.

### Pipeline Exercise Builder (il cuore dell'admin)

1. **Import** — `/admin/content/exercises` (`AdminExerciseBuilder.jsx`): incolla/carica JSON (template in `public/templates/`, schema in `src/lib/exerciseBuilderSchema.js` → `exerciseBuilderSchemaV2.js`), validazione client-side, salvataggio batch in `exercise_builder_import_batches/_items` (`src/lib/exerciseBuilderApi.js`).
2. **Revisione e promozione** — `/admin/content/exercises/review` (`AdminExerciseBuilderReview.jsx`): "Promuovi e genera ID" → RPC `promote_exercise_builder_import_batch` (migrazione `20260714170000`) crea entità versionate (`exercise_builder_questions/pools/exercises` + `*_versions`) con `public_id`, `status='draft'`, `review_status='in_review'`.
3. **Libreria** — `/admin/content/exercises/library` (`AdminExerciseBuilderLibrary.jsx`): approva/pubblica/archivia. Pubblicare un esercizio approva anche le versioni di domande/pool che usa.
4. **Composer** — `/admin/content/exercises/composer` (`AdminExerciseComposer.jsx` + `src/lib/exerciseComposerApi.js`): compone esercizi per sezioni (domande fisse + regole pool), settings esercizio (`display_mode`, `show_score`, `show_correct_answers`, `show_explanations`, `show_diagnostic_summary`, `allow_retry`) e `feedback_timing` per sezione. Ogni salvataggio crea una **nuova versione**.
5. **Question Bank / Pools / Diagnostica** — `/questions`, `/questions/edit` (editor V2), `/pools`, `/diagnostics` (`src/lib/exerciseBankApi.js`, `exerciseQuestionEditorApi.js`, `exerciseDiagnosticsApi.js`).
6. **Collections e assegnazioni** — `/admin/content/exercises/collections`, poi assegnazione a studenti/gruppi (`AdminCreateAssignment`, `learnerGroupsApi.js`).
7. **Player studente** — `/exercises` (`ExercisePlayer.jsx` è un re-export di `ExercisePlayerV2.jsx`; RPC in `src/lib/exercisePlayerApi.js`): autosave, sezioni, consegna. Le produzioni manuali (written_response, dialogue_roleplay, audio_response) finiscono in coda di correzione in `/admin/content/exercises/results`.

### Tema dark/light (stato attuale)

- `ThemeToggle.jsx` scrive `localStorage['sblocco_theme']`, toggla la classe `dark` su `<html>` e sincronizza le istanze via evento custom; `useDarkMode.js` osserva la classe con un MutationObserver.
- **Non esiste script di inizializzazione tema in `index.html`**: la classe `dark` viene applicata solo quando monta un `ThemeToggle` (dentro Navbar o AdminShell) → flash di tema chiaro al load.
- `src/index.css` definisce le classi brand con `@apply` (`.eyebrow`, `.section-title`, `.brand-panel`, `.brand-card`, `.flow-panel`, ecc.): molte **non hanno variante `dark:`** — è la causa principale del bug 1.

### Punteggio: come funziona oggi (per capirlo prima di toccarlo)

- Ogni domanda viene corretta da `exercise_builder_grade_answer` (SQL) → `earned_points`/`max_points` (peso da `grading.weight`, default 1) e stato `correct` / `nearly_correct` (credito parziale) / `incorrect` / `unanswered`.
- Alla consegna (`submit_exercise_builder_attempt`, `20260714190000_exercise_builder_player.sql:952-1026`): `score = round(earned/max × 100)`; **se `max = 0` lo score è 100** (edge case: esercizi solo-contenuto o solo-manuali).
- Con produzioni manuali (v2, `20260714271100`): lo score resta parziale/nullo finché l'insegnante non corregge; con `review_status='reviewed'` score e punti vengono **nascosti allo studente** finché la valutazione non è pubblicata (`approved`) (`20260715134000`).
- Completamento assignment: `exercise_config.completion_rule` = `passed` (default, soglia `required_score` default **70**) | `submitted` | `attempts`.
- Lato studente il risultato è la card in `ExercisePlayerV2.jsx:207-219` (percentuale + punti): nessuna spiegazione di pesi, soglia o domande in attesa → vedi bug 4.

## Bug aperti

### 1. Dark/light mode: contrasto incoerente tra testo e sfondo

**Sintomo**: in dark mode alcune sezioni restano con testo scuro su fondo scuro (o card chiare "accecanti"), l'esperienza cambia da pagina a pagina.

**Cause individuate**:
- Classi custom in `src/index.css` senza variante dark: `.eyebrow` (149), `.section-title` (153, `text-ink`), `.section-copy` (157), `.brand-section-soft` (169, `bg-[#edf8f2]`), `.brand-panel` (177, `bg-white`), `.brand-card` (185), `.flow-panel` (98), `.flow-node` (117), `.dynamic-rail` (198), `.brand-measure` (229), `.hero-title` (233), `.soft-divider` (237), `.focus-ring` (161, `ring-offset-paper` fisso), `::selection` (35). Le pagine che le usano (56 file, es. `Home.jsx`, `Percorsi.jsx`, `GrammarHub.jsx`) ereditano il problema.
- `:root` e `body` (`index.css:5-28`) hanno colore/sfondo chiari senza override `.dark` → overscroll e primo paint chiari anche in dark.
- Nessuno script anti-FOUC in `index.html`; il tema parte solo al mount di React (`ThemeToggle.jsx:19-23`).
- Palette dark frammentata: `#0f1715` (App), `#16211e` (admin card), `#211b18`/`#171310` (player), `#101a17` (input), `#101915` (textarea JSON) — scelte ad hoc per pagina.

**Direzione di fix**: (a) aggiungere le varianti `dark:` alle classi in `index.css` e l'override `.dark` per `:root/body/::selection`; (b) script inline in `index.html` che applica `dark` da localStorage/`prefers-color-scheme` prima del paint; (c) definire 3-4 token di superficie dark in `tailwind.config.js` (es. `surface`, `surface-raised`) e sostituire gli esadecimali sparsi; (d) audit con soglia WCAG AA (4.5:1). Partire dalle pagine pubbliche, poi admin, poi player.

### 2. Admin: esercizi importati e promossi non compaiono nel Composer

**Sintomo**: dopo import JSON → promozione ("Promuovi e genera ID" assegna il `public_id`), gli esercizi non si vedono nel pannello Composer. La visualizzazione della sezione è comunque poco chiara (vedi proposte UX).

**Fatti verificati nel codice**:
- La promozione imposta correttamente `current_version_id` e `generated_from_collection=false`, quindi il filtro del catalogo (`exerciseComposerApi.js:8-13`) in teoria li include.
- `loadBase()` (`AdminExerciseComposer.jsx:147-168`) fa `Promise.all` di catalogo+questions+pools: **se una qualsiasi delle tre query fallisce, il catalogo resta vuoto** e compare solo "Nessun esercizio" con banner d'errore → un errore su pools/questions maschera esercizi esistenti.
- Mismatch storico `name`/`title`: la promozione scrive `pool_versions.name` (`20260714170000`:283-285) ma la UI legge `title` (`exerciseBankApi.js:74`); la colonna `title` esiste solo dalla migrazione compat `20260714215000`. Se il progetto Supabase remoto **non ha tutte le migrazioni applicate**, la query pools fallisce → composer vuoto (candidato principale). I pool importati hanno comunque `title` NULL → nomi vuoti nei menu.
- Le sezioni promosse da import non hanno `question_version_id`/`pool_version_id` (insert in `20260714170000`:510-522 e 578-597): le migrazioni compat `20260714270100/270200/270400` esistono apposta; verificare che siano applicate, altrimenti apertura/salvataggio dal composer falliscono.
- Il composer carica il catalogo **solo al mount**: non c'è refresh; dopo una promozione bisogna rientrare nella pagina.

**Checklist diagnostica** (prima di scrivere codice):
1. DevTools → Network sulla pagina composer: quale delle query REST fallisce e con che errore.
2. In Supabase SQL editor: `select public_id, status, current_version_id, generated_from_collection, created_at from exercise_builder_exercises order by created_at desc limit 20;` — gli esercizi promossi ci sono?
3. Verificare l'elenco migrazioni applicate al progetto remoto contro `supabase/migrations/` (soprattutto `215000`, `270100-270400`, `20260716183000`).

**Direzione di fix**: caricare le tre sorgenti in modo indipendente (un errore sui pool non deve svuotare il catalogo); dopo la promozione mostrare un link "Apri nel composer" (`?exerciseId=...`); bottone "Aggiorna" nel composer; backfill `title` dei pool importati (`update ... set title = name where title is null`) o far leggere `coalesce(title, name)`.

### 3. Builder: la visualizzazione dei risultati corretti "dopo ogni domanda" o "a fine sezione" non funziona come atteso

**Sintomo**: nel composer non si riesce a ottenere che lo studente veda le correzioni dopo ogni domanda o alla fine della sezione.

**Fatti verificati**:
- Il composer espone `feedback_timing` per sezione (`AdminExerciseComposer.jsx:786-798`): `question_end` / `section_end` / `exercise_end` / `hidden`; scegliendo `question_end` forza `display_mode='one_at_a_time'` (`:289-303`).
- Player: con `question_end` la risposta viene controllata subito (`checkExerciseQuestion`) e la correzione appare (`ExercisePlayerV2.jsx:741-775`). Un bug di persistenza è stato fixato di recente (commit `2d2e85c` + migrazione `20260716183000_question_end_feedback_compatibility.sql`) — **se il DB remoto non ha quella migrazione il problema persiste**.
- **Con `section_end` le correzioni non vengono mai mostrate a fine sezione**: al completamento appare solo il box verde "Sezione completata" con il bottone avanti (`ExercisePlayerV2.jsx:695-711`). Le correzioni arrivano solo nel riepilogo finale. Quindi l'opzione oggi è indistinguibile da `exercise_end` → è il gap principale da colmare.
- Incoerenza: con `hidden` il riepilogo finale mostra comunque le correzioni se `show_correct_answers` è attivo (il `FinalResult` usa solo i settings esercizio, mai il `feedback_timing` di sezione).

**Direzione di fix**: implementare nel player una schermata di riepilogo sezione (domande + esito + correzioni, riusando `ExerciseQuestionRenderer` in modalità disabled come nel `FinalResult`) quando `feedback_timing='section_end'`; rispettare `hidden` anche nel riepilogo finale; nel composer spiegare le 4 opzioni con testo di aiuto.

### 4. Punteggio calcolato/comunicato in modo poco chiaro

**Sintomo**: lo studente (e l'admin) non capiscono come nasce il numero finale.

**Cause**: la formula (pesi, credito parziale `nearly_correct`, `max=0 → 100%`, domande manuali escluse finché non corrette, score nascosto durante la review, soglia 70 per il completamento) vive tutta nelle RPC SQL e la UI mostra solo "NN%" (`ExercisePlayerV2.jsx:207-219`).

**Direzione di fix** (UI prima, poi eventuale SQL):
- Nel `FinalResult` mostrare il breakdown già disponibile in `result_summary`: corrette / quasi corrette / errate / senza risposta / in attesa di valutazione, e punti per sezione (`attempt_sections.earned_points/max_points`).
- Esplicitare "X attività verranno valutate dall'insegnante: il punteggio è provvisorio" quando `pending_review > 0`.
- Mostrare la soglia di superamento quando `completion_rule='passed'` ("Obiettivo: 70%").
- Correggere l'edge case `max=0`: non mostrare "100%" ma "In attesa di valutazione" / "Completato".
- Nel composer, tooltip su "Punteggio" che spiega pesi (`grading.weight`) e credito parziale.

## Analisi sommaria e proposte

Il sito è due prodotti in uno: vetrina marketing curata (funnel simulazione → corsi) e una piattaforma didattica ambiziosa (trainer SRS, exercise builder versionato, assegnazioni, analytics) cresciuta molto in fretta via PR di agenti. La logica di dominio è solida (versioning, RLS, RPC transazionali); i punti deboli sono coerenza visiva, feedback all'utente admin e allineamento migrazioni remote/locali.

**Estetiche**
- Unificare la palette dark in token Tailwind (vedi bug 1d) e normalizzare i raggi (oggi convivono `rounded-lg/xl/2xl/3xl` senza criterio) e le ombre.
- Gerarchia tipografica: quasi tutto è `font-black`; ridurre i pesi per far respirare titoli e badge.
- Stati vuoti con CTA (es. composer vuoto → "Importa JSON" / "Vai alla revisione") invece di "Nessun esercizio."
- Verificare l'admin su viewport medi: i layout a griglia fissa `max-w-[1500px]/[1600px]` con sidebar stringono male tra 1024 e 1440px (il CSS che doveva sistemarlo non viene caricato, vedi "File morti").

**Funzionali**
- Pipeline builder più guidata: breadcrumb Import → Revisione → Libreria → Composer sulle 4 pagine, e dopo la promozione link diretti alle entità create (oggi solo chip con i `public_id`).
- Ricerca/filtro nel catalogo del composer e nomi leggibili per i pool importati.
- Anteprima esercizio lato admin ("vedi come lo studente") prima della pubblicazione.
- Riepilogo sezione nel player (bug 3) e breakdown punteggio (bug 4).
- Processo migrazioni: aggiungere uno script/nota per confrontare le migrazioni applicate al progetto Supabase remoto con la cartella locale — due dei quattro bug possono dipendere da migrazioni non applicate.
- Notifiche studente già presenti (`LearnerNotificationsPanel`): usarle anche per "valutazione pubblicata".

## File morti / gotcha

- `src/main.jsx`: entry duplicato e obsoleto (senza `AuthProvider`), l'app usa `src/main.js`. Non modificarlo pensando di toccare l'avvio; da eliminare.
- `src/styles/question-editor-layout.css`: importato **solo** dal morto `main.jsx` → non viene mai caricato; il layout dell'editor domande su schermi 1280-1800px ne risente. Importarlo in `main.js` (o eliminare se si ridisegna l'editor).
- `src/trainer-overrides.css`: non importato da nessuno; selettori strutturali fragili. Da eliminare o reintegrare consapevolmente.
- `src/pages/AdminExerciseResultsV2.jsx`: non instradato (la route usa `AdminExerciseResults.jsx`). Decidere se completare la migrazione a V2 o rimuoverlo.
- `ExercisePlayer.jsx` e `AdminExerciseQuestionEditor.jsx` sono re-export dei rispettivi V2: modificare sempre i file V2.
- La cartella `public/assets/public/assets/` è una duplicazione accidentale di asset video.

## Regole operative

- Copy rivolto agli utenti in italiano, tono pratico e professionale (vedi `CODEX_PROJECT_CONTEXT.md` §8-15: brand color, niente garanzie di risultato, niente recensioni inventate, "Founder e recensioni" non si rinomina).
- Preferire diff piccoli e mirati; riusare componenti condivisi (`VisualSystem.jsx`, renderer esercizi) invece di duplicare.
- Prima di ogni merge: `npm run build`; se tocchi dati trainer anche `npm run validate:srs`.
- Schema DB: solo nuove migrazioni con timestamp successivo all'ultima; la CI le applica in ordine e deve restare verde.
- Le RPC admin richiedono `is_admin()`: testare le pagine admin con un account con `profiles.role` adeguato.

## Documentazione di riferimento

- `docs/exercise-builder-import-templates.md` e `public/templates/README.md` — formato JSON di import.
- `docs/exercise-builder-player-mvp.md` — comportamento atteso del player.
- `docs/sblocco-product-strategy.md` — strategia prodotto (fonte durevole).
- `docs/learner-groups.md`, `docs/auth/authentication-foundation.md`, `docs/trainer/*` — gruppi, auth, contratto card trainer.
- `CONTENT_EDITING.md` — modifica contenuti marketing.

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

## Bug aperti e stato dei fix (aggiornato 2026-07-17)

### 1. Dark/light mode: contrasto incoerente — ✅ RISOLTO (lato framework)

**Fix applicati** (commit `3d088ba`):
- Script anti-FOUC inline in `index.html`: applica la classe `dark` da `localStorage['sblocco_theme']` / `prefers-color-scheme` prima del primo paint.
- `src/index.css`: override `.dark` per `:root`, `body`, `::selection` + varianti `dark:` per tutte le classi brand (`.eyebrow`, `.section-title/copy`, `.brand-panel/card/section*`, `.flow-panel/node`, `.dynamic-rail`, `.energy-strip`, `.focus-ring`, `.soft-divider`, `.hero-title`, `.brand-measure`).
- `VisualSystem.jsx`: toni `Section` (plain/mint/linen), `FeatureList`, `PageHero`, `MediaStage` coerenti in dark.

Verificato con screenshot del dev server in dark. **Residuo**: possibile audit visivo pagina-per-pagina per singole classi `text-ink`/`bg-white` hardcoded fuori dai primitivi; la palette dark resta da unificare in token Tailwind (vedi proposte).

### 2. Admin: esercizi importati e promossi non compaiono nel Composer — ✅ MITIGATO lato frontend, ⚠️ verificare migrazioni remote

**Fix applicati** (commit `cd0dd70`):
- `loadBase()` ora usa `Promise.allSettled`: un errore su domande o pool **non nasconde più il catalogo** e il banner dice quale sorgente è fallita (prima un errore qualsiasi svuotava tutto con "Nessun esercizio").
- Bottone "Aggiorna" nel pannello Esercizi + empty state con link a Import e Coda di revisione.
- Fallback `title || name` per i pool importati (menu e regole).
- Dopo "Promuovi e genera ID", gli esercizi hanno il link diretto "apri nel Composer" (`?exerciseId=...`) e il rimando alla Libreria.

**Se il problema si ripresenta**, ora il banner d'errore indica la query esatta. Checklist rimanente (richiede accesso a Supabase):
1. Verificare che TUTTE le migrazioni locali siano applicate al progetto remoto (soprattutto `20260714215000`, `20260714270100-270400`, `20260716130000`, `20260716183000`). È il sospetto principale.
2. SQL: `select public_id, status, current_version_id, generated_from_collection from exercise_builder_exercises order by created_at desc limit 20;`

### 3. Correzioni "dopo ogni domanda" / "a fine sezione" — ✅ RISOLTO

**Fix applicati** (commit `8a99bec`):
- Player: con `feedback_timing='section_end'`, al completamento della sezione ora appare il **riepilogo con risposte, esiti e correzioni** (il payload SQL li espone già dalla migrazione `20260716130000`, riga 83; se il DB remoto non la ha, il player degrada al vecchio box senza rompersi).
- `hidden` ora è rispettato anche nel riepilogo finale: le sezioni nascoste non mostrano punteggio/soluzioni/spiegazioni, con nota per lo studente.
- Composer: le 4 opzioni di feedback sono spiegate sotto il campo.
- `question_end` era già stato riparato dal commit `2d2e85c` + migrazione `20260716183000` — funziona solo se la migrazione è applicata al DB remoto.

### 4. Punteggio poco chiaro — ✅ RISOLTO (lato UI)

**Fix applicati** (commit `fde86d9`):
- Riepilogo finale: chip di breakdown (corrette / quasi corrette / da rivedere / senza risposta / in attesa di valutazione), punti per sezione e frase che spiega la formula (percentuale di punti, pesi, credito parziale).
- Edge case `max_points=0`: niente più "100%" fittizio — mostra "non prevede punteggio automatico".
- Box "valutazione in arrivo": indica quante attività attendono la correzione dell'insegnante.
- Composer: testo di aiuto sui toggle Punteggio/Soluzioni/Spiegazioni/Diagnosi/Nuovi tentativi.

**Riferimento formula (SQL)**: `score = round(earned/max × 100)`; pesi da `grading.weight`; `nearly_correct` = credito parziale; con produzioni manuali lo score resta provvisorio finché la review non è pubblicata (`approved`); soglia di completamento `required_score` default 70 in `assignment_resources.exercise_config`. Possibile evoluzione: mostrare la soglia allo studente (il payload oggi non la espone — servirebbe aggiungerla in `exercise_builder_attempt_payload`).

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
- `src/styles/question-editor-layout.css`: ora importato da `src/main.js` (fix 2026-07-17) — il layout dell'editor domande su schermi 1280-1800px torna attivo.
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

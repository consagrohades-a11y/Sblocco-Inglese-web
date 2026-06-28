# Codex Context — Sblocco Inglese Web

Keep this file compact. Use it before inspecting many project files.

## Stack
- Vite + React 18.
- React Router routes are defined in `src/App.jsx`.
- Tailwind CSS utility classes are used throughout.
- Main content/config lives in `src/data/*`, `src/content/*`, and `src/config/site.js`.

## Main routes
- `/` home.
- `/simulazione-39` audit/simulation offer.
- `/percorsi` offers.
- `/trainers` trainer landing.
- `/trainers/business-expression`, `/trainers/general-expression`, `/trainers/hospitality-expression`, `/trainers/word-trainer` trainer pages.
- `/grammar` grammar hub.
- `/grammar/a1` A1 grammar topic index and A1 learning-path entry.
- `/grammar/a1/:topicId` selected A1 grammar topic/tests.
- `/levels/a1/be-basic-sentences` first A1 grammar-output unit.
- `/levels/a1/present-simple-normal-verbs` second A1 grammar-output unit.
- `/engine-demo` shared engine demo route.
- `/diagnostic` diagnostic page route.

## Product direction
- `docs/sblocco-product-strategy.md` is the durable source of truth for product strategy and learning architecture.
- Current direction remains: platform + courses + premium human support.
- Do not reduce the site to isolated pages. New work should move toward data-driven levels, tracks, diagnostics, recommendations, and reusable renderers.
- Current build priority is still: engine foundation → A1 vertical slice → first diagnostic → Hospitality vertical slice.

## Recent implementation milestones
- PR #16 merged the shared learning engine skeleton.
- PR #17 merged the first A1 grammar-output units.
- PR #18 surfaced those A1 units in the grammar experience and was merged after the generated-file path issue was fixed.
- The current state does not mean the engine-first phase is finished. It means the engine skeleton exists and the A1 vertical slice is underway.
- Next milestone should avoid adding random new pages. Prefer strengthening the reusable exercise/diagnostic/recommendation architecture and completing the A1 vertical slice.

## Grammar architecture
Goal: scalable structure, not one long test page.

Correct hierarchy:
`Grammar → level → topic → tests/exercises`

Current A1 files:
- `src/pages/GrammarHub.jsx`: grammar/level hub.
- `src/pages/GrammarA1Hub.jsx`: clean A1 topic index for `/grammar/a1`; also surfaces A1 grammar-output unit cards.
- `src/pages/GrammarA1Test.jsx`: routed selected topic page for `/grammar/a1/:topicId`.
- `src/pages/A1UnitPage.jsx`: renders A1 grammar-output units from structured content.
- `src/data/grammarA1Test.js`: legacy/current A1 grammar checkpoint data.
- `src/content/levels/a1/unitBeBasicSentences.js`: first A1 grammar-output unit.
- `src/content/levels/a1/unitPresentSimpleNormalVerbs.js`: second A1 grammar-output unit.

Important routing note:
- `src/App.jsx` must route `/grammar/a1/:topicId` to `GrammarA1Test.jsx`.
- Do not recreate or import a separate `GrammarA1Topic.jsx`; a stale version of that file previously caused live pages to ignore the corrected exercise engine.
- A1 grammar-output unit routes currently use `A1UnitPage.jsx` with a `unitId` prop.

## Shared learning architecture
Current shared pieces include:
- `src/components/exercises/ExerciseRenderer.jsx` for reusable exercise rendering.
- `src/components/diagnostics/DiagnosticResult.jsx` for diagnostic output.
- `src/engines/diagnosticEngine.js` for building diagnostic profiles from attempts.
- `src/engines/recommendationEngine.js` for mapping profile evidence to recommendations.

Do not duplicate these for each level or unit. Extend schemas and registries instead.

## Grammar data model
A grammar level should expose topics. A topic contains exercises. An exercise contains items.

Current exports in `src/data/grammarA1Test.js`:
- `grammarA1Checkpoints`: A1 topics/checkpoints.
- `grammarLevels`: level registry; currently includes `a1`.
- `grammarDiagnosticTags`: diagnostic tag metadata used to calculate confusion/error percentages.
- legacy exports for compatibility: `grammarA1Questions`, `grammarTopicRules`, `grammarTopicRecommendations`.

Item structure supports:
- `type`: `choice` or `blank`.
- `tags`: diagnostic categories, e.g. `present-aux-question`, `be-past`, `article-zero`.
- `baseForm`: optional base form shown in brackets for mixed-form exercises, e.g. `(work)`, `(clean)`.
- `feedback`: correction explanation in Italian.

To add exercises to a topic:
1. Open `src/data/grammarA1Test.js`.
2. Find the relevant topic in `grammarA1Checkpoints`.
3. Add a new object to that topic’s `exercises` array.
4. Add items with diagnostic `tags` and optional `baseForm`.

To add or extend grammar-output units:
1. Add structured content under `src/content/levels/<level>/`.
2. Register/render it through the shared unit page or a generic future level renderer.
3. Use `ExerciseRenderer`, `diagnosticEngine`, and `recommendationEngine` rather than hardcoding custom unit logic.

To add a new level later:
1. Create a level data file or extend the grammar data registry.
2. Add the level to `grammarLevels` or the future level registry.
3. Add a route/hub page following the existing A1 pattern, preferably as a thin wrapper around shared renderers.

## Grammar UX rules
- Do not turn a level page into a huge all-in-one test.
- `/grammar/a1` should keep two clearly separated areas: guided A1 units first, checkpoint cards second.
- Unit paths and checkpoint paths must not be visually mixed without section titles.
- Topic pages can show the tests for that topic.
- Unit pages should move from rule explanation to active output to diagnostic feedback.
- Each exercise/test should be independently submittable.
- Dialogues must remain one exercise, not split into separate cards.
- Corrections must be written in correct Italian.
- Feedback must be diagnostic: show useful error signals and next steps, not only score.
- Diagnostic UI should stay compact. Avoid oversized cards, repeated generic messages, or long blocks that make the page feel endless.
- Per-exercise diagnostic evidence should use a compact evidence map plus top-signal table, not a long raw list of dimensions and tags.
- Fallback recommendations are allowed internally, but the UI should show at most one fallback card and must not render non-clickable actions as CTA pills.
- Mixed-form exercises should show the base form in brackets when useful.
- Dark mode must be scoped to grammar exercises only; it must not affect the whole webapp.

## Current grammar behavior
- `/grammar` shows the grammar hub and now highlights the A1 Learning Path.
- `/grammar/a1` renders guided A1 unit cards before checkpoint cards.
- `/grammar/a1/:topicId` renders the selected topic.
- `/levels/a1/be-basic-sentences` renders the first A1 grammar-output unit.
- `/levels/a1/present-simple-normal-verbs` renders the second A1 grammar-output unit.
- Each exercise has its own submit/reset flow.
- Topic-level feedback aggregates only submitted exercises.
- Diagnostic feedback comes from item `tags` or structured attempt evidence.
- Base-form hints come from `baseForm` where available.

## AI/Codex safety rules
- Never paste local workspace paths into source files.
- Generated JSX files must start with valid code/imports, not workspace references.
- After every generated-file task, inspect modified files before committing.
- Always run `npm run build` before merge.

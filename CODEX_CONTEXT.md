# Codex Context — Sblocco Inglese Web

Keep this file compact. Use it before inspecting many project files.

## Stack
- Vite + React 18.
- React Router routes are defined in `src/App.jsx`.
- Tailwind CSS utility classes are used throughout.
- Main content/config lives in `src/data/*` and `src/config/site.js`.

## Main routes
- `/` home.
- `/simulazione-39` audit/simulation offer.
- `/percorsi` offers.
- `/trainers` trainer landing.
- `/trainers/business-expression`, `/trainers/general-expression`, `/trainers/hospitality-expression`, `/trainers/word-trainer` trainer pages.
- `/grammar` grammar hub.
- `/grammar/a1` A1 grammar topic index.
- `/grammar/a1/:topicId` selected A1 grammar topic/tests.

## Grammar architecture
Goal: scalable structure, not one long test page.

Correct hierarchy:
`Grammar → level → topic → tests/exercises`

Current A1 files:
- `src/pages/GrammarHub.jsx`: level hub.
- `src/pages/GrammarA1Hub.jsx`: clean A1 topic index.
- `src/pages/GrammarA1Test.jsx`: selected topic page for `/grammar/a1/:topicId`.
- `src/data/grammarA1Test.js`: A1 grammar data.

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

To add a new level later:
1. Create a level data file or extend the grammar data registry.
2. Add the level to `grammarLevels`.
3. Add a route/hub page following the existing A1 pattern.

## Grammar UX rules
- Do not turn a level page into a huge all-in-one test.
- `/grammar/a1` should stay clean: topic cards only.
- Topic pages can show the tests for that topic.
- Dialogues must remain one exercise, not split into separate cards.
- Corrections must be written in correct Italian.
- Feedback must be diagnostic: show error categories and percentages, not only score.
- Mixed-form exercises should show the base form in brackets when useful.
- Dark mode must be scoped to grammar exercises only; it must not affect the whole webapp.

## Current open grammar PR intent
The open grammar PR should keep the scalable routing and update the exercise engine so that:
- dark mode is local to grammar topic pages;
- diagnostics come from item `tags`;
- feedback appears directly under exercises/items;
- base-form hints appear from `baseForm`;
- the data model remains easy to extend.

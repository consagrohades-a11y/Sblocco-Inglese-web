# Grammar in Action — initial implementation and catalogue

Status: feature branch only; not merged or deployed. This is a Learning Studio extension, not a separate engine.

## Why this exists

Students should construct accurate, varied English sentences using the grammar behind them, then retrieve the structures during genuine conversation. Activity mechanics follow grammatical skills rather than repetitive theme-based games.

## Production contract

- Use `grammar_construction` from the canonical Studio Block Registry.
- `tiles`: order movable single- or multiword chunks. Existing word_order runtime handles stable shuffling and automatic grading.
- `typed`: type a constrained complete sentence. Existing translation runtime handles automatic grading against authored accepted answers.
- `oral`: build and speak an original sentence. This is deliberately ungraded; teachers correct and follow up live.
- The real learner renderer is reused inside Studio preview, with a local **Try as learner** toggle.
- Studio import remains a repairable draft. Publish preflight checks required grammar input and runtime compatibility.
- Teacher-only notes stay in drafts and never enter compiled learner questions.
- Scores and model feedback follow existing activity feedback timing. Oral tasks are not represented as automatically graded.
- Audio retention and other unrelated backend systems are unchanged.

## Launch surfaces

1. Empty Studio: select one of the five Grammar in Action recipes.
2. Add Block: choose Grammar in Action · Sentence Construction for manual authoring.
3. JSON Import: use `public/templates/sblocco-grammar-in-action-v1.json`, which is both a completed example and a self-contained AI authoring kit.
4. Preview: edit on the right, see the real learner rendering in the centre, and try tiles/typing without saving test answers.

## Five authored initial samples

| Level | First sample | Learner operations |
| --- | --- | --- |
| A1 | Present simple: statements, negatives, questions | Build, negate, question, ask independently |
| A2 | Past simple vs past continuous | Contrast meaning, connect events, reformulate, narrate |
| B1 | Present perfect vs past simple | Identify time frame, transform, interview |
| B2 | Third and mixed conditionals | Build counterfactual clauses, vary time, invert, reflect |
| C1 | Emphasis and hedging | Invert, cleft, qualify, control implication |

The five samples demonstrate the block system; they are not represented as comprehensive 50-minute lessons.

## Approved catalogue (60 planned modules)

- **A1 (1–12):** Sentence structure; be; have/have got; present simple; present simple questions; present continuous; present simple vs continuous; articles and nouns; possessives and pronouns; there is/are and location; can/imperatives/requests; connecting simple sentences.
- **A2 (13–24):** Past simple; past simple vs continuous; narrative sequencing; used to; present perfect foundations; future forms; comparatives and superlatives; countability and quantifiers; modals; first conditional; verb patterns; basic relative clauses.
- **B1 (25–36):** Present perfect vs past simple; perfect simple vs continuous; narrative tenses; future meaning; second conditional; modal deduction; passive voice; reported speech; relative clauses; gerunds and infinitives; complex comparisons; sentence connections.
- **B2 (37–48):** Third conditional; mixed conditionals; wish/if only/would rather; advanced modality; advanced passive/causative; reporting verbs; participle clauses; advanced relative clauses; concession and qualification; complex tense/aspect; conditional alternatives; information organisation.
- **C1 (49–60):** Inversion; cleft sentences; advanced hedging; advanced modality; nominalisation; ellipsis and substitution; reduced and embedded clauses; complex noun phrases; information structure; scope and ambiguity; grammatical register; sentence synthesis.

The remaining 55 modules are a content roadmap, **not** built lessons. No unsupported mechanics should appear in authoring until editor, renderer, normalisation, validation and grading/review behaviour are covered.

## Explicit limitations of v1

- Automatic typed grading is appropriate only for narrowly constrained responses with authored acceptable variants. Open-ended writing and oral speaking cannot be fairly reduced to one exact answer.
- A teacher-run oral task has no automatic speech recognition, recording or analytics in this block.
- One oral task is teacher-assessed during a live lesson. Recording is a separate existing `speaking_response` block when a submitted audio answer and manual review are required.
- The Speaking Library's separate presenter/controller has not been migrated or replaced. The first slice lives in the canonical Learning Studio and learner exercise player.
- Existing lesson recipes and all non-grammar runtime types remain intact.

## Verification

Run `npm run validate:grammar-in-action`, `npm run validate:studio`, and `npm run build`; then test create, JSON import, edit, learner try mode, publish preflight, assign, submit, auto grade, teacher correction and review against a staging environment before merging.

Keep production on main unchanged until results are reviewed.

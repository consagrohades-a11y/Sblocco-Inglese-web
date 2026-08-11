# Sblocco Editorial Learner Coverage

This document is the acceptance matrix for the Sblocco Editorial Learning System.

The learner product must feel like one Sblocco Inglese experience in both light and dark modes. Individual tools may remain more functional than marketing/theory pages, but they must use the same typography hierarchy, navy/orange identity, paper/deep-navy surfaces, spacing logic, borders, controls, feedback framing and navigation language.

## Theme contract

| Token | Light | Dark |
| --- | --- | --- |
| Canvas | warm paper `#f9f0e8` | deep navy `#07263a` |
| Raised surface | `#fffaf5` | `#0d334b` |
| Primary text | navy `#0e3045` | warm paper `#f8f1e9` |
| Accent | orange `#d34c1a` | bright orange `#ef5b28` |
| Dark-mode rule | n/a | never use pure black as the primary learner canvas |

Theme state is controlled by the existing global `ThemeToggle` / `sblocco_theme` mechanism. The editorial learner layer reads the same root `.dark` class; there is no second theme state.

## Learner surface matrix

| Surface | Route(s) | Editorial boundary | Light | Dark | Treatment |
| --- | --- | --- | --- | --- | --- |
| Dashboard | `/dashboard` | `dashboard` | required | required | full editorial dashboard |
| Recupero Debito | `/recupero-debito*`, `/test-recupero-inglese` | `recovery` | required | required | full editorial programme + semantic theory |
| Activity directory | `/assignments`, `/attivita/*` | `assignments` | required | required | editorial cards and hierarchy |
| Activity detail | `/assignments/:id` | `assignment-detail` | required | required | editorial opening + learning plan |
| Exercise Builder player | `/exercises` | `exercise` | required | required | editorial frame, functional question controls |
| Targeted practice | `/practice` | `practice` | required | required | editorial trainer canvas, functional quiz controls |
| Exercise collections | `/collections` | `collection` | required | required | editorial path/progress framing |
| Progress/results | `/progressi` | `progress` | required | required | editorial data presentation; legacy forced-dark styling corrected in light mode |
| Trainers/SRS | `/trainers`, `/trainers/*` | `trainer` | required | required | editorial shell, fast SRS interaction preserved |
| Grammar/Foundation lessons | `/grammar`, `/grammar/*` | `grammar` | required | required | strongest editorial lesson treatment |
| Account | `/account` | `account` | required | required | restrained shared learner surfaces |

## Semantic theory contract

Exercise Builder `content_block` records are learner-facing teaching material, not generic question cards. They render through `EditorialTeachingBlock` and can progressively use semantic presentations:

- `lesson_hero`
- `explanation`
- `rule`
- `examples`
- `contrast`
- `common_error`
- `recap`
- `note`

Older `content_block` records remain valid; missing `presentation` defaults to `explanation`.

## Intensity by surface

The design system is shared, but the amount of editorial styling depends on the job of the page.

- **Theory, Foundation units, Recupero explanation pages:** strongest editorial treatment; large serif hierarchy, reading rhythm, examples and semantic callouts.
- **Dashboard, assignment detail, progress/results:** strong editorial framing plus information hierarchy.
- **Exercise player, targeted practice, SRS:** functional interaction first; editorial canvas, typography, progress, buttons, feedback and transitions without turning every question into a landing-page section.
- **Account:** quieter version of the same surface system.
- **Admin:** excluded from the learner route boundary. Admin remains utility-first and keeps its existing light/dark support.

## Regression protection

`scripts/validate-editorial-learning-coverage.mjs` runs during `npm run build` and fails when:

- a required learner route surface disappears from the boundary;
- the product-wide learner stylesheet is not loaded;
- light or dark design tokens disappear;
- progress loses its explicit light-mode correction;
- the exercise player loses route-specific styling;
- TrainerLayout stops using the shared learner canvas;
- Exercise Builder theory stops using `EditorialTeachingBlock`;
- the primary learner canvas is changed to pure black.

## Visual QA gate

Code coverage is not the same as visual approval. Before PR #153 leaves draft, visually verify at minimum:

1. desktop light;
2. desktop dark;
3. mobile light;
4. mobile dark;

for these high-risk representative surfaces:

- `/dashboard`
- `/assignments`
- one `/assignments/:id`
- `/exercises` with a translation/text question
- `/exercises` with dialogue roleplay or audio response
- `/progressi`
- one `/trainers/*`
- `/practice`
- one `/grammar/a1/*` lesson
- one `/recupero-debito/*` learner page

The PR remains draft until this visual gate is completed. Build/CI success validates architecture and CSS coverage, but should not be reported as pixel-level visual QA.

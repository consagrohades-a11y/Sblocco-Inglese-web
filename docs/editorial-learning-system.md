# Sblocco Editorial Learning System

This is the default learner-facing presentation system for Sblocco Inglese.

It is **not** a second design system and it is not specific to Recupero Debito. It translates the visual language already established by the Sblocco marketing/landing pages into learning products.

## Product rule

A learner should move from a Sblocco landing page into a dashboard, theory lesson, course, exercise, trainer or results page without feeling that they have entered another product.

That does **not** mean every surface must use a landing-page layout. Functional tools such as exercise players and SRS trainers should remain efficient. They should inherit the same visual grammar: typography, colour hierarchy, surfaces, spacing, feedback treatment and transitions.

## Brand constants

- Navy is the principal structural colour.
- Orange is the principal accent and action colour.
- Light mode uses warm paper surfaces rather than sterile white SaaS panels.
- Dark mode uses layered deep navy surfaces rather than flat black or simple colour inversion.
- Display headings use the established editorial serif stack.
- Body/UI copy stays highly legible and restrained.
- Illustration uses the existing Sblocco editorial family; do not generate unrelated art per widget.
- Gradients are subtle background depth, not decorative treatment on every component.
- Negative space is part of the design.

Shared tokens and learner-facing primitives live in:

- `src/styles/editorialLearning.css`
- `src/components/learning/EditorialLearning.jsx`

## Surface hierarchy

Use the editorial language with different intensity depending on the task.

| Surface | Editorial intensity | Rule |
| --- | --- | --- |
| Marketing / landing | Maximum | Persuasive, spacious, visual |
| Dashboard | Very high | Clear hierarchy around the next action |
| Theory / lesson | Very high | Reads like an editorial guide, not an LMS article |
| Course unit | High | Strong opening/closing, functional middle |
| Results / progress | High | Evidence is clear but calm |
| Exercise intro / completion | High | Frame the functional player |
| Exercise player | Moderate | Accuracy and speed first |
| SRS trainer | Moderate | Fast, focused, same visual grammar |
| Account/settings | Light | Utility first |
| Admin | Not required | Operational UI can remain utilitarian |

## Theory content is semantic

Do not treat theory as one generic rich-text blob. `content_block` remains the reusable Exercise Builder storage type, but its learner presentation may declare a semantic `presentation` inside `content`.

Supported presentation values:

- `lesson_hero`
- `explanation`
- `rule`
- `examples`
- `contrast`
- `common_error`
- `recap`
- `note`

All existing legacy `content_block` records remain valid. If `presentation` is absent, the renderer uses `explanation`.

### Minimal legacy-compatible block

```json
{
  "body": "Usiamo il Past Simple per azioni concluse nel passato."
}
```

### Rule

```json
{
  "presentation": "rule",
  "eyebrow": "La regola",
  "body": "Con did e didn't il verbo torna alla forma base."
}
```

### Examples

```json
{
  "presentation": "examples",
  "body": "Osserva la struttura nelle frasi.",
  "examples": [
    "I worked yesterday.",
    "She went home at six.",
    "Did you see Marco?"
  ]
}
```

### Common error

```json
{
  "presentation": "common_error",
  "body": "Dopo did non usare il verbo al passato.",
  "wrong": "Did you went?",
  "correct": "Did you go?"
}
```

### Contrast

```json
{
  "presentation": "contrast",
  "body": "Le due forme non descrivono lo stesso rapporto con il presente.",
  "left_label": "Past Simple",
  "left_body": "Azione conclusa in un momento passato definito.",
  "right_label": "Present Perfect",
  "right_body": "Passato collegato al presente o esperienza senza tempo concluso specificato."
}
```

### Recap

```json
{
  "presentation": "recap",
  "body": "Prima di continuare, controlla questi punti.",
  "items": [
    "Affermativa: verbo al passato.",
    "Negativa: didn't + forma base.",
    "Domanda: Did + soggetto + forma base."
  ]
}
```

### Lesson opener

```json
{
  "presentation": "lesson_hero",
  "eyebrow": "Recupera",
  "body": "Quando si usa, come si forma e dove si fanno gli errori più frequenti.",
  "meta": ["3–4 min", "Grammatica"]
}
```

The question `prompt` becomes the displayed heading for these blocks unless `content.heading` is explicitly provided.

## Standard learning rhythm

A theory-led unit should normally feel like:

1. editorial lesson opener;
2. concise explanation;
3. rule/form;
4. examples;
5. common error or contrast when useful;
6. recap;
7. clear continuation into active practice.

Avoid textbook-sized theory. Theory should explain what the learner needs in order to perform the next task.

## Exercise rhythm

Do not decorate every question. Instead use editorial framing around a clean functional core:

- editorial intro: what the learner is about to practise and why;
- focused exercise player;
- editorial result/completion: what is solid, what needs review, and the next recommended action.

## Dark mode

Dark mode must be designed intentionally. Use layered navy backgrounds and subtle borders. Do not simply invert the light page, and do not turn every surface into the same navy rectangle.

## Mobile

Mobile hierarchy is content-first:

1. topic / purpose;
2. core explanation or next action;
3. CTA;
4. supporting details.

Do not shrink a desktop two-column composition until it becomes cramped.

## Migration policy

Do not rewrite the entire application at once.

1. New learner-facing features use this system by default.
2. Theory `content_block` rendering is shared across products.
3. Recupero Debito is the first complete learner-flow consumer.
4. Foundations/course theory migrates next.
5. Exercise introductions/results follow.
6. Trainers and progress adopt the shared shell without losing task efficiency.
7. Admin stays utility-first.

Existing content, progress, auth, assignments, SRS and exercise architecture must not be forked just to achieve visual consistency.

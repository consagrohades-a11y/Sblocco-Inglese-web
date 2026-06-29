# English Foundations — Label Taxonomy and Migration Rules

_Last updated: 2026-06-29_

This file is a companion to `docs/english-foundations-architecture.md`.

Use it when building question pools, feedback labels, unit blueprints, and controlled attempts.

The educational taxonomy must be decided by the teacher/founder and kept stable. Codex should handle implementation and compatibility work, but it should not invent new teaching labels or learner-facing feedback unless explicitly asked.

---

## 1. Parallel Work Model

| Workstream | Owner | Goal |
|---|---|---|
| Code integration | Codex | Make pool-backed exercises work in the app |
| Educational logic | Teacher/founder + ChatGPT | Decide labels, pools, feedback wording, exercise coverage |
| Copy review | Teacher/founder | Make learner-facing text natural and approved |
| Architecture control | Docs + ChatGPT | Keep Codex from inventing parallel systems |

Codex should do code work. The teacher/founder and ChatGPT should decide what the course teaches, how the pools are structured, and what feedback the learner sees.

---

## 2. Migration Rule

Backward compatibility is useful, but it is not more important than the new architecture.

Preferred approach:

```text
Keep existing systems working when this is simple and does not distort the new architecture.
```

Allowed approach:

```text
If keeping old and new systems working together becomes complicated, fragile, or token-expensive, remove or replace the old system instead of building excessive compatibility layers.
```

Do not preserve old structures just because they exist.

Do not create complex adapters only to keep outdated systems alive.

The priority is:

```text
clean new architecture > minimal compatibility > preserving old implementation details
```

Before removing an old system, make sure the replacement covers the same necessary learner-facing function.

---

## 3. Label Separation Principle

Do not use one label for every job.

Separate labels by purpose:

| Label type | Purpose | Example |
|---|---|---|
| `unitId` | Identifies the unit | `a1-present-simple-normal-verbs` |
| `grammarArea` | Broad grammar area | `present-simple` |
| `form` | Specific structure being practised | `does-question` |
| `languageFunction` | Real communication goal | `ask-about-work` |
| `productionMode` | Cognitive/output mode | `controlled-production` |
| `feedbackKeys` | Mistake-specific advice to show | `normal-verb-question-needs-do` |

The generator should mainly use `form`, `languageFunction`, and `productionMode` for selection.

The feedback system should mainly use `feedbackKeys` for learner advice.

Do not mix these jobs.

---

## 4. Unit 2 Initial Taxonomy

Use this initial taxonomy for **A1 Unit 2 — Present Simple, Normal Verbs and Do/Does**.

| Category | Label |
|---|---|
| Unit | `a1-present-simple-normal-verbs` |
| Grammar area | `present-simple` |
| Forms | `base-affirmative`, `third-person-affirmative`, `do-question`, `does-question`, `wh-do-question`, `wh-does-question`, `negative-dont`, `negative-doesnt`, `short-answer-do`, `short-answer-does`, `recognition` |
| Language functions | `talk-about-work`, `talk-about-study`, `talk-about-home`, `talk-about-routines`, `talk-about-likes`, `talk-about-needs`, `ask-basic-personal-question`, `ask-about-work`, `ask-about-study`, `ask-about-home`, `ask-about-language`, `answer-basic-question` |
| Production modes | `recognition`, `controlled-production`, `guided-production`, `active-use` |
| Feedback keys | `normal-verb-question-needs-do`, `third-person-s-missing`, `does-followed-by-base-verb`, `present-simple-negative-needs-dont-doesnt`, `short-answer-uses-auxiliary` |

This taxonomy can evolve, but changes should be deliberate. Do not let Codex invent near-duplicate labels such as:

```text
ask-work-question
ask-about-job
work-question
question-work
```

Pick one label and reuse it.

---

## 5. Recommended Question Metadata Shape

Question items should keep learner-facing text separate from selection and feedback metadata.

Preferred shape:

```js
{
  id: 'a1-u2-gap-001',
  unitId: 'a1-present-simple-normal-verbs',
  exerciseType: 'gap-fill',

  prompt: 'Where ___ you live?',
  correctAnswers: ['do'],
  visibleExplanation: 'With normal verbs like live, English uses do/does to make questions.',

  feedbackKeys: ['normal-verb-question-needs-do'],

  selection: {
    grammarArea: 'present-simple',
    form: 'do-question',
    languageFunction: 'ask-about-home',
    productionMode: 'controlled-production'
  }
}
```

Avoid using `function` as a metadata key if possible, because it is semantically overloaded in JavaScript contexts. Prefer `languageFunction`.

---

## 6. Unit 2 Pool Coverage Draft

Use this as the first working plan for Unit 2 pools.

| Exercise | Purpose | Suggested coverage |
|---|---|---|
| Exercise 1 — Recognition | Notice correct/incorrect forms | 4 multiple-choice questions |
| Exercise 2 — Controlled gap-fill | Build basic Present Simple forms | 2 base affirmative, 2 third-person affirmative, 2 negatives, 2 questions |
| Exercise 3 — Question control | Make do/does questions automatic | 2 do questions, 2 does questions, 2 wh questions |
| Exercise 4 — Short answer control | Answer yes/no questions naturally | 4 short answers |
| Final checkpoint | Verify active use | mixed recognition, gap-fill, mini-dialogue, active production |

Normal exercises should restart with the same exercise type but new controlled questions from the same scoped pool.

Final checkpoints can rotate questions inside stable sections.

---

## 7. Codex Boundaries

Codex may:

```text
wire pool-backed exercises
make existing renderers accept generated attempts
fix build errors
remove obsolete systems when compatibility becomes too complex
rename metadata keys consistently when instructed
```

Codex should not:

```text
invent broad new taxonomies
create large question pools without review
write final learner-facing explanations without approval
add complex adapters to preserve outdated systems
change CEFR course logic
turn the section back into generic grammar practice
```

When in doubt, prefer a smaller, cleaner implementation over a larger compatibility layer.

# English Foundations — Course and Exercise Architecture

_Last updated: 2026-06-29_

This document records the updated direction for the learning section previously discussed as the grammar path. The navbar label should not be **Grammar**. The preferred label is **English Foundations**.

The purpose of this part of Sblocco Inglese is not to display grammar topics. Its task is to:

1. teach;
2. evaluate;
3. give case-specific feedback;
4. help the learner understand how to overcome repeated mistakes.

The internal engine may still use grammar tags, diagnostic tags, and error-pattern metadata. The learner-facing experience should not expose technical diagnostic language unless it is genuinely useful.

---

## 1. Naming

Use this naming logic:

```text
Navbar: English Foundations
Level path: A1 English Foundations, A2 English Foundations, etc.
Unit: functional outcome first, grammar second
```

Avoid making the learner feel they are entering a generic grammar archive.

Better:

```text
A1 English Foundations
Unit 1 — Introduce yourself and ask basic identity questions
Unit 2 — Talk about daily life, work, study, likes, wants and needs
```

Worse:

```text
Grammar
Present Simple
Articles
Plurals
```

Grammar is still present, but it is treated as the control system that lets the learner communicate.

---

## 2. Core Course Logic

The course must stay divided by CEFR level.

```text
CEFR level → unit → exercise block/type → approved question pool → controlled rotating attempt → aggregated feedback
```

The learning flow inside a unit should be:

```text
entry checkpoint
→ explanation/model language
→ standard exercises and micro-checks
→ final unit checkpoint
→ learner-facing feedback and advice
```

A1 is a functional level. The goal is not grammar mastery in isolation. The goal is to help the learner use simple English in predictable real situations: introductions, basic questions, daily life, needs, prices, places, messages, forms, simple listening, and simple reading.

Every grammar point must immediately become a speaking or writing function.

Examples:

```text
be → introduce yourself / say where someone is
present simple → talk about routine, work, study, likes, wants and needs
can → talk about ability and permission
there is / there are → describe a room, city or place
articles and plurals → describe objects clearly
questions → hold a simple conversation
```

---

## 3. Question Pool Architecture

Use the word **question** for the single item the learner answers.

Use the word **exercise** for the whole block containing multiple questions.

A dialogue exercise may contain multiple questions. Each blank or answerable part inside the dialogue should count as a question item for scoring and feedback.

The pool hierarchy should be:

```text
A1 question pool
  → unit question pool
    → exercise type / exercise block
      → approved question pool
```

More generally:

```text
CEFR level
  → Unit
    → Exercise block/type
      → Question pool
        → Controlled generated attempt
```

Questions must not be randomly selected from a whole level. They should be selected from the specific unit and exercise pool.

However, even inside a unit and exercise type, selection should not be completely chaotic. Use controlled rotation.

Example:

```text
Unit 2 — Present Simple for daily life
Exercise block: gap-fill
Required question count: 8
Coverage:
- 2 affirmative forms
- 2 negative forms
- 2 yes/no questions
- 1 wh-question
- 1 short answer
```

This gives variety while preserving pedagogical coverage.

---

## 4. Unit Blueprint

The most important object is the unit blueprint.

Each unit should define:

```text
id
level
title
display title
functional outcome
grammar tools needed
active skills verified
exercise blocks required
question counts per exercise block
selection rules / coverage rules
final checkpoint structure
feedback rules used by the unit
```

The unit should not depend on every other unit behaving in the same way. A1, B1, C1 and path-specific units may need different metadata.

The engine must tolerate optional fields and unknown metadata without breaking.

---

## 5. Exercise Blocks

Each exercise block should define:

```text
id
title
type
instructions
questionCount
questionPoolId or filter
selectionRules
feedbackMode
showAnswersMode
```

Possible `feedbackMode` values:

```text
immediate-per-question
on-exercise-submit
on-final-checkpoint-submit
```

Normal exercises should usually keep the same exercise type when restarted.

Example:

```text
Exercise: Ask basic questions
Type: gap-fill
Restart: still gap-fill
Questions: rotate from the same approved pool
```

Final unit checkpoints can contain several sections.

Example:

```text
Final checkpoint
- recognition section
- gap-fill section
- dialogue section
- Italian → English section
- active skill task
```

When the final checkpoint is restarted, the section structure stays stable, but the questions inside each section can rotate.

---

## 6. Question Items

Each question should be reviewable before being shown to learners.

A question should contain learner-facing text and internal metadata separately.

Example shape:

```js
{
  id: "a1-u2-gap-034",
  level: "a1",
  unitId: "a1-present-simple-daily-life",
  exerciseType: "gap-fill",

  prompt: "Where ___ you live?",
  correctAnswers: ["do"],
  visibleExplanation: "With normal verbs like live, English uses do/does to make questions.",

  feedbackKeys: ["normal-verb-question-needs-do"],

  selection: {
    grammarFocus: ["present-simple", "do-questions"],
    function: ["ask-basic-personal-question"],
    difficulty: "core",
    productionMode: "controlled-production"
  }
}
```

The learner does not need to see technical tags such as `grammarFocus`, `productionMode`, or `feedbackKeys`.

---

## 7. Feedback Rules

Feedback should be attached to feedback keys, not hardcoded inside the engine.

The engine should count which feedback keys appeared in wrong answers and display each feedback message only once.

Example:

```js
{
  key: "normal-verb-question-needs-do",
  title: "Use do/does with normal verbs",
  learnerMessage: "You are building this question as if English only needs word order or be. With normal verbs like live, work, study, like, want and need, use do or does before the subject.",
  fixRule: "First ask: is the main verb be? If yes, use am/is/are. If the main verb is another verb, use do/does.",
  practiceAdvice: "Repeat short questions with do/does until the structure becomes automatic: Do you live...? Does she work...? Where do they study?"
}
```

Student-facing feedback should not say:

```text
Affected skill: question formation
Error pattern: auxiliary confusion
```

Better:

```text
You used are where English needs do.
This often happens when you translate Italian questions directly.
To fix it, first decide: is the main verb be, or is it another verb like live/work/study?
```

Internal metadata may still track skills, grammar, production mode and error patterns. The visible result should explain the mistake and the practical correction rule.

---

## 8. Aggregated Feedback

If the same issue appears across several questions, show the feedback once.

Example internal result:

```text
Question 1 → normal-verb-question-needs-do
Question 3 → normal-verb-question-needs-do
Question 6 → third-person-s-missing
Question 8 → normal-verb-question-needs-do
```

Learner-facing result:

```text
Main things to fix

1. Use do/does with normal verbs
You made this mistake 3 times.
[explanation + fix rule + practice advice]

2. Remember he/she/it in affirmative sentences
You made this mistake 1 time.
[explanation + fix rule + practice advice]
```

Do not spam the same feedback message under every wrong question if the exercise-level summary already explains it.

Inline item feedback can remain short:

```text
Correct answer: do
Why: live is a normal verb, so the question needs do.
```

The larger advice belongs in the aggregated result.

---

## 9. Different Levels Need Different Structures

Do not assume all levels behave like A1.

A1 may care about:

```text
basic sentence control
be/do distinction
short answers
basic requests
simple descriptions
```

B1 may care about:

```text
storytelling
linking ideas
past/present contrast
explaining opinions
conversation survival
```

C1 may care about:

```text
register
precision
hedging
persuasion
argument structure
tone
nuance
```

The schema should have stable core fields, but flexible optional fields.

Stable:

```text
id
level
unitId
exerciseType
prompt/content
correct answer(s)
feedback keys
selection metadata
```

Flexible:

```text
activeSkill
grammarFocus
context
difficulty
productionMode
speakingMode
register
hospitalityScenario
businessScenario
examSkill
```

Unknown tags or optional fields must not break rendering, scoring, diagnostics, or recommendations.

---

## 10. Reviewable Visible Text

All learner-facing text must be easy to inspect and edit.

This includes:

```text
unit titles
unit explanations
model examples
exercise instructions
question prompts
correct answers
visible explanations
feedback titles
feedback messages
fix rules
practice advice
checkpoint result copy
```

The engine should not generate creative feedback text at runtime.

The engine should only decide:

```text
which questions to show
which answers are correct
which feedback keys appeared
how often each feedback key appeared
which prewritten feedback messages to display
```

This is important because AI-generated teaching copy can sound unnatural or imprecise. The teacher/founder must be able to approve and edit the visible text directly.

---

## 11. UI Direction

The UI must improve. It should not feel like repeated cards with little learning direction.

The learner should always understand:

```text
What am I learning?
Why am I doing this?
What should I do next?
What mistake am I repeating?
How do I fix it?
```

Better unit rhythm:

```text
1. What you will be able to do
2. Tiny explanation
3. Model examples
4. Try it
5. Check yourself
6. Mistake feedback
7. Try again with new questions
8. Final unit checkpoint
```

UI should use:

```text
clear progress steps
compact correction panels
stronger next-action buttons
less repeated card styling
more inline examples
more directional section headings
smarter use of horizontal space
final checkpoint summary
```

The interface should feel guided and alive, not like a static worksheet.

---

## 12. Minimal Codex Strategy

To avoid wasting Codex tokens, do not ask Codex to redesign the whole section.

Use small scoped tasks.

Recommended order:

```text
Step 1 — Rename the navbar item from Grammar to English Foundations and update route copy only.
Step 2 — Add the data architecture: unit blueprint, question pool shape, feedback rule shape, and attempt generator.
Step 3 — Convert one existing A1 unit to use controlled rotating questions.
Step 4 — Add aggregated feedback from feedback keys.
Step 5 — Improve the UI for that one unit only.
Step 6 — Only after the vertical slice works, convert more units.
```

Do not generate large amounts of content until the system works.

First prove the architecture with one vertical slice.

Best test unit:

```text
A1 Unit 2 — Talk about daily life, work, study, likes, wants and needs
```

Why this unit:

```text
It tests be/do distinction, present simple, third-person -s, questions, negatives and short answers.
It reveals common Italian-speaker mistakes quickly.
It is useful for real communication.
```

---

## 13. Non-Negotiables

```text
Do not keep Grammar as the navbar label.
Do not create random level-wide question selection.
Do not hardcode feedback logic inside React components.
Do not expose technical diagnostic labels to normal learners.
Do not make all CEFR levels follow the exact same rigid structure.
Do not let unknown tags crash the app.
Do not let AI-generated visible text become hard to review.
Do not build all levels before proving one vertical slice.
```

The product goal remains:

```text
Teach the learner, evaluate what they can actually use, and give specific advice that helps them overcome repeated mistakes.
```

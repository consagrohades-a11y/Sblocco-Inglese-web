# Sblocco Inglese — Universal AI Authoring Kit v1

**Template ID:** `sblocco-learning-activity`  
**Template version:** `1`  
**Authoring contract version:** `1`  
**Studio schema target:** `1`  
**Block Registry target:** `1`

## 1. Purpose

Create high-quality, importable Sblocco Inglese Learning Activities for Italian-speaking English learners.

A Learning Activity may be a quick exercise, lesson, mini-course, listening lesson or assessment. These are compositions of the same block system. Do not invent a different schema for different lesson types.

The teacher/AI makes pedagogical decisions. Sblocco makes technical decisions.

When the user asks for final importable content, return exactly one valid JSON object and nothing else.

## 2. Never invent system-owned data

Do **not** output:

- IDs / UUIDs
- client keys
- block keys
- option keys
- blank keys
- item keys
- sequence indexes
- slugs
- internal codes
- versions / version numbers
- diagnostic codes or mappings
- database relationships
- assignment identifiers
- publication metadata
- storage bucket/path metadata
- uploaded-file metadata
- timestamps

Sblocco generates, repairs or derives these.

## 3. Required JSON envelope

```json
{
  "_template": {
    "template_id": "sblocco-learning-activity",
    "template_version": 1,
    "authoring_contract_version": 1
  },
  "activity": {
    "internal_title": "",
    "learner_title": "",
    "description": "",
    "instructions": "",
    "level": "A2",
    "topic": "",
    "subtopic": "",
    "skills": [],
    "tags": [],
    "activity_type": "lesson",
    "estimated_minutes": 20,
    "blocks": []
  }
}
```

### Allowed levels
`A0`, `A1`, `A1+`, `A2`, `B1`, `B1+`, `B2`, `C1`, `C2`, `Mixed`.

### Allowed activity types
`exercise`, `lesson`, `mini_course`, `listening_lesson`, `assessment`.

### Allowed skills
`grammar`, `vocabulary`, `reading`, `writing`, `functional_language`, `spelling`, `word_order`, `speaking`, `listening`, `interaction`.

Only declare a skill when the activity genuinely teaches or practises it.

## 4. Sblocco teaching principles

1. Teach English for use, not rule memorisation alone.
2. Keep theory concise, functional and connected to practice.
3. Use realistic contexts an Italian learner could plausibly need.
4. Address Italian interference when it genuinely helps.
5. Do not manufacture absolute grammar rules where natural English allows overlap.
6. Distractors must represent plausible learner errors, not nonsense.
7. Feedback must explain why; do not merely repeat the key.
8. Prefer fewer varied, purposeful items to repetitive filler.
9. Progress beyond recognition into retrieval, manipulation and contextual use.
10. Do not use a theory block merely for decoration.
11. A recap is optional. Include it only when it adds synthesis, a decision rule, a useful contrast, an error warning or another meaningful consolidation benefit.
12. If a recap only repeats earlier content, omit it.

## 5. Lesson depth: count learner actions, not blocks

A learner action is a meaningful response, retrieval, manipulation, selection or production task. Theory blocks do not count as retrieval.

Default depth:

- **10–15 min quick activity:** about 6–10 learner actions.
- **20–30 min standard lesson:** about 12–20 learner actions.
- **35–45 min substantial lesson:** about 20–30 learner actions.

A six-item grouped exercise counts as six learner actions.

### Practice progression

Use this as a flexible progression:

```text
notice / understand
→ recognise
→ retrieve
→ manipulate
→ use in context
→ produce more freely
```

Not every lesson needs every stage, but recognition should not dominate simply because it is easy to generate.

### CEFR practice balance

Flexible ranges based on learner actions:

- **A0–A1:** about 40–55% supported recognition, 30–40% retrieval/manipulation, 10–20% short contextual production.
- **A2–B1:** about 25–40% recognition, 35–45% retrieval/manipulation, 20–35% contextual application/production.
- **B2–C2:** about 10–25% recognition/noticing, 30–45% retrieval/reformulation, 30–50% contextual or extended production.

These are guides, not quotas.

## 6. Vocabulary policy by CEFR

Do not apply a blanket "chunks first" rule.

### A0–A1
Prioritise essential high-frequency individual words. Immediately place them in simple useful phrases/sentences. Chunks support vocabulary growth but must not replace basic lexical acquisition.

For a normal lower-level lesson where vocabulary is a main objective, roughly **6–10 carefully selected new lexical targets** with heavy recycling is often appropriate.

### A2–B1
Deliberately mix individual words, collocations, common phrasal verbs and useful chunks. Learners should understand important component words as well as the whole expression.

When vocabulary is a main objective in a normal 20–30 minute lesson, roughly **8–12 worthwhile lexical targets** is a useful default.

### B2–C2
Increasingly prioritise collocation, chunks, phrasal verbs, register, nuance and lexical precision, while still teaching individual words when they carry useful meaning.

**Natural English does not mean chunks only.**

Vocabulary must be taught **and retrieved/reused**. A few decorative words do not justify declaring `vocabulary` as a skill.

## 7. Grammar policy

If `grammar` is declared:

- identify one core target or one tight, defensible contrast;
- teach the target clearly;
- normally give roughly **8–14 grammar-focused learner actions** in a standard grammar-heavy lesson;
- move beyond recognition into retrieval/manipulation and contextual use;
- never force a binary distinction when both forms are natural in the stated context.

Prefer a narrower defensible item over an impressive-looking but linguistically ambiguous one.

## 8. Automatic-grading confidence gate

Before creating any auto-graded item, ask:

> Can the task be written so that the intended answer is genuinely constrained and other natural answers are either accepted or genuinely wrong in this context?

If **yes**, auto-grading may be appropriate.

If **no**:
- add context that safely constrains the answer;
- broaden accepted answers;
- redesign the task;
- or use `written_response` / manual review.

Never mark natural, contextually legitimate English wrong merely because another form was the intended target.

## 9. Item-quality rules

### Multiple choice
- At least 2 options; normally 3–4.
- Exactly one correct answer.
- Distractors should be plausible for the CEFR level.
- Do not use trick wording.
- Avoid options that differ only through an unrelated difficulty.
- Feedback should explain the tested distinction.

### Accepted-answer tasks
- Include predictable legitimate variants: contractions, articles/prepositions when variation is genuinely acceptable, common natural alternatives.
- Do not add so many variants that the target disappears.
- If broad free expression is possible, do not pretend the task is safely auto-gradable.

### Translation
Use translation to retrieve a constrained target, not to test one imaginary perfect translation. Accept natural alternatives where appropriate.

### Gap fill
- Every gap must test a clear target.
- The surrounding sentence must provide enough context.
- Do not blank multiple words if many uncontrolled phrasings become possible.
- `text_template` uses `[[blank_1]]`, `[[blank_2]]`, etc.
- Blank entries are listed in the same order; do not provide blank keys.

### Word order
- Supply chunks in the **correct target order**.
- Keep multiword units together when pedagogically useful.
- Sblocco randomises the learner-facing starting order.
- Do not provide token IDs.

### Listening / reading
Source-dependent questions must be answerable from the source. Do not invent facts, quotations or transcript content. If the source is inaccessible, do not manufacture comprehension questions from the URL alone.

### Writing
Writing must have a real purpose, audience/context when useful, and more than one legitimate response. It is manual-review content, not a single-key task.

## 10. Current supported blocks

Use only these block types.

### A. `explanation`
Purpose: concise teaching explanation.

```json
{
  "type": "explanation",
  "title": "When do we use it?",
  "body": "..."
}
```
Required: `body`.

### B. `rule`
Purpose: reusable grammar/language pattern.

```json
{
  "type": "rule",
  "title": "The pattern",
  "body": "subject + be + verb-ing",
  "examples": ["I'm meeting Sara tomorrow."]
}
```
Required: `body`.

### C. `examples`
Purpose: examples themselves carry the teaching value.

```json
{
  "type": "examples",
  "title": "Notice",
  "examples": ["Are you working tomorrow?", "I'm meeting Luca at 3."]
}
```
Required: at least one example.

### D. `do_dont`
Use only for a genuine predictable misconception.

```json
{
  "type": "do_dont",
  "title": "Question order",
  "wrong": "What time you are meeting her?",
  "correct": "What time are you meeting her?",
  "why": "Move am/is/are before the subject in questions."
}
```
Required: `wrong`, `correct`, `why`.

### E. `contrast`
Use for a real comparison.

```json
{
  "type": "contrast",
  "title": "Statement vs question",
  "left_label": "Statement",
  "left_body": "You are meeting Sara.",
  "right_label": "Question",
  "right_body": "Are you meeting Sara?",
  "body": "The auxiliary moves before the subject."
}
```
Required: `left_body`, `right_body`.

### F. `vocabulary`
```json
{
  "type": "vocabulary",
  "title": "Scheduling words",
  "body": "Learn these before the practice.",
  "items": [
    {
      "term": "reschedule",
      "meaning": "arrange something for a different time",
      "translation": "riprogrammare / spostare",
      "example": "Can we reschedule the meeting?"
    }
  ]
}
```
Required: at least one item with `term`.

### G. `language_bank`
Reusable expressions.

```json
{
  "type": "language_bank",
  "title": "Useful phrases",
  "body": "Use these to change an arrangement.",
  "items": ["Something came up.", "Would 5 p.m. work for you?"]
}
```
Required: at least one item.

### H. `dialogue`
```json
{
  "type": "dialogue",
  "title": "Changing the meeting",
  "body": "Two colleagues speak.",
  "turns": [
    {"speaker": "A", "text": "Are you free tomorrow?"},
    {"speaker": "B", "text": "Yes, after 3."}
  ]
}
```
Required: at least two complete turns.

### I. `tip`
```json
{
  "type": "tip",
  "title": "Sound natural",
  "body": "Give a brief reason, then offer an alternative."
}
```

### J. `pronunciation`
```json
{
  "type": "pronunciation",
  "title": "Contractions",
  "body": "In speech, I am often becomes I'm.",
  "items": ["I'm meeting her tomorrow."]
}
```
Required: `body` or items.

### K. `recap`
Optional, meaningful consolidation only.

```json
{
  "type": "recap",
  "title": "Decision rule",
  "items": [
    "In present-continuous questions, am/is/are comes before the subject.",
    "Keep the main verb in -ing form."
  ]
}
```
Required: `body` or at least one item.

### L. `media`
Use only a user-supplied/known HTTPS URL. Never invent Storage paths.

```json
{
  "type": "media",
  "title": "Listen first",
  "instructions": "Listen once for the main idea.",
  "source_type": "youtube",
  "url": "https://...",
  "transcript": "...",
  "transcript_visibility": "after_submit",
  "start_seconds": 0,
  "end_seconds": null
}
```

Allowed `source_type`: `audio`, `video`, `youtube`.  
Allowed `transcript_visibility`: `always`, `after_submit`, `never`.

### M. `practice_selection`
Ungraded personal selection. Can mark options for the vocabulary bank.

```json
{
  "type": "practice_selection",
  "title": "Save what matters to you",
  "prompt": "Which items would you like to remember?",
  "instructions": "Choose as many as you want.",
  "primary_skill": "vocabulary",
  "learning_objective": "Select useful language for later review.",
  "selection_mode": "multiple",
  "options": [
    {"text": "reschedule", "vocab_bank": true, "vocab_kind": "word"},
    {"text": "Something came up.", "vocab_bank": true, "vocab_kind": "chunk"}
  ]
}
```

Allowed `selection_mode`: `single`, `multiple`.  
If `vocab_bank` is true, `vocab_kind` must be `word` or `chunk`.

### N. `translation`
Single constrained open answer.

```json
{
  "type": "translation",
  "title": "Translate naturally",
  "prompt": "Devo spostare l'appuntamento.",
  "instructions": "Write a natural English sentence.",
  "primary_skill": "vocabulary",
  "learning_objective": "Retrieve reschedule in context.",
  "accepted_answers": [
    "I need to reschedule the appointment.",
    "I have to reschedule the appointment."
  ],
  "feedback": {"explanation": "Reschedule means arrange it for a different time."}
}
```

Required: prompt + at least one accepted answer.

### O. `open_answer_set`
Several constrained short-answer/translation items sharing one task.

```json
{
  "type": "open_answer_set",
  "title": "Retrieve the words",
  "prompt": "Translate each sentence naturally.",
  "instructions": "Use the target vocabulary.",
  "primary_skill": "vocabulary",
  "learning_objective": "Retrieve scheduling vocabulary.",
  "items": [
    {
      "prompt": "Sei disponibile venerdì?",
      "accepted_answers": ["Are you available on Friday?", "Are you available Friday?"],
      "feedback": "Available = free at that time."
    },
    {
      "prompt": "Possiamo confermare l'orario?",
      "accepted_answers": ["Can we confirm the time?", "Could we confirm the time?"]
    }
  ]
}
```

Required: at least two items; each needs a prompt and accepted answer(s).

### P. `multiple_choice`
```json
{
  "type": "multiple_choice",
  "prompt": "Choose the correctly formed question.",
  "instructions": "Choose one.",
  "primary_skill": "grammar",
  "learning_objective": "Form a present-continuous question.",
  "options": [
    {"text": "What time are you meeting Luca?", "is_correct": true},
    {"text": "What time you are meeting Luca?", "is_correct": false},
    {"text": "What time are meeting you Luca?", "is_correct": false}
  ],
  "feedback": {"explanation": "Put are before the subject."}
}
```

No option keys. Exactly one correct option.

### Q. `multiple_choice_set`
Grouped MC with one shared instruction.

```json
{
  "type": "multiple_choice_set",
  "title": "Build the questions",
  "prompt": "Choose the correctly formed option in each case.",
  "instructions": "Choose one answer per item.",
  "primary_skill": "grammar",
  "learning_objective": "Use correct question word order.",
  "items": [
    {
      "prompt": "Ask about the time.",
      "options": [
        {"text": "What time are you leaving?", "is_correct": true},
        {"text": "What time you are leaving?", "is_correct": false}
      ],
      "feedback": "Move are before the subject."
    },
    {
      "prompt": "Ask if Luca is joining.",
      "options": [
        {"text": "Is Luca joining us?", "is_correct": true},
        {"text": "Luca is joining us?", "is_correct": false}
      ]
    }
  ]
}
```

Required: at least two items; each has at least two options and exactly one correct answer. No item/option keys.

### R. `gap_fill`
```json
{
  "type": "gap_fill",
  "title": "Complete the message",
  "prompt": "Write the missing words.",
  "instructions": "Use the correct forms.",
  "primary_skill": "grammar",
  "learning_objective": "Retrieve be + -ing.",
  "text_template": "I [[blank_1]] Sara tomorrow. What time [[blank_2]] you leaving?",
  "blanks": [
    {"accepted_answers": ["am meeting", "'m meeting"]},
    {"accepted_answers": ["are"]}
  ]
}
```

Do not provide blank keys. Every blank needs accepted answers.

### S. `word_order`
```json
{
  "type": "word_order",
  "title": "Build the question",
  "prompt": "Put the chunks in order.",
  "instructions": "Use every chunk.",
  "primary_skill": "word_order",
  "learning_objective": "Form a natural question.",
  "chunks": ["What time", "are you meeting", "the client", "tomorrow"],
  "terminal_punctuation": "?"
}
```

Provide chunks in correct order. Minimum two chunks.

### T. `written_response`
Manual review. Do not invent a model answer as the one correct response.

```json
{
  "type": "written_response",
  "title": "Change the plan",
  "prompt": "Write a short message to a colleague. Refer to the arrangement, explain the problem and suggest a new time.",
  "instructions": "Write naturally and reuse useful language from the lesson.",
  "learning_objective": "Use scheduling language in a realistic message.",
  "context_situation": "You cannot attend tomorrow's 3 p.m. meeting.",
  "context_role": "You need to change the arrangement.",
  "context_audience": "A colleague.",
  "context_goal": "Explain the change and propose another time.",
  "min_words": 60,
  "max_words": 110,
  "required_points": [
    "Refer to the existing arrangement",
    "Explain briefly that it must change",
    "Suggest another time"
  ]
}
```

Note: the current Registry exposes 19 block **definitions**; this reference lists each current authoring type, including production/media/practice specialisations. Use only types accepted by the current Studio.

## 11. Lesson-type recipes

These recipes change composition, never schema.

### Grammar lesson
Use when one grammar target is central.

Default shape:
```text
context/example
→ explanation/rule
→ examples
→ quick check
→ contrast or do/don't only if genuinely useful
→ controlled practice
→ retrieval/manipulation
→ contextual production
```

Avoid:
- huge theory sections;
- fuzzy distinctions presented as absolute;
- 2 practice items after 5 theory blocks;
- testing untaught exceptions.

### Vocabulary lesson
Use when lexical growth is central.

Default shape:
```text
context
→ explicit lexical teaching
→ meaning/use noticing
→ recognition
→ active retrieval
→ collocation/chunk use
→ personalised selection or production
```

Requirements:
- level-sensitive lexical load;
- individual words must not disappear at lower levels;
- retrieval after teaching;
- examples should reveal natural grammar/collocation.

Avoid:
- lists with no retrieval;
- C1-style chunk overload for A1;
- giving Italian translations without English meaning/use;
- treating every expression as equally important.

### Listening lesson
Use only when the learner has real audio/video/transcript content.

Default:
```text
context / essential pre-listening support
→ media
→ gist
→ detail
→ language noticing
→ retrieval/reuse
→ discussion/writing
```

Normally gist precedes fine detail. Do not pre-teach so much that the listening task becomes trivial. Never invent comprehension from an inaccessible URL.

### Writing activity
Build around communicative purpose.

Include as useful:
- situation;
- role;
- audience;
- goal;
- useful language;
- required content points;
- realistic word range.

Writing is manually reviewed. Do not create a single exact answer key.

### Mixed lesson
Use when multiple skills genuinely reinforce one communicative goal.

Each declared major skill must receive meaningful practice. The final task should integrate earlier teaching rather than introduce unrelated language.

Avoid "mixed" lessons that are simply disconnected blocks.

### Assessment
Assess taught/expected knowledge rather than teach it heavily before testing.

Use stricter ambiguity standards than normal practice. Keep scoring targets clear. Do not use an assessment to sneak in large amounts of new teaching.

### Quick exercise
Usually 6–10 focused learner actions around one target. Minimal theory. Appropriate for homework, retrieval, correction practice or reinforcement.

Do not inflate it into a fake 30-minute lesson.

## 12. Source fidelity

If the user provides a transcript, article, passage or source:
- preserve the source's meaning;
- do not invent details;
- make source-dependent questions answerable from it;
- distinguish source comprehension from broader language practice.

For media:
- never invent a URL;
- never invent Storage metadata;
- include a transcript only when actually supplied/known;
- current transcript visibility values are `always`, `after_submit`, `never`.

## 13. Final silent validation before output

Check all of the following:

- valid JSON;
- one root object;
- template metadata exactly matches v1;
- internal title, learner title, level, topic, activity type and blocks exist;
- only supported block types;
- no IDs/keys/slugs/versions/diagnostics/Storage metadata;
- skill labels are earned by real teaching/practice;
- lesson depth approximately matches duration;
- vocabulary load matches CEFR and objective;
- grammar target is explicit and defensible;
- every MC item has exactly one genuinely correct answer;
- plausible legitimate alternatives are not marked wrong;
- accepted answers cover predictable variants;
- every gap marker has a corresponding answer entry;
- word-order chunks are supplied in correct order;
- source questions are source-grounded;
- writing remains open-ended/manual-review appropriate;
- recap, if present, adds real consolidation;
- the lesson is coherent and useful, not merely long.

## 14. Output rule

For final importable content:

**Return only the final JSON object. Do not wrap it in Markdown. Do not add commentary before or after it.**


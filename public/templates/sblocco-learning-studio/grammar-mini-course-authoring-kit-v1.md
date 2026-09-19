# Sblocco Inglese AI Authoring Kit

**Template:** Grammar / Mixed Mini-Lesson  
**template_id:** `sblocco-grammar-mini-course`  
**template_version:** `1`  
**authoring_contract_version:** `1`

## Your task

Create a structured Sblocco Inglese learning activity for an Italian-speaking English learner.

Return **only one valid JSON object**. Do not add Markdown fences, commentary, explanations outside the JSON, or alternative versions.

The JSON will be imported into the Sblocco Learning Studio, visually edited by the teacher, automatically normalized, validated, published, assigned, rendered to the learner, and graded/reviewed.

The teacher makes pedagogical decisions. Sblocco makes technical decisions.

---

## Critical technical rules

Never invent or output:

- IDs or UUIDs
- internal codes
- public IDs
- client keys
- option keys
- gap keys
- sequence indexes
- version numbers
- database relationships
- storage paths unless the teacher explicitly supplied one
- diagnostic codes
- diagnostic mappings
- assignment resource IDs
- timestamps
- publication metadata

Sblocco generates those automatically.

Use only the fields documented below.

If you are uncertain about a teaching decision, create sensible pedagogical content. Do not compensate by inventing technical metadata.

---

## Required envelope

```json
{
  "_template": {
    "template_id": "sblocco-grammar-mini-course",
    "template_version": 1,
    "authoring_contract_version": 1
  },
  "activity": {
    "internal_title": "",
    "learner_title": "",
    "level": "A2",
    "topic": "",
    "activity_type": "mini_course",
    "estimated_minutes": 15,
    "tags": [],
    "blocks": []
  }
}
```

### Activity fields

- `internal_title`: clear teacher/library title, e.g. `A2 — Present Perfect — Life Experiences`
- `learner_title`: natural learner-facing title, e.g. `Talking about your experiences`
- `level`: one of `A0`, `A1`, `A1+`, `A2`, `B1`, `B1+`, `B2`, `C1`, `C2`, `Mixed`
- `topic`: stable lowercase topic slug using underscores, e.g. `present_perfect`
- `activity_type`: normally `mini_course`, `lesson`, `exercise`, `listening_lesson`, or `assessment`
- `estimated_minutes`: realistic integer estimate
- `tags`: useful human search tags
- `blocks`: ordered learner journey

---

# Sblocco pedagogical rules

Sblocco is for learners who may have studied English before but struggle to use it naturally.

1. Teach for use, not rule memorisation alone.
2. Theory and practice should alternate naturally.
3. Prefer short, clear explanation blocks over long textbook essays.
4. Use realistic examples an Italian learner could actually need.
5. Explain contrasts that are likely to cause errors.
6. When useful, address Italian-language interference explicitly without overusing translation.
7. Distractors must be plausible learner errors, not random nonsense.
8. Do not create trick questions.
9. Feedback should explain **why**, not simply repeat the correct answer.
10. Keep the CEFR level consistent in instructions, vocabulary and cognitive demand.
11. Prefer chunks/collocations and functional language when more useful than isolated vocabulary.
12. A mini-lesson should normally move through:
   - context or explanation
   - rule/pattern/examples
   - quick check
   - useful contrast/common error if relevant
   - controlled practice
   - freer production when appropriate
   - recap
13. Do not create theory blocks solely to decorate the lesson.
14. Do not create ten near-identical questions when fewer varied questions teach the point better.
15. Writing tasks must allow multiple legitimate learner answers.
16. For listening lessons, normally ask for gist before fine detail.
17. Word-order chunks may contain multiple words when those words should move as one unit.

---

# Supported blocks

## 1. explanation

Use for a concise teaching explanation.

```json
{
  "type": "explanation",
  "title": "When do we use it?",
  "body": "..."
}
```

Required: `body`.

---

## 2. rule

Use for a reusable form/pattern.

```json
{
  "type": "rule",
  "title": "The pattern",
  "body": "have/has + past participle",
  "examples": [
    "I have visited Rome.",
    "She has never tried sushi."
  ]
}
```

Required: `body`.

---

## 3. examples

Use when the examples themselves carry the teaching value.

```json
{
  "type": "examples",
  "title": "Notice the pattern",
  "examples": [
    "Have you ever worked abroad?",
    "I have never flown alone."
  ]
}
```

Required: at least one example.

---

## 4. do_dont

Use for a predictable misconception, especially a common Italian-learner error.

```json
{
  "type": "do_dont",
  "title": "Finished past time changes the tense",
  "wrong": "I have visited London last year.",
  "correct": "I visited London last year.",
  "why": "Use the past simple with a finished time expression such as last year."
}
```

Required: `wrong`, `correct`, `why`.

Do not use this block for arbitrary stylistic preferences.

---

## 5. contrast

Use when two forms or meanings genuinely need comparison.

```json
{
  "type": "contrast",
  "title": "Experience vs finished past event",
  "left_label": "Present perfect",
  "left_body": "Have you ever been to Spain?",
  "right_label": "Past simple",
  "right_body": "When did you go?",
  "body": "First ask about the experience; then use the past simple for finished details."
}
```

Required: `left_body`, `right_body`.

---

## 6. vocabulary

Prefer useful words, chunks and collocations.

```json
{
  "type": "vocabulary",
  "title": "Useful travel language",
  "body": "Use these expressions to talk about experiences.",
  "items": [
    {
      "term": "travel abroad",
      "meaning": "travel to another country",
      "translation": "viaggiare all'estero",
      "example": "Have you ever travelled abroad alone?"
    }
  ]
}
```

Required: at least one item with `term`.

---

## 7. language_bank

Use for phrases the learner can reuse in speaking or writing.

```json
{
  "type": "language_bank",
  "title": "Useful answers",
  "body": "You can expand your answer with:",
  "items": [
    "Yes, I have. I went there two years ago.",
    "No, I haven't, but I'd like to.",
    "The best place I've ever visited is..."
  ]
}
```

Required: at least one item.

---

## 8. dialogue

Use for short realistic context.

```json
{
  "type": "dialogue",
  "title": "At lunch with a colleague",
  "body": "Two colleagues talk about travel.",
  "turns": [
    { "speaker": "A", "text": "Have you ever been to Portugal?" },
    { "speaker": "B", "text": "Yes, I have. I went last summer." }
  ]
}
```

Required: at least two complete turns.

---

## 9. tip

Use for a genuinely useful strategy.

```json
{
  "type": "tip",
  "title": "A useful conversation strategy",
  "body": "Use the present perfect to open the topic, then switch to the past simple for details."
}
```

---

## 10. pronunciation

```json
{
  "type": "pronunciation",
  "title": "Contractions",
  "body": "In natural speech, I have often becomes I've.",
  "items": [
    "I've been there.",
    "She's never tried it."
  ]
}
```

---

## 11. recap

Use for a short learner-facing consolidation.

```json
{
  "type": "recap",
  "title": "Before you finish",
  "items": [
    "Use have/has + past participle for life experience.",
    "Do not combine present perfect with a finished time such as last year.",
    "Use the past simple for finished details."
  ]
}
```

Required: body or at least one item.

---

## 12. multiple_choice

Exactly one answer must be correct.

```json
{
  "type": "multiple_choice",
  "prompt": "Have you ever ___ to Scotland?",
  "instructions": "Choose the best answer.",
  "learning_objective": "Choose the correct past participle after have.",
  "options": [
    { "text": "been", "is_correct": true },
    { "text": "went", "is_correct": false },
    { "text": "go", "is_correct": false }
  ],
  "feedback": {
    "explanation": "After have, use the past participle: been."
  }
}
```

Rules:
- at least two options;
- exactly one correct option;
- no option keys;
- distractors should represent realistic learner errors.

---

## 13. multiple_choice_set

Use when several multiple-choice questions share the same instruction. This avoids repeating the same learner direction in separate blocks.

```json
{
  "type": "multiple_choice_set",
  "title": "Which sounds natural?",
  "prompt": "Which sentence sounds most natural in each example?",
  "instructions": "Choose the best answer.",
  "items": [
    {
      "prompt": "Example 1",
      "options": [
        { "text": "Stress can have the effect to make people less patient.", "is_correct": false },
        { "text": "Stress can have the effect of making people less patient.", "is_correct": true },
        { "text": "Stress can make the effect of people being less patient.", "is_correct": false }
      ],
      "feedback": "Use have the effect of + -ing."
    },
    {
      "prompt": "Example 2",
      "options": [
        { "text": "People are more probable to become rude when stressed.", "is_correct": false },
        { "text": "People are more likely becoming rude when stressed.", "is_correct": false },
        { "text": "People are more likely to become rude when stressed.", "is_correct": true }
      ]
    }
  ]
}
```

Rules:
- use one shared task/instruction for the whole set;
- include at least two questions;
- every question needs at least two options and exactly one correct answer;
- do not add item keys or option keys;
- use optional item-level `feedback` only when a short explanation adds teaching value;
- prefer this block over several separate multiple-choice blocks when the learner is doing the same task repeatedly.

---

## 14. gap_fill

Use `[[blank_1]]`, `[[blank_2]]`, etc. inside `text_template`.
Do not create gap IDs/keys separately; Sblocco will generate them in order.

```json
{
  "type": "gap_fill",
  "prompt": "Complete the sentence.",
  "text_template": "I [[blank_1]] never [[blank_2]] sushi.",
  "blanks": [
    { "accepted_answers": ["have", "'ve"] },
    { "accepted_answers": ["tried"] }
  ]
}
```

Every blank needs at least one accepted answer.

---

## 15. word_order

Provide chunks in the **correct order**. Sblocco randomises their learner-facing starting order and keeps it stable within an attempt.

```json
{
  "type": "word_order",
  "prompt": "Build the question.",
  "chunks": [
    "Have",
    "you ever",
    "travelled",
    "abroad"
  ],
  "terminal_punctuation": "?"
}
```

Required: at least two chunks.

Keep multiword units together when pedagogically useful.

---

## 16. written_response

This is manually reviewed. Do not pretend there is one exact automatic answer.

```json
{
  "type": "written_response",
  "prompt": "Write about a memorable trip.",
  "context": "Imagine you are telling a colleague about it.",
  "min_words": 60,
  "max_words": 120,
  "required_points": [
    "Say where you went",
    "Describe one experience",
    "Say when it happened"
  ],
  "learning_objective": "Use present perfect for experience and past simple for finished details."
}
```

---

## 17. media

Use for audio, direct video or YouTube.

```json
{
  "type": "media",
  "title": "Listen first",
  "instructions": "Listen once for the general idea.",
  "source_type": "youtube",
  "url": "https://www.youtube.com/watch?v=...",
  "transcript": "",
  "transcript_visibility": "after_submit",
  "start_seconds": 0,
  "end_seconds": null
}
```

Allowed `source_type`: `audio`, `video`, `youtube`.

Allowed `transcript_visibility`: `always`, `after_submit`, `never`.

Do not invent a media URL. If the user has not supplied media, omit this block.

---

# Quality checks before output

Before returning the JSON, silently check:

- valid JSON;
- one root object;
- correct template/version metadata;
- activity has internal title, learner title, level, topic and blocks;
- blocks appear in a pedagogically sensible order;
- no system-owned fields;
- no diagnostic codes;
- every multiple-choice block has exactly one correct answer;
- every multiple-choice set has one shared task and every item has exactly one correct answer;
- every gap has accepted answers;
- every word-order task has at least two chunks in correct order;
- every writing task has a meaningful open prompt;
- no unsupported block types;
- explanations are concise enough to read comfortably;
- examples and distractors suit the stated CEFR level;
- feedback explains rather than merely repeats;
- no hidden context is required to answer a question.

---

# Completed example

```json
{
  "_template": {
    "template_id": "sblocco-grammar-mini-course",
    "template_version": 1,
    "authoring_contract_version": 1
  },
  "activity": {
    "internal_title": "A2 — Present Perfect — Life Experiences",
    "learner_title": "Talking about your experiences",
    "level": "A2",
    "topic": "present_perfect",
    "activity_type": "mini_course",
    "estimated_minutes": 16,
    "tags": ["grammar", "conversation", "life experiences"],
    "blocks": [
      {
        "type": "explanation",
        "title": "Experience, not a finished moment",
        "body": "Use the present perfect to ask or talk about an experience when the exact finished time is not the important part."
      },
      {
        "type": "rule",
        "title": "The pattern",
        "body": "have / has + past participle",
        "examples": [
          "I have visited Berlin.",
          "She has never tried surfing."
        ]
      },
      {
        "type": "multiple_choice",
        "prompt": "Have you ever ___ to Scotland?",
        "instructions": "Choose the best answer.",
        "learning_objective": "Choose the correct past participle after have.",
        "options": [
          { "text": "been", "is_correct": true },
          { "text": "went", "is_correct": false },
          { "text": "go", "is_correct": false }
        ],
        "feedback": {
          "explanation": "After have, use a past participle. The past participle of go is been when we mean visiting a place."
        }
      },
      {
        "type": "contrast",
        "title": "Then ask for details",
        "left_label": "Experience",
        "left_body": "Have you ever been to Scotland?",
        "right_label": "Finished detail",
        "right_body": "When did you go?",
        "body": "Use the present perfect to open the topic. Use the past simple when you ask about a finished time or event."
      },
      {
        "type": "do_dont",
        "title": "Watch the time expression",
        "wrong": "I have been to Scotland last year.",
        "correct": "I went to Scotland last year.",
        "why": "Last year is a finished past time, so use the past simple."
      },
      {
        "type": "word_order",
        "prompt": "Build the question.",
        "chunks": ["Have", "you ever", "travelled", "abroad"],
        "terminal_punctuation": "?"
      },
      {
        "type": "language_bank",
        "title": "Make your answer more natural",
        "items": [
          "Yes, I have. I went there...",
          "No, I haven't, but I'd like to.",
          "The best place I've ever visited is..."
        ]
      },
      {
        "type": "written_response",
        "prompt": "Write about one place you have visited. Introduce the experience, then give finished past details.",
        "min_words": 60,
        "max_words": 120,
        "required_points": [
          "Name the place",
          "Say what you experienced",
          "Say when you went",
          "Give one extra detail"
        ],
        "learning_objective": "Distinguish life experience from finished past details in connected writing."
      },
      {
        "type": "recap",
        "title": "What to remember",
        "items": [
          "Use have/has + past participle for life experiences.",
          "Use the past simple with finished past times.",
          "A conversation often starts with present perfect and continues with past simple details."
        ]
      }
    ]
  }
}
```

## Final output instruction

Return only the final JSON object. Do not wrap it in Markdown.

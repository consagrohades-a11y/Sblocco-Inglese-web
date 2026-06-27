# Card Data Audit — General Expression + Word Trainer

This file is a focused audit for Codex/AI coding agents. It documents known problems in the **General Expression Trainer** and **Word Trainer** datasets so fixes can be made without rediscovering the issue.

Datasets involved:

- `src/data/generalExpressionCards.js`
- `src/data/wordTrainerCards.js`

Related validator:

- `scripts/validate-srs-cards.mjs`
- `src/utils/validateSrsCards.js`

## Main finding

The two datasets are structurally valid enough for the app to load, but several cards contain **mechanically generated examples** that are grammatically wrong, semantically unnatural, or pedagogically weak.

The current validator mostly checks required fields, duplicate IDs/targets, category presence, and bold markdown in examples. It does **not** catch naturalness or grammar problems in examples.

## General Expression Trainer issues

File: `src/data/generalExpressionCards.js`

### 1. Incomplete phrase starters used as complete sentences

Several expression cards are phrase starters that require a complement, but the examples treat them as complete standalone chunks followed by a comma.

Bad pattern:

```js
"example1": "**[phrase starter]**, we can talk about it later."
"example2": "**[phrase starter]**, that is what I would say in this situation."
```

This creates unnatural or incorrect English.

Known examples observed:

```js
// ge-041
"expression": "I tend to prefer",
"example1": "**I tend to prefer**, we can talk about it later.",
"example2": "**I tend to prefer**, that is what I would say in this situation."

// ge-042
"expression": "I’d rather",
"example1": "**I’d rather**, we can talk about it later.",
"example2": "**I’d rather**, that is what I would say in this situation."

// ge-044
"expression": "What I like about it is",
"example1": "**What I like about it is**, we can talk about it later.",
"example2": "**What I like about it is**, that is what I would say in this situation."

// ge-231
"expression": "I’ll probably",
"example1": "**I’ll probably**, we can talk about it later.",
"example2": "**I’ll probably**, that is what I would say in this situation."

// ge-232
"expression": "I might",
"example1": "**I might**, we can talk about it later.",
"example2": "**I might**, that is what I would say in this situation."

// ge-233
"expression": "I’m considering",
"example1": "**I’m considering**, we can talk about it later.",
"example2": "**I’m considering**, that is what I would say in this situation."

// ge-238
"expression": "I’m meeting",
"example1": "**I’m meeting**, we can talk about it later.",
"example2": "**I’m meeting**, that is what I would say in this situation."

// ge-239
"expression": "I have an appointment",
"example1": "**I have an appointment**, we can talk about it later.",
"example2": "**I have an appointment**, that is what I would say in this situation."

// ge-242
"expression": "I want to get better at",
"example1": "**I want to get better at**, we can talk about it later.",
"example2": "**I want to get better at**, that is what I would say in this situation."

// ge-244
"expression": "I need to figure out",
"example1": "**I need to figure out**, we can talk about it later.",
"example2": "**I need to figure out**, that is what I would say in this situation."

// ge-245
"expression": "I’d like to focus on",
"example1": "**I’d like to focus on**, we can talk about it later.",
"example2": "**I’d like to focus on**, that is what I would say in this situation."

// ge-246
"expression": "I’m trying to build",
"example1": "**I’m trying to build**, we can talk about it later.",
"example2": "**I’m trying to build**, that is what I would say in this situation."

// ge-248
"expression": "I’m working towards",
"example1": "**I’m working towards**, we can talk about it later.",
"example2": "**I’m working towards**, that is what I would say in this situation."
```

These should be rewritten so the bold expression is completed naturally.

Examples of better corrections:

```js
"expression": "I tend to prefer",
"example1": "**I tend to prefer** smaller groups because I can speak more.",
"example2": "**I tend to prefer** practical examples over long explanations."

"expression": "I’d rather",
"example1": "**I’d rather** talk about it after the meeting.",
"example2": "**I’d rather** practise the answer one more time."

"expression": "What I like about it is",
"example1": "**What I like about it is** that it feels practical.",
"example2": "**What I like about it is** the clear structure."

"expression": "I’ll probably",
"example1": "**I’ll probably** send the email tomorrow morning.",
"example2": "**I’ll probably** need more time to decide."

"expression": "I might",
"example1": "**I might** join the call a few minutes late.",
"example2": "**I might** need help with the first part."

"expression": "I’m considering",
"example1": "**I’m considering** applying for a job abroad.",
"example2": "**I’m considering** taking an English course this summer."

"expression": "I want to get better at",
"example1": "**I want to get better at** speaking under pressure.",
"example2": "**I want to get better at** explaining my ideas clearly."

"expression": "I’m working towards",
"example1": "**I’m working towards** feeling more confident in interviews.",
"example2": "**I’m working towards** using English more naturally at work."
```

### 2. Wrong verb form after prepositions / fixed chunks

Known example:

```js
// ge-040
"expression": "I’m really into",
"example1": "**I’m really into** improve my speaking this year.",
"example2": "**I’m really into** practise a little every day."
```

Correct pattern: `be into + noun / gerund`.

Better:

```js
"example1": "**I’m really into** improving my speaking this year.",
"example2": "**I’m really into** practising a little every day."
```

### 3. Semantically wrong complements

Known example:

```js
// ge-237
"expression": "I’m going away for",
"example1": "**I’m going away for** a new laptop.",
"example2": "**I’m going away for** the right moment to start."
```

This is semantically wrong. `go away for` usually takes a duration, trip, or reason/event.

Better:

```js
"example1": "**I’m going away for** the weekend.",
"example2": "**I’m going away for** a few days in July."
```

### 4. Many examples are grammatical but too generic

Examples like these are not always wrong, but they are weak:

```js
"**[expression].** We can talk more later."
"**[expression].** I’ll message you if anything changes."
```

They should be kept only when they genuinely fit the expression. For the trainer to be useful, examples should show realistic learner contexts: work, calls, travel, plans, interviews, hesitation, clarification, social situations.

## Word Trainer issues

File: `src/data/wordTrainerCards.js`

### 1. Subject-verb agreement issue

Known example:

```js
// wt-015
"word": "salary",
"example1": "The **salary** expectations was discussed during the interview."
```

Better:

```js
"example1": "The **salary** expectations were discussed during the interview."
```

Or simpler:

```js
"example1": "The **salary** was discussed during the interview."
```

### 2. Incorrect use of “enough”

Known example:

```js
// wt-420
"word": "enough",
"example1": "This is **enough** useful for speaking.",
"example2": "I am **enough** ready to continue."
```

Correct patterns:

- adjective/adverb + enough
- enough + noun

Better:

```js
"example1": "This is useful **enough** for a short conversation.",
"example2": "I have **enough** time to practise before the call."
```

### 3. Pedagogically weak collocation example

Known example:

```js
// wt-429
"word": "make a mistake",
"example1": "I need to **make a mistake** before the end of the week.",
"example2": "It is useful to **make a mistake** in this situation."
```

This sounds like the learner should intentionally make a mistake. Better:

```js
"example1": "It’s normal to **make a mistake** when you speak under pressure.",
"example2": "If you **make a mistake**, correct yourself and continue."
```

### 4. Unnatural generated examples

Several word cards use mechanically generated templates such as:

```js
"The [collocation] was discussed during the interview."
"This [collocation] is important in the role I want."
"Can you [verb/collocation] when you have a moment?"
"This is [adverb] useful for speaking."
"I am [adverb] ready to continue."
```

These are not always technically wrong, but they often sound unnatural or too abstract for a learner trainer.

Known examples observed:

```js
// wt-006
"word": "employer",
"example1": "The future **employer** was discussed during the interview.",
"example2": "This current **employer** is important in the role I want."

// wt-007
"word": "employee",
"example1": "The full-time **employee** was discussed during the interview.",
"example2": "This new **employee** is important in the role I want."

// wt-012
"word": "role",
"example1": "The new **role** was discussed during the interview.",
"example2": "Can you apply for a **role** when you have a moment?"

// wt-421
"word": "quite",
"example1": "This is **quite** useful for speaking.",
"example2": "I am **quite** ready to continue."

// wt-424
"word": "mainly",
"example1": "This is **mainly** useful for speaking.",
"example2": "I am **mainly** ready to continue."
```

Better examples should be concrete and realistic.

Examples:

```js
"word": "employer",
"example1": "My current **employer** offers flexible working hours.",
"example2": "I want to ask my future **employer** about training opportunities."

"word": "role",
"example1": "I’m applying for a customer support **role**.",
"example2": "This **role** requires good communication skills."

"word": "quite",
"example1": "The first question was **quite** difficult.",
"example2": "I feel **quite** confident about the interview."

"word": "mainly",
"example1": "I use English **mainly** for work emails.",
"example2": "The course is **mainly** focused on speaking."
```

## Recommended fix strategy

Do not rewrite all 750 cards blindly in one giant change unless the user explicitly asks for a full regeneration.

Recommended sequence:

1. Run the existing validator:

```bash
npm run validate:srs
```

2. Add stronger audit checks for common generated-bad patterns:

```js
// suspicious incomplete expression examples
", we can talk about it later"
", that is what I would say in this situation"

// incorrect enough pattern
"**enough** useful"
"**enough** ready"

// weak generic generated templates
"was discussed during the interview"
"is important in the role I want"
"This is **"
"I am **"
```

3. Fix the highest-confidence grammar errors first:

- ge-040
- ge-041
- ge-042
- ge-044
- ge-231
- ge-232
- ge-233
- ge-237
- ge-238
- ge-239
- ge-242
- ge-244
- ge-245
- ge-246
- ge-248
- wt-015
- wt-420
- wt-429

4. Then do a second pass for quality, especially repeated generic examples.

## Acceptance criteria

A good fix should meet these criteria:

- Every example sentence is grammatical.
- Every example naturally contains the target expression/word in bold markdown.
- Phrase starters are completed with a realistic complement.
- Word cards show realistic collocation use, not abstract filler.
- Examples are useful for Italian learners in the Sblocco Inglese context.
- No card IDs or exported variable names are changed.
- Card counts remain:
  - General Expression Trainer: 250 cards.
  - Word Trainer: 500 cards.
- The app still builds.
- `npm run validate:srs` passes.

## Important implementation note

The current data files are plain JavaScript arrays. Preserve the export shape:

```js
export const generalExpressionCards = [/* cards */];
export default generalExpressionCards;

export const wordTrainerCards = [/* cards */];
export default wordTrainerCards;
```

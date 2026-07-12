# Sblocco Inglese Trainer Product Specification

## 1. Purpose

The Trainer is the first complete module of the rebuilt Sblocco Inglese platform.

It must serve four functions:

1. Help learners convert passive vocabulary into active vocabulary.
2. Help learners retrieve natural expressions while speaking and writing.
3. Give taught students structured practice between lessons.
4. Create reusable learning data for the future English Foundations and course systems.

The Trainer must work independently as a high-quality product, but its architecture must be reusable inside the complete Sblocco Inglese platform.

It must not be built as a temporary flashcard application.

## 2. Product structure

The Trainer contains two visibly separate products.

### Word Trainer

The Word Trainer covers:

- individual words;
- phrasal verbs;
- important collocations;
- word families;
- false friends;
- commonly confused words;
- professional vocabulary;
- topic-specific vocabulary.

### Expression Trainer

The Expression Trainer covers:

- fixed expressions;
- sentence frames;
- functional phrases;
- conversation chunks;
- discourse markers;
- natural reactions;
- clarification and repair language;
- professional phrases;
- hospitality responses;
- interview language.

The two trainers share:

- accounts;
- database;
- visual system;
- assignments;
- collections;
- progress tracking;
- review scheduling;
- access rules;
- administrator tools.

They do not use identical exercise logic.

## 3. Supported proficiency levels

The Trainer must support:

- A0
- A1
- A2
- B1
- B2
- C1

A0 is an internal Sblocco Inglese level for absolute beginners. It is not presented as an official CEFR certification level.

A0 content includes:

- essential verbs;
- essential nouns;
- numbers;
- days and dates;
- personal information;
- classroom language;
- basic requests;
- basic reactions;
- fundamental survival expressions.

A0 activities require more guided presentation than higher-level activities.

## 4. Initial content domains

The first production version supports:

- General English
- Business English
- Hospitality English
- Interview English

The architecture must allow additional domains later without changing the database structure.

Potential future domains include:

- travel and relocation;
- customer service;
- academic English;
- healthcare communication;
- technology;
- sales;
- tourism.

## 5. Content organisation

Every word or expression must be classified through several independent dimensions.

### 5.1 Level

One primary level:

- A0
- A1
- A2
- B1
- B2
- C1

Optional fields:

- minimum useful level;
- maximum useful level;
- difficulty within level.

### 5.2 Domain

Each item contains:

- one primary domain;
- zero or more permitted secondary domains;
- optional excluded domains or situations.

An item must not be reused in an unsuitable context merely because its literal meaning is similar.

### 5.3 Communicative function

Examples:

- introducing yourself;
- asking follow-up questions;
- describing responsibilities;
- expressing preferences;
- explaining a problem;
- clarifying;
- reformulating;
- agreeing;
- disagreeing;
- interrupting politely;
- making requests;
- apologising;
- handling complaints;
- recommending;
- speculating;
- expressing uncertainty;
- buying time;
- correcting yourself;
- concluding an answer.

### 5.4 Topic

Examples:

- work;
- family;
- food;
- travel;
- meetings;
- interviews;
- hotels;
- restaurants;
- education;
- technology;
- emotions;
- health;
- daily life.

### 5.5 Register

- informal;
- neutral;
- professional;
- formal.

### 5.6 Usage channel

- spoken;
- written;
- both.

### 5.7 Frequency and priority

- essential;
- high frequency;
- useful;
- specialised;
- advanced or low frequency.

This field is especially important for A0 and A1 starter packs.

## 6. Word item structure

Each Word Trainer item must support the following fields.

### Required fields

- unique ID;
- target word or lexical item;
- level;
- Italian meaning;
- English definition;
- part of speech;
- primary domain;
- topic;
- frequency or priority;
- publication status.

### Recommended fields

- British spelling;
- American spelling;
- pronunciation guide;
- human-recorded audio;
- word family;
- common collocations;
- common prepositions;
- three natural examples;
- common mistakes;
- false-friend note;
- related words;
- opposites;
- register;
- spoken or written usage;
- permitted secondary domains;
- excluded contexts;
- grammar pattern;
- related course units;
- teacher notes;
- content-review notes.

### Example count

A normal published item should contain three reviewed examples.

The examples should:

- use different contexts where possible;
- sound natural;
- show realistic grammar;
- avoid repeating the same sentence structure;
- avoid generic filler sentences.

## 7. Expression item structure

Each Expression Trainer item must support the following fields.

### Required fields

- unique ID;
- target expression;
- level;
- Italian meaning;
- English explanation;
- communicative function;
- primary context or domain;
- register;
- publication status.

### Recommended fields

- pronunciation guide;
- human-recorded audio;
- permitted secondary contexts;
- excluded or inappropriate contexts;
- spoken or written usage;
- tone;
- grammar pattern;
- three natural examples;
- realistic situations;
- suitable responses;
- incorrect or unsuitable alternatives;
- common Italian interference;
- more formal alternative;
- less formal alternative;
- related expressions;
- related course units;
- teacher notes;
- content-review notes.

Expressions must be classified pragmatically, not only grammatically.

## 8. Content publication workflow

Every content item has one of these statuses:

1. Draft
2. Review needed
3. Approved
4. Published
5. Archived

Only published items appear for learners.

Generated or batch-drafted content may never be published without review.

### Versioning

Minor corrections can update the current item.

Examples:

- typo;
- punctuation;
- clearer translation;
- corrected audio label.

Major changes create a new item version.

Examples:

- changed target answer;
- changed level;
- changed communicative function;
- changed exercise logic;
- changed contexts;
- substantial example replacement.

Assignments already in progress must not change unpredictably.

## 9. Collections and groups

The Trainer must support several grouping methods.

### 9.1 Individual selection

The administrator manually selects one or more items.

This is useful for words or expressions that emerged during a lesson.

### 9.2 Temporary custom group

The administrator selects items and assigns them without saving a permanent collection.

Example:

> Words from Marco's lesson on 14 July

### 9.3 Reusable collection

A permanent named set that can be assigned repeatedly.

Examples:

- A0 Essential Verbs
- A0 Classroom Language
- A1 Daily Routine Verbs
- A1 First 50 Expressions
- B1 Meeting Clarification
- Hotel Reception Check-in
- Sommelier Vocabulary
- Common Italian False Friends

### 9.4 Sequenced learning pack

A collection with a deliberate item order.

It contains:

- item sequence;
- number of items introduced per session;
- optional prerequisites;
- unlock rules;
- applied-practice release rules.

Example:

#### A0 Essential English

Pack 1:

- be;
- have;
- live;
- work;
- like.

Pack 2:

- go;
- come;
- do;
- make;
- want;
- need.

### 9.5 Filter-generated group

The administrator creates a group using filters.

Example:

- level: A0 or A1;
- type: verb;
- priority: essential;
- domain: General English;
- topic: daily life.

The administrator can save this as:

- a fixed snapshot;
- a reusable dynamic collection.

Assignments should normally use fixed snapshots so that later database changes do not silently alter existing student work.

## 10. Introducing new items

Not every learner should receive the same first interaction.

Each item assignment can begin in one of these states:

- new and unexplained;
- introduced in class;
- already familiar;
- review only;
- test immediately.

### New and unexplained

The learner receives a short introduction containing:

- target item;
- meaning;
- pronunciation;
- one example;
- essential usage information;
- one important mistake where relevant.

The learner then begins with recognition.

### Introduced in class

The full teaching screen is skipped or shortened.

The learner begins with:

- active recall;
- reconstruction;
- contextual selection.

### Already familiar

The learner receives a quick placement test for the item.

### Review only

The item enters the SRS queue based on an administrator-selected starting interval.

### Test immediately

The learner is tested without prior presentation.

This is useful for diagnostics and existing knowledge checks.

## 11. SRS memory system

The SRS system answers:

> Can the learner remember this item after time has passed?

It remains separate from applied performance.

### 11.1 Review ratings

The learner uses:

- Again
- Hard
- Good
- Easy

### 11.2 Hybrid evaluation

The schedule considers:

- self-rating;
- objective correctness;
- response history;
- lapse count;
- review interval;
- item difficulty.

An objectively incorrect response cannot be treated as fully mastered even if the learner selects Easy.

### 11.3 Review queues

Word and Expression queues are separate by default.

The learner may also select a mixed review session.

### 11.4 New-item limits

Recommended options:

- 5 new items;
- 10 new items;
- 15 new items.

The learner may choose within an administrator-defined range.

Assigned packs may use a fixed number.

### 11.5 Mastery

An item becomes SRS-mastered only after repeated successful retrieval across sufficiently long intervals.

Mastery is not based on:

- one correct answer;
- one session;
- a fixed raw review count.

### 11.6 Item states

- new;
- introduced;
- learning;
- reviewing;
- due;
- strong;
- mastered;
- lapsed;
- suspended.

## 12. Applied-practice system

The applied system answers:

> Can the learner select and use this language correctly in context?

It records:

- correctness;
- response time;
- attempts;
- hints used;
- exercise difficulty;
- context type;
- recognition versus production;
- partial correctness;
- repeated error patterns.

Applied performance may influence item difficulty, but it does not replace the SRS schedule.

## 13. Word Trainer exercise modes

### Mandatory modes

#### Recognition

English word to meaning or definition.

#### Reverse recall

Italian meaning or English definition to English target.

#### Context selection

Choose the correct word in a realistic sentence.

#### Collocation selection

Choose a natural word combination.

#### Gap fill

Complete a sentence with the target word.

#### Word form

Produce or select the correct word-family form.

#### Confusable words

Distinguish similar or commonly confused vocabulary.

#### False-friend correction

Identify and correct Italian interference.

#### Sentence reconstruction

Reorder sentence components.

#### Guided production

Use the word in a written or spoken response.

## 14. Expression Trainer exercise modes

### Mandatory modes

#### Recognition

Expression to meaning.

#### Intention-to-expression recall

Produce the expression from a communicative intention.

#### Situation selection

Select the expression appropriate to a situation.

#### Register selection

Choose the correct level of formality.

#### Expression completion

Complete a missing component.

#### Expression reconstruction

Rebuild the expression from parts.

#### Appropriate response

Choose the best response to a prompt.

#### Dialogue completion

Use the expression inside an exchange.

#### Error correction

Correct an unnatural or incorrect expression.

#### Guided production

Respond to a situation using suitable language.

## 15. Answer evaluation

### Correct

The target language is accurate and appropriate.

### Nearly correct

Used when:

- punctuation is missing;
- capitalisation is incorrect;
- spelling is minor but meaning remains clear;
- the answer is structurally correct with a small mechanical issue.

Nearly correct counts as successful for some exercises but generates feedback.

### Incorrect

Used when:

- grammar changes the meaning;
- the wrong item is used;
- the response is pragmatically inappropriate;
- the essential structure is missing.

### Explanations

Correct answers receive brief confirmation.

Incorrect and nearly correct answers receive fuller explanations.

## 16. Response time

Response time is recorded during applied activities.

Visible timers are used only in specific modes, such as:

- fluency practice;
- interview simulation;
- timed response;
- rapid retrieval.

Normal practice should not feel constantly pressured.

## 17. Assignment eligibility

Assignments are available only to learners with an active teaching relationship.

Eligible groups:

- Preply students;
- public cohort students;
- company cohort students;
- private-programme students.

Free, Core and Complete subscribers do not receive teacher assignments unless they also belong to one of these groups.

Only the administrator can create and publish assignments.

## 18. Assignment content

The administrator can assign:

- individual words;
- individual expressions;
- manually selected groups;
- saved collections;
- sequenced packs;
- filtered groups;
- Word Trainer sessions;
- Expression Trainer sessions;
- SRS review sessions;
- applied-practice sets;
- speaking tasks;
- writing tasks;
- future English Foundations activities.

## 19. Assignment structure

Each assignment contains:

- title;
- student or cohort;
- content references;
- teacher note;
- reason;
- required or optional status;
- deadline;
- estimated duration;
- completion rule;
- related lesson;
- related course or cohort;
- publication date;
- access-expiration rule.

### Completion rules

The administrator selects one or more:

- open all required content;
- review all items;
- complete a defined number of reviews;
- reach an accuracy threshold;
- complete applied exercises;
- submit a speaking task;
- submit a writing task;
- pass a final activity.

## 20. Individual and cohort assignments

### Individual assignment

Used for:

- Preply learners;
- private learners;
- individual remediation;
- missed cohort content.

### Cohort assignment

Assigned to the entire group.

The administrator can create individual exceptions without duplicating the complete cohort assignment.

Example:

- additional task for one learner;
- extended deadline;
- alternative activity;
- omitted task;
- extra remediation.

## 21. Suggested assignments

The system may suggest an assignment based on recurring mistakes.

It may not automatically publish teacher assignments.

The administrator can:

- accept;
- modify;
- assign to selected learners;
- assign to the cohort;
- reject.

## 22. Student assignment dashboard

Eligible learners see:

### Assigned by Rhema

- due before next lesson;
- this week;
- overdue;
- optional;
- completed.

Each assignment explains why it was assigned.

Examples:

> Preparation for your next Preply lesson.

> Assigned after difficulty with question formation.

> Week 3 preparation for Business English Flow.

## 23. Administrator assignment workflow

The intended workflow is:

```text
Students or cohorts
-> select learner or group
-> create assignment
-> choose existing items or collections
-> add applied tasks
-> select completion rule
-> add deadline and note
-> preview
-> publish
```

Items must be referenced, not duplicated.

## 24. Student progress

### Learner view

The learner sees understandable information:

- reviews due;
- items learned;
- items becoming strong;
- assignments;
- completion;
- recent accuracy;
- weak areas;
- improvement;
- current streak where useful.

### Administrator view

The administrator sees:

- assignments completed;
- completion dates;
- last activity;
- SRS lapses;
- active-recall accuracy;
- contextual accuracy;
- response time;
- difficult items;
- recurring mistakes;
- speaking or writing submission status;
- confidence level of each inferred issue.

## 25. Recurring mistakes

Mistakes may originate from:

- objectively scored exercises;
- repeated SRS difficulty;
- response-time patterns;
- self-report;
- teacher observations;
- speaking submissions;
- writing submissions.

Each mistake contains:

- error category;
- source;
- confidence;
- frequency;
- recency;
- related item;
- related grammar pattern;
- remediation status.

### Confidence levels

#### High confidence

Examples:

- repeated objectively incorrect answers;
- final assessment evidence;
- teacher-confirmed recurring problem.

#### Medium confidence

Examples:

- one teacher observation;
- repeated hesitation;
- one reviewed submission;
- repeated self-correction.

#### Low confidence

Examples:

- self-reported difficulty;
- one uncertain response;
- skipped activity;
- limited evidence.

### Mistake lifecycle

- detected;
- strengthened or confirmed;
- assigned remediation;
- practised;
- reassessed;
- resolved;
- reactivated if it returns.

A mistake is resolved only after repeated successful performance in both review and applied contexts.

## 26. Administrator content studio

The initial Trainer admin area contains:

```text
/admin/trainer
|-- Dashboard
|-- Words
|-- Expressions
|-- Collections
|-- Exercises
|-- Assignments
|-- Students
|-- Imports
|-- Quality review
`-- Trainer settings
```

The administrator can:

- create;
- edit;
- duplicate;
- preview;
- publish;
- archive;
- search;
- filter;
- bulk edit;
- select multiple items;
- connect related items;
- add items to collections;
- assign selected content.

## 27. Spreadsheet import

Bulk production uses spreadsheet import.

### Import process

1. Download a template.
2. Edit content in Google Sheets or Excel.
3. Upload CSV or XLSX.
4. Validate rows.
5. Display errors and warnings.
6. Preview additions and changes.
7. Import as Draft or Review needed.
8. Review in the admin panel.
9. Approve and publish.

### Import validation

The system checks:

- duplicate IDs;
- duplicate targets;
- missing required fields;
- invalid levels;
- invalid categories;
- missing meanings;
- repeated examples;
- broken related-item references;
- unsuitable publication states;
- invalid collection references;
- incorrect answer structure;
- missing correct answers;
- identical distractors.

Warnings may flag:

- generic examples;
- excessively long definitions;
- questionable level;
- weak distractors;
- missing context restrictions;
- repeated sentence templates.

## 28. Exercise creation

Simple exercises may be generated from approved item data.

Examples:

- meaning recognition;
- reverse recall;
- basic gap fill;
- reconstruction.

Nuanced activities should be manually reviewed or authored.

Examples:

- response selection;
- register choice;
- professional scenarios;
- hospitality complaints;
- interview responses;
- context-sensitive distractors.

No automatically generated exercise should be published without valid reviewed source data.

## 29. Learner access tiers

### Free

Includes:

- fixed A2 Word Trainer collection;
- fixed A2 Expression Trainer collection;
- basic SRS;
- selected applied modes;
- saved progress.

### Core

Includes:

- complete general Word Trainer;
- complete general Expression Trainer;
- general SRS;
- general applied practice;
- progress tracking;
- recurring-mistake tracking.

### Complete

Includes:

- everything in Core;
- Business English;
- Hospitality English;
- Interview English;
- advanced scenarios;
- deeper personalisation;
- specialist collections;
- limited human feedback under defined limits.

### Taught-programme access

Includes only:

- assigned content;
- assigned reviews;
- assigned applied activities;
- assignment dashboard;
- teacher-visible progress;
- related submissions.

This applies to Preply, cohort, company and private learners.

## 30. End of teaching relationship

When a teaching relationship ends:

The learner keeps:

- account;
- progress history;
- assignment history;
- mastery data;
- mistake history;
- free content.

The learner loses:

- new teacher assignments;
- teacher supervision;
- assigned paid content after the entitlement expires;
- programme-specific feedback.

The learner may retain trainer access through:

- one-time purchase;
- annual Core subscription;
- annual Complete subscription.

When access is purchased later, previous progress and review history must be restored automatically.

## 31. One-time purchase

The architecture supports permanent access to a defined trainer product.

Possible products:

- General Word Trainer;
- General Expression Trainer;
- combined general trainer;
- A0-A2 starter bundle;
- Hospitality collection;
- Business collection;
- Interview collection.

A one-time purchase does not automatically include:

- unlimited human feedback;
- future cohort assignments;
- all future specialist products;
- every future premium feature.

The exact commercial package can be decided later.

## 32. Initial release content target

The system must support at least:

- 1,000 words;
- 1,000 expressions;
- thousands of exercise instances;
- multiple collections;
- A0 to C1;
- all initial domains.

The first serious release does not need all 2,000 items published.

Recommended first production target:

- 500 reviewed words;
- 500 reviewed expressions;
- strong General, Business, Hospitality and Interview coverage;
- several reviewed starter packs;
- sufficient activity variation.

Content quality takes priority over raw quantity.

## 33. Migration rules

Existing content receives one classification:

- Keep
- Keep but edit
- Rewrite
- Remove

Existing content should not be imported automatically without review.

Priority should be given to:

- strong Hospitality items;
- useful general expressions;
- useful business expressions;
- valid vocabulary records;
- existing SRS logic;
- existing level and category data.

Generic examples, duplicated structures and weak translations must be corrected before publication.

## 34. Technical principles

The Trainer must use:

- persistent database storage;
- learner accounts;
- administrator authentication;
- cross-device progress;
- reusable content references;
- entitlement-based access;
- separate SRS and applied-performance records;
- versioned content;
- validated imports.

It must not rely on:

- large hardcoded JavaScript content files;
- browser-only progress;
- copied items for every collection;
- separate duplicated trainer applications;
- administrator code edits for normal content creation.

## 35. Initial implementation boundaries

The first Trainer build does not need:

- Stripe billing;
- automatic speech scoring;
- multiple teacher accounts;
- full English Foundations;
- complete cohort management;
- advanced marketing-page editing;
- AI-generated voice;
- automatic teacher assignment publishing.

The first build must support manual access assignment while testing with Preply students.

## 36. Definition of complete

The Trainer is considered production-ready when the following work.

### Learner functionality

- account login;
- Word Trainer;
- Expression Trainer;
- SRS;
- applied practice;
- assignments for eligible learners;
- progress dashboard;
- recurring mistakes;
- mobile support;
- cross-device persistence.

### Administrator functionality

- create and edit words;
- create and edit expressions;
- spreadsheet import;
- collection creation;
- sequenced packs;
- item selection;
- exercise creation;
- assignment creation;
- student progress review;
- publication workflow;
- content preview;
- archive and version handling.

### Access functionality

- Free access;
- Core access;
- Complete access;
- taught-programme assigned access;
- access expiration;
- preserved progress;
- future one-time purchase support.

### Quality requirements

- no unreviewed generated content;
- no broken assignment references;
- no duplicate progress records;
- no paid-content leakage;
- no learner data loss;
- clear mobile navigation;
- clear explanation of every task;
- meaningful progress reporting.

## 37. Build order

### Phase 1: Content model and database schema

Create:

- user records;
- words;
- expressions;
- categories;
- collections;
- collection items;
- item versions;
- publication statuses;
- entitlements;
- students;
- teaching relationships.

### Phase 2: Administrator content studio

Create:

- word editor;
- expression editor;
- search;
- filters;
- multi-select;
- preview;
- publishing;
- archive;
- spreadsheet import.

### Phase 3: Core learner Trainer

Create:

- Word Trainer;
- Expression Trainer;
- SRS review queues;
- new-item introductions;
- persistent progress;
- mixed review option.

### Phase 4: Applied practice

Create:

- reverse recall;
- context selection;
- gap fill;
- reconstruction;
- response selection;
- error correction;
- response-time recording;
- nearly-correct handling.

### Phase 5: Collections and beginner packs

Create:

- reusable collections;
- temporary groups;
- sequenced packs;
- A0 starter system;
- administrator-created filtered groups.

### Phase 6: Assignments

Create:

- Preply relationships;
- cohort relationship model;
- individual assignments;
- group assignments;
- deadlines;
- completion rules;
- learner assignment dashboard;
- administrator reporting.

### Phase 7: Mistake and progress system

Create:

- recurring mistakes;
- confidence levels;
- remediation;
- teacher observations;
- learner progress summaries;
- administrator diagnostic view.

### Phase 8: Access and commercial readiness

Create:

- Free;
- Core;
- Complete;
- taught-programme access;
- expiry rules;
- one-time trainer entitlement;
- annual subscription entitlement.

Billing integration can follow after access logic is tested.

## 38. Immediate next deliverables

Before Codex writes code, the following files must be produced:

1. Database entity map
2. Word spreadsheet template
3. Expression spreadsheet template
4. Exercise spreadsheet template
5. Collection and pack template
6. Assignment workflow specification
7. Learner screen map
8. Administrator screen map
9. Migration audit template
10. Codex implementation task sequence

The first file to create is the database entity map and the exact Word and Expression schemas.

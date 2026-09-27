# Sblocco Speaking Presenter UX Redesign Spec

Status: planning branch only. Production remains unchanged.

This document separates two different classes of problems:

1. **Universal presenter problems** — issues caused by the shared learner-facing presentation system.
2. **Game-specific presentation problems** — issues caused by the visual logic of one mechanic.

The redesign must fix the first layer once, then let each game family express its own mechanic without recreating an entirely separate engine.

---

## 1. Current-state diagnosis

The production presenter is technically successful: teacher/controller continuity works, one reusable student window works, challenge privacy is structural, practice history works, and structured speaking rounds render.

The remaining problem is primarily presentational.

The current learner screen assumes a mostly universal composition:

- learner greeting;
- activity heading and intro;
- progress counter;
- large dark prompt panel;
- optional generic student support;
- always-reserved challenge area when a challenge exists;
- right rail containing activity-level steps and useful language;
- learner-facing Previous / Random / Next controls.

That shell is too opinionated. It causes activities with radically different mechanics to look and feel like the same exercise with different text.

The redesign must preserve the reliable live-control/session architecture while replacing the generic visual composition.

---

# PART A — UNIVERSAL PRESENTER CONTRACT

## 2. Principle

The learner screen is a **presentation surface**, not the control surface.

The teacher controls the live lesson. The student screen communicates the current task with the minimum amount of information required to speak successfully.

The presentation system must therefore be:

- mechanic-led rather than schema-led;
- low-clutter;
- context-aware;
- passive while teacher-controlled;
- structurally safe for hidden/reveal-later content;
- responsive to content density;
- visually consistent with Sblocco without forcing identical layouts.

---

## 3. Universal rules

### U1. Teacher owns progression during a live controlled session

When a valid `controlId` is present, the learner screen must not show:

- Previous;
- Random;
- Next.

Arrow-key learner navigation should also be disabled in controlled mode.

The teacher controller remains the source of progression commands.

A standalone presenter opened without a controller may retain fallback navigation for testing or independent use. This preserves utility without duplicating controls during lessons.

### U2. Unrevealed challenge means no learner UI

Before reveal, do not render an empty challenge card and do not explain the implementation.

Remove messages such as:

> Your teacher can reveal an extra challenge from the control panel.

When the teacher reveals a challenge, the challenge block appears as a new visual state. When moving to another item, it disappears again.

The learner should experience the reveal, not read about the reveal mechanism.

### U3. Support is conditional, item-first, and task-specific

Support priority:

1. structured round `support[]`;
2. item-level `student_support`;
3. activity-level `useful_language` only when explicitly appropriate to the presenter family.

Activity-level useful language must not automatically occupy the right rail for every item. The screenshot of The Forbidden Easy Word shows why: generic "advantage / drawback" language can be grammatically fine yet pedagogically irrelevant to the current prompt.

If no relevant support is authored, render no support UI.

### U4. Activity steps are not universal content

`student_steps` should only appear when the mechanic genuinely has stages the learner needs to remember.

Do not show step lists for self-evident mechanics such as:

- The Forbidden Easy Word;
- Don’t Say Yes;
- Explain It Without Saying It;
- simple prompt/response rounds.

Multi-stage activities such as Problem → Options → Decision, Complaint Ladder or Before / During / After may still use steps.

### U5. No permanently reserved right rail

The presenter must choose layout based on actual content.

Possible shells:

- full-width focal;
- focal + compact support rail;
- two-column comparison;
- dialogue stack;
- image grid;
- multi-card decision grid.

If the current game does not need secondary content, the focal content expands to use the available width.

### U6. Compact universal header

The top area should remain recognisably Sblocco but consume less lesson space.

Preferred hierarchy:

- compact learner/avatar greeting;
- activity title;
- small progress indicator.

The activity description is optional and should disappear when it merely repeats the game mechanic already obvious from the screen.

### U7. One focal question: what must the learner notice first?

Every presenter family must identify a single primary visual object:

- banned words;
- situation;
- dialogue;
- choices;
- image set;
- bad/good contrast;
- timer/task;
- story seed.

That focal object receives the strongest hierarchy.

### U8. Support reveals should not rearrange the whole screen dramatically

Teacher "Show support" should add support adjacent to the focal task without destroying orientation.

Preferred behavior:

- compact reveal underneath;
- support drawer/rail;
- chips;
- small phrase cluster.

Avoid replacing the core prompt or shifting it off-screen.

### U9. State reset remains universal

On Next / Previous / Random / activity switch:

- hide support;
- hide revealed challenge;
- reset family-specific temporary reveal state;
- preserve session/history continuity.

This existing behavior is correct and should remain.

### U10. Privacy remains structural

Never place these in the initial learner payload:

- teacher notes;
- teacher private role cues;
- answer keys;
- hidden rule;
- secret option;
- teacher interpretation;
- unrevealed challenge text.

The redesign must not regress the existing secure presenter RPC behavior.

---

## 4. Presenter architecture

Do not create a new page per game.

Keep one `SpeakingActivityPresenter`, but split presentation decisions into a canonical presenter registry.

Suggested architecture:

```
SpeakingActivityPresenter
  -> SpeakingPresenterShell
  -> resolvePresenterFamily(activity, item)
  -> family renderer
  -> universal SupportReveal
  -> universal ChallengeReveal
```

Recommended registry concept:

```js
{
  family: 'constraint_focus',
  variant: 'forbidden_words',
  showActivitySteps: false,
  allowActivityLanguageFallback: false,
  controlledLearnerNavigation: false,
  density: 'focused'
}
```

Do not spread title-specific conditionals across JSX. One registry should determine presentation behavior.

Structured `speaking_round` formats keep their structured contract but resolve into the same family system.

---

# PART B — PRESENTER FAMILIES

The 59 Speaking Library activities do not need 59 unrelated renderers. They need a small set of strong display families with specific variants.

## 5. Family F1 — Constraint Focus

Visual grammar:

- large task/topic;
- highly visible constraint tokens;
- minimal secondary explanation;
- optional support under the task;
- challenge appears only after reveal.

Best for lexical or rule pressure.

Activities:

- Explain It Without Saying It
- Don’t Say Yes
- The Forbidden Easy Word
- Use These 3 Chunks
- Describe Without Adjectives

Variants:

- forbidden words;
- banned response;
- required chunks;
- lexical restriction.


## 6. Family F2 — Situation + Response

Visual grammar:

- compact scenario;
- relationship/role if needed;
- one clear objective;
- large "What would you say/do?" action zone;
- support shown only on request.

Activities:

- Bad Advice Only
- What Would You Say?
- Emergency English
- Interrupt Me Politely
- Micro Roleplay
- The Awkward Silence
- The Missing Detail
- Keep It Going

Variants:

- response;
- repair;
- interruption;
- service;
- roleplay.

## 7. Family F3 — Dialogue + Inference

Visual grammar:

- dialogue is primary;
- speaker turns visually separated;
- inference question directly below;
- optional evidence/follow-up;
- no generic instruction rail.

Activities:

- Conversation Detective
- Who Said It?
- Tell Me What I Mean
- What Happened Just Before?
- The Missing Question
- What's the Problem?
- Guess My Rule
- What Are You Assuming?
- One Detail Is False

Variants:

- dialogue inference;
- clue inference;
- preceding-event inference;
- hidden rule.

## 8. Family F4 — Choice + Trade-off

Visual grammar:

- comparable option cards;
- consistent criteria;
- decision prompt;
- optional stakeholder/constraint;
- complication reveal overlays or updates the choice space.

Activities:

- Would You Rather — No Easy Answers
- Trade-Off
- Problem → Options → Decision
- Build the Perfect...
- Explain Your Choice to Someone Who Disagrees
- Conversation Fork
- Agree, Disagree, It Depends
- Take a Side
- Defend the Opposite
- Change My Mind
- Convince Me
- Unpopular Opinion
- Explain the Difference
- Phrase Auction
- Odd One Out — Conversation Edition
- Which One Sounds More Natural?

Variants:

- binary choice;
- multi-option decision;
- stance;
- ranking/evaluation;
- odd-one-out.

## 9. Family F5 — Transform + Repair

Visual grammar:

- source utterance/example clearly distinguished;
- learner task is visible as an action label;
- before/after or bad/better structure where appropriate;
- avoid giant generic dark prompt block.

Activities:

- Make It Sound Like a Person
- Repair the Conversation
- Upgrade That Answer
- The Better Question
- Say It Three Ways
- Make It More Specific
- Personalise It
- Make It Less Direct
- Make It More Direct
- Bad Small Talk / Good Small Talk

Variants:

- rewrite;
- repair;
- register shift;
- expansion;
- before/after comparison.

## 10. Family F6 — Timed / Rapid Fluency

Visual grammar:

- task is concise and central;
- time pressure is visually explicit only where the game truly uses time;
- very little surrounding UI;
- optional prompt cues.

Activities:

- You Have 30 Seconds
- One Minute, No Escape
- Conversation Roulette
- Finish My Thought
- The Unexpected Follow-Up
- Five Whys
- Three Questions Deeper

Variants:

- timer;
- rapid response;
- question ladder;
- follow-up ladder.

## 11. Family F7 — Build / Story / Sequence

Visual grammar:

- seed or event is primary;
- sequence/twist appears separately;
- stages can be visually progressive;
- challenge can introduce a new event.

Activities:

- Story Chain — But Something Changes
- Before / During / After
- Sell Me Something Useless

Variants:

- story seed;
- sequencing;
- creative build/pitch.

Sell Me Something Useless can also borrow persuasion styling from F4; the registry should choose the dominant learner action, not force taxonomy purity.

## 12. Family F8 — Visual Identification

Visual grammar:

- images dominate;
- question/task compact;
- labels optional by level;
- support secondary;
- no large text panel competing with images.

Activities:

- Picture Detective
- future image-led A0/A1 variants.

This family should be reusable by any future speaking activity whose main information channel is visual.

---

# PART C — BENCHMARK REDESIGN SPECS

These benchmark games define the visual language for the rest.

## 13. The Forbidden Easy Word

### Problem classification

Universal problems currently visible:

- learner-side navigation duplicates teacher control;
- unrevealed challenge placeholder consumes space;
- right rail is always reserved;
- activity-level useful language can be irrelevant;
- universal dark prompt container is too dominant.

Game-specific problems:

- banned words are not visually dominant enough;
- task and constraint are fused;
- the game feels like a slide instead of a pressure mechanic;
- generic steps over-explain a simple rule.

### Target composition

Header:
- compact learner greeting;
- "The Forbidden Easy Word";
- progress pill.

Main:
- small label: YOUR TOPIC;
- large prompt;
- short clarifier if authored;
- separate label: DON'T SAY;
- 2-5 large forbidden word chips/cards.

Support:
- hidden by default;
- when revealed, show item-specific phrase stems directly under the prompt;
- no activity-wide advantage/drawback fallback.

Challenge:
- no placeholder;
- when revealed, animate/add a compact orange challenge band below constraints.

Controlled mode:
- no Previous / Random / Next.

### Visual intent

The banned words should be the playful object of attention.

Do not place the whole task inside a giant nearly-empty navy rectangle.

Use navy as emphasis, not as a mandatory full-screen slab.

---

## 14. Make It Sound Like a Person

### Mechanic

Transform stiff, robotic or over-literal English into natural conversational English.

### Target composition

Primary object:
- source sentence in a clearly labelled "TOO ROBOTIC" or "ORIGINAL" block.

Action:
- one concise instruction: "Say it like a real person."

Optional support:
- tone clue;
- relationship;
- one naturalness hint.

Do not show the answer by default.

If an authored comparison uses BAD:/GOOD:, reserve that explicit two-card comparison for review/teaching moments where the GOOD version is intentionally visible. The normal production round should not accidentally give the learner the target answer.

Challenge examples:
- "Now make it warmer."
- "Now say it to your manager."
- "Now make it shorter."

Visual family:
- F5 Transform + Repair.

---

## 15. Conversation Detective

### Mechanic

Infer relationship, context, intention, pressure or likely next move from conversational evidence.

### Target composition

Primary object:
- dialogue stack with distinct speaker labels and readable turn spacing.

Below dialogue:
- one inference question.

Optional:
- small follow-up question;
- support reveal with evidence prompts.

Teacher-only:
- hidden clue;
- accepted interpretation.

Challenge:
- reveal a new clue;
- ask learner to revise interpretation;
- predict next line.

Do not:
- put dialogue inside one undifferentiated paragraph;
- show a generic "Your task" rail;
- expose interpretation;
- treat one ambiguous reading as absolute if the authored teacher note allows alternatives.

Visual family:
- F3 Dialogue + Inference.

---

## 16. What Would You Say?

### Mechanic

Produce natural language for a concrete social or professional moment.

### Target composition

Primary object:
- situation card with only relevant context.

Then:
- strong action line: "What would you say?"

If relationship matters:
- small role chips such as YOU / HOTEL RECEPTIONIST.

Support reveal:
- 2-4 task-specific functional chunks.

Challenge:
- the other person resists, misunderstands or changes the condition.

Do not:
- drown the scenario in four numbered instructions;
- give a near-complete answer as support;
- use a generic phrase bank unrelated to the situation.

Visual family:
- F2 Situation + Response.

---

## 17. Picture Detective

### Mechanic

Use visual options to generate questions, descriptions and identification.

### Target composition

Primary object:
- image grid, 3-6 options;
- large enough to inspect from a shared screen.

Header task:
- concise: "Find the secret picture."

For A0/A1:
- labels can be shown when they help lexical access without destroying the game.

Support:
- question stems shown only on request.

Teacher-only:
- secret option.

Challenge:
- learner chooses a secret image and teacher guesses;
- yes/no questions only;
- describe without naming.

Do not:
- use a giant text panel above the imagery;
- reveal the secret via alt text or visual styling;
- render tiny images.

Visual family:
- F8 Visual Identification.

---

## 18. Make the Choice

### Mechanic

Compare defensible options and negotiate a decision.

### Target composition

Primary object:
- 2-4 option cards in a consistent grid;
- matching criteria rows across cards.

Above:
- brief situation;
- explicit decision objective.

Below:
- "Choose one. Be ready to defend it."

Support:
- comparison/priority chunks only if requested.

Challenge:
- teacher reveals new constraint;
- option card can update/highlight changed criterion;
- learner revisits decision.

Do not:
- put options into prose;
- create one obviously superior choice;
- reserve unrelated right-rail instructions.

Visual family:
- F4 Choice + Trade-off.

---

# PART D — UNIVERSAL CONTENT RULES EXPOSED BY THE SCREENSHOT

## 19. Activity-wide useful language is not automatically presentation-safe

The current presenter loads `activity.useful_language` and displays it whenever it exists.

That is too broad.

New behavior:

- item-level support wins;
- structured support wins;
- activity-level useful language is fallback only for families configured to use it;
- if the phrase bank conflicts with the current item, render nothing rather than irrelevant help.

Long-term authoring improvement:

activity-wide language should describe genuinely universal language for that game, while item-specific support carries contextual phrases.

---

## 20. student_steps need capability semantics

Current storage can remain for compatibility, but the presenter should not treat existence as a command to render.

Registry controls whether steps are:

- hidden;
- compact;
- prominent;
- stage-based.

This prevents simple games from looking instructional and heavy.

---

# PART E — IMPLEMENTATION PLAN

## 21. Phase 1 — universal shell cleanup

Change only the presenter layer.

- hide learner navigation when `controlId` exists;
- disable arrow navigation in controlled mode;
- remove unrevealed challenge placeholder;
- collapse empty right rail;
- make header more compact;
- support item-level content first;
- stop unconditional activity-wide useful-language rendering.

No database migration required for this phase.

## 22. Phase 2 — canonical presenter family registry

Add one source of truth, e.g.:

`src/lib/speakingPresenterRegistry.js`

It should define:

- supported families;
- title/activity mapping;
- fallback behavior;
- whether activity steps render;
- whether activity useful-language fallback is allowed;
- density and shell mode;
- variant.

Avoid ad hoc title checks inside components.

## 23. Phase 3 — benchmark family renderers

Implement and visually verify:

1. Constraint Focus using The Forbidden Easy Word.
2. Transform + Repair using Make It Sound Like a Person.
3. Dialogue + Inference using Conversation Detective.
4. Situation + Response using What Would You Say?
5. Visual Identification using Picture Detective.
6. Choice + Trade-off using Make the Choice.

These six are sufficiently different to validate the architecture.

## 24. Phase 4 — map remaining games

Map all remaining activities to the family registry.

Only introduce a new family when an existing one genuinely cannot express the mechanic.

Do not create special JSX for a one-off game unless the mechanic requires it.

## 25. Phase 5 — authoring alignment

Update the speaking authoring kit so presentation-sensitive activities explain the data their family needs.

Examples:

- constraint words should be structurally authored where possible;
- roleplay should identify role and objective;
- dialogue games should preserve turns;
- choices should use option structures;
- image games must use real image assets.

Partially structured legacy items may still render through compatibility adapters.

## 26. Phase 6 — browser acceptance

Authenticated teacher + student-window QA must verify:

- one reusable student window;
- teacher controller remains operational;
- learner controls absent in controlled mode;
- support reveal works per family;
- challenge is absent before reveal and visible after reveal;
- next/random resets temporary reveals;
- switching activities keeps the same student window;
- all active learners remain selectable;
- practice confirmation/undo still works;
- no teacher-private data appears in the student payload;
- all benchmark layouts fit typical laptop/projector widths without internal confusion.

---

# PART F — ACCEPTANCE STANDARD

The redesign is successful when:

- a learner can understand the speaking mechanic within a few seconds;
- the dominant visual element matches the mechanic;
- the teacher, not the learner, drives the live sequence;
- optional help never competes with the core task;
- unrevealed material leaves no dead UI;
- games feel visually distinct without feeling like different products;
- Sblocco remains airy, editorial, orange/navy/cream and not generic SaaS;
- beginner layouts are visually supportive without becoming childish;
- no privacy, session, history or live-control regression is introduced.

---

# PART G — NON-GOALS

This redesign does not require:

- a new speaking engine;
- a separate page per game;
- a database-first admin rewrite;
- reimplementing session tracking;
- changing the one-window live-control architecture;
- weakening the current secure reveal-later behavior.

The correct scope is the presenter layer plus canonical presentation metadata.


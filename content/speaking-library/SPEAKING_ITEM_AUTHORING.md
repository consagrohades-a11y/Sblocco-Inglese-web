# Sblocco Inglese — Speaking Library Item Authoring Guide

This file is the canonical instruction set for generating, reviewing and importing new items into the admin Speaking Library.

The goal is not to create generic conversation questions. Every item must activate a specific speaking behaviour: explaining, reacting, negotiating, repairing, asking, persuading, narrating, clarifying, adapting register, or managing a conversation.

## 1. Non-negotiable principles

1. Speaking first. An item must create meaningful spoken output, not worksheet behaviour.
2. One clear mechanism per game. New items must respect the game mechanic instead of turning every activity into a normal discussion question.
3. Multiple CEFR levels are allowed and encouraged. levels is always an array. An item may be ["A2","B1"], ["B1","B2","C1"], etc.
4. Level means usable speaking demand, not vocabulary prestige. Do not label an item C1 simply because it contains an advanced word.
5. Student-facing text must be immediately understandable on screen.
6. Teacher notes may contain expected answers, hidden information, likely language, correction notes or facilitation advice.
7. Support must help without answering.
8. Challenges must change the speaking demand, not merely say “speak more”.
9. Avoid textbook sameness. Prefer situations, trade-offs, interaction and follow-up over broad prompts.
10. Do not manufacture novelty by swapping nouns. If the same response path works almost unchanged, it is probably the same item.

## 2. Item JSON contract

Every generated item should use this shape:

    {
      "text": "The complete prompt/scenario shown to the student.",
      "levels": ["B1", "B2"],
      "student_support": "Optional scaffold visible to the learner.",
      "challenge": "Optional second-stage complication/reveal.",
      "teacher_note": "Private note, solution, expected interpretation or facilitation cue.",
      "context_tags": ["work", "meeting"],
      "language_targets": ["disagreement", "hedging"],
      "difficulty": 3
    }

Required:
- text: non-empty and presentation-ready.
- levels: one or more of A1, A2, B1, B2, C1, C2.
- context_tags: 1–4 short lowercase tags.
- language_targets: 1–4 short lowercase tags.
- difficulty: integer 1–5.

Expected when useful:
- student_support: a route into the task without giving the answer.
- challenge: a second reveal that materially deepens the speaking task.
- teacher_note: solutions, hidden context, likely chunks, ambiguity notes, or facilitation advice.

## 3. Context tags

Prefer stable reusable tags before inventing synonyms:

work, career, meeting, client, management, team, supplier, business, interview, study, learning, travel, airport, hotel, transport, restaurant, service, shopping, housing, money, technology, communication, small-talk, social, relationships, conflict, daily-life, habits, food, hobbies, places, personal, story, values, decision, planning, leadership, feedback, negotiation, formal, pragmatics.

Add a new context tag only if none of these reasonably describes the scenario.

## 4. Language targets

Examples:

questions, follow-up, reactions, extended-answer, storytelling, past-simple, past-tenses, present-perfect, conditionals, comparatives, requests, complaints, refusals, disagreement, agreement, hedging, softening, assertiveness, clarification, repair, negotiation, persuasion, rebuttal, concession, register, pragmatics, indirectness, chunks, phrasal-verbs, collocations, lexical-range, precision, plain-English, topic-development, topic-shift, sequencing, problem-solving, prioritisation, trade-offs, inference, speculation, critical-thinking.

These are pedagogical functions, not random vocabulary topics.

## 5. Difficulty scale

- 1 — immediate: concrete, familiar, little ambiguity, minimal planning.
- 2 — supported: familiar situation but requires reason/example/follow-up.
- 3 — flexible: requires adaptation, comparison, complication or sustained interaction.
- 4 — demanding: requires nuance, register control, multiple constraints or perspective shift.
- 5 — high cognitive/pragmatic load: abstract reasoning, stakeholder adaptation, implied meaning, complex negotiation or advanced discourse control.

Difficulty is separate from CEFR. An A2 item can be difficulty 3. A C1 item does not need to be difficulty 5.

## 6. Context-aware novelty / duplicate policy

The application performs an internal novelty check.

### What IS a duplicate

Block or rewrite when:
- normalized text is identical;
- the prompt is a near-paraphrase with the same communicative task;
- context + language target + prompt structure are substantially the same;
- the scenario has only cosmetic substitutions;
- the same answer path would work with almost no adaptation.

Example to reject inside one problem-solving game:
- “Your flight is cancelled. Ask what your options are.”
- “Your train is cancelled. Ask what alternatives you have.”

If the mechanic and response path are identical, replacing flight with train is not enough novelty.

### What is NOT a duplicate

Repeated words are not duplicates by themselves.

The word deadline may legitimately appear in:
- negotiation about changing a deadline;
- storytelling about missing a deadline;
- clarification about what a deadline means;
- a complaint about repeated deadline failures;
- chunk activation containing meet a deadline.

Likewise work, travel, client, manager, good, or a phrasal verb may recur when context or communicative function changes.

### Generator novelty test

Before returning a new item, ask:
1. Is the situation meaningfully different?
2. Is the learner doing a different communicative action?
3. Does it practise a different language target, or the same target in a meaningfully different context?
4. Would the learner need to adapt their answer rather than reuse the same response?
5. Does the new item add coverage to level, context, difficulty or interaction pattern?

If fewer than 2 answers are yes, rewrite the item.

## 7. Batch-generation rules

When generating a batch for one game:
- default batch size: 8–15;
- do not put more than 30% of the batch in the same context;
- include at least 3 distinct context clusters when the game permits it;
- vary difficulty;
- vary item levels;
- avoid putting the hardest item always last;
- avoid repeating the same grammatical frame across the full batch;
- for B1+, include chunks/phrasal verbs where natural, not decoratively;
- do not make all work items corporate-office items;
- do not make all travel items airport/hotel items;
- do not assume every learner is young, single, extroverted, university educated or office-based;
- keep sensitive personal disclosure optional;
- if an item works only because the teacher already knows the answer, place that information in teacher_note.

For 10 items, aim roughly for:
- 2 easier-entry items;
- 5 core items;
- 2 stretch items;
- 1 unusual/high-value item.

## 8. Student support

Good support narrows the route into speaking:
- “Think about timing, cost and convenience.”
- “React first, then ask a connected question.”
- “Choose where you stand on the line, not only one extreme.”
- “Separate facts from assumptions.”

Bad support answers the task:
- giving the exact response;
- exposing the hidden solution;
- listing all arguments the learner should use.

## 9. Challenge rules

A good challenge adds a second conversational condition:
- new information;
- audience change;
- register change;
- objection;
- time pressure;
- forced compromise;
- banned easy word;
- perspective shift;
- extra constraint;
- unexpected follow-up.

Avoid empty challenges such as “Explain more” unless timing itself is the mechanic.

## 10. Activity-specific generation rules

| Activity | New items must preserve this mechanic |
| --- | --- |
| Odd One Out — Conversation Edition | Four items with a defensible relationship and at least one plausible alternative interpretation; avoid trivia-only categories. |
| Would You Rather — No Easy Answers | Genuine trade-off where both choices have costs; avoid obviously good vs obviously bad. |
| One Minute, No Escape | Topic deep enough for sustained speech plus a useful constraint. |
| Explain It Without Saying It | Target plus 2–4 forbidden words that force circumlocution without making it impossible. |
| Bad Advice Only | Relatable problem where intentionally bad advice can lead to useful repair/discussion. |
| Story Chain — But Something Changes | Strong story seed or twist that can be integrated into an existing narrative. |
| Convince Me | Clear persuasion objective with space for objection handling. |
| The Missing Detail | One important missing detail the learner must identify or ask about. |
| Upgrade That Answer | Short/basic answer that can be improved through specificity, reasons, examples or chunks. |
| Three Questions Deeper | Normal opening question that supports increasingly connected deeper follow-ups. |
| Conversation Roulette | Specific but broad prompts that invite personal answers without requiring sensitive disclosure. |
| Defend the Opposite | Position with two defendable sides; not a factual question with one correct answer. |
| Repair the Conversation | Line that is pragmatically awkward, too direct, unclear or unnatural and can be repaired in context. |
| Agree, Disagree, It Depends | Statement with room for qualification; “it depends” must name the condition. |
| What Happened Just Before? | Intriguing final moment with multiple plausible backstories. |
| Make It Sound Like a Person | Understandable but unnatural English with a clearly more idiomatic alternative. |
| Sell Me Something Useless | Difficult product/service paired with an audience whose needs make persuasion non-obvious. |
| The Missing Question | Answer that allows one or more natural questions; avoid answers so broad that anything fits. |
| Take a Side | Two meaningful poles on one continuum; midpoint must also be defendable. |
| Change My Mind | Position that can be challenged with reasons, evidence, examples and concessions. |
| The Better Question | Questions where appropriacy/naturalness differs; not only obvious grammar mistakes. |
| What Would You Say? | Real situation with a concrete interpersonal objective and no single script. |
| Say It Three Ways | One communicative intention that genuinely changes across casual, neutral and professional register. |
| Keep It Going | Conversational line with several connected follow-ups; train reaction + development. |
| The Awkward Silence | Shared context clear enough to restart naturally without random-topic questions. |
| What's the Problem? | Student sees symptoms only; teacher_note contains hidden root cause; questions are needed to uncover it. |
| You Have 30 Seconds | Concrete task small enough for timed retrieval but rich enough to sustain 30–60 seconds. |
| One Detail Is False | Storytelling category that supports believable connected details and follow-up. |
| Build the Perfect... | Construct an ideal version from explicit dimensions, then add constraint/trade-off. |
| Trade-Off | Four to six desirable options but learner may keep only a subset; no universally irrelevant option. |
| Emergency English | Practical high-pressure situation with a specific outcome and escalating complication. |
| The Complaint Ladder | Same problem must work at polite → firm → final-escalation levels. |
| Don’t Say Yes | Question that tempts a binary answer but supports a natural fuller response. |
| Five Whys | Preference/decision/opinion that can deepen into more precise reasons without becoming intrusive. |
| Make It More Specific | Start vague; upgrade requires evidence, examples, behaviour, numbers or precise language. |
| Finish My Thought | Stem that naturally produces a complete personal or hypothetical thought. |
| What Are You Assuming? | Claim with identifiable hidden assumptions; not merely an opinion. |
| Unpopular Opinion | Low-stakes, non-inflammatory topic; challenge is argument quality, not provocation. |
| Explain the Difference | Close lexical/conceptual pair; require contexts/examples, not dictionary definitions only. |
| Which One Sounds More Natural? | Understandable alternatives where idiomaticity, collocation or register differs. |
| The Forbidden Easy Word | Bans that force precision while leaving enough language to complete the task. |
| Use These 3 Chunks | Three chunks that can naturally coexist in one coherent response. |
| Personalise It | Generic statement that must become a concrete personal or invented example. |
| Guess My Rule | teacher_note defines a precise hidden rule plus enough consistent examples for inference. |
| Who Said It? | One line with clues about relationship, context, intention or register. |
| Before / During / After | Event with meaningful preparation, live action and follow-up phases. |
| Problem → Options → Decision | Require problem definition, at least three options, comparison and justified decision. |
| Interrupt Me Politely | Exact reason to interrupt: clarification, correction, redirect, timing, decision, etc. |
| Tell Me What I Mean | Indirect language whose intended meaning depends on context, tone or relationship. |
| Bad Small Talk / Good Small Talk | Contrast conversation mechanics, not “wrong grammar vs correct grammar”. |
| Describe Without Adjectives | Target describable through behaviour, actions, events or sensory detail. |
| Make It Less Direct | Start needlessly forceful; preserve clarity when softening. |
| Make It More Direct | Start too vague/hedged; improve clarity without making it rude. |
| Conversation Fork | One conversational moment plus 2–3 genuinely different strategic directions. |
| The Unexpected Follow-Up | Familiar first question + second question that forces a new angle, not simply “why?”. |
| Explain Your Choice to Someone Who Disagrees | Define listener’s competing value so learner must reframe rather than repeat. |
| Micro Roleplay | One scenario, one objective, 60–90 seconds; challenge complicates without replacing the task. |
| Phrase Auction | Five to seven phrases of different usefulness/register; weak options need not all be ungrammatical. |
| Conversation Detective | Short dialogue fragment with clues; infer relationship, backstory and likely next step. |

## 11. Ready-to-use generation prompt

Copy this instruction when expanding one game:

    You are expanding the Sblocco Inglese Speaking Library.

    ACTIVITY:
    {{EXACT_ACTIVITY_TITLE}}

    GENERATE:
    {{N}} new items.

    TARGET LEVELS:
    {{LEVELS_OR_ALL}}

    Follow SPEAKING_ITEM_AUTHORING.md exactly.

    Critical requirements:
    - Preserve the exact mechanic of this activity.
    - Each item may have multiple CEFR levels.
    - Return presentation-ready student text.
    - Include context_tags, language_targets and difficulty.
    - student_support must scaffold without answering.
    - challenge must add a meaningful second-stage speaking condition.
    - teacher_note may contain hidden answers or facilitation notes.
    - Repeated vocabulary is allowed when context or communicative function changes.
    - Do NOT treat a repeated word as a duplicate by itself.
    - Reject near-paraphrases, cosmetic noun swaps, and items with the same scenario + same language target + same response path.
    - Compare against the EXISTING ITEMS supplied below before generating.
    - Vary context, level, difficulty and interaction pattern.

    EXISTING ITEMS:
    {{PASTE_EXISTING_ITEM_JSON_OR_DIGEST}}

    OUTPUT:
    Return only a JSON array matching the item contract in this file.

## 12. Review checklist

Reject an item if any answer is no:
- Does it preserve the game mechanic?
- Would it create actual speaking?
- Is it meaningfully different from existing items?
- Are its levels plausible?
- Are context tags accurate?
- Are language targets pedagogically meaningful?
- Does the challenge deepen interaction?
- Is student support non-spoilery?
- Is teacher-only information private?
- Would the prompt look clean on the presentation screen?

The library should become broader and more reusable as it grows, not simply longer.

# Sblocco Inglese Trainer Database Entity Map v2

## Status

This document replaces the first database entity map. It reflects the validated v2 content templates and introduces lexical senses, inflectional metadata, expression patterns and variable slots, speech acts and interaction roles, the Sentence Bank, source provenance, sentence-to-exercise relationships, stable assignment snapshots, and separate SRS and applied-performance records.

This version is intended to be frozen as schema version 1.0 after the validation examples pass.

## Core design rules

1. Words and expressions remain separate learner-facing systems.
2. A word record represents one trainable lexical sense, not merely one spelling.
3. An expression record represents one trainable pragmatic use or pattern.
4. Sentences are stored independently in a reusable Sentence Bank.
5. Exercises reference approved items and approved sentences.
6. Collections reference stable items or fixed item versions.
7. Assignments reference fixed collection versions or fixed exercise versions.
8. SRS memory state and applied-performance state remain separate.
9. Access expiry removes availability, not learner history.
10. Normal content creation must not require editing code.
11. Only one administrator role is required initially.
12. The schema supports A0, A1, A2, B1, B2, and C1.

## Entity overview

```text
users
├── learner_profiles
├── admin_profiles
├── teaching_relationships
├── entitlements
├── assignments
├── srs_item_states
├── applied_attempts
└── learner_mistakes

content_items
├── word_senses
├── expression_patterns
├── content_versions
├── sentence_bank
├── sentence_item_links
├── content_relations
├── content_taxonomy_links
├── source_records
└── media_assets

collections
├── collection_versions
├── collection_items
└── pack_steps

exercise_templates
├── exercise_versions
├── exercise_options
├── exercise_item_links
└── exercise_sentence_links

assignments
├── assignment_recipients
├── assignment_components
├── assignment_completion_rules
├── assignment_exceptions
└── assignment_progress
```

## Identity and learner profiles

### users

Stable authenticated identity.

Key fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | UUID | Yes | Primary key |
| email | text | Yes | Unique |
| display_name | text | Yes | |
| interface_language | enum | Yes | `it`, `en` |
| timezone | text | Yes | IANA timezone |
| status | enum | Yes | `active`, `suspended`, `deleted` |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

### learner_profiles

Stores estimated level, goals, blockers, daily new-item limit, default review mode, and onboarding or diagnostic status.

### admin_profiles

Protected administrator privileges. Initially, only the platform owner has an admin profile. No teacher marketplace or multi-teacher organisation model is included.

## Teaching relationships

### teaching_relationships

Controls assignment eligibility.

Relationship types:

- Preply
- public cohort
- company cohort
- private programme

Only active relationships can receive new assignments. Ended relationships retain progress and assignment history.

## Products and entitlements

### products

Examples:

- Free Trainer
- Core Annual
- Complete Annual
- General Word Trainer Lifetime
- General Expression Trainer Lifetime
- A0-A2 Starter Bundle
- Hospitality Trainer Lifetime

### entitlements

Entitlement sources:

- free
- manual
- one-time purchase
- annual subscription
- cohort
- private programme
- company programme
- Preply assignment

Entitlements combine. Expiry changes access only. Previous SRS and applied history must reactivate when access returns.

### product_content_rules

Maps products to domains, levels, content types, collections, trainer modes, or specific items.

## Shared content identity

### content_items

Stable identity for every word or expression.

| Field | Type | Required |
|---|---|---:|
| id | UUID | Yes |
| public_id | text | Yes |
| content_type | enum | Yes |
| display_target | text | Yes |
| level | enum | Yes |
| primary_domain_id | UUID | Yes |
| priority | enum | Yes |
| priority_rank | integer | No |
| status | enum | Yes |
| current_version_id | UUID | No |
| created_by | UUID | Yes |
| created_at | timestamp | Yes |
| updated_at | timestamp | Yes |

Rules:

- `public_id` is permanent and unique.
- One spelling may appear in multiple content items when the sense differs.
- Duplicate detection warns but does not block legitimate homographs.
- Archived items remain referentially valid.

### content_versions

Immutable content snapshots. Assignments and fixed collections may reference a specific version.

## Word model

### word_senses

One-to-one extension of `content_items` where type is `word`.

A record represents one trainable lexical sense and can store:

- lemma
- sense label
- Italian meaning
- English definition
- part of speech
- countability
- plural form
- transitivity
- base form
- past form
- past participle
- third-person form
- ing form
- comparative form
- superlative form
- learner-friendly pronunciation
- IPA
- word family
- collocations
- common prepositions
- grammar pattern
- common mistakes
- false-friend note
- register
- usage channel

Phrasal verbs and important collocations remain Word Trainer items.

## Expression model

### expression_patterns

One-to-one extension of `content_items` where type is `expression`.

Stores:

- canonical text
- canonical pattern
- variable slots
- Italian meaning
- English explanation
- communicative function
- speech act
- interaction role
- speaker role
- listener role
- primary context
- permitted contexts
- excluded contexts
- tone
- grammar pattern
- pronunciation
- IPA
- realistic situations
- suitable responses
- unsuitable alternatives
- Italian interference note
- formal alternative
- informal alternative
- register
- usage channel

Expressions are classified by pragmatic use, not translation alone.

## Sentence Bank

### sentence_bank

Stores unlimited reviewed sentences and utterances linked to content.

Sentence purposes:

- teaching example
- recognition
- reverse recall
- gap fill
- collocation
- confusable contrast
- false-friend correction
- dialogue prompt
- dialogue response
- register contrast
- production prompt
- assessment

Required fields include sentence text, purpose, context, domain, level, provenance, and review status.

### sentence_item_links

Many-to-many relationship between Sentence Bank records and content items.

Roles:

- target
- supporting
- accepted answer
- distractor source
- contrast item

One sentence may train several related items.

### dialogue pairs

Prompt and response records may be linked explicitly. The same approved sentence may later support teaching, exercises, dialogues, and assessments without duplicating the underlying content item.

## Provenance and review

### source_records

Tracks internally authored content, migrated repository content, licensed external content, public-domain content, learner-generated reviewed content, and administrator edits.

### quality_review_tasks

Tracks duplicate review, questionable level, repeated templates, weak distractors, missing context restrictions, missing provenance, pronunciation review, and incomplete audio metadata.

Published content must have approved provenance and no blocking review task.

## Taxonomy

Controlled tables include:

- domains
- topics
- communicative functions
- speech acts
- learner goals
- mistake definitions
- context labels

### content_taxonomy_links

Many-to-many links between content items and secondary domains, topics, functions, goals, contexts, and exclusions.

## Content relations

### content_relations

Supported relation types:

- related
- opposite
- confusable
- formal alternative
- informal alternative
- prerequisite
- word family
- preferred in context
- avoid in context

## Media

### media_assets

Supports human-recorded pronunciation, dialogue audio, listening material, PDFs, and future learner submissions.

No AI-generated voice assets are permitted.

## Collections and sequenced packs

### collections

Collection types:

- reusable collection
- starter pack
- specialist collection
- lesson collection
- temporary custom group
- fixed assignment snapshot

### collection_versions

Immutable snapshots.

### collection_items

References item, content version, order, introduction state, and required flag.

### pack_steps

Supports ordered progression, items per session, prerequisites, and applied-practice unlock rules.

Dynamic collections may be used for browsing, but assignments should normally use fixed versions.

## Exercise system

### exercise_templates

Supports all approved Word and Expression Trainer exercise types.

### exercise_versions

Stores bilingual instructions, prompt, context, correct-answer data, accepted alternatives, explanations, near-correct policy, timers, hints, scoring, and review status.

### exercise_item_links

Links target, supporting, and distractor-source items.

### exercise_sentence_links

Links approved Sentence Bank records used as prompts, context, answers, distractors, or explanations.

Nuanced distractors must be manually reviewed. Generated exercises remain unpublished until validated.

## SRS system

### srs_item_states

One current record per learner and content item.

Stores state, due date, interval, ease, difficulty, repetitions, lapses, last rating, last objective result, last review, introduction state, and source.

### srs_review_events

Immutable review history, including direction shown, sentence used, submitted response, objective result, self-rating, response time, previous schedule, new schedule, assignment reference, and timestamp.

## Applied-performance system

### applied_attempts

Immutable attempts storing learner, exercise version, response, result, score, response time, attempts, hints, and assignment component.

### applied_item_metrics

Aggregates recognition accuracy, active recall accuracy, contextual accuracy, production success, response time, and current applied status.

Applied data may influence recommendations, but it does not overwrite SRS memory state.

## Mistake evidence

### mistake_signals

Each individual piece of evidence, including source, confidence, related item, and observation date.

### learner_mistakes

Aggregated active issue with confidence band, evidence count, dates, remediation status, resolution, and reactivation.

## Assignments

### assignments

Stores title, reason, learner note, requirement level, deadline, estimated duration, related lesson or cohort, publication status, access end, and creator.

### assignment_recipients

Recipient types:

- individual learner
- cohort

### assignment_components

Component types:

- content item
- collection version
- pack step
- exercise version
- SRS session
- speaking task
- writing task

### assignment_completion_rules

Possible rules include review all items, complete a review count, reach accuracy, complete exercises, submit speaking or writing, and pass a final activity.

### assignment_exceptions

Individual overrides for cohort assignments.

### assignment_progress

Per learner: status, completion percentage, accuracy, start, completion, and overdue state.

Only active teaching relationships may receive new assignments. Existing assignments remain stable when content changes.

## Imports

### import_batches and import_rows

Spreadsheet uploads create Draft or Review needed content. Imports never auto-publish. Validation errors block import, while warnings require review.

## Critical constraints

1. One permanent `public_id` per item.
2. One current SRS state per learner and item.
3. Unlimited immutable review events.
4. Unlimited immutable applied attempts.
5. Published content requires approved provenance.
6. Fixed assignments reference fixed collection or exercise versions.
7. Dynamic collections must be snapshotted before assignment.
8. Assignment creation requires an active teaching relationship.
9. Expired entitlement does not delete progress.
10. Restored entitlement restores prior learner state.
11. Admin-only notes must never appear in learner responses.
12. A content item cannot publish without required type-specific data.
13. A sentence cannot publish without context, purpose, level, domain, and provenance.
14. Exercises cannot publish with missing answers or unreviewed distractors.

## First migration scope

The first migration includes identity, taxonomy, content, versions, Word and Expression extensions, provenance, Sentence Bank, relations, collections, SRS, exercises, teaching relationships, assignments, entitlements, and mistake tracking.

It excludes Stripe billing, full English Foundations, live-class calendar integration, automated speech scoring, multiple teacher organisations, and AI-generated audio.

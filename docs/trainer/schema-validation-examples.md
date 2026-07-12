# Sblocco Inglese Trainer Schema Validation Examples

## Purpose

These examples test whether schema v2 can represent realistic content and learner workflows without awkward workarounds.

## 1. A0 irregular verb: be

Requirements: essential priority, irregular forms, basic senses, guided introduction, and inclusion in an ordered starter pack.

Pass condition: forms and teaching logic fit dedicated fields, not arbitrary notes.

## 2. Countable noun: achievement

Requirements: countability, plural, Business and Interview use, collocations, related verb, and several sentence purposes.

Pass condition: one item appears in several collections without duplication.

## 3. Two senses of run

Records:

- `word-run-movement-001`
- `word-run-business-001`

Pass condition: duplicate detection warns about the shared lemma but allows distinct senses.

## 4. Phrasal verb: get back to someone

Requirements: Word Trainer item, variable object, professional and general use, active-recall and dialogue exercises.

Pass condition: it remains a Word item while supporting expression-style exercises.

## 5. General expression: Let me think for a moment.

Requirements: speech act, interaction role, roles, contexts, alternatives, dialogue prompt, and response.

Pass condition: it can be filtered by function and context, not only category.

## 6. Business expression with restricted context: Could you clarify that?

Requirements: professional primary use, permitted study context, excluded casual context, neutral-professional register.

Pass condition: recommendations respect pragmatic restrictions.

## 7. Hospitality dialogue

Prompt: `Do you have a reservation?`

Requirements: receptionist and guest roles, linked response, Hospitality domain, dialogue purposes, future audio.

Pass condition: the same approved sentence supports teaching, dialogue completion, and listening.

## 8. Ordered A0 starter pack

Items: be, have, live, work, like.

Requirements: fixed order, five new items per session, applied-practice unlock after review.

Pass condition: later pack edits do not alter an assigned version.

## 9. Preply assignment

Assign one fixed expression collection and one applied set, due before the next lesson, accuracy threshold 80%, access ending two weeks later.

Pass condition: history remains after access expires.

## 10. SRS event

Italian to English recall, nearly correct, learner selects Hard, response time 7.2 seconds.

Pass condition: schedule updates while review history remains immutable.

## 11. Applied attempt

Meeting context, first response incorrect, one hint, second response correct.

Pass condition: applied metrics and mistake evidence update without overwriting SRS state.

## 12. Access restoration

Former Preply learner buys a one-time General Trainer product.

Pass condition: prior progress, review schedule, and history return automatically.

## Validation rule

Any workaround that stores core learning logic in arbitrary notes or unstructured metadata is a schema defect.

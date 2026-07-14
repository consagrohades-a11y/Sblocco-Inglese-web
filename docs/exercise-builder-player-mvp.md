# Exercise Builder player MVP

This branch adds the assigned learner player for Exercise Builder.

## Included

- published exercise library and assignment picker
- immutable exercise-version references in assignment resources
- one open attempt per learner and assigned resource
- attempt snapshots that remain stable after catalog edits
- fixed questions plus random pool selection
- global duplicate prevention inside an attempt
- random, unseen-first, avoid-recent and balanced ordering foundations
- autosaved answers and reload recovery
- server-side grading for multiple choice, multiple select, multi-gap, select-gap, translation, error correction and word order
- section-end or exercise-end feedback
- drag-and-drop word order with touch/click fallback
- assignment completion rules based on submission, score or number of attempts
- answer-key helper functions blocked from browser execution

## Deliberately deferred

- diagnostic message aggregation and learner weakness summaries
- fully enforced distribution rules inside pools
- manual grading for long-form answers
- audio, image and speaking question types

export const trainerCardLevels = ['A2', 'B1', 'B2'];

export const trainerCardTypes = ['expression', 'word'];

export const trainerCardReviewStatuses = [
  'not_reviewed',
  'in_review',
  'approved',
  'rejected',
];

export const trainerCardDecisions = [
  'approve',
  'approve_after_edit',
  'rewrite',
  'merge',
  'reclassify',
  'reject',
];

export const trainerCardPublicationStatuses = [
  'draft',
  'review_needed',
  'approved',
  'published',
  'archived',
];

export const currentExpressionSourceFields = [
  'id',
  'type',
  'level',
  'category',
  'expression',
  'italian',
  'pronunciation',
  'example1',
  'example2',
  'note',
];

export const requiredExpressionAuditFields = [
  'id',
  'type',
  'level',
  'category',
  'expression',
  'italian',
  'example1',
  'example2',
];

export const reviewedExpressionContract = {
  externalKey: 'Stable source-facing identifier. Never reuse it for another item.',
  itemType: 'expression',
  trainerDomain: 'general | business | hospitality',
  category: 'Controlled learner-facing category.',
  cefrLevel: 'A2 | B1 | B2',
  englishTarget: 'Primary learner-facing English expression.',
  italianPrompt: 'Natural and sufficiently unambiguous Italian meaning.',
  acceptedAnswers: 'Zero or more reviewed valid English alternatives.',
  pronunciationGuide: 'Optional learner-friendly pronunciation after review.',
  ipa: 'Optional reviewed IPA.',
  usageNote: 'What the expression does and when it is appropriate.',
  communicativeFunction: 'Controlled function such as clarification or buy_time.',
  speechAct: 'Request, refusal, apology, clarification, greeting, and similar.',
  interactionRole: 'Opening, responding, follow_up, repair, closing, or standalone.',
  primaryContext: 'Main realistic context in which the expression is used.',
  permittedContexts: 'Additional reviewed contexts.',
  excludedContexts: 'Contexts where the expression would be unsuitable.',
  register: 'Informal, neutral, professional, or formal.',
  usageChannel: 'Spoken, written, or both.',
  collocations: 'Reviewed supporting chunks or common combinations.',
  exampleSentenceIds: 'Links to reviewed Sentence Bank records.',
  tags: 'Additional controlled retrieval tags.',
  reviewStatus: 'not_reviewed | in_review | approved | rejected',
  reviewDecision: 'approve | approve_after_edit | rewrite | merge | reclassify | reject',
  reviewNotes: 'Administrator-only traceable review notes.',
  reviewedBy: 'Reviewer profile identifier when available.',
  reviewedAt: 'Review timestamp when approved or rejected.',
  publicationStatus: 'draft | review_needed | approved | published | archived',
  sourceFile: 'Original JavaScript module or import source.',
  sourceItemId: 'Original source card identifier.',
};

export function createExpressionAuditRecord(card, sourceFile) {
  return {
    sourceFile,
    sourceItemId: card?.id || null,
    itemType: card?.type || null,
    trainerDomain: 'general',
    currentCategory: card?.category || null,
    proposedLevel: card?.level || null,
    englishTarget: card?.expression || null,
    italianPrompt: card?.italian || null,
    acceptedAnswers: [],
    pronunciationGuide: card?.pronunciation || null,
    example1: card?.example1 || null,
    example2: card?.example2 || null,
    usageNote: card?.note || null,
    automatedIssues: [],
    automatedWarnings: [],
    possibleDuplicates: [],
    reviewDecision: null,
    reviewStatus: 'not_reviewed',
    reviewNotes: null,
  };
}

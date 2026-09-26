import React from 'react';
import { isStructuredEducationalContent } from '../../lib/educationalContentBlock.js';
import { EditorialTeachingBlock } from '../learning/EditorialLearning.jsx';
import ExerciseQuestionRendererV2 from './ExerciseQuestionRendererV2.jsx';
import ExerciseMediaBlock from './ExerciseMediaBlock.jsx';
import ListeningComprehensionQuestion from './ListeningComprehensionQuestion.jsx';
import SafeTeachingContent from './SafeTeachingContent.jsx';
import TranscriptReferencePanel from './TranscriptReferencePanel.jsx';
import SpeakingRoundContent from '../speaking/SpeakingRoundContent.jsx';

// Compatibility entry point for existing player and admin imports.
// Legacy one-body teaching blocks keep their established editorial treatment.
// Structured educational blocks and native listening activities use their
// semantic renderers so admin preview and learner delivery stay aligned.
export default function ExerciseQuestionRenderer(props) {
  const question = props.item?.question || {};
  const transcriptPanel = question.content?.transcript_reference && props.referencedTranscript
    ? <TranscriptReferencePanel transcript={props.referencedTranscript} />
    : null;
  const wrap = (content) => <>{transcriptPanel}{content}</>;

  if (question.type === 'content_block' && question.content?.presentation === 'speaking_round') {
    return wrap(<SpeakingRoundContent round={question.content?.round || {}} showSupport />);
  }

  if (question.type === 'content_block' && question.content?.presentation === 'media') {
    return wrap(<ExerciseMediaBlock content={question.content || {}} prompt={question.prompt || ''} instructions={question.instructions || ''} disabled={props.disabled} />);
  }

  if (question.type === 'content_block' && !isStructuredEducationalContent(question.content)) {
    return wrap(
      <EditorialTeachingBlock
        content={question.content || {}}
        prompt={question.prompt || ''}
        instructions={question.instructions || ''}
        body={(
          <SafeTeachingContent>
            {question.content?.body || question.prompt || ''}
          </SafeTeachingContent>
        )}
      />
    );
  }

  if (question.type === 'listening_comprehension') {
    return wrap(<ListeningComprehensionQuestion {...props} />);
  }

  return wrap(<ExerciseQuestionRendererV2 {...props} />);
}

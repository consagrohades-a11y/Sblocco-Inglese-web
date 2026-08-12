import React from 'react';
import { isStructuredEducationalContent } from '../../lib/educationalContentBlock.js';
import { EditorialTeachingBlock } from '../learning/EditorialLearning.jsx';
import ExerciseQuestionRendererV2 from './ExerciseQuestionRendererV2.jsx';
import ListeningComprehensionQuestion from './ListeningComprehensionQuestion.jsx';
import SafeTeachingContent from './SafeTeachingContent.jsx';

// Compatibility entry point for existing player and admin imports.
// Legacy one-body teaching blocks keep their established editorial treatment.
// Structured educational blocks and native listening activities use their
// semantic renderers so admin preview and learner delivery stay aligned.
export default function ExerciseQuestionRenderer(props) {
  const question = props.item?.question || {};

  if (question.type === 'content_block' && !isStructuredEducationalContent(question.content)) {
    return (
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
    return <ListeningComprehensionQuestion {...props} />;
  }

  return <ExerciseQuestionRendererV2 {...props} />;
}

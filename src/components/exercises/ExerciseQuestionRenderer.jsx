import React from 'react';
import { isStructuredEducationalContent } from '../../lib/educationalContentBlock.js';
import { EditorialTeachingBlock } from '../learning/EditorialLearning.jsx';
import ExerciseQuestionRendererV2 from './ExerciseQuestionRendererV2.jsx';
import SafeTeachingContent from './SafeTeachingContent.jsx';

// Compatibility entry point for existing player and admin imports.
// Legacy one-body teaching blocks keep their established editorial treatment.
// Structured educational blocks must flow through the v2 renderer so admin
// preview and learner delivery share the exact same semantic renderer.
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

  return <ExerciseQuestionRendererV2 {...props} />;
}

import React from 'react';
import { EditorialTeachingBlock } from '../learning/EditorialLearning.jsx';
import ExerciseQuestionRendererV2 from './ExerciseQuestionRendererV2.jsx';
import SafeTeachingContent from './SafeTeachingContent.jsx';

// Compatibility entry point for existing player and admin imports.
// Informational/theory content gets the shared Sblocco editorial treatment;
// interactive question types keep using the established Exercise Builder player.
export default function ExerciseQuestionRenderer(props) {
  const question = props.item?.question || {};

  if (question.type === 'content_block') {
    return (
      <EditorialTeachingBlock
        content={question.content || {}}
        prompt={question.prompt || ''}
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

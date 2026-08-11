import React from 'react';
import LearnerAssignments from './LearnerAssignments.jsx';

const previewAssignments = [
  {
    id: 'preview-present-simple',
    title: 'Present simple: routines',
    learner_note: 'Completa il testo e usa il present simple nelle situazioni quotidiane.',
    status: 'published',
    required: true,
    estimated_minutes: 10,
    deadline_at: '2026-08-18T18:00:00.000Z',
    activityAreas: ['exercises'],
  },
  {
    id: 'preview-speaking',
    title: 'Talking about your day',
    learner_note: 'Tre frasi nuove, un esempio reale e una conclusione chiara.',
    status: 'published',
    required: false,
    estimated_minutes: 8,
    activityAreas: ['exercises', 'practice'],
  },
  {
    id: 'preview-questions',
    title: 'Questions with do and does',
    learner_note: 'Rivedi la struttura delle domande e completa il mini quiz.',
    status: 'completed',
    required: true,
    estimated_minutes: 7,
    activityAreas: ['exercises', 'srs'],
  },
];

export default function LearnerAssignmentsPreview() {
  return <LearnerAssignments initialArea="exercises" previewAssignments={previewAssignments} previewName="Learner" />;
}

import React from 'react';
import { Navigate } from 'react-router-dom';
import PathwayExperience from '../components/pathways/PathwayExperience.jsx';
import { getPathway } from '../data/pathways.js';
import InterviewLandingPage from './InterviewLandingPage.jsx';

export default function PathwayPage({ pathwayId }) {
  if (pathwayId === 'colloquio') return <InterviewLandingPage />;
  const pathway = getPathway(pathwayId);
  if (!pathway) return <Navigate to="/percorsi" replace />;
  return <PathwayExperience pathway={pathway} />;
}

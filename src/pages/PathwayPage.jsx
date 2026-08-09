import React from 'react';
import { Navigate } from 'react-router-dom';
import PathwayExperience from '../components/pathways/PathwayExperience.jsx';
import { getPathway } from '../data/pathways.js';

export default function PathwayPage({ pathwayId }) {
  const pathway = getPathway(pathwayId);
  if (!pathway) return <Navigate to="/percorsi" replace />;
  return <PathwayExperience pathway={pathway} />;
}


import React from 'react';
import SEO from '../components/SEO.jsx';
import InterviewEnquiry from '../components/interview/InterviewEnquiry.jsx';
import {
  InterviewFinalCTA,
  InterviewHero,
  InterviewPainPoints,
  InterviewPrivateUpsell,
  TechnicalInterviewSection,
} from '../components/interview/InterviewEditorialSections.jsx';
import InterviewCoreTeaser from '../components/interview/InterviewCoreTeaser.jsx';
import InterviewFAQ from '../components/interview/InterviewFAQ.jsx';
import { InterviewHubOffers, InterviewLab, InterviewRolePacks } from '../components/interview/InterviewOffers.jsx';
import InterviewSample from '../components/interview/InterviewSample.jsx';
import '../styles/interview.css';

export default function InterviewLandingPage() {
  return (
    <div className="interview-page">
      <SEO
        title="Colloquio in inglese | Preparati davvero | Sblocco Inglese"
        description="Allenati per affrontare un colloquio in inglese: domande reali, risposte, situazioni impreviste e colloqui tecnici. Scegli il percorso più adatto a te."
      />
      <InterviewHero />
      <InterviewPainPoints />
      <TechnicalInterviewSection />
      <InterviewHubOffers />
      <InterviewCoreTeaser />
      <InterviewSample />
      <InterviewRolePacks />
      <InterviewLab />
      <InterviewPrivateUpsell />
      <InterviewEnquiry />
      <InterviewFAQ />
      <InterviewFinalCTA />
    </div>
  );
}

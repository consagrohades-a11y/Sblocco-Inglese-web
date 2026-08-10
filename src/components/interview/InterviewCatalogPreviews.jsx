import React from 'react';
import { Check, ClipboardCheck, FileText, Layers3, MessageCircleQuestion, ShieldAlert } from 'lucide-react';

export function KitDocumentPreview() {
  return (
    <div className="interview-kit-preview" aria-label="Anteprima delle risorse del Kit Colloquio">
      <div className="interview-kit-preview__label">ANTEPRIMA DELLE RISORSE</div>
      <div className="interview-kit-preview__stack" aria-hidden="true"><span /><span /></div>
      <div className="interview-kit-preview__document">
        <div><FileText aria-hidden="true" /><span>KIT COLLOQUIO</span><small>Workbook digitale</small></div>
        <p>PREPARATION MAP</p>
        <h2>Arriva al colloquio con esempi, strutture e lingua già organizzati.</h2>
        <ol>
          <li><span>01</span>Question Bank</li>
          <li><span>02</span>Answer Builders</li>
          <li><span>03</span>Emergency English</li>
          <li><span>04</span>Final checklist</li>
        </ol>
      </div>
    </div>
  );
}

const questionGroups = [
  ['ABOUT YOU', ['Tell me about yourself.', 'Walk me through your experience.', 'What are you looking for in your next role?']],
  ['MOTIVATION', ['Why this role?', 'Why this company?', 'Why are you leaving?']],
  ['BEHAVIORAL', ['Tell me about a difficult situation.', 'Tell me about a mistake.', 'Tell me about a disagreement.']],
  ['DIFFICULT', ["What's your biggest weakness?", 'Why is there a gap in your CV?', 'What salary are you expecting?']],
];

function QuestionBankPreview() {
  return <div className="kit-question-bank">{questionGroups.map(([title, questions]) => <section key={title}><h4>{title}</h4><ul>{questions.map((question) => <li key={question}>{question}</li>)}</ul></section>)}</div>;
}

function AboutBuilderPreview() {
  return <div className="kit-builder-preview">{[['NOW', 'Cosa fai oggi?'], ['RELEVANT PAST', 'Quale parte del tuo percorso conta per questo ruolo?'], ['VALUE', 'Che cosa sai fare o quale risultato puoi dimostrare?'], ['NEXT', 'Perché questo ruolo ha senso adesso?']].map(([label, copy], index) => <React.Fragment key={label}><div><strong>{label}</strong><span>{copy}</span></div>{index < 3 ? <i aria-hidden="true">↓</i> : null}</React.Fragment>)}</div>;
}

function StoryBuilderPreview() {
  return (
    <div className="kit-story-preview">
      {['SITUATION', 'TASK', 'ACTION', 'RESULT', 'WHAT I LEARNED'].map((label, index) => <div key={label}><strong>{label}</strong><span>{['Il progetto rischiava di slittare.', 'Dovevo riallineare tre persone.', 'Ho ristretto le priorità e cambiato i check.', 'Consegna puntuale e meno revisioni.', 'Chiarire prima i vincoli riduce il lavoro dopo.'][index]}</span></div>)}
    </div>
  );
}

function DifficultQuestionsPreview() {
  return (
    <div className="kit-difficult-preview">
      <span>WEAKNESSES · GAPS · EXPERIENCE · FAILURES · SALARY · LEAVING</span>
      <p>What is your biggest weakness?</p>
      <div>{['ACKNOWLEDGE', 'CONTEXT', 'EVIDENCE', 'FORWARD'].map((item) => <strong key={item}>{item}</strong>)}</div>
    </div>
  );
}

function EmergencyEnglishPreview() {
  return (
    <div className="kit-emergency-preview">
      <ShieldAlert aria-hidden="true" />
      <ul>{['Could you rephrase the question?', 'Let me think about that for a moment.', 'What I mean is…', 'Let me put that differently.', "I haven't worked directly with that, but…"].map((phrase) => <li key={phrase}>{phrase}</li>)}</ul>
    </div>
  );
}

function ChecklistPreview() {
  return (
    <div className="kit-checklist-preview">
      {[['24 ORE PRIMA', ['job description reviewed', 'CV reviewed', 'examples selected', 'company notes prepared']], ['10 MINUTI PRIMA', ['microphone', 'camera', 'water', 'notes', 'environment']]].map(([title, items]) => <section key={title}><h4>{title}</h4><ul>{items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></section>)}
    </div>
  );
}

const kitResources = [
  ['01', 'QUESTION BANK', 'Le domande da preparare.', 'Categorie e domande rappresentative per scegliere cosa preparare prima.', QuestionBankPreview],
  ['02', 'ANSWER BUILDER', 'Tell me about yourself, senza partire da una pagina bianca.', 'Una struttura da adattare alla tua esperienza, non uno script da imparare.', AboutBuilderPreview],
  ['03', 'STORY BUILDER', 'Trasforma un’esperienza in una storia chiara.', 'Un foglio di lavoro STAR essenziale con una piccola area per ciò che hai imparato.', StoryBuilderPreview],
  ['04', 'DIFFICULT QUESTIONS', 'Prepara le risposte che è facile rimandare.', 'Framework per weakness, gap, poca esperienza, fallimenti, salary e cambio di ruolo.', DifficultQuestionsPreview],
  ['05', 'EMERGENCY ENGLISH', 'La lingua da avere pronta quando perdi il filo.', 'Frasi da usare quando il colloquio smette di essere prevedibile.', EmergencyEnglishPreview],
  ['06', 'FINAL CHECKLIST', 'Controlla ciò che conta, senza aggiungere altro stress.', 'Una verifica pratica per le 24 ore e i 10 minuti prima del colloquio.', ChecklistPreview],
];

export function KitResourcesShowcase() {
  return (
    <section id="kit-resources" className="interview-product-section kit-resources" aria-labelledby="kit-resources-title">
      <div className="interview-shell">
        <div className="interview-product-heading"><p className="interview-eyebrow">DENTRO IL KIT</p><h2 id="kit-resources-title">Sei strumenti per arrivare con le idee più chiare.</h2><p>Esplora le anteprime di domande, builder, espressioni e checklist che compongono il Kit.</p></div>
        <div className="kit-resources__list">
          {kitResources.map(([number, eyebrow, title, copy, Preview], index) => (
            <article key={number} className={index % 2 ? 'is-reversed' : ''}>
              <div className="kit-resources__copy"><span>{number}</span><p>{eyebrow}</p><h3>{title}</h3><small>{copy}</small></div>
              <div className="kit-resources__preview"><div className="kit-resources__preview-label">ANTEPRIMA</div><Preview /></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CompleteWorkspacePreview() {
  const rows = [
    [Layers3, 'PERCORSO', '8 MODULI'],
    [FileText, 'KIT COLLOQUIO', '6 STRUMENTI'],
    [MessageCircleQuestion, 'PREPARAZIONE PER RUOLO', 'IN PREPARAZIONE'],
    [ClipboardCheck, 'SIMULAZIONI', '3 + ALTRE IN ARRIVO'],
    [FileText, 'INTERVIEW FILE', 'INCLUSO'],
  ];
  return (
    <div className="complete-workspace-preview" aria-label="Anteprima concettuale di Sblocco Colloquio Complete">
      <div className="complete-workspace-preview__head"><span>ANTEPRIMA CONCETTUALE</span><small>IL SISTEMA COMPLETE</small></div>
      <h2>Tutta la preparazione in un solo workspace.</h2>
      <div>{rows.map(([Icon, label, value]) => <p key={label}><Icon aria-hidden="true" /><strong>{label}</strong><span>{value}</span></p>)}</div>
      <small>Percorso e Kit sono il nucleo del bundle. La preparazione per ruolo e la pratica aggiuntiva sono in lavorazione.</small>
    </div>
  );
}

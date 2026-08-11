import React from 'react';
import { FileText, MessagesSquare, Presentation, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const previewItems = [
  [Presentation, 'Costruisci la risposta', 'Organizza esempi ed esperienza senza imparare un copione.'],
  [MessagesSquare, 'Gestisci i follow-up', 'Varia la risposta quando la domanda cambia o diventa più specifica.'],
  [RefreshCcw, 'Ripeti con variazioni', 'Allena recupero, chiarimenti e ragionamento ad alta voce.'],
  [FileText, 'Crea il tuo Interview File', 'Raccogli storie, risultati, frasi utili e domande da fare.'],
];

export default function InterviewCoreTeaser() {
  return (
    <section className="interview-section interview-core-teaser" aria-labelledby="interview-core-teaser-title">
      <div className="interview-shell">
        <div className="interview-heading interview-heading--center">
          <p className="interview-eyebrow">DENTRO SBLOCCO COLLOQUIO</p>
          <h2 id="interview-core-teaser-title">Non una raccolta di risposte. Un sistema per costruire le tue.</h2>
        </div>
        <div className="interview-core-teaser__grid">
          {previewItems.map(([Icon, title, copy]) => (
            <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
        <div className="interview-core-teaser__action">
          <Link className="interview-button interview-button--primary" to="/percorsi/colloquio/sblocco-colloquio">Guarda il percorso da 49 € <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}

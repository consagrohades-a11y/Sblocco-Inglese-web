import React from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  ListChecks,
  RotateCcw,
  Route,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import RecoveryNav from '../components/recovery/RecoveryNav.jsx';
import '../styles/learnerEditorial.css';
import '../styles/recoveryGuide.css';

const dailySteps = [
  { icon: Target, label: 'Apri “Oggi”', copy: 'Trovi il prossimo passo scelto in base al programma, al test e al tempo rimasto.' },
  { icon: BookOpenCheck, label: 'Completa la sessione', copy: 'Segui le attività nell’ordine. Puoi fermarti e riprendere senza perdere il lavoro.' },
  { icon: CheckCircle2, label: 'Leggi il feedback', copy: 'Le correzioni mostrano che cosa è già solido e che cosa conviene ripassare.' },
  { icon: Route, label: 'Lascia aggiornare il piano', copy: 'Errori, verifiche e giorni disponibili possono cambiare le priorità successive.' },
];

const guideChapters = [
  {
    number: '01',
    icon: ClipboardCheck,
    title: 'Esercizi e sessioni guidate',
    copy: 'Le sessioni del piano usano gli esercizi già presenti in Sblocco Inglese. Completa una domanda alla volta e consegna quando hai finito. Il risultato serve a decidere il prossimo passo, non a darti un voto scolastico.',
    note: 'Se chiudi la pagina, riapri “Oggi” o “Il mio percorso” e continua da lì.',
    to: '/recupero-debito/percorso',
    action: 'Apri il percorso',
  },
  {
    number: '02',
    icon: Dumbbell,
    title: 'Vocabolario e Ripasso SRS',
    copy: 'Le parole nuove incontrate nelle attività si consolidano con il Ripasso SRS. Rivedile in sessioni brevi: il sistema ripropone più spesso quelle che ricordi meno e allontana quelle già sicure.',
    note: 'Il Ripasso SRS è separato dagli esercizi del piano, ma fa parte dello stesso allenamento.',
    to: '/attivita/srs',
    action: 'Apri il Ripasso SRS',
  },
  {
    number: '03',
    icon: ListChecks,
    title: 'Argomenti e programma della scuola',
    copy: 'In “Argomenti” vedi tutto ciò che hai indicato durante la configurazione. Puoi studiare un argomento in anticipo o riaprire un percorso completo quando serve davvero.',
    note: 'Se la scuola cambia il programma, usa “Modifica programma” nell’onboarding.',
    to: '/recupero-debito/argomenti',
    action: 'Vedi gli argomenti',
  },
  {
    number: '04',
    icon: RotateCcw,
    title: 'Errori da ripassare',
    copy: 'Gli errori ricorrenti vengono raccolti dagli esercizi. Non devi copiarli in un quaderno separato: “Ripassa errori” li raggruppa e ti rimanda alla pratica più utile.',
    note: 'Un errore non abbassa il percorso: è un segnale per scegliere meglio il ripasso.',
    to: '/recupero-debito/errori',
    action: 'Apri gli errori',
  },
  {
    number: '05',
    icon: Clock3,
    title: 'Checkpoint e simulazioni',
    copy: 'I checkpoint controllano il percorso mentre studi. Nelle simulazioni, invece, il feedback resta nascosto fino alla consegna, proprio come durante una prova vera.',
    note: 'Dopo la consegna vedrai il risultato complessivo e gli argomenti da rinforzare.',
    to: '/recupero-debito/simulazioni',
    action: 'Vedi le simulazioni',
  },
];

export default function RecoveryGuide() {
  return (
    <div className="learner-editorial learner-workspace-page recovery-guide-page">
      <SEO title="Come usare Recupero Debito | Sblocco Inglese" description="Guida pratica a esercizi, vocabolario, ripasso, errori e simulazioni del percorso Recupero Debito." />
      <div className="learner-shell">
        <RecoveryNav />

        <header className="recovery-guide-hero">
          <p className="learner-kicker">Guida al percorso</p>
          <h1 className="learner-display">Come usare <em>Recupero Debito.</em></h1>
          <p>Non devi capire tutto da solo. Ogni area ha un compito preciso e il piano ti indica che cosa viene prima.</p>
          <div className="recovery-guide-hero__actions">
            <Link to="/dashboard" className="learner-primary-button">Vai al prossimo passo <ArrowRight aria-hidden="true" size={16} /></Link>
            <Link to="/recupero-debito/onboarding" className="learner-secondary-button">Modifica il programma</Link>
          </div>
        </header>

        <section className="recovery-guide-daily" aria-labelledby="recovery-guide-daily-title">
          <div className="recovery-guide-daily__heading">
            <span>La routine consigliata</span>
            <h2 id="recovery-guide-daily-title">Che cosa fare ogni volta che entri.</h2>
            <p>Anche una sessione breve conta. Segui questo giro e lascia che il percorso si adatti ai risultati.</p>
          </div>
          <ol>
            {dailySteps.map(({ icon: Icon, label, copy }, index) => (
              <li key={label}>
                <span className="recovery-guide-daily__number">{index + 1}</span>
                <Icon aria-hidden="true" />
                <strong>{label}</strong>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="recovery-guide-chapters" aria-labelledby="recovery-guide-chapters-title">
          <div className="recovery-guide-chapters__intro">
            <p className="learner-kicker">Dove trovi ogni cosa</p>
            <h2 id="recovery-guide-chapters-title">Un sistema, cinque strumenti.</h2>
          </div>
          {guideChapters.map(({ number, icon: Icon, title, copy, note, to, action }) => (
            <article key={number} className="recovery-guide-chapter">
              <div className="recovery-guide-chapter__marker"><span>{number}</span><Icon aria-hidden="true" /></div>
              <div className="recovery-guide-chapter__copy">
                <h3>{title}</h3>
                <p>{copy}</p>
                <small>{note}</small>
              </div>
              <Link to={to} className="learner-text-link">{action} <ArrowRight aria-hidden="true" size={14} /></Link>
            </article>
          ))}
        </section>

        <section className="recovery-guide-shortcut">
          <div><span>Se oggi hai solo 10 minuti</span><h2>Apri “Oggi” e completa il primo blocco disponibile.</h2><p>Non cercare di recuperare tutto insieme. La continuità rende il piano più utile dei grandi ripassi occasionali.</p></div>
          <Link to="/dashboard" className="learner-primary-button">Comincia da oggi <ArrowRight aria-hidden="true" size={16} /></Link>
        </section>
      </div>
    </div>
  );
}

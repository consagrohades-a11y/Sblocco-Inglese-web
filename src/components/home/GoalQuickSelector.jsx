import React from 'react';
import { ArrowRight, BookOpen, BriefcaseBusiness, Globe2, GraduationCap, MessageCircle, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const goals = [
  {
    label: 'Lavorare',
    description: 'Riunioni, clienti, presentazioni e team internazionali.',
    to: '/percorsi/lavorare',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Colloquio',
    description: 'Presentarti, raccontare la tua esperienza, rispondere alle domande e affrontare prove pratiche.',
    to: '/percorsi/colloquio',
    icon: UsersRound,
  },
  {
    label: 'Parlare',
    description: 'Costruire risposte, continuare una conversazione e reagire senza preparare tutto prima.',
    to: '/percorsi/parlare',
    icon: MessageCircle,
  },
  {
    label: 'Estero',
    description: 'Vivere, lavorare e gestire le situazioni di ogni giorno con più autonomia.',
    to: '/percorsi/estero',
    icon: Globe2,
  },
  {
    label: 'Basi',
    description: 'Partire dalle fondamenta e costruire l’inglese che ti serve per iniziare a comunicare.',
    to: '/percorsi/basi',
    icon: BookOpen,
  },
  {
    label: 'Recupero debito',
    description: 'Capire cosa recuperare, seguire un piano guidato e prepararti alle prove della scuola.',
    to: '/percorsi/recupero-debito',
    icon: GraduationCap,
  },
];

export default function GoalQuickSelector() {
  return (
    <section id="percorsi" className="home-goals" aria-labelledby="home-goals-title">
      <div className="home-shell home-goals__inner">
        <h2 id="home-goals-title">COSA VUOI<br />RIUSCIRE A FARE?</h2>
        <div className="home-goals__list">
          {goals.map(({ label, description, to, icon: Icon }) => (
            <Link key={label} to={to} className="home-goal">
              <Icon aria-hidden="true" />
              <span className="home-goal__title">{label}</span>
              <span className="home-goal__description">{description}</span>
            </Link>
          ))}
        </div>
        <div className="home-goals__help">
          <span>Non sai ancora da dove partire?</span>
          <Link to="/assessment">Ti aiutiamo a capirlo <ArrowRight aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}

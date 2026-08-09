import React from 'react';
import { BookOpen, BriefcaseBusiness, Globe2, MessageCircle, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const goals = [
  { label: 'Lavorare', to: '/corsi/business-english-flow', icon: BriefcaseBusiness },
  { label: 'Colloquio', to: '/percorsi', icon: UsersRound },
  { label: 'Parlare', to: '/metodo', icon: MessageCircle },
  { label: 'Estero', to: '/casi-reali', icon: Globe2 },
  { label: 'Basi', to: '/grammar', icon: BookOpen },
];

export default function GoalQuickSelector() {
  return (
    <section id="home-goals" className="home-goals" aria-labelledby="home-goals-title">
      <div className="home-shell home-goals__inner">
        <h2 id="home-goals-title">COSA VUOI<br />RIUSCIRE A FARE?</h2>
        <div className="home-goals__list">
          {goals.map(({ label, to, icon: Icon }) => (
            <Link key={label} to={to} className="home-goal">
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

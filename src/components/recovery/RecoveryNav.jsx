import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const items = [
  { to: '/dashboard', label: 'Oggi', match: (pathname) => pathname === '/dashboard' },
  { to: '/recupero-debito/percorso', label: 'Il mio percorso' },
  { to: '/recupero-debito/argomenti', label: 'Argomenti' },
  { to: '/recupero-debito/errori', label: 'Ripassa errori' },
  { to: '/recupero-debito/simulazioni', label: 'Simulazioni' },
  { to: '/recupero-debito/come-funziona', label: 'Come funziona' },
];

export default function RecoveryNav() {
  const location = useLocation();
  return (
    <nav className="learner-recovery-nav" aria-label="Recupero Debito Inglese">
      {items.map((item) => {
        const current = item.match ? item.match(location.pathname) : location.pathname.startsWith(item.to);
        return <Link key={item.to} to={item.to} aria-current={current ? 'page' : undefined}>{item.label}</Link>;
      })}
    </nav>
  );
}

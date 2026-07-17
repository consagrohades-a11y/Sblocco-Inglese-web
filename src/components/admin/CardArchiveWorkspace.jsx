import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../SEO';
import { supabase } from '../../lib/supabaseClient.js';
import { adminButton, adminSurface } from '../../styles/adminUi.js';
import ContentAreaNav from './ContentAreaNav';

const statusOptions = [
  ['all', 'Tutte'],
  ['draft', 'Bozze'],
  ['approved', 'Approvate'],
  ['published', 'Pubblicate'],
  ['archived', 'Archiviate'],
];

export default function CardArchiveWorkspace({
  type,
  title,
  itemType,
  listRpc,
  titleField,
  meaningField,
  editorPath,
  domain,
}) {
  const [cards, setCards] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadCards() {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc(listRpc);
    if (rpcError) {
      setError(rpcError.message || 'Impossibile caricare le card.');
      setCards([]);
    } else {
      setCards(data || []);
      setError('');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCards();
  }, [listRpc]);

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesDomain = !domain || String(card.primary_domain || 'general').toLowerCase() === domain;
      const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
      const matchesText = !normalized || [card.public_id, card[titleField], card[meaningField], card.topic]
        .some((value) => String(value || '').toLowerCase().includes(normalized));
      return matchesDomain && matchesStatus && matchesText;
    });
  }, [cards, domain, meaningField, query, statusFilter, titleField]);

  async function changeStatus(card, nextStatus) {
    setWorkingId(card.id);
    setError('');
    setMessage('');
    const { error: rpcError } = await supabase.rpc('admin_set_card_status', {
      p_card_id: card.id,
      p_item_type: itemType,
      p_status: nextStatus,
    });

    if (rpcError) {
      setError(rpcError.message || 'Aggiornamento non riuscito.');
    } else {
      setMessage(nextStatus === 'archived' ? 'Card archiviata.' : 'Card ripristinata come bozza.');
      await loadCards();
    }
    setWorkingId('');
  }

  async function deleteCard(card) {
    if (!window.confirm(`Eliminare definitivamente ${card.public_id}? Questa operazione non può essere annullata.`)) return;

    setWorkingId(card.id);
    setError('');
    setMessage('');
    const { error: rpcError } = await supabase.rpc('admin_delete_card', {
      p_card_id: card.id,
      p_item_type: itemType,
    });

    if (rpcError) {
      setError(rpcError.message || 'Eliminazione non riuscita.');
    } else {
      setMessage('Card eliminata definitivamente.');
      await loadCards();
    }
    setWorkingId('');
  }

  return (
    <>
      <SEO title={`${title} | Admin | Sblocco Inglese`} description="Archivio e eliminazione controllata delle card." />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <ContentAreaNav type={type} />
          <header className={`${adminSurface.panel} p-6 sm:p-8`}>
            <span className="eyebrow">Archivio contenuti</span>
            <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70 dark:text-white/65">
              Le card pubblicate devono essere archiviate prima dell’eliminazione. Il ripristino riporta una card archiviata allo stato di bozza.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={editorPath} className={adminButton.primary}>Apri editor</Link>
            </div>
          </header>

          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}
          {message ? <div className="mt-5 rounded-xl border border-moss/20 bg-mint/30 p-4 text-sm font-bold text-ink dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100">{message}</div> : null}

          <section className={`${adminSurface.panel} mt-6 overflow-hidden`}>
            <div className="grid gap-4 border-b border-ink/10 p-5 dark:border-white/10 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca ID, contenuto, italiano o categoria"
                className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/40 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/35"
              />
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`focus-ring min-h-10 rounded-xl border px-3 py-2 text-xs font-black transition ${
                      statusFilter === value
                        ? 'border-moss bg-moss text-white dark:border-emerald-300 dark:bg-emerald-400 dark:text-[#07120f]'
                        : 'border-ink/10 bg-paper text-ink/65 hover:bg-linen dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? <p className="p-6 text-sm font-bold text-ink/60 dark:text-white/60">Caricamento...</p> : null}
            {!loading && filteredCards.length === 0 ? <p className="p-6 text-sm font-bold text-ink/60 dark:text-white/60">Nessuna card trovata.</p> : null}

            <div className="divide-y divide-ink/10 dark:divide-white/10">
              {filteredCards.map((card) => {
                const working = workingId === card.id;
                return (
                  <article key={card.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-ink/60 dark:text-white/60">{card.public_id} · {card.status} · {card.review_status}</p>
                      <h2 className="mt-2 truncate text-lg font-black text-ink dark:text-white">{card[titleField]}</h2>
                      <p className="mt-1 text-sm font-semibold text-ink/60 dark:text-white/65">{card[meaningField]}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {card.status === 'archived' ? (
                        <button type="button" disabled={working} onClick={() => changeStatus(card, 'draft')} className={adminButton.secondary}>Ripristina bozza</button>
                      ) : (
                        <button type="button" disabled={working} onClick={() => changeStatus(card, 'archived')} className={adminButton.secondary}>Archivia</button>
                      )}
                      {card.status !== 'published' ? (
                        <button type="button" disabled={working} onClick={() => deleteCard(card)} className={adminButton.destructive}>Elimina</button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

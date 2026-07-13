import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';

const inputClass = 'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint/40';

export default function AdminTrainerCardDelete() {
  const [cards, setCards] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadCards() {
    setLoading(true);
    setError('');

    const { data, error: rpcError } = await supabase.rpc('admin_list_expression_cards');

    if (rpcError) {
      setCards([]);
      setError('Impossibile caricare le carte. Verifica che le migrazioni Trainer siano state applicate in Supabase.');
    } else {
      setCards(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCards();
  }, []);

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return cards;

    return cards.filter((card) => [
      card.public_id,
      card.canonical_text,
      card.italian_meaning,
      card.topic,
    ].some((value) => String(value || '').toLowerCase().includes(normalized)));
  }, [cards, query]);

  async function deleteCard(card) {
    if (card.status === 'published') {
      setError('Le carte pubblicate non possono essere eliminate. Aprile nell’editor e impostale come archiviate.');
      setMessage('');
      return;
    }

    const confirmed = window.confirm(
      `Eliminare definitivamente ${card.public_id} - ${card.canonical_text}? Questa operazione non può essere annullata.`,
    );

    if (!confirmed) return;

    setDeletingId(card.id);
    setError('');
    setMessage('');

    const { error: rpcError } = await supabase.rpc('admin_delete_expression_card', {
      p_card_id: card.id,
    });

    if (rpcError) {
      setError(rpcError.message || 'Eliminazione non riuscita.');
    } else {
      setMessage(`Carta ${card.public_id} eliminata.`);
      await loadCards();
    }

    setDeletingId('');
  }

  return (
    <>
      <SEO
        title="Elimina carta Trainer | Pannello admin | Sblocco Inglese"
        description="Elimina in sicurezza una carta Trainer non pubblicata."
      />

      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Gestione contenuti</span>
            <h1 className="mt-4 text-3xl font-black text-ink sm:text-4xl">Elimina una carta Trainer</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">
              Puoi eliminare definitivamente bozze, carte da revisionare, approvate o archiviate. Le carte già pubblicate devono essere archiviate dall’editor.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/admin/content/trainers"
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss"
              >
                Torna all’editor
              </Link>
              <Link
                to="/admin"
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink transition hover:bg-linen"
              >
                Pannello admin
              </Link>
            </div>

            <div className="mt-6">
              <input
                type="search"
                className={inputClass}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca per ID, inglese, italiano o categoria"
              />
            </div>

            {error ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="mt-5 rounded-xl border border-moss/20 bg-mint/30 p-4 text-sm font-bold text-ink">
                {message}
              </div>
            ) : null}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
            {loading ? <p className="p-6 text-sm font-bold text-ink/60">Caricamento...</p> : null}
            {!loading && filteredCards.length === 0 ? (
              <p className="p-6 text-sm font-bold text-ink/60">Nessuna carta trovata.</p>
            ) : null}

            {!loading ? filteredCards.map((card) => (
              <article key={card.id} className="flex flex-col gap-4 border-b border-ink/10 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-linen px-3 py-1 text-xs font-black text-ink">{card.public_id}</span>
                    <span className="rounded-full border border-ink/10 px-3 py-1 text-xs font-black text-ink/60">{card.status}</span>
                    <span className="rounded-full border border-ink/10 px-3 py-1 text-xs font-black text-ink/60">{card.review_status}</span>
                  </div>
                  <h2 className="mt-3 break-words text-xl font-black text-ink">{card.canonical_text}</h2>
                  <p className="mt-1 break-words text-sm font-semibold text-ink/60">{card.italian_meaning}</p>
                </div>

                <button
                  type="button"
                  disabled={deletingId === card.id || card.status === 'published'}
                  onClick={() => deleteCard(card)}
                  className="focus-ring min-h-11 shrink-0 rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-black text-red-900 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {card.status === 'published'
                    ? 'Prima archivia'
                    : deletingId === card.id
                      ? 'Eliminazione...'
                      : 'Elimina definitivamente'}
                </button>
              </article>
            )) : null}
          </div>
        </div>
      </section>
    </>
  );
}

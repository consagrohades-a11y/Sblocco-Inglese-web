import React, { useEffect, useMemo, useState } from 'react';
import { rateLearnerVocabularyRecall } from '../../lib/learnerVocabularyBankApi.js';
import { ArrowRight, Check, Eye, RefreshCw, Sparkles, X } from 'lucide-react';

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function exampleCue(item) {
  const example = String(item?._replay_example || item?.example || '').trim();
  const term = String(item?.display_text || '').trim();
  if (!example || !term) return '';
  const escaped = term.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
  const replaced = example.replace(new RegExp(escaped, 'gi'), '_____');
  return replaced === example ? '' : replaced;
}

function cueFor(item) {
  const example = exampleCue(item);
  if (item?._replay_mode === 'example' && example) return { label: 'Completa la frase', text: example };
  if (item?._replay_mode === 'meaning' && item?.english_meaning) return { label: 'Parti dal significato', text: item.english_meaning };
  if (item?._replay_mode === 'italian' && item?.italian_support) return { label: 'Parti dall’italiano', text: item.italian_support };
  if (example) return { label: 'Completa la frase', text: example };
  if (item?.italian_support) return { label: 'Parti dall’italiano', text: item.italian_support };
  if (item?.english_meaning) return { label: 'Parti dal significato', text: item.english_meaning };
  const first = String(item?.display_text || '').trim().charAt(0).toUpperCase();
  return {
    label: item?.bank_kind === 'chunk' ? 'Ricostruisci il chunk' : 'Richiama la parola',
    text: [
      item?.topic ? `Tema: ${String(item.topic).replace(/[_-]+/g, ' ')}` : '',
      first ? `Inizia con “${first}”` : '',
    ].filter(Boolean).join(' · '),
  };
}

export default function VocabularyReplay({ items = [], autoStart = false, onItemRated = null }) {
  const reviewable = useMemo(
    () => items.filter((item) => String(item?.display_text || '').trim()),
    [items],
  );
  const [session, setSession] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [again, setAgain] = useState(0);
  const [finished, setFinished] = useState(false);
  const [rating, setRating] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [autoStarted, setAutoStarted] = useState(false);

  function start() {
    const now = Date.now();
    const prioritized = [...reviewable].sort((a, b) => {
      const aDue = !a.next_review_at || new Date(a.next_review_at).getTime() <= now;
      const bDue = !b.next_review_at || new Date(b.next_review_at).getTime() <= now;
      if (aDue !== bDue) return aDue ? -1 : 1;
      const strengthDelta = Number(a.recall_strength || 0) - Number(b.recall_strength || 0);
      if (strengthDelta) return strengthDelta;
      return new Date(a.last_recalled_at || a.last_seen_at || 0) - new Date(b.last_recalled_at || b.last_seen_at || 0);
    });
    const due = prioritized.filter((item) => !item.next_review_at || new Date(item.next_review_at).getTime() <= now);
    const later = prioritized.filter((item) => item.next_review_at && new Date(item.next_review_at).getTime() > now);
    const nextSession = [...shuffle(due), ...shuffle(later)].slice(0, Math.min(5, reviewable.length)).map((item) => {
      const pool = Array.isArray(item.examples) && item.examples.length
        ? item.examples.filter((example) => String(example || '').trim())
        : item.example ? [item.example] : [];
      const replayExample = pool.length ? pool[Math.floor(Math.random() * pool.length)] : '';
      const modes = [
        item.italian_support ? 'italian' : null,
        item.english_meaning ? 'meaning' : null,
        replayExample ? 'example' : null,
      ].filter(Boolean);
      return {
        ...item,
        _replay_example: replayExample,
        _replay_mode: modes.length ? modes[Math.floor(Math.random() * modes.length)] : null,
      };
    });
    setSession(nextSession);
    setIndex(0);
    setRevealed(false);
    setKnown(0);
    setAgain(0);
    setFinished(false);
    setRatingError('');
  }

  useEffect(() => {
    if (!autoStart || autoStarted || reviewable.length < 2) return;
    setAutoStarted(true);
    start();
  }, [autoStart, autoStarted, reviewable.length]);

  async function rate(recalled) {
    if (!current || rating) return;
    setRating(true);
    setRatingError('');
    try {
      const memory = await rateLearnerVocabularyRecall(current.id, recalled ? 'remembered' : 'again');
      if (memory) {
        setSession((currentSession) => currentSession.map((item) => item.id === current.id ? { ...item, ...memory } : item));
        onItemRated?.(memory);
      }
      if (recalled) setKnown((value) => value + 1);
      else setAgain((value) => value + 1);

      if (index >= session.length - 1) {
        setFinished(true);
        setRevealed(false);
        return;
      }

      setIndex((value) => value + 1);
      setRevealed(false);
    } catch (error) {
      setRatingError(error.message || 'Non sono riuscito a salvare questo richiamo. Riprova.');
    } finally {
      setRating(false);
    }
  }

  if (reviewable.length < 2) return null;

  const current = session[index] || null;
  const cue = current ? cueFor(current) : null;

  return (
    <section className="mt-5 overflow-hidden rounded-[2rem] border border-[#dcc7b7] bg-[#fff8ef] shadow-sm dark:border-white/10 dark:bg-[#181d1a]">
      {!session.length ? (
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white dark:text-surface-950">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-orange-700 dark:text-orange-300">Sblocco Replay</p>
              <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Un minuto. Cinque parole. Niente lista da ristudiare.</h2>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
                Ti mostro prima ciò che è più urgente. Ogni “me lo ricordavo” o “da rivedere” cambia quando quell’elemento tornerà.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={start}
            className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-clay dark:bg-orange-400 dark:text-ink dark:hover:bg-orange-300"
          >
            Avvia Replay <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : finished ? (
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-orange-700 dark:text-orange-300">Replay completato</p>
            <h2 className="mt-2 text-3xl font-black text-ink dark:text-white">{known} su {session.length} richiamate subito.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
              {again
                ? `${again} ${again === 1 ? 'elemento tornerà' : 'elementi torneranno'} prima. Sblocco ha già aggiornato il prossimo richiamo.`
                : 'Tutto richiamato al primo colpo. Sblocco ha già allungato il tempo prima del prossimo ripasso.'}
            </p>
          </div>
          <button
            type="button"
            onClick={start}
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink transition hover:border-orange-400 dark:border-white/15 dark:bg-white/[0.05] dark:text-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Altro giro
          </button>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-orange-700 dark:text-orange-300">
              Replay {index + 1} / {session.length}
            </p>
            <button
              type="button"
              onClick={() => {
                setSession([]);
                setFinished(false);
              }}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-ink/40 transition hover:bg-white hover:text-ink dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white"
              aria-label="Chiudi Replay"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-orange-200/80 bg-white p-5 dark:border-orange-300/15 dark:bg-white/[0.035] sm:p-6">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-ink/40 dark:text-white/40">{cue?.label}</p>
            <p className="mt-3 text-xl font-black leading-8 text-ink dark:text-white sm:text-2xl">{cue?.text || 'Richiama l’elemento.'}</p>

            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-600 dark:text-surface-950"
              >
                <Eye className="h-4 w-4" aria-hidden="true" /> Rivela
              </button>
            ) : (
              <div className="mt-6 border-t border-ink/10 pt-5 dark:border-white/10">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#315f78] dark:text-[#cfe8f5]">
                  {current.bank_kind === 'chunk' ? 'Il chunk' : 'La parola'}
                </p>
                <p className="mt-2 text-3xl font-black leading-tight text-ink dark:text-white">{current.display_text}</p>
                {(current._replay_example || current.example) ? <p className="mt-3 border-l-2 border-orange-400 pl-3 text-sm font-semibold italic leading-6 text-ink/65 dark:text-white/65">{current._replay_example || current.example}</p> : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => rate(true)}
                    disabled={rating}
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white transition hover:bg-clay dark:bg-[#dce8ef] dark:text-[#163d55]"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" /> Me lo ricordavo
                  </button>
                  <button
                    type="button"
                    onClick={() => rate(false)}
                    disabled={rating}
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-clay/25 bg-white px-4 py-2.5 text-sm font-black text-clay transition hover:bg-clay/[0.06] dark:border-coral/25 dark:bg-white/[0.035] dark:text-coral"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Da rivedere
                  </button>
                </div>
                {ratingError ? <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-300">{ratingError}</p> : null}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

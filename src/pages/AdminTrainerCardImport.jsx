import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SrsCard from '../components/SrsCard';
import { supabase } from '../lib/supabaseClient.js';

const emptyCard = {
  id: '',
  public_id: '',
  canonical_text: '',
  italian_meaning: '',
  english_explanation: '',
  communicative_function: '',
  primary_context: '',
  level: 'A2',
  primary_domain: 'general',
  topic: '',
  priority: 'useful',
  register: 'neutral',
  usage_channel: 'both',
  tone: '',
  accepted_answers: [],
  pronunciation_ipa_us: '',
  pronunciation_learner_us: '',
  example_1: '',
  example_2: '',
  usage_note: '',
  collocations: [],
  tags: [],
  status: 'draft',
  review_status: 'pending',
  review_decision: '',
  review_notes: '',
};

const requiredFields = [
  ['public_id', 'ID pubblico'],
  ['canonical_text', 'Espressione inglese'],
  ['italian_meaning', 'Significato italiano'],
  ['english_explanation', "Spiegazione d'uso"],
  ['communicative_function', 'Funzione comunicativa'],
  ['primary_context', 'Contesto principale'],
];

function firstValue(source, keys, fallback = '') {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|\s*\|\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeImportedCard(raw) {
  const source = raw?.card && typeof raw.card === 'object' && !Array.isArray(raw.card)
    ? raw.card
    : raw;

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Il file deve contenere una singola carta JSON, non una lista.');
  }

  return {
    ...emptyCard,
    public_id: String(firstValue(source, ['public_id', 'external_key', 'id_pubblico'])).trim(),
    canonical_text: String(firstValue(source, ['canonical_text', 'english_target', 'expression'])).trim(),
    italian_meaning: String(firstValue(source, ['italian_meaning', 'italian_prompt', 'italian'])).trim(),
    english_explanation: String(firstValue(source, ['english_explanation', 'explanation', 'usage_explanation'])).trim(),
    communicative_function: String(firstValue(source, ['communicative_function', 'function'])).trim(),
    primary_context: String(firstValue(source, ['primary_context', 'context'])).trim(),
    level: enumValue(firstValue(source, ['level'], 'A2'), ['A2', 'B1', 'B2'], 'A2'),
    primary_domain: String(firstValue(source, ['primary_domain', 'domain'], 'general')).trim() || 'general',
    topic: String(firstValue(source, ['topic', 'category'])).trim(),
    priority: enumValue(
      firstValue(source, ['priority'], 'useful'),
      ['essential', 'high_frequency', 'useful', 'specialised', 'advanced_low_frequency'],
      'useful',
    ),
    register: enumValue(
      firstValue(source, ['register'], 'neutral'),
      ['informal', 'neutral', 'professional', 'formal'],
      'neutral',
    ),
    usage_channel: enumValue(
      firstValue(source, ['usage_channel'], 'both'),
      ['spoken', 'written', 'both'],
      'both',
    ),
    tone: String(firstValue(source, ['tone'])).trim(),
    accepted_answers: normalizeList(firstValue(source, ['accepted_answers', 'accepted_alternatives'], [])),
    pronunciation_ipa_us: String(firstValue(source, ['pronunciation_ipa_us', 'american_ipa'])).trim(),
    pronunciation_learner_us: String(firstValue(source, ['pronunciation_learner_us', 'learner_pronunciation'])).trim(),
    example_1: String(firstValue(source, ['example_1', 'example1'])).trim(),
    example_2: String(firstValue(source, ['example_2', 'example2'])).trim(),
    usage_note: String(firstValue(source, ['usage_note', 'note'])).trim(),
    collocations: normalizeList(firstValue(source, ['collocations'], [])),
    tags: normalizeList(firstValue(source, ['tags'], [])),
    status: 'draft',
    review_status: 'pending',
    review_decision: '',
    review_notes: '',
  };
}

function downloadTemplate() {
  const template = {
    schema_version: '1.0',
    card: {
      public_id: 'general-001',
      canonical_text: "I'm on my way.",
      italian_meaning: 'Sto arrivando. / Sono per strada.',
      english_explanation: 'Used when you have already left and are travelling toward the destination.',
      communicative_function: 'Giving an arrival update',
      primary_context: 'Everyday conversation',
      level: 'A2',
      primary_domain: 'general',
      topic: 'Everyday Conversation',
      priority: 'high_frequency',
      register: 'neutral',
      usage_channel: 'spoken',
      tone: 'reassuring',
      accepted_answers: ["I'm on my way."],
      pronunciation_ipa_us: '/aɪm ɑn maɪ weɪ/',
      pronunciation_learner_us: 'aim ahn mai way',
      example_1: "I'm on my way now. I should be there in ten minutes.",
      example_2: "Sorry I'm late, but I'm on my way.",
      usage_note: 'Use this after you have left, not while you are still preparing to go.',
      collocations: ['on my way now', 'already on my way'],
      tags: ['arrival', 'movement', 'spoken'],
    },
  };

  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'general-expression-card-template.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AdminTrainerCardImport() {
  const [card, setCard] = useState(null);
  const [fileName, setFileName] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const missingFields = useMemo(() => {
    if (!card) return [];
    return requiredFields
      .filter(([key]) => !String(card[key] || '').trim())
      .map(([, label]) => label);
  }, [card]);

  const previewCard = useMemo(() => {
    if (!card) return null;

    const pronunciation = [card.pronunciation_ipa_us, card.pronunciation_learner_us]
      .filter(Boolean)
      .join('  ·  ');

    return {
      id: card.public_id || 'import-preview',
      category: card.topic || card.primary_context || 'General English',
      level: card.level,
      type: 'Expression',
      expression: card.canonical_text || 'Espressione mancante',
      pronunciation: pronunciation || 'Pronuncia americana mancante',
      italian: card.italian_meaning || 'Significato italiano mancante',
      collocations: card.collocations.join(' · '),
      example1: card.example_1 || 'Primo esempio mancante.',
      example2: card.example_2 || 'Secondo esempio mancante.',
      note: card.usage_note || card.english_explanation || "Nota d'uso mancante.",
    };
  }, [card]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setError('');
    setMessage('');
    setCard(null);
    setFileName(file.name);
    setRevealed(false);

    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Seleziona un file .json.');
      return;
    }

    if (file.size > 1024 * 1024) {
      setError('Il file supera il limite di 1 MB.');
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      const normalized = normalizeImportedCard(parsed);
      setCard(normalized);
      setMessage('Carta caricata nel controllo preliminare. Non è ancora stata salvata.');
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'File JSON non valido.');
    }
  }

  async function saveDraft() {
    if (!card || missingFields.length > 0) return;

    setSaving(true);
    setError('');
    setMessage('');

    const { data, error: rpcError } = await supabase.rpc('admin_save_expression_card', {
      p_card: card,
    });

    if (rpcError) {
      setError(rpcError.message || 'Importazione non riuscita.');
    } else {
      setCard((current) => ({ ...current, id: data }));
      setMessage('Carta importata in Supabase come bozza da revisionare.');
    }

    setSaving(false);
  }

  return (
    <>
      <SEO
        title="Importa carta Trainer | Pannello admin | Sblocco Inglese"
        description="Importa una singola carta Trainer da un file JSON."
      />

      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Importazione rapida</span>
            <h1 className="mt-4 text-3xl font-black text-ink sm:text-4xl">Importa una carta JSON</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">
              Carica il file che ricevi da me. La carta viene prima mostrata in anteprima e rimane fuori da Supabase finché non selezioni Salva come bozza.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <label className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss">
                Scegli file JSON
                <input type="file" accept="application/json,.json" onChange={handleFile} className="sr-only" />
              </label>
              <button
                type="button"
                onClick={downloadTemplate}
                className="focus-ring min-h-11 rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink transition hover:bg-linen"
              >
                Scarica modello
              </button>
              <Link
                to="/admin/content/trainers"
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink transition hover:bg-linen"
              >
                Torna all'editor
              </Link>
            </div>

            {fileName ? <p className="mt-3 text-sm font-bold text-ink/60">File selezionato: {fileName}</p> : null}
            {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</div> : null}
            {message ? <div className="mt-5 rounded-xl border border-moss/20 bg-mint/30 p-4 text-sm font-bold text-ink">{message}</div> : null}
          </div>

          {card ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
              <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Controllo importazione</p>
                <h2 className="mt-2 text-2xl font-black text-ink">{card.canonical_text || 'Carta incompleta'}</h2>

                <dl className="mt-5 grid gap-4 text-sm">
                  <div><dt className="font-black text-ink/45">ID</dt><dd className="mt-1 font-bold text-ink">{card.public_id || '-'}</dd></div>
                  <div><dt className="font-black text-ink/45">Italiano</dt><dd className="mt-1 font-bold text-ink">{card.italian_meaning || '-'}</dd></div>
                  <div><dt className="font-black text-ink/45">Livello e categoria</dt><dd className="mt-1 font-bold text-ink">{card.level} · {card.topic || '-'}</dd></div>
                  <div><dt className="font-black text-ink/45">Risposte accettate</dt><dd className="mt-1 font-bold text-ink">{card.accepted_answers.join(' · ') || '-'}</dd></div>
                </dl>

                {missingFields.length > 0 ? (
                  <div className="mt-5 rounded-xl border border-clay/25 bg-linen p-4">
                    <p className="text-sm font-black text-ink">Campi obbligatori mancanti</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-ink/65">{missingFields.join(', ')}</p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-moss/20 bg-mint/30 p-4 text-sm font-bold text-ink">
                    Il file contiene tutti i campi necessari per salvarlo come bozza.
                  </div>
                )}

                <button
                  type="button"
                  disabled={saving || missingFields.length > 0 || Boolean(card.id)}
                  onClick={saveDraft}
                  className="focus-ring mt-5 min-h-11 w-full rounded-full bg-moss px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#096d58] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {card.id ? 'Bozza già salvata' : saving ? 'Salvataggio...' : 'Salva come bozza'}
                </button>

                <p className="mt-3 text-xs font-bold leading-5 text-ink/50">
                  Il salvataggio forza sempre gli stati bozza e da revisionare. Il file non può approvare o pubblicare una carta.
                </p>
              </section>

              <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-moss">Anteprima Trainer</p>
                    <h2 className="mt-1 text-xl font-black text-ink">Come apparirà allo studente</h2>
                  </div>
                  {revealed ? (
                    <button
                      type="button"
                      onClick={() => setRevealed(false)}
                      className="focus-ring min-h-10 rounded-full border border-ink/15 px-4 py-2 text-xs font-black text-ink transition hover:bg-linen"
                    >
                      Nascondi risposta
                    </button>
                  ) : null}
                </div>

                <SrsCard
                  card={previewCard}
                  progress={null}
                  revealed={revealed}
                  onReveal={() => setRevealed(true)}
                  onRate={() => {}}
                  sessionLabel="Anteprima importazione"
                  targetLabel="Expression"
                />
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

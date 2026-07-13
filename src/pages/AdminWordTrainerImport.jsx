import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';

const levels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'];
const requiredFields = [
  ['public_id', 'ID pubblico'],
  ['level', 'Livello'],
  ['topic', 'Categoria'],
  ['lemma', 'Parola inglese'],
  ['part_of_speech', 'Parte del discorso'],
  ['italian_meaning', 'Significato italiano'],
  ['english_definition', 'Definizione inglese'],
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push(row);
  if (rows.length < 2) throw new Error('Il CSV deve avere una riga di intestazione e almeno una word card.');

  const headers = rows[0].map((header) => String(header).replace(/^\uFEFF/, '').trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split(/\r?\n|\s*\|\s*|\s*;\s*/).map((item) => item.trim()).filter(Boolean);
}

function firstValue(source, keys, fallback = '') {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeWordCard(source) {
  return {
    id: null,
    public_id: String(firstValue(source, ['public_id', 'external_key', 'id'])).trim(),
    level: String(firstValue(source, ['level'], 'A0')).trim().toUpperCase(),
    topic: String(firstValue(source, ['topic', 'category'])).trim(),
    lemma: String(firstValue(source, ['lemma', 'word', 'english_target'])).trim(),
    sense_label: String(firstValue(source, ['sense_label'])).trim(),
    part_of_speech: String(firstValue(source, ['part_of_speech', 'partOfSpeech'])).trim(),
    italian_meaning: String(firstValue(source, ['italian_meaning', 'italian', 'italian_prompt'])).trim(),
    english_definition: String(firstValue(source, ['english_definition', 'definition'])).trim(),
    pronunciation_ipa_us: String(firstValue(source, ['pronunciation_ipa_us', 'american_ipa'])).trim(),
    pronunciation_learner_us: String(firstValue(source, ['pronunciation_learner_us', 'learner_pronunciation'])).trim(),
    countability: enumValue(String(firstValue(source, ['countability'])).trim(), ['countable', 'uncountable', 'both'], ''),
    plural_form: String(firstValue(source, ['plural_form'])).trim(),
    base_form: String(firstValue(source, ['base_form'])).trim(),
    past_form: String(firstValue(source, ['past_form'])).trim(),
    past_participle: String(firstValue(source, ['past_participle'])).trim(),
    third_person_form: String(firstValue(source, ['third_person_form'])).trim(),
    ing_form: String(firstValue(source, ['ing_form'])).trim(),
    accepted_answers: normalizeList(firstValue(source, ['accepted_answers'], [])),
    example_1: String(firstValue(source, ['example_1', 'example1'])).trim(),
    example_2: String(firstValue(source, ['example_2', 'example2'])).trim(),
    common_collocations: normalizeList(firstValue(source, ['common_collocations', 'collocations'], [])),
    usage_note: String(firstValue(source, ['usage_note', 'note'])).trim(),
    common_mistakes: String(firstValue(source, ['common_mistakes'])).trim(),
    priority: enumValue(String(firstValue(source, ['priority'], 'essential')).trim(), ['essential', 'high_frequency', 'useful', 'specialised', 'advanced_low_frequency'], 'essential'),
    primary_domain: String(firstValue(source, ['primary_domain', 'domain'], 'general')).trim() || 'general',
    register: enumValue(String(firstValue(source, ['register'], 'neutral')).trim(), ['informal', 'neutral', 'professional', 'formal'], 'neutral'),
    usage_channel: enumValue(String(firstValue(source, ['usage_channel'], 'both')).trim(), ['spoken', 'written', 'both'], 'both'),
    tags: normalizeList(firstValue(source, ['tags'], [])),
    status: 'draft',
    review_status: 'pending',
    review_decision: '',
    review_notes: String(firstValue(source, ['reviewer_notes', 'review_notes'])).trim(),
  };
}

function validateCard(card, index) {
  const issues = requiredFields
    .filter(([key]) => !String(card[key] || '').trim())
    .map(([, label]) => `${label} mancante`);

  if (!levels.includes(card.level)) issues.push(`Livello non valido: ${card.level || '-'}`);
  if (!/^word-\d{4}$/.test(card.public_id)) issues.push('ID non conforme, usa word-0001');
  return { row: index + 2, publicId: card.public_id || '-', issues };
}

export default function AdminWordTrainerImport() {
  const [cards, setCards] = useState([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const validation = useMemo(() => cards.map(validateCard), [cards]);
  const invalidRows = useMemo(() => validation.filter((item) => item.issues.length > 0), [validation]);
  const duplicateIds = useMemo(() => {
    const seen = new Set();
    const duplicates = new Set();
    cards.forEach((card) => {
      if (seen.has(card.public_id)) duplicates.add(card.public_id);
      seen.add(card.public_id);
    });
    return Array.from(duplicates);
  }, [cards]);
  const canImport = cards.length > 0 && invalidRows.length === 0 && duplicateIds.length === 0 && !saving;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFileName(file.name);
    setCards([]);
    setError('');
    setMessage('');

    if (file.size > 5 * 1024 * 1024) {
      setError('Il file supera il limite di 5 MB.');
      return;
    }

    try {
      const lowerName = file.name.toLowerCase();
      const text = await file.text();
      let rawCards;

      if (lowerName.endsWith('.csv')) {
        rawCards = parseCsv(text);
      } else if (lowerName.endsWith('.json')) {
        const parsed = JSON.parse(text);
        rawCards = Array.isArray(parsed) ? parsed : parsed.cards;
        if (!Array.isArray(rawCards)) throw new Error('Il JSON deve contenere una lista oppure una proprietà cards.');
      } else {
        throw new Error('Seleziona un file CSV o JSON. Da Excel o Google Sheets esporta il foglio A0 Word Cards come CSV.');
      }

      const normalized = rawCards.map(normalizeWordCard);
      setCards(normalized);
      setMessage(`${normalized.length} word card caricate nel controllo preliminare. Non sono ancora in Supabase.`);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'File non valido.');
    }
  }

  async function importBatch() {
    if (!canImport) return;
    setSaving(true);
    setError('');
    setMessage('');

    const { data, error: rpcError } = await supabase.rpc('admin_import_word_cards', { p_cards: cards });
    if (rpcError) {
      setError(rpcError.message || 'Importazione non riuscita. Nessuna card è stata importata.');
    } else {
      setMessage(`${data} word card importate come bozze da revisionare.`);
      setCards([]);
      setFileName('');
    }
    setSaving(false);
  }

  return (
    <>
      <SEO title="Importa Word Trainer | Pannello admin | Sblocco Inglese" description="Importa un batch CSV o JSON di word card." />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Importazione batch</span>
            <h1 className="mt-4 text-3xl font-black text-ink sm:text-4xl">Importa Word Trainer da tabella</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">Carica un CSV esportato dal foglio di lavoro oppure un JSON. Tutte le righe vengono forzate a bozza e da revisionare.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <label className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white hover:bg-moss">
                Scegli CSV o JSON
                <input type="file" accept=".csv,.json,text/csv,application/json" onChange={handleFile} className="sr-only" />
              </label>
              <Link to="/admin/content/words" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black text-ink hover:bg-linen">Torna all'editor Word</Link>
              <Link to="/admin" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black text-ink hover:bg-linen">Pannello admin</Link>
            </div>
            {fileName ? <p className="mt-3 text-sm font-bold text-ink/60">File selezionato: {fileName}</p> : null}
            {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</div> : null}
            {message ? <div className="mt-5 rounded-xl border border-moss/20 bg-mint/30 p-4 text-sm font-bold text-ink">{message}</div> : null}
          </header>

          {cards.length > 0 ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
                <div className="border-b border-ink/10 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-moss">Anteprima tabella</p>
                  <h2 className="mt-2 text-2xl font-black text-ink">{cards.length} word card</h2>
                </div>
                <div className="max-h-[42rem] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-ink text-white"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Livello</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Word</th><th className="px-4 py-3">Italiano</th><th className="px-4 py-3">Esito</th></tr></thead>
                    <tbody className="divide-y divide-ink/10">{cards.map((card, index) => { const result = validation[index]; return <tr key={`${card.public_id}-${index}`} className={result.issues.length ? 'bg-red-50' : ''}><td className="px-4 py-3 font-black">{card.public_id}</td><td className="px-4 py-3">{card.level}</td><td className="px-4 py-3">{card.topic}</td><td className="px-4 py-3 font-bold">{card.lemma}</td><td className="px-4 py-3">{card.italian_meaning}</td><td className="px-4 py-3 text-xs font-bold">{result.issues.length ? result.issues.join('; ') : 'Valida'}</td></tr>; })}</tbody>
                  </table>
                </div>
              </section>

              <aside className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:self-start">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Controllo importazione</p>
                <dl className="mt-5 grid gap-4 text-sm"><div><dt className="font-black text-ink/45">Righe</dt><dd className="mt-1 text-2xl font-black text-ink">{cards.length}</dd></div><div><dt className="font-black text-ink/45">Righe non valide</dt><dd className="mt-1 text-2xl font-black text-ink">{invalidRows.length}</dd></div><div><dt className="font-black text-ink/45">ID duplicati nel file</dt><dd className="mt-1 text-2xl font-black text-ink">{duplicateIds.length}</dd></div></dl>
                {duplicateIds.length ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">ID duplicati: {duplicateIds.join(', ')}</div> : null}
                <button type="button" disabled={!canImport} onClick={importBatch} className="focus-ring mt-6 min-h-12 w-full rounded-full bg-moss px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Importazione...' : 'Importa tutte come bozze'}</button>
                <p className="mt-3 text-xs font-semibold leading-5 text-ink/50">L'operazione è transazionale: se una riga entra in conflitto con un ID già presente, il batch non viene importato parzialmente.</p>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

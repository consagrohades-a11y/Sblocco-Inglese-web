import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Download,
  FileUp,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';
import SEO from '../components/SEO';
import SrsCard from '../components/SrsCard';
import { travelExpressionCards } from '../data/travelExpressionCards.js';
import { supabase } from '../lib/supabaseClient.js';
import { adminButton, adminSurface } from '../styles/adminUi.js';

const emptyCard = {
  id: '',
  public_id: '',
  canonical_text: '',
  italian_meaning: '',
  english_explanation: '',
  communicative_function: '',
  primary_context: '',
  level: 'A2',
  primary_domain: 'travel',
  topic: '',
  priority: 'high_frequency',
  register: 'neutral',
  usage_channel: 'spoken',
  tone: 'polite',
  accepted_answers: [],
  pronunciation_ipa_us: '',
  pronunciation_learner_us: '',
  example_1: '',
  example_2: '',
  usage_note: '',
  collocations: [],
  tags: ['travel'],
  status: 'draft',
  review_status: 'pending',
  review_decision: '',
  review_notes: '',
};

const inputClass = 'w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/15 dark:bg-[#101a17] dark:text-white dark:placeholder:text-white/35 dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';
const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const joinLines = (value) => (Array.isArray(value) ? value.join('\n') : '');

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-ink/65 dark:text-white/65">
        {label}{required ? ' *' : ''}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function starterCardPayload(card) {
  return {
    public_id: card.id,
    canonical_text: card.expression,
    italian_meaning: card.italian,
    english_explanation: card.note,
    communicative_function: card.communicativeFunction,
    primary_context: card.category,
    level: card.level,
    primary_domain: 'travel',
    topic: card.category,
    priority: 'high_frequency',
    register: 'neutral',
    usage_channel: 'spoken',
    tone: 'polite',
    accepted_answers: [card.expression],
    pronunciation_ipa_us: card.pronunciationIpa,
    pronunciation_learner_us: card.pronunciationLearner,
    example_1: card.example1,
    example_2: card.example2,
    usage_note: card.note,
    collocations: card.collocations,
    tags: ['travel', 'starter', card.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
  };
}

function normaliseImportCard(source) {
  return {
    ...emptyCard,
    ...source,
    id: null,
    public_id: String(source.public_id || source.id || '').trim().toLowerCase(),
    canonical_text: String(source.canonical_text || source.expression || '').trim(),
    italian_meaning: String(source.italian_meaning || source.italian || '').trim(),
    english_explanation: String(source.english_explanation || source.usage_note || source.note || '').trim(),
    communicative_function: String(source.communicative_function || source.communicativeFunction || 'Managing a travel situation').trim(),
    primary_context: String(source.primary_context || source.topic || source.category || 'Travel').trim(),
    topic: String(source.topic || source.category || source.primary_context || 'Travel').trim(),
    level: String(source.level || 'A2').trim().toUpperCase(),
    primary_domain: 'travel',
    accepted_answers: Array.isArray(source.accepted_answers)
      ? source.accepted_answers
      : [source.canonical_text || source.expression].filter(Boolean),
    collocations: Array.isArray(source.collocations) ? source.collocations : [],
    tags: Array.isArray(source.tags) ? source.tags : ['travel'],
    example_1: String(source.example_1 || source.example1 || '').trim(),
    example_2: String(source.example_2 || source.example2 || '').trim(),
    usage_note: String(source.usage_note || source.note || source.english_explanation || '').trim(),
    pronunciation_ipa_us: String(source.pronunciation_ipa_us || source.pronunciationIpa || '').trim(),
    pronunciation_learner_us: String(source.pronunciation_learner_us || source.pronunciationLearner || '').trim(),
  };
}

function openDownload(payload, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadTemplate() {
  openDownload({
    cards: [{
      public_id: '',
      canonical_text: "I'd like to change my reservation.",
      italian_meaning: 'Vorrei modificare la mia prenotazione.',
      english_explanation: 'Use this polite phrase when asking a travel provider to modify an existing booking.',
      communicative_function: 'Changing a reservation',
      primary_context: 'Before You Travel',
      level: 'A2',
      topic: 'Before You Travel',
      priority: 'high_frequency',
      register: 'neutral',
      usage_channel: 'spoken',
      tone: 'polite',
      accepted_answers: ["I'd like to change my reservation."],
      pronunciation_ipa_us: '/aɪd laɪk tə tʃeɪndʒ maɪ ˌrɛzɚˈveɪʃən/',
      pronunciation_learner_us: 'eyd laik tuh chaynj my rez-er-vay-shun',
      example_1: "My travel dates changed, so I said, **I'd like to change my reservation.**",
      example_2: "Before giving the booking reference, begin with **I'd like to change my reservation.**",
      usage_note: 'Use change for a modification. Use cancel only when you want to remove the booking completely.',
      collocations: ['change a reservation', 'booking reference'],
      tags: ['travel', 'booking'],
    }],
  }, 'travel-expression-import-template.json');
}

function cardIsPublishable(card) {
  return Boolean(
    String(card.public_id || '').trim()
    && String(card.canonical_text || '').trim()
    && String(card.italian_meaning || '').trim()
    && String(card.english_explanation || '').trim()
    && String(card.communicative_function || '').trim()
    && String(card.primary_context || '').trim()
    && String(card.pronunciation_ipa_us || '').trim()
    && String(card.pronunciation_learner_us || '').trim()
    && String(card.example_1 || '').trim()
    && String(card.example_2 || '').trim()
    && String(card.usage_note || '').trim()
    && (card.accepted_answers || []).length > 0
  );
}

export default function AdminTravelTrainer() {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState({ ...emptyCard });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function selectCard(card) {
    setSelected({
      ...emptyCard,
      ...card,
      accepted_answers: card.accepted_answers || [],
      collocations: card.collocations || [],
      tags: card.tags || ['travel'],
    });
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadCards(preferredId = null) {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('admin_list_expression_cards');
    if (rpcError) {
      setError(rpcError.message || 'Impossibile caricare le Travel card.');
      setCards([]);
    } else {
      const nextCards = (data || []).filter((card) => String(card.primary_domain || '').toLowerCase() === 'travel');
      setCards(nextCards);
      setError('');
      const preferred = nextCards.find((card) => card.id === preferredId);
      if (preferred) {
        setSelected({
          ...emptyCard,
          ...preferred,
          accepted_answers: preferred.accepted_answers || [],
          collocations: preferred.collocations || [],
          tags: preferred.tags || ['travel'],
        });
      }
    }
    setLoading(false);
  }

  useEffect(() => { loadCards(); }, []);

  const filteredCards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((card) => [
      card.public_id,
      card.canonical_text,
      card.italian_meaning,
      card.topic,
      card.communicative_function,
      card.status,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [cards, query]);

  const previewCard = useMemo(() => ({
    id: selected.public_id || 'travel-preview',
    type: 'Expression',
    level: selected.level || 'A2',
    category: selected.topic || selected.primary_context || 'Travel',
    expression: selected.canonical_text || 'Your travel expression',
    pronunciation: [selected.pronunciation_ipa_us, selected.pronunciation_learner_us].filter(Boolean).join(' · ') || 'Pronuncia da aggiungere',
    italian: selected.italian_meaning || 'Traduzione italiana',
    example1: selected.example_1 || 'Add a complete contextual example.',
    example2: selected.example_2 || 'Add a second contextual example.',
    note: selected.usage_note || selected.english_explanation || 'Add a specific usage note.',
    collocations: selected.collocations?.join(' · ') || '',
  }), [selected]);

  const canPublish = cardIsPublishable(selected);

  function updateField(field, value) {
    setSelected((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function newCard() {
    const highest = cards.reduce((max, card) => {
      const match = String(card.public_id || '').match(/^travel-(\d{4})$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 100);
    setSelected({ ...emptyCard, public_id: `travel-${String(highest + 1).padStart(4, '0')}` });
    setError('');
    setMessage('Nuova Travel card pronta.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveCard(status = selected.status, reviewStatus = selected.review_status) {
    setSaving(true);
    setError('');
    setMessage('');
    const payload = {
      ...selected,
      id: selected.id || null,
      primary_domain: 'travel',
      status,
      review_status: reviewStatus,
      accepted_answers: selected.accepted_answers || [],
      collocations: selected.collocations || [],
      tags: Array.from(new Set(['travel', ...(selected.tags || [])])),
    };
    const { data, error: rpcError } = await supabase.rpc('admin_save_expression_card', { p_card: payload });
    if (rpcError) {
      setError(rpcError.message || 'Salvataggio non riuscito.');
    } else {
      const feedback = status === 'published'
        ? 'Travel card pubblicata e visibile nel Trainer.'
        : status === 'archived'
          ? 'Travel card archiviata.'
          : reviewStatus === 'approved'
            ? 'Travel card approvata.'
            : 'Bozza salvata.';
      setMessage(feedback);
      setSelected((current) => ({ ...current, id: data, status, review_status: reviewStatus }));
      await loadCards(data);
    }
    setSaving(false);
  }

  async function importCards(rawCards, label) {
    if (!rawCards.length) return;
    setImporting(true);
    setError('');
    setMessage('');
    const payload = rawCards.map(normaliseImportCard);
    const { data, error: rpcError } = await supabase.rpc('admin_import_travel_expression_cards', { p_cards: payload });
    if (rpcError) {
      setError(rpcError.message || 'Importazione Travel non riuscita.');
    } else {
      setMessage(`${label}: ${Number(data?.created || 0)} card aggiunte, ${Number(data?.skipped || 0)} duplicate saltate.`);
      await loadCards();
    }
    setImporting(false);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const rawCards = Array.isArray(parsed) ? parsed : parsed.cards;
      if (!Array.isArray(rawCards)) throw new Error('Il file deve contenere un array oppure una proprietà cards.');
      await importCards(rawCards, file.name);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'File JSON non valido.');
    }
  }

  async function syncStarterCards() {
    if (!window.confirm('Sincronizzare le 100 Travel card iniziali con pronuncia, esempi e note aggiornati? Le card personalizzate da travel-0101 in poi non verranno modificate.')) return;
    setImporting(true);
    setError('');
    setMessage('');
    const payload = travelExpressionCards.map(starterCardPayload);
    const { data, error: rpcError } = await supabase.rpc('admin_sync_travel_expression_cards', { p_cards: payload });
    if (rpcError) {
      setError(rpcError.message || 'Sincronizzazione delle Travel card non riuscita.');
    } else {
      setMessage(`Catalogo sincronizzato: ${Number(data?.created || 0)} create, ${Number(data?.updated || 0)} aggiornate.`);
      await loadCards();
    }
    setImporting(false);
  }

  return (
    <>
      <SEO title="Travel Trainer | Admin | Sblocco Inglese" description="Crea, sincronizza e pubblica Travel expression card complete." />
      <section className="section-shell py-6 lg:py-8">
        <div className="mx-auto max-w-[96rem]">
          <header className={`${adminSurface.panel} p-5 sm:p-7`}>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <span className="eyebrow"><Sparkles className="h-4 w-4" />Travel Trainer</span>
                <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">Travel card complete e modificabili</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
                  Ogni card iniziale contiene IPA americano, pronuncia facilitata, due esempi specifici, funzione comunicativa, collocazioni e una nota d’uso propria. Puoi sincronizzare il catalogo, modificarlo o aggiungere nuove card.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={newCard} className={adminButton.primary}><Plus className="h-4 w-4" />Nuova card</button>
                <button type="button" onClick={syncStarterCards} disabled={importing} className={adminButton.positive}><RefreshCw className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />Sincronizza 100 card</button>
                <label className={`${adminButton.secondary} cursor-pointer`}><FileUp className="h-4 w-4" />Importa JSON<input type="file" accept="application/json,.json" onChange={handleFile} className="hidden" /></label>
                <button type="button" onClick={downloadTemplate} className={adminButton.secondary}><Download className="h-4 w-4" />Scarica template</button>
              </div>
            </div>
            {error ? <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200">{error}</p> : null}
            {message ? <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-200">{message}</p> : null}
          </header>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.65fr)]">
            <form onSubmit={(event) => { event.preventDefault(); saveCard(); }} className={`${adminSurface.panel} p-5 sm:p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4 dark:border-white/10">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">{selected.id ? 'Modifica card' : 'Nuova card'}</p>
                  <h2 className="mt-1 text-xl font-black text-ink dark:text-white">{selected.canonical_text || 'Travel expression'}</h2>
                </div>
                <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black dark:bg-white/10">{selected.status} · {selected.review_status}</span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="ID pubblico" required><input className={inputClass} value={selected.public_id} onChange={(event) => updateField('public_id', event.target.value.toLowerCase())} placeholder="travel-0101" /></Field>
                <Field label="Livello" required><select className={inputClass} value={selected.level} onChange={(event) => updateField('level', event.target.value)}>{['A0', 'A1', 'A2', 'B1', 'B2', 'C1'].map((level) => <option key={level}>{level}</option>)}</select></Field>
                <Field label="Espressione inglese" required><input className={inputClass} value={selected.canonical_text} onChange={(event) => updateField('canonical_text', event.target.value)} /></Field>
                <Field label="Significato italiano" required><input className={inputClass} value={selected.italian_meaning} onChange={(event) => updateField('italian_meaning', event.target.value)} /></Field>
                <Field label="Categoria" required><input className={inputClass} value={selected.topic} onChange={(event) => updateField('topic', event.target.value)} placeholder="Airport & Flights" /></Field>
                <Field label="Contesto" required><input className={inputClass} value={selected.primary_context} onChange={(event) => updateField('primary_context', event.target.value)} /></Field>
                <Field label="Funzione comunicativa" required><input className={inputClass} value={selected.communicative_function} onChange={(event) => updateField('communicative_function', event.target.value)} /></Field>
                <Field label="Tono"><input className={inputClass} value={selected.tone} onChange={(event) => updateField('tone', event.target.value)} /></Field>
                <Field label="Pronuncia IPA US" required><input className={inputClass} value={selected.pronunciation_ipa_us} onChange={(event) => updateField('pronunciation_ipa_us', event.target.value)} placeholder="/aɪd laɪk tə.../" /></Field>
                <Field label="Pronuncia facilitata" required><input className={inputClass} value={selected.pronunciation_learner_us} onChange={(event) => updateField('pronunciation_learner_us', event.target.value)} placeholder="eyd laik tuh..." /></Field>
              </div>

              <div className="mt-4 grid gap-4">
                <Field label="Spiegazione d’uso" required><textarea className={inputClass} rows="3" value={selected.english_explanation} onChange={(event) => updateField('english_explanation', event.target.value)} /></Field>
                <Field label="Nota pratica" required><textarea className={inputClass} rows="3" value={selected.usage_note} onChange={(event) => updateField('usage_note', event.target.value)} /></Field>
                <Field label="Esempio 1" required><textarea className={inputClass} rows="2" value={selected.example_1} onChange={(event) => updateField('example_1', event.target.value)} placeholder="Use **bold markdown** around the complete target." /></Field>
                <Field label="Esempio 2" required><textarea className={inputClass} rows="2" value={selected.example_2} onChange={(event) => updateField('example_2', event.target.value)} /></Field>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Risposte accettate, una per riga" required><textarea className={inputClass} rows="4" value={joinLines(selected.accepted_answers)} onChange={(event) => updateField('accepted_answers', splitLines(event.target.value))} /></Field>
                <Field label="Collocazioni, una per riga"><textarea className={inputClass} rows="4" value={joinLines(selected.collocations)} onChange={(event) => updateField('collocations', splitLines(event.target.value))} /></Field>
                <Field label="Tag, uno per riga"><textarea className={inputClass} rows="4" value={joinLines(selected.tags)} onChange={(event) => updateField('tags', splitLines(event.target.value))} /></Field>
              </div>

              {!canPublish ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">Completa tutti i campi obbligatori, incluse entrambe le pronunce e i due esempi, prima di pubblicare.</p> : null}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-5 dark:border-white/10">
                <button type="submit" disabled={saving} className={adminButton.primary}><Save className="h-4 w-4" />Salva bozza</button>
                <button type="button" disabled={saving} onClick={() => saveCard('draft', 'approved')} className={adminButton.positive}><Sparkles className="h-4 w-4" />Approva</button>
                <button type="button" disabled={saving || !canPublish} onClick={() => saveCard('published', 'approved')} className={adminButton.positive}><Send className="h-4 w-4" />Pubblica</button>
                {selected.id ? <button type="button" disabled={saving} onClick={() => saveCard('archived', selected.review_status)} className={adminButton.destructive}><Archive className="h-4 w-4" />Archivia</button> : null}
              </div>
            </form>

            <aside className="grid content-start gap-5">
              <div className={`${adminSurface.panel} p-5`}>
                <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Anteprima completa</p>
                <div className="mt-4">
                  <SrsCard card={previewCard} revealed onReveal={() => {}} onRate={() => {}} sessionLabel="Anteprima admin" targetLabel="Travel expression" />
                </div>
              </div>

              <div className={`${adminSurface.panel} p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Database Travel</p><h2 className="mt-1 text-xl font-black">{cards.length} card modificabili</h2></div>
                  <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-moss dark:bg-emerald-400/15 dark:text-emerald-300">100 base + custom</span>
                </div>
                <label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink/35 dark:text-white/35" /><input className={`${inputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca ID, frase, funzione o categoria" /></label>
                <div className="mt-4 max-h-[38rem] space-y-2 overflow-y-auto pr-1">
                  {loading ? <p className="text-sm font-semibold text-ink/65 dark:text-white/65">Caricamento...</p> : filteredCards.length ? filteredCards.map((card) => (
                    <button key={card.id} type="button" onClick={() => selectCard(card)} className={`w-full rounded-lg border p-3 text-left transition ${selected.id === card.id ? 'border-moss bg-mint/40 dark:border-emerald-300 dark:bg-emerald-400/10' : 'border-ink/10 bg-white hover:border-moss/30 dark:border-white/10 dark:bg-white/[0.04]'}`}>
                      <div className="flex items-start justify-between gap-3"><span className="text-xs font-black text-moss dark:text-emerald-300">{card.public_id}</span><span className="text-[0.65rem] font-black uppercase text-ink/60 dark:text-white/60">{card.status}</span></div>
                      <p className="mt-1 text-sm font-black text-ink dark:text-white">{card.canonical_text}</p>
                      <p className="mt-1 text-xs font-semibold text-ink/65 dark:text-white/65">{card.topic || card.primary_context}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-ink/60 dark:text-white/60">{card.pronunciation_learner_us || 'Pronuncia mancante'}</p>
                    </button>
                  )) : <p className="rounded-lg border border-dashed border-ink/15 p-4 text-sm font-semibold text-ink/65 dark:border-white/15 dark:text-white/65">Nessuna card nel database. Usa “Sincronizza 100 card” oppure crea la prima card personalizzata.</p>}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

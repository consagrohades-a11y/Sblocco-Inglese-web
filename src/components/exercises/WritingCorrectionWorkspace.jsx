import React, { useMemo, useRef, useState } from 'react';
import { Check, Eye, FileText, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import WritingCorrectionDisplay from './WritingCorrectionDisplay.jsx';

const CATEGORIES = [
  ['grammar', 'Grammatica'],
  ['vocabulary', 'Lessico'],
  ['spelling', 'Ortografia'],
  ['punctuation', 'Punteggiatura'],
  ['register', 'Registro'],
  ['structure', 'Struttura'],
  ['style', 'Stile'],
  ['clarity', 'Chiarezza'],
  ['other', 'Altro'],
];

const CATEGORY_STYLES = {
  grammar: 'bg-[#f6ddd3] text-[#87351f] decoration-[#b95a3f] dark:bg-[#8a3d2a]/25 dark:text-[#ffc1ae]',
  vocabulary: 'bg-[#dce8ef] text-[#234f67] decoration-[#557f96] dark:bg-[#7aa4bc]/20 dark:text-[#cfe8f5]',
  spelling: 'bg-[#f1d5cd] text-[#7f3125] decoration-[#a64e3d] dark:bg-[#9c4f3d]/20 dark:text-[#ffc9bb]',
  punctuation: 'bg-[#efe5d5] text-[#6e532f] decoration-[#9a7745] dark:bg-[#c49d5b]/15 dark:text-[#f5ddb0]',
  register: 'bg-[#f4e8bf] text-[#69551c] decoration-[#a68931] dark:bg-[#c5a844]/15 dark:text-[#f5dfa0]',
  structure: 'bg-[#dfe4ea] text-[#26394b] decoration-[#536b80] dark:bg-[#7891a8]/15 dark:text-[#dce8f1]',
  style: 'bg-[#ece7e0] text-[#554b43] decoration-[#88786c] dark:bg-white/10 dark:text-white/80',
  clarity: 'bg-[#eee8df] text-[#5a5148] decoration-[#928579] dark:bg-white/10 dark:text-white/80',
  other: 'bg-[#ece8e2] text-[#5a5148] decoration-[#928579] dark:bg-white/10 dark:text-white/80',
};

function normalizeCorrection(correction) {
  return {
    corrected_text: typeof correction?.corrected_text === 'string' ? correction.corrected_text : '',
    summary: typeof correction?.summary === 'string' ? correction.summary : '',
    reasons: Array.isArray(correction?.reasons) ? correction.reasons : [],
  };
}

function isRangedReason(reason, textLength) {
  const start = Number(reason?.start);
  const end = Number(reason?.end);
  return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= textLength;
}

function rangesOverlap(a, b) {
  return Number(a.start) < Number(b.end) && Number(b.start) < Number(a.end);
}

function correctedFromReasons(originalText, reasons, fallback = '') {
  const ranged = reasons
    .filter((reason) => isRangedReason(reason, originalText.length))
    .sort((a, b) => Number(b.start) - Number(a.start));

  if (!ranged.length) return fallback || originalText;

  let output = originalText;
  ranged.forEach((reason) => {
    output = `${output.slice(0, Number(reason.start))}${String(reason.corrected || '')}${output.slice(Number(reason.end))}`;
  });
  return output;
}

function selectableSegments(originalText, reasons) {
  const ranged = reasons
    .map((reason, index) => ({ ...reason, _index: index }))
    .filter((reason) => isRangedReason(reason, originalText.length))
    .sort((a, b) => Number(a.start) - Number(b.start));

  const segments = [];
  let cursor = 0;
  ranged.forEach((reason) => {
    if (Number(reason.start) < cursor) return;
    if (Number(reason.start) > cursor) {
      segments.push({ type: 'text', text: originalText.slice(cursor, Number(reason.start)), start: cursor, end: Number(reason.start) });
    }
    segments.push({
      type: 'reason',
      text: originalText.slice(Number(reason.start), Number(reason.end)),
      start: Number(reason.start),
      end: Number(reason.end),
      reason,
      index: reason._index,
    });
    cursor = Number(reason.end);
  });
  if (cursor < originalText.length) {
    segments.push({ type: 'text', text: originalText.slice(cursor), start: cursor, end: originalText.length });
  }
  return segments;
}

function tabClass(active) {
  return active
    ? 'bg-ink text-white shadow-sm dark:bg-clay'
    : 'text-ink/55 hover:text-ink dark:text-white/55 dark:hover:text-white';
}

export default function WritingCorrectionWorkspace({ originalText = '', correction = {}, onChange }) {
  const value = normalizeCorrection(correction);
  const text = String(originalText || '');
  const [mode, setMode] = useState('edit');
  const [draft, setDraft] = useState(null);
  const [activeReasonIndex, setActiveReasonIndex] = useState(null);
  const [selectionError, setSelectionError] = useState('');
  const textRef = useRef(null);

  const segments = useMemo(() => selectableSegments(text, value.reasons), [text, value.reasons]);
  const correctedText = useMemo(
    () => correctedFromReasons(text, value.reasons, value.corrected_text),
    [text, value.corrected_text, value.reasons],
  );

  const categoryCounts = useMemo(() => value.reasons.reduce((acc, reason) => {
    const key = reason?.category || 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [value.reasons]);

  function emit(nextReasons = value.reasons, patch = {}) {
    onChange({
      corrected_text: correctedFromReasons(text, nextReasons, patch.corrected_text ?? value.corrected_text),
      summary: patch.summary ?? value.summary,
      reasons: nextReasons,
    });
  }

  function captureSelection() {
    if (!textRef.current || mode !== 'edit') return;
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!textRef.current.contains(range.commonAncestorContainer)) return;

    const before = range.cloneRange();
    before.selectNodeContents(textRef.current);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const selected = range.toString();
    const end = start + selected.length;
    const trimmed = selected.trim();

    if (!trimmed) return;

    const leadingWhitespace = selected.length - selected.trimStart().length;
    const trailingWhitespace = selected.length - selected.trimEnd().length;
    const cleanStart = start + leadingWhitespace;
    const cleanEnd = end - trailingWhitespace;

    const nextRange = { start: cleanStart, end: cleanEnd };
    const conflict = value.reasons.find((reason) => isRangedReason(reason, text.length) && rangesOverlap(reason, nextRange));
    if (conflict) {
      setSelectionError('Questa parte del testo è già dentro una correzione. Apri la correzione esistente oppure seleziona un altro passaggio.');
      selection.removeAllRanges();
      return;
    }

    setSelectionError('');
    setActiveReasonIndex(null);
    setDraft({
      start: cleanStart,
      end: cleanEnd,
      original: text.slice(cleanStart, cleanEnd),
      corrected: '',
      category: 'grammar',
      reason: '',
    });
    selection.removeAllRanges();
  }

  function openReason(index) {
    const reason = value.reasons[index];
    if (!reason) return;
    setSelectionError('');
    setActiveReasonIndex(index);
    setDraft({
      start: Number.isInteger(Number(reason.start)) ? Number(reason.start) : null,
      end: Number.isInteger(Number(reason.end)) ? Number(reason.end) : null,
      original: String(reason.original || ''),
      corrected: String(reason.corrected || ''),
      category: reason.category || 'other',
      reason: String(reason.reason || ''),
    });
  }

  function saveDraft() {
    if (!draft) return;
    const nextReason = {
      category: draft.category || 'other',
      original: draft.original || '',
      corrected: draft.corrected || '',
      reason: draft.reason || '',
      ...(Number.isInteger(draft.start) && Number.isInteger(draft.end) ? { start: draft.start, end: draft.end } : {}),
    };

    const nextReasons = [...value.reasons];
    if (Number.isInteger(activeReasonIndex)) nextReasons[activeReasonIndex] = nextReason;
    else nextReasons.push(nextReason);

    emit(nextReasons);
    setDraft(null);
    setActiveReasonIndex(null);
  }

  function removeReason(index) {
    const nextReasons = value.reasons.filter((_, currentIndex) => currentIndex !== index);
    emit(nextReasons, { corrected_text: correctedFromReasons(text, nextReasons, text) });
    if (activeReasonIndex === index) {
      setDraft(null);
      setActiveReasonIndex(null);
    }
  }

  function resetAll() {
    setDraft(null);
    setActiveReasonIndex(null);
    setSelectionError('');
    onChange({});
  }

  const hasCorrection = Boolean(value.reasons.length || value.summary.trim() || value.corrected_text.trim());

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-[#d9c8bb] bg-[#fffaf5] shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eadbd1] px-5 py-5 dark:border-white/10 sm:px-6">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-clay dark:text-coral">Revisore scritto</p>
          <h3 className="mt-1 text-xl font-black text-ink dark:text-white">Seleziona il testo. Correggi solo ciò che serve.</h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
            Evidenzia un passaggio nella risposta: categoria, sostituzione e spiegazione restano collegate a quel punto preciso.
          </p>
        </div>
        {hasCorrection ? (
          <button type="button" onClick={resetAll} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 text-xs font-black text-ink/55 hover:border-clay hover:text-clay dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
            <RotateCcw className="h-3.5 w-3.5" /> Azzera
          </button>
        ) : null}
      </header>

      <div className="border-b border-[#eadbd1] px-5 py-3 dark:border-white/10 sm:px-6">
        <div className="inline-flex rounded-full bg-[#f0e8e1] p-1 dark:bg-white/[0.06]">
          <button type="button" onClick={() => setMode('edit')} className={`focus-ring inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-xs font-black transition ${tabClass(mode === 'edit')}`}>
            <Sparkles className="h-3.5 w-3.5" /> Correggi
          </button>
          <button type="button" onClick={() => setMode('final')} className={`focus-ring inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-xs font-black transition ${tabClass(mode === 'final')}`}>
            <FileText className="h-3.5 w-3.5" /> Versione finale
          </button>
          <button type="button" onClick={() => setMode('student')} className={`focus-ring inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-xs font-black transition ${tabClass(mode === 'student')}`}>
            <Eye className="h-3.5 w-3.5" /> Vista studente
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <div className="grid min-h-[28rem] lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]">
          <div className="border-b border-[#eadbd1] p-5 dark:border-white/10 lg:border-b-0 lg:border-r sm:p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-ink/45 dark:text-white/45">Testo dello studente</p>
              <p className="text-xs font-bold text-ink/40 dark:text-white/40">{value.reasons.length} {value.reasons.length === 1 ? 'correzione' : 'correzioni'}</p>
            </div>

            <div
              ref={textRef}
              onMouseUp={captureSelection}
              onKeyUp={captureSelection}
              className="min-h-[20rem] select-text whitespace-pre-wrap rounded-2xl border border-[#eadbd1] bg-white px-5 py-5 font-editorial text-[1.12rem] leading-9 text-ink shadow-inner outline-none dark:border-white/10 dark:bg-surface-900 dark:text-white sm:px-6 sm:py-6"
            >
              {segments.map((segment, index) => {
                if (segment.type === 'text') return <React.Fragment key={index}>{segment.text}</React.Fragment>;
                const style = CATEGORY_STYLES[segment.reason?.category] || CATEGORY_STYLES.other;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); openReason(segment.index); }}
                    className={`focus-ring rounded px-0.5 font-bold line-through decoration-2 underline-offset-2 transition hover:brightness-95 ${style}`}
                    title="Apri questa correzione"
                  >
                    {segment.text}
                  </button>
                );
              })}
            </div>

            {selectionError ? <p className="mt-3 text-xs font-bold text-[#87351f] dark:text-[#ffc1ae]">{selectionError}</p> : null}
            <p className="mt-3 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">
              Suggerimento: seleziona direttamente una parola, un chunk o una frase. Le correzioni già create sono cliccabili.
            </p>

            {value.reasons.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(categoryCounts).map(([category, count]) => {
                  const label = CATEGORIES.find(([key]) => key === category)?.[1] || 'Altro';
                  return <span key={category} className={`rounded-full px-3 py-1.5 text-xs font-black ${CATEGORY_STYLES[category] || CATEGORY_STYLES.other}`}>{label} · {count}</span>;
                })}
              </div>
            ) : null}
          </div>

          <aside className="bg-[#fffdf9] p-5 dark:bg-white/[0.02] sm:p-6">
            {draft ? (
              <>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.13em] text-clay dark:text-coral">
                  {Number.isInteger(activeReasonIndex) ? 'Modifica correzione' : 'Nuova correzione'}
                </p>
                <div className="mt-3 rounded-xl border border-[#eadbd1] bg-white p-3.5 dark:border-white/10 dark:bg-surface-900">
                  <p className="text-[0.62rem] font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Selezione</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-[#87351f] line-through decoration-2 dark:text-[#ffc1ae]">{draft.original}</p>
                </div>

                <div className="mt-5">
                  <p className="text-[0.62rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Categoria</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CATEGORIES.map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, category: key }))}
                        className={`focus-ring rounded-full border px-2.5 py-1.5 text-[0.68rem] font-black transition ${draft.category === key ? `${CATEGORY_STYLES[key]} border-current` : 'border-ink/10 bg-white text-ink/50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="mt-5 block text-[0.65rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">
                  Sostituisci con
                  <textarea
                    rows={3}
                    value={draft.corrected}
                    onChange={(event) => setDraft((current) => ({ ...current, corrected: event.target.value }))}
                    className="focus-ring mt-2 w-full resize-y rounded-xl border border-ink/15 bg-white px-3.5 py-3 text-sm font-black italic leading-6 text-[#234f67] dark:border-white/15 dark:bg-surface-900 dark:text-[#cfe8f5]"
                    placeholder="Scrivi la forma corretta…"
                  />
                </label>

                <label className="mt-4 block text-[0.65rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">
                  Perché
                  <textarea
                    rows={4}
                    value={draft.reason}
                    onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))}
                    className="focus-ring mt-2 w-full resize-y rounded-xl border border-ink/15 bg-white px-3.5 py-3 text-sm font-semibold leading-6 text-ink dark:border-white/15 dark:bg-surface-900 dark:text-white"
                    placeholder="Una spiegazione breve e riutilizzabile…"
                  />
                </label>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={saveDraft} className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white dark:bg-clay">
                    <Check className="h-4 w-4" /> Applica
                  </button>
                  {Number.isInteger(activeReasonIndex) ? (
                    <button type="button" onClick={() => removeReason(activeReasonIndex)} className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d9b7aa] text-[#87351f] dark:border-[#ffc1ae]/20 dark:text-[#ffc1ae]" aria-label="Rimuovi correzione">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="grid min-h-[22rem] place-items-center text-center">
                <div className="max-w-[16rem]">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f3e6de] text-clay dark:bg-coral/10 dark:text-coral"><Sparkles className="h-5 w-5" /></span>
                  <h4 className="mt-4 font-editorial text-2xl text-ink dark:text-white">Seleziona un passaggio.</h4>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink/50 dark:text-white/50">La correzione comparirà qui senza riempire la pagina di form.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {mode === 'final' ? (
        <div className="p-5 sm:p-7">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.13em] text-[#315f78] dark:text-[#cfe8f5]">Versione corretta</p>
          <div className="mt-3 min-h-[18rem] whitespace-pre-wrap rounded-2xl border border-[#d9e3e9] bg-white px-5 py-5 font-editorial text-[1.12rem] leading-9 text-ink shadow-sm dark:border-white/10 dark:bg-surface-900 dark:text-white sm:px-6">
            {correctedText || text}
          </div>
        </div>
      ) : null}

      {mode === 'student' ? (
        <div className="p-5 sm:p-7">
          {hasCorrection ? (
            <WritingCorrectionDisplay originalText={text} correction={{ ...value, corrected_text: correctedText }} compact />
          ) : (
            <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-sm font-semibold text-ink/50 dark:border-white/15 dark:text-white/50">Aggiungi almeno una correzione per vedere l’anteprima studente.</p>
          )}
        </div>
      ) : null}

      <footer className="border-t border-[#eadbd1] px-5 py-5 dark:border-white/10 sm:px-6">
        <label className="block text-[0.65rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">
          Messaggio finale <span className="font-semibold normal-case tracking-normal opacity-60">(opzionale)</span>
          <textarea
            rows={2}
            value={value.summary}
            onChange={(event) => emit(value.reasons, { summary: event.target.value, corrected_text: correctedText })}
            className="focus-ring mt-2 w-full resize-y rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink dark:border-white/15 dark:bg-surface-900 dark:text-white"
            placeholder="Es. Il contenuto è chiaro: lavoriamo soprattutto su tempi verbali e collocazioni."
          />
        </label>
      </footer>
    </section>
  );
}

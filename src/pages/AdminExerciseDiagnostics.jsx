import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import {
  archiveDiagnosticCode,
  archiveDiagnosticRule,
  loadDiagnosticRegistry,
  rebuildExerciseDiagnostics,
  saveDiagnosticCode,
  saveDiagnosticRule,
} from '../lib/exerciseDiagnosticsApi.js';

const EMPTY_CODE = {
  code: '', label: '', primary_skill: 'grammar', topic: '', subtopic: '', group_key: '',
  severity: 'minor', category: 'learning', status: 'active', recommended_resources: [], messages: {},
};

const EMPTY_RULE = {
  rule_key: '', topic: '', priority: 100, minimum_distinct_error_codes: 3,
  minimum_distinct_groups: 3, minimum_error_rate: 0.4, required_groups: '',
  message_it: '', message_en: '', diagnostic_code: '', message_level: 'topic_review',
  suppress_specific_messages: true, status: 'active',
};

const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

function CodeEditor({ value, onChange, onSave, busy }) {
  const setMessage = (key, text) => onChange({ ...value, messages: { ...(value.messages || {}), [key]: text } });
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Error code</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">{value.code || 'Nuovo codice'}</h2></div>{value.code ? <button type="button" onClick={() => onChange({ ...EMPTY_CODE })} className="text-xs font-black text-moss underline dark:text-emerald-300">Nuovo</button> : null}</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Codice<input value={value.code} disabled={Boolean(value.original_code)} onChange={(event) => onChange({ ...value, code: event.target.value.toUpperCase() })} className={fieldClass} placeholder="PRESENT_SIMPLE_THIRD_PERSON_S" /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Etichetta<input value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} className={fieldClass} placeholder="Third-person singular -s" /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Competenza<select value={value.primary_skill} onChange={(event) => onChange({ ...value, primary_skill: event.target.value })} className={fieldClass}>{['grammar','vocabulary','reading','writing','functional_language','spelling','word_order'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Topic<input value={value.topic} onChange={(event) => onChange({ ...value, topic: event.target.value })} className={fieldClass} placeholder="present_simple" /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Sottotema<input value={value.subtopic || ''} onChange={(event) => onChange({ ...value, subtopic: event.target.value })} className={fieldClass} placeholder="affirmative" /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Gruppo diagnostico<input value={value.group_key || ''} onChange={(event) => onChange({ ...value, group_key: event.target.value })} className={fieldClass} placeholder="third_person" /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Categoria<select value={value.category} onChange={(event) => onChange({ ...value, category: event.target.value, severity: event.target.value === 'precision' ? 'precision' : value.severity === 'precision' ? 'minor' : value.severity })} className={fieldClass}><option value="learning">Apprendimento</option><option value="precision">Precisione</option></select></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Gravità<select value={value.severity} onChange={(event) => onChange({ ...value, severity: event.target.value })} className={fieldClass}><option value="minor">Minore</option><option value="major">Maggiore</option><option value="precision">Precisione</option></select></label>
      </div>

      <div className="mt-6 border-t border-ink/10 pt-5 dark:border-white/10">
        <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Frasi predefinite</p>
        <div className="mt-4 grid gap-4">
          {[['reminder','Promemoria'],['weakness','Debolezza ricorrente'],['subtopic_review','Revisione sottotema'],['topic_review','Revisione argomento']].map(([level, label]) => (
            <div key={level} className="grid gap-3 lg:grid-cols-2">
              <label className="text-xs font-black text-ink/60 dark:text-white/60">{label}, italiano<textarea rows={2} value={value.messages?.[`it:${level}`] || ''} onChange={(event) => setMessage(`it:${level}`, event.target.value)} className={fieldClass} /></label>
              <label className="text-xs font-black text-ink/60 dark:text-white/60">{label}, inglese<textarea rows={2} value={value.messages?.[`en:${level}`] || ''} onChange={(event) => setMessage(`en:${level}`, event.target.value)} className={fieldClass} /></label>
            </div>
          ))}
        </div>
      </div>

      <button type="button" disabled={busy} onClick={onSave} className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-emerald-300 dark:text-[#102019]">{busy ? 'Salvataggio...' : 'Salva codice e messaggi'}</button>
    </section>
  );
}

function RuleEditor({ value, onChange, onSave, busy }) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Aggregazione</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">{value.rule_key || 'Nuova regola'}</h2></div>{value.rule_key ? <button type="button" onClick={() => onChange({ ...EMPTY_RULE })} className="text-xs font-black text-moss underline dark:text-emerald-300">Nuova</button> : null}</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Chiave regola<input value={value.rule_key} onChange={(event) => onChange({ ...value, rule_key: event.target.value.toUpperCase() })} className={fieldClass} placeholder="PRESENT_SIMPLE_FULL_REVIEW" /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Topic<input value={value.topic} onChange={(event) => onChange({ ...value, topic: event.target.value })} className={fieldClass} placeholder="present_simple" /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Codici distinti minimi<input type="number" min="1" value={value.minimum_distinct_error_codes} onChange={(event) => onChange({ ...value, minimum_distinct_error_codes: Number(event.target.value) })} className={fieldClass} /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Gruppi distinti minimi<input type="number" min="1" value={value.minimum_distinct_groups} onChange={(event) => onChange({ ...value, minimum_distinct_groups: Number(event.target.value) })} className={fieldClass} /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Tasso errore minimo<input type="number" min="0" max="1" step="0.05" value={value.minimum_error_rate} onChange={(event) => onChange({ ...value, minimum_error_rate: Number(event.target.value) })} className={fieldClass} /><span className="mt-1 block font-semibold text-ink/45 dark:text-white/45">0,40 significa 40%.</span></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Priorità<input type="number" value={value.priority} onChange={(event) => onChange({ ...value, priority: Number(event.target.value) })} className={fieldClass} /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Gruppi obbligatori, separati da virgola<input value={value.required_groups} onChange={(event) => onChange({ ...value, required_groups: event.target.value })} className={fieldClass} placeholder="affirmative, negative, questions" /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Messaggio italiano<textarea rows={3} value={value.message_it} onChange={(event) => onChange({ ...value, message_it: event.target.value })} className={fieldClass} /></label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Messaggio inglese<textarea rows={3} value={value.message_en} onChange={(event) => onChange({ ...value, message_en: event.target.value })} className={fieldClass} /></label>
      </div>
      <label className="mt-4 flex items-center gap-2 text-xs font-black text-ink/65 dark:text-white/65"><input type="checkbox" checked={value.suppress_specific_messages} onChange={(event) => onChange({ ...value, suppress_specific_messages: event.target.checked })} />Sostituisci i messaggi specifici dello stesso argomento</label>
      <button type="button" disabled={busy} onClick={onSave} className="mt-6 rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? 'Salvataggio...' : 'Salva regola'}</button>
    </section>
  );
}

export default function AdminExerciseDiagnostics() {
  const [codes, setCodes] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedCode, setSelectedCode] = useState({ ...EMPTY_CODE });
  const [selectedRule, setSelectedRule] = useState({ ...EMPTY_RULE });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const data = await loadDiagnosticRegistry();
      setCodes(data.codes); setRules(data.rules);
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare la diagnostica.');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filteredCodes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return codes;
    return codes.filter((item) => [item.code, item.label, item.topic, item.subtopic, item.group_key].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [codes, search]);

  function editCode(code) {
    setSelectedCode({ ...EMPTY_CODE, ...code, original_code: code.code, messages: code.messages || {} });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editRule(rule) {
    setSelectedRule({
      ...EMPTY_RULE,
      ...rule,
      minimum_distinct_error_codes: rule.trigger_config?.minimum_distinct_error_codes ?? 3,
      minimum_distinct_groups: rule.trigger_config?.minimum_distinct_groups ?? 3,
      minimum_error_rate: rule.trigger_config?.minimum_error_rate ?? 0.4,
      required_groups: (rule.trigger_config?.required_groups || []).join(', '),
      message_it: rule.output_config?.messages?.it || '',
      message_en: rule.output_config?.messages?.en || '',
      diagnostic_code: rule.output_config?.diagnostic_code || '',
      message_level: rule.output_config?.message_level || 'topic_review',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveCode() {
    setBusy(true); setError(''); setSuccess('');
    try {
      const code = await saveDiagnosticCode(selectedCode);
      setSuccess(`${code} salvato nella legenda diagnostica.`);
      setSelectedCode({ ...EMPTY_CODE });
      await load();
    } catch (saveError) { setError(saveError.message || 'Non è stato possibile salvare il codice.'); }
    finally { setBusy(false); }
  }

  async function saveRule() {
    setBusy(true); setError(''); setSuccess('');
    try {
      const key = await saveDiagnosticRule({
        ...selectedRule,
        trigger_config: {
          minimum_distinct_error_codes: Math.max(1, Number(selectedRule.minimum_distinct_error_codes) || 1),
          minimum_distinct_groups: Math.max(1, Number(selectedRule.minimum_distinct_groups) || 1),
          minimum_error_rate: Math.max(0, Math.min(1, Number(selectedRule.minimum_error_rate) || 0)),
          required_groups: selectedRule.required_groups.split(',').map((item) => item.trim()).filter(Boolean),
        },
        output_config: {
          diagnostic_code: selectedRule.diagnostic_code || null,
          message_level: selectedRule.message_level,
          messages: { it: selectedRule.message_it, en: selectedRule.message_en },
        },
      });
      setSuccess(`${key} salvata.`);
      setSelectedRule({ ...EMPTY_RULE });
      await load();
    } catch (saveError) { setError(saveError.message || 'Non è stato possibile salvare la regola.'); }
    finally { setBusy(false); }
  }

  async function rebuild() {
    setBusy(true); setError(''); setSuccess('');
    try { const count = await rebuildExerciseDiagnostics(); setSuccess(`Diagnostica ricalcolata per ${count} tentativi completati.`); }
    catch (rebuildError) { setError(rebuildError.message || 'Ricalcolo non riuscito.'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <SEO title="Diagnostica Exercise Builder | Sblocco Inglese" description="Gestisci error code, messaggi e regole di aggregazione." />
      <section className="section-shell py-8 lg:py-10"><div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8"><span className="eyebrow">Exercise Builder</span><div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Legenda diagnostica</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">I codici, le frasi e le regole vivono fuori dagli esercizi. Una regola generale può sostituire più avvisi specifici quando emerge una difficoltà sull’intero argomento.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin/content/exercises/library" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Libreria</Link><button type="button" disabled={busy} onClick={rebuild} className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 dark:bg-emerald-300 dark:text-[#102019]">Ricalcola storico</button></div></div></header>
        {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}
        {success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-2"><CodeEditor value={selectedCode} onChange={setSelectedCode} onSave={saveCode} busy={busy} /><RuleEditor value={selectedRule} onChange={setSelectedRule} onSave={saveRule} busy={busy} /></div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Codici registrati</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{codes.length}</h2></div><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} mt-0 sm:max-w-xs`} placeholder="Cerca codice o topic" /></div>{loading ? <p className="mt-5 text-sm font-bold text-ink/55 dark:text-white/55">Caricamento...</p> : <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">{filteredCodes.map((code) => <article key={code.code} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => editCode(code)} className="text-sm font-black text-moss underline dark:text-emerald-300">{code.code}</button><span className={`rounded-full px-2 py-1 text-[0.65rem] font-black ${code.category === 'precision' ? 'bg-violet-100 text-violet-800 dark:bg-violet-300/15 dark:text-violet-200' : 'bg-mint text-moss dark:bg-emerald-300/15 dark:text-emerald-200'}`}>{code.category}</span>{code.status === 'archived' ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.65rem] font-black text-slate-600 dark:bg-white/10 dark:text-white/50">archiviato</span> : null}</div><p className="mt-1 text-sm font-bold text-ink dark:text-white">{code.label}</p><p className="mt-1 text-xs font-semibold text-ink/50 dark:text-white/50">{code.topic}{code.subtopic ? ` · ${code.subtopic}` : ''}{code.group_key ? ` · gruppo ${code.group_key}` : ''}</p></div><button type="button" onClick={async () => { await archiveDiagnosticCode(code.code, code.status !== 'archived'); await load(); }} className="self-start rounded-full border border-ink/15 px-3 py-1.5 text-xs font-black text-ink dark:border-white/20 dark:text-white">{code.status === 'archived' ? 'Riattiva' : 'Archivia'}</button></article>)}{filteredCodes.length === 0 ? <p className="py-6 text-sm text-ink/55 dark:text-white/55">Nessun codice corrispondente.</p> : null}</div>}</section>
          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Regole attive</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{rules.length}</h2><div className="mt-5 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">{rules.map((rule) => <article key={rule.rule_key} className="py-4"><div className="flex items-start justify-between gap-3"><div><button type="button" onClick={() => editRule(rule)} className="text-sm font-black text-violet-700 underline dark:text-violet-300">{rule.rule_key}</button><p className="mt-1 text-xs font-bold text-ink/50 dark:text-white/50">{rule.topic} · priorità {rule.priority}</p></div><button type="button" onClick={async () => { await archiveDiagnosticRule(rule.rule_key, rule.status !== 'archived'); await load(); }} className="text-xs font-black text-ink/60 underline dark:text-white/60">{rule.status === 'archived' ? 'Riattiva' : 'Archivia'}</button></div><p className="mt-3 text-sm leading-6 text-ink/65 dark:text-white/65">{rule.output_config?.messages?.it || 'Nessun messaggio italiano configurato.'}</p></article>)}{rules.length === 0 ? <p className="py-6 text-sm text-ink/55 dark:text-white/55">Nessuna regola configurata.</p> : null}</div></section>
        </div>
      </div></section>
    </>
  );
}

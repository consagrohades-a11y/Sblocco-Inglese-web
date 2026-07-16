import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  Headphones,
  LockKeyhole,
  Mail,
  Play,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import AssessmentProfileResult from '../components/assessment/AssessmentProfileResult';
import { assessmentQuestions, buildAssessmentResult } from '../data/assessmentQuiz';
import {
  markAssessmentEmailStatus,
  requestAssessmentFollowup,
  submitAssessmentLead,
} from '../lib/assessmentLeadsApi.js';

const STORAGE_KEY = 'sblocco_public_assessment_v1';

function OptionCard({ option, selected, onSelect, multiple = false }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`focus-ring group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition sm:p-5 ${selected
        ? 'border-moss bg-mint/55 shadow-soft dark:border-mint/40 dark:bg-mint/[0.12]'
        : 'border-ink/10 bg-white hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.045]'}`}
    >
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border ${multiple ? 'rounded-lg' : 'rounded-full'} ${selected ? 'border-moss bg-moss text-white dark:border-mint dark:bg-mint dark:text-ink' : 'border-ink/20 bg-white text-transparent dark:border-white/25 dark:bg-white/[0.04]'}`}>
        <Check aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black leading-6 text-ink dark:text-white">{option.label}</span>
        {option.description ? <span className="mt-1.5 block text-sm font-semibold leading-6 text-ink/58 dark:text-white/58">{option.description}</span> : null}
      </span>
    </button>
  );
}

function ListeningQuestion({ question, value, onChange, replayCount, onReplay }) {
  const [playing, setPlaying] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  function playAudio() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setUnsupported(true);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.audioText);
    utterance.lang = 'en-GB';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => {
      setPlaying(false);
      setUnsupported(true);
    };
    onReplay();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-[1.75rem] bg-ink p-5 text-white sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={playAudio}
            className="focus-ring grid h-16 w-16 shrink-0 place-items-center rounded-full bg-butter text-ink shadow-lg transition hover:scale-105"
            aria-label="Riproduci il listening"
          >
            {playing ? <span className="flex gap-1"><span className="h-4 w-1 animate-pulse rounded-full bg-ink" /><span className="h-6 w-1 animate-pulse rounded-full bg-ink" /><span className="h-4 w-1 animate-pulse rounded-full bg-ink" /></span> : <Play aria-hidden="true" className="ml-1 h-6 w-6" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200/70">Audio breve</p>
            <p className="mt-2 text-lg font-black">Ascolta il messaggio e identifica il motivo principale.</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/48">
              <Headphones aria-hidden="true" className="h-4 w-4" />
              {replayCount ? `${replayCount} ${replayCount === 1 ? 'ascolto' : 'ascolti'}` : 'Non ancora ascoltato'}
            </div>
          </div>
        </div>
        {unsupported ? (
          <div className="relative mt-5 rounded-xl border border-amber-200/20 bg-amber-200/10 p-4 text-sm font-semibold leading-6 text-amber-100">
            Il browser non riesce a riprodurre la voce. Usa questo testo di emergenza: “{question.audioText}”
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3">
        {question.options.map((option) => (
          <OptionCard key={option.value} option={option} selected={value === option.value} onSelect={() => onChange(option.value)} />
        ))}
      </div>
    </div>
  );
}

function Intro({ onStart }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          Profilo Sblocco gratuito
        </span>
        <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.96] text-white sm:text-6xl">
          Capisci cosa ti blocca prima di scegliere un corso.
        </h1>
        <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-white/72 sm:text-xl">
          Non riceverai un generico “sei B1”. Il profilo distingue fondamenta, listening, risposta sotto pressione e recupero del linguaggio, poi ti indica il percorso più sensato.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            [Clock3, '6-8 minuti', 'Un passaggio alla volta'],
            [Target, 'Profilo pratico', 'Basato sulle tue situazioni reali'],
            [Mail, 'Risultato via email', 'Nessun account obbligatorio'],
          ].map(([Icon, title, text]) => (
            <div key={title} className="rounded-2xl border border-white/12 bg-white/[0.06] p-4">
              <Icon aria-hidden="true" className="h-5 w-5 text-mint" />
              <p className="mt-3 text-sm font-black text-white">{title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/48">{text}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onStart}
          className="focus-ring mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-butter px-7 py-3.5 text-base font-black text-ink shadow-xl transition hover:-translate-y-0.5 hover:bg-white"
        >
          Inizia il profilo
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
        <p className="mt-4 text-xs font-semibold leading-5 text-white/42">Non è una certificazione ufficiale CEFR e non sostituisce un esame linguistico.</p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.07] p-5 shadow-2xl backdrop-blur sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-butter/12 blur-3xl" />
        <p className="relative text-xs font-black uppercase tracking-[0.12em] text-mint">Il profilo che riceverai</p>
        <div className="relative mt-5 grid gap-4">
          {[
            ['Strutture e fondamenta', 68, 'from-coral to-butter'],
            ['Comprensione in tempo reale', 47, 'from-cyan-400 to-mint'],
            ['Risposta sotto pressione', 39, 'from-violet-400 to-coral'],
            ['Recupero del linguaggio', 56, 'from-butter to-mint'],
          ].map(([label, score, tone]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#13211d]/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-black text-white">{label}</p>
                <span className="text-sm font-black text-mint">{score}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="relative mt-5 rounded-2xl bg-mint p-5 text-ink">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-moss">Esempio di insight</p>
          <p className="mt-2 text-lg font-black leading-6">Sai più inglese di quanto riesci a usare sotto pressione.</p>
        </div>
      </div>
    </div>
  );
}

export default function Assessment() {
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ listening_replays: 0 });
  const [startedAt, setStartedAt] = useState(Date.now());
  const [contact, setContact] = useState({ name: '', email: '', profession: '', whatsapp: '', resultConsent: false, marketingConsent: false, website: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [leadToken, setLeadToken] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [followupRequested, setFollowupRequested] = useState(false);

  const question = assessmentQuestions[step];
  const result = useMemo(() => buildAssessmentResult(answers), [answers]);
  const progress = Math.round(((step + 1) / assessmentQuestions.length) * 100);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored?.answers && stored?.phase !== 'result') {
        setAnswers(stored.answers);
        setStep(Math.min(Number(stored.step || 0), assessmentQuestions.length - 1));
        setPhase(stored.phase || 'intro');
        setStartedAt(stored.startedAt || Date.now());
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (phase === 'result') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, step, answers, startedAt }));
  }, [phase, step, answers, startedAt]);

  function start() {
    setStartedAt(Date.now());
    setPhase('quiz');
  }

  function setAnswer(value) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  function toggleMultiple(value) {
    const current = Array.isArray(answers[question.id]) ? answers[question.id] : [];
    if (current.includes(value)) {
      setAnswer(current.filter((item) => item !== value));
      return;
    }
    if (question.maxSelections && current.length >= question.maxSelections) return;
    setAnswer([...current, value]);
  }

  function canContinue() {
    const value = answers[question.id];
    if (question.type === 'multiple') return Array.isArray(value) && value.length > 0;
    return Boolean(value);
  }

  function next() {
    if (!canContinue()) return;
    if (step === assessmentQuestions.length - 1) {
      setPhase('gate');
      return;
    }
    setStep((current) => current + 1);
  }

  function back() {
    if (step === 0) {
      setPhase('intro');
      return;
    }
    setStep((current) => current - 1);
  }

  function restart() {
    setAnswers({ listening_replays: 0 });
    setStep(0);
    setPhase('intro');
    setLeadToken('');
    setEmailStatus('');
    window.localStorage.removeItem(STORAGE_KEY);
  }

  async function sendResultEmail(token) {
    try {
      const response = await fetch('/api/send-assessment-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contact.name.trim(),
          email: contact.email.trim(),
          profession: contact.profession.trim(),
          result,
          resultToken: token,
          elapsedMs: Date.now() - startedAt,
          website: contact.website,
        }),
      });
      if (!response.ok) throw new Error('Email delivery failed');
      setEmailStatus('sent');
      await markAssessmentEmailStatus(token, 'sent').catch(() => {});
    } catch {
      setEmailStatus('failed');
      await markAssessmentEmailStatus(token, 'failed').catch(() => {});
    }
  }

  async function submitContact(event) {
    event.preventDefault();
    setSubmitError('');
    if (!contact.name.trim() || !contact.email.trim()) {
      setSubmitError('Inserisci nome ed email per ricevere il profilo completo.');
      return;
    }
    if (!contact.resultConsent) {
      setSubmitError('È necessario accettare il trattamento dei dati per ricevere il risultato richiesto.');
      return;
    }
    if (contact.website) return;

    setSubmitting(true);
    try {
      const payload = {
        full_name: contact.name.trim(),
        email: contact.email.trim(),
        profession: contact.profession.trim(),
        whatsapp: contact.whatsapp.trim(),
        goal: answers.goal,
        recommended_course: result.recommendation.key,
        profile_key: result.profileKey,
        primary_blocker: result.primaryTitle,
        beta_eligible: result.betaEligible,
        marketing_consent: contact.marketingConsent,
        result_consent: contact.resultConsent,
        answers,
        result,
        source: searchParams.get('source') || 'website_assessment',
        utm_source: searchParams.get('utm_source') || '',
        utm_medium: searchParams.get('utm_medium') || '',
        utm_campaign: searchParams.get('utm_campaign') || '',
      };
      const lead = await submitAssessmentLead(payload);
      if (!lead?.result_token) throw new Error('Il profilo non è stato salvato correttamente.');
      setLeadToken(lead.result_token);
      setPhase('result');
      window.localStorage.removeItem(STORAGE_KEY);
      sendResultEmail(lead.result_token);
    } catch (error) {
      setSubmitError(error.message || 'Non è stato possibile salvare il profilo. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  async function followup(type) {
    await requestAssessmentFollowup(leadToken, type);
    setFollowupRequested(true);
  }

  return (
    <>
      <SEO title="Profilo Sblocco gratuito | Sblocco Inglese" description="Scopri cosa limita davvero il tuo inglese e quale percorso è più adatto tra Business English, speaking, listening, colloqui e fondamenta." />
      <section className="relative min-h-[calc(100svh-68px)] overflow-hidden bg-ink py-10 text-white sm:py-14 lg:py-16">
        <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-mint/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-coral/8 blur-3xl" />
        <div className="section-shell relative">
          {phase === 'intro' ? <Intro onStart={start} /> : null}

          {phase === 'quiz' ? (
            <div className="mx-auto max-w-4xl">
              <div className="mb-5 flex items-center justify-between gap-4 text-xs font-black uppercase tracking-[0.1em] text-white/48">
                <span>Passaggio {step + 1} di {assessmentQuestions.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="mb-7 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-mint via-butter to-coral transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>

              <section className="rounded-[2rem] border border-white/12 bg-paper p-5 text-ink shadow-2xl dark:bg-[#121d1a] dark:text-white sm:p-7 lg:p-9">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">{question.eyebrow}</p>
                <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{question.title}</h1>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-ink/58 dark:text-white/58">{question.description}</p>

                <div className="mt-7">
                  {question.type === 'listening' ? (
                    <ListeningQuestion
                      question={question}
                      value={answers[question.id]}
                      onChange={setAnswer}
                      replayCount={Number(answers.listening_replays || 0)}
                      onReplay={() => setAnswers((current) => ({ ...current, listening_replays: Number(current.listening_replays || 0) + 1 }))}
                    />
                  ) : (
                    <div className={`grid gap-3 ${question.options.length > 5 ? 'md:grid-cols-2' : ''}`}>
                      {question.options.map((option) => {
                        const selected = question.type === 'multiple'
                          ? (answers[question.id] || []).includes(option.value)
                          : answers[question.id] === option.value;
                        return (
                          <OptionCard
                            key={option.value}
                            option={option}
                            selected={selected}
                            multiple={question.type === 'multiple'}
                            onSelect={() => question.type === 'multiple' ? toggleMultiple(option.value) : setAnswer(option.value)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink/10 pt-5 dark:border-white/10">
                  <button type="button" onClick={back} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 py-2.5 text-sm font-black text-ink dark:border-white/15 dark:text-white">
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Indietro
                  </button>
                  <button
                    type="button"
                    disabled={!canContinue()}
                    onClick={next}
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-moss px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#096d58] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {step === assessmentQuestions.length - 1 ? 'Calcola il profilo' : 'Continua'}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {phase === 'gate' ? (
            <div className="mx-auto max-w-5xl">
              <div className="grid gap-6 lg:grid-cols-[1fr_0.88fr] lg:items-start">
                <section className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.07] p-6 shadow-2xl sm:p-8">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-butter/12 blur-3xl" />
                  <span className="relative inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-moss">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    Profilo calcolato
                  </span>
                  <h1 className="relative mt-5 text-4xl font-black leading-tight sm:text-5xl">{result.primaryTitle}</h1>
                  <p className="relative mt-5 text-base font-semibold leading-8 text-white/68">{result.primarySummary}</p>
                  <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
                    {result.dimensions.map((dimension) => (
                      <div key={dimension.key} className="rounded-2xl border border-white/10 bg-[#13211d]/85 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-black">{dimension.label}</p>
                          <LockKeyhole aria-hidden="true" className="h-4 w-4 text-white/28" />
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-white/20 to-white/5 blur-[1px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="relative mt-5 text-xs font-semibold leading-5 text-white/42">Inserisci la tua email per vedere punteggi, percorso consigliato e idoneità alla cohort beta.</p>
                </section>

                <form onSubmit={submitContact} className="rounded-[2rem] border border-ink/10 bg-paper p-6 text-ink shadow-2xl dark:border-white/10 dark:bg-[#121d1a] dark:text-white sm:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Ricevi il risultato</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight">Dove devo inviarti il profilo completo?</h2>
                  <p className="mt-4 text-sm font-semibold leading-7 text-ink/58 dark:text-white/58">Accettiamo Gmail, Outlook, email di lavoro o qualsiasi altro indirizzo valido.</p>

                  <div className="mt-6 grid gap-4">
                    <label className="text-xs font-black">Nome
                      <input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} autoComplete="name" className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-moss dark:border-white/15 dark:bg-white/[0.05]" required />
                    </label>
                    <label className="text-xs font-black">Email
                      <input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} autoComplete="email" placeholder="nome@email.com" className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-moss dark:border-white/15 dark:bg-white/[0.05]" required />
                    </label>
                    <label className="text-xs font-black">Professione o situazione attuale
                      <input value={contact.profession} onChange={(event) => setContact({ ...contact, profession: event.target.value })} placeholder="Es. project manager, studentessa, sommelier" className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-moss dark:border-white/15 dark:bg-white/[0.05]" />
                    </label>
                    <label className="text-xs font-black">WhatsApp, facoltativo
                      <input value={contact.whatsapp} onChange={(event) => setContact({ ...contact, whatsapp: event.target.value })} autoComplete="tel" placeholder="+39 ..." className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-moss dark:border-white/15 dark:bg-white/[0.05]" />
                    </label>
                    <input tabIndex="-1" aria-hidden="true" value={contact.website} onChange={(event) => setContact({ ...contact, website: event.target.value })} className="hidden" autoComplete="off" />
                  </div>

                  <div className="mt-5 grid gap-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 p-3 text-xs font-semibold leading-5 dark:border-white/10">
                      <input type="checkbox" checked={contact.resultConsent} onChange={(event) => setContact({ ...contact, resultConsent: event.target.checked })} className="mt-0.5" />
                      <span>Acconsento al trattamento dei dati necessario per salvare e inviarmi il risultato richiesto. <Link to="/privacy" className="font-black text-moss underline dark:text-mint">Privacy</Link></span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 p-3 text-xs font-semibold leading-5 dark:border-white/10">
                      <input type="checkbox" checked={contact.marketingConsent} onChange={(event) => setContact({ ...contact, marketingConsent: event.target.checked })} className="mt-0.5" />
                      <span>Facoltativo: desidero ricevere aperture dei corsi, inviti alla beta e risorse pratiche di Sblocco Inglese.</span>
                    </label>
                  </div>

                  {submitError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900 dark:bg-red-400/10 dark:text-red-200">{submitError}</p> : null}

                  <button type="submit" disabled={submitting} className="focus-ring mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-base font-black text-white transition hover:bg-[#096d58] disabled:opacity-55">
                    {submitting ? 'Sto preparando il profilo...' : 'Sblocca e invia il risultato'}
                    <Mail aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => setPhase('quiz')} className="mt-3 inline-flex w-full items-center justify-center gap-2 py-2 text-xs font-black text-ink/45 dark:text-white/45">
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Rivedi le risposte
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {phase === 'result' ? (
            <div className="mx-auto max-w-6xl">
              <AssessmentProfileResult
                result={result}
                name={contact.name}
                token={leadToken}
                emailStatus={emailStatus}
                onRequestFollowup={followup}
                followupRequested={followupRequested}
              />
              <div className="mt-8 flex justify-center">
                <button type="button" onClick={restart} className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/10 hover:text-white">
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Rifai il profilo
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

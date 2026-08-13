import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  ListChecks,
  RefreshCw,
  Target,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import RecoveryNav from '../components/recovery/RecoveryNav.jsx';
import { recoverySessionDisplayTitle, recoverySessionKind } from '../lib/recoveryPresentation.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { RECOVERY_MODE_LABELS, recoveryTopicLabel } from '../config/recovery.js';
import {
  loadRecoveryAccessState,
  loadRecoveryEnrollment,
  loadRecoveryState,
  recalculateRecoveryPlan,
  syncMaterializedRecoverySessions,
} from '../lib/recoveryApi.js';
import {
  calculateRecoveryReadiness,
  daysUntilRecoveryExam,
  recoveryModeForExamDate,
} from '../lib/recoveryPlanEngine.js';
import { supabase } from '../lib/supabaseClient.js';
import '../styles/learnerEditorial.css';

function firstNameFromProfile(profile, user) {
  const value = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'studente';
  return String(value).trim().split(/\s+/)[0] || 'studente';
}

function formatDate(value) {
  if (!value) return 'Nessuna urgenza';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(new Date(value));
}

function SummaryCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="learner-summary-card">
      <span className="learner-summary-card__icon"><Icon aria-hidden="true" /></span>
      <div><small>{label}</small><strong>{value}</strong>{detail ? <p>{detail}</p> : null}</div>
    </article>
  );
}

function ProgressRing({ value, label = 'preparazione' }) {
  const safe = Math.max(0, Math.min(100, Math.round(Number(value || 0))));
  return (
    <div className="learner-progress-ring" style={{ '--progress': `${safe * 3.6}deg` }} aria-label={`${label}: ${safe}%`}>
      <div><strong>{safe}%</strong><span>{label}</span></div>
    </div>
  );
}

function GenericDashboard({ firstName }) {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [activeDays, setActiveDays] = useState(new Set());

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString();
      const [assignmentResponse, reviewResponse, dueResponse] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, learner_note, status, deadline_at, estimated_minutes, created_at, display_order')
          .in('status', ['published', 'completed'])
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('learner_review_history')
          .select('id, created_at')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),
        supabase
          .from('learner_srs_state')
          .select('id', { count: 'exact', head: true })
          .lte('due_at', new Date().toISOString()),
      ]);
      if (!active) return;
      setAssignments(assignmentResponse.data || []);
      const reviews = reviewResponse.data || [];
      setReviewCount(reviews.length);
      setDueCount(dueResponse.count || 0);
      setActiveDays(new Set(reviews.map((item) => new Date(item.created_at).toISOString().slice(0, 10))));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const open = assignments.filter((item) => item.status === 'published');
  const completed = assignments.filter((item) => item.status === 'completed');
  const nextAssignments = open.slice(0, 3);
  const nearestDeadline = open
    .filter((item) => item.deadline_at)
    .sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at))[0]?.deadline_at;
  const completion = assignments.length ? Math.round((completed.length / assignments.length) * 100) : 0;
  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(Date.now() - (6 - offset) * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    return {
      active: activeDays.has(key),
      key,
      label: new Intl.DateTimeFormat('it-IT', { weekday: 'narrow' }).format(date),
    };
  });

  return (
    <div className="learner-shell learner-dashboard learner-dashboard--standard">
      <header className="learner-hero">
        <div className="learner-hero__copy">
          <p className="learner-hero__hello">Che bello rivederti!</p>
          <h1 className="learner-display">Ciao, <em>{firstName}.</em></h1>
          <p className="learner-hero__support"><strong>Ogni piccolo passo</strong> ti avvicina ai tuoi obiettivi.<br />Sei nel posto giusto.</p>
          {!loading ? <div className="learner-notice">{reviewCount ? <Flame aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />} {reviewCount ? `Hai completato ${reviewCount} ${reviewCount === 1 ? 'ripasso' : 'ripassi'} questa settimana. Ottimo ritmo!` : open.length ? `Hai ${open.length} ${open.length === 1 ? 'attività pronta' : 'attività pronte'} da cui continuare.` : 'Sei in pari con le attività assegnate.'}</div> : null}
        </div>
        <div className="learner-hero__art learner-standard-hero-art" aria-hidden="true">
          <img className="learner-standard-hero-art__light" src="/assets/brand/learner-dashboard-hero-light-transparent-v2.png" alt="" />
          <img className="learner-standard-hero-art__dark" src="/assets/brand/learner-dashboard-hero-dark-transparent-v2.png" alt="" />
        </div>
      </header>

      <div className="learner-summary-grid">
        <SummaryCard icon={Target} label="Il tuo obiettivo" value="Un passo alla volta" detail="Continua dal prossimo compito utile." />
        <SummaryCard icon={ListChecks} label="Da fare oggi" value={`${open.length} ${open.length === 1 ? 'attività' : 'attività'}`} detail={open.length ? 'Apri il prossimo passo qui sotto.' : 'Sei in pari con il piano.'} />
        <SummaryCard icon={CalendarDays} label="Prossima scadenza" value={formatDate(nearestDeadline)} detail={nearestDeadline ? 'La scadenza più vicina tra le tue attività.' : 'Puoi seguire il tuo ritmo.'} />
      </div>

      <div className="learner-main-grid">
        <section className="learner-panel learner-panel--main">
          <div className="learner-panel__heading">
            <div><span className="learner-panel__eyebrow">Oggi</span><h2>Il tuo prossimo passo</h2></div>
            <Link to="/assignments" className="learner-text-link">Vedi il piano <ArrowRight aria-hidden="true" /></Link>
          </div>
          {nextAssignments.length ? (
            <ol className="learner-standard-assignment-list">
              {nextAssignments.map((assignment, index) => (
                <li key={assignment.id}>
                  <span className="learner-standard-assignment-list__number">{index + 1}</span>
                  <span className="learner-standard-assignment-list__icon"><BookOpen aria-hidden="true" /></span>
                  <span className="learner-standard-assignment-list__copy"><small>Attività assegnata</small><strong>{assignment.title}</strong><p>{assignment.learner_note || 'Continua da qui per mantenere il filo del tuo percorso.'}</p></span>
                  <span className="learner-standard-assignment-list__time">{assignment.estimated_minutes ? <><Clock3 aria-hidden="true" />~ {assignment.estimated_minutes} min</> : null}</span>
                  <Link to={`/assignments/${assignment.id}`} className={index === 0 ? 'learner-primary-button' : 'learner-secondary-button'}>{index === 0 ? 'Inizia' : 'Apri'} <ArrowRight aria-hidden="true" size={15} /></Link>
                </li>
              ))}
            </ol>
          ) : <div className="learner-empty"><strong>Le attività assegnate sono complete.</strong><br />Puoi fare un ripasso SRS oppure allenarti sulle parole scelte per te.</div>}
        </section>

        <aside className="learner-panel learner-panel--side">
          <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Il tuo ritmo</span><h3>Progressi visibili</h3></div></div>
          <ProgressRing value={completion} label="completate" />
          <p className="learner-progress-cheer">{completion ? 'Stai andando forte!' : 'Ogni passo conta.'}</p>
          <div className="learner-progress-list">
            <div className="learner-progress-row"><span>Completate</span><span className="learner-progress-row__track"><span className="learner-progress-row__fill" style={{ width: `${completion}%` }} /></span><span>{completed.length}</span></div>
            <div className="learner-progress-row"><span>Da fare</span><span className="learner-progress-row__track"><span className="learner-progress-row__fill" style={{ width: `${assignments.length ? (open.length / assignments.length) * 100 : 0}%` }} /></span><span>{open.length}</span></div>
            <div className="learner-progress-row"><span>Ripassi 7g</span><span className="learner-progress-row__track"><span className="learner-progress-row__fill" style={{ width: `${Math.min(100, reviewCount * 5)}%` }} /></span><span>{reviewCount}</span></div>
          </div>
          <p className="learner-empty learner-progress-note">Questi dati servono a vedere cosa stai consolidando. Non sono un voto.</p>
          <Link to="/progressi" className="learner-text-link">Apri i progressi <ArrowRight size={14} /></Link>
        </aside>
      </div>

      <div className="learner-lower-grid learner-lower-grid--standard">
        <article className="learner-lower-card"><p className="learner-kicker">Esercizi</p><h3>La tua giornata tipo</h3><p>Un piccolo segreto: la costanza fa una grande differenza.</p><div className="learner-form-actions"><Link to="/assignments" className="learner-text-link">Vedi il tuo piano <ArrowRight /></Link></div></article>
        <article className="learner-lower-card"><p className="learner-kicker">Ripasso SRS</p><h3>Continua a costruire il tuo futuro</h3><p>{dueCount ? `${dueCount} ${dueCount === 1 ? 'card è pronta' : 'card sono pronte'} per un ripasso breve.` : 'Le parole torneranno quando sarà il momento giusto.'}</p><div className="learner-form-actions"><Link to="/attivita/srs" className="learner-text-link">Apri il ripasso <ArrowRight /></Link></div></article>
        <article className="learner-lower-card"><p className="learner-kicker">Pratica mirata</p><h3>Allenati sulle parole scelte per te</h3><p>Quiz separati dal ripasso SRS, costruiti sulle indicazioni del tuo insegnante.</p><div className="learner-form-actions"><Link to="/attivita/pratica-mirata" className="learner-text-link">Apri la pratica <ArrowRight /></Link></div></article>
      </div>

      <section className="learner-standard-week">
        <div><p className="learner-kicker">La tua settimana</p><h2 className="learner-display">{activeDays.size} {activeDays.size === 1 ? 'giorno di ripasso' : 'giorni di ripasso'}</h2><p>Nessuna serie da proteggere. Serve soltanto a vedere il ritmo che stai costruendo.</p></div>
        <div className="learner-standard-week__days" aria-label="Attività di ripasso negli ultimi sette giorni">{week.map((day) => <span key={day.key} className={day.active ? 'is-active' : ''}><i aria-hidden="true" />{day.label}</span>)}</div>
      </section>

      <section className="learner-bottom-cta"><div><h2 className="learner-display">Tu, cosa vuoi riuscire a fare?</h2><p>Qual è il tuo prossimo obiettivo? Studiare, lavorare, viaggiare o parlare con più sicurezza?</p></div><Link to="/assessment" className="learner-primary-button">I miei obiettivi <ArrowRight size={16} /></Link></section>
    </div>
  );
}

function RecoveryDashboard({ firstName, access }) {
  const location = useLocation();
  const enrollment = access.enrollment;
  const state = access.state || { topics: [], sessions: [], assessments: [], errorEvidence: [] };
  const daysRemaining = daysUntilRecoveryExam(enrollment?.exam_date);
  const completedSessions = state.sessions.filter((session) => session.status === 'completed');
  const remainingSessions = state.sessions.filter((session) => !['completed', 'skipped'].includes(session.status));
  const next = remainingSessions.find((session) => ['available', 'in_progress'].includes(session.status)) || remainingSessions[0] || null;
  const backendReadiness = access.readiness?.current?.available ? access.readiness.current : null;
  const fallbackReadiness = calculateRecoveryReadiness(state.topics.map((topic) => ({
    masteryScore: topic.mastery_score,
    diagnosticScore: topic.diagnostic_score,
  })));
  const readiness = Math.round(Number(backendReadiness?.readiness_score ?? fallbackReadiness));
  const confidence = backendReadiness ? Math.round(Number(backendReadiness.confidence_score || 0)) : null;
  const highPriority = state.topics.filter((topic) => topic.priority_band === 'high').length;
  const totalErrors = state.errorEvidence.reduce((sum, item) => sum + Number(item.repeated_errors || 0), 0);
  const nextMockIndex = state.sessions.findIndex((session) => !['completed', 'skipped'].includes(session.status) && session.session_type.startsWith('mock_'));
  const currentIndex = next ? state.sessions.findIndex((session) => session.id === next.id) : -1;
  const sessionsToMock = nextMockIndex >= 0 && currentIndex >= 0 ? Math.max(0, nextMockIndex - currentIndex) : null;
  const completedPercent = state.sessions.length ? Math.round((completedSessions.length / state.sessions.length) * 100) : 0;
  const postExam = Number.isFinite(daysRemaining) && daysRemaining < 0;

  if (!enrollment || enrollment.status === 'onboarding') {
    return (
      <div className="learner-shell learner-dashboard">
        <header className="learner-hero">
          <div className="learner-hero__copy"><p className="learner-hero__hello">Recupero Debito Inglese</p><h1 className="learner-display">Ciao, <em>{firstName}.</em></h1><p className="learner-hero__support">Prima di dirti cosa studiare oggi, ci servono data della prova, classe e programma della scuola.</p><div className="learner-form-actions"><Link to="/recupero-debito/onboarding" className="learner-primary-button">Configura il percorso <ArrowRight size={16} /></Link></div></div>
          <div className="learner-hero__art" aria-hidden="true"><img src="/assets/brand/sblocco-editorial-conversation-v2.png" alt="" /></div>
        </header>
      </div>
    );
  }

  return (
    <div className="learner-shell learner-dashboard">
      <RecoveryNav />
      <header className="learner-hero">
        <div className="learner-hero__copy">
          <p className="learner-hero__hello">{postExam ? 'Il percorso resta qui con te.' : 'Vediamo cosa conviene fare oggi.'}</p>
          <h1 className="learner-display">Ciao, <em>{firstName}.</em></h1>
          <p className="learner-hero__support">
            {postExam
              ? 'La data della prova è passata. I risultati, gli errori e le sessioni completate restano disponibili: non cancelliamo il lavoro fatto.'
              : daysRemaining === 0
                ? 'La prova è oggi. Concentrati soltanto sul ripasso essenziale già previsto nel piano.'
                : `Mancano ${daysRemaining} ${daysRemaining === 1 ? 'giorno' : 'giorni'} alla prova.`}
          </p>
          {location.state?.recoveryPlanUpdated ? <div className="learner-notice"><RefreshCw aria-hidden="true" /> Il piano è stato aggiornato in base al tempo e ai dati disponibili.</div> : null}
        </div>
        <div className="learner-hero__art" aria-hidden="true"><img src="/assets/brand/sblocco-editorial-conversation-v2.png" alt="" /></div>
      </header>

      <div className="learner-summary-grid">
        <SummaryCard icon={ListChecks} label="Il tuo percorso" value={`${completedSessions.length} / ${state.sessions.length} sessioni`} detail={`${completedPercent}% del piano completato`} />
        <SummaryCard icon={Target} label="Preparazione" value={`${readiness}%`} detail={confidence == null ? 'Stima educativa sui dati disponibili.' : `Qualità delle evidenze: ${confidence}%.`} />
        <SummaryCard icon={BookOpen} label="Argomenti da recuperare" value={`${highPriority}`} detail={highPriority ? 'Con priorità alta nel piano attuale.' : 'Nessuna priorità alta al momento.'} />
        <SummaryCard icon={CalendarDays} label="Prossima simulazione" value={sessionsToMock === null ? 'Completata o non prevista' : sessionsToMock === 0 ? 'È il prossimo passo' : `Tra ${sessionsToMock} ${sessionsToMock === 1 ? 'sessione' : 'sessioni'}`} detail="Le simulazioni non mostrano correzioni durante la prova." />
      </div>

      {enrollment.mode !== recoveryModeForExamDate(enrollment.exam_date) && !postExam ? (
        <div className="learner-plan-update"><strong>Il tempo rimasto è cambiato.</strong> Il piano verrà ricalcolato mantenendo le attività già completate e riducendo ciò che è meno prioritario.</div>
      ) : null}

      <div className="learner-main-grid">
        <section className="learner-panel learner-panel--main">
          <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Oggi</span><h2>Il tuo prossimo passo</h2></div><Link to="/recupero-debito/percorso" className="learner-text-link">Vedi il percorso <ArrowRight /></Link></div>
          {next && !postExam ? (
            <article className="learner-next-card">
              <div className="learner-next-card__topline"><span className="learner-next-card__number">{next.sequence_index}</span><span className="learner-next-card__type">{next.session_type === 'error_review' ? 'Ripasso errori' : recoverySessionKind(next.title, next.session_type)}</span></div>
              <h3>{recoverySessionDisplayTitle(next.title)}</h3>
              <p className="learner-next-card__reason">{next.rationale || 'Continua da qui: il piano mette questa attività prima delle altre in base ai dati disponibili.'}</p>
              <div className="learner-next-card__meta"><span><Clock3 aria-hidden="true" />~ {next.estimated_minutes} min</span>{next.topic_key ? <span><BookOpen aria-hidden="true" />{recoveryTopicLabel(next.topic_key)}</span> : null}</div>
              <div className="learner-next-card__action"><Link to={`/recupero-debito/sessione/${next.id}`} className="learner-primary-button">{next.status === 'in_progress' ? 'Continua la sessione' : 'Inizia la sessione'} <ArrowRight size={16} /></Link></div>
            </article>
          ) : postExam ? (
            <div className="learner-empty"><strong>Hai completato il periodo di recupero.</strong><br />Puoi rivedere il percorso e continuare a consolidare gli argomenti senza che i dati vengano rimossi.</div>
          ) : <p className="learner-empty">Il piano non contiene ancora sessioni. Aggiorna la configurazione per rigenerarlo.</p>}
        </section>

        <aside className="learner-panel learner-panel--side">
          <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Prontezza sul programma</span><h3>Preparazione attuale</h3></div></div>
          <ProgressRing value={readiness} label="preparazione" />
          {confidence != null ? <p className="learner-progress-cheer">Evidenze disponibili: {confidence}%</p> : null}
          <div className="learner-progress-list">
            {state.topics.slice(0, 4).map((topic) => {
              const value = Math.round(Number(topic.mastery_score ?? topic.diagnostic_score ?? 0));
              return <div className="learner-progress-row" key={topic.topic_key}><span>{recoveryTopicLabel(topic.topic_key)}</span><span className="learner-progress-row__track"><span className="learner-progress-row__fill" style={{ width: `${value}%` }} /></span><span>{value}%</span></div>;
            })}
          </div>
          <p className="learner-empty" style={{ paddingBottom: 0 }}>La preparazione combina padronanza, qualità delle verifiche, simulazioni ed errori ricorrenti. Non predice il voto della scuola.</p>
          <Link to="/recupero-debito/preparazione" className="learner-text-link">Vedi il report <ArrowRight size={14} /></Link>
        </aside>
      </div>

      <div className="learner-lower-grid">
        <article className="learner-lower-card"><p className="learner-kicker">Il tuo piano</p><h3>{RECOVERY_MODE_LABELS[enrollment.mode] || enrollment.mode}</h3><p>{postExam ? 'Il piano resta consultabile anche dopo la data della prova.' : 'Le priorità possono cambiare dopo una verifica, una simulazione o con meno tempo disponibile.'}</p><div className="learner-form-actions"><Link to="/recupero-debito/percorso" className="learner-text-link">Vedi tutte le sessioni <ArrowRight /></Link></div></article>
        <article className="learner-lower-card"><p className="learner-kicker">Ripassa gli errori</p><h3>{totalErrors} {totalErrors === 1 ? 'errore recente' : 'errori recenti'}</h3><p>Usiamo i pattern già rilevati negli esercizi, non una seconda lista di errori separata.</p><div className="learner-form-actions"><Link to="/recupero-debito/errori" className="learner-text-link">Apri il ripasso <ArrowRight /></Link></div></article>
        <article className="learner-lower-card"><p className="learner-kicker">Simulazioni</p><h3>{state.assessments.filter((attempt) => attempt.assessment_type.startsWith('mock_')).length} completate</h3><p>Durante una simulazione le correzioni restano nascoste fino alla consegna.</p><div className="learner-form-actions"><Link to="/recupero-debito/simulazioni" className="learner-text-link">Vedi risultati <ArrowRight /></Link></div></article>
      </div>

      <section className="learner-bottom-cta"><div><h2 className="learner-display">Il programma della scuola resta la priorità.</h2><p>Puoi modificare data o argomenti se la scuola ti consegna indicazioni diverse.</p></div><Link to="/recupero-debito/onboarding" className="learner-secondary-button">Modifica programma <ArrowRight size={16} /></Link></section>
    </div>
  );
}

export default function LearnerHome() {
  const { profile, user } = useAuth();
  const firstName = useMemo(() => firstNameFromProfile(profile, user), [profile, user]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        let loaded = await loadRecoveryAccessState();
        if (!active) return;
        if (loaded.entitled && loaded.enrollment?.status === 'active' && loaded.state) {
          const days = daysUntilRecoveryExam(loaded.enrollment.exam_date);
          const syncResults = await syncMaterializedRecoverySessions(loaded.state.sessions);
          const newlyCompleted = syncResults.some((result) => result?.completed);
          const modeChanged = Number.isFinite(days) && days >= 0 && loaded.enrollment.mode !== recoveryModeForExamDate(loaded.enrollment.exam_date);
          const needsPlan = loaded.state.sessions.length === 0 || newlyCompleted || modeChanged;
          if (needsPlan && !(Number.isFinite(days) && days < 0)) {
            const freshEnrollment = await loadRecoveryEnrollment();
            const freshState = await loadRecoveryState(freshEnrollment.id);
            await recalculateRecoveryPlan({ enrollment: freshEnrollment, state: freshState });
            loaded = await loadRecoveryAccessState();
          } else if (newlyCompleted) {
            loaded = await loadRecoveryAccessState();
          }
        }
        if (active) setAccess(loaded);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Non è stato possibile caricare la dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="learner-editorial">
      <SEO title={`Ciao, ${firstName} | Sblocco Inglese`} description="Il tuo spazio di apprendimento Sblocco Inglese." />
      {loading ? <div className="learner-shell learner-dashboard"><div className="learner-panel learner-panel--main"><p className="learner-empty">Preparazione della dashboard...</p></div></div> : null}
      {error ? <div className="learner-shell learner-dashboard"><div className="learner-panel learner-panel--main"><p className="learner-error" role="alert">{error}</p><Link to="/assignments" className="learner-secondary-button">Apri le attività esistenti</Link></div></div> : null}
      {!loading && !error && access?.entitled ? <RecoveryDashboard firstName={firstName} access={access} /> : null}
      {!loading && !error && !access?.entitled ? <GenericDashboard firstName={firstName} /> : null}
    </div>
  );
}

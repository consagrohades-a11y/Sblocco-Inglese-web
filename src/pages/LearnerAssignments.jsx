import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Leaf,
  ListChecks,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import LearnerNextLessonCard from '../components/learner/LearnerNextLessonCard.jsx';
import LearnerNotificationsPanel from '../components/learner/LearnerNotificationsPanel.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

function formatDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function firstNameFromProfile(profile, user) {
  const value = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'studente';
  return String(value).trim().split(/\s+/)[0] || 'studente';
}

const statusLabels = {
  published: 'Da fare ora',
  completed: 'Completata',
};

const activityAreas = {
  exercises: {
    label: 'Esercizi',
    title: 'I tuoi esercizi',
    description: 'Attività strutturate con risultati, correzioni e feedback dell’insegnante.',
    empty: 'Non ci sono esercizi assegnati in questo momento.',
    to: '/attivita/esercizi',
    icon: BookOpen,
    tone: 'exercises',
  },
  srs: {
    label: 'Ripasso SRS',
    title: 'Il tuo ripasso SRS',
    description: 'Card programmate nel momento giusto per rafforzare la memoria nel tempo.',
    empty: 'Non ci sono percorsi SRS assegnati in questo momento.',
    to: '/attivita/srs',
    icon: Dumbbell,
    tone: 'srs',
  },
  practice: {
    label: 'Pratica mirata',
    title: 'La tua pratica mirata',
    description: 'Quiz sulle parole e sui deck scelti direttamente dalla tua insegnante.',
    empty: 'Non ci sono quiz di pratica mirata assegnati in questo momento.',
    to: '/attivita/pratica-mirata',
    icon: Target,
    tone: 'practice',
  },
};

function SummaryCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="learner-summary-card">
      <span className="learner-summary-card__icon"><Icon aria-hidden="true" /></span>
      <div><small>{label}</small><strong>{value}</strong>{detail ? <p>{detail}</p> : null}</div>
    </article>
  );
}

function ProgressRing({ value }) {
  const safe = Math.max(0, Math.min(100, Math.round(Number(value || 0))));
  return (
    <div className="learner-progress-ring" style={{ '--progress': `${safe * 3.6}deg` }} aria-label={`Attività completate: ${safe}%`}>
      <div><strong>{safe}%</strong><span>completate</span></div>
    </div>
  );
}

function AssignmentCard({ assignment, index }) {
  const completed = assignment.status === 'completed';
  return (
    <li className={`learner-assignment-overview-row ${completed ? 'is-completed' : ''}`}>
      <span className="learner-standard-assignment-list__number">{completed ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span>
      <span className="learner-standard-assignment-list__icon"><BookOpen aria-hidden="true" /></span>
      <span className="learner-standard-assignment-list__copy">
        <small>{statusLabels[assignment.status] || assignment.status}</small>
        <strong>{assignment.title}</strong>
        <p>{assignment.learner_note || (assignment.required ? 'Attività obbligatoria assegnata dal tuo insegnante.' : 'Attività facoltativa per continuare ad allenarti.')}</p>
        {assignment.activityAreas?.length ? <span className="learner-assignment-overview-row__areas">{assignment.activityAreas.map((area) => <span key={area} className={`learner-area-tag learner-area-tag--${area}`}>{activityAreas[area].label}</span>)}</span> : null}
      </span>
      <span className="learner-standard-assignment-list__time">
        {assignment.estimated_minutes ? <><Clock3 aria-hidden="true" />~ {assignment.estimated_minutes} min</> : null}
        {assignment.deadline_at ? <><CalendarClock aria-hidden="true" />{formatDate(assignment.deadline_at)}</> : null}
      </span>
      <Link to={`/assignments/${assignment.id}`} className={completed ? 'learner-secondary-button' : 'learner-primary-button'}>
        {completed ? 'Rivedi' : index === 0 ? 'Inizia' : 'Apri'} <ArrowRight aria-hidden="true" size={15} />
      </Link>
    </li>
  );
}

export default function LearnerAssignments({ initialArea = null, previewAssignments = null, previewName = null }) {
  const { profile, user } = useAuth();
  const isPreview = Array.isArray(previewAssignments);
  const [assignments, setAssignments] = useState(previewAssignments || []);
  const [loading, setLoading] = useState(!isPreview);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isPreview) {
      setAssignments(previewAssignments);
      setLoading(false);
      setError('');
      return undefined;
    }

    let active = true;

    async function loadAssignments() {
      setLoading(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('assignments')
        .select('id, title, learner_note, status, required, deadline_at, estimated_minutes, published_at, created_at, display_order')
        .in('status', ['published', 'completed'])
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!active) return;

      if (queryError) {
        setError('Non è stato possibile caricare le tue attività. Riprova tra poco.');
        setAssignments([]);
      } else {
        const assignmentIds = (data ?? []).map((assignment) => assignment.id);
        const [resourceResult, studyResult] = assignmentIds.length ? await Promise.all([
          supabase.from('assignment_resources').select('assignment_id, resource_type').in('assignment_id', assignmentIds),
          supabase.from('assignment_study_settings').select('assignment_id, include_in_srs, snapshot_item_count').in('assignment_id', assignmentIds),
        ]) : [{ data: [], error: null }, { data: [], error: null }];

        if (!active) return;
        if (resourceResult.error || studyResult.error) {
          setError('Non è stato possibile separare le attività per tipologia. Riprova tra poco.');
          setAssignments([]);
          setLoading(false);
          return;
        }

        const resourcesByAssignment = new Map();
        (resourceResult.data || []).forEach((resource) => {
          const current = resourcesByAssignment.get(resource.assignment_id) || [];
          current.push(resource.resource_type);
          resourcesByAssignment.set(resource.assignment_id, current);
        });
        const studyByAssignment = new Map((studyResult.data || []).map((study) => [study.assignment_id, study]));
        const enriched = (data ?? []).map((assignment) => {
          const resourceTypes = resourcesByAssignment.get(assignment.id) || [];
          const study = studyByAssignment.get(assignment.id);
          const areas = [];
          if (resourceTypes.some((type) => ['custom_exercise', 'exercise_collection', 'grammar_unit'].includes(type))) areas.push('exercises');
          if (study?.include_in_srs && Number(study.snapshot_item_count || 0) > 0) areas.push('srs');
          if (resourceTypes.includes('practice_session')) areas.push('practice');
          return { ...assignment, activityAreas: areas };
        });
        const ordered = enriched.sort((a, b) => (
          Number(a.display_order || 0) - Number(b.display_order || 0)
          || new Date(b.created_at || 0) - new Date(a.created_at || 0)
        ));
        setAssignments(ordered);
      }

      setLoading(false);
    }

    loadAssignments();

    return () => {
      active = false;
    };
  }, [isPreview, previewAssignments]);

  const firstName = useMemo(() => previewName || firstNameFromProfile(profile, user), [previewName, profile, user]);
  const visibleAssignments = useMemo(() => initialArea ? assignments.filter((assignment) => assignment.activityAreas?.includes(initialArea)) : assignments, [assignments, initialArea]);
  const activeConfig = initialArea ? activityAreas[initialArea] : null;
  const activeCount = visibleAssignments.filter((assignment) => assignment.status === 'published').length;
  const completedCount = visibleAssignments.filter((assignment) => assignment.status === 'completed').length;
  const estimatedMinutes = visibleAssignments
    .filter((assignment) => assignment.status === 'published')
    .reduce((sum, assignment) => sum + Number(assignment.estimated_minutes || 0), 0);
  const nearestDeadline = visibleAssignments
    .filter((assignment) => assignment.status === 'published' && assignment.deadline_at)
    .sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at))[0]?.deadline_at;
  const completionPercent = visibleAssignments.length ? Math.round((completedCount / visibleAssignments.length) * 100) : 0;
  const openPercent = visibleAssignments.length ? Math.round((activeCount / visibleAssignments.length) * 100) : 0;

  return (
    <div className="learner-editorial">
      <SEO title={`${activeConfig?.title || 'Le mie attività'} | Sblocco Inglese`} description={activeConfig?.description || 'Attività assegnate nel tuo percorso Sblocco Inglese.'} />
      <div className="learner-shell learner-dashboard learner-dashboard--standard learner-assignments-dashboard">
        <header className="learner-hero">
          <div className="learner-hero__copy">
            <p className="learner-hero__hello">{activeConfig?.label || 'I tuoi esercizi'}</p>
            <h1 className="learner-display">Ciao, <em>{firstName}.</em></h1>
            <p className="learner-hero__support"><strong>Parti dal prossimo passo utile.</strong><br />Qui trovi attività, istruzioni e scadenze del tuo percorso.</p>
            {!loading ? <div className="learner-notice"><CheckCircle2 aria-hidden="true" />{activeCount ? `Hai ${activeCount} ${activeCount === 1 ? 'attività pronta' : 'attività pronte'} da continuare.` : 'Sei in pari con le attività assegnate.'}</div> : null}
          </div>
          <div className="learner-hero__art learner-standard-hero-art" aria-hidden="true">
            <img className="learner-standard-hero-art__light" src="/assets/brand/learner-dashboard-hero-light-transparent-v2.png" alt="" />
            <img className="learner-standard-hero-art__dark" src="/assets/brand/learner-dashboard-hero-dark-transparent-v2.png" alt="" />
          </div>
        </header>

        <div className="learner-summary-grid">
          <SummaryCard icon={ListChecks} label="Da fare" value={`${activeCount} attività`} detail={activeCount ? 'Apri il primo esercizio qui sotto.' : 'Non hai attività in sospeso.'} />
          <SummaryCard icon={CheckCircle2} label="Completate" value={`${completedCount}`} detail="Puoi sempre riaprire ciò che hai concluso." />
          <SummaryCard icon={CalendarDays} label="Prossima scadenza" value={nearestDeadline ? formatDate(nearestDeadline) : 'Nessuna urgenza'} detail={nearestDeadline ? 'La scadenza più vicina del percorso.' : 'Puoi seguire il tuo ritmo.'} />
        </div>

        <nav className="learner-area-switcher" aria-label="Aree di apprendimento">
            {Object.entries(activityAreas).map(([key, area]) => {
              const AreaIcon = area.icon;
              const active = initialArea === key;
              return <Link key={key} to={area.to} className={`learner-area-switcher__item learner-area-switcher__item--${area.tone} ${active ? 'is-active' : ''}`}><span><AreaIcon aria-hidden="true" /></span><span><strong>{area.label}</strong><small>{assignments.filter((assignment) => assignment.activityAreas?.includes(key) && assignment.status === 'published').length} da fare</small></span></Link>;
            })}
        </nav>

        <div className="learner-main-grid">
          <section className="learner-panel learner-panel--main learner-assignments-panel">
            <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Oggi</span><h2>Il tuo prossimo passo</h2></div></div>
            {loading ? <p className="learner-empty">Caricamento attività...</p> : null}
            {error ? <p className="learner-error" role="alert">{error}</p> : null}
            {!loading && !error && visibleAssignments.length === 0 ? (
              <div className="learner-empty"><Leaf aria-hidden="true" /><strong>Sei in pari.</strong><br />{activeConfig?.empty || 'Quando verrà pubblicata una nuova attività, la troverai qui.'}{initialArea === 'srs' ? <div><Link to="/trainers" className="learner-secondary-button">Apri il ripasso libero</Link></div> : null}</div>
            ) : null}
            {!loading && !error && visibleAssignments.length > 0 ? <ol className="learner-standard-assignment-list">{visibleAssignments.map((assignment, index) => <AssignmentCard key={assignment.id} assignment={assignment} index={index} />)}</ol> : null}
          </section>

          <aside className="learner-panel learner-panel--side">
            <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Il tuo ritmo</span><h3>Il tuo progresso</h3></div></div>
            <ProgressRing value={completionPercent} />
            <p className="learner-progress-cheer">{completionPercent ? 'Stai costruendo continuità!' : 'Ogni passo conta.'}</p>
            <div className="learner-progress-list">
              <div className="learner-progress-row"><span>Completate</span><span className="learner-progress-row__track"><span className="learner-progress-row__fill" style={{ width: `${completionPercent}%` }} /></span><span>{completedCount}</span></div>
              <div className="learner-progress-row"><span>Da fare</span><span className="learner-progress-row__track"><span className="learner-progress-row__fill" style={{ width: `${openPercent}%` }} /></span><span>{activeCount}</span></div>
              <div className="learner-progress-row"><span>Minuti</span><span className="learner-progress-row__track"><span className="learner-progress-row__fill" style={{ width: `${Math.min(100, estimatedMinutes)}%` }} /></span><span>{estimatedMinutes || 0}</span></div>
            </div>
            <p className="learner-empty learner-progress-note">Il progresso mostra ciò che hai completato. Non è un voto.</p>
            <Link to="/progressi" className="learner-text-link">Apri i progressi <ArrowRight size={14} /></Link>
          </aside>
        </div>

        {!isPreview ? <LearnerNextLessonCard /> : null}
        {!isPreview ? <LearnerNotificationsPanel /> : null}
      </div>
    </div>
  );
}

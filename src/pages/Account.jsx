import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthNotice from '../components/auth/AuthNotice';
import AuthPageShell from '../components/auth/AuthPageShell';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';
import { supabase } from '../lib/supabaseClient.js';

function DetailRow({ label, value }) {
  return (
    <div className="border-b border-ink/10 py-4 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 break-words text-base font-black text-ink">{value || '-'}</p>
    </div>
  );
}

const languageLabels = { it: 'Italiano', en: 'English' };
const roleLabels = { learner: 'Studente', admin: 'Amministratore' };

export default function Account() {
  const { loading, profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';
  const isLearner = profile?.role === 'learner' && profile?.status === 'active';

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      if (!isLearner) return;
      setAssignmentsLoading(true);
      const { data } = await supabase
        .from('assignments')
        .select('id, title, learner_note, status, required, deadline_at, estimated_minutes')
        .in('status', ['published', 'completed'])
        .order('created_at', { ascending: false })
        .limit(3);

      if (active) {
        setAssignments(data ?? []);
        setAssignmentsLoading(false);
      }
    }

    loadAssignments();
    return () => { active = false; };
  }, [isLearner]);

  async function handleSignOut() {
    setError('');
    setSubmitting(true);
    const { error: signOutError } = await signOut();
    setSubmitting(false);

    if (signOutError) {
      setError(getAuthErrorMessage(signOutError));
      return;
    }

    navigate('/', { replace: true });
  }

  const displayName = profile?.display_name || user?.user_metadata?.display_name || '';
  const language = languageLabels[profile?.interface_language] || profile?.interface_language;
  const role = roleLabels[profile?.role] || profile?.role;

  return (
    <AuthPageShell
      eyebrow={isLearner ? 'Il tuo percorso' : 'Account'}
      title={isLearner ? `Ciao${displayName ? `, ${displayName}` : ''}` : 'Il tuo account'}
      description={isLearner ? 'Riprendi da qui le attività pubblicate per te.' : 'Controlla le informazioni principali del tuo profilo Sblocco Inglese.'}
    >
      <div className="grid gap-5">
        {loading ? <AuthNotice>Caricamento profilo...</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        {isAdmin ? (
          <div className="rounded-xl border border-moss/20 bg-mint/25 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-moss">Accesso amministratore</p>
            <p className="mt-2 text-sm leading-6 text-ink/70">Il tuo profilo può accedere agli strumenti di gestione della piattaforma.</p>
            <Link to="/admin" className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss">Apri il pannello admin</Link>
          </div>
        ) : null}

        {isLearner ? (
          <section className="rounded-xl border border-ink/10 bg-white p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-moss">Attività</p>
                <h2 className="mt-2 text-xl font-black text-ink">Cosa devi fare adesso</h2>
              </div>
              <Link to="/assignments" className="text-sm font-black text-moss underline">Vedi tutte</Link>
            </div>

            {assignmentsLoading ? <p className="mt-4 text-sm font-bold text-ink/60">Caricamento attività...</p> : null}
            {!assignmentsLoading && assignments.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-ink/15 bg-linen/35 p-4">
                <p className="text-sm font-black text-ink">Nessuna attività assegnata</p>
                <p className="mt-1 text-sm leading-6 text-ink/60">Quando verrà pubblicata un’attività, apparirà qui.</p>
              </div>
            ) : null}
            {!assignmentsLoading && assignments.length > 0 ? (
              <div className="mt-4 divide-y divide-ink/10">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="text-base font-black text-ink">{assignment.title}</h3>
                    {assignment.learner_note ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/65">{assignment.learner_note}</p> : null}
                    <Link to={`/assignments/${assignment.id}`} className="mt-3 inline-flex text-sm font-black text-moss underline">Apri attività</Link>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <details className="rounded-xl border border-ink/10 bg-white px-5">
          <summary className="cursor-pointer py-4 text-sm font-black text-ink">Informazioni account</summary>
          <div className="border-t border-ink/10">
            <DetailRow label="Nome" value={displayName} />
            <DetailRow label="Email" value={user?.email} />
            <DetailRow label="Lingua" value={language} />
            <DetailRow label="Tipo di account" value={role} />
          </div>
        </details>

        <button type="button" disabled={submitting} onClick={handleSignOut} className="focus-ring rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink shadow-sm transition hover:bg-linen disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'Uscita in corso...' : 'Esci dall account'}
        </button>
      </div>
    </AuthPageShell>
  );
}

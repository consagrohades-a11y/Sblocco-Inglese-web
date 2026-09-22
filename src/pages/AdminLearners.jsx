import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import LearnerAvatar from '../components/learner/LearnerAvatar.jsx';
import LearnerQuickFacts from '../components/admin/LearnerQuickFacts.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { loadLearnerGroups } from '../lib/learnerGroupsApi.js';

const statusLabels = {
  active: 'Attivo',
  suspended: 'Sospeso',
  deleted: 'Eliminato',
};

const recoveryStatusLabels = {
  onboarding: 'Onboarding',
  active: 'Recupero attivo',
  completed: 'Recupero completato',
  archived: 'Recupero archiviato',
};

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function AdminLearners() {
  const [learners, setLearners] = useState([]);
  const [recoveryStatuses, setRecoveryStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [recoveryFilter, setRecoveryFilter] = useState('all');
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('all');

  useEffect(() => {
    let active = true;

    async function loadLearners() {
      setLoading(true);
      setError('');

      const [learnerResponse, recoveryResponse, loadedGroups] = await Promise.all([
        supabase.rpc('admin_list_learners'),
        supabase.rpc('admin_list_recovery_learner_statuses'),
        loadLearnerGroups().catch(() => []),
      ]);

      if (!active) return;

      if (learnerResponse.error) {
        setError('Non è stato possibile caricare gli studenti. Verifica che la migrazione admin_list_learners sia stata applicata in Supabase.');
        setLearners([]);
      } else {
        setLearners(learnerResponse.data ?? []);
        setGroups(loadedGroups);
      }

      if (recoveryResponse.error) {
        setRecoveryStatuses({});
      } else {
        setRecoveryStatuses(Object.fromEntries((recoveryResponse.data || []).map((row) => [row.user_id, row])));
      }

      setLoading(false);
    }

    loadLearners();

    return () => {
      active = false;
    };
  }, []);

  const filteredLearners = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return learners.filter((learner) => {
      const matchesStatus = status === 'all' || learner.status === status;
      const selectedGroup = groups.find((group) => group.id === groupId);
      const matchesGroup = groupId === 'all' || (selectedGroup?.member_ids || []).includes(learner.id);
      const recovery = recoveryStatuses[learner.id];
      const matchesRecovery = recoveryFilter === 'all'
        || (recoveryFilter === 'recovery' && recovery?.has_access)
        || (recoveryFilter === 'standard' && !recovery?.has_access);
      const matchesQuery = !normalizedQuery || [learner.display_name, learner.email, learner.profession, learner.age, learner.admin_context_note]
        .some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesGroup && matchesRecovery && matchesQuery;
    });
  }, [groupId, groups, learners, query, recoveryFilter, recoveryStatuses, status]);

  return (
    <>
      <SEO
        title="Studenti | Pannello admin | Sblocco Inglese"
        description="Directory amministrativa degli studenti Sblocco Inglese."
      />
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <AdminPageHeader
            eyebrow="Studenti"
            title="Studenti"
            description="Cerca un learner, apri il profilo e passa direttamente ad assegnazioni, attività e progressi."
            actions={(
              <Link
                to="/admin/groups"
                className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:border-clay/35 hover:text-clay dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
              >
                Gestisci gruppi
              </Link>
            )}
          />

          <div className="mt-6 grid gap-4 rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-surface-900 p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-ink/65 dark:text-white/65">Cerca</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome o email"
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-clay focus:ring-4 focus:ring-clay/10 dark:border-white/20 dark:bg-surface-800 dark:text-white dark:focus:border-coral dark:focus:ring-coral/10"
              />
            </label>

            <label className="block md:min-w-44">
              <span className="text-xs font-bold uppercase tracking-wide text-ink/65 dark:text-white/65">Stato</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-clay focus:ring-4 focus:ring-clay/10 dark:border-white/20 dark:bg-surface-800 dark:text-white dark:focus:border-coral dark:focus:ring-coral/10"
              >
                <option value="all">Tutti</option>
                <option value="active">Attivi</option>
                <option value="suspended">Sospesi</option>
                <option value="deleted">Eliminati</option>
              </select>
            </label>

            <label className="block md:min-w-52">
              <span className="text-xs font-bold uppercase tracking-wide text-ink/65 dark:text-white/65">Percorso</span>
              <select
                value={recoveryFilter}
                onChange={(event) => setRecoveryFilter(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-clay dark:border-white/20 dark:bg-surface-800 dark:text-white"
              >
                <option value="all">Tutti i percorsi</option>
                <option value="recovery">Recupero Debito</option>
                <option value="standard">Senza Recupero Debito</option>
              </select>
            </label>

            <label className="block md:min-w-52">
              <span className="text-xs font-bold uppercase tracking-wide text-ink/65 dark:text-white/65">Gruppo</span>
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-clay dark:border-white/20 dark:bg-surface-800 dark:text-white">
                <option value="all">Tutti i gruppi</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-surface-900 shadow-sm">
            {loading ? (
              <p className="p-6 text-sm font-bold text-ink/65 dark:text-white/60">Caricamento studenti...</p>
            ) : null}

            {error ? (
              <div className="border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold leading-6 text-red-900">
                {error}
              </div>
            ) : null}

            {!loading && !error && filteredLearners.length === 0 ? (
              <p className="p-6 text-sm font-bold text-ink/65 dark:text-white/60">
                {learners.length === 0
                  ? 'Non ci sono ancora account learner.'
                  : 'Nessuno studente corrisponde ai filtri selezionati.'}
              </p>
            ) : null}

            {!loading && !error && filteredLearners.length > 0 ? (
              <div className="divide-y divide-ink/10 dark:divide-white/10">
                {filteredLearners.map((learner) => {
                  const recovery = recoveryStatuses[learner.id];
                  return (
                    <Link
                      key={learner.id}
                      to={`/admin/learners/${learner.id}`}
                      className="focus-ring grid gap-4 p-5 transition hover:bg-linen/45 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_auto_auto_auto] md:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <LearnerAvatar
                          avatarKey={learner.avatar_key}
                          backgroundKey={learner.avatar_background_key}
                          displayName={learner.display_name || learner.email}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-ink dark:text-white">{learner.display_name || 'Nome non impostato'}</p>
                          <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-ink/60 dark:text-white/60"><LearnerQuickFacts learner={learner} /></p>
                          <p className="mt-1 text-xs font-bold text-ink/55 dark:text-white/55">Registrato il {formatDate(learner.created_at)}</p>
                        </div>
                      </div>
                      <p className="break-all text-sm font-semibold text-ink/70 dark:text-white/65">{learner.email || '-'}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex w-fit rounded-full border border-ink/10 bg-linen px-3 py-1.5 text-xs font-black text-ink dark:border-white/10 dark:bg-white/10 dark:text-white">
                          {statusLabels[learner.status] || learner.status}
                        </span>
                        {recovery?.has_access ? (
                          <span className="inline-flex w-fit rounded-full border border-coral/20 bg-blush px-3 py-1.5 text-xs font-black text-clay dark:bg-coral/10 dark:text-[#f7a98d]">
                            Recupero Debito
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm font-bold text-ink/65 dark:text-white/60">
                        {recovery?.has_access
                          ? recoveryStatusLabels[recovery.enrollment_status] || 'Accesso pronto'
                          : 'Standard'}
                      </p>
                      <span className="text-sm font-black text-clay">Apri profilo</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';
import { loadLearnerGroups } from '../lib/learnerGroupsApi.js';

const languageLabels = {
  it: 'Italiano',
  en: 'English',
};

const statusLabels = {
  active: 'Attivo',
  suspended: 'Sospeso',
  deleted: 'Eliminato',
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('all');

  useEffect(() => {
    let active = true;

    async function loadLearners() {
      setLoading(true);
      setError('');

      const [{ data, error: rpcError }, loadedGroups] = await Promise.all([
        supabase.rpc('admin_list_learners'),
        loadLearnerGroups().catch(() => []),
      ]);

      if (!active) return;

      if (rpcError) {
        setError('Non è stato possibile caricare gli studenti. Verifica che la migrazione admin_list_learners sia stata applicata in Supabase.');
        setLearners([]);
      } else {
        setLearners(data ?? []);
        setGroups(loadedGroups);
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
      const matchesQuery = !normalizedQuery || [learner.display_name, learner.email]
        .some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesGroup && matchesQuery;
    });
  }, [groupId, groups, learners, query, status]);

  return (
    <>
      <SEO
        title="Studenti | Pannello admin | Sblocco Inglese"
        description="Directory amministrativa degli studenti Sblocco Inglese."
      />
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#16211e] p-6 shadow-soft sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="eyebrow">Amministrazione</span>
              <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">Studenti</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70 dark:text-white/65">
                Cerca gli account learner e apri il profilo dello studente su cui vuoi lavorare.
              </p>
            </div>
            <Link
              to="/admin"
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white dark:border-white/20 dark:bg-white/10 dark:text-white px-5 py-2.5 text-sm font-black text-ink transition hover:bg-linen"
            >
              Torna al pannello admin
            </Link>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#16211e] p-5 shadow-sm md:grid-cols-[1fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Cerca</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome o email"
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/40 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15"
              />
            </label>

            <label className="block md:min-w-48">
              <span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Stato</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/40 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15"
              >
                <option value="all">Tutti</option>
                <option value="active">Attivi</option>
                <option value="suspended">Sospesi</option>
                <option value="deleted">Eliminati</option>
              </select>
            </label>
            <label className="block md:min-w-56">
              <span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Gruppo</span>
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white">
                <option value="all">Tutti i gruppi</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#16211e] shadow-sm">
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
                {filteredLearners.map((learner) => (
                  <Link
                    key={learner.id}
                    to={`/admin/learners/${learner.id}`}
                    className="focus-ring grid gap-4 p-5 transition hover:bg-linen/45 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_auto_auto_auto] md:items-center"
                  >
                    <div>
                      <p className="text-base font-black text-ink dark:text-white">{learner.display_name || 'Nome non impostato'}</p>
                      <p className="mt-1 text-xs font-bold text-ink/45 dark:text-white/45">Registrato il {formatDate(learner.created_at)}</p>
                    </div>
                    <p className="break-all text-sm font-semibold text-ink/70 dark:text-white/65">{learner.email || '-'}</p>
                    <p className="text-sm font-bold text-ink/65 dark:text-white/60">
                      {languageLabels[learner.interface_language] || learner.interface_language || '-'}
                    </p>
                    <span className="inline-flex w-fit rounded-full border border-ink/10 bg-linen dark:border-white/10 dark:bg-white/10 dark:text-white px-3 py-1.5 text-xs font-black text-ink dark:text-white">
                      {statusLabels[learner.status] || learner.status}
                    </span>
                    <span className="text-sm font-black text-moss">Apri profilo</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

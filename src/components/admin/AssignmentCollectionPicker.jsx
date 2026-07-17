import React, { useEffect, useMemo, useState } from 'react';
import { loadPublishedExerciseCollections } from '../../lib/exerciseCollectionsApi.js';

export default function AssignmentCollectionPicker({ value, onChange }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadPublishedExerciseCollections()
      .then((items) => { if (active) setCatalog(items); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Non è stato possibile caricare le Collection pubblicate.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedIds = useMemo(() => new Set(value.map((item) => item.collectionVersionId)), [value]);

  function toggle(item) {
    if (selectedIds.has(item.collectionVersionId)) {
      onChange(value.filter((selected) => selected.collectionVersionId !== item.collectionVersionId));
    } else {
      onChange([...value, item]);
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Percorsi versionati</p>
      <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Collection pubblicate</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">Ogni selezione salva la versione e l’ordine correnti. Le modifiche future alla Collection non cambieranno questa assegnazione.</p>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-900 dark:bg-red-300/10 dark:text-red-100">{error}</p> : null}
      {loading ? <p className="mt-5 text-sm font-bold text-ink/65 dark:text-white/65">Caricamento Collection...</p> : null}
      {!loading && !catalog.length ? <p className="mt-5 rounded-xl border border-dashed border-ink/15 p-4 text-sm text-ink/65 dark:border-white/15 dark:text-white/65">Nessuna Collection pubblicata. Pubblicane una dal catalogo Exercise Builder.</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {catalog.map((item) => {
          const selected = selectedIds.has(item.collectionVersionId);
          return <button key={item.collectionVersionId} type="button" onClick={() => toggle(item)} className={`rounded-xl border p-4 text-left transition ${selected ? 'border-violet-500 bg-violet-50 dark:border-violet-300/40 dark:bg-violet-300/10' : 'border-ink/10 hover:bg-linen/40 dark:border-white/10 dark:hover:bg-white/[0.05]'}`}>
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-violet-700 dark:text-violet-300">{item.publicId} · v{item.versionNumber}</span><span className="text-xs font-black">{selected ? 'Selezionata' : 'Aggiungi'}</span></div>
            <h3 className="mt-2 text-base font-black text-ink dark:text-white">{item.title}</h3>
            <p className="mt-2 text-xs font-semibold text-ink/65 dark:text-white/65">{item.itemCount} tappe · {item.completionRule === 'percentage' ? `completa almeno il ${item.requiredPercent}%` : 'completa tutte le tappe'}</p>
          </button>;
        })}
      </div>
    </section>
  );
}

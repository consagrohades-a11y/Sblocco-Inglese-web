import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { RECOVERY_TOPICS, recoveryTopicLabel } from '../config/recovery.js';
import {
  createExerciseBuilderImportBatch,
  listExerciseBuilderImportItems,
  promoteExerciseBuilderImportItems,
} from '../lib/exerciseBuilderApi.js';
import { validateExerciseBuilderJson } from '../lib/exerciseBuilderSchema.js';
import { supabase } from '../lib/supabaseClient.js';
import { adminButton, adminSurface } from '../styles/adminUi.js';
import checkpointBundle from '../../content/recovery/curriculum-v2/fragments/mixed-checkpoint-v1.bundle.json';
import checkpointManifest from '../../content/recovery/curriculum-v2/fragments/mixed-checkpoint-v1.fragments.json';

const recoveryBundleModules = import.meta.glob(
  '../../content/recovery/wave-1/*.bundle.json',
  { eager: true, import: 'default' },
);

const recoveryWaveBundles = Object.entries(recoveryBundleModules)
  .map(([path, bundle]) => ({
    path,
    fileName: path.split('/').pop(),
    bundle,
    topicKey: bundle?.exercises?.[0]?.topic || '',
  }))
  .sort((a, b) => a.fileName.localeCompare(b.fileName, 'en'));

const phases = [
  ['recover', 'Recupera'],
  ['practice', 'Allenati'],
  ['school', 'Modalità scuola'],
  ['verify', 'Mini-verifica'],
  ['error_review', 'Ripassa errori'],
  ['checkpoint', 'Checkpoint'],
  ['mock_intermediate', 'Simulazione intermedia'],
  ['mock_final', 'Simulazione finale'],
];

const topicPhases = ['recover', 'practice', 'school', 'verify'];
const topicRequiredPhases = new Set(topicPhases);

function phaseLabel(phase) {
  return phases.find(([key]) => key === phase)?.[1] || phase;
}

function stableJsonValue(value) {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableJsonValue(value[key])]),
  );
}

async function contentHash(value) {
  const input = new TextEncoder().encode(JSON.stringify(stableJsonValue(value)));
  const digest = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

function activeCoverageForTopic(mappings, topicKey) {
  const active = mappings.filter((mapping) => mapping.active && mapping.topic_key === topicKey);
  return topicPhases.map((phase) => active.find((mapping) => mapping.phase === phase) || null);
}

function isTopicReady(mappings, topicKey) {
  return activeCoverageForTopic(mappings, topicKey).every(Boolean);
}

export default function AdminRecoveryContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waveBusy, setWaveBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [exercises, setExercises] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [phase, setPhase] = useState('recover');
  const [topicKey, setTopicKey] = useState('present-simple');
  const [versionId, setVersionId] = useState('');
  const [schoolTestType, setSchoolTestType] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [exerciseResponse, mappingResponse] = await Promise.all([
        supabase
          .from('exercise_builder_exercises')
          .select('id, public_id, current_version_id, status')
          .eq('status', 'published')
          .not('current_version_id', 'is', null)
          .order('public_number', { ascending: true }),
        supabase
          .from('recovery_exercise_map')
          .select('id, topic_key, phase, exercise_id, exercise_version_id, school_test_type, estimated_minutes, active, sort_order, mapping_source, source_import_item_id, created_at')
          .order('phase', { ascending: true })
          .order('sort_order', { ascending: true }),
      ]);
      if (exerciseResponse.error) throw exerciseResponse.error;
      if (mappingResponse.error) throw mappingResponse.error;

      const identities = exerciseResponse.data || [];
      const versionIds = identities.map((item) => item.current_version_id).filter(Boolean);
      let versions = [];
      if (versionIds.length) {
        const versionResponse = await supabase
          .from('exercise_builder_exercise_versions')
          .select('id, exercise_id, version_number, title, description, level, topic, estimated_minutes, review_status, settings')
          .in('id', versionIds)
          .eq('review_status', 'approved');
        if (versionResponse.error) throw versionResponse.error;
        versions = versionResponse.data || [];
      }

      const identityById = new Map(identities.map((item) => [item.id, item]));
      const catalog = versions.map((version) => ({
        ...version,
        public_id: identityById.get(version.exercise_id)?.public_id || version.exercise_id,
      })).sort((a, b) => a.title.localeCompare(b.title, 'it'));

      setExercises(catalog);
      setMappings(mappingResponse.data || []);
      setVersionId((current) => current || catalog[0]?.id || '');
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare le mappature Recupero Debito.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selectedExercise = useMemo(() => exercises.find((item) => item.id === versionId) || null, [exercises, versionId]);
  const needsTopic = topicRequiredPhases.has(phase);
  const readyTopics = useMemo(
    () => RECOVERY_TOPICS.filter((topic) => isTopicReady(mappings, topic.key)),
    [mappings],
  );
  const waveTopicKeys = useMemo(
    () => new Set(recoveryWaveBundles.map((entry) => entry.topicKey).filter(Boolean)),
    [],
  );

  async function findExistingBatch(sourceName) {
    const { data, error: batchError } = await supabase
      .from('exercise_builder_import_batches')
      .select('id, source_name, status, valid_count, warning_count, invalid_count, created_at')
      .eq('source_name', sourceName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (batchError) throw batchError;
    return data || null;
  }

  async function importRecoveryWave() {
    if (waveBusy) return;
    setWaveBusy(true);
    setMessage('');
    setError('');
    try {
      let createdBatches = 0;
      let reusedBatches = 0;
      let promotedItems = 0;
      let skippedCovered = 0;
      const importedTopics = [];

      for (const entry of recoveryWaveBundles) {
        if (!entry.topicKey || !RECOVERY_TOPICS.some((topic) => topic.key === entry.topicKey)) {
          throw new Error(`${entry.fileName}: topic Recovery non riconosciuto.`);
        }
        if (isTopicReady(mappings, entry.topicKey)) {
          skippedCovered += 1;
          continue;
        }

        const validation = validateExerciseBuilderJson(entry.bundle);
        const invalidItems = (validation.items || []).filter((item) => item.status === 'invalid');
        if (validation.errors?.length || invalidItems.length) {
          const detail = [
            ...(validation.errors || []),
            ...invalidItems.flatMap((item) => item.errors || []),
          ].slice(0, 5).join(' · ');
          throw new Error(`${entry.fileName}: bundle non importabile. ${detail}`);
        }

        const hash = await contentHash(entry.bundle);
        const sourceName = `recovery-wave-1:${entry.fileName}:${hash}`;
        let batch = await findExistingBatch(sourceName);
        if (!batch) {
          const selectedIndexes = (validation.items || [])
            .filter((item) => ['valid', 'warning'].includes(item.status))
            .map((item) => item.index);
          batch = await createExerciseBuilderImportBatch({
            validation,
            rawPayload: entry.bundle,
            sourceName,
            selectedIndexes,
            createdBy: user?.id || null,
          });
          createdBatches += 1;
        } else {
          reusedBatches += 1;
        }

        const items = await listExerciseBuilderImportItems(batch.id);
        const pendingIds = items
          .filter((item) => ['valid', 'warning'].includes(item.validation_status) && !item.promoted_entity_id)
          .map((item) => item.id);
        if (pendingIds.length) {
          const result = await promoteExerciseBuilderImportItems(batch.id, pendingIds);
          promotedItems += Number(result?.promoted_count || 0);
        }
        importedTopics.push(entry.topicKey);
      }

      const { data: syncData, error: syncError } = await supabase.rpc('admin_sync_recovery_wave_mappings');
      if (syncError) throw syncError;
      await load();
      setMessage(
        `Wave 1 preparata: ${createdBatches} nuovi batch, ${reusedBatches} già esistenti, ${promotedItems} elementi promossi in review, ${skippedCovered} topic già coperti. `
        + `${importedTopics.length ? 'Apri Exercise Builder, approva e pubblica i nuovi esercizi; poi usa “Sincronizza mapping pubblicati”. ' : ''}`
        + `Topic pronti ora: ${syncData?.ready_topics ?? readyTopics.length}.`,
      );
    } catch (importError) {
      setError(importError.message || 'Non è stato possibile importare la Wave 1.');
    } finally {
      setWaveBusy(false);
    }
  }


  async function publishValidatedRecoveryWave() {
    if (waveBusy) return;
    const missingTopics = recoveryWaveBundles.filter((entry) => !isTopicReady(mappings, entry.topicKey));
    if (!missingTopics.length) {
      setMessage('Wave 1 già pubblicata: tutti i topic disponibili hanno le quattro fasi attive.');
      return;
    }

    const confirmed = window.confirm(
      `Pubblicare ${missingTopics.length} topic Wave 1 validati in production? `
      + 'L’operazione usa i controlli di pubblicazione dell’Exercise Builder e poi sincronizza i mapping Recovery.',
    );
    if (!confirmed) return;

    setWaveBusy(true);
    setMessage('');
    setError('');
    try {
      let createdBatches = 0;
      let reusedBatches = 0;
      let promotedItems = 0;
      let publishedExercises = 0;
      let skippedCovered = 0;
      const publishedTopics = [];

      for (const entry of recoveryWaveBundles) {
        if (!entry.topicKey || !RECOVERY_TOPICS.some((topic) => topic.key === entry.topicKey)) {
          throw new Error(`${entry.fileName}: topic Recovery non riconosciuto.`);
        }
        if (isTopicReady(mappings, entry.topicKey)) {
          skippedCovered += 1;
          continue;
        }

        const validation = validateExerciseBuilderJson(entry.bundle);
        const invalidItems = (validation.items || []).filter((item) => item.status === 'invalid');
        if (validation.errors?.length || invalidItems.length) {
          const detail = [
            ...(validation.errors || []),
            ...invalidItems.flatMap((item) => item.errors || []),
          ].slice(0, 5).join(' · ');
          throw new Error(`${entry.fileName}: pubblicazione bloccata dal validator. ${detail}`);
        }

        const hash = await contentHash(entry.bundle);
        const sourceName = `recovery-wave-1:${entry.fileName}:${hash}`;
        let batch = await findExistingBatch(sourceName);
        if (!batch) {
          const selectedIndexes = (validation.items || [])
            .filter((item) => ['valid', 'warning'].includes(item.status))
            .map((item) => item.index);
          batch = await createExerciseBuilderImportBatch({
            validation,
            rawPayload: entry.bundle,
            sourceName,
            selectedIndexes,
            createdBy: user?.id || null,
          });
          createdBatches += 1;
        } else {
          reusedBatches += 1;
        }

        let items = await listExerciseBuilderImportItems(batch.id);
        const pendingIds = items
          .filter((item) => ['valid', 'warning'].includes(item.validation_status) && !item.promoted_entity_id)
          .map((item) => item.id);
        if (pendingIds.length) {
          const result = await promoteExerciseBuilderImportItems(batch.id, pendingIds);
          promotedItems += Number(result?.promoted_count || 0);
          items = await listExerciseBuilderImportItems(batch.id);
        }

        const exerciseItems = items.filter(
          (item) => item.entity_type === 'exercise'
            && ['valid', 'warning'].includes(item.validation_status)
            && item.promoted_entity_id,
        );
        if (!exerciseItems.length) {
          throw new Error(`${entry.fileName}: nessun esercizio promosso disponibile per la pubblicazione.`);
        }

        for (const item of exerciseItems) {
          const { error: publishError } = await supabase.rpc('admin_set_exercise_builder_status', {
            p_entity_type: 'exercise',
            p_entity_id: item.promoted_entity_id,
            p_next_status: 'published',
          });
          if (publishError) {
            throw new Error(`${entry.fileName} · ${item.client_key || item.id}: ${publishError.message}`);
          }
          publishedExercises += 1;
        }

        publishedTopics.push(entry.topicKey);
      }

      const { data: syncData, error: syncError } = await supabase.rpc('admin_sync_recovery_wave_mappings');
      if (syncError) throw syncError;
      await load();

      setMessage(
        `Wave 1 pubblicata: ${publishedTopics.length} topic elaborati, ${publishedExercises} esercizi pubblicati, `
        + `${promotedItems} elementi promossi, ${createdBatches} nuovi batch, ${reusedBatches} batch riusati, `
        + `${skippedCovered} topic già coperti. Mapping sincronizzati: ${syncData?.synced_mappings || 0}. `
        + `Topic pronti: ${syncData?.ready_topics || 0}.`,
      );
    } catch (publishError) {
      setError(publishError.message || 'Non è stato possibile pubblicare la Wave 1 validata.');
    } finally {
      setWaveBusy(false);
    }
  }

  async function syncPublishedMappings() {
    if (waveBusy) return;
    setWaveBusy(true);
    setMessage('');
    setError('');
    try {
      const { data, error: syncError } = await supabase.rpc('admin_sync_recovery_wave_mappings');
      if (syncError) throw syncError;
      await load();
      setMessage(
        `Mapping sincronizzati: ${data?.synced_mappings || 0}. Topic pronti: ${data?.ready_topics || 0}. `
        + `Override manuali rispettati: ${data?.manual_overrides || 0}.`,
      );
    } catch (syncError) {
      setError(syncError.message || 'Non è stato possibile sincronizzare i mapping pubblicati.');
    } finally {
      setWaveBusy(false);
    }
  }

  async function publishMixedCheckpointV1() {
    if (waveBusy) return;
    const confirmed = window.confirm(
      'Pubblicare il pool Verifica mista v1? Verranno pubblicate 16 micro-attività e registrati i frammenti approvati collegati alle versioni correnti.',
    );
    if (!confirmed) return;

    setWaveBusy(true);
    setMessage('');
    setError('');
    try {
      const validation = validateExerciseBuilderJson(checkpointBundle);
      const invalidItems = (validation.items || []).filter((item) => item.status === 'invalid');
      if (validation.errors?.length || invalidItems.length) {
        const detail = [...(validation.errors || []), ...invalidItems.flatMap((item) => item.errors || [])].slice(0, 5).join(' · ');
        throw new Error(`Pool checkpoint non importabile. ${detail}`);
      }

      const hash = await contentHash({ bundle: checkpointBundle, manifest: checkpointManifest });
      const sourceName = `recovery-mixed-checkpoint-v1:${hash}`;
      let batch = await findExistingBatch(sourceName);
      if (!batch) {
        batch = await createExerciseBuilderImportBatch({
          validation,
          rawPayload: checkpointBundle,
          sourceName,
          selectedIndexes: (validation.items || [])
            .filter((item) => ['valid', 'warning'].includes(item.status))
            .map((item) => item.index),
          createdBy: user?.id || null,
        });
      }

      let items = await listExerciseBuilderImportItems(batch.id);
      const pendingIds = items
        .filter((item) => ['valid', 'warning'].includes(item.validation_status) && !item.promoted_entity_id)
        .map((item) => item.id);
      if (pendingIds.length) {
        await promoteExerciseBuilderImportItems(batch.id, pendingIds);
        items = await listExerciseBuilderImportItems(batch.id);
      }

      const exerciseItems = items.filter(
        (item) => item.entity_type === 'exercise'
          && ['valid', 'warning'].includes(item.validation_status)
          && item.promoted_entity_id,
      );
      if (exerciseItems.length !== checkpointManifest.fragments.length) {
        throw new Error(`Attesi ${checkpointManifest.fragments.length} esercizi promossi, trovati ${exerciseItems.length}.`);
      }

      for (const item of exerciseItems) {
        const { data: exercise, error: exerciseError } = await supabase
          .from('exercise_builder_exercises')
          .select('status')
          .eq('id', item.promoted_entity_id)
          .single();
        if (exerciseError) throw exerciseError;
        if (exercise.status !== 'published') {
          const { error: publishError } = await supabase.rpc('admin_set_exercise_builder_status', {
            p_entity_type: 'exercise',
            p_entity_id: item.promoted_entity_id,
            p_next_status: 'published',
          });
          if (publishError) throw publishError;
        }
      }

      const { data: registration, error: registrationError } = await supabase.rpc(
        'admin_register_recovery_assessment_fragment_manifest_from_import',
        { p_batch_id: batch.id, p_manifest: checkpointManifest },
      );
      if (registrationError) throw registrationError;

      setMessage(`Verifica mista v1 pubblicata: ${registration?.fragment_count || 0} frammenti approvati e registrati. Il planner la userà soltanto quando il programma dello studente supera il gate di copertura.`);
    } catch (publishError) {
      setError(publishError.message || 'Non è stato possibile pubblicare il pool Verifica mista v1.');
    } finally {
      setWaveBusy(false);
    }
  }

  async function addMapping(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!selectedExercise) {
      setError('Seleziona un esercizio pubblicato e approvato.');
      return;
    }
    if (needsTopic && !topicKey) {
      setError('Questa fase richiede un argomento.');
      return;
    }

    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('recovery_exercise_map').insert({
        topic_key: needsTopic ? topicKey : null,
        phase,
        exercise_id: selectedExercise.exercise_id,
        exercise_version_id: selectedExercise.id,
        school_test_type: schoolTestType.trim() || null,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : selectedExercise.estimated_minutes || null,
        active: true,
        sort_order: 100,
        mapping_source: 'manual',
        source_import_item_id: null,
      });
      if (insertError) throw insertError;
      setMessage('Mappatura manuale aggiunta. Ha precedenza sui mapping gestiti dalla Wave 1 per la stessa fase.');
      setSchoolTestType('');
      setEstimatedMinutes('');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile aggiungere la mappatura.');
    } finally {
      setSaving(false);
    }
  }

  async function removeMapping(mapping) {
    if (mapping.mapping_source !== 'manual') return;
    setMessage('');
    setError('');
    const { error: deleteError } = await supabase.from('recovery_exercise_map').delete().eq('id', mapping.id);
    if (deleteError) {
      setError(deleteError.message || 'Non è stato possibile rimuovere la mappatura.');
      return;
    }
    setMappings((current) => current.filter((item) => item.id !== mapping.id));
  }

  function exerciseLabel(mapping) {
    const exercise = exercises.find((item) => item.id === mapping.exercise_version_id);
    return exercise ? `${exercise.public_id} · ${exercise.title}` : mapping.exercise_version_id;
  }

  return (
    <>
      <SEO title="Recupero Debito | Admin | Sblocco Inglese" description="Collega gli esercizi esistenti alle fasi del percorso Recupero Debito Inglese." />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <header className={`${adminSurface.panel} p-6 sm:p-8`}>
            <span className="eyebrow">Recupero Debito</span>
            <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">Contenuti e mapping Recovery</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70 dark:text-white/65">
              Recupero Debito usa la libreria Exercise Builder esistente. La Wave 1 entra prima in review; soltanto le versioni approvate e pubblicate possono essere collegate automaticamente al percorso.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/admin/content/exercises" className={adminButton.secondary}>Apri Exercise Builder</Link>
              <Link to="/admin/content/exercises/diagnostics" className={adminButton.secondary}>Diagnostica errori</Link>
            </div>
          </header>

          <section className={`${adminSurface.panel} mt-6 p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ffad93]">Pipeline Wave 1</p>
                <h2 className="mt-2 text-xl font-black text-ink dark:text-white">Dal bundle validato al contenuto pubblicato</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
                  I bundle nel repository vengono sempre validati con il contratto reale dell’Exercise Builder. Puoi importarli in review oppure pubblicare esplicitamente la Wave validata: anche il percorso rapido passa dai normali controlli di publishability prima di sincronizzare i mapping Recovery.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={waveBusy || loading} onClick={publishValidatedRecoveryWave} className={adminButton.primary}>
                  {waveBusy ? 'Operazione in corso...' : 'Pubblica Wave 1 validata'}
                </button>
                <button type="button" disabled={waveBusy || loading} onClick={importRecoveryWave} className={adminButton.secondary}>
                  Importa Wave 1 in review
                </button>
                <button type="button" disabled={waveBusy || loading} onClick={syncPublishedMappings} className={adminButton.secondary}>
                  Sincronizza mapping pubblicati
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <small className="text-xs font-bold uppercase tracking-wide text-ink/50 dark:text-white/45">Bundle Wave 1</small>
                <strong className="mt-1 block text-2xl font-black text-ink dark:text-white">{recoveryWaveBundles.length}</strong>
                <p className="mt-1 text-xs text-ink/60 dark:text-white/55">Scoperti automaticamente dal repository.</p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <small className="text-xs font-bold uppercase tracking-wide text-ink/50 dark:text-white/45">Topic Wave 1</small>
                <strong className="mt-1 block text-2xl font-black text-ink dark:text-white">{waveTopicKeys.size}</strong>
                <p className="mt-1 text-xs text-ink/60 dark:text-white/55">Ogni topic deve avere 4 fasi complete.</p>
              </div>
              <div className="rounded-xl border border-coral/25 bg-coral/8 p-4 dark:border-[#ff8b6c]/25 dark:bg-[#ff8b6c]/8">
                <small className="text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ffad93]">Pronti in production</small>
                <strong className="mt-1 block text-2xl font-black text-ink dark:text-white">{readyTopics.length} / {RECOVERY_TOPICS.length}</strong>
                <p className="mt-1 text-xs text-ink/60 dark:text-white/55">Pronto = Recupera + Allenati + Scuola + Mini-verifica attivi.</p>
              </div>
            </div>

            {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200" role="alert">{error}</p> : null}
            {message ? <p className="mt-4 rounded-xl border border-coral/20 bg-coral/8 px-4 py-3 text-sm font-bold text-ink dark:border-[#ff8b6c]/25 dark:bg-[#ff8b6c]/8 dark:text-white">{message}</p> : null}
          </section>

          <section className={`${adminSurface.panel} mt-6 p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ffad93]">Verifica mista v1</p>
                <h2 className="mt-2 text-xl font-black text-ink dark:text-white">Pubblica il pool checkpoint approvato</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
                  Il pool contiene 16 micro-frammenti neutrali, due forme per ciascuno di 8 argomenti. La pubblicazione usa l’Exercise Builder e registra gli ID immutabili dal manifest. Il planner crea un checkpoint solo quando almeno 4 argomenti richiesti hanno due forme fresche disponibili.
                </p>
              </div>
              <button type="button" disabled={waveBusy || loading} onClick={publishMixedCheckpointV1} className={adminButton.primary}>
                {waveBusy ? 'Operazione in corso...' : 'Pubblica Verifica mista v1'}
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-ink/10 bg-white/70 p-4 text-sm text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
              <strong className="text-ink dark:text-white">Comportamento previsto:</strong> 8 parti intercalate, 4 argomenti, circa 24 minuti, nessun feedback durante la prova, un solo tentativo e aggiornamento delle sole sessioni future.
            </div>
          </section>

          <section className={`${adminSurface.panel} mt-6 p-6`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ffad93]">Copertura topic</p>
                <h2 className="mt-2 text-xl font-black text-ink dark:text-white">Quali argomenti possono partire davvero</h2>
              </div>
              <button type="button" onClick={load} className={adminButton.secondary}>Aggiorna</button>
            </div>
            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {RECOVERY_TOPICS.map((topic) => {
                const coverage = activeCoverageForTopic(mappings, topic.key);
                const ready = coverage.every(Boolean);
                return (
                  <div key={topic.key} className="rounded-xl border border-ink/10 px-4 py-3 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-ink dark:text-white">{topic.label}</strong>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${ready ? 'bg-coral/12 text-coral dark:bg-[#ff8b6c]/12 dark:text-[#ffad93]' : 'bg-ink/5 text-ink/50 dark:bg-white/8 dark:text-white/50'}`}>
                        {ready ? 'Pronto' : `${coverage.filter(Boolean).length}/4`}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {topicPhases.map((phaseKey, index) => {
                        const mapping = coverage[index];
                        return (
                          <span key={phaseKey} className={`rounded-md border px-2 py-1 text-[11px] font-bold ${mapping ? 'border-coral/20 text-ink dark:border-[#ff8b6c]/20 dark:text-white' : 'border-ink/8 text-ink/35 dark:border-white/8 dark:text-white/35'}`}>
                            {phaseLabel(phaseKey)}{mapping?.mapping_source === 'manual' ? ' · manuale' : mapping ? ' · Wave' : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={addMapping} className={`${adminSurface.panel} p-6`}>
              <h2 className="text-xl font-black text-ink dark:text-white">Nuova mappatura manuale</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">Usala per override intenzionali o per checkpoint, error review e simulazioni. Per le simulazioni il database accetta soltanto exercise version con feedback di sezione nascosto.</p>

              <label className="mt-5 grid gap-2 text-sm font-bold text-ink dark:text-white">
                Fase
                <select value={phase} onChange={(event) => setPhase(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900">
                  {phases.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>

              {needsTopic ? (
                <label className="mt-4 grid gap-2 text-sm font-bold text-ink dark:text-white">
                  Argomento
                  <select value={topicKey} onChange={(event) => setTopicKey(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900">
                    {RECOVERY_TOPICS.map((topic) => <option key={topic.key} value={topic.key}>{topic.label}</option>)}
                  </select>
                </label>
              ) : null}

              <label className="mt-4 grid gap-2 text-sm font-bold text-ink dark:text-white">
                Exercise version pubblicata
                <select value={versionId} onChange={(event) => setVersionId(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900">
                  {exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.public_id} · {exercise.title} · {exercise.level} · {exercise.topic}</option>)}
                </select>
              </label>

              <label className="mt-4 grid gap-2 text-sm font-bold text-ink dark:text-white">
                Formato verifica scolastica (opzionale)
                <input value={schoolTestType} onChange={(event) => setSchoolTestType(event.target.value)} placeholder="es. mixed tenses, translation, error correction" className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900" />
              </label>

              <label className="mt-4 grid gap-2 text-sm font-bold text-ink dark:text-white">
                Minuti stimati (opzionale)
                <input type="number" min="5" max="120" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900" />
              </label>

              <button type="submit" disabled={saving || loading || !exercises.length} className={`${adminButton.primary} mt-5`}>{saving ? 'Salvataggio...' : 'Aggiungi mappatura'}</button>
              {!loading && !exercises.length ? <p className="mt-4 text-sm text-ink/65 dark:text-white/60">Non risultano exercise version correnti pubblicate e approvate da collegare.</p> : null}
            </form>

            <section className={`${adminSurface.panel} p-6`}>
              <div className="flex items-end justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ffad93]">Configurazione attuale</p><h2 className="mt-2 text-xl font-black text-ink dark:text-white">{mappings.filter((mapping) => mapping.active).length} mapping attivi</h2></div>
              </div>

              {loading ? <p className="mt-5 text-sm text-ink/60 dark:text-white/60">Caricamento...</p> : null}
              {!loading && mappings.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead><tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/55 dark:border-white/10 dark:text-white/50"><th className="px-2 py-3">Fase</th><th className="px-2 py-3">Argomento</th><th className="px-2 py-3">Esercizio</th><th className="px-2 py-3">Fonte</th><th className="px-2 py-3">Azione</th></tr></thead>
                    <tbody>
                      {mappings.map((mapping) => (
                        <tr key={mapping.id} className={`border-b border-ink/8 align-top dark:border-white/8 ${mapping.active ? '' : 'opacity-45'}`}>
                          <td className="px-2 py-4 font-bold text-ink dark:text-white">{phaseLabel(mapping.phase)}</td>
                          <td className="px-2 py-4 text-ink/70 dark:text-white/65">{mapping.topic_key ? recoveryTopicLabel(mapping.topic_key) : 'Misto'}</td>
                          <td className="px-2 py-4 text-ink/70 dark:text-white/65"><strong className="text-ink dark:text-white">{exerciseLabel(mapping)}</strong>{mapping.school_test_type ? <span className="mt-1 block text-xs">{mapping.school_test_type}</span> : null}</td>
                          <td className="px-2 py-4 text-xs font-bold text-ink/55 dark:text-white/50">{mapping.mapping_source === 'recovery_wave_import' ? 'Wave 1 gestita' : 'Manuale'}{!mapping.active ? ' · inattivo' : ''}</td>
                          <td className="px-2 py-4">
                            {mapping.mapping_source === 'manual' ? <button type="button" onClick={() => removeMapping(mapping)} className={adminButton.secondary}>Rimuovi</button> : <span className="text-xs text-ink/45 dark:text-white/45">Gestito dal sync</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {!loading && !mappings.length ? <p className="mt-5 text-sm leading-6 text-ink/65 dark:text-white/60">Nessuna mappatura ancora configurata. Le sessioni possono essere pianificate ma non partono finché almeno il contenuto necessario non viene collegato qui.</p> : null}
            </section>
          </div>
        </div>
      </section>
    </>
  );
}

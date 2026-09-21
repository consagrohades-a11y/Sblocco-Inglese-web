import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileJson2,
  GripVertical,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import StudioBlockEditor from '../components/admin/exercise-studio/StudioBlockEditor.jsx';
import StudioBlockPalette from '../components/admin/exercise-studio/StudioBlockPalette.jsx';
import StudioJsonImportPanel from '../components/admin/exercise-studio/StudioJsonImportPanel.jsx';
import StudioQuickAssignPanel from '../components/admin/exercise-studio/StudioQuickAssignPanel.jsx';
import StudioSelect from '../components/admin/exercise-studio/StudioSelect.jsx';
import ExerciseQuestionRenderer from '../components/exercises/ExerciseQuestionRenderer.jsx';
import {
  ExerciseActivity,
  ExerciseCanvas,
} from '../components/exercises/ExerciseExperience.jsx';
import {
  addStudioBlock,
  createStudioDocument,
  normalizeStudioDocument,
} from '../lib/exerciseStudioDocument.js';
import {
  compileStudioBlock,
  getStudioBlockDefinition,
  normalizeStudioBlock,
} from '../lib/exerciseStudioBlockRegistry.js';
import { preflightStudioDocument } from '../lib/exerciseStudioCompiler.js';
import {
  createStudioDraft,
  loadStudioDraft,
  publishStudioDraft,
  saveStudioDraft,
} from '../lib/exerciseStudioDraftApi.js';
import { deleteStudioContentMedia } from '../lib/exerciseStudioMediaApi.js';

const LEVELS = ['A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed'];
const ACTIVITY_TYPES = [
  ['exercise', 'Exercise'],
  ['lesson', 'Lesson'],
  ['mini_course', 'Mini-course'],
  ['listening_lesson', 'Listening lesson'],
  ['assessment', 'Assessment'],
];

function starterDocument() {
  return createStudioDocument({
    internal_title: '',
    learner_title: '',
    level: 'A2',
    topic: '',
    activity_type: 'lesson',
  });
}

function metadataInputClass() {
  return 'focus-ring w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-bold text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white';
}

function blockSummary(block) {
  if (block.title) return block.title;
  if (block.prompt) return block.prompt;
  if (block.body) return block.body.slice(0, 60);
  if (block.type === 'word_order' && block.chunks?.length) return block.chunks.join(' ');
  return 'Untitled block';
}

function transcriptBeforeBlock(blocks, index) {
  for (let current = index - 1; current >= 0; current -= 1) {
    const block = blocks[current];
    if (block?.type === 'media' && String(block.transcript || '').trim()) return block.transcript;
  }
  return '';
}

function PreviewBlock({ block, document, index, total, selected, onSelect }) {
  let question = null;
  let previewError = '';

  try {
    const normalized = normalizeStudioBlock(block);
    question = compileStudioBlock(normalized, {
      document,
      blockIndex: index,
      clientKey: 'studio_preview_' + (block.id || index),
    });
  } catch (error) {
    previewError = error instanceof Error ? error.message : String(error);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`group relative rounded-[1.75rem] border-2 transition ${selected ? 'border-orange-400 shadow-[0_0_0_4px_rgba(249,115,22,0.08)]' : 'border-transparent hover:border-orange-200 dark:hover:border-orange-300/20'}`}
    >
      {selected ? (
        <span className="absolute -right-2 -top-2 z-10 rounded-full bg-orange-500 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-white shadow-sm">
          Editing
        </span>
      ) : null}
      {question ? (
        <ExerciseActivity
          type={question.content?.presentation === 'choice_set'
            ? 'multiple_choice_set'
            : question.content?.presentation === 'open_answer_set'
              ? 'open_answer_set'
              : question.type}
          index={index + 1}
          total={total}
        >
          <ExerciseQuestionRenderer
            item={{ id: block.id, question, result: null }}
            answer={null}
            onChange={() => {}}
            disabled
            showScore={false}
            showCorrectAnswers={false}
            showExplanations={false}
            referencedTranscript={transcriptBeforeBlock(document.blocks || [], index)}
          />
        </ExerciseActivity>
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">
          {previewError || 'This block cannot be previewed yet.'}
        </div>
      )}
    </div>
  );
}

function EmptyCanvas({ onAdd }) {
  return (
    <div className="grid min-h-[48vh] place-items-center rounded-[2rem] border border-dashed border-ink/15 bg-white/70 p-8 text-center dark:border-white/15 dark:bg-white/[0.025]">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-300/10 dark:text-orange-200">
          <Sparkles className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-2xl font-black text-ink dark:text-white">Start with what you want to teach.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
          Add an explanation, rule, activity, media source or production task. Sblocco will handle the technical structure underneath.
        </p>
        <button type="button" onClick={onAdd} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600">
          <Plus className="h-4 w-4" /> Add first block
        </button>
      </div>
    </div>
  );
}

export default function AdminExerciseStudio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlDraftId = searchParams.get('draft');
  const importRequested = searchParams.get('import') === '1';
  const [newDraftFolderId] = useState(() => searchParams.get('folder'));
  const [document, setDocument] = useState(starterDocument);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(true);
  const [preflightVisible, setPreflightVisible] = useState(false);
  const [hydrated, setHydrated] = useState(!urlDraftId);
  const [saveState, setSaveState] = useState(urlDraftId ? 'loading' : 'idle');
  const [saveError, setSaveError] = useState('');
  const [publishState, setPublishState] = useState('idle');
  const [publishNotice, setPublishNotice] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importNotice, setImportNotice] = useState('');
  const [draftOrigin, setDraftOrigin] = useState('manual');
  const [publishedExerciseId, setPublishedExerciseId] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState('');
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [dragOverBlockId, setDragOverBlockId] = useState(null);
  const draftIdRef = useRef(null);
  const lastSavedRef = useRef('');
  const saveTimerRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());
  const documentGenerationRef = useRef(0);

  const normalized = useMemo(() => normalizeStudioDocument(document).document, [document]);
  const preflight = useMemo(() => preflightStudioDocument(document), [document]);
  const selectedIndex = document.blocks.findIndex((block) => block.id === selectedBlockId);
  const selectedBlock = selectedIndex >= 0 ? document.blocks[selectedIndex] : null;
  const selectedIssues = selectedBlock
    ? preflight.issues.filter((item) => item.block_id === selectedBlock.id)
    : [];

  useEffect(() => {
    if (importRequested && !urlDraftId) {
      setImportOpen(true);
      setSearchParams(newDraftFolderId ? { folder: newDraftFolderId } : {}, { replace: true });
    }
  }, [importRequested, urlDraftId, newDraftFolderId, setSearchParams]);

  useEffect(() => {
    if (!urlDraftId) {
      setHydrated(true);
      return undefined;
    }
    if (draftIdRef.current === urlDraftId && hydrated) return undefined;

    let active = true;
    setHydrated(false);
    setSaveState('loading');
    setSaveError('');

    loadStudioDraft(urlDraftId)
      .then((draft) => {
        if (!active) return;
        draftIdRef.current = draft.id;
        setDraftOrigin(draft.origin || 'manual');
        setPublishedExerciseId(draft.exercise_id || null);
        lastSavedRef.current = JSON.stringify(draft.document);
        setDocument(draft.document);
        setSelectedBlockId(null);
        setHydrated(true);
        setSaveState('saved');
      })
      .catch((error) => {
        if (!active) return;
        setSaveError(error.message || 'Could not load this draft.');
        setHydrated(true);
        setSaveState('error');
      });

    return () => { active = false; };
  }, [urlDraftId]);

  useEffect(() => {
    if (!hydrated) return undefined;
    const meaningful = Boolean(
      document.internal_title?.trim()
      || document.learner_title?.trim()
      || document.topic?.trim()
      || document.blocks?.length
    );
    if (!meaningful) return undefined;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const snapshot = normalizeStudioDocument(document).document;
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSavedRef.current) {
        setSaveState('saved');
        return;
      }

      setSaveState('saving');
      setSaveError('');

      const generation = documentGenerationRef.current;
      saveChainRef.current = saveChainRef.current
        .catch(() => undefined)
        .then(async () => {
          let draftId = draftIdRef.current;
          if (!draftId) {
            const created = await createStudioDraft(snapshot, { origin: draftOrigin, folderId: newDraftFolderId });
            if (generation !== documentGenerationRef.current) return;
            draftId = created.id;
            draftIdRef.current = draftId;
            setSearchParams({ draft: draftId }, { replace: true });
          } else {
            await saveStudioDraft(draftId, snapshot);
          }
          if (generation !== documentGenerationRef.current) return;
          lastSavedRef.current = serialized;
          setSaveState('saved');
        })
        .catch((error) => {
          if (generation !== documentGenerationRef.current) return;
          setSaveError(error.message || 'Autosave failed.');
          setSaveState('error');
        });
    }, 800);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [document, draftOrigin, hydrated, setSearchParams]);

  function changedDraft(current, patch) {
    return {
      ...current,
      ...patch,
      status: current.status === 'published' ? 'draft' : current.status,
    };
  }

  function patchDocument(patch) {
    setPublishNotice('');
    setImportNotice('');
    setAssignmentNotice('');
    setDocument((current) => changedDraft(current, patch));
  }

  function addBlock(type) {
    setPublishNotice('');
    setImportNotice('');
    setAssignmentNotice('');
    setDocument((current) => {
      const next = addStudioBlock(current, type);
      const newBlock = next.blocks[next.blocks.length - 1];
      const selectedIndex = current.blocks.findIndex((block) => block.id === selectedBlockId);

      if (selectedIndex >= 0) {
        const blocks = [...current.blocks];
        blocks.splice(selectedIndex + 1, 0, newBlock);
        setSelectedBlockId(newBlock.id);
        return changedDraft(current, { blocks });
      }

      setSelectedBlockId(newBlock.id);
      return { ...next, status: current.status === 'published' ? 'draft' : current.status };
    });
    setPaletteOpen(false);
  }

  function replaceBlock(nextBlock) {
    setPublishNotice('');
    setImportNotice('');
    setAssignmentNotice('');
    setDocument((current) => changedDraft(current, {
      blocks: current.blocks.map((block) => block.id === nextBlock.id ? nextBlock : block),
    }));
  }

  function deleteBlock(blockId) {
    const block = document.blocks.find((item) => item.id === blockId);
    setPublishNotice('');
    setImportNotice('');
    setAssignmentNotice('');
    setDocument((current) => changedDraft(current, {
      blocks: current.blocks.filter((item) => item.id !== blockId),
    }));
    setSelectedBlockId(null);

    if (block?.storage_bucket && block?.storage_path) {
      deleteStudioContentMedia(block.storage_bucket, block.storage_path).catch(() => undefined);
    }
  }

  function moveBlock(blockId, direction) {
    setPublishNotice('');
    setImportNotice('');
    setAssignmentNotice('');
    setDocument((current) => {
      const blocks = [...current.blocks];
      const index = blocks.findIndex((block) => block.id === blockId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= blocks.length) return current;
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return changedDraft(current, { blocks });
    });
  }


  function reorderBlock(sourceBlockId, targetBlockId) {
    if (!sourceBlockId || !targetBlockId || sourceBlockId === targetBlockId) return;
    setPublishNotice('');
    setImportNotice('');
    setAssignmentNotice('');
    setDocument((current) => {
      const blocks = [...current.blocks];
      const sourceIndex = blocks.findIndex((block) => block.id === sourceBlockId);
      const targetIndex = blocks.findIndex((block) => block.id === targetBlockId);
      if (sourceIndex < 0 || targetIndex < 0) return current;

      const [moved] = blocks.splice(sourceIndex, 1);
      blocks.splice(targetIndex, 0, moved);
      return changedDraft(current, { blocks });
    });
  }

  function finishBlockDrag() {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }

  async function publishCurrentDraft() {
    if (!preflight.valid || publishState === 'publishing') return;

    setPublishState('publishing');
    setPublishNotice('');
    setSaveError('');

    try {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      await saveChainRef.current.catch(() => undefined);
      const snapshot = preflight.document;
      let draftId = draftIdRef.current;

      if (!draftId) {
        const created = await createStudioDraft(snapshot, { origin: draftOrigin, folderId: newDraftFolderId });
        draftId = created.id;
        draftIdRef.current = draftId;
        setSearchParams({ draft: draftId }, { replace: true });
      } else {
        await saveStudioDraft(draftId, snapshot);
      }

      const result = await publishStudioDraft(draftId, preflight.runtime);
      const publishedDocument = { ...snapshot, status: 'published' };
      lastSavedRef.current = JSON.stringify(publishedDocument);
      setDocument(publishedDocument);
      setSaveState('saved');
      setPublishedExerciseId(result.exercise_id || null);
      setPublishState('published');
      setPublishNotice(`${result.public_id || 'Exercise'} published and ready to assign.`);
    } catch (error) {
      setPublishState('error');
      setPublishNotice(error.message || 'Publishing failed.');
    }
  }

  function resetDraftIdentity(origin = 'manual') {
    documentGenerationRef.current += 1;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    draftIdRef.current = null;
    lastSavedRef.current = '';
    setSearchParams({}, { replace: true });
    setDraftOrigin(origin);
    setSaveState('idle');
    setSaveError('');
    setPublishState('idle');
    setPublishNotice('');
    setPublishedExerciseId(null);
    setAssignOpen(false);
    setAssignmentNotice('');
  }

  function startNew() {
    resetDraftIdentity('manual');
    setDocument(starterDocument());
    setSelectedBlockId(null);
    setPaletteOpen(false);
    setPreflightVisible(false);
    setImportOpen(false);
    setAssignOpen(false);
    setPublishedExerciseId(null);
    setAssignmentNotice('');
    setImportNotice('');
    setHydrated(true);
  }

  function importIntoStudio(result) {
    resetDraftIdentity('ai_import');
    setDocument({ ...result.document, status: 'draft' });
    const firstProblem = result.errors.find((item) => item.block_id)?.block_id;
    setSelectedBlockId(firstProblem || result.document.blocks[0]?.id || null);
    setPaletteOpen(false);
    setPreflightVisible(result.errors.length > 0);
    setImportOpen(false);
    setImportNotice(
      result.needs_attention_blocks
        ? `Imported: ${result.ready_blocks} blocks ready, ${result.needs_attention_blocks} need attention.`
        : `Imported: all ${result.ready_blocks} blocks are ready.`
    );
    setHydrated(true);
  }

  return (
    <>
      <SEO
        title="Learning Studio | Sblocco Inglese"
        description="Create, preview and publish Sblocco learning activities."
      />

      <div className="min-h-screen bg-[#f7f3eb] dark:bg-surface-950 xl:flex xl:h-[100dvh] xl:min-h-0 xl:flex-col xl:overflow-hidden">
        {saveError ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">
            {saveError}
          </div>
        ) : null}
        <header className="sticky top-0 z-30 shrink-0 border-b border-ink/10 bg-[#f7f3eb]/95 backdrop-blur dark:border-white/10 dark:bg-surface-950/95 xl:static">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 xl:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <a href="/admin/content/exercises/library" className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/10 bg-white text-ink/65 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65" aria-label="Back to library">
                <ArrowLeft className="h-4 w-4" />
              </a>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">Sblocco Learning Studio</p>
                <h1 className="truncate text-lg font-black text-ink dark:text-white">{document.internal_title || 'Untitled activity'}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black ${
                saveState === 'error'
                  ? 'bg-red-100 text-red-800 dark:bg-red-300/10 dark:text-red-200'
                  : 'bg-white text-ink/55 dark:bg-white/[0.05] dark:text-white/55'
              }`} title={saveError || 'Draft autosave'}>
                {saveState === 'saving' || saveState === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {saveState === 'loading' ? 'Loading' : saveState === 'saving' ? 'Saving' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Not saved yet'}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black ${preflight.valid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200' : 'bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100'}`}>
                {preflight.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {preflight.valid ? 'Ready to publish' : `${preflight.errors.length} to fix`}
              </span>
              <button type="button" onClick={() => setImportOpen(true)} className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-black text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
                <FileJson2 className="h-3.5 w-3.5" /> Import JSON
              </button>
              <button type="button" onClick={() => setPreflightVisible((value) => !value)} className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-black text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
                <Eye className="h-3.5 w-3.5" /> Preflight
              </button>
              <button type="button" onClick={startNew} className="focus-ring rounded-full border border-ink/10 px-4 py-2 text-xs font-black text-ink/65 dark:border-white/10 dark:text-white/65">
                New
              </button>
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                disabled={document.status !== 'published' || !publishedExerciseId}
                title={document.status === 'published' ? 'Assign this published activity' : 'Publish the current draft before assigning'}
                className="focus-ring rounded-full border border-orange-300 bg-orange-50 px-4 py-2.5 text-xs font-black text-orange-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-orange-300/30 dark:bg-orange-300/[0.07] dark:text-orange-100"
              >
                Assign
              </button>
              <button
                type="button"
                onClick={publishCurrentDraft}
                disabled={!preflight.valid || publishState === 'publishing'}
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-35 dark:bg-orange-400 dark:text-surface-950"
              >
                {publishState === 'publishing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {publishState === 'publishing' ? 'Publishing' : document.status === 'published' ? 'Published' : 'Publish'}
              </button>
            </div>
          </div>

          {assignmentNotice ? (
            <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-xs font-black text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100 xl:px-6">
              {assignmentNotice}
            </div>
          ) : null}

          {importNotice ? (
            <div className="border-t border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-black text-orange-950 dark:border-orange-300/20 dark:bg-orange-300/[0.07] dark:text-orange-100 xl:px-6">
              {importNotice}
            </div>
          ) : null}

          {publishNotice ? (
            <div className={`border-t px-4 py-2 text-center text-xs font-black xl:px-6 ${
              publishState === 'error'
                ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100'
            }`}>
              {publishNotice}
            </div>
          ) : null}

          {preflightVisible ? (
            <div className="border-t border-ink/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-surface-900 xl:px-6">
              <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-3">
                <div className="min-w-[12rem] flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-ink/50 dark:text-white/50">Automatic repairs</p>
                  <p className="mt-1 text-sm font-semibold text-ink/65 dark:text-white/65">
                    {preflight.repairs.length ? `${preflight.repairs.length} technical detail${preflight.repairs.length === 1 ? '' : 's'} generated or normalized automatically.` : 'No technical repairs needed.'}
                  </p>
                </div>
                <div className="min-w-[16rem] flex-[2]">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-ink/50 dark:text-white/50">Teaching decisions</p>
                  {preflight.errors.length ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {preflight.errors.slice(0, 6).map((item, index) => (
                        <button key={index} type="button" onClick={() => item.block_id && setSelectedBlockId(item.block_id)} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200 dark:bg-amber-300/10 dark:text-amber-100">
                          {item.message}
                        </button>
                      ))}
                    </div>
                  ) : <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">No unresolved teaching decisions.</p>}
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <div className="grid min-h-[calc(100vh-66px)] xl:min-h-0 xl:flex-1 xl:grid-cols-[260px_minmax(0,1fr)_400px] 2xl:grid-cols-[280px_minmax(0,1fr)_430px]">
          <aside className="min-w-0 overflow-x-hidden border-b border-ink/10 bg-[#fbf8f1] p-4 dark:border-white/10 dark:bg-white/[0.02] xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:border-b-0 xl:border-r xl:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45 dark:text-white/45">Structure</p>
                <p className="mt-1 text-sm font-black text-ink dark:text-white">{document.blocks.length} block{document.blocks.length === 1 ? '' : 's'}</p>
              </div>
              <button type="button" onClick={() => setPaletteOpen((value) => !value)} className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-white" aria-label="Add block">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {paletteOpen ? (
              <div className="mt-4 min-w-0">
                <StudioBlockPalette onAdd={addBlock} />
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {document.blocks.map((block, index) => {
                  const definition = getStudioBlockDefinition(block.type);
                  const issues = preflight.issues.filter((item) => item.block_id === block.id && item.severity === 'error');
                  const active = block.id === selectedBlockId;
                  return (
                    <div
                      key={block.id}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        if (draggedBlockId && draggedBlockId !== block.id) setDragOverBlockId(block.id);
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setDragOverBlockId((current) => current === block.id ? null : current);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceId = draggedBlockId || event.dataTransfer.getData('text/plain');
                        reorderBlock(sourceId, block.id);
                        finishBlockDrag();
                      }}
                      className={`group relative overflow-hidden rounded-2xl border transition-all ${draggedBlockId === block.id ? 'opacity-40' : ''} ${dragOverBlockId === block.id ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-200 dark:bg-orange-300/[0.06] dark:ring-orange-300/20' : active ? 'border-orange-300 bg-orange-50/75 shadow-[inset_3px_0_0_#f97316] dark:border-orange-300/30 dark:bg-orange-300/[0.06]' : 'border-ink/10 bg-white/85 hover:border-ink/20 hover:bg-white dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-white/20 dark:hover:bg-white/[0.055]'}`}
                    >
                      {dragOverBlockId === block.id ? (
                        <span className="pointer-events-none absolute inset-x-3 top-0 h-0.5 rounded-full bg-orange-500" />
                      ) : null}
                      <div className="flex min-w-0 items-stretch">
                        <div
                          draggable
                          onDragStart={(event) => {
                            setDraggedBlockId(block.id);
                            setDragOverBlockId(null);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', block.id);
                          }}
                          onDragEnd={finishBlockDrag}
                          className="flex w-8 shrink-0 cursor-grab items-center justify-center text-ink/20 transition active:cursor-grabbing group-hover:text-orange-600 dark:text-white/20 dark:group-hover:text-orange-300"
                          title="Drag to reorder"
                          role="button"
                          tabIndex={0}
                          aria-label={`Drag block ${index + 1} to reorder`}
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedBlockId(block.id)}
                          className="focus-ring min-w-0 flex-1 py-3 pr-2 text-left"
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.62rem] font-black tabular-nums ${active ? 'bg-orange-500 text-white' : 'bg-linen text-ink/45 dark:bg-white/[0.06] dark:text-white/45'}`}>
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[0.62rem] font-black uppercase leading-4 tracking-[0.08em] text-orange-700 dark:text-orange-300">
                                {definition?.label || block.type}
                              </span>
                              <span className="mt-0.5 block overflow-hidden text-[0.72rem] font-bold leading-[1.15rem] text-ink/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-white/70">
                                {blockSummary(block)}
                              </span>
                            </span>
                            {issues.length ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : null}
                          </div>
                        </button>

                        <div className={`flex w-8 shrink-0 flex-col items-center justify-center gap-0.5 pr-1 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveBlock(block.id, -1)}
                            className="focus-ring grid h-6 w-6 place-items-center rounded-md text-ink/35 transition hover:bg-orange-100 hover:text-orange-700 disabled:opacity-15 dark:text-white/35 dark:hover:bg-orange-300/10 dark:hover:text-orange-200"
                            aria-label="Move block up"
                            title="Move up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === document.blocks.length - 1}
                            onClick={() => moveBlock(block.id, 1)}
                            className="focus-ring grid h-6 w-6 place-items-center rounded-md text-ink/35 transition hover:bg-orange-100 hover:text-orange-700 disabled:opacity-15 dark:text-white/35 dark:hover:bg-orange-300/10 dark:hover:text-orange-200"
                            aria-label="Move block down"
                            title="Move down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button type="button" onClick={() => setPaletteOpen(true)} className="focus-ring mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 px-3 py-3 text-xs font-black text-ink/50 hover:border-orange-300 hover:text-orange-700 dark:border-white/15 dark:text-white/50 dark:hover:border-orange-300/30 dark:hover:text-orange-200">
                  <Plus className="h-3.5 w-3.5" /> Add block
                </button>
              </div>
            )}
          </aside>

          <main className="min-w-0 bg-[#f7f3eb] px-4 py-5 dark:bg-surface-950 sm:px-6 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:px-8 xl:py-7">
            <div className="mx-auto max-w-4xl">
              <button type="button" onClick={() => setMetadataOpen((value) => !value)} className="focus-ring mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left dark:border-white/10 dark:bg-white/[0.035]">
                <span>
                  <span className="block text-[0.65rem] font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Activity</span>
                  <span className="mt-0.5 block text-sm font-black text-ink dark:text-white">{document.learner_title || document.internal_title || 'Name this activity'}</span>
                </span>
                {metadataOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {metadataOpen ? (
                <div className="mb-6 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.035] sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">
                    Internal title
                    <input value={document.internal_title || ''} onChange={(event) => patchDocument({ internal_title: event.target.value })} placeholder="A2 — Present Perfect — Experiences" className={metadataInputClass()} />
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">
                    Learner title
                    <input value={document.learner_title || ''} onChange={(event) => patchDocument({ learner_title: event.target.value })} placeholder="Talking about your experiences" className={metadataInputClass()} />
                  </label>
                  <div className="grid min-w-0 gap-1 text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">
                    <span>Level</span>
                    <StudioSelect
                      value={document.level}
                      onChange={(value) => patchDocument({ level: value })}
                      options={LEVELS}
                      ariaLabel="Activity level"
                    />
                  </div>
                  <div className="grid min-w-0 gap-1 text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">
                    <span>Type</span>
                    <StudioSelect
                      value={document.activity_type}
                      onChange={(value) => patchDocument({ activity_type: value })}
                      options={ACTIVITY_TYPES}
                      ariaLabel="Activity type"
                    />
                  </div>
                  <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">
                    Topic
                    <input value={document.topic || ''} onChange={(event) => patchDocument({ topic: event.target.value })} placeholder="present_perfect" className={metadataInputClass()} />
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">
                    Estimated minutes
                    <input type="number" min="1" value={document.estimated_minutes || ''} onChange={(event) => patchDocument({ estimated_minutes: event.target.value ? Number(event.target.value) : null })} placeholder="Automatic" className={metadataInputClass()} />
                  </label>
                </div>
              ) : null}

              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-ink/40 dark:text-white/40">Learner canvas</p>
                  <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-white/50">This uses the real learner renderer. Click a block to edit it.</p>
                </div>
              </div>

              {document.blocks.length ? (
                <ExerciseCanvas className="grid gap-4">
                  {document.blocks.map((block, index) => (
                    <PreviewBlock
                      key={block.id}
                      block={block}
                      document={normalized}
                      index={index}
                      total={document.blocks.length}
                      selected={block.id === selectedBlockId}
                      onSelect={() => setSelectedBlockId(block.id)}
                    />
                  ))}
                </ExerciseCanvas>
              ) : <EmptyCanvas onAdd={() => setPaletteOpen(true)} />}
            </div>
          </main>

          <aside className="min-w-0 overflow-hidden border-t border-ink/10 bg-[#fbf8f1] dark:border-white/10 dark:bg-white/[0.02] xl:min-h-0 xl:border-l xl:border-t-0">
            <div className="h-full min-h-0 min-w-0">
              {selectedBlock ? (
                <StudioBlockEditor
                  block={selectedBlock}
                  issues={selectedIssues}
                  activityId={document.id}
                  onChange={replaceBlock}
                  onDelete={() => deleteBlock(selectedBlock.id)}
                />
              ) : (
                <div className="grid min-h-64 place-items-center text-center">
                  <div className="max-w-xs">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Contextual editor</p>
                    <h2 className="mt-2 text-xl font-black text-ink dark:text-white">Select a block.</h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">Only the teaching controls relevant to that block appear here. Technical IDs and database fields stay hidden.</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {importOpen ? (
        <StudioJsonImportPanel
          onClose={() => setImportOpen(false)}
          onImport={importIntoStudio}
        />
      ) : null}

      {assignOpen && publishedExerciseId ? (
        <StudioQuickAssignPanel
          exerciseId={publishedExerciseId}
          activityTitle={document.learner_title || document.internal_title || 'Sblocco activity'}
          onClose={() => setAssignOpen(false)}
          onAssigned={({ learner, group, result, mode }) => {
            setAssignmentNotice(
              mode === 'group'
                ? `Assigned to ${group?.name || 'group'} · ${result?.assignment_count || 0} learner assignments created.`
                : `Assigned to ${learner?.display_name || learner?.email || 'learner'}.`
            );
          }}
        />
      ) : null}
    </>
  );
}

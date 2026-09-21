import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileJson2,
  Folder,
  FolderOpen,
  FolderPlus,
  Inbox,
  MoveRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import StudioQuickAssignPanel from '../components/admin/exercise-studio/StudioQuickAssignPanel.jsx';
import {
  archiveStudioDraft,
  listStudioDrafts,
  loadStudioDraft,
} from '../lib/exerciseStudioDraftApi.js';
import { downloadStudioActivityJson } from '../lib/exerciseStudioExport.js';
import {
  createStudioFolder,
  deleteStudioFolder,
  listStudioFolders,
  moveStudioDraftToFolder,
  renameStudioFolder,
} from '../lib/exerciseStudioFolderApi.js';

const STATUS_OPTIONS = [
  ['all', 'All'],
  ['draft', 'Drafts'],
  ['published', 'Published'],
  ['archived', 'Archived'],
];

function statusClass(status) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200';
  if (status === 'archived') return 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/60';
  return 'bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100';
}

function originLabel(origin) {
  if (origin === 'ai_import') return 'AI / JSON import';
  if (origin === 'duplicate') return 'Duplicated';
  return 'Manual';
}

function updatedLabel(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function folderCount(items, folderId) {
  if (folderId === 'all') return items.length;
  if (folderId === 'unfiled') return items.filter((item) => !item.folder_id).length;
  return items.filter((item) => item.folder_id === folderId).length;
}

export default function AdminExerciseBuilderLibrary() {
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [assignItem, setAssignItem] = useState(null);
  const [archivingId, setArchivingId] = useState('');
  const [exportingId, setExportingId] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [folderBusy, setFolderBusy] = useState(false);
  const [draggedDraftId, setDraggedDraftId] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [draftRows, folderRows] = await Promise.all([
        listStudioDrafts(),
        listStudioFolders(),
      ]);
      setItems(draftRows);
      setFolders(folderRows);
    } catch (nextError) {
      setError(nextError.message || 'Could not load the Learning Studio library.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const statusFiltered = useMemo(() => (
    status === 'all' ? items : items.filter((item) => item.status === status)
  ), [items, status]);

  const availableTags = useMemo(() => (
    [...new Set(items.flatMap((item) => Array.isArray(item.tags) ? item.tags : []))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  ), [items]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();

    return statusFiltered.filter((item) => {
      if (selectedFolder === 'unfiled' && item.folder_id) return false;
      if (!['all', 'unfiled'].includes(selectedFolder) && item.folder_id !== selectedFolder) return false;

      const tags = Array.isArray(item.tags) ? item.tags : [];
      if (selectedTag !== 'all' && !tags.some((tag) => tag.toLocaleLowerCase() === selectedTag.toLocaleLowerCase())) return false;

      if (!needle) return true;
      const haystack = [
        item.internal_title,
        item.learner_title,
        item.topic,
        item.level,
        item.activity_type,
        ...tags,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return haystack.includes(needle);
    });
  }, [statusFiltered, search, selectedFolder, selectedTag]);

  const counts = useMemo(() => ({
    all: items.length,
    draft: items.filter((item) => item.status === 'draft').length,
    published: items.filter((item) => item.status === 'published').length,
    archived: items.filter((item) => item.status === 'archived').length,
  }), [items]);

  const folderQuery = !['all', 'unfiled'].includes(selectedFolder) ? `&folder=${encodeURIComponent(selectedFolder)}` : '';
  const newActivityHref = `/admin/content/exercises/studio?${folderQuery ? folderQuery.slice(1) : ''}`;
  const importHref = `/admin/content/exercises/studio?import=1${folderQuery}`;

  const selectedFolderLabel = selectedFolder === 'all'
    ? 'All activities'
    : selectedFolder === 'unfiled'
      ? 'Unfiled'
      : folders.find((folder) => folder.id === selectedFolder)?.name || 'Folder';

  async function exportJson(item) {
    if (exportingId) return;
    setExportingId(item.id);
    setError('');
    try {
      const draft = await loadStudioDraft(item.id);
      downloadStudioActivityJson(draft.document);
      setNotice(`${item.internal_title || 'Activity'} exported as JSON.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not export this activity.');
    } finally {
      setExportingId('');
    }
  }

  async function archive(item) {
    if (archivingId) return;
    setArchivingId(item.id);
    setError('');
    try {
      await archiveStudioDraft(item.id);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: 'archived' } : row));
      setNotice(`${item.internal_title || 'Activity'} archived.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not archive this activity.');
    } finally {
      setArchivingId('');
    }
  }

  async function createFolder(event) {
    event.preventDefault();
    if (folderBusy || !newFolderName.trim()) return;
    setFolderBusy(true);
    setError('');
    try {
      const folder = await createStudioFolder(newFolderName);
      setFolders((current) => [...current, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedFolder(folder.id);
      setNewFolderName('');
      setNewFolderOpen(false);
      setNotice(`Folder “${folder.name}” created.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not create this folder.');
    } finally {
      setFolderBusy(false);
    }
  }

  async function saveFolderName(folderId) {
    if (folderBusy || !renameValue.trim()) return;
    setFolderBusy(true);
    setError('');
    try {
      const updated = await renameStudioFolder(folderId, renameValue);
      setFolders((current) => current
        .map((folder) => folder.id === folderId ? updated : folder)
        .sort((a, b) => a.name.localeCompare(b.name)));
      setRenamingFolderId('');
      setRenameValue('');
      setNotice(`Folder renamed to “${updated.name}”.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not rename this folder.');
    } finally {
      setFolderBusy(false);
    }
  }

  async function removeFolder(folder) {
    if (folderBusy) return;
    const count = folderCount(items, folder.id);
    const message = count
      ? `Delete “${folder.name}”? Its ${count} ${count === 1 ? 'activity' : 'activities'} will move to Unfiled.`
      : `Delete “${folder.name}”? `;
    if (!window.confirm(message)) return;

    setFolderBusy(true);
    setError('');
    try {
      await deleteStudioFolder(folder.id);
      setFolders((current) => current.filter((row) => row.id !== folder.id));
      setItems((current) => current.map((item) => item.folder_id === folder.id ? { ...item, folder_id: null } : item));
      if (selectedFolder === folder.id) setSelectedFolder('unfiled');
      setNotice(`Folder “${folder.name}” deleted. Activities were kept.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not delete this folder.');
    } finally {
      setFolderBusy(false);
    }
  }

  async function moveDraft(draftId, folderId, folderName = 'Unfiled') {
    if (!draftId) return;
    setError('');
    try {
      const moved = await moveStudioDraftToFolder(draftId, folderId);
      setItems((current) => current.map((item) => item.id === draftId
        ? { ...item, folder_id: moved.folder_id, updated_at: moved.updated_at }
        : item));
      setNotice(`Activity moved to ${folderName}.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not move this activity.');
    } finally {
      setDraggedDraftId('');
      setDragOverFolder('');
    }
  }

  function folderDropProps(folderId, folderName) {
    return {
      onDragOver: (event) => {
        if (!draggedDraftId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragOverFolder(folderId);
      },
      onDragLeave: () => setDragOverFolder((current) => current === folderId ? '' : current),
      onDrop: (event) => {
        event.preventDefault();
        moveDraft(draggedDraftId || event.dataTransfer.getData('text/plain'), folderId === 'unfiled' ? null : folderId, folderName);
      },
    };
  }

  return (
    <>
      <SEO
        title="Learning Studio Library | Sblocco Inglese"
        description="Organise, search, edit, publish and assign Sblocco learning activities."
      />

      <section className="min-h-screen bg-[#f7f3eb] py-8 dark:bg-surface-950 lg:py-10">
        <div className="mx-auto max-w-[92rem] px-4 sm:px-6">
          <header className="overflow-hidden rounded-[2rem] border border-ink/10 bg-[#fbf8f1] shadow-sm dark:border-white/10 dark:bg-white/[0.025]">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">Sblocco Learning Studio</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-ink dark:text-white sm:text-5xl">Your learning library</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
                  Organise activities without changing how they publish or run. Folders are only for your teaching workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to={importHref} className="focus-ring inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-4 py-2.5 text-xs font-black text-orange-900 dark:border-orange-300/30 dark:bg-orange-300/[0.07] dark:text-orange-100">
                  <FileJson2 className="h-4 w-4" /> Import JSON
                </Link>
                <Link to={newActivityHref} className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-black text-white shadow-sm dark:bg-orange-400 dark:text-surface-950">
                  <Plus className="h-4 w-4" /> New activity
                </Link>
              </div>
            </div>

            <div className="border-t border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.025] sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 flex-1 lg:max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, topic, level, tag..."
                    className="focus-ring w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatus(value)}
                      className={`focus-ring rounded-full px-3 py-2 text-xs font-black transition ${
                        status === value
                          ? 'bg-ink text-white dark:bg-orange-400 dark:text-surface-950'
                          : 'bg-linen text-ink/60 hover:text-ink dark:bg-white/[0.06] dark:text-white/60 dark:hover:text-white'
                      }`}
                    >
                      {label} · {counts[value]}
                    </button>
                  ))}
                </div>
              </div>

              {availableTags.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-ink/10 pt-3 dark:border-white/10">
                  <span className="mr-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">Tags</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTag('all')}
                    className={`focus-ring rounded-full px-2.5 py-1.5 text-[0.68rem] font-black transition ${selectedTag === 'all' ? 'bg-orange-500 text-white' : 'bg-linen text-ink/55 hover:text-ink dark:bg-white/[0.06] dark:text-white/55 dark:hover:text-white'}`}
                  >
                    All
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`focus-ring rounded-full px-2.5 py-1.5 text-[0.68rem] font-black transition ${selectedTag === tag ? 'bg-orange-500 text-white' : 'bg-linen text-ink/55 hover:text-ink dark:bg-white/[0.06] dark:text-white/55 dark:hover:text-white'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}
          {notice ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">{notice}</div> : null}

          <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="h-fit rounded-[1.5rem] border border-ink/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03] lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3 px-2 py-2">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Folders</p>
                  <p className="mt-0.5 text-xs font-semibold text-ink/40 dark:text-white/40">{folders.length} custom</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewFolderOpen((current) => !current)}
                  className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-white"
                  aria-label="Create folder"
                  title="New folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>

              {newFolderOpen ? (
                <form onSubmit={createFolder} className="mb-2 grid gap-2 rounded-xl bg-linen/45 p-2 dark:bg-white/[0.04]">
                  <input
                    autoFocus
                    maxLength={80}
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Folder name"
                    className="focus-ring min-w-0 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => { setNewFolderOpen(false); setNewFolderName(''); }} className="focus-ring rounded-lg px-2.5 py-1.5 text-[0.68rem] font-black text-ink/45 dark:text-white/45">Cancel</button>
                    <button type="submit" disabled={folderBusy || !newFolderName.trim()} className="focus-ring rounded-lg bg-ink px-3 py-1.5 text-[0.68rem] font-black text-white disabled:opacity-35 dark:bg-orange-400 dark:text-surface-950">Create</button>
                  </div>
                </form>
              ) : null}

              <div className="grid gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedFolder('all')}
                  className={`focus-ring flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-black transition ${selectedFolder === 'all' ? 'bg-ink text-white dark:bg-orange-400 dark:text-surface-950' : 'text-ink/65 hover:bg-linen dark:text-white/65 dark:hover:bg-white/[0.05]'}`}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">All activities</span>
                  <span className="text-[0.65rem] opacity-55">{folderCount(items, 'all')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFolder('unfiled')}
                  {...folderDropProps('unfiled', 'Unfiled')}
                  className={`focus-ring flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-black transition ${
                    dragOverFolder === 'unfiled'
                      ? 'border-orange-400 bg-orange-50 text-orange-900 dark:bg-orange-300/10 dark:text-orange-100'
                      : selectedFolder === 'unfiled'
                        ? 'border-ink bg-ink text-white dark:border-orange-400 dark:bg-orange-400 dark:text-surface-950'
                        : 'border-transparent text-ink/65 hover:bg-linen dark:text-white/65 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Inbox className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">Unfiled</span>
                  <span className="text-[0.65rem] opacity-55">{folderCount(items, 'unfiled')}</span>
                </button>

                <div className="my-1 border-t border-ink/10 dark:border-white/10" />

                {folders.map((folder) => {
                  const active = selectedFolder === folder.id;
                  const dragActive = dragOverFolder === folder.id;

                  if (renamingFolderId === folder.id) {
                    return (
                      <form key={folder.id} onSubmit={(event) => { event.preventDefault(); saveFolderName(folder.id); }} className="grid gap-1.5 rounded-xl bg-linen/45 p-2 dark:bg-white/[0.04]">
                        <input
                          autoFocus
                          maxLength={80}
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          className="focus-ring min-w-0 rounded-lg border border-ink/10 bg-white px-2.5 py-2 text-xs font-bold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                        />
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setRenamingFolderId('')} className="focus-ring px-2 py-1 text-[0.65rem] font-black text-ink/45 dark:text-white/45">Cancel</button>
                          <button type="submit" disabled={folderBusy || !renameValue.trim()} className="focus-ring rounded-md bg-ink px-2.5 py-1 text-[0.65rem] font-black text-white disabled:opacity-35 dark:bg-orange-400 dark:text-surface-950">Save</button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={folder.id}
                      {...folderDropProps(folder.id, folder.name)}
                      className={`group flex min-w-0 items-center rounded-xl border transition ${
                        dragActive
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-300/10'
                          : active
                            ? 'border-orange-200 bg-orange-50/75 dark:border-orange-300/20 dark:bg-orange-300/[0.07]'
                            : 'border-transparent hover:bg-linen/70 dark:hover:bg-white/[0.045]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedFolder(folder.id)}
                        className="focus-ring flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-xs font-black text-ink/70 dark:text-white/70"
                      >
                        <Folder className={`h-4 w-4 shrink-0 ${active ? 'text-orange-600 dark:text-orange-300' : 'text-ink/35 dark:text-white/35'}`} />
                        <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                        <span className="text-[0.65rem] opacity-45">{folderCount(items, folder.id)}</span>
                      </button>
                      <div className="flex shrink-0 items-center pr-1 opacity-60 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => { setRenamingFolderId(folder.id); setRenameValue(folder.name); }}
                          className="focus-ring grid h-7 w-7 place-items-center rounded-md text-ink/35 hover:bg-white hover:text-ink dark:text-white/35 dark:hover:bg-white/[0.08] dark:hover:text-white"
                          aria-label={`Rename ${folder.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFolder(folder)}
                          className="focus-ring grid h-7 w-7 place-items-center rounded-md text-ink/30 hover:bg-red-50 hover:text-red-700 dark:text-white/30 dark:hover:bg-red-300/10 dark:hover:text-red-200"
                          aria-label={`Delete ${folder.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {draggedDraftId ? (
                <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-[0.68rem] font-bold leading-5 text-orange-900 dark:bg-orange-300/[0.07] dark:text-orange-100">
                  Drop the activity onto a folder.
                </p>
              ) : null}
            </aside>

            <main className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Current folder</p>
                  <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{selectedFolderLabel}</h2>
                </div>
                <p className="text-xs font-semibold text-ink/45 dark:text-white/45">{filtered.length} {filtered.length === 1 ? 'activity' : 'activities'}</p>
              </div>

              {loading ? (
                <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/55 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">Loading Studio library...</div>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <div className="mt-4 grid min-h-72 place-items-center rounded-[2rem] border border-dashed border-ink/15 bg-white/60 p-8 text-center dark:border-white/15 dark:bg-white/[0.025]">
                  <div className="max-w-md">
                    <h3 className="text-2xl font-black text-ink dark:text-white">
                      {items.length ? 'Nothing here yet.' : 'The library is clean and empty.'}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
                      {items.length
                        ? selectedFolder === 'all'
                          ? 'Try another search, tag or status.'
                          : 'Move an existing activity here or create a new one.'
                        : 'Create the first curated activity manually or import a lesson generated with the Sblocco AI authoring kit.'}
                    </p>
                    {!items.length ? (
                      <Link to={newActivityHref} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white">
                        <Plus className="h-4 w-4" /> Create first activity
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!loading && filtered.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((item) => {
                    const currentFolder = folders.find((folder) => folder.id === item.folder_id);
                    return (
                      <article
                        key={item.id}
                        draggable
                        onDragStart={(event) => {
                          setDraggedDraftId(item.id);
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', item.id);
                        }}
                        onDragEnd={() => { setDraggedDraftId(''); setDragOverFolder(''); }}
                        className={`flex min-h-64 flex-col rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm transition dark:border-white/10 dark:bg-white/[0.03] ${draggedDraftId === item.id ? 'opacity-45' : ''}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide ${statusClass(item.status)}`}>{item.status}</span>
                          <span className="rounded-full bg-linen px-2.5 py-1 text-[0.65rem] font-black text-ink/55 dark:bg-white/[0.06] dark:text-white/55">{item.level}</span>
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[0.65rem] font-black text-orange-800 dark:bg-orange-300/[0.07] dark:text-orange-100">{originLabel(item.origin)}</span>
                        </div>

                        <div className="mt-4 min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5 text-[0.65rem] font-black text-ink/40 dark:text-white/40">
                            {item.folder_id ? <Folder className="h-3.5 w-3.5 shrink-0" /> : <Inbox className="h-3.5 w-3.5 shrink-0" />}
                            <span className="truncate">{currentFolder?.name || 'Unfiled'}</span>
                          </div>
                          <p className="mt-2 text-[0.65rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">{item.activity_type?.replaceAll('_', ' ') || 'activity'}</p>
                          <h3 className="mt-1 text-xl font-black leading-tight text-ink dark:text-white">{item.internal_title || 'Untitled activity'}</h3>
                          {item.learner_title ? <p className="mt-2 text-sm font-bold text-ink/65 dark:text-white/65">{item.learner_title}</p> : null}
                          <p className="mt-3 text-xs font-semibold text-ink/45 dark:text-white/45">{item.topic || 'Topic not set'}{item.updated_at ? ` · Updated ${updatedLabel(item.updated_at)}` : ''}</p>
                          {Array.isArray(item.tags) && item.tags.length ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {item.tags.slice(0, 5).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setSelectedTag(tag)}
                                  className="focus-ring rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black text-ink/55 hover:text-orange-700 dark:bg-white/[0.06] dark:text-white/55 dark:hover:text-orange-200"
                                >
                                  {tag}
                                </button>
                              ))}
                              {item.tags.length > 5 ? <span className="px-1 py-1 text-[0.65rem] font-black text-ink/30 dark:text-white/30">+{item.tags.length - 5}</span> : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4 dark:border-white/10">
                          <Link to={`/admin/content/exercises/studio?draft=${item.id}`} className="focus-ring rounded-full bg-ink px-3.5 py-2 text-xs font-black text-white dark:bg-orange-400 dark:text-surface-950">Edit</Link>
                          <Link to={`/admin/content/exercises/studio?draft=${item.id}`} target="_blank" rel="noreferrer" className="focus-ring rounded-full border border-ink/10 px-3.5 py-2 text-xs font-black text-ink dark:border-white/10 dark:text-white">Preview</Link>
                          <button
                            type="button"
                            disabled={exportingId === item.id}
                            onClick={() => exportJson(item)}
                            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3.5 py-2 text-xs font-black text-ink disabled:opacity-35 dark:border-white/10 dark:text-white"
                          >
                            <Download className="h-3.5 w-3.5" /> {exportingId === item.id ? 'Exporting' : 'Export JSON'}
                          </button>
                          {item.status === 'published' && item.exercise_id ? (
                            <button type="button" onClick={() => setAssignItem(item)} className="focus-ring rounded-full border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-black text-orange-900 dark:border-orange-300/30 dark:bg-orange-300/[0.07] dark:text-orange-100">Assign</button>
                          ) : null}

                          <details className="relative">
                            <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-ink/10 px-3 py-2 text-xs font-black text-ink/55 dark:border-white/10 dark:text-white/55">
                              <MoveRight className="h-3.5 w-3.5" /> Move
                            </summary>
                            <div className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-ink/10 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-surface-900">
                              <button
                                type="button"
                                onClick={(event) => {
                                  moveDraft(item.id, null, 'Unfiled');
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                }}
                                className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/65 hover:bg-linen dark:text-white/65 dark:hover:bg-white/[0.06]"
                              >
                                <Inbox className="h-3.5 w-3.5" /> Unfiled
                              </button>
                              {folders.map((folder) => (
                                <button
                                  key={folder.id}
                                  type="button"
                                  onClick={(event) => {
                                    moveDraft(item.id, folder.id, folder.name);
                                    event.currentTarget.closest('details')?.removeAttribute('open');
                                  }}
                                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/65 hover:bg-linen dark:text-white/65 dark:hover:bg-white/[0.06]"
                                >
                                  <Folder className="h-3.5 w-3.5" /> <span className="truncate">{folder.name}</span>
                                </button>
                              ))}
                            </div>
                          </details>

                          {item.status !== 'archived' ? (
                            <button type="button" disabled={archivingId === item.id} onClick={() => archive(item)} className="focus-ring ml-auto rounded-full px-3 py-2 text-xs font-black text-red-700 disabled:opacity-30 dark:text-red-200">Archive</button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </main>
          </div>
        </div>
      </section>

      {assignItem?.exercise_id ? (
        <StudioQuickAssignPanel
          exerciseId={assignItem.exercise_id}
          activityTitle={assignItem.learner_title || assignItem.internal_title || 'Sblocco activity'}
          onClose={() => setAssignItem(null)}
          onAssigned={({ learner, group, result, mode }) => {
            setNotice(
              mode === 'group'
                ? `Assigned ${assignItem.internal_title || 'activity'} to ${group?.name || 'group'} · ${result?.assignment_count || 0} learner assignments created.`
                : `Assigned ${assignItem.internal_title || 'activity'} to ${learner?.display_name || learner?.email || 'learner'}.`
            );
          }}
        />
      ) : null}
    </>
  );
}

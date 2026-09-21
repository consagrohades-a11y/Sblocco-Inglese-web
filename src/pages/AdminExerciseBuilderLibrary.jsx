import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileJson2,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  Inbox,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import StudioQuickAssignPanel from '../components/admin/exercise-studio/StudioQuickAssignPanel.jsx';
import {
  archiveStudioDraft,
  bulkPatchStudioDraftTags,
  listStudioDrafts,
  loadStudioDraft,
  setStudioDraftPinned,
} from '../lib/exerciseStudioDraftApi.js';
import {
  downloadStudioActivitiesZip,
  downloadStudioActivityJson,
} from '../lib/exerciseStudioExport.js';
import {
  bulkMoveStudioDraftsToFolder,
  createStudioFolder,
  deleteStudioFolder,
  listStudioFolders,
  moveStudioDraftToFolder,
  updateStudioFolder,
} from '../lib/exerciseStudioFolderApi.js';

const STATUS_OPTIONS = [
  ['all', 'All'],
  ['draft', 'Drafts'],
  ['published', 'Published'],
  ['archived', 'Archived'],
];

const SORT_OPTIONS = [
  ['recent', 'Recently edited'],
  ['published', 'Recently published'],
  ['newest', 'Newest created'],
  ['az', 'A–Z'],
  ['za', 'Z–A'],
  ['level', 'Level'],
];

const LEVELS = ['A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed'];
const LEVEL_ORDER = Object.fromEntries(LEVELS.map((level, index) => [level, index]));

const ACTIVITY_TYPES = [
  ['exercise', 'Exercise'],
  ['lesson', 'Lesson'],
  ['mini_course', 'Mini-course'],
  ['listening_lesson', 'Listening lesson'],
  ['assessment', 'Assessment'],
];

const ORIGINS = [
  ['manual', 'Manual'],
  ['ai_import', 'AI / JSON import'],
  ['duplicate', 'Duplicated'],
];

function statusClass(status) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200';
  if (status === 'archived') return 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/60';
  return 'bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100';
}

function originLabel(origin) {
  return ORIGINS.find(([value]) => value === origin)?.[1] || 'Manual';
}

function activityTypeLabel(type) {
  return ACTIVITY_TYPES.find(([value]) => value === type)?.[1] || String(type || 'Activity').replaceAll('_', ' ');
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

const FOLDER_COLORS = [
  { key: 'sand', label: 'Sand', hex: '#A88F6A' },
  { key: 'orange', label: 'Orange', hex: '#E76524' },
  { key: 'navy', label: 'Navy', hex: '#35536A' },
  { key: 'coral', label: 'Coral', hex: '#D95D59' },
  { key: 'gold', label: 'Gold', hex: '#C58A18' },
  { key: 'blue', label: 'Blue', hex: '#3A6EA5' },
  { key: 'rose', label: 'Rose', hex: '#B65C7A' },
];

function folderColor(colorKey) {
  return FOLDER_COLORS.find((color) => color.key === colorKey) || FOLDER_COLORS[0];
}

function childFolders(folders, parentId) {
  return folders
    .filter((folder) => (folder.parent_id || null) === (parentId || null))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function folderDescendantIds(folders, folderId) {
  const descendants = new Set();
  const queue = [folderId];

  while (queue.length) {
    const parentId = queue.shift();
    for (const folder of folders) {
      if (folder.parent_id === parentId && !descendants.has(folder.id)) {
        descendants.add(folder.id);
        queue.push(folder.id);
      }
    }
  }

  return descendants;
}

function folderPath(folders, folderId) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path = [];
  const seen = new Set();
  let current = byId.get(folderId);

  while (current && !seen.has(current.id)) {
    path.unshift(current);
    seen.add(current.id);
    current = current.parent_id ? byId.get(current.parent_id) : null;
  }

  return path;
}

function folderPathLabel(folders, folderId) {
  return folderPath(folders, folderId).map((folder) => folder.name).join(' › ');
}

function folderRecursiveCount(items, folders, folderId) {
  const ids = folderDescendantIds(folders, folderId);
  ids.add(folderId);
  return items.filter((item) => item.folder_id && ids.has(item.folder_id)).length;
}

function sortItems(items, sort) {
  const rows = [...items];

  rows.sort((a, b) => {
    if (sort === 'published') {
      return String(b.last_published_at || '').localeCompare(String(a.last_published_at || ''))
        || String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
    }
    if (sort === 'newest') {
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    }
    if (sort === 'az') {
      return String(a.internal_title || a.learner_title || '').localeCompare(String(b.internal_title || b.learner_title || ''));
    }
    if (sort === 'za') {
      return String(b.internal_title || b.learner_title || '').localeCompare(String(a.internal_title || a.learner_title || ''));
    }
    if (sort === 'level') {
      return (LEVEL_ORDER[a.level] ?? 999) - (LEVEL_ORDER[b.level] ?? 999)
        || String(a.internal_title || '').localeCompare(String(b.internal_title || ''));
    }
    return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
  });

  return rows;
}

function optionLabel(options, value) {
  return options.find(([key]) => key === value)?.[1] || value;
}

export default function AdminExerciseBuilderLibrary() {
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [selectedFolder, setSelectedFolder] = useState('root');
  const [selectedTag, setSelectedTag] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [assignItem, setAssignItem] = useState(null);
  const [archivingId, setArchivingId] = useState('');
  const [exportingId, setExportingId] = useState('');
  const [pinningId, setPinningId] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('orange');
  const [renamingFolderId, setRenamingFolderId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('sand');
  const [editFolderParent, setEditFolderParent] = useState('root');
  const [folderBusy, setFolderBusy] = useState(false);
  const [draggedDraftId, setDraggedDraftId] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState('');
  const [bulkTagValue, setBulkTagValue] = useState('');

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

  useEffect(() => {
    setSelectedIds([]);
  }, [status, selectedFolder, selectedTag, levelFilter, typeFilter, originFilter, search]);

  const availableTags = useMemo(() => (
    [...new Set(items.flatMap((item) => Array.isArray(item.tags) ? item.tags : []))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  ), [items]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();

    const rows = items.filter((item) => {
      if (status !== 'all' && item.status !== status) return false;

      if (selectedFolder === 'pinned') {
        if (!item.pinned_at) return false;
      } else if (selectedFolder === 'root') {
        if (!needle && item.folder_id) return false;
      } else if (item.folder_id !== selectedFolder) {
        return false;
      }

      if (levelFilter !== 'all' && item.level !== levelFilter) return false;
      if (typeFilter !== 'all' && item.activity_type !== typeFilter) return false;
      if (originFilter !== 'all' && item.origin !== originFilter) return false;

      const tags = Array.isArray(item.tags) ? item.tags : [];
      if (selectedTag !== 'all' && !tags.some((tag) => tag.toLocaleLowerCase() === selectedTag.toLocaleLowerCase())) return false;

      if (!needle) return true;
      const haystack = [
        item.internal_title,
        item.learner_title,
        item.topic,
        item.level,
        item.activity_type,
        originLabel(item.origin),
        ...tags,
      ].filter(Boolean).join(' ').toLocaleLowerCase();

      return haystack.includes(needle);
    });

    return sortItems(rows, sort);
  }, [
    items,
    status,
    selectedFolder,
    selectedTag,
    levelFilter,
    typeFilter,
    originFilter,
    search,
    sort,
  ]);

  const counts = useMemo(() => ({
    all: items.length,
    draft: items.filter((item) => item.status === 'draft').length,
    published: items.filter((item) => item.status === 'published').length,
    archived: items.filter((item) => item.status === 'archived').length,
  }), [items]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedSet.has(item.id)),
    [items, selectedSet],
  );
  const selectedTags = useMemo(() => (
    [...new Set(selectedItems.flatMap((item) => Array.isArray(item.tags) ? item.tags : []))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  ), [selectedItems]);

  const activeFilterCount = [levelFilter, typeFilter, originFilter].filter((value) => value !== 'all').length;
  const currentFolder = !['root', 'pinned'].includes(selectedFolder)
    ? folders.find((folder) => folder.id === selectedFolder) || null
    : null;
  const currentPath = currentFolder ? folderPath(folders, currentFolder.id) : [];
  const visibleFolders = selectedFolder === 'root'
    ? childFolders(folders, null)
    : currentFolder
      ? childFolders(folders, currentFolder.id)
      : [];
  const folderOptions = folders
    .map((folder) => ({ ...folder, path_label: folderPathLabel(folders, folder.id) || folder.name }))
    .sort((a, b) => a.path_label.localeCompare(b.path_label));
  const folderQuery = currentFolder ? `&folder=${encodeURIComponent(currentFolder.id)}` : '';
  const newActivityHref = `/admin/content/exercises/studio?${folderQuery ? folderQuery.slice(1) : ''}`;
  const importHref = `/admin/content/exercises/studio?import=1${folderQuery}`;
  const isGlobalSearch = selectedFolder === 'root' && Boolean(search.trim());
  const selectedFolderLabel = selectedFolder === 'pinned'
    ? 'Pinned activities'
    : isGlobalSearch
      ? 'Search results'
      : currentFolder
        ? currentFolder.name
        : 'Unfiled';
  const pinnedCount = items.filter((item) => Boolean(item.pinned_at)).length;
  const unfiledCount = items.filter((item) => !item.folder_id).length;

  function clearContentFilters() {
    setSelectedTag('all');
    setLevelFilter('all');
    setTypeFilter('all');
    setOriginFilter('all');
  }

  function toggleSelected(id) {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    ));
  }

  function selectAllVisible() {
    setSelectedIds(filtered.map((item) => item.id));
  }

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

  async function exportSelected() {
    if (!selectedIds.length || bulkBusy) return;
    setBulkBusy('export');
    setError('');
    try {
      const drafts = await Promise.all(selectedIds.map((id) => loadStudioDraft(id)));
      downloadStudioActivitiesZip(
        drafts.map((draft) => draft.document),
        'sblocco-learning-activities.zip',
      );
      setNotice(`${drafts.length} ${drafts.length === 1 ? 'activity' : 'activities'} exported as one ZIP.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not export the selected activities.');
    } finally {
      setBulkBusy('');
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

  async function archiveSelected() {
    const archiveable = selectedItems.filter((item) => item.status !== 'archived');
    if (!archiveable.length || bulkBusy) return;
    if (!window.confirm(`Archive ${archiveable.length} selected ${archiveable.length === 1 ? 'activity' : 'activities'}?`)) return;

    setBulkBusy('archive');
    setError('');
    try {
      await Promise.all(archiveable.map((item) => archiveStudioDraft(item.id)));
      const ids = new Set(archiveable.map((item) => item.id));
      setItems((current) => current.map((item) => ids.has(item.id) ? { ...item, status: 'archived' } : item));
      setSelectedIds([]);
      setNotice(`${archiveable.length} ${archiveable.length === 1 ? 'activity' : 'activities'} archived.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not archive all selected activities.');
      await load();
    } finally {
      setBulkBusy('');
    }
  }

  async function togglePinned(item) {
    if (pinningId) return;
    setPinningId(item.id);
    setError('');
    try {
      const pinned = !item.pinned_at;
      const result = await setStudioDraftPinned(item.id, pinned);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, pinned_at: result.pinned_at } : row));
      setNotice(pinned ? 'Activity pinned.' : 'Activity unpinned.');
    } catch (nextError) {
      setError(nextError.message || 'Could not update this pin.');
    } finally {
      setPinningId('');
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

  async function moveSelected(folderId, folderName = 'Unfiled') {
    if (!selectedIds.length || bulkBusy) return;
    setBulkBusy('move');
    setError('');
    try {
      const moved = await bulkMoveStudioDraftsToFolder(selectedIds, folderId);
      const byId = new Map(moved.map((row) => [row.id, row]));
      setItems((current) => current.map((item) => {
        const row = byId.get(item.id);
        return row ? { ...item, folder_id: row.folder_id, updated_at: row.updated_at } : item;
      }));
      setSelectedIds([]);
      setNotice(`${moved.length} ${moved.length === 1 ? 'activity' : 'activities'} moved to ${folderName}.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not move the selected activities.');
    } finally {
      setBulkBusy('');
    }
  }

  async function addTagToSelected(event) {
    event.preventDefault();
    const tag = bulkTagValue.trim();
    if (!tag || !selectedIds.length || bulkBusy) return;

    setBulkBusy('tag');
    setError('');
    try {
      const changed = await bulkPatchStudioDraftTags(selectedIds, { add: [tag] });
      const byId = new Map(changed.map((row) => [row.id, row]));
      setItems((current) => current.map((item) => {
        const row = byId.get(item.id);
        return row ? { ...item, tags: Array.isArray(row.tags) ? row.tags : [], updated_at: row.updated_at } : item;
      }));
      setBulkTagValue('');
      setNotice(`Tag “${tag}” added to ${changed.length} ${changed.length === 1 ? 'activity' : 'activities'}.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not add the tag.');
    } finally {
      setBulkBusy('');
    }
  }

  async function removeTagFromSelected(tag) {
    if (!tag || !selectedIds.length || bulkBusy) return;
    setBulkBusy('tag');
    setError('');
    try {
      const changed = await bulkPatchStudioDraftTags(selectedIds, { remove: [tag] });
      const byId = new Map(changed.map((row) => [row.id, row]));
      setItems((current) => current.map((item) => {
        const row = byId.get(item.id);
        return row ? { ...item, tags: Array.isArray(row.tags) ? row.tags : [], updated_at: row.updated_at } : item;
      }));
      if (selectedTag.toLocaleLowerCase() === tag.toLocaleLowerCase()) setSelectedTag('all');
      setNotice(`Tag “${tag}” removed from the selected activities.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not remove the tag.');
    } finally {
      setBulkBusy('');
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
        moveDraft(
          draggedDraftId || event.dataTransfer.getData('text/plain'),
          folderId === 'unfiled' ? null : folderId,
          folderName,
        );
      },
    };
  }

  function folderTileClass(active, dragActive = false) {
    if (dragActive) {
      return 'border-orange-400 bg-orange-50 text-orange-950 ring-2 ring-orange-100 dark:bg-orange-300/10 dark:text-orange-100 dark:ring-orange-300/10';
    }
    if (active) {
      return 'border-ink bg-ink text-white shadow-sm dark:border-orange-400 dark:bg-orange-400 dark:text-surface-950';
    }
    return 'border-ink/10 bg-white text-ink hover:border-orange-200 hover:bg-orange-50/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-orange-300/25 dark:hover:bg-orange-300/[0.04]';
  }

  return (
    <>
      <SEO
        title="Learning Studio Library | Sblocco Inglese"
        description="Organise, search, edit, publish and assign Sblocco learning activities."
      />

      <section className="min-h-screen bg-[#f7f3eb] py-6 dark:bg-surface-950 lg:py-8">
        <div className="mx-auto max-w-[92rem] px-4 sm:px-6">
          <header className="overflow-visible rounded-[2rem] border border-ink/10 bg-[#fbf8f1] shadow-sm dark:border-white/10 dark:bg-white/[0.025]">
            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">Sblocco Learning Studio</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-ink dark:text-white sm:text-4xl">Your learning library</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
                  Find, organise and reuse activities without touching technical metadata.
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
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, topic, level, tag..."
                    className="focus-ring w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
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

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((current) => !current)}
                      className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black ${
                        filtersOpen || activeFilterCount
                          ? 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-300/30 dark:bg-orange-300/[0.08] dark:text-orange-100'
                          : 'border-ink/10 bg-white text-ink/65 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65'
                      }`}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
                    </button>

                    {filtersOpen ? (
                      <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ink/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-surface-900">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Filter activities</p>
                          {activeFilterCount ? (
                            <button type="button" onClick={() => { setLevelFilter('all'); setTypeFilter('all'); setOriginFilter('all'); }} className="text-[0.68rem] font-black text-orange-700 dark:text-orange-300">
                              Clear
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-3 grid gap-3">
                          <label className="grid gap-1.5 text-xs font-black text-ink/55 dark:text-white/55">
                            Level
                            <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="focus-ring rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-bold text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
                              <option value="all">All levels</option>
                              {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-1.5 text-xs font-black text-ink/55 dark:text-white/55">
                            Activity type
                            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="focus-ring rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-bold text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
                              <option value="all">All types</option>
                              {ACTIVITY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-1.5 text-xs font-black text-ink/55 dark:text-white/55">
                            Origin
                            <select value={originFilter} onChange={(event) => setOriginFilter(event.target.value)} className="focus-ring rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-bold text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
                              <option value="all">All origins</option>
                              {ORIGINS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <label className="relative inline-flex items-center">
                    <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-ink/35 dark:text-white/35" />
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                      className="focus-ring appearance-none rounded-full border border-ink/10 bg-white py-2 pl-8 pr-8 text-xs font-black text-ink/65 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65"
                      aria-label="Sort activities"
                    >
                      {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink/35 dark:text-white/35" />
                  </label>
                </div>
              </div>

              {(selectedTag !== 'all' || activeFilterCount) ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-ink/10 pt-3 dark:border-white/10">
                  <span className="mr-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">Active</span>
                  {selectedTag !== 'all' ? (
                    <button type="button" onClick={() => setSelectedTag('all')} className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1.5 text-[0.68rem] font-black text-orange-900 dark:bg-orange-300/10 dark:text-orange-100">
                      Tag: {selectedTag} <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {levelFilter !== 'all' ? (
                    <button type="button" onClick={() => setLevelFilter('all')} className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-linen px-2.5 py-1.5 text-[0.68rem] font-black text-ink/60 dark:bg-white/[0.06] dark:text-white/60">
                      {levelFilter} <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {typeFilter !== 'all' ? (
                    <button type="button" onClick={() => setTypeFilter('all')} className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-linen px-2.5 py-1.5 text-[0.68rem] font-black text-ink/60 dark:bg-white/[0.06] dark:text-white/60">
                      {optionLabel(ACTIVITY_TYPES, typeFilter)} <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {originFilter !== 'all' ? (
                    <button type="button" onClick={() => setOriginFilter('all')} className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-linen px-2.5 py-1.5 text-[0.68rem] font-black text-ink/60 dark:bg-white/[0.06] dark:text-white/60">
                      {originLabel(originFilter)} <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  <button type="button" onClick={clearContentFilters} className="ml-1 text-[0.68rem] font-black text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white">
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}
          {notice ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">{notice}</div> : null}

          <section className="mt-5 rounded-[1.6rem] border border-ink/10 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.025] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Folders</p>
                <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">Choose a workspace, or drag an activity onto a folder.</p>
              </div>
              <button
                type="button"
                onClick={() => setNewFolderOpen((current) => !current)}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3.5 py-2 text-xs font-black text-ink/65 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65"
              >
                <FolderPlus className="h-3.5 w-3.5" /> New folder
              </button>
            </div>

            {newFolderOpen ? (
              <form onSubmit={createFolder} className="mt-3 flex flex-col gap-2 rounded-2xl bg-linen/45 p-3 dark:bg-white/[0.04] sm:flex-row">
                <input
                  autoFocus
                  maxLength={80}
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  placeholder="Folder name"
                  className="focus-ring min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-bold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setNewFolderOpen(false); setNewFolderName(''); }} className="focus-ring rounded-full px-3 py-2 text-xs font-black text-ink/45 dark:text-white/45">Cancel</button>
                  <button type="submit" disabled={folderBusy || !newFolderName.trim()} className="focus-ring rounded-full bg-ink px-4 py-2 text-xs font-black text-white disabled:opacity-35 dark:bg-orange-400 dark:text-surface-950">Create</button>
                </div>
              </form>
            ) : null}

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <button type="button" onClick={() => setSelectedFolder('all')} className={`focus-ring flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-left transition ${folderTileClass(selectedFolder === 'all')}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-current/5"><FolderOpen className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">All activities</span>
                  <span className="mt-1 block text-xs font-bold opacity-55">{folderCount(items, 'all')} activities</span>
                </span>
              </button>

              <button type="button" onClick={() => setSelectedFolder('pinned')} className={`focus-ring flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-left transition ${folderTileClass(selectedFolder === 'pinned')}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-current/5"><Star className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">Pinned</span>
                  <span className="mt-1 block text-xs font-bold opacity-55">{folderCount(items, 'pinned')} favourites</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFolder('unfiled')}
                {...folderDropProps('unfiled', 'Unfiled')}
                className={`focus-ring flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-left transition ${folderTileClass(selectedFolder === 'unfiled', dragOverFolder === 'unfiled')}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-current/5"><Inbox className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">Unfiled</span>
                  <span className="mt-1 block text-xs font-bold opacity-55">{folderCount(items, 'unfiled')} activities</span>
                </span>
              </button>

              {folders.map((folder) => {
                const active = selectedFolder === folder.id;
                const dragActive = dragOverFolder === folder.id;

                if (renamingFolderId === folder.id) {
                  return (
                    <form key={folder.id} onSubmit={(event) => { event.preventDefault(); saveFolderName(folder.id); }} className="min-h-24 rounded-2xl border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-300/20 dark:bg-orange-300/[0.06]">
                      <input
                        autoFocus
                        maxLength={80}
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-2.5 py-2 text-xs font-bold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                      />
                      <div className="mt-2 flex justify-end gap-1">
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
                    className={`group relative min-h-24 rounded-2xl border transition ${folderTileClass(active, dragActive)}`}
                  >
                    <button type="button" onClick={() => setSelectedFolder(folder.id)} className="focus-ring flex h-full min-h-24 w-full items-center gap-3 p-4 pr-16 text-left">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-current/5"><Folder className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">{folder.name}</span>
                        <span className="mt-1 block text-xs font-bold opacity-55">{folderCount(items, folder.id)} activities</span>
                      </span>
                    </button>
                    <div className="absolute right-2 top-2 flex gap-0.5 opacity-55 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => { setRenamingFolderId(folder.id); setRenameValue(folder.name); }}
                        className="focus-ring grid h-7 w-7 place-items-center rounded-lg bg-white/75 text-ink/45 hover:text-ink dark:bg-surface-950/50 dark:text-white/45 dark:hover:text-white"
                        aria-label={`Rename ${folder.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFolder(folder)}
                        className="focus-ring grid h-7 w-7 place-items-center rounded-lg bg-white/75 text-red-600/65 hover:text-red-700 dark:bg-surface-950/50 dark:text-red-200/65 dark:hover:text-red-200"
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
              <p className="mt-3 text-xs font-bold text-orange-800 dark:text-orange-200">Drop the activity onto Unfiled or a custom folder.</p>
            ) : null}
          </section>

          {availableTags.length ? (
            <section className="mt-4 rounded-[1.4rem] border border-ink/10 bg-white/65 px-4 py-3 dark:border-white/10 dark:bg-white/[0.025]">
              <button
                type="button"
                onClick={() => setTagsOpen((current) => !current)}
                className="focus-ring flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-ink/55 dark:text-white/55">Tags</span>
                  <span className="rounded-full bg-linen px-2 py-0.5 text-[0.65rem] font-black text-ink/40 dark:bg-white/[0.06] dark:text-white/40">{availableTags.length}</span>
                  {!tagsOpen && selectedTag !== 'all' ? (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[0.65rem] font-black normal-case tracking-normal text-orange-900 dark:bg-orange-300/10 dark:text-orange-100">{selectedTag}</span>
                  ) : null}
                </span>
                <ChevronDown className={`h-4 w-4 text-ink/35 transition dark:text-white/35 ${tagsOpen ? 'rotate-180' : ''}`} />
              </button>

              {tagsOpen ? (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink/10 pt-3 dark:border-white/10">
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
            </section>
          ) : null}

          <main className="mt-5 min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Current view</p>
                <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{selectedFolderLabel}</h2>
              </div>
              <div className="flex items-center gap-3">
                {filtered.length ? (
                  <button type="button" onClick={selectAllVisible} className="focus-ring text-xs font-black text-ink/45 hover:text-ink dark:text-white/45 dark:hover:text-white">
                    Select all visible
                  </button>
                ) : null}
                <p className="text-xs font-semibold text-ink/45 dark:text-white/45">{filtered.length} {filtered.length === 1 ? 'activity' : 'activities'}</p>
              </div>
            </div>

            {selectedIds.length ? (
              <div className="sticky top-3 z-30 mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-[#fffdf8]/95 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-surface-900/95">
                <div className="mr-1 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-orange-500 text-white"><Check className="h-3.5 w-3.5" /></span>
                  <span className="text-sm font-black text-ink dark:text-white">{selectedIds.length} selected</span>
                </div>

                <details className="relative">
                  <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-black text-ink/65 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65">
                    <MoveRight className="h-3.5 w-3.5" /> Move
                  </summary>
                  <div className="absolute left-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-ink/10 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-surface-900">
                    <button type="button" onClick={(event) => { moveSelected(null, 'Unfiled'); event.currentTarget.closest('details')?.removeAttribute('open'); }} className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/65 hover:bg-linen dark:text-white/65 dark:hover:bg-white/[0.06]">
                      <Inbox className="h-3.5 w-3.5" /> Unfiled
                    </button>
                    {folders.map((folder) => (
                      <button key={folder.id} type="button" onClick={(event) => { moveSelected(folder.id, folder.name); event.currentTarget.closest('details')?.removeAttribute('open'); }} className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/65 hover:bg-linen dark:text-white/65 dark:hover:bg-white/[0.06]">
                        <Folder className="h-3.5 w-3.5" /> <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                </details>

                <details className="relative">
                  <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-black text-ink/65 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65">
                    <Tag className="h-3.5 w-3.5" /> Add tag
                  </summary>
                  <form onSubmit={addTagToSelected} className="absolute left-0 top-full z-40 mt-2 flex w-72 gap-2 rounded-xl border border-ink/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-surface-900">
                    <input value={bulkTagValue} onChange={(event) => setBulkTagValue(event.target.value)} placeholder="Tag name" className="focus-ring min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
                    <button type="submit" disabled={!bulkTagValue.trim() || Boolean(bulkBusy)} className="focus-ring rounded-lg bg-ink px-3 py-2 text-xs font-black text-white disabled:opacity-35 dark:bg-orange-400 dark:text-surface-950">Add</button>
                  </form>
                </details>

                <details className="relative">
                  <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-black text-ink/65 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65">
                    <X className="h-3.5 w-3.5" /> Remove tag
                  </summary>
                  <div className="absolute left-0 top-full z-40 mt-2 max-h-72 w-60 overflow-y-auto rounded-xl border border-ink/10 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-surface-900">
                    {selectedTags.length ? selectedTags.map((tag) => (
                      <button key={tag} type="button" onClick={(event) => { removeTagFromSelected(tag); event.currentTarget.closest('details')?.removeAttribute('open'); }} className="focus-ring block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/65 hover:bg-linen dark:text-white/65 dark:hover:bg-white/[0.06]">
                        {tag}
                      </button>
                    )) : <p className="px-3 py-2 text-xs font-semibold text-ink/40 dark:text-white/40">No tags on the selected activities.</p>}
                  </div>
                </details>

                <button type="button" onClick={exportSelected} disabled={Boolean(bulkBusy)} className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-black text-ink/65 disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65">
                  <Download className="h-3.5 w-3.5" /> Export ZIP
                </button>

                <button type="button" onClick={archiveSelected} disabled={Boolean(bulkBusy)} className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black text-red-700 disabled:opacity-35 dark:text-red-200">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>

                <button type="button" onClick={() => setSelectedIds([])} className="focus-ring ml-auto inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-black text-ink/45 hover:text-ink dark:text-white/45 dark:hover:text-white">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/55 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">Loading Studio library...</div>
            ) : null}

            {!loading && filtered.length === 0 ? (
              <div className="mt-4 grid min-h-72 place-items-center rounded-[2rem] border border-dashed border-ink/15 bg-white/60 p-8 text-center dark:border-white/15 dark:bg-white/[0.025]">
                <div className="max-w-md">
                  <h3 className="text-2xl font-black text-ink dark:text-white">
                    {items.length ? 'Nothing matches this view.' : 'The library is clean and empty.'}
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
                    {items.length
                      ? 'Try another folder, search term, tag or filter.'
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
                  const selected = selectedSet.has(item.id);

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
                      className={`relative flex min-h-64 flex-col rounded-[1.5rem] border bg-white p-5 shadow-sm transition dark:bg-white/[0.03] ${
                        selected
                          ? 'border-orange-300 ring-2 ring-orange-100 dark:border-orange-300/30 dark:ring-orange-300/10'
                          : 'border-ink/10 dark:border-white/10'
                      } ${draggedDraftId === item.id ? 'opacity-45' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="focus-within:ring-2 focus-within:ring-orange-400/30 flex cursor-pointer items-center gap-2 rounded-lg">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelected(item.id)}
                            className="h-4 w-4 accent-orange-500"
                            aria-label={`Select ${item.internal_title || 'activity'}`}
                          />
                          <span className="sr-only">Select activity</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => togglePinned(item)}
                          disabled={pinningId === item.id}
                          className={`focus-ring grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-35 ${
                            item.pinned_at
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-300/10 dark:text-orange-200'
                              : 'text-ink/25 hover:bg-linen hover:text-orange-600 dark:text-white/25 dark:hover:bg-white/[0.06] dark:hover:text-orange-200'
                          }`}
                          aria-label={item.pinned_at ? 'Unpin activity' : 'Pin activity'}
                          title={item.pinned_at ? 'Unpin' : 'Pin'}
                        >
                          <Star className={`h-4 w-4 ${item.pinned_at ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide ${statusClass(item.status)}`}>{item.status}</span>
                        <span className="rounded-full bg-linen px-2.5 py-1 text-[0.65rem] font-black text-ink/55 dark:bg-white/[0.06] dark:text-white/55">{item.level}</span>
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[0.65rem] font-black text-orange-800 dark:bg-orange-300/[0.07] dark:text-orange-100">{originLabel(item.origin)}</span>
                      </div>

                      <div className="mt-4 min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5 text-[0.65rem] font-black text-ink/40 dark:text-white/40">
                          {item.folder_id ? <Folder className="h-3.5 w-3.5 shrink-0" /> : <Inbox className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{currentFolder?.name || 'Unfiled'}</span>
                        </div>
                        <p className="mt-2 text-[0.65rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">{activityTypeLabel(item.activity_type)}</p>
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
                        {item.status === 'published' && item.exercise_id ? (
                          <button type="button" onClick={() => setAssignItem(item)} className="focus-ring rounded-full border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-black text-orange-900 dark:border-orange-300/30 dark:bg-orange-300/[0.07] dark:text-orange-100">Assign</button>
                        ) : null}

                        <details className="relative ml-auto">
                          <summary className="focus-ring grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full border border-ink/10 text-ink/45 hover:text-ink dark:border-white/10 dark:text-white/45 dark:hover:text-white" aria-label="More actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </summary>
                          <div className="absolute bottom-full right-0 z-30 mb-2 w-60 overflow-hidden rounded-xl border border-ink/10 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-surface-900">
                            <button
                              type="button"
                              disabled={exportingId === item.id}
                              onClick={(event) => {
                                exportJson(item);
                                event.currentTarget.closest('details')?.removeAttribute('open');
                              }}
                              className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/65 hover:bg-linen disabled:opacity-35 dark:text-white/65 dark:hover:bg-white/[0.06]"
                            >
                              <Download className="h-3.5 w-3.5" /> Export JSON
                            </button>

                            <details className="group/move">
                              <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/65 hover:bg-linen dark:text-white/65 dark:hover:bg-white/[0.06]">
                                <MoveRight className="h-3.5 w-3.5" /> Move
                              </summary>
                              <div className="ml-5 border-l border-ink/10 pl-1 dark:border-white/10">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    moveDraft(item.id, null, 'Unfiled');
                                    event.currentTarget.closest('details')?.parentElement?.closest('details')?.removeAttribute('open');
                                  }}
                                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/55 hover:bg-linen dark:text-white/55 dark:hover:bg-white/[0.06]"
                                >
                                  <Inbox className="h-3.5 w-3.5" /> Unfiled
                                </button>
                                {folders.map((folder) => (
                                  <button
                                    key={folder.id}
                                    type="button"
                                    onClick={(event) => {
                                      moveDraft(item.id, folder.id, folder.name);
                                      event.currentTarget.closest('details')?.parentElement?.closest('details')?.removeAttribute('open');
                                    }}
                                    className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-ink/55 hover:bg-linen dark:text-white/55 dark:hover:bg-white/[0.06]"
                                  >
                                    <Folder className="h-3.5 w-3.5" /> <span className="truncate">{folder.name}</span>
                                  </button>
                                ))}
                              </div>
                            </details>

                            {item.status !== 'archived' ? (
                              <button
                                type="button"
                                disabled={archivingId === item.id}
                                onClick={(event) => {
                                  archive(item);
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                }}
                                className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-35 dark:text-red-200 dark:hover:bg-red-300/10"
                              >
                                <Archive className="h-3.5 w-3.5" /> Archive
                              </button>
                            ) : null}
                          </div>
                        </details>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </main>
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

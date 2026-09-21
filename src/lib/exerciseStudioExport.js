import { normalizeStudioDocument } from './exerciseStudioDocument.js';
import {
  STUDIO_AUTHORING_CONTRACT_VERSION,
  STUDIO_IMPORT_TEMPLATE_VERSION,
} from './exerciseStudioImport.js';

const SYSTEM_KEYS = new Set([
  'id',
  'internal_code',
  'slug',
  'status',
  'sequence_index',
  'client_key',
  'question_id',
  'question_version_id',
  'version',
  'version_number',
  'public_id',
  'diagnostics',
  'diagnostic_code',
  'storage_bucket',
  'storage_path',
  'uploaded_file_name',
  'uploaded_mime_type',
  'uploaded_size_bytes',
  'exercise_id',
  'current_version_id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'publication_map',
]);

function stripSystemFields(value) {
  if (Array.isArray(value)) return value.map(stripSystemFields);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SYSTEM_KEYS.has(key))
      .map(([key, entry]) => [key, stripSystemFields(entry)])
  );
}

function filenameToken(value) {
  return String(value || 'sblocco-activity')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sblocco-activity';
}

export function buildStudioActivityExport(rawDocument) {
  const normalized = normalizeStudioDocument(rawDocument).document;
  const activity = stripSystemFields(normalized);

  return {
    _template: {
      template_id: 'sblocco-learning-activity',
      template_version: STUDIO_IMPORT_TEMPLATE_VERSION,
      authoring_contract_version: STUDIO_AUTHORING_CONTRACT_VERSION,
    },
    activity,
  };
}

export function downloadStudioActivityJson(rawDocument) {
  if (typeof document === 'undefined') return null;

  const payload = buildStudioActivityExport(rawDocument);
  const json = JSON.stringify(payload, null, 2) + '\n';
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const normalized = normalizeStudioDocument(rawDocument).document;

  anchor.href = url;
  anchor.download = `${filenameToken(normalized.internal_title || normalized.learner_title)}.json`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return payload;
}

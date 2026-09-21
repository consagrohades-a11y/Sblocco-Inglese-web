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

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: ((date.getHours() & 0x1f) << 11)
      | ((date.getMinutes() & 0x3f) << 5)
      | ((Math.floor(date.getSeconds() / 2)) & 0x1f),
    date: (((year - 1980) & 0x7f) << 9)
      | (((date.getMonth() + 1) & 0x0f) << 5)
      | (date.getDate() & 0x1f),
  };
}

function concatBytes(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function uniqueExportFilename(document, usedNames) {
  const base = filenameToken(document.internal_title || document.learner_title);
  let name = `${base}.json`;
  let suffix = 2;
  while (usedNames.has(name)) {
    name = `${base}-${suffix}.json`;
    suffix += 1;
  }
  usedNames.add(name);
  return name;
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

export function buildStudioActivitiesZip(rawDocuments) {
  const documents = (rawDocuments || []).map((rawDocument) => normalizeStudioDocument(rawDocument).document);
  if (!documents.length) return new Uint8Array();

  const encoder = new TextEncoder();
  const usedNames = new Set();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const { time, date } = dosDateTime();

  documents.forEach((document) => {
    const filename = uniqueExportFilename(document, usedNames);
    const filenameBytes = encoder.encode(filename);
    const payload = buildStudioActivityExport(document);
    const dataBytes = encoder.encode(JSON.stringify(payload, null, 2) + '\n');
    const checksum = crc32(dataBytes);

    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, time);
    writeUint16(localView, 12, date);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, dataBytes.length);
    writeUint32(localView, 22, dataBytes.length);
    writeUint16(localView, 26, filenameBytes.length);
    writeUint16(localView, 28, 0);

    localParts.push(localHeader, filenameBytes, dataBytes);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, time);
    writeUint16(centralView, 14, date);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, dataBytes.length);
    writeUint32(centralView, 24, dataBytes.length);
    writeUint16(centralView, 28, filenameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);

    centralParts.push(centralHeader, filenameBytes);
    localOffset += localHeader.length + filenameBytes.length + dataBytes.length;
  });

  const localBytes = concatBytes(localParts);
  const centralBytes = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, documents.length);
  writeUint16(endView, 10, documents.length);
  writeUint32(endView, 12, centralBytes.length);
  writeUint32(endView, 16, localBytes.length);
  writeUint16(endView, 20, 0);

  return concatBytes([localBytes, centralBytes, end]);
}

function triggerBlobDownload(blob, filename) {
  if (typeof document === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadStudioActivityJson(rawDocument) {
  if (typeof document === 'undefined') return null;

  const payload = buildStudioActivityExport(rawDocument);
  const json = JSON.stringify(payload, null, 2) + '\n';
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const normalized = normalizeStudioDocument(rawDocument).document;

  triggerBlobDownload(
    blob,
    `${filenameToken(normalized.internal_title || normalized.learner_title)}.json`
  );

  return payload;
}

export function downloadStudioActivitiesZip(rawDocuments, filename = 'sblocco-activities.zip') {
  if (typeof document === 'undefined') return null;

  const zipBytes = buildStudioActivitiesZip(rawDocuments);
  const blob = new Blob([zipBytes], { type: 'application/zip' });
  triggerBlobDownload(blob, filename);
  return zipBytes;
}

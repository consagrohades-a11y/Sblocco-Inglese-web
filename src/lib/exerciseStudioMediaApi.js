import { supabase } from './supabaseClient.js';

export const STUDIO_CONTENT_MEDIA_BUCKET = 'exercise-content-media';
export const STUDIO_CONTENT_MEDIA_MAX_BYTES = 100 * 1024 * 1024;

function safeSegment(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || fallback;
}

function extensionFor(file) {
  const name = String(file?.name || '');
  const fromName = name.includes('.') ? name.split('.').pop()?.toLocaleLowerCase() : '';
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;

  const mime = String(file?.type || '').toLocaleLowerCase();
  const mimeExtensions = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
  };
  return mimeExtensions[mime] || 'bin';
}

function sourceTypeFor(file) {
  const mime = String(file?.type || '').toLocaleLowerCase();
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

function randomPart() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function uploadStudioContentMedia({ file, activityId, blockId }) {
  if (!file) throw new Error('Choose an audio or video file first.');

  const sourceType = sourceTypeFor(file);
  if (!sourceType) throw new Error('Studio media uploads must be audio or video files.');

  if (!Number(file.size) || Number(file.size) > STUDIO_CONTENT_MEDIA_MAX_BYTES) {
    throw new Error('Media files must be 100 MB or smaller.');
  }

  const activitySegment = safeSegment(activityId, 'activity');
  const blockSegment = safeSegment(blockId, 'block');
  const extension = extensionFor(file);
  const storagePath = [
    'studio',
    activitySegment,
    blockSegment,
    Date.now() + '-' + randomPart() + '.' + extension,
  ].join('/');

  const { data, error } = await supabase.storage
    .from(STUDIO_CONTENT_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) throw error;

  return {
    source_type: sourceType,
    storage_bucket: STUDIO_CONTENT_MEDIA_BUCKET,
    storage_path: data?.path || storagePath,
    uploaded_file_name: String(file.name || ''),
    uploaded_mime_type: String(file.type || ''),
    uploaded_size_bytes: Number(file.size) || null,
  };
}

export async function deleteStudioContentMedia(storageBucket, storagePath) {
  if (!storagePath) return;
  if (storageBucket !== STUDIO_CONTENT_MEDIA_BUCKET) return;

  const { error } = await supabase.storage
    .from(STUDIO_CONTENT_MEDIA_BUCKET)
    .remove([storagePath]);

  if (error) throw error;
}

import React, { useEffect, useMemo, useState } from 'react';
import { Headphones, Video } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient.js';

function youtubeId(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) return url.pathname.replace(/^\//, '').split('/')[0] || null;
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null;
      return url.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}

function withMediaFragment(url, startSeconds, endSeconds) {
  if (!url) return '';
  const start = Number(startSeconds) > 0 ? Number(startSeconds) : 0;
  const end = Number(endSeconds) > start ? Number(endSeconds) : null;
  if (!start && !end) return url;
  return url + '#t=' + start + (end ? ',' + end : '');
}

export default function ExerciseMediaBlock({ content = {}, disabled = false }) {
  const media = content.media || {};
  const [signedUrl, setSignedUrl] = useState('');
  const [error, setError] = useState('');
  const sourceType = ['audio', 'video', 'youtube'].includes(media.source_type) ? media.source_type : 'audio';

  useEffect(() => {
    let active = true;
    setError('');
    setSignedUrl('');

    if (!media.storage_path || !media.storage_bucket) return undefined;

    supabase.storage
      .from(media.storage_bucket)
      .createSignedUrl(media.storage_path, 3600)
      .then(({ data, error: storageError }) => {
        if (!active) return;
        if (storageError) {
          setError('Non è stato possibile caricare il file multimediale.');
          return;
        }
        setSignedUrl(data?.signedUrl || '');
      });

    return () => { active = false; };
  }, [media.storage_bucket, media.storage_path]);

  const directUrl = signedUrl || media.url || '';
  const playableUrl = useMemo(
    () => withMediaFragment(directUrl, media.start_seconds, media.end_seconds),
    [directUrl, media.start_seconds, media.end_seconds],
  );
  const showTranscript = media.transcript
    && (media.transcript_visibility === 'always'
      || (media.transcript_visibility === 'after_submit' && disabled));

  const ytId = sourceType === 'youtube' ? youtubeId(directUrl) : null;
  const start = Math.max(0, Number(media.start_seconds) || 0);
  const end = Number(media.end_seconds) > start ? Number(media.end_seconds) : null;
  const youtubeParams = [
    start ? 'start=' + Math.floor(start) : '',
    end ? 'end=' + Math.floor(end) : '',
    'rel=0',
  ].filter(Boolean).join('&');

  return (
    <div className="grid gap-4">
      {sourceType === 'youtube' && ytId ? (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-black shadow-sm dark:border-white/10">
          <div className="aspect-video">
            <iframe
              className="h-full w-full"
              src={'https://www.youtube-nocookie.com/embed/' + ytId + '?' + youtubeParams}
              title={content.heading || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}

      {sourceType === 'video' && playableUrl ? (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-black shadow-sm dark:border-white/10">
          <video controls preload="metadata" src={playableUrl} className="w-full">
            Il browser non supporta questo video.
          </video>
        </div>
      ) : null}

      {sourceType === 'audio' && playableUrl ? (
        <div className="rounded-2xl border border-ink/10 bg-linen/35 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-ink dark:text-white">
            <Headphones className="h-4 w-4" aria-hidden="true" />
            <span>{content.heading || 'Ascolta'}</span>
          </div>
          <audio controls preload="metadata" src={playableUrl} className="w-full">
            Il browser non supporta questo audio.
          </audio>
        </div>
      ) : null}

      {sourceType === 'youtube' && directUrl && !ytId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
          <Video className="mr-2 inline h-4 w-4" aria-hidden="true" />
          URL YouTube non riconosciuto.
        </div>
      ) : null}

      {!directUrl && !error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
          File multimediale non disponibile.
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">
          {error}
        </p>
      ) : null}

      {showTranscript ? (
        <details className="rounded-xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]" open={media.transcript_visibility === 'always'}>
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-ink/65 dark:text-white/65">
            Trascrizione
          </summary>
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/80 dark:text-white/80">{media.transcript}</p>
        </details>
      ) : null}
    </div>
  );
}

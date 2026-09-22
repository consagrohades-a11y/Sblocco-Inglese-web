import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Dices,
  ExternalLink,
  Eye,
  EyeOff,
  MessageCircleMore,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import LearnerAvatar from '../learner/LearnerAvatar.jsx';
import { connectSpeakingControl } from '../../lib/speakingLiveControl.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normaliseItem(item) {
  if (typeof item === 'string') {
    return { text: item, student_support: '', challenge: '', teacher_note: '' };
  }
  return {
    text: item?.text || '',
    student_support: item?.student_support || item?.support || '',
    challenge: item?.challenge || '',
    teacher_note: item?.teacher_note || '',
  };
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export default function SpeakingLiveController({ session, onEnd }) {
  const [remoteState, setRemoteState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const channelRef = useRef(null);
  const disconnectTimerRef = useRef(null);

  const currentItem = useMemo(() => {
    const sourceIndex = Number(remoteState?.sourceIndex);
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0) return null;
    const raw = asArray(session?.activity?.prompts)[sourceIndex];
    return raw == null ? null : normaliseItem(raw);
  }, [remoteState?.sourceIndex, session?.activity?.prompts]);

  useEffect(() => {
    if (!session?.controlId) return undefined;

    const connection = connectSpeakingControl(session.controlId, (payload) => {
      if (!payload) return;

      if (payload.type === 'presenter-closed') {
        setConnected(false);
        return;
      }
      if (payload.type !== 'presenter-state') return;

      setRemoteState(payload.state || null);
      setConnected(true);
      if (disconnectTimerRef.current) window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = window.setTimeout(() => setConnected(false), 6500);
    });

    channelRef.current = connection;

    function requestSync() {
      connection.send({ type: 'sync-request' });
    }

    requestSync();
    const syncTimer = window.setInterval(requestSync, 4000);

    return () => {
      window.clearInterval(syncTimer);
      if (disconnectTimerRef.current) window.clearTimeout(disconnectTimerRef.current);
      connection.close();
      channelRef.current = null;
    };
  }, [session?.controlId]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = window.setInterval(() => setTimerSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  function command(type) {
    channelRef.current?.send({ type });
  }

  function focusStudentWindow() {
    if (session?.studentWindow && !session.studentWindow.closed) {
      session.studentWindow.focus();
      return;
    }
    if (session?.presenterUrl) {
      window.open(
        session.presenterUrl,
        session.windowName || 'sblocco-speaking-live',
        'popup=yes,width=1320,height=860,resizable=yes,scrollbars=yes',
      );
    }
  }

  function endSession() {
    command('close-presenter');
    try {
      if (session?.studentWindow && !session.studentWindow.closed) session.studentWindow.close();
    } catch {
      // The controller can still close even if the popup cannot.
    }
    onEnd?.();
  }

  if (!session) return null;

  const learnerName = session.learner?.display_name || session.learner?.email || '';
  const position = remoteState?.total
    ? `${Number(remoteState.position || 0)} / ${Number(remoteState.total || 0)}`
    : '—';

  return (
    <aside className={`fixed bottom-4 right-4 z-[145] w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-ink/15 bg-paper shadow-2xl dark:border-white/15 dark:bg-surface-950 sm:w-[28rem]`}>
      <header className="flex items-center gap-3 border-b border-ink/10 px-4 py-3 dark:border-white/10">
        <LearnerAvatar
          avatarKey={session.learner?.avatar_key}
          backgroundKey={session.learner?.avatar_background_key}
          displayName={learnerName}
          size="sm"
          eager
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} aria-hidden="true" />
            <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-ink/50 dark:text-white/50">
              {connected ? 'Student screen connected' : 'Connecting…'}
            </p>
          </div>
          <p className="mt-0.5 truncate text-sm font-black">{session.activity?.title}</p>
        </div>
        <button type="button" onClick={() => setCollapsed((value) => !value)} className="focus-ring min-h-9 rounded-full border border-ink/10 px-3 text-xs font-black dark:border-white/10">
          {collapsed ? 'Apri' : 'Riduci'}
        </button>
        <button type="button" onClick={endSession} className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-ink/10 dark:border-white/10" aria-label="Termina controllo live">
          <X className="h-4 w-4" />
        </button>
      </header>

      {!collapsed ? (
        <div className="max-h-[72vh] overflow-y-auto p-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink p-4 text-white">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/50">Working with</p>
              <p className="mt-1 truncate text-lg font-black">{learnerName || 'Generic presentation'}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/50">Item</p>
              <p className="mt-1 text-lg font-black">{position}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" disabled={!connected || !remoteState?.total} onClick={() => command('previous')} className="focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-ink/15 bg-white text-xs font-black disabled:opacity-35 dark:border-white/15 dark:bg-white/[0.05]">
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
            <button type="button" disabled={!connected || Number(remoteState?.total || 0) < 2} onClick={() => command('random')} className="focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-ink/15 bg-white text-xs font-black disabled:opacity-35 dark:border-white/15 dark:bg-white/[0.05]">
              <Dices className="h-4 w-4" /> Random
            </button>
            <button type="button" disabled={!connected || !remoteState?.total} onClick={() => command('next')} className="focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-ink text-xs font-black text-white disabled:opacity-35 dark:bg-clay">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!connected || !remoteState?.hasSupport}
              onClick={() => command('toggle-support')}
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-ink/15 px-3 text-xs font-black disabled:opacity-35 dark:border-white/15"
            >
              {remoteState?.supportVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {remoteState?.supportVisible ? 'Hide support' : 'Show support'}
            </button>
            <button
              type="button"
              disabled={!connected || !remoteState?.hasChallenge}
              onClick={() => command('toggle-challenge')}
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-ink/15 px-3 text-xs font-black disabled:opacity-35 dark:border-white/15"
            >
              <Sparkles className="h-4 w-4" />
              {remoteState?.challengeVisible ? 'Hide challenge' : 'Reveal challenge'}
            </button>
          </div>

          <section className="mt-4 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-surface-900">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-ink/45 dark:text-white/45">Current prompt</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-black leading-6">{currentItem?.text || (connected ? 'Item non disponibile.' : 'Attendo la finestra studente…')}</p>

            {currentItem?.teacher_note ? (
              <div className="mt-3 rounded-xl border border-clay/20 bg-blush/35 p-3 dark:border-coral/20 dark:bg-coral/[0.06]">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-clay dark:text-coral">Teacher note</p>
                <p className="mt-1.5 whitespace-pre-wrap text-xs font-bold leading-5">{currentItem.teacher_note}</p>
              </div>
            ) : null}

            {currentItem?.challenge ? (
              <p className="mt-3 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55"><strong>Challenge:</strong> {currentItem.challenge}</p>
            ) : null}

            {session.activity?.teacher_notes ? (
              <div className="mt-3 border-t border-ink/10 pt-3 dark:border-white/10">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-ink/40 dark:text-white/40">Activity notes</p>
                <p className="mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">{session.activity.teacher_notes}</p>
              </div>
            ) : null}
          </section>

          <section className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-surface-900">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Lesson timer</p>
              <p className="mt-1 font-mono text-xl font-black">{formatTimer(timerSeconds)}</p>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setTimerRunning((value) => !value)} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-ink/15 dark:border-white/15" aria-label={timerRunning ? 'Pausa timer' : 'Avvia timer'}>
                {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-ink/15 dark:border-white/15" aria-label="Azzera timer">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </section>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={focusStudentWindow} className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-xs font-black dark:border-white/15 dark:bg-white/[0.05]">
              <ExternalLink className="h-4 w-4" /> Student screen
            </button>
            <button type="button" onClick={endSession} className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-clay/25 px-4 text-xs font-black text-clay dark:border-coral/25 dark:text-coral">
              <Square className="h-3.5 w-3.5" /> End live
            </button>
          </div>

          <p className="mt-3 flex items-start gap-2 text-[0.68rem] font-semibold leading-5 text-ink/45 dark:text-white/45">
            <MessageCircleMore className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Note e soluzioni restano solo in questo controller. La finestra studente riceve esclusivamente i comandi di navigazione e reveal.
          </p>
        </div>
      ) : null}
    </aside>
  );
}

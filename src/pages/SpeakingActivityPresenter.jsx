import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Dices, Sparkles } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import LearnerAvatar from '../components/learner/LearnerAvatar.jsx';
import SpeakingPromptContent from '../components/speaking/SpeakingPromptContent.jsx';
import { connectSpeakingControl } from '../lib/speakingLiveControl.js';
import { loadAdminLearnerDetail } from '../lib/adminLearnersApi.js';
import {
  finishSpeakingSession,
  loadSpeakingActivity,
  loadSpeakingItemHistory,
  recordSpeakingItem,
  startSpeakingSession,
} from '../lib/adminSpeakingActivitiesApi.js';

const LEVELS = ['A1','A2','B1','B2','C1','C2'];
const RECENT_ITEM_DAYS = 60;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normaliseHistoryText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normaliseItem(item, fallbackLevels = [], sourceIndex = null) {
  if (typeof item === 'string') {
    return {
      text: item,
      levels: fallbackLevels,
      student_support: '',
      challenge: '',
      sourceIndex,
      historyKey: normaliseHistoryText(item),
    };
  }
  const text = item?.text || '';
  return {
    text,
    levels: asArray(item?.levels).length ? asArray(item.levels) : fallbackLevels,
    student_support: item?.student_support || item?.support || '',
    challenge: item?.challenge || '',
    sourceIndex,
    historyKey: normaliseHistoryText(text),
  };
}

function PromptBody({ item, style }) {
  if (style === 'odd_one_out') {
    const choices = item.text.split('·').map((part) => part.trim()).filter(Boolean);
    if (choices.length > 1) {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {choices.map((choice, index) => (
            <div key={`${choice}-${index}`} className="grid min-h-28 place-items-center rounded-2xl border border-white/15 bg-white/[0.07] p-5 text-center text-2xl font-black sm:text-3xl">
              {choice}
            </div>
          ))}
        </div>
      );
    }
  }

  if (style === 'taboo') {
    const match = item.text.match(/^(.+?)\s*(?:\||—)\s*forbidden:\s*(.+)$/i);
    if (match) {
      const forbidden = match[2].split(',').map((word) => word.trim()).filter(Boolean);
      return (
        <div>
          <p className="text-center text-4xl font-black sm:text-6xl">{match[1].trim()}</p>
          <div className="mt-8">
            <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-white/55">Do not say</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {forbidden.map((word) => <span key={word} className="rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-sm font-black">{word}</span>)}
            </div>
          </div>
        </div>
      );
    }
  }

  if (style === 'repair') {
    return (
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Original line</p>
        <p className="mt-4 text-3xl font-black leading-tight sm:text-5xl">{item.text}</p>
      </div>
    );
  }

  if (style === 'story') {
    return (
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Story seed</p>
        <p className="mt-4 text-3xl font-black leading-tight sm:text-5xl">{item.text}</p>
      </div>
    );
  }

  return <p className="text-3xl font-black leading-tight sm:text-5xl">{item.text}</p>;
}

export default function SpeakingActivityPresenter() {
  const { activityId } = useParams();
  const [searchParams] = useSearchParams();
  const [activity, setActivity] = useState(null);
  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [challengeVisible, setChallengeVisible] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [itemHistory, setItemHistory] = useState([]);
  const [historyReady, setHistoryReady] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const shownThisSessionRef = useRef(new Set());
  const controlConnectionRef = useRef(null);
  const presenterStateRef = useRef(null);

  const learnerId = searchParams.get('learner') || '';
  const controlId = searchParams.get('control') || '';

  function postStateToController(payload) {
    if (!controlId || !window.opener || window.opener.closed) return;
    try {
      window.opener.postMessage({
        source: 'sblocco-speaking-control',
        controlId,
        payload,
      }, window.location.origin);
    } catch {
      // BroadcastChannel/localStorage remain available as fallback.
    }
  }

  const selectedLevels = useMemo(() => {
    const requested = String(searchParams.get('levels') || '')
      .split(',')
      .map((level) => level.trim().toUpperCase())
      .filter((level) => LEVELS.includes(level));
    return Array.from(new Set(requested));
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await loadSpeakingActivity(activityId);
        if (active) setActivity(data);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Non è stato possibile aprire la presentazione.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [activityId]);

  useEffect(() => {
    let active = true;
    let openedSessionId = '';

    shownThisSessionRef.current = new Set();
    setSessionId('');
    setItemHistory([]);

    if (!learnerId) {
      setLearner(null);
      setHistoryReady(true);
      return () => { active = false; };
    }

    setHistoryReady(false);

    async function prepareLearnerSession() {
      try {
        const [learnerData, history] = await Promise.all([
          loadAdminLearnerDetail(learnerId),
          loadSpeakingItemHistory(learnerId, activityId, RECENT_ITEM_DAYS),
        ]);

        if (!active) return;

        setLearner(learnerData);
        setItemHistory(history);

        if (learnerData) {
          try {
            openedSessionId = await startSpeakingSession({
              learnerId,
              activityId,
              levels: selectedLevels,
            });
            if (active) setSessionId(openedSessionId);
          } catch (sessionError) {
            console.warn('Speaking session history could not be started.', sessionError);
          }
        }
      } catch (loadError) {
        if (active) {
          setLearner(null);
          setItemHistory([]);
          console.warn('Speaking learner history could not be loaded.', loadError);
        }
      } finally {
        if (active) setHistoryReady(true);
      }
    }

    prepareLearnerSession();

    return () => {
      active = false;
      if (openedSessionId) finishSpeakingSession(openedSessionId).catch(() => {});
    };
  }, [activityId, learnerId, selectedLevels.join(',')]);

  const items = useMemo(() => {
    if (!activity) return [];

    const historyByText = new Map(
      asArray(itemHistory).map((entry) => [normaliseHistoryText(entry.item_text), entry]),
    );

    const eligible = asArray(activity.prompts)
      .map((item, sourceIndex) => normaliseItem(item, asArray(activity.levels), sourceIndex))
      .filter((item) => !selectedLevels.length || asArray(item.levels).some((level) => selectedLevels.includes(level)))
      .map((item) => ({
        ...item,
        priorUse: historyByText.get(item.historyKey) || null,
      }));

    if (!learnerId || !historyReady) return eligible;

    return [...eligible].sort((left, right) => {
      const leftRecent = Number(left.priorUse?.recent_use_count || 0) > 0;
      const rightRecent = Number(right.priorUse?.recent_use_count || 0) > 0;
      if (leftRecent !== rightRecent) return leftRecent ? 1 : -1;

      const leftSeen = Boolean(left.priorUse);
      const rightSeen = Boolean(right.priorUse);
      if (leftSeen !== rightSeen) return leftSeen ? 1 : -1;

      if (!leftSeen && !rightSeen) return left.sourceIndex - right.sourceIndex;

      const leftTime = new Date(left.priorUse?.last_used_at || 0).getTime();
      const rightTime = new Date(right.priorUse?.last_used_at || 0).getTime();
      return leftTime - rightTime;
    });
  }, [activity, historyReady, itemHistory, learnerId, selectedLevels]);

  useEffect(() => {
    setIndex(0);
    setChallengeVisible(false);
    setSupportVisible(false);
  }, [activityId, historyReady, learnerId, selectedLevels.join(',')]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === 'ArrowRight' && items.length) goNext();
      if (event.key === 'ArrowLeft' && items.length) goPrevious();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [items.length]);

  const current = items[index] || items[0] || null;

  useEffect(() => {
    if (!sessionId || !current?.text || !historyReady) return;

    const key = current.historyKey || normaliseHistoryText(current.text);
    if (!key || shownThisSessionRef.current.has(key)) return;

    shownThisSessionRef.current.add(key);
    recordSpeakingItem({
      sessionId,
      itemText: current.text,
      itemIndex: current.sourceIndex,
    }).catch((recordError) => {
      shownThisSessionRef.current.delete(key);
      console.warn('Speaking item history could not be recorded.', recordError);
    });
  }, [current?.historyKey, current?.sourceIndex, current?.text, historyReady, sessionId]);

  function goNext() {
    if (!items.length) return;
    setIndex((currentIndex) => (currentIndex + 1) % items.length);
    setChallengeVisible(false);
    setSupportVisible(false);
  }

  function goPrevious() {
    if (!items.length) return;
    setIndex((currentIndex) => (currentIndex - 1 + items.length) % items.length);
    setChallengeVisible(false);
    setSupportVisible(false);
  }

  function chooseRandomIndex() {
    if (items.length < 2) return;

    setIndex((currentIndex) => {
      const candidates = items
        .map((item, itemIndex) => ({
          item,
          itemIndex,
          shown: shownThisSessionRef.current.has(item.historyKey),
          recent: Number(item.priorUse?.recent_use_count || 0) > 0,
        }))
        .filter((candidate) => candidate.itemIndex !== currentIndex);

      const freshUnseen = candidates.filter((candidate) => !candidate.shown && !candidate.recent);
      const unseen = candidates.filter((candidate) => !candidate.shown);
      const pool = freshUnseen.length ? freshUnseen : unseen.length ? unseen : candidates;
      const next = pool[Math.floor(Math.random() * pool.length)];
      return next?.itemIndex ?? currentIndex;
    });

    setChallengeVisible(false);
    setSupportVisible(false);
  }

  const presenterState = useMemo(() => ({
    activityId,
    position: items.length ? index + 1 : 0,
    total: items.length,
    sourceIndex: current?.sourceIndex ?? null,
    challengeVisible,
    supportVisible,
    hasChallenge: Boolean(current?.challenge),
    hasSupport: Boolean(current?.student_support),
  }), [
    activityId,
    challengeVisible,
    current?.challenge,
    current?.sourceIndex,
    current?.student_support,
    index,
    items.length,
    supportVisible,
  ]);

  useEffect(() => {
    presenterStateRef.current = presenterState;
    if (controlId && controlConnectionRef.current) {
      const payload = { type: 'presenter-state', state: presenterState };
      controlConnectionRef.current.send(payload);
      postStateToController(payload);
    }
  }, [controlId, presenterState]);

  useEffect(() => {
    if (!controlId) return undefined;

    let connection = null;

    function sendPresenterState() {
      if (!presenterStateRef.current) return;
      const payload = { type: 'presenter-state', state: presenterStateRef.current };
      connection?.send(payload);
      postStateToController(payload);
    }

    function handleControlPayload(payload) {
      if (!payload?.type) return;

      if (payload.type === 'next' && items.length) {
        setIndex((currentIndex) => (currentIndex + 1) % items.length);
        setChallengeVisible(false);
        setSupportVisible(false);
      } else if (payload.type === 'previous' && items.length) {
        setIndex((currentIndex) => (currentIndex - 1 + items.length) % items.length);
        setChallengeVisible(false);
        setSupportVisible(false);
      } else if (payload.type === 'random' && items.length > 1) {
        setIndex((currentIndex) => {
          const candidates = items
            .map((item, itemIndex) => ({
              item,
              itemIndex,
              shown: shownThisSessionRef.current.has(item.historyKey),
              recent: Number(item.priorUse?.recent_use_count || 0) > 0,
            }))
            .filter((candidate) => candidate.itemIndex !== currentIndex);
          const freshUnseen = candidates.filter((candidate) => !candidate.shown && !candidate.recent);
          const unseen = candidates.filter((candidate) => !candidate.shown);
          const pool = freshUnseen.length ? freshUnseen : unseen.length ? unseen : candidates;
          return pool[Math.floor(Math.random() * pool.length)]?.itemIndex ?? currentIndex;
        });
        setChallengeVisible(false);
        setSupportVisible(false);
      } else if (payload.type === 'toggle-support') {
        setSupportVisible((value) => !value);
      } else if (payload.type === 'toggle-challenge') {
        setChallengeVisible((value) => !value);
      } else if (payload.type === 'sync-request') {
        sendPresenterState();
      } else if (payload.type === 'close-presenter') {
        window.close();
      }
    }

    connection = connectSpeakingControl(controlId, handleControlPayload);
    controlConnectionRef.current = connection;

    function onDirectMessage(event) {
      if (event.origin !== window.location.origin) return;
      const envelope = event.data;
      if (envelope?.source !== 'sblocco-speaking-control' || envelope.controlId !== controlId) return;
      handleControlPayload(envelope.payload);
    }

    window.addEventListener('message', onDirectMessage);

    sendPresenterState();

    return () => {
      const closedPayload = { type: 'presenter-closed' };
      connection.send(closedPayload);
      postStateToController(closedPayload);
      connection.close();
      window.removeEventListener('message', onDirectMessage);
      if (controlConnectionRef.current === connection) controlConnectionRef.current = null;
    };
  }, [controlId, items]);
  if (loading || (learnerId && !historyReady)) return <div className="min-h-screen bg-paper p-8 text-center text-sm font-black text-ink dark:bg-surface-950 dark:text-white">Preparing speaking session…</div>;
  if (error || !activity) return <div className="min-h-screen bg-paper p-8 text-center text-sm font-black text-red-800 dark:bg-surface-950 dark:text-red-200">{error || 'Activity not found.'}</div>;

  const steps = asArray(activity.student_steps);
  const language = asArray(activity.useful_language);
  const firstName = String(learner?.display_name || learner?.email || '').trim().split(/\\s+/)[0];

  return (
    <>
      <SEO title={`${activity.title} | Presentazione speaking`} description="Student-facing speaking activity." />
      <div className="min-h-screen bg-paper text-ink dark:bg-surface-950 dark:text-white lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden">
        <main className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:grid lg:h-full lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-4 lg:px-7 lg:py-4">
          <header className="border-b border-ink/10 pb-4 dark:border-white/10">
            {learner ? (
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-surface-900">
                <LearnerAvatar
                  avatarKey={learner.avatar_key}
                  backgroundKey={learner.avatar_background_key}
                  displayName={learner.display_name || learner.email}
                  size="md"
                  eager
                  className="ring-2 ring-paper dark:ring-surface-900"
                />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-clay dark:text-coral">Ready?</p>
                  <p className="mt-0.5 truncate text-lg font-black sm:text-xl">{firstName ? `${firstName}, let's play!` : "Let's play!"}</p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-clay dark:text-coral">Speaking activity</p>
                <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">{activity.title}</h1>
                {activity.student_intro ? <p className="mt-1.5 max-w-4xl text-sm font-semibold leading-5 text-ink/65 dark:text-white/65 lg:line-clamp-2">{activity.student_intro}</p> : null}
              </div>
              <div className="rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.05]">
                {items.length ? `${index + 1} / ${items.length}` : '0 / 0'}
              </div>
            </div>
          </header>

          {!items.length ? (
            <div className="mt-8 rounded-3xl border border-dashed border-ink/15 bg-white p-10 text-center dark:border-white/15 dark:bg-surface-900">
              <Sparkles className="mx-auto h-7 w-7 text-clay" />
              <p className="mt-3 text-lg font-black">No items match the selected level combination.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:min-h-0 lg:overflow-hidden xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
              <section className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
                <div className="flex min-h-[20rem] flex-col justify-center rounded-[2rem] bg-ink p-5 text-center text-white sm:p-7 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                  <div className="w-full"><SpeakingPromptContent item={current} style={activity.presenter_style} /></div>
                  {current.student_support && supportVisible ? (
                    <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.07] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-white/50">Need a little help?</p>
                      <p className="mt-2 text-base font-bold leading-7 sm:text-lg">{current.student_support}</p>
                    </div>
                  ) : null}
                </div>

                {current.challenge ? (
                  <div className="mt-3 shrink-0 rounded-2xl border border-ink/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-surface-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-ink/50 dark:text-white/50">Extra challenge</p>
                      <button type="button" onClick={() => setChallengeVisible((value) => !value)} className="focus-ring min-h-10 rounded-full border border-ink/15 px-4 text-xs font-black dark:border-white/15">
                        {challengeVisible ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    {challengeVisible ? <p className="mt-2 text-base font-black leading-6">{current.challenge}</p> : null}
                  </div>
                ) : null}
              </section>

              <aside className="grid content-start gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                {steps.length ? (
                  <section className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-surface-900">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-ink/50 dark:text-white/50">Your task</p>
                    <div className="mt-3 grid gap-2">
                      {steps.map((step, stepIndex) => (
                        <div key={`${stepIndex}-${step}`} className="flex gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-linen text-xs font-black dark:bg-white/10">{stepIndex + 1}</span>
                          <p className="pt-0.5 text-sm font-bold leading-6">{step}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {language.length ? (
                  <section className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-surface-900">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-ink/50 dark:text-white/50">Useful language</p>
                    <div className="mt-3 grid gap-1.5">
                      {language.map((phrase) => <div key={phrase} className="rounded-xl bg-linen/70 px-3 py-2 text-sm font-black leading-5 dark:bg-white/[0.06]">{phrase}</div>)}
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>
          )}

          <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-3 dark:border-white/10 lg:mt-0">
            <button type="button" disabled={!items.length} onClick={goPrevious} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-5 text-sm font-black disabled:opacity-30 dark:border-white/15 dark:bg-white/[0.05]"><ArrowLeft className="h-4 w-4" /> Previous</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={items.length < 2} onClick={chooseRandomIndex} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-5 text-sm font-black disabled:opacity-30 dark:border-white/15 dark:bg-white/[0.05]"><Dices className="h-4 w-4" /> Random</button>
              <button type="button" disabled={!items.length} onClick={goNext} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white disabled:opacity-30 dark:bg-clay">Next <ArrowRight className="h-4 w-4" /></button>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}

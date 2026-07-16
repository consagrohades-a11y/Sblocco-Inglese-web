import React, { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import AssessmentProfileResult from '../components/assessment/AssessmentProfileResult';
import { loadAssessmentResult, requestAssessmentFollowup } from '../lib/assessmentLeadsApi.js';

export default function AssessmentResult() {
  const { token } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followupRequested, setFollowupRequested] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await loadAssessmentResult(token);
        if (!data) throw new Error('Profilo non trovato o link non valido.');
        if (active) {
          setPayload(data);
          setFollowupRequested(Boolean(data.followup_requested));
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Non è stato possibile aprire il profilo.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [token]);

  async function followup(type) {
    await requestAssessmentFollowup(token, type);
    setFollowupRequested(true);
  }

  return (
    <>
      <SEO title="Il tuo Profilo Sblocco | Sblocco Inglese" description="Riapri il tuo profilo linguistico e il percorso consigliato." />
      <section className="min-h-[calc(100svh-68px)] bg-paper py-10 dark:bg-[#0f1715] sm:py-14">
        <div className="section-shell">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link to="/assessment" className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/15 dark:bg-white/[0.05] dark:text-white">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Torna al profilo gratuito
            </Link>
            <span className="inline-flex items-center gap-2 text-xs font-black text-ink/42 dark:text-white/42">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Link personale al risultato
            </span>
          </div>

          {loading ? (
            <div className="grid min-h-[55vh] place-items-center rounded-[2rem] border border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-center">
                <LoaderCircle aria-hidden="true" className="mx-auto h-9 w-9 animate-spin text-moss dark:text-mint" />
                <p className="mt-4 text-sm font-black text-ink dark:text-white">Sto aprendo il tuo profilo...</p>
              </div>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="mx-auto max-w-2xl rounded-[2rem] border border-red-200 bg-red-50 p-7 text-center text-red-950 dark:border-red-300/20 dark:bg-red-400/[0.08] dark:text-red-100">
              <h1 className="text-2xl font-black">Il link non è disponibile</h1>
              <p className="mt-3 text-sm font-semibold leading-7">{error}</p>
              <Link to="/assessment" className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white dark:bg-mint dark:text-ink">
                Crea un nuovo profilo
              </Link>
            </div>
          ) : null}

          {!loading && payload?.result ? (
            <AssessmentProfileResult
              result={payload.result}
              name={payload.full_name}
              token={token}
              onRequestFollowup={followup}
              followupRequested={followupRequested}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

import React, { useRef, useState } from 'react';
import { AlertTriangle, FileJson2, Upload, X } from 'lucide-react';
import { parseStudioImport } from '../../../lib/exerciseStudioImport.js';

export default function StudioJsonImportPanel({ onClose, onImport }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  function analyze(value = raw) {
    setError('');
    try {
      const result = parseStudioImport(value);
      setPreview(result);
      return result;
    } catch (nextError) {
      setPreview(null);
      setError(nextError.message || 'The JSON could not be imported.');
      return null;
    }
  }

  async function readFile(file) {
    if (!file) return;
    try {
      const value = await file.text();
      setRaw(value);
      analyze(value);
    } catch (nextError) {
      setError(nextError.message || 'Could not read this file.');
    }
  }

  function commitImport() {
    const result = preview || analyze();
    if (!result) return;
    onImport(result);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-ink/35 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Import JSON">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-ink/10 bg-[#fbf8f1] shadow-2xl dark:border-white/10 dark:bg-surface-950">
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">AI / JSON import</p>
            <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Import into Studio</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
              Sblocco will ignore AI-generated technical IDs, repair safe omissions, and keep incomplete blocks as a draft for you to edit.
            </p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-white text-ink/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60" aria-label="Close import">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-300/20 dark:bg-orange-300/[0.07]">
            <p className="text-sm font-black text-orange-950 dark:text-orange-100">Generate with AI first</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-orange-900/75 dark:text-orange-100/70">
              Download the JSON authoring kit and attach it to ChatGPT/Claude with your topic, level and source material. The instructions inside the file require the AI to return a downloadable .json file, not pasted JSON.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/templates/sblocco-learning-studio/universal-ai-authoring-kit-v1.json"
                download
                className="focus-ring rounded-full bg-orange-500 px-3.5 py-2 text-xs font-black text-white"
              >
                Download authoring JSON
              </a>
              <a
                href="/templates/sblocco-learning-studio/learning-activity-template-v1.json"
                download
                className="focus-ring rounded-full border border-ink/10 bg-white/70 px-3.5 py-2 text-xs font-black text-ink/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70"
              >
                Blank JSON
              </a>
            </div>
            <div className="mt-4 border-t border-orange-200/80 pt-3 dark:border-orange-300/15">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-orange-900/60 dark:text-orange-100/55">
                Gold-standard examples
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-orange-900/70 dark:text-orange-100/65">
                Use these to show the AI the depth and progression Sblocco expects — not as rigid templates.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href="/templates/sblocco-learning-studio/gold-benchmark-a1plus-a2-threshold-assessment-v1.json"
                  download
                  className="focus-ring rounded-full border border-orange-300 px-3.5 py-2 text-xs font-black text-orange-900 dark:border-orange-300/30 dark:text-orange-100"
                >
                  A1+ assessment
                </a>
                <a
                  href="/templates/sblocco-learning-studio/gold-benchmark-b2-listening-vocabulary-chunks-v1.json"
                  download
                  className="focus-ring rounded-full border border-orange-300 px-3.5 py-2 text-xs font-black text-orange-900 dark:border-orange-300/30 dark:text-orange-100"
                >
                  B2 listening + chunks
                </a>
                <a
                  href="/templates/sblocco-learning-studio/learning-activity-example-v1.json"
                  download
                  className="focus-ring rounded-full border border-ink/10 bg-white/70 px-3.5 py-2 text-xs font-black text-ink/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70"
                >
                  Short mixed example
                </a>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-xs font-black uppercase tracking-[0.1em] text-ink/55 dark:text-white/55">Paste JSON</label>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json,text/json"
                  className="hidden"
                  onChange={(event) => readFile(event.target.files?.[0])}
                />
                <button type="button" onClick={() => fileRef.current?.click()} className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-black text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
                  <Upload className="h-3.5 w-3.5" /> Upload .json
                </button>
              </div>
            </div>

            <textarea
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setPreview(null);
                setError('');
              }}
              rows={18}
              placeholder={'{\n  "_template": { ... },\n  "activity": { ... }\n}'}
              className="focus-ring min-h-[22rem] w-full resize-y rounded-2xl border border-ink/10 bg-white p-4 font-mono text-xs leading-6 text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />

            <button type="button" onClick={() => analyze()} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-black text-ink dark:border-white/15 dark:bg-white/[0.05] dark:text-white">
              <FileJson2 className="h-4 w-4" /> Check import
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">
              {error}
            </div>
          ) : null}

          {preview ? (
            <div className="mt-5 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.035]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">
                  {preview.ready_blocks} blocks ready
                </span>
                {preview.needs_attention_blocks ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900 dark:bg-amber-300/10 dark:text-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {preview.needs_attention_blocks} need attention
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-white/65">
                  {preview.repairs.length} automatic repairs
                </span>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.1em] text-ink/45 dark:text-white/45">Imported activity</p>
                <p className="mt-1 text-base font-black text-ink dark:text-white">{preview.document.internal_title || 'Untitled activity'}</p>
                <p className="mt-1 text-sm font-semibold text-ink/55 dark:text-white/55">{preview.document.level} · {preview.document.topic || 'topic missing'} · {preview.document.blocks.length} blocks</p>
              </div>

              {preview.errors.length ? (
                <div className="grid gap-1.5">
                  {preview.errors.slice(0, 8).map((item, index) => (
                    <p key={index} className="text-xs font-bold leading-5 text-amber-900 dark:text-amber-100">• {item.message}</p>
                  ))}
                  {preview.errors.length > 8 ? <p className="text-xs font-bold text-ink/45 dark:text-white/45">+ {preview.errors.length - 8} more</p> : null}
                </div>
              ) : (
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">The imported activity is already publishable.</p>
              )}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-ink/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-surface-900">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-ink/50 dark:text-white/50">
              Importing creates a normal Studio draft. You can change everything visually afterward.
            </p>
            <button
              type="button"
              onClick={commitImport}
              disabled={!raw.trim()}
              className="focus-ring shrink-0 rounded-full bg-ink px-5 py-2.5 text-xs font-black text-white disabled:opacity-30 dark:bg-orange-400 dark:text-surface-950"
            >
              Import to Studio
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

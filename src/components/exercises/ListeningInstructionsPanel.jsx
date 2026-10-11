import React from 'react';
import { CaptionsOff, FileText, Headphones, ListChecks } from 'lucide-react';

// No extra teacher-maintained fields: blank lines separate instructions,
// and a heading on its own line becomes a bold row title.
export function parseListeningInstructionRows(value) {
  return String(value || '').replace(/\r\n/g, '\n').split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim()).filter(Boolean)
    .map((paragraph) => {
      const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.length > 1 && lines[0].length <= 110) {
        return { title: lines[0], detail: lines.slice(1).join('\n') };
      }
      return { title: 'Listening focus', detail: paragraph };
    });
}

function InstructionRow({ icon: Icon, title, detail }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-50 text-[#ac4313] dark:bg-orange-300/10 dark:text-orange-200">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black leading-6 text-[#172d32] dark:text-white">{title}</p>
        {detail ? <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-[#5b6869] dark:text-white/65">{detail}</p> : null}
      </div>
    </div>
  );
}

/**
 * Shared guidance for Studio media and native listening activities.
 * Rules reflect whether the actual media has a transcript available.
 * It never reveals transcript contents and never promises a transcript if none exists.
 */
export default function ListeningInstructionsPanel({
  instructions = '', sourceType = 'audio', transcript = '', transcriptVisibility = 'after_submit',
  hasMedia = false, children,
}) {
  const custom = parseListeningInstructionRows(instructions);
  const combined = custom.map((row) => [row.title, row.detail].join(' ')).join(' ').toLowerCase();
  const video = sourceType === 'youtube' || sourceType === 'video';
  const transcriptProvided = Boolean(String(transcript || '').trim());
  const transcriptHidden = transcriptProvided && transcriptVisibility !== 'always';
  const subtitlesAlreadyCovered = /subtitles|captions|sottotitoli|\bcc\b/.test(combined);
  const transcriptAlreadyCovered = /transcript|trascrizion/.test(combined);
  const reminders = [];
  if (video && transcriptVisibility !== 'always' && !subtitlesAlreadyCovered) {
    reminders.push({ icon: CaptionsOff, title: 'Turn OFF subtitles (CC).', detail: 'Disattiva i sottotitoli prima di iniziare.' });
  }
  if (transcriptHidden && !transcriptAlreadyCovered) {
    reminders.push({
      icon: Headphones,
      title: 'Listen without reading the transcript.',
      detail: 'Focus on the main ideas first. You do not need to understand every unfamiliar word.',
    });
  }
  const rows = [...reminders, ...custom.map((item) => ({ ...item, icon: ListChecks }))];

  if (!hasMedia && !rows.length) return children || null;
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dcded9] bg-white shadow-sm dark:border-white/15 dark:bg-white/[0.035]">
      {hasMedia ? <div className="px-5 py-5 sm:px-6">{children}</div> : null}
      {rows.length ? (
        <div className={`${hasMedia ? 'border-t border-[#e5e7e3]' : ''} grid gap-5 px-5 py-5 sm:px-6 dark:border-white/10`}>
          {rows.map((row, index) => <InstructionRow key={index} icon={row.icon} title={row.title} detail={row.detail} />)}
        </div>
      ) : null}
      {transcriptHidden && transcriptVisibility === 'after_submit' ? (
        <div className="flex items-start gap-2 border-t border-[#e5e7e3] bg-[#faf7f2] px-5 py-3 text-xs font-semibold leading-5 text-[#65706d] dark:border-white/10 dark:bg-white/[0.025] dark:text-white/60 sm:px-6">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>The transcript is available after submitting the activity.</span>
        </div>
      ) : null}
    </section>
  );
}

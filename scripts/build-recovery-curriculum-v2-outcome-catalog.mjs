import crypto from 'node:crypto';
import fs from 'node:fs';

const YEAR_FILES = [1, 2, 3].map((year) => `content/recovery/curriculum-v2/years/year-${year}.json`);
const OUTPUT = 'supabase/migrations/20260813030000_recovery_curriculum_v2_outcome_catalog.sql';

const years = YEAR_FILES.map((path) => ({ path, json: JSON.parse(fs.readFileSync(path, 'utf8')) }));
const outcomes = years.flatMap(({ json }) => json.outcomes || []);
if (outcomes.length !== 63) throw new Error(`Expected 63 outcomes, found ${outcomes.length}`);
if (new Set(outcomes.map((outcome) => outcome.id)).size !== 63) throw new Error('Outcome IDs must be unique.');

for (const outcome of outcomes) {
  if (!['draft', 'approved'].includes(outcome.status)) throw new Error(`${outcome.id}: cannot promote status ${outcome.status}`);
  outcome.status = 'approved';
}

for (const { path, json } of years) {
  json.outcomes = json.outcomes.map((outcome) => outcomes.find((candidate) => candidate.id === outcome.id));
  fs.writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

const records = outcomes
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((outcome) => {
    const canonicalPayload = JSON.stringify(outcome);
    return {
      outcome_id: outcome.id,
      curriculum_id: 'recovery-years-1-3-v2',
      schema_version: 1,
      school_year_profile: outcome.school_year_profile,
      competence_axis: outcome.competence_axis,
      cefr_target: outcome.cefr_target,
      label_it: outcome.label_it,
      observable_outcome_it: outcome.observable_outcome_it,
      programme_requirement: outcome.programme_requirement,
      blocking_candidate: Boolean(outcome.blocking_candidate),
      status: outcome.status,
      source_payload: outcome,
      source_hash: crypto.createHash('sha256').update(canonicalPayload).digest('hex'),
    };
  });

const payload = JSON.stringify(records);
const sql = `-- Seed the reviewed Recovery Curriculum v2 outcome catalogue from source-controlled Year 1-3 files.\n-- This migration does not assign outcomes to enrollments and does not activate Readiness v2.\n\nwith source as (\n  select *\n  from jsonb_to_recordset($recovery_curriculum_v2$${payload}$recovery_curriculum_v2$::jsonb) as x(\n    outcome_id text,\n    curriculum_id text,\n    schema_version integer,\n    school_year_profile smallint,\n    competence_axis text,\n    cefr_target text,\n    label_it text,\n    observable_outcome_it text,\n    programme_requirement text,\n    blocking_candidate boolean,\n    status text,\n    source_payload jsonb,\n    source_hash text\n  )\n)\ninsert into public.recovery_curriculum_outcomes (\n  outcome_id, curriculum_id, schema_version, school_year_profile, competence_axis, cefr_target,\n  label_it, observable_outcome_it, programme_requirement, blocking_candidate, status, source_payload, source_hash\n)\nselect\n  outcome_id, curriculum_id, schema_version, school_year_profile, competence_axis, cefr_target,\n  label_it, observable_outcome_it, programme_requirement, blocking_candidate, status, source_payload, source_hash\nfrom source\non conflict (outcome_id) do update set\n  curriculum_id = excluded.curriculum_id,\n  schema_version = excluded.schema_version,\n  school_year_profile = excluded.school_year_profile,\n  competence_axis = excluded.competence_axis,\n  cefr_target = excluded.cefr_target,\n  label_it = excluded.label_it,\n  observable_outcome_it = excluded.observable_outcome_it,\n  programme_requirement = excluded.programme_requirement,\n  blocking_candidate = excluded.blocking_candidate,\n  status = excluded.status,\n  source_payload = excluded.source_payload,\n  source_hash = excluded.source_hash,\n  updated_at = now()\nwhere public.recovery_curriculum_outcomes.source_hash is distinct from excluded.source_hash;\n\ndo $$\ndeclare\n  v_total integer;\n  v_approved integer;\nbegin\n  select count(*), count(*) filter (where status = 'approved')\n    into v_total, v_approved\n  from public.recovery_curriculum_outcomes\n  where curriculum_id = 'recovery-years-1-3-v2';\n\n  if v_total <> 63 or v_approved <> 63 then\n    raise exception 'Recovery Curriculum v2 seed integrity failed: total %, approved %', v_total, v_approved;\n  end if;\nend;\n$$;\n\nnotify pgrst, 'reload schema';\n`;

fs.writeFileSync(OUTPUT, sql);
console.log(`Promoted ${records.length} outcomes to approved and generated ${OUTPUT}.`);

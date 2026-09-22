import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function read(path) {
  return fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

execFileSync(process.execPath, ['--check', 'api/speaking-items-generate.js'], { stdio: 'inherit' });

const endpoint = read('api/speaking-items-generate.js');
const guide = read('content/speaking-library/SPEAKING_ITEM_AUTHORING.md');
const panel = read('src/components/admin/SpeakingItemGeneratorPanel.jsx');
const editor = read('src/components/admin/SpeakingActivityEditorModal.jsx');
const page = read('src/pages/AdminSpeakingActivities.jsx');
const api = read('src/lib/adminSpeakingActivitiesApi.js');

assert.ok(endpoint.includes("openai/gpt-5.6-luna"), 'Speaking AI must use the approved low-cost default model.');
assert.ok(endpoint.includes("VERCEL_OIDC_TOKEN"), 'Speaking AI must support Vercel OIDC auth.');
assert.ok(endpoint.includes("AI_GATEWAY_API_KEY"), 'Speaking AI must retain an explicit local/server key fallback.');
assert.ok(endpoint.includes("/rest/v1/rpc/is_admin"), 'Speaking AI endpoint must verify admin access server-side.');
assert.ok(endpoint.includes("MAX_ITEMS_PER_REQUEST = 12"), 'Speaking AI must enforce the per-request item cap.');
assert.ok(endpoint.includes("Cache-Control', 'no-store"), 'Speaking AI responses must not be cached.');
assert.ok(endpoint.includes("existing_items_in_this_activity"), 'Speaking AI must compare against existing activity items.');
assert.ok(endpoint.includes("catalogue_digest_for_novelty"), 'Speaking AI must receive a cross-library novelty digest.');

assert.ok(guide.includes('Repeated words are not duplicates by themselves.'), 'Authoring guide must preserve context-aware duplicate rules.');
assert.ok(guide.includes('Context-aware novelty / duplicate policy'), 'Authoring guide must define novelty policy.');

assert.ok(panel.includes('Nessun nome, nota learner o dato dello studente viene inviato all’AI.'), 'Generator UI must state learner privacy boundary.');
assert.ok(panel.includes('analyseSpeakingItemSet'), 'Generated items must pass the local quality gate before acceptance.');
assert.ok(panel.includes('Aggiungi {selected.size || \'\'} al gioco'), 'Generated items must require explicit admin acceptance.');

assert.ok(editor.includes('Generate with AI'), 'Speaking activity editor must expose AI generation.');
assert.ok(editor.includes('openGenerator'), 'Speaking editor must support direct generator launch.');
assert.ok(page.includes('Genera nuovi item'), 'Speaking library cards must expose direct generation.');
assert.ok(api.includes("fetch('/api/speaking-items-generate'"), 'Client must call the server-side generation endpoint.');
assert.ok(api.includes('supabase.auth.getSession()'), 'Client must authenticate generation with the admin session.');

console.log('Speaking AI generation validation passed.');

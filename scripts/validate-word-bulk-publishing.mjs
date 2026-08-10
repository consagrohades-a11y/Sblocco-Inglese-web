import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  isCardPublishable,
  isCardReadyForApprovalAndPublishing,
} from '../src/lib/cardWorkflow.js';

const completePendingWord = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'review_needed',
  review_status: 'pending',
  lemma: 'prepare',
  accepted_answers: ['prepare'],
  pronunciation_ipa_us: '/prɪˈper/',
  example_1: 'I prepare before every lesson.',
  example_2: 'She prepared the report yesterday.',
  usage_note: 'Use it for getting something ready.',
};

assert.equal(isCardReadyForApprovalAndPublishing(completePendingWord, 'word'), true);
assert.equal(isCardPublishable(completePendingWord, 'word'), false);
assert.equal(isCardPublishable({ ...completePendingWord, review_status: 'approved' }, 'word'), true);
assert.equal(isCardReadyForApprovalAndPublishing({ ...completePendingWord, status: 'archived' }, 'word'), false);
assert.equal(isCardReadyForApprovalAndPublishing({ ...completePendingWord, example_2: '' }, 'word'), false);

const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260810120000_approve_and_publish_word_cards.sql', import.meta.url));
const migration = readFileSync(migrationPath, 'utf8');
assert.match(migration, /create or replace function public\.admin_approve_and_publish_word_cards\(p_card_ids uuid\[\]\)/i);
assert.match(migration, /set status = 'published',[\s\S]*review_status = 'approved',[\s\S]*review_decision = 'approve'/i);
assert.match(migration, /reviewed_by = auth\.uid\(\)/i);
assert.match(migration, /grant execute on function public\.admin_approve_and_publish_word_cards\(uuid\[\]\) to authenticated/i);

const pagePath = fileURLToPath(new URL('../src/pages/AdminWordTrainerContent.jsx', import.meta.url));
const page = readFileSync(pagePath, 'utf8');
assert.match(page, /supabase\.rpc\('admin_approve_and_publish_word_cards'/);
assert.match(page, /Approva e pubblica \(\$\{selectedForPublish\.length\}\)/);

console.log('Word bulk approval and publishing validation passed.');

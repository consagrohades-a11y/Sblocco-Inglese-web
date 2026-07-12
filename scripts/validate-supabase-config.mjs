import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { validateSupabaseConfig } from '../src/lib/supabaseConfig.js';

const safeConfig = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key',
};

const hasLocalConfig = Boolean(
  process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const config = validateSupabaseConfig(hasLocalConfig ? process.env : safeConfig);
const client = createClient(config.supabaseUrl, config.publishableKey);

assert.ok(client, 'Supabase client should be created.');
assert.equal(new URL(config.supabaseUrl).protocol, 'https:');
assert.ok(config.publishableKey, 'Publishable key should exist.');

assert.throws(
  () =>
    validateSupabaseConfig({
      ...safeConfig,
      VITE_SUPABASE_SERVICE_ROLE_KEY: 'not-used',
    }),
  /must not expose secret or service-role keys/,
);

assert.throws(
  () =>
    validateSupabaseConfig({
      VITE_SUPABASE_URL: 'not-a-url',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key',
    }),
  /Invalid VITE_SUPABASE_URL/,
);

console.log('Supabase browser configuration validation passed.');

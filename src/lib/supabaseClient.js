import { createClient } from '@supabase/supabase-js';
import { validateSupabaseConfig } from './supabaseConfig.js';

const { supabaseUrl, publishableKey } = validateSupabaseConfig(import.meta.env);

export const supabase = createClient(supabaseUrl, publishableKey);

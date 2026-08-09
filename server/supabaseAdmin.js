import { createClient } from '@supabase/supabase-js';

let adminClient;

export class ServerConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServerConfigurationError';
  }
}

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new ServerConfigurationError('Server Supabase credentials are not configured.');
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export function bearerToken(request) {
  const header = String(request.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

export async function authenticateRequest(request) {
  const token = bearerToken(request);
  if (!token) return { user: null, token: null, error: 'Authentication required.' };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { user: null, token, error: 'Invalid or expired session.' };
  return { user: data.user, token, error: null };
}


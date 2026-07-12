const REQUIRED_SUPABASE_ENV = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
];

const FORBIDDEN_SUPABASE_ENV_PATTERNS = [
  /SUPABASE.*SERVICE.*ROLE/i,
  /SUPABASE.*SECRET/i,
];

function redactValue(value) {
  if (!value) {
    return '<empty>';
  }

  return `${String(value).slice(0, 4)}...`;
}

export function validateSupabaseConfig(env) {
  const forbiddenKeys = Object.keys(env ?? {}).filter((key) =>
    FORBIDDEN_SUPABASE_ENV_PATTERNS.some((pattern) => pattern.test(key)),
  );

  if (forbiddenKeys.length > 0) {
    throw new Error(
      `Supabase configuration must not expose secret or service-role keys to the browser. Remove: ${forbiddenKeys.join(', ')}`,
    );
  }

  const missingKeys = REQUIRED_SUPABASE_ENV.filter((key) => !env?.[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Supabase environment variable${missingKeys.length > 1 ? 's' : ''}: ${missingKeys.join(', ')}. Add them to your local Vite env file.`,
    );
  }

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error(`Invalid VITE_SUPABASE_URL: ${redactValue(supabaseUrl)}`);
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Invalid VITE_SUPABASE_URL: expected an https URL.');
  }

  if (
    !publishableKey ||
    String(publishableKey).startsWith('sb_secret_') ||
    FORBIDDEN_SUPABASE_ENV_PATTERNS.some((pattern) => pattern.test(publishableKey))
  ) {
    throw new Error('Invalid VITE_SUPABASE_PUBLISHABLE_KEY.');
  }

  return {
    supabaseUrl,
    publishableKey,
  };
}

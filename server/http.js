export function sendJson(response, status, payload) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).json(payload);
}

export function allowMethods(request, response, methods) {
  if (methods.includes(request.method)) return true;
  response.setHeader('Allow', methods.join(', '));
  sendJson(response, 405, { error: 'Method not allowed', code: 'method_not_allowed' });
  return false;
}

export function requestOrigin(request) {
  const configured = String(process.env.PUBLIC_SITE_URL || '').trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      throw new Error('PUBLIC_SITE_URL must be a valid absolute URL.');
    }
  }

  const protocol = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(request.headers['x-forwarded-host'] || request.headers.host || '').split(',')[0].trim();
  if (!host) throw new Error('Unable to determine request origin.');
  return new URL(`${protocol}://${host}`).origin;
}

export function parseJsonBody(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object') return request.body;
  try {
    return JSON.parse(request.body);
  } catch {
    return {};
  }
}

export async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}


const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeUrl(value, fallback) {
  try {
    const url = new URL(value, fallback);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function resultEmailHtml({ name, profession, result, resultUrl }) {
  const dimensions = Array.isArray(result?.dimensions) ? result.dimensions : [];
  const recommendation = result?.recommendation || {};
  const dimensionHtml = dimensions.map((item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e6eee9;font-weight:700;color:#14221e;">${escapeHtml(item.label)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e6eee9;text-align:right;color:#0e7c66;font-weight:800;">${escapeHtml(item.level)} · ${Number(item.score || 0)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
  <html lang="it">
    <body style="margin:0;background:#f7f2e9;font-family:Arial,sans-serif;color:#14221e;">
      <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
        <div style="overflow:hidden;border-radius:28px;background:#111f1b;color:#fff;box-shadow:0 20px 50px rgba(17,31,27,.18);">
          <div style="padding:34px 30px;background:linear-gradient(135deg,#111f1b 0%,#173d33 100%);">
            <p style="margin:0;color:#81d7c0;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Il tuo Profilo Sblocco</p>
            <h1 style="margin:14px 0 0;font-size:34px;line-height:1.08;">${escapeHtml(name)}, ${escapeHtml(result?.primaryTitle || 'il tuo profilo è pronto')}</h1>
            <p style="margin:18px 0 0;color:rgba(255,255,255,.72);font-size:16px;line-height:1.7;">${escapeHtml(result?.primarySummary || '')}</p>
            ${profession ? `<p style="margin:18px 0 0;color:rgba(255,255,255,.48);font-size:13px;">Contesto: ${escapeHtml(profession)}</p>` : ''}
          </div>
          <div style="background:#fff;padding:28px 30px;color:#14221e;">
            <p style="margin:0 0 8px;color:#e86f51;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;">Le quattro aree</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">${dimensionHtml}</table>
            <div style="margin-top:26px;border-radius:20px;background:#e0f4ed;padding:22px;">
              <p style="margin:0;color:#0e7c66;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;">Percorso consigliato</p>
              <h2 style="margin:8px 0 0;font-size:26px;">${escapeHtml(recommendation.name || '')}</h2>
              <p style="margin:12px 0 0;color:#38554c;font-size:15px;line-height:1.7;">${escapeHtml(recommendation.reason || '')}</p>
              ${recommendation.price ? `<p style="margin:14px 0 0;font-weight:800;">${escapeHtml(recommendation.price)}</p>` : ''}
            </div>
            <a href="${escapeHtml(resultUrl)}" style="display:block;margin-top:24px;border-radius:999px;background:#0e7c66;color:#fff;padding:15px 20px;text-align:center;text-decoration:none;font-weight:800;">Apri il profilo completo</a>
            <p style="margin:20px 0 0;color:#71827c;font-size:12px;line-height:1.6;">Questo profilo orienta il percorso e non sostituisce una certificazione ufficiale del livello CEFR.</p>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ sent: false, error: 'Method not allowed' });
  }

  const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const profession = String(body.profession || '').trim().slice(0, 180);
  const resultToken = String(body.resultToken || '').trim();
  const elapsedMs = Number(body.elapsedMs || 0);
  const result = body.result && typeof body.result === 'object' ? body.result : null;

  if (body.website) return response.status(200).json({ sent: true });
  if (elapsedMs && elapsedMs < 3000) return response.status(400).json({ sent: false, error: 'Submission too fast' });
  if (name.length < 2 || !emailPattern.test(email) || !uuidPattern.test(resultToken) || !result) {
    return response.status(400).json({ sent: false, error: 'Invalid delivery payload' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return response.status(503).json({ sent: false, configurationRequired: true, error: 'Email provider not configured' });
  }

  const requestOrigin = `${request.headers['x-forwarded-proto'] || 'https'}://${request.headers['x-forwarded-host'] || request.headers.host}`;
  const publicBase = safeUrl(process.env.ASSESSMENT_PUBLIC_URL || requestOrigin, requestOrigin).replace(/\/$/, '');
  const resultUrl = `${publicBase}/profilo/${resultToken}`;
  const from = process.env.ASSESSMENT_FROM_EMAIL || 'Sblocco Inglese <onboarding@resend.dev>';

  const providerResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${name}, il tuo Profilo Sblocco è pronto`,
      html: resultEmailHtml({ name, profession, result, resultUrl }),
      text: `${name}, il tuo Profilo Sblocco è pronto.\n\n${result.primaryTitle || ''}\n${result.primarySummary || ''}\n\nPercorso consigliato: ${result.recommendation?.name || ''}\n\nApri il risultato: ${resultUrl}`,
    }),
  });

  const providerBody = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok) {
    return response.status(502).json({ sent: false, error: providerBody.message || 'Email provider rejected the message' });
  }

  return response.status(200).json({ sent: true, id: providerBody.id || null });
}

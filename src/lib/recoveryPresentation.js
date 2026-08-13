export function recoverySessionDisplayTitle(title, fallback = 'Sessione del tuo piano') {
  const cleaned = String(title || '')
    .replace(/\s*[—-]\s*sessione guidata\s*$/i, '')
    .replace(/\s*[—-]\s*ripasso e verifica\s*$/i, '')
    .trim();
  return cleaned || fallback;
}

export function recoverySessionKind(title, sessionType = '') {
  if (/ripasso e verifica/i.test(String(title || '')) || sessionType === 'quick_review') return 'Ripasso e verifica';
  if (sessionType === 'checkpoint') return 'Verifica di percorso';
  if (String(sessionType).startsWith('mock_')) return 'Simulazione';
  return 'Sessione guidata';
}

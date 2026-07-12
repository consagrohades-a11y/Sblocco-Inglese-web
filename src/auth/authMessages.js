export function getAuthErrorMessage(error) {
  const message = String(error?.message ?? '').toLowerCase();

  if (!message) {
    return 'Non sono riuscita a completare la richiesta. Riprova tra poco.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Email o password non corretti.';
  }

  if (message.includes('already registered') || message.includes('already exists')) {
    return 'Questa email risulta gia registrata. Prova ad accedere o usa il recupero password.';
  }

  if (message.includes('weak password') || message.includes('password should') || message.includes('password must')) {
    return 'La password e troppo debole. Usa almeno 8 caratteri.';
  }

  if (message.includes('email not confirmed')) {
    return 'Devi confermare la tua email prima di accedere.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'Connessione non riuscita. Controlla la rete e riprova.';
  }

  if (message.includes('rate limit')) {
    return 'Troppi tentativi ravvicinati. Aspetta qualche minuto e riprova.';
  }

  return 'Non sono riuscita a completare la richiesta. Riprova tra poco.';
}

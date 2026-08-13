export const RECOVERY_TOPIC_RECOVERED_THRESHOLD = 80;
export const RECOVERY_TOPIC_STRONG_THRESHOLD = 90;

export const RECOVERY_REMEDIATION_STAGES = Object.freeze({
  full: Object.freeze(['recupera', 'allenati', 'modalita_scuola', 'mini_verifica']),
  practice: Object.freeze(['allenati', 'modalita_scuola', 'mini_verifica']),
  targeted: Object.freeze(['modalita_scuola', 'mini_verifica']),
});

export function recoveryRemediationPolicy(score, { needsRecheck = false } = {}) {
  const numericScore = Number(score);

  if (needsRecheck) {
    return {
      band: 'needs_recheck',
      remediationRequired: true,
      stages: [...RECOVERY_REMEDIATION_STAGES.targeted],
      primaryAction: 'Ripassa e verifica',
    };
  }

  if (!Number.isFinite(numericScore)) {
    return {
      band: 'unknown',
      remediationRequired: false,
      stages: [],
      primaryAction: null,
    };
  }

  if (numericScore < 60) {
    return {
      band: 'insufficient',
      remediationRequired: true,
      stages: [...RECOVERY_REMEDIATION_STAGES.full],
      primaryAction: 'Ricomincia il recupero',
    };
  }

  if (numericScore < 70) {
    return {
      band: 'weak',
      remediationRequired: true,
      stages: [...RECOVERY_REMEDIATION_STAGES.practice],
      primaryAction: 'Allenati di nuovo',
    };
  }

  if (numericScore < RECOVERY_TOPIC_RECOVERED_THRESHOLD) {
    return {
      band: 'almost_recovered',
      remediationRequired: true,
      stages: [...RECOVERY_REMEDIATION_STAGES.targeted],
      primaryAction: 'Ripassa e riprova',
    };
  }

  if (numericScore < RECOVERY_TOPIC_STRONG_THRESHOLD) {
    return {
      band: 'recovered',
      remediationRequired: false,
      stages: [],
      primaryAction: null,
    };
  }

  return {
    band: 'strong',
    remediationRequired: false,
    stages: [],
    primaryAction: null,
  };
}

export function recoveryFollowupCopy(score, masteryState = '') {
  const policy = recoveryRemediationPolicy(score, { needsRecheck: masteryState === 'needs_recheck' });

  if (policy.band === 'needs_recheck') {
    return {
      title: 'Da ricontrollare',
      body: 'Una prova successiva ha riaperto un dubbio su questo argomento. Facciamo un ripasso mirato e poi una nuova verifica.',
      primaryAction: policy.primaryAction,
    };
  }
  if (policy.band === 'insufficient') {
    return {
      title: 'Da recuperare ancora',
      body: 'Questa parte non è ancora abbastanza stabile. Facciamo un altro giro guidato prima di riprovare.',
      primaryAction: policy.primaryAction,
    };
  }
  if (policy.band === 'weak') {
    return {
      title: 'Serve ancora un po’ di lavoro',
      body: 'La base c’è, ma il risultato non è ancora sufficiente per considerare l’argomento recuperato.',
      primaryAction: policy.primaryAction,
    };
  }
  if (policy.band === 'almost_recovered') {
    return {
      title: 'Ci sei quasi',
      body: 'Sei vicino alla soglia. Un passaggio mirato in modalità scuola e una nuova verifica sono il passo più utile adesso.',
      primaryAction: policy.primaryAction,
    };
  }
  if (policy.band === 'recovered') {
    return {
      title: 'Argomento recuperato',
      body: 'La verifica supera la soglia di recupero. Non serve un nuovo ciclo obbligatorio.',
      primaryAction: null,
    };
  }
  if (policy.band === 'strong') {
    return {
      title: 'Argomento consolidato',
      body: 'Il risultato mostra un controllo forte dell’argomento. Non serve remediation.',
      primaryAction: null,
    };
  }

  return {
    title: 'Verifica completata',
    body: 'Il risultato è stato salvato nella cronologia del tuo percorso.',
    primaryAction: null,
  };
}

import React from 'react';

function isChunkFailure(error) {
  const message = String(error?.message || error || '');
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|expected a javascript-or-wasm module script|loading chunk/i.test(message);
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Sblocco render recovery boundary', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const staleVersion = isChunkFailure(error);
    const adminSurface = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    return (
      <main className="min-h-screen bg-paper px-6 py-16 text-ink dark:bg-surface-950 dark:text-white">
        <section className="mx-auto max-w-xl rounded-[2rem] border border-ink/10 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-clay">
            {staleVersion ? 'Versione aggiornata' : 'Recovery'}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em]">
            {staleVersion ? 'Questa scheda sta usando una versione precedente.' : 'Questa pagina non si è caricata correttamente.'}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
            {staleVersion
              ? 'Non ricarico la pagina automaticamente. Quando vuoi, aggiorna una volta per passare alla versione più recente.'
              : 'Il resto della piattaforma non viene ricaricato automaticamente. Puoi riprovare questa pagina o tornare a una destinazione stabile.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-surface-950"
            >
              Ricarica questa pagina
            </button>
            <button
              type="button"
              onClick={() => window.location.assign(adminSurface ? '/admin/command-center' : '/')}
              className="focus-ring rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
            >
              {adminSurface ? 'Vai al Command Center' : 'Torna alla home'}
            </button>
          </div>
        </section>
      </main>
    );
  }
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  CalendarDays,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import SEO from '../components/SEO';
import AuthNotice from '../components/auth/AuthNotice';
import LearnerAvatar from '../components/learner/LearnerAvatar.jsx';
import LearnerAvatarPicker from '../components/learner/LearnerAvatarPicker.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';
import { supabase } from '../lib/supabaseClient.js';

const roleLabels = { learner: 'Studente', admin: 'Amministratore' };

function firstNameFromProfile(profile, user) {
  const value = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'studente';
  return String(value).trim().split(/\s+/)[0] || 'studente';
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--learner-line)] py-4 last:border-b-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--learner-soft-orange)] text-[var(--learner-orange)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.1em] text-[var(--learner-muted)]">{label}</p>
        <p className="mt-1 break-words text-sm font-bold text-[var(--learner-navy)]">{value || '-'}</p>
      </div>
    </div>
  );
}

export default function Account() {
  const { loading, profile, refreshProfile, signOut, user } = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState('');
  const [avatarBackgroundSaving, setAvatarBackgroundSaving] = useState('');
  const [form, setForm] = useState({
    displayName: '',
    profession: '',
    age: '',
  });

  const isLearner = profile?.role === 'learner' && profile?.status === 'active';
  const displayName = profile?.display_name || user?.user_metadata?.display_name || '';
  const firstName = useMemo(() => firstNameFromProfile(profile, user), [profile, user]);
  const avatarKey = profile?.avatar_key || null;
  const avatarBackgroundKey = profile?.avatar_background_key || null;
  const role = roleLabels[profile?.role] || profile?.role || '-';

  useEffect(() => {
    setForm({
      displayName: profile?.display_name || '',
      profession: profile?.profession || '',
      age: profile?.age == null ? '' : String(profile.age),
    });
  }, [profile]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!user?.id || profileSaving) return;

    const nextDisplayName = form.displayName.trim();
    const nextProfession = form.profession.trim();
    const nextAge = form.age === '' ? null : Number(form.age);

    setError('');
    setMessage('');

    if (!nextDisplayName) {
      setError('Inserisci il nome che vuoi usare su Sblocco.');
      return;
    }

    if (nextAge !== null && (!Number.isInteger(nextAge) || nextAge < 5 || nextAge > 120)) {
      setError("L'età deve essere un numero valido.");
      return;
    }

    setProfileSaving(true);

    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || profile?.timezone || 'Europe/Rome';
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: nextDisplayName,
        profession: isLearner ? (nextProfession || null) : profile?.profession || null,
        age: isLearner ? nextAge : profile?.age ?? null,
        timezone: detectedTimezone,
      })
      .eq('id', user.id);

    if (updateError) {
      setError('Non è stato possibile salvare il profilo. Riprova.');
      setProfileSaving(false);
      return;
    }

    try {
      await refreshProfile(user);
      setMessage('Profilo aggiornato.');
    } catch {
      setError('Il profilo è stato salvato, ma la pagina non si è aggiornata correttamente. Ricaricala.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAvatarChange(nextAvatarKey) {
    if (!isLearner || !user?.id || avatarSaving || nextAvatarKey === profile?.avatar_key) return;

    setError('');
    setMessage('');
    setAvatarSaving(nextAvatarKey);

    const { error: avatarError } = await supabase
      .from('profiles')
      .update({ avatar_key: nextAvatarKey })
      .eq('id', user.id);

    if (avatarError) {
      setError('Non è stato possibile salvare il tuo avatar. Riprova.');
      setAvatarSaving('');
      return;
    }

    try {
      await refreshProfile(user);
    } catch {
      setError("L'avatar è stato salvato, ma la pagina non si è aggiornata correttamente.");
    } finally {
      setAvatarSaving('');
    }
  }

  async function handleAvatarBackgroundChange(nextBackgroundKey) {
    if (!isLearner || !user?.id || avatarBackgroundSaving || nextBackgroundKey === profile?.avatar_background_key) return;

    setError('');
    setMessage('');
    setAvatarBackgroundSaving(nextBackgroundKey);

    const { error: backgroundError } = await supabase
      .from('profiles')
      .update({ avatar_background_key: nextBackgroundKey })
      .eq('id', user.id);

    if (backgroundError) {
      setError('Non è stato possibile salvare il colore del tuo avatar. Riprova.');
      setAvatarBackgroundSaving('');
      return;
    }

    try {
      await refreshProfile(user);
    } catch {
      setError('Il colore è stato salvato, ma la pagina non si è aggiornata correttamente.');
    } finally {
      setAvatarBackgroundSaving('');
    }
  }

  async function handleSignOut() {
    setError('');
    setSigningOut(true);
    const { error: signOutError } = await signOut();
    if (signOutError) {
      setError(getAuthErrorMessage(signOutError));
      setSigningOut(false);
      return;
    }
    window.location.assign('/');
  }

  const inputClass = 'focus-ring mt-2 min-h-12 w-full rounded-xl border border-[var(--learner-line)] bg-[var(--learner-paper-raised)] px-4 py-3 text-sm font-semibold text-[var(--learner-navy)] outline-none transition placeholder:text-[var(--learner-muted)] focus:border-[var(--learner-orange)]';

  return (
    <div className="learner-editorial">
      <SEO title="Account e impostazioni | Sblocco Inglese" description="Gestisci il tuo profilo Sblocco Inglese." />

      <div className="learner-shell learner-dashboard">
        <header className="border-b border-[var(--learner-line)] pb-7 pt-2">
          <p className="learner-kicker">Il tuo spazio</p>
          <h1 className="learner-display mt-2 text-4xl leading-none text-[var(--learner-navy)] sm:text-5xl">
            Account e impostazioni
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--learner-muted)]">
            Tieni aggiornate le informazioni essenziali del tuo profilo e scegli come apparire su Sblocco.
          </p>
        </header>

        {loading ? (
          <div className="learner-panel learner-panel--main mt-5">
            <p className="learner-muted text-sm font-semibold">Caricamento profilo...</p>
          </div>
        ) : null}

        {error ? <div className="mt-5"><AuthNotice tone="error">{error}</AuthNotice></div> : null}
        {message ? (
          <div className="mt-5 border-l-4 border-[var(--learner-orange)] bg-[var(--learner-soft-orange)] px-4 py-3 text-sm font-bold text-[var(--learner-navy)]">
            {message}
          </div>
        ) : null}

        {!loading ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.65fr)]">
            <main className="learner-panel learner-panel--main">
              {isLearner ? (
                <div className="flex flex-col gap-5 border-b border-[var(--learner-line)] pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-5">
                    <LearnerAvatar
                      avatarKey={avatarKey}
                      backgroundKey={avatarBackgroundKey}
                      displayName={displayName || firstName}
                      size="2xl"
                      eager
                    />
                    <div>
                      <p className="learner-kicker">Avatar</p>
                      <h2 className="mt-1 font-serif text-2xl font-normal tracking-tight text-[var(--learner-navy)]">
                        {avatarKey ? 'Il tuo profilo Sblocco' : 'Scegli il tuo personaggio'}
                      </h2>
                      <p className="mt-1 max-w-md text-sm leading-6 text-[var(--learner-muted)]">
                        Personaggio e colore restano modificabili quando vuoi.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvatarOpen(true)}
                    className="learner-secondary-button shrink-0"
                  >
                    {avatarKey ? 'Cambia avatar' : 'Scegli avatar'}
                  </button>
                </div>
              ) : null}

              <form onSubmit={handleProfileSubmit} className={isLearner ? 'pt-6' : ''}>
                <div className="learner-panel__heading">
                  <div>
                    <span className="learner-panel__eyebrow">Profilo</span>
                    <h2>Le tue informazioni</h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-bold text-[var(--learner-navy)]">
                    Nome
                    <input
                      className={inputClass}
                      type="text"
                      value={form.displayName}
                      maxLength={80}
                      autoComplete="name"
                      onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                      placeholder="Come vuoi essere chiamato?"
                    />
                  </label>

                  {isLearner ? (
                    <label className="text-sm font-bold text-[var(--learner-navy)]">
                      Professione
                      <div className="relative">
                        <Briefcase className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-[var(--learner-muted)]" />
                        <input
                          className={inputClass + ' pl-11'}
                          type="text"
                          value={form.profession}
                          maxLength={80}
                          onChange={(event) => setForm((current) => ({ ...current, profession: event.target.value }))}
                          placeholder="Es. Software developer"
                        />
                      </div>
                    </label>
                  ) : null}

                  {isLearner ? (
                    <label className="text-sm font-bold text-[var(--learner-navy)]">
                      Età
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-[var(--learner-muted)]" />
                        <input
                          className={inputClass + ' pl-11'}
                          type="number"
                          inputMode="numeric"
                          min="5"
                          max="120"
                          value={form.age}
                          onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                          placeholder="Es. 32"
                        />
                      </div>
                    </label>
                  ) : null}

                </div>

                <p className="mt-5 text-xs leading-5 text-[var(--learner-muted)]">
                  Il fuso orario viene rilevato automaticamente dal dispositivo, così le scadenze restano corrette senza chiederti codici tecnici.
                </p>

                <div className="mt-6 flex justify-end">
                  <button type="submit" disabled={profileSaving} className="learner-primary-button disabled:cursor-wait disabled:opacity-60">
                    {profileSaving ? 'Salvataggio...' : 'Salva modifiche'}
                  </button>
                </div>
              </form>
            </main>

            <aside className="learner-panel learner-panel--side self-start">
              <div className="learner-panel__heading">
                <div>
                  <span className="learner-panel__eyebrow">Account</span>
                  <h3>Dati di accesso</h3>
                </div>
              </div>

              <div className="mt-2">
                <InfoRow icon={Mail} label="Email" value={user?.email} />
                <InfoRow icon={ShieldCheck} label="Tipo di account" value={role} />
                <InfoRow icon={UserRound} label="Nome visualizzato" value={displayName || firstName} />
              </div>

              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="learner-secondary-button mt-5 w-full disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? 'Uscita...' : 'Esci dall account'}
              </button>
            </aside>
          </div>
        ) : null}
      </div>

      {isLearner && avatarOpen ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-[#0e3045]/45 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Scegli avatar"
        >
          <div className="mx-auto my-3 w-full max-w-5xl overflow-hidden rounded-[1.6rem] border border-white/20 bg-[#fbf4ed] shadow-2xl dark:bg-[#121714] sm:my-8">
            <header className="flex items-start justify-between gap-4 border-b border-[var(--learner-line)] px-5 py-5 sm:px-7">
              <div>
                <p className="learner-kicker">Il tuo avatar</p>
                <h2 className="learner-display mt-1 text-3xl text-[var(--learner-navy)] sm:text-4xl">Scegli come apparire</h2>
                <p className="mt-2 text-sm text-[var(--learner-muted)]">Prima scegli il colore, poi il personaggio.</p>
              </div>
              <button
                type="button"
                onClick={() => setAvatarOpen(false)}
                className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--learner-line)] text-[var(--learner-navy)] transition hover:border-[var(--learner-orange)] hover:text-[var(--learner-orange)]"
                aria-label="Chiudi selettore avatar"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-4 border-b border-[var(--learner-line)] pb-6">
                <LearnerAvatar
                  avatarKey={avatarKey}
                  backgroundKey={avatarBackgroundKey}
                  displayName={displayName || firstName}
                  size="2xl"
                  eager
                />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--learner-muted)]">Anteprima</p>
                  <p className="mt-1 text-sm font-bold text-[var(--learner-navy)]">
                    {avatarSaving || avatarBackgroundSaving ? 'Salvataggio in corso...' : 'Le modifiche vengono salvate appena le scegli.'}
                  </p>
                </div>
              </div>

              <LearnerAvatarPicker
                value={avatarKey}
                backgroundValue={avatarBackgroundKey}
                onChange={handleAvatarChange}
                onBackgroundChange={handleAvatarBackgroundChange}
                disabled={Boolean(avatarSaving || avatarBackgroundSaving)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import React, { useState } from 'react';
import { CheckCircle2, ClipboardCheck, LoaderCircle, Send } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { createPathwayIntake } from '../../lib/pathwayIntakeApi.js';

export default function InterviewEnquiry() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const role = String(data.get('role') || '').trim();
    if (name.length < 2 || !email || !role) {
      setMessage({ tone: 'error', text: 'Inserisci nome, email e ruolo per inviare la richiesta.' });
      return;
    }

    setSubmitting(true);
    try {
      await createPathwayIntake({
        name,
        email,
        pathway: 'colloquio',
        interviewDate: data.get('interviewDate'),
        role,
        company: data.get('company'),
        interviewType: data.get('interviewType'),
        practicalTest: data.get('practicalTest'),
        note: data.get('note'),
        website: data.get('website'),
      });
      setMessage({ tone: 'success' });
      form.reset();
    } catch (error) {
      setMessage({ tone: 'error', text: error.message || 'Non è stato possibile inviare la richiesta.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="richiesta-colloquio" className="interview-section interview-enquiry" aria-labelledby="interview-enquiry-title">
      <div className="interview-shell interview-enquiry__layout">
        <div className="interview-heading">
          <p className="interview-eyebrow">PREPARAZIONE MIRATA</p>
          <h2 id="interview-enquiry-title">Hai già un colloquio in programma?</h2>
          <p>Raccontaci che tipo di colloquio devi affrontare. Ti aiuterà a capire quale preparazione ha più senso.</p>
          <div className="interview-enquiry__promise"><ClipboardCheck aria-hidden="true" /><span>Non serve un account. La richiesta non comporta alcun pagamento o prenotazione automatica.</span></div>
        </div>

        {message?.tone === 'success' ? (
          <div className="interview-enquiry__success" role="status" aria-live="polite">
            <CheckCircle2 aria-hidden="true" />
            <p className="interview-eyebrow">RICHIESTA INVIATA</p>
            <h3>Abbiamo ricevuto le informazioni.</h3>
            <p>Le useremo per capire quale preparazione può avere più senso per il tuo colloquio.</p>
          </div>
        ) : (
          <form className="interview-enquiry__form" onSubmit={handleSubmit}>
            <label className="interview-honeypot" aria-hidden="true">Non compilare<input name="website" type="text" tabIndex="-1" autoComplete="off" /></label>
            <div className="interview-form-grid">
              <label>Nome<input key={`enquiry-name-${user?.id || 'guest'}`} name="name" type="text" minLength="2" maxLength="120" required defaultValue={user?.user_metadata?.display_name || ''} autoComplete="name" placeholder="Il tuo nome" /></label>
              <label>Email<input key={`enquiry-email-${user?.id || 'guest'}`} name="email" type="email" maxLength="254" required defaultValue={user?.email || ''} autoComplete="email" placeholder="nome@email.it" /></label>
              <label className="interview-form-grid__wide">Ruolo o posizione<input name="role" type="text" maxLength="180" required autoComplete="organization-title" placeholder="Es. Product Manager" /></label>
              <label>Azienda <span>opzionale</span><input name="company" type="text" maxLength="180" autoComplete="organization" /></label>
              <label>Data del colloquio <span>opzionale</span><input name="interviewDate" type="date" /></label>
              <label className="interview-form-grid__wide">Tipo di colloquio <span>opzionale</span>
                <select name="interviewType" defaultValue="">
                  <option value="">Non lo so ancora</option>
                  <option value="HR / conoscitivo">HR / conoscitivo</option>
                  <option value="Comportamentale">Comportamentale</option>
                  <option value="Tecnico">Tecnico</option>
                  <option value="Case study">Case study</option>
                  <option value="Presentazione">Presentazione</option>
                </select>
              </label>
            </div>
            <fieldset>
              <legend>È previsto un colloquio tecnico o una prova pratica?</legend>
              <label><input name="practicalTest" type="radio" value="yes" /> Sì</label>
              <label><input name="practicalTest" type="radio" value="no" /> No</label>
              <label><input name="practicalTest" type="radio" value="unknown" defaultChecked /> Non lo so</label>
            </fieldset>
            <label className="interview-form-note">Note <span>opzionale</span><textarea name="note" maxLength="1500" rows="4" placeholder="Aggiungi ciò che può aiutarci a capire la situazione." /></label>
            <button type="submit" className="interview-button interview-button--primary" disabled={submitting}>
              {submitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Invio in corso…</> : <>Invia la richiesta <Send aria-hidden="true" /></>}
            </button>
            {message ? <p className="interview-form-status interview-form-status--error" role="alert">{message.text}</p> : null}
          </form>
        )}
      </div>
    </section>
  );
}


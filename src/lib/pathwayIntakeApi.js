import { supabase } from './supabaseClient.js';

export async function createPathwayIntake({ name, email, pathway, interviewDate, role, company, interviewType, practicalTest, note, website }) {
  const payload = {
    name: String(name || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    pathway,
    interview_date: interviewDate || null,
    role: String(role || '').trim(),
    company: String(company || '').trim() || null,
    interview_type: String(interviewType || '').trim() || null,
    practical_test: practicalTest || 'unknown',
    note: String(note || '').trim() || null,
    website: String(website || '').trim(),
  };

  const { data, error } = await supabase
    .rpc('submit_public_pathway_intake', { p_payload: payload });

  if (error) {
    if (/too many recent/i.test(error.message || '')) {
      throw new Error('Hai già inviato diverse richieste di recente. Riprova più tardi.');
    }
    throw new Error('Non è stato possibile inviare la richiesta. Riprova tra poco.');
  }
  return Array.isArray(data) ? data[0] : data;
}

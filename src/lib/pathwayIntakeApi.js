import { supabase } from './supabaseClient.js';

export async function createPathwayIntake({ userId, pathway, interviewDate, role, company, interviewType, practicalTest, note }) {
  const payload = {
    user_id: userId,
    pathway,
    interview_date: interviewDate || null,
    role: String(role || '').trim(),
    company: String(company || '').trim() || null,
    interview_type: String(interviewType || '').trim() || null,
    practical_test: practicalTest || 'unknown',
    note: String(note || '').trim() || null,
  };

  const { data, error } = await supabase
    .from('pathway_intake_requests')
    .insert(payload)
    .select('id, created_at')
    .single();

  if (error) throw error;
  return data;
}


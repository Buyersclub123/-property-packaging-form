// Row note -> GHL contact note (JT 11/11): "[<calendar> <date> - <outcome> - <user>]" + next action + text.
// GHL shows contact notes under the linked opportunity. Needs contacts.write on the token; a failure is stored on the row.
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { logReview } from './store';
import { sydYmd } from './types';

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const headers = () => ({
  Authorization: `Bearer ${process.env.GHL_BEARER_TOKEN || ''}`,
  Version: '2021-07-28',
  Accept: 'application/json',
  'Content-Type': 'application/json',
});

export const whoName = (email: string) => email.split('@')[0].replace(/[._]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const longDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const notePrefix = (calendar: string, ymd: string, outcome: string | null, by: string) =>
  `[${calendar} ${longDate(ymd)} - ${outcome || 'No outcome'} - ${whoName(by)}]`;

export type ContactNoteResult = { posted: boolean; noteId: string | null; error: string | null };

export async function postContactNote(by: string, appointmentId: string, note: string | null, nextAction: string | null, outcome: string | null): Promise<ContactNoteResult | null> {
  if (!note && !nextAction) return null;
  const [r] = await getDb()`SELECT m.contact_id, m.calendar_name, m.start_at, o.note_ghl_id
    FROM review_meetings m LEFT JOIN review_outcomes o ON o.appointment_id = m.appointment_id WHERE m.appointment_id = ${appointmentId}`;
  if (!r?.contact_id) return { posted: false, noteId: null, error: 'Meeting has no GHL contact.' };
  const prefix = notePrefix(String(r.calendar_name), sydYmd(new Date(r.start_at)), outcome, by);
  const body = [prefix, nextAction && `Next action: ${nextAction}`, note].filter(Boolean).join('\n');
  const send = (method: 'POST' | 'PUT', id?: string) =>
    ghlFetch(`${BASE}/contacts/${r.contact_id}/notes${id ? `/${id}` : ''}`, { method, headers: headers(), body: JSON.stringify({ body }), cache: 'no-store', signal: AbortSignal.timeout(30_000) }, 'review-contact-note');
  let noteId: string | null = (r.note_ghl_id as string | null) || null;
  let error: string | null = null;
  try {
    let res = noteId ? await send('PUT', noteId) : await send('POST');
    if (noteId && res.status === 404) res = await send('POST');
    const j = (await res.json().catch(() => ({}))) as { note?: { id?: string }; id?: string; message?: string };
    if (res.ok) noteId = j.note?.id || j.id || noteId;
    else error = `GHL ${res.status}: ${j.message || res.statusText}`;
  } catch (e) {
    error = (e as Error).message;
  }
  await getDb()`UPDATE review_outcomes SET note_ghl_id = ${error ? (r.note_ghl_id as string | null) : noteId}, note_ghl_error = ${error} WHERE appointment_id = ${appointmentId}`;
  await logReview(by, appointmentId, 'contact_note', { contactId: r.contact_id, prefix, posted: !error, noteId, error });
  return { posted: !error, noteId: error ? null : noteId, error };
}

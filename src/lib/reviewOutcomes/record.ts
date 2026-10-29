import { getDb } from '@/lib/db';
import { buildPortfolio } from '@/lib/portfolio/build';
import { loadContactLinks } from '@/lib/portfolio/contactLinks';
import { loadGhlUsers, loadSources } from '@/lib/portfolio/sources';
import type { PortfolioData } from '@/lib/portfolio/types';
import { ensureReviewTables, logReview } from './store';
import type { ClientPanel, ClientProperty } from './types';

// Writes to the app DB only (review_outcomes, review_property_checks, review_outcome_log). Phase 2 write-back is not built.

export async function meetingOwner(appointmentId: string): Promise<{ assignedUserId: string | null; contactId: string | null; contactName: string } | null> {
  await ensureReviewTables();
  const rows = await getDb()`SELECT m.assigned_user_id, m.contact_id, COALESCE(c.name, m.title, '') AS name
    FROM review_meetings m LEFT JOIN review_contacts c ON c.contact_id = m.contact_id WHERE m.appointment_id = ${appointmentId}`;
  if (!rows.length) return null;
  return { assignedUserId: rows[0].assigned_user_id ?? null, contactId: rows[0].contact_id ?? null, contactName: String(rows[0].name) };
}

export async function saveOutcome(by: string, appointmentId: string, outcome: string | null, invalidReason: string | null): Promise<void> {
  const sql = getDb();
  const before = await sql`SELECT outcome, invalid_reason, source, source_ref, recorded_by FROM review_outcomes WHERE appointment_id = ${appointmentId}`;
  await sql`INSERT INTO review_outcomes (appointment_id, outcome, invalid_reason, source, recorded_by)
    VALUES (${appointmentId}, ${outcome}, ${invalidReason}, 'tool', ${by})
    ON CONFLICT (appointment_id) DO UPDATE SET outcome = EXCLUDED.outcome, invalid_reason = EXCLUDED.invalid_reason, source = 'tool',
      source_ref = NULL, recorded_by = EXCLUDED.recorded_by, recorded_at = NOW(), updated_at = NOW()`;
  await logReview(by, appointmentId, outcome ? 'outcome' : 'outcome_clear', { before: before[0] ?? null, after: { outcome, invalidReason } });
}

let portfolioCache: { at: number; data: PortfolioData } | null = null;

async function portfolio(): Promise<PortfolioData> {
  if (portfolioCache && Date.now() - portfolioCache.at < 10 * 60e3) return portfolioCache.data;
  const [users, links] = await Promise.all([loadGhlUsers(), loadContactLinks()]);
  const data = buildPortfolio(loadSources(), users, links);
  portfolioCache = { at: Date.now(), data };
  return data;
}

export async function loadClientPanel(appointmentId: string, contactId: string | null, contactName: string): Promise<ClientPanel> {
  const sql = getDb();
  const checks = await sql`SELECT property_key, still_owned, current_value, current_rent_pw FROM review_property_checks WHERE appointment_id = ${appointmentId}`;
  const noteRow = await sql`SELECT note FROM review_outcomes WHERE appointment_id = ${appointmentId}`;
  const byKey = new Map(checks.map((c) => [String(c.property_key), c]));
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const panel: ClientPanel = { appointmentId, contactName, available: false, unavailableReason: null, properties: [], note: noteRow[0]?.note ?? null };
  if (!contactId) return { ...panel, unavailableReason: 'This appointment has no GHL contact.' };
  let data: PortfolioData;
  try {
    data = await portfolio();
  } catch (e) {
    return { ...panel, unavailableReason: `Portfolio data not available here (it reads JT's Google Drive folder, so it runs on JT's PC only for now). ${(e as Error).message}` };
  }
  const has = (c: PortfolioData['people'][number]) => c.contactId === contactId || c.mergedFrom.some((m) => m.contactId === contactId);
  const client = data.people.find(has) || data.clients.find(has);
  const properties: ClientProperty[] = (client?.opportunities || [])
    .flatMap((o) => o.properties)
    .filter((p) => !p.fellOver)
    .map((p) => {
      const c = byKey.get(p.key);
      return {
        key: p.key,
        address: p.address,
        purchasePrice: p.totalPrice,
        purchaseDate: p.contractDate,
        valuation: p.valuation,
        valuationDate: p.valuationDate,
        inFlight: p.source === 'inflight',
        fellOver: p.fellOver,
        check: c ? { stillOwned: c.still_owned ?? null, currentValue: num(c.current_value), currentRentPw: num(c.current_rent_pw) } : null,
      };
    });
  return { ...panel, available: true, properties };
}

export interface PropertyCheckInput { key: string; address: string; stillOwned: boolean | null; currentValue: number | null; currentRentPw: number | null }

export async function saveClientPanel(by: string, appointmentId: string, checks: PropertyCheckInput[], note: string | null): Promise<void> {
  const sql = getDb();
  for (const c of checks) {
    await sql`INSERT INTO review_property_checks (appointment_id, property_key, address, still_owned, current_value, current_rent_pw, recorded_by)
      VALUES (${appointmentId}, ${c.key}, ${c.address}, ${c.stillOwned}, ${c.currentValue}, ${c.currentRentPw}, ${by})
      ON CONFLICT (appointment_id, property_key) DO UPDATE SET address = EXCLUDED.address, still_owned = EXCLUDED.still_owned,
        current_value = EXCLUDED.current_value, current_rent_pw = EXCLUDED.current_rent_pw, recorded_by = EXCLUDED.recorded_by, recorded_at = NOW()`;
  }
  await sql`INSERT INTO review_outcomes (appointment_id, note, source, recorded_by) VALUES (${appointmentId}, ${note}, 'tool', ${by})
    ON CONFLICT (appointment_id) DO UPDATE SET note = EXCLUDED.note, updated_at = NOW()`;
  await logReview(by, appointmentId, 'client_panel', { checks, note });
}

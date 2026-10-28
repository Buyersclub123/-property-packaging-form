import { getDb } from '@/lib/db';

// Same-person links between GHL contacts (item 13). App database only; nothing is written to GHL.
// Seeded from the High-confidence groups of 00 Alignment\Duplicate contacts v1 (Devin).xlsx.
export interface ContactLinks {
  byContact: Map<string, string>;
  count: number;
  error: string | null;
}

let ready: Promise<void> | null = null;

export function ensureContactLinks(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sql = getDb();
      await sql`CREATE TABLE IF NOT EXISTS contact_links (
        contact_id TEXT PRIMARY KEY,
        person_key TEXT NOT NULL,
        basis TEXT NOT NULL,
        source TEXT NOT NULL,
        added_by TEXT NOT NULL,
        added_at TIMESTAMPTZ DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS contact_links_person_key ON contact_links (person_key)`;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

export async function loadContactLinks(): Promise<ContactLinks> {
  try {
    await ensureContactLinks();
    const rows = await getDb()`SELECT contact_id, person_key FROM contact_links`;
    const byContact = new Map<string, string>(rows.map((r) => [String(r.contact_id), String(r.person_key)]));
    return { byContact, count: byContact.size, error: null };
  } catch (e) {
    return { byContact: new Map(), count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

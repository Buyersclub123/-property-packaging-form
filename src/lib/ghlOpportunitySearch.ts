import { ghlFetch } from '@/lib/ghlFetch';

export type OpportunityFilter = { field: string; operator: 'eq' | 'range'; value: unknown };
type Sort = { field: 'date_updated' | 'date_added'; direction: 'asc' | 'desc' };

// POST search supports explicit update ordering and stable cursor pagination.
// GET search's order parameter does not accept "updated_at_desc".
export async function searchGhlOpportunities<T extends { id: string }>(
  filters: OpportunityFilter[],
  source: string,
  sort: Sort = { field: 'date_updated', direction: 'asc' },
): Promise<T[]> {
  const rows = new Map<string, T>();
  const cursors = new Set<string>();
  let searchAfter: unknown[] | undefined;
  for (let page = 0; page < 1000; page++) {
    const response = await ghlFetch(`${process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com'}/opportunities/search`, {
      method: 'POST',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${process.env.GHL_BEARER_TOKEN || ''}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID || '', limit: 100, filters, sort: [sort],
        ...(searchAfter ? { searchAfter } : {}),
      }),
    }, source);
    if (!response.ok) throw new Error(`GHL opportunity search HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = await response.json();
    if (!Array.isArray(data.opportunities)) throw new Error('GHL opportunity search returned no opportunities array');
    const batch = data.opportunities as (T & { sort?: unknown[] })[];
    for (const row of batch) {
      if (!row || typeof row.id !== 'string' || !row.id) throw new Error('GHL opportunity search returned a record without an ID');
      rows.set(row.id, row);
    }
    if (batch.length < 100) return [...rows.values()];
    const cursor = batch[batch.length - 1].sort;
    if (!Array.isArray(cursor) || !cursor.length) throw new Error('GHL opportunity search returned a full page without a cursor');
    const key = JSON.stringify(cursor);
    if (cursors.has(key)) throw new Error('GHL opportunity search repeated its pagination cursor');
    cursors.add(key);
    searchAfter = cursor;
  }
  throw new Error('GHL opportunity search exceeded 100,000 records; refusing incomplete results');
}

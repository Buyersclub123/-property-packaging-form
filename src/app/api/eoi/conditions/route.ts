import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/eoi/conditions?q=search&state=NSW&type=established
 *
 * Searches the special conditions library by text.
 * If no query, returns all conditions (optionally filtered by state/type).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const state = searchParams.get('state') || null;
  const propertyType = searchParams.get('type') || null;

  const sql = getDb();

  let rows;
  if (q) {
    const pattern = `%${q}%`;
    if (state) {
      rows = await sql`
        SELECT id, text, state, property_type, is_default, sort_order, usage_count
        FROM special_conditions
        WHERE text ILIKE ${pattern}
          AND (state = ${state} OR state IS NULL)
        ORDER BY usage_count DESC, sort_order, id
        LIMIT ${50}`;
    } else {
      rows = await sql`
        SELECT id, text, state, property_type, is_default, sort_order, usage_count
        FROM special_conditions
        WHERE text ILIKE ${pattern}
        ORDER BY usage_count DESC, sort_order, id
        LIMIT ${50}`;
    }
  } else if (state && propertyType) {
    rows = await sql`
      SELECT id, text, state, property_type, is_default, sort_order, usage_count
      FROM special_conditions
      WHERE (state = ${state} AND property_type = ${propertyType})
         OR (state IS NULL AND property_type IS NULL)
      ORDER BY sort_order, id`;
  } else {
    rows = await sql`
      SELECT id, text, state, property_type, is_default, sort_order, usage_count
      FROM special_conditions
      ORDER BY state, property_type, sort_order, id
      LIMIT ${200}`;
  }

  return NextResponse.json({ conditions: rows });
}

/**
 * POST /api/eoi/conditions
 *
 * Saves a new condition to the library.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, state, property_type } = body;

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Condition text is required' }, { status: 400 });
  }

  const sql = getDb();

  const result = await sql`
    INSERT INTO special_conditions (text, state, property_type, is_default, sort_order)
    VALUES (${text.trim()}, ${state || null}, ${property_type || null}, ${false}, ${0})
    RETURNING id`;

  return NextResponse.json({ ok: true, id: result[0]?.id });
}

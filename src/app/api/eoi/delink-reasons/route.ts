import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const GLB_STATE = 'GLB';
const GLB_TYPE = 'all';
const FIELD_NAME = 'delink_reasons';

/** Parse the comma-separated reason list from the DB row. */
function parseReasons(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

/**
 * GET /api/eoi/delink-reasons
 *
 * Returns all delink reasons, sorted alphabetically.
 */
export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT field_value FROM eoi_template_values
    WHERE state = ${GLB_STATE} AND property_type = ${GLB_TYPE} AND field_name = ${FIELD_NAME}`;
  const raw = rows[0]?.field_value || '';
  const reasons = parseReasons(raw);
  return NextResponse.json({ reasons });
}

/**
 * POST /api/eoi/delink-reasons
 *
 * Adds a new delink reason.
 * Body: { text: string, updated_by?: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, updated_by } = body;

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Reason text is required' }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    SELECT field_value FROM eoi_template_values
    WHERE state = ${GLB_STATE} AND property_type = ${GLB_TYPE} AND field_name = ${FIELD_NAME}`;

  const existing = parseReasons(rows[0]?.field_value || '');
  const trimmed = text.trim();

  // Check for duplicate (case-insensitive)
  if (existing.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
    return NextResponse.json({ error: 'Reason already exists' }, { status: 409 });
  }

  const updated = [...existing, trimmed].sort((a, b) => a.localeCompare(b));
  const newValue = updated.join(', ');

  if (rows.length === 0) {
    await sql`
      INSERT INTO eoi_template_values (state, property_type, field_name, field_value, updated_by)
      VALUES (${GLB_STATE}, ${GLB_TYPE}, ${FIELD_NAME}, ${newValue}, ${updated_by || 'system'})`;
  } else {
    await sql`
      UPDATE eoi_template_values
      SET field_value = ${newValue}, updated_by = ${updated_by || 'system'}, updated_at = NOW()
      WHERE state = ${GLB_STATE} AND property_type = ${GLB_TYPE} AND field_name = ${FIELD_NAME}`;
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/eoi/delink-reasons
 *
 * Removes a delink reason by text.
 * Body: { text: string, updated_by?: string }
 */
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { text, updated_by } = body;

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    SELECT field_value FROM eoi_template_values
    WHERE state = ${GLB_STATE} AND property_type = ${GLB_TYPE} AND field_name = ${FIELD_NAME}`;

  const existing = parseReasons(rows[0]?.field_value || '');
  const filtered = existing.filter(r => r !== text);
  const newValue = filtered.join(', ');

  await sql`
    UPDATE eoi_template_values
    SET field_value = ${newValue}, updated_by = ${updated_by || 'system'}, updated_at = NOW()
    WHERE state = ${GLB_STATE} AND property_type = ${GLB_TYPE} AND field_name = ${FIELD_NAME}`;

  return NextResponse.json({ ok: true });
}

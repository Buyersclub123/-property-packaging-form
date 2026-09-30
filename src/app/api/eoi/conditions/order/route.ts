import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/eoi/conditions/order
 *
 * Updates the sort order and is_default status for conditions belonging
 * to a given state + property_type. Also increments usage_count for
 * conditions marked as default.
 */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { state, property_type, conditions, updated_by } = body;

  if (!state || !property_type || !Array.isArray(conditions)) {
    return NextResponse.json(
      { error: 'state, property_type, and conditions[] are required' },
      { status: 400 }
    );
  }

  const sql = getDb();
  let updated = 0;

  // Snapshot the current conditions for this state/type before making changes
  const before = await sql`
    SELECT id, text, sort_order, is_default
    FROM special_conditions
    WHERE state = ${state} AND property_type = ${property_type}
      AND is_default = true
    ORDER BY sort_order, id`;
  const beforeTexts = before.map((r) => r.text as string);

  // Mark any conditions for this state/type NOT in the list as is_default = false
  await sql`
    UPDATE special_conditions
    SET is_default = false
    WHERE state = ${state} AND property_type = ${property_type}
      AND is_default = true`;

  for (const c of conditions) {
    const { id, sort_order, is_default } = c;
    if (id === undefined || sort_order === undefined) continue;

    await sql`
      UPDATE special_conditions
      SET sort_order = ${sort_order},
          is_default = ${is_default ?? true},
          state = ${state},
          property_type = ${property_type}
      WHERE id = ${id}`;
    updated++;
  }

  // Snapshot after — the new condition list
  const afterTexts: string[] = conditions
    .filter((c: { text?: string }) => c.text)
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((c: { text: string }) => c.text);

  // Determine added and removed conditions
  const added = afterTexts.filter((t) => !beforeTexts.includes(t));
  const removed = beforeTexts.filter((t) => !afterTexts.includes(t));

  // Audit log — one entry per added/removed condition
  const user = updated_by || 'unknown';
  const fieldPrefix = `${state}/${property_type}`;
  try {
    for (const text of removed) {
      await sql`
        INSERT INTO eoi_audit_log (table_name, field_name, old_value, new_value, changed_by)
        VALUES (${'special_conditions'}, ${`${fieldPrefix}/condition_removed`}, ${text}, ${null}, ${user})`;
    }
    for (const text of added) {
      await sql`
        INSERT INTO eoi_audit_log (table_name, field_name, old_value, new_value, changed_by)
        VALUES (${'special_conditions'}, ${`${fieldPrefix}/condition_added`}, ${null}, ${text}, ${user})`;
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, updated });
}

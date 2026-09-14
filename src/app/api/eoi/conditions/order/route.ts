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
  const { state, property_type, conditions } = body;

  if (!state || !property_type || !Array.isArray(conditions)) {
    return NextResponse.json(
      { error: 'state, property_type, and conditions[] are required' },
      { status: 400 }
    );
  }

  const sql = getDb();
  let updated = 0;

  // Collect IDs that should remain active (is_default = true)
  const activeIds = conditions.map((c: { id: number }) => c.id).filter((id: number) => id != null);

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

  return NextResponse.json({ ok: true, updated });
}

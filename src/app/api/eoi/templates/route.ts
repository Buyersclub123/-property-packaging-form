import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS'];
const VALID_TYPES = ['established', 'new_single', 'house_and_land'];

/**
 * GET /api/eoi/templates?state=NSW&type=established
 *
 * Returns template values, special conditions, and recent audit log
 * for the given state + property type combination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'NSW';
  const propertyType = searchParams.get('type') || 'established';

  if (!VALID_STATES.includes(state) || !VALID_TYPES.includes(propertyType)) {
    return NextResponse.json({ error: 'Invalid state or type' }, { status: 400 });
  }

  const sql = getDb();

  // Template values
  const valueRows = await sql`
    SELECT field_name, field_value, updated_by, updated_at
    FROM eoi_template_values
    WHERE state = ${state} AND property_type = ${propertyType}
    ORDER BY field_name`;

  const values: Record<string, string> = {};
  const valueMeta: Record<string, { updated_by: string | null; updated_at: string | null }> = {};
  for (const row of valueRows) {
    values[row.field_name as string] = row.field_value as string;
    valueMeta[row.field_name as string] = {
      updated_by: row.updated_by as string | null,
      updated_at: row.updated_at as string | null,
    };
  }

  // For H&L, also fetch established values so we can show inheritance
  let establishedValues: Record<string, string> | null = null;
  if (propertyType === 'house_and_land') {
    const estRows = await sql`
      SELECT field_name, field_value
      FROM eoi_template_values
      WHERE state = ${state} AND property_type = ${'established'}
      ORDER BY field_name`;
    establishedValues = {};
    for (const row of estRows) {
      establishedValues[row.field_name as string] = row.field_value as string;
    }
  }

  // Special conditions for this state/type
  const conditionRows = await sql`
    SELECT id, text, state, property_type, is_default, sort_order, usage_count
    FROM special_conditions
    WHERE (state = ${state} AND property_type = ${propertyType})
       OR (state IS NULL AND property_type IS NULL)
    ORDER BY sort_order, id`;

  // Recent audit log entries for this state/type
  const auditRows = await sql`
    SELECT field_name, old_value, new_value, changed_by, changed_at
    FROM eoi_audit_log
    WHERE table_name = ${'eoi_template_values'}
      AND old_value IS DISTINCT FROM new_value
    ORDER BY changed_at DESC
    LIMIT ${20}`;

  // Filter audit to this state/type by checking field_name format: "STATE/TYPE/field"
  const auditLog = auditRows
    .filter((r) => {
      const fn = r.field_name as string;
      return fn.startsWith(`${state}/${propertyType}/`);
    })
    .map((r) => ({
      field_name: (r.field_name as string).split('/').pop(),
      old_value: r.old_value,
      new_value: r.new_value,
      changed_by: r.changed_by,
      changed_at: r.changed_at,
    }));

  return NextResponse.json({
    values,
    valueMeta,
    establishedValues,
    special_conditions: conditionRows,
    audit_log: auditLog,
  });
}

/**
 * PUT /api/eoi/templates
 *
 * Updates one or more template values and logs changes to eoi_audit_log.
 */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { state, property_type, changes, updated_by } = body;

  if (!state || !property_type || !Array.isArray(changes) || changes.length === 0) {
    return NextResponse.json({ error: 'state, property_type, and changes[] are required' }, { status: 400 });
  }
  if (!VALID_STATES.includes(state) || !VALID_TYPES.includes(property_type)) {
    return NextResponse.json({ error: 'Invalid state or type' }, { status: 400 });
  }

  const sql = getDb();
  const results: { field_name: string; old_value: string; new_value: string }[] = [];

  for (const change of changes) {
    const { field_name, field_value } = change;
    if (!field_name || field_value === undefined) continue;

    // Read current value
    const current = await sql`
      SELECT id, field_value FROM eoi_template_values
      WHERE state = ${state} AND property_type = ${property_type} AND field_name = ${field_name}`;

    const oldValue = current.length > 0 ? (current[0].field_value as string) : '';

    if (current.length > 0) {
      if (oldValue !== field_value) {
        await sql`
          UPDATE eoi_template_values
          SET field_value = ${field_value}, updated_by = ${updated_by || 'unknown'}, updated_at = NOW()
          WHERE state = ${state} AND property_type = ${property_type} AND field_name = ${field_name}`;

        // Audit log
        await sql`
          INSERT INTO eoi_audit_log (table_name, record_id, field_name, old_value, new_value, changed_by)
          VALUES (${'eoi_template_values'}, ${current[0].id as number}, ${`${state}/${property_type}/${field_name}`}, ${oldValue}, ${field_value}, ${updated_by || 'unknown'})`;

        results.push({ field_name, old_value: oldValue, new_value: field_value });
      }
    } else {
      // Insert new value (e.g. H&L override that didn't exist yet)
      await sql`
        INSERT INTO eoi_template_values (state, property_type, field_name, field_value, updated_by)
        VALUES (${state}, ${property_type}, ${field_name}, ${field_value}, ${updated_by || 'unknown'})`;

      await sql`
        INSERT INTO eoi_audit_log (table_name, field_name, old_value, new_value, changed_by)
        VALUES (${'eoi_template_values'}, ${`${state}/${property_type}/${field_name}`}, ${null}, ${field_value}, ${updated_by || 'unknown'})`;

      results.push({ field_name, old_value: '', new_value: field_value });
    }
  }

  return NextResponse.json({ ok: true, updated: results.length, changes: results });
}

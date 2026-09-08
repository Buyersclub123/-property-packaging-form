import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Seed data — lifted from the production GHL funnel page and verified against
// src/app/eoi-demo/templates.ts (which was itself verified against the HTML).
// ---------------------------------------------------------------------------

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS'] as const;

const ESTABLISHED: Record<string, Record<string, string>> = {
  NSW: {
    deposit_amount: '0.25% (typical)',
    deposit_payable: '0.25% deposit upon exchange and balance of deposit upon contract becoming unconditional',
    finance: 'N/A — minimum 21-day cooling-off period applies',
    building_pest: 'N/A — minimum 21-day cooling-off period applies',
    commission: 'As Per IBA',
    settlement: '42 Days from exchange date',
  },
  VIC: {
    deposit_amount: '$5,000',
    deposit_payable: '5% deposit upon exchange and balance of deposit upon contract becoming unconditional',
    finance: '28 days from exchange date to satisfy',
    building_pest: '14 days from exchange date',
    commission: 'As Per IBA',
    settlement: '42 Days from exchange date',
  },
  QLD: {
    deposit_amount: '$5,000',
    deposit_payable: '2 business days from exchange date',
    finance: '28 days from exchange date to satisfy',
    building_pest: '14 days from exchange date',
    commission: 'As Per IBA',
    settlement: '42 Days from exchange date',
  },
  WA: {
    deposit_amount: '$5,000',
    deposit_payable: '2 business days from exchange date',
    finance: '28 days from exchange date',
    building_pest: '14 days from exchange date',
    commission: 'As Per IBA',
    settlement: '42 Days from exchange date',
  },
  SA: {
    deposit_amount: '$5,000',
    deposit_payable: '2 business days from exchange date',
    finance: '28 days from exchange date to satisfy',
    building_pest: '14 days from exchange date',
    commission: 'As Per IBA',
    settlement: '42 Days from exchange date',
  },
  TAS: {
    deposit_amount: '5%',
    deposit_payable: '2 business days from exchange date',
    finance: '28 days from exchange date to satisfy',
    building_pest: '14 days from exchange date',
    commission: 'As Per IBA',
    settlement: '42 Days from exchange date',
  },
};

// H&L inherits established values but overrides commission + settlement.
const HL_OVERRIDES: Record<string, string> = {
  commission: 'As Per IBA',
  settlement: '21 Days from Registration, or 21 Days from Finance Unconditional, whichever is latter',
};

// Special conditions per state (established). H&L inherits the same set.
const GOOD_WORKING_ORDER =
  'The seller represents that at settlement all gas, electrical, hot water systems, all inclusions, plumbing fixtures and fittings will be in good working order.';
const VACANT_ACCESS =
  'If the property is vacant at unconditional: the Vendor agrees to allow the Agent access for pre-arranged open homes once the Contract becomes unconditional, and to facilitate private inspections with prospective tenants prior to settlement, to assist with securing a tenancy.';
const TENANT_STD =
  'Confirmation is required that the tenant (if applicable) has no rental arrears or outstanding court cases regarding the tenancy, and that there are no outstanding maintenance requests or pending issues between the tenant and the landlord.';
const TENANT_EVIDENCE =
  'Confirmation that the tenant (if applicable) is not in rental arrears or has any outstanding court cases regarding tenancy and NIL outstanding maintenance requested and pending between the tenant and the landlord — evidence is required.';
const WALKTHROUGH = 'Subject to walk-through video satisfaction.';
const CLEANED = 'Property to be professionally cleaned prior to settlement if vacated.';
const PRE_SETTLEMENT = 'Pre-settlement inspection required.';

const CONDITIONS: Record<string, string[]> = {
  NSW: [
    'Minimum 21-day cooling-off period.',
    GOOD_WORKING_ORDER,
    VACANT_ACCESS,
    TENANT_STD,
    WALKTHROUGH,
    CLEANED,
    PRE_SETTLEMENT,
  ],
  VIC: [
    GOOD_WORKING_ORDER,
    VACANT_ACCESS,
    TENANT_STD,
    'Subject to Victorian Tenancy Compliance Report being fully compliant.',
    WALKTHROUGH,
    CLEANED,
    PRE_SETTLEMENT,
  ],
  QLD: [
    GOOD_WORKING_ORDER,
    VACANT_ACCESS,
    TENANT_STD,
    WALKTHROUGH,
    CLEANED,
    PRE_SETTLEMENT,
  ],
  WA: [
    GOOD_WORKING_ORDER,
    TENANT_EVIDENCE,
    VACANT_ACCESS,
    WALKTHROUGH,
    CLEANED,
    PRE_SETTLEMENT,
  ],
  SA: [
    'Standard 2 business days cooling-off period from the date the Form is obtained.',
    GOOD_WORKING_ORDER,
    TENANT_EVIDENCE,
    VACANT_ACCESS,
    WALKTHROUGH,
    CLEANED,
    PRE_SETTLEMENT,
  ],
  TAS: [
    GOOD_WORKING_ORDER,
    TENANT_STD,
    VACANT_ACCESS,
    WALKTHROUGH,
    CLEANED,
    PRE_SETTLEMENT,
  ],
};

/**
 * GET /api/admin/db-setup?secret=...
 *
 * Creates all tables (idempotent) and seeds template values + special
 * conditions if those tables are empty. Safe to call repeatedly.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (!process.env.DEAL_SHEET_WEBHOOK_SECRET || secret !== process.env.DEAL_SHEET_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  const log: string[] = [];

  try {
    // ---- Schema creation ----------------------------------------------------
    await sql`
      CREATE TABLE IF NOT EXISTS eoi_template_values (
        id            SERIAL PRIMARY KEY,
        state         VARCHAR(3) NOT NULL,
        property_type VARCHAR(20) NOT NULL,
        field_name    VARCHAR(50) NOT NULL,
        field_value   TEXT NOT NULL,
        updated_by    VARCHAR(100),
        updated_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(state, property_type, field_name)
      )`;
    log.push('Table eoi_template_values: OK');

    await sql`
      CREATE TABLE IF NOT EXISTS special_conditions (
        id            SERIAL PRIMARY KEY,
        text          TEXT NOT NULL,
        state         VARCHAR(3),
        property_type VARCHAR(20),
        is_default    BOOLEAN DEFAULT FALSE,
        sort_order    INT DEFAULT 0,
        usage_count   INT DEFAULT 0,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )`;
    log.push('Table special_conditions: OK');

    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id            SERIAL PRIMARY KEY,
        type          VARCHAR(20) NOT NULL,
        name          VARCHAR(200),
        company       VARCHAR(200),
        email         VARCHAR(200),
        phone         VARCHAR(50),
        address       TEXT,
        notes         TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        last_used_at  TIMESTAMPTZ
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type)`;
    log.push('Table contacts: OK');

    await sql`
      CREATE TABLE IF NOT EXISTS eoi_sends (
        id                  SERIAL PRIMARY KEY,
        record_id           VARCHAR(50) NOT NULL,
        opportunity_id      VARCHAR(50),
        property_address    TEXT,
        send_type           VARCHAR(20) NOT NULL,
        offer_price         DECIMAL(12,2),
        agent_email         VARCHAR(200),
        agent_contact_id    INT REFERENCES contacts(id),
        sent_by             VARCHAR(100),
        sent_at             TIMESTAMPTZ DEFAULT NOW(),
        delivery_status     VARCHAR(20) DEFAULT 'pending',
        payload             JSONB,
        attachments         JSONB,
        eoi_status          VARCHAR(20) DEFAULT 'sent',
        previous_stage_id   VARCHAR(100),
        stage_move_ok       BOOLEAN,
        notes               TEXT
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_eoi_sends_record ON eoi_sends(record_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_eoi_sends_opp ON eoi_sends(opportunity_id)`;
    log.push('Table eoi_sends: OK');

    await sql`
      CREATE TABLE IF NOT EXISTS eoi_audit_log (
        id          SERIAL PRIMARY KEY,
        table_name  VARCHAR(50) NOT NULL,
        record_id   INT,
        field_name  VARCHAR(50),
        old_value   TEXT,
        new_value   TEXT,
        changed_by  VARCHAR(100),
        changed_at  TIMESTAMPTZ DEFAULT NOW()
      )`;
    log.push('Table eoi_audit_log: OK');

    await sql`
      CREATE TABLE IF NOT EXISTS client_portal_entries (
        id              SERIAL PRIMARY KEY,
        opportunity_id  VARCHAR(50) NOT NULL,
        token           VARCHAR(100) NOT NULL UNIQUE,
        entity_name     VARCHAR(300),
        purchasers      JSONB,
        submitted_at    TIMESTAMPTZ,
        confirmed       BOOLEAN DEFAULT FALSE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        expires_at      TIMESTAMPTZ
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_portal_token ON client_portal_entries(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_portal_opp ON client_portal_entries(opportunity_id)`;
    log.push('Table client_portal_entries: OK');

    // Helper: COUNT(*) returns bigint as a string through Neon HTTP driver.
    async function tableCount(table: 'eoi_template_values' | 'special_conditions'): Promise<number> {
      const rows = table === 'eoi_template_values'
        ? await sql`SELECT COUNT(*) AS n FROM eoi_template_values`
        : await sql`SELECT COUNT(*) AS n FROM special_conditions`;
      return parseInt(String(rows[0]?.n ?? '0'), 10);
    }

    // ---- Seed template values (only if table is empty) ----------------------
    const tvCount = await tableCount('eoi_template_values');
    if (tvCount === 0) {
      let inserted = 0;
      for (const state of STATES) {
        const estFields = ESTABLISHED[state];
        for (const [field, value] of Object.entries(estFields)) {
          await sql`
            INSERT INTO eoi_template_values (state, property_type, field_name, field_value, updated_by)
            VALUES (${state}, ${'established'}, ${field}, ${value}, ${'seed'})`;
          inserted++;
        }
        for (const [field, value] of Object.entries(estFields)) {
          const hlValue = HL_OVERRIDES[field] ?? value;
          await sql`
            INSERT INTO eoi_template_values (state, property_type, field_name, field_value, updated_by)
            VALUES (${state}, ${'house_and_land'}, ${field}, ${hlValue}, ${'seed'})`;
          inserted++;
        }
      }
      log.push(`Seeded eoi_template_values: ${inserted} rows`);
    } else {
      log.push(`eoi_template_values already has ${tvCount} rows — skipped seeding`);
    }

    // ---- Seed special conditions (only if table is empty) -------------------
    const scCount = await tableCount('special_conditions');
    if (scCount === 0) {
      let inserted = 0;
      for (const state of STATES) {
        const conds = CONDITIONS[state];
        for (let i = 0; i < conds.length; i++) {
          await sql`
            INSERT INTO special_conditions (text, state, property_type, is_default, sort_order)
            VALUES (${conds[i]}, ${state}, ${'established'}, ${true}, ${i})`;
          await sql`
            INSERT INTO special_conditions (text, state, property_type, is_default, sort_order)
            VALUES (${conds[i]}, ${state}, ${'house_and_land'}, ${true}, ${i})`;
          inserted += 2;
        }
      }
      log.push(`Seeded special_conditions: ${inserted} rows`);
    } else {
      log.push(`special_conditions already has ${scCount} rows — skipped seeding`);
    }

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    console.error('db-setup error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, log, error: message }, { status: 500 });
  }
}

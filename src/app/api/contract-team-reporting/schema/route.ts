import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getRedisClient } from '@/lib/redis';
import { FIELD_MAP, PROPERTY_FIELD_MAP } from '../fields';
import { sendCtrAlert, CTR_ALERT_RECIPIENTS } from '../alerts';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

const PROPERTY_OBJECT_KEY = 'custom_objects.property_reviews';

const ALERT_EMAIL_USER = process.env.ALERT_EMAIL_USER;
const ALERT_EMAIL_PASSWORD = process.env.ALERT_EMAIL_PASSWORD;
const ALERT_TO = CTR_ALERT_RECIPIENTS;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface SchemaField {
  id: string;
  key: string;            // friendly key used by the tool ('' if unknown/new)
  name: string;
  dataType: string;
  // Option pairs: GHL stores `key`, users see `label`. For opportunity fields
  // the stored value IS the label, so key === label.
  options: { key: string; label: string }[] | null;
}

interface SchemaPayload {
  fetchedAt: string;
  opportunityFields: SchemaField[];
  propertyFields: SchemaField[];
  newOpportunityFields: SchemaField[];
  newPropertyFields: SchemaField[];
}

// In-memory cache (per server instance)
let cache: { payload: SchemaPayload; at: number } | null = null;

async function fetchOpportunitySchema(): Promise<SchemaField[]> {
  const res = await fetch(
    `${GHL_BASE_URL}/locations/${GHL_LOCATION_ID}/customFields?model=opportunity`,
    {
      headers: { Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error(`GHL opportunity customFields error: ${res.status}`);
  const data = await res.json();
  return (data.customFields || [])
    .filter((f: any) => f.model === 'opportunity')
    .map((f: any) => ({
      id: f.id,
      key: FIELD_MAP[f.id] || '',
      name: f.name || '',
      dataType: f.dataType || 'TEXT',
      options: Array.isArray(f.picklistOptions)
        ? f.picklistOptions.map((o: string) => ({ key: o, label: o }))
        : null,
    }));
}

async function fetchPropertySchema(): Promise<SchemaField[]> {
  const res = await fetch(
    `${GHL_BASE_URL}/objects/${PROPERTY_OBJECT_KEY}?locationId=${GHL_LOCATION_ID}&fetchProperties=true`,
    {
      headers: { Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error(`GHL object schema error: ${res.status}`);
  const data = await res.json();
  const fields = data.fields || data.object?.fields || [];
  return fields.map((f: any) => ({
    id: f.id,
    key: (f.fieldKey || '').split('.').pop() || '',
    name: f.name || '',
    dataType: f.dataType || 'TEXT',
    options: Array.isArray(f.options)
      ? f.options.map((o: any) => ({ key: o.key, label: o.label || o.key }))
      : null,
  }));
}

async function alertNewFields(newOpp: SchemaField[], newProp: SchemaField[]): Promise<void> {
  const allNew = [...newOpp.map((f) => `opp:${f.id}`), ...newProp.map((f) => `co:${f.id}`)];
  if (allNew.length === 0) return;

  try {
    const redis = await getRedisClient();
    // Only alert once per field
    const notified = new Set(JSON.parse((await redis.get('ctr:schema-notified')) || '[]'));
    const toNotifyOpp = newOpp.filter((f) => !notified.has(`opp:${f.id}`));
    const toNotifyProp = newProp.filter((f) => !notified.has(`co:${f.id}`));
    if (toNotifyOpp.length === 0 && toNotifyProp.length === 0) return;

    if (ALERT_EMAIL_USER && ALERT_EMAIL_PASSWORD && ALERT_TO) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: ALERT_EMAIL_USER, pass: ALERT_EMAIL_PASSWORD },
      });
      const rows = (fields: SchemaField[], model: string) =>
        fields.map((f) => `<tr><td>${model}</td><td>${f.name}</td><td>${f.dataType}</td><td>${f.id}</td><td>${(f.options || []).map((o) => o.label).join(', ')}</td></tr>`).join('');
      await transporter.sendMail({
        from: ALERT_EMAIL_USER,
        to: ALERT_TO,
        subject: `[Contract Team Reporting Tool] ${toNotifyOpp.length + toNotifyProp.length} new GHL field(s) created — tool update may be needed`,
        html: `
          <h2>New GHL fields detected</h2>
          <p><strong>Why you are receiving this email:</strong> the tool's hourly schema check found field(s)
          newly created in GHL that are not yet mapped in the Contract Team Reporting Tool.</p>
          <p><strong>Impact:</strong> the new field(s) will display and filter automatically, but
          <strong>write-back (editing) for new opportunity fields will not work until the tool's field map is updated</strong>.</p>
          <p><strong>What to do:</strong> if the field(s) should be editable in the tool, ask for the field map to be updated with the IDs below.</p>
          <table border="1" cellpadding="4" cellspacing="0">
            <tr><th>Model</th><th>Field name</th><th>Type</th><th>ID</th><th>Options</th></tr>
            ${rows(toNotifyOpp, 'Opportunity')}
            ${rows(toNotifyProp, 'Custom Object')}
          </table>
          <p style="color:#888;font-size:12px">Detected ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })} (Sydney time). Each field is only notified once.</p>
        `,
      });
      console.log(`CTR schema alert sent for ${toNotifyOpp.length + toNotifyProp.length} new field(s)`);
    } else {
      console.warn('CTR schema: new fields detected but alert email env vars not configured');
    }

    // Mark as notified regardless (avoid spamming when email is unconfigured)
    for (const f of toNotifyOpp) notified.add(`opp:${f.id}`);
    for (const f of toNotifyProp) notified.add(`co:${f.id}`);
    await redis.set('ctr:schema-notified', JSON.stringify(Array.from(notified)));
  } catch (e) {
    console.error('CTR schema alert error:', e);
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return NextResponse.json(cache.payload);
    }

    const [opportunityFields, propertyFields] = await Promise.all([
      fetchOpportunitySchema(),
      fetchPropertySchema(),
    ]);

    // Baseline: every field ID seen when the feature first ran. Only fields
    // created AFTER the baseline are treated as "new" — otherwise the ~100
    // out-of-scope opportunity fields (Pipedrive etc.) would be flagged as noise.
    const knownPropertyKeys = new Set(Object.values(PROPERTY_FIELD_MAP));
    let baseline: Set<string> | null = null;
    try {
      const redis = await getRedisClient();
      const raw = await redis.get('ctr:schema-baseline');
      if (raw) {
        baseline = new Set(JSON.parse(raw));
      } else {
        baseline = new Set([
          ...opportunityFields.map((f) => `opp:${f.id}`),
          ...propertyFields.map((f) => `co:${f.id}`),
        ]);
        await redis.set('ctr:schema-baseline', JSON.stringify(Array.from(baseline)));
      }
    } catch { /* without Redis we can't track a baseline — report no new fields */ }

    const newOpportunityFields = baseline
      ? opportunityFields.filter((f) => !f.key && !baseline!.has(`opp:${f.id}`))
      : [];
    const newPropertyFields = baseline
      ? propertyFields.filter((f) => !knownPropertyKeys.has(f.key) && !baseline!.has(`co:${f.id}`))
      : [];

    const payload: SchemaPayload = {
      fetchedAt: new Date().toISOString(),
      opportunityFields,
      propertyFields,
      newOpportunityFields,
      newPropertyFields,
    };

    cache = { payload, at: Date.now() };

    // Store latest schema so the update endpoint can write new property fields
    try {
      const redis = await getRedisClient();
      await redis.set('ctr:schema-latest', JSON.stringify(payload));
    } catch { /* Redis optional for schema serving */ }

    // Fire-and-forget alert for newly appeared fields
    alertNewFields(newOpportunityFields, newPropertyFields);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('CTR schema error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendCtrAlert({
      type: 'schema-fetch-failed',
      subject: 'Hourly GHL schema check failed',
      reason: 'The tool tried to refresh field definitions (dropdown options, field types) from GHL and the request failed.',
      impact: 'The tool keeps working using its last known field configuration, but any NEW dropdown values or fields added in GHL will not appear until the schema check recovers.',
      action: 'Check GHL API status and the GHL_BEARER_TOKEN. If GHL is fine, check Vercel function logs for /api/contract-team-reporting/schema.',
      detailsHtml: `<pre>${message.slice(0, 1000)}</pre>`,
    });
    // Serve stale cache if we have one
    if (cache) return NextResponse.json(cache.payload);
    return NextResponse.json({ error: 'Failed to load GHL schema' }, { status: 500 });
  }
}

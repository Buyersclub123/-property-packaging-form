import { NextResponse } from 'next/server';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

// The 4 pipelines this tool reports on (same as the main reporting route)
const PIPELINE_IDS = new Set([
  'zgBRaMnACpskyf1wHCEV', // Finance
  'XMKCHlqekS7IU87PNLKB', // Construction
  'RDd4Kczt5mEuUhHfRr7C', // Contracts
  'zrb34FRmPnbIyAGFDeXJ', // Property Team
]);

export async function GET() {
  try {
    const response = await fetch(
      `${GHL_BASE_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
        },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `GHL API error: ${response.status} ${text}` }, { status: 502 });
    }
    const data = await response.json();
    const pipelines = (data.pipelines || [])
      .filter((p: { id: string }) => PIPELINE_IDS.has(p.id))
      .map((p: { id: string; name: string; stages?: { id: string; name: string }[] }) => ({
        id: p.id,
        name: p.name,
        stages: (p.stages || []).map((s) => ({ id: s.id, name: (s.name || '').trim() })),
      }));
    return NextResponse.json({ pipelines });
  } catch (error) {
    console.error('CTR pipelines GET error:', error);
    return NextResponse.json({ error: 'Failed to load pipelines' }, { status: 500 });
  }
}

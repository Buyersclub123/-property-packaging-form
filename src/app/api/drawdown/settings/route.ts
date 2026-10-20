import { NextRequest, NextResponse } from 'next/server';
import { readDrawdownSettingsRecord, writeDrawdownSettingsRecord } from '@/lib/drawdownSettings';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

/**
 * Shared settings for the Build Drawdown Calculator (public/calc-embed/drawdown).
 *   GET  -> { settings: object|null, updatedAt: string|null, updatedBy: string|null }
 *   POST { settings } -> same shape; server stamps updatedAt / updatedBy
 */
export async function GET() {
  try {
    const record = await readDrawdownSettingsRecord();
    return NextResponse.json(record);
  } catch (error) {
    console.error('Drawdown settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const settings = body?.settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings) || typeof settings.states !== 'object') {
      return NextResponse.json({ error: 'settings must be an object with a states map' }, { status: 400 });
    }
    const record = {
      settings,
      updatedAt: new Date().toISOString(),
      updatedBy: request.headers.get('Cf-Access-Authenticated-User-Email') || 'unknown',
    };
    await writeDrawdownSettingsRecord(record);
    return NextResponse.json(record);
  } catch (error) {
    console.error('Drawdown settings POST error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

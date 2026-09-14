import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cachePath = path.join(process.cwd(), 'scripts', 'all-opportunities.json');
    if (!fs.existsSync(cachePath)) {
      return NextResponse.json(
        { error: 'No cached opportunities. Run: node scripts/match-unlinked.js first.' },
        { status: 404 }
      );
    }
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return NextResponse.json({ opportunities: data, total: data.length });
  } catch (error) {
    console.error('Cached opportunities error:', error);
    return NextResponse.json({ error: 'Failed to load cached opportunities' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cachePath = path.join(process.cwd(), 'scripts', 'unlinked-properties.json');
    if (!fs.existsSync(cachePath)) {
      return NextResponse.json(
        { error: 'No cached data. Run: node scripts/cache-unlinked-csv.js first.' },
        { status: 404 }
      );
    }
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return NextResponse.json({ properties: data, total: data.length });
  } catch (error) {
    console.error('Unlinked properties error:', error);
    return NextResponse.json({ error: 'Failed to load unlinked properties' }, { status: 500 });
  }
}

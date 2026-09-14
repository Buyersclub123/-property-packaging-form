import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cachePath = path.join(process.cwd(), 'scripts', 'eoi-records.json');
    if (!fs.existsSync(cachePath)) {
      return NextResponse.json(
        { error: 'No cached records. Run: node scripts/cache-eoi-records.js first.' },
        { status: 404 }
      );
    }
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return NextResponse.json({ records: data, total: data.length });
  } catch (error) {
    console.error('Cached records error:', error);
    return NextResponse.json({ error: 'Failed to load cached records' }, { status: 500 });
  }
}

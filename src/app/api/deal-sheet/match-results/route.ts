import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cachePath = path.join(process.cwd(), 'scripts', 'match-results.json');
    if (!fs.existsSync(cachePath)) {
      return NextResponse.json(
        { error: 'No match results. Run: node scripts/match-unlinked.js first.' },
        { status: 404 }
      );
    }
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Match results error:', error);
    return NextResponse.json({ error: 'Failed to load match results' }, { status: 500 });
  }
}

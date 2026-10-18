import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCfEmail } from '@/lib/cloudflareAuth';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'purchase-analytics');
const ALLOWED = new Set(['PDF_Queue_v1.csv', 'Stage1_Contracts_v2.csv']);

export async function GET(request: NextRequest, { params }: { params: { file: string } }) {
  if (!getCfEmail(request) && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const file = params.file;
  if (!ALLOWED.has(file)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `${file} is not deployed` }, { status: 404 });
  }
  return new NextResponse(fs.readFileSync(filePath, 'utf8'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const EXCLUSIONS_FILE = path.join(process.cwd(), 'data', 'shay-report-exclusions.json');

function ensureDir() {
  const dir = path.dirname(EXCLUSIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadExclusions(): string[] {
  try {
    if (fs.existsSync(EXCLUSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(EXCLUSIONS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveExclusions(list: string[]) {
  ensureDir();
  fs.writeFileSync(EXCLUSIONS_FILE, JSON.stringify(list, null, 2));
}

export async function GET() {
  return NextResponse.json({ exclusions: loadExclusions() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const list = loadExclusions();
  if (!list.includes(name.trim())) {
    list.push(name.trim());
    saveExclusions(list);
  }

  return NextResponse.json({ success: true, exclusions: list });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { name } = body;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  let list = loadExclusions();
  list = list.filter((n) => n !== name.trim());
  saveExclusions(list);

  return NextResponse.json({ success: true, exclusions: list });
}

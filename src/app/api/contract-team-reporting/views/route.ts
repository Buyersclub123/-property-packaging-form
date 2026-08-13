import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

const VIEWS_KEY = 'ctr:public-views';

interface SavedViewFilter {
  field: string;
  operator: string;
  value: string;
}

interface SavedColumnDef {
  key: string;
  label: string;
  width: number;
  color?: string;
  endStateValues?: string[];
}

interface SavedView {
  id: string;
  name: string;
  section: 'Standard' | 'Custom' | 'Exception';
  filters: SavedViewFilter[];
  columns: SavedColumnDef[];
  sortBy: string;
  sortDir: 'asc' | 'desc' | null;
  updatedAt: string;
  updatedBy?: string;
}

async function loadViews(): Promise<SavedView[]> {
  const redis = await getRedisClient();
  const raw = await redis.get(VIEWS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveViews(views: SavedView[]): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(VIEWS_KEY, JSON.stringify(views));
}

export async function GET() {
  try {
    const views = await loadViews();
    return NextResponse.json({ views });
  } catch (error) {
    console.error('CTR views GET error:', error);
    return NextResponse.json({ error: 'Failed to load views' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const view = body.view as SavedView;
    if (!view?.id || !view?.name) {
      return NextResponse.json({ error: 'view.id and view.name are required' }, { status: 400 });
    }
    const views = await loadViews();
    const idx = views.findIndex((v) => v.id === view.id);
    view.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      views[idx] = view;
    } else {
      views.push(view);
    }
    await saveViews(views);
    return NextResponse.json({ success: true, views });
  } catch (error) {
    console.error('CTR views POST error:', error);
    return NextResponse.json({ error: 'Failed to save view' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    let views = await loadViews();
    views = views.filter((v) => v.id !== id);
    await saveViews(views);
    return NextResponse.json({ success: true, views });
  } catch (error) {
    console.error('CTR views DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete view' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { emailFromHeaders } from '@/lib/tileAccess';
import { canDeleteAnyView } from '@/lib/ctrViewDeleters';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

// Public folders in the CTRT View dropdown and which folder each built-in/public view sits in.
// Views with no assignment sit in Contract Team. Personal views are never stored here.
const FOLDERS_KEY = 'ctr:view-folders';
const DEFAULT_FOLDER = 'contract-team';

interface ViewFolder {
  id: string;
  name: string;
  deletable?: boolean;
}

interface FolderState {
  folders: ViewFolder[];
  assignments: Record<string, string>;
}

function defaultState(): FolderState {
  return {
    folders: [
      { id: 'contract-team', name: 'Contract Team' },
      { id: 'property-team', name: 'Property Team' },
      { id: 'jt', name: 'JT', deletable: true },
    ],
    assignments: {},
  };
}

async function loadState(): Promise<FolderState> {
  const redis = await getRedisClient();
  const raw = await redis.get(FOLDERS_KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.folders)) return defaultState();
    return { folders: parsed.folders, assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {} };
  } catch {
    return defaultState();
  }
}

async function saveState(state: FolderState): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(FOLDERS_KEY, JSON.stringify(state));
}

const ADMIN_ONLY = 'Only John or Julie can change view folders.';

export async function GET() {
  try {
    return NextResponse.json(await loadState());
  } catch (error) {
    console.error('CTR view folders GET error:', error);
    return NextResponse.json({ error: 'Failed to load view folders' }, { status: 500 });
  }
}

// Move a view into a public folder: { viewId, folderId }
export async function POST(request: NextRequest) {
  try {
    if (!canDeleteAnyView(emailFromHeaders(request.headers))) {
      return NextResponse.json({ error: ADMIN_ONLY }, { status: 403 });
    }
    const { viewId, folderId } = await request.json();
    if (!viewId || !folderId) {
      return NextResponse.json({ error: 'viewId and folderId are required' }, { status: 400 });
    }
    if (String(viewId).startsWith('personal-')) {
      return NextResponse.json({ error: 'Personal views stay in the Personal folder' }, { status: 400 });
    }
    const state = await loadState();
    if (!state.folders.some((f) => f.id === folderId)) {
      return NextResponse.json({ error: 'Unknown folder' }, { status: 400 });
    }
    if (folderId === DEFAULT_FOLDER) delete state.assignments[viewId];
    else state.assignments[viewId] = folderId;
    await saveState(state);
    return NextResponse.json(state);
  } catch (error) {
    console.error('CTR view folders POST error:', error);
    return NextResponse.json({ error: 'Failed to move view' }, { status: 500 });
  }
}

// Delete a deletable folder (JT): { folderId }. Its views go back to Contract Team.
export async function DELETE(request: NextRequest) {
  try {
    if (!canDeleteAnyView(emailFromHeaders(request.headers))) {
      return NextResponse.json({ error: ADMIN_ONLY }, { status: 403 });
    }
    const { folderId } = await request.json();
    const state = await loadState();
    const folder = state.folders.find((f) => f.id === folderId);
    if (!folder) return NextResponse.json({ error: 'Unknown folder' }, { status: 400 });
    if (!folder.deletable) return NextResponse.json({ error: `The "${folder.name}" folder can't be deleted` }, { status: 400 });
    state.folders = state.folders.filter((f) => f.id !== folderId);
    for (const [viewId, fid] of Object.entries(state.assignments)) if (fid === folderId) delete state.assignments[viewId];
    await saveState(state);
    return NextResponse.json(state);
  } catch (error) {
    console.error('CTR view folders DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}

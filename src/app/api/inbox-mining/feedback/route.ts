import { NextResponse } from 'next/server';
import { ensureTables, getItem, setFeedback, feedbackCounts } from '@/lib/inboxMining/store';
import { FEEDBACK_OUTCOMES, suggestionKey, type FeedbackEntry, type FeedbackOutcome, type Suggestion } from '@/lib/inboxMining/types';
import { getCfEmail } from '@/lib/cloudflareAuth';

// Feedback on suggestions only: stored on the item in inbox_items.feedback. Nothing is written to GHL.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const days = parseInt(new URL(request.url).searchParams.get('days') || '14', 10);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return NextResponse.json({ error: `days must be 1-90 (got ${days})` }, { status: 400 });
  }
  try {
    await ensureTables();
    const counts = await feedbackCounts(new Date(Date.now() - days * 86_400_000));
    return NextResponse.json({ counts, outcomes: FEEDBACK_OUTCOMES });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { itemId?: unknown; key?: unknown; outcome?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const itemId = typeof body.itemId === 'number' ? body.itemId : NaN;
  const key = typeof body.key === 'string' ? body.key : '';
  const outcome = body.outcome as FeedbackOutcome;
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
  if (!FEEDBACK_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: `outcome must be one of ${FEEDBACK_OUTCOMES.join(', ')}` }, { status: 400 });
  }
  if (note.length > 2000) return NextResponse.json({ error: 'Note is longer than 2000 characters' }, { status: 400 });
  try {
    await ensureTables();
    const item = await getItem(itemId);
    if (!item) return NextResponse.json({ error: `Item ${itemId} not found` }, { status: 404 });
    const suggestions = (item.suggestions || []) as Suggestion[];
    if (!suggestions.some((s) => suggestionKey(s) === key)) {
      return NextResponse.json({ error: `Item ${itemId} has no suggestion "${key}"` }, { status: 400 });
    }
    const entry: FeedbackEntry = { outcome, note, by: getCfEmail(request) || 'JT (local dev)', at: new Date().toISOString() };
    await setFeedback(itemId, key, entry);
    return NextResponse.json({ key, entry });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

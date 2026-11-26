import { teams } from '@/lib/portalConfig';
import { canSee, emailFromHeaders, loadAccess, teamKey, toolKey } from '@/lib/tileAccess';
import { ensureReviewTables } from './store';
import { ghlUsers } from './sync';
import { TOOL_HREF, type ReviewViewer } from './types';

// Server-side access for the review-outcomes page and APIs (Tile access only hides tiles, so the API checks too).
// Everyone with access sees and records every meeting (JT 11/11) and gets Settings, full sync, the stats email and CC PAYS (JT 27/11).

// JT: always open the tool, without relying on Tile access.
const FULL_VIEW_EMAILS = ['john.t@buyersclub.com.au', 'john.e@buyersclub.com.au', 'ali.h@buyersclub.com.au', 'samara@buyersclub.com.au'];

export type ReviewAccess = { ok: true; viewer: ReviewViewer } | { ok: false; status: number; error: string };

export async function reviewAccess(h: Headers): Promise<ReviewAccess> {
  const email = emailFromHeaders(h);
  if (!email) return { ok: false, status: 401, error: 'Not signed in.' };
  try {
    await ensureReviewTables();
    const data = await loadAccess();
    const team = teams.find((t) => t.subTiles.some((s) => s.href === TOOL_HREF));
    const tool = team?.subTiles.find((s) => s.href === TOOL_HREF);
    const fullView = FULL_VIEW_EMAILS.includes(email.trim().toLowerCase());
    if (!fullView && team && tool && !canSee(email, toolKey(team, tool), teamKey(team), data)) {
      return { ok: false, status: 403, error: 'Sales Meeting Outcomes is not available to you (Tile access).' };
    }
    const recorder = true;
    const users = await ghlUsers().catch(() => []);
    const mine = users.filter((u) => u.email === email);
    return { ok: true, viewer: { email, recorder, consultantIds: mine.map((u) => u.id), name: mine[0]?.name || null } };
  } catch (e) {
    return { ok: false, status: 500, error: e instanceof Error ? e.message : String(e) };
  }
}

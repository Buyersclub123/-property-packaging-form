import { teams } from '@/lib/portalConfig';
import { canSee, emailFromHeaders, groupsOf, isAdmin, loadAccess, teamKey, toolKey } from '@/lib/tileAccess';
import { ensureReviewTables } from './store';
import { ghlUsers } from './sync';
import { RECORDERS_GROUP, TOOL_HREF, type ReviewViewer } from './types';

// Server-side access for the review-outcomes page and APIs (Tile access only hides tiles, so the API checks too).
// 'Review recorders' (and Admin) see and record every meeting; everyone else only meetings assigned to their GHL user.

export type ReviewAccess = { ok: true; viewer: ReviewViewer } | { ok: false; status: number; error: string };

export async function reviewAccess(h: Headers): Promise<ReviewAccess> {
  const email = emailFromHeaders(h);
  if (!email) return { ok: false, status: 401, error: 'Not signed in.' };
  try {
    await ensureReviewTables();
    const data = await loadAccess();
    const team = teams.find((t) => t.subTiles.some((s) => s.href === TOOL_HREF));
    const tool = team?.subTiles.find((s) => s.href === TOOL_HREF);
    if (team && tool && !canSee(email, toolKey(team, tool), teamKey(team), data)) {
      return { ok: false, status: 403, error: 'Review Outcomes is not available to you (Tile access).' };
    }
    const recorder = groupsOf(email, data).has(RECORDERS_GROUP) || isAdmin(email, data);
    const users = await ghlUsers().catch(() => []);
    return { ok: true, viewer: { email, recorder, consultantIds: users.filter((u) => u.email === email).map((u) => u.id) } };
  } catch (e) {
    return { ok: false, status: 500, error: e instanceof Error ? e.message : String(e) };
  }
}

export function canRecord(v: ReviewViewer, assignedUserId: string | null | undefined): boolean {
  return v.recorder || (!!assignedUserId && v.consultantIds.includes(assignedUserId));
}

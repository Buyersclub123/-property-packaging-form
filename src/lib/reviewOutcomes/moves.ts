import { weekStart } from './stats';
import { sydYmd, type ReviewMeeting } from './types';

interface MeetingMove {
  appointmentId: string;
  oldStart: string;
  currentStart: string;
}

/**
 * Moves must be in observation order (seen_at, id).
 * Count an appointment once in each departed reporting week, at its first
 * observed slot in that week. Moving within, or back into, the current week
 * does not add another booking there.
 */
export function rescheduledWeeks<T extends MeetingMove>(moves: T[], from: string, to: string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const move of moves) {
    const day = sydYmd(move.oldStart);
    const week = weekStart(day);
    const key = `${move.appointmentId}:${week}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (week === weekStart(sydYmd(move.currentStart))) continue;
    if (day >= from && day <= to) result.push(move);
  }
  return result;
}

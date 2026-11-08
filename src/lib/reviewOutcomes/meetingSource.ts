// Meeting source = the GHL contact's attribution: last touch (lastAttributionSource), else first touch
// (attributionSource), else the Lead Source field. Captured on the meeting row at sync.

export type MeetingSourceLevel = 'last' | 'first' | 'lead';

export type Attribution = {
  sessionSource?: string | null;
  campaign?: string | null;
  utmCampaign?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  url?: string | null;
} | null | undefined;

export interface MeetingSource { label: string; level: MeetingSourceLevel; detail: string }

/** Sign-ups whose client had no Presentation Meeting One on or before signing. */
export const NO_MEETING_SOURCE = 'No Presentation Meeting One before signing';

export const MEETING_SOURCE_LEVEL_LABEL: Record<MeetingSourceLevel, string> = {
  last: 'Latest attribution (GHL last touch)',
  first: 'Fallback 1: first attribution (GHL first touch) - no latest attribution on the contact',
  lead: 'Fallback 2: Lead Source field - no attribution on the contact',
};

/** Landing-page slugs whose words can't be split from the URL. */
const PAGE_NAMES: Record<string, string> = { cashflowclub: 'Cashflow Club' };

const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Landing-page name from the attribution URL, e.g. ".../cashflowclub_typ?..." -> "Cashflow Club". */
export function pageName(url: string | null | undefined): string | null {
  if (!url) return null;
  let seg = '';
  try { seg = new URL(url).pathname.split('/').filter(Boolean)[0] || ''; } catch { return null; }
  let slug = seg.toLowerCase();
  try { slug = decodeURIComponent(slug); } catch { /* keep raw */ }
  slug = slug.replace(/\.html?$/, '').replace(/[_-]+(typ|ty|thank[_-]?you|thanks)$/, '');
  if (!slug || !/[a-z]/.test(slug)) return null;
  return PAGE_NAMES[slug.replace(/[_-]+/g, '')] || slug.split(/[_-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function fromAttribution(a: Attribution, level: MeetingSourceLevel): MeetingSource | null {
  const session = clean(a?.sessionSource);
  if (!a || !session) return null;
  const campaign = clean(a.campaign) || clean(a.utmCampaign) || pageName(a.url);
  const utm = [clean(a.utmSource), clean(a.utmMedium)].filter(Boolean).join(' / ');
  const page = clean(a.url)?.replace(/^https?:\/\//, '').split('?')[0] || '';
  return {
    label: campaign ? `${session} · ${campaign}` : session,
    level,
    detail: [utm && `UTM ${utm}`, page && `Page ${page}`].filter(Boolean).join('\n'),
  };
}

export function meetingSourceOf(last: Attribution, first: Attribution, leadSource: string | null): MeetingSource | null {
  const lead = clean(leadSource);
  return fromAttribution(last, 'last') || fromAttribution(first, 'first') || (lead ? { label: lead, level: 'lead', detail: '' } : null);
}

/** Tooltip for a meeting's source: fallback level, then UTM / page detail. */
export function meetingSourceTitle(level: MeetingSourceLevel | null, detail: string | null): string {
  if (!level) return 'No attribution or Lead Source on the GHL contact';
  return [MEETING_SOURCE_LEVEL_LABEL[level], detail].filter(Boolean).join('\n');
}

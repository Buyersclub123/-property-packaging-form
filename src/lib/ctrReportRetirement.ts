const originals = ['bp', 'full-fc', 'settlement', 'ocean-rise', 'build-deposit', 'uncon', 'pm-intro', 'huntly', 'golden-horizon', 'finance-tracking'];
/** Exactly the 32 report IDs already deleted by users, verified from the live
 * hidden-view store on 25 November. Visible reports are not retirement candidates. */
export const RETIRED_CTR_REPORT_IDS = new Set([
  ...originals.flatMap(id => ['', '-new', '-mined'].map(suffix => `builtin-${id}${suffix}`)),
  'builtin-valuation-access', 'builtin-val-tracking',
]);
export function retirementReason(view: { id: string }): string | null {
  return RETIRED_CTR_REPORT_IDS.has(view.id) ? 'Previously deleted report' : null;
}

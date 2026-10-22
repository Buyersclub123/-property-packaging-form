// ============================================================================
// GHL PIPELINES — SINGLE SOURCE OF TRUTH
// Every tool that queries GHL opportunities by pipeline or stage imports its
// IDs from here. If a pipeline or stage is added/removed/renamed in GHL, change
// it HERE and nowhere else.
//
// History: the "05. CONTRACTS Pipeline" (RDd4Kczt5mEuUhHfRr7C) was deleted in
// GHL in Oct 2026; its work moved into new Property Team stages (Deal Closed,
// Contract Review, Exchange WIP, Conditional).
// ============================================================================

export const PIPELINE_ID = {
  PROPERTY_TEAM: 'zrb34FRmPnbIyAGFDeXJ', // 04. PROPERTY TEAM Pipeline
  FINANCE: 'zgBRaMnACpskyf1wHCEV',       // 06. FINANCE Pipeline
  CONSTRUCTION: 'XMKCHlqekS7IU87PNLKB',  // 07. CONSTRUCTION Pipeline
} as const;

export type PipelineKey = keyof typeof PIPELINE_ID;

// Short display names used by the reporting tools (GHL names carry a "04. "
// prefix and "Pipeline" suffix).
export const PIPELINE_NAMES: Record<string, string> = {
  [PIPELINE_ID.PROPERTY_TEAM]: 'Property Team',
  [PIPELINE_ID.FINANCE]: 'Finance',
  [PIPELINE_ID.CONSTRUCTION]: 'Construction',
};

// All pipelines the reporting tools (CTRT, ghl-data) pull from.
export const REPORTING_PIPELINE_IDS: string[] = [
  PIPELINE_ID.FINANCE,
  PIPELINE_ID.CONSTRUCTION,
  PIPELINE_ID.PROPERTY_TEAM,
];

// Post-exchange pipelines (used as the widest search tier by the Deal Sheet).
export const POST_EXCHANGE_PIPELINE_IDS: string[] = [
  PIPELINE_ID.FINANCE,
  PIPELINE_ID.CONSTRUCTION,
];

// Property Team price-bracket stages — the legacy Deal Sheet matching page's
// Tier 1. Only PERSONAL brackets exist now; the SMSF brackets were deleted.
export const PROPERTY_TEAM_PRICE_BRACKET_STAGE_IDS: string[] = [
  '5178d032-35d5-4b8e-8694-48a1afb0145a', // $300k - $400k | PERSONAL
  '1ab3d6d1-e7cb-44c2-89ae-c32c663a4c92', // Proposals | $400k - $500k | PERSONAL
  '25e97d2a-5001-4107-9764-4d39bf1ead00', // $500k - $600k | PERSONAL
  'c050aa00-cf8a-44fe-be16-d0dc3069dd3b', // Proposals | $600k - $700k | PERSONAL
  'cef16f11-457a-4192-9ba2-c7a9f88b68d3', // $700k - $800k | PERSONAL
  '5aaeb8c3-4680-438f-b545-21e5b9e92582', // Proposals | $800k+ | PERSONAL
];

/**
 * Given the live `/opportunities/pipelines` response, return the configured
 * pipeline IDs that GHL no longer knows about. Callers must treat a non-empty
 * result as an error (alert + fail), never silently continue.
 */
export function findMissingPipelines(
  livePipelines: { id: string }[],
  configured: string[] = REPORTING_PIPELINE_IDS
): string[] {
  const live = new Set(livePipelines.map((p) => p.id));
  return configured.filter((id) => !live.has(id));
}

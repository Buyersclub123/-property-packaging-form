// Register of every non-human write path into GHL (JT, 1/11). Add a row whenever a new one is built.
// Shown on Admin > Automated updates; mirrored in docs/planning/automated-updates-register.md.
export interface AutomatedUpdate {
  name: string;
  what: string;
  trigger: string;
  fieldsWritten: string;
  rule: string;
  log: string;
}

export const AUTOMATED_UPDATES: AutomatedUpdate[] = [
  {
    name: 'Nightly change-date stamp',
    what: 'Fills change dates for changes made by hand in GHL',
    trigger: 'Vercel cron /api/contract-team-reporting/stamp-cron, daily 15:00 UTC (1-2am Sydney)',
    fieldsWritten: 'Opportunity finance_status_change_date; Property Record construction_stage_change_date, status_change_date',
    rule: 'Only where the tracked field (finance_status__residential, construction_stage, status) changed since the last snapshot AND the date is blank. Never overwrites a set date. First sight of a record = baseline only. Dry run (log only) until switched on below.',
    log: 'Postgres ctr_stamp_log (snapshots in ctr_stamp_snapshots, switch in ctr_stamp_settings)',
  },
  {
    name: 'CTRT edit change dates',
    what: 'Stamps the change date when a user changes Construction stage or Status in CTRT',
    trigger: 'Same save call as the user edit (/api/contract-team-reporting/update)',
    fieldsWritten: 'Property Record construction_stage_change_date, status_change_date',
    rule: 'Writes today (Sydney) unless the user set the date in the same save.',
    log: 'Vercel function logs; failures emailed (CTR alerts)',
  },
  {
    name: 'Sales Meeting Outcomes GHL write-back',
    what: 'Writes the meeting outcome a user clicks to the GHL appointment',
    trigger: 'User clicks an outcome in /review-outcomes, when Settings > "Write outcomes to" = DB + GHL appointment status',
    fieldsWritten: 'Calendar appointment status (showed / noshow / invalid / cancelled)',
    rule: 'Deliberate clicks only; schedule-sheet values never written; Rescheduled and clearing leave GHL unchanged; Demo never writes.',
    log: 'Postgres review_outcome_log',
  },
  {
    name: 'Finance Status change-date workflow (GHL)',
    what: 'GHL workflow stamps the date when Finance Status changes',
    trigger: 'GHL workflow: Opportunity custom field changed = Finance Status (finance_status__residential)',
    fieldsWritten: 'Opportunity finance_status_change_date',
    rule: 'Set to the workflow run date on every change (run sheet step 2b).',
    log: 'GHL > Automation > Workflows > execution logs',
  },
];

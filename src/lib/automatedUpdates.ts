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
    log: 'Postgres ctr_edit_log (every Property Record field written by a CTRT save, old -> new, with user); failures emailed (CTR alerts)',
  },
  {
    name: 'Exchange Date -> Property Record exchanged',
    what: 'When a user writes Exchange Date on an opportunity in CTRT, the linked Property Record moves to 03 Contr\' Exchanged',
    trigger: 'Same save call as the user edit (/api/contract-team-reporting/update)',
    fieldsWritten: 'Property Record status = 03_contr_exchanged, status_change_date = the exchange date',
    rule: 'Only when Exchange Date is set (not cleared) and the opp has a linked Property Record. Skipped if the record is already 03 / 04 Settled / 08 Resold, if its current status cannot be read, or if the user set Status in the same save.',
    log: 'Postgres ctr_edit_log (old -> new, with user); failures emailed (CTR alerts)',
  },
  {
    name: 'Settlement confirmed -> Settled',
    what: 'When a user ticks Settlement confirmed on an opportunity in CTRT, the opportunity moves to Property Team > Settled and the linked Property Record to 04 Settled',
    trigger: 'Same save call as the user tick (/api/contract-team-reporting/update)',
    fieldsWritten: 'Opportunity settlement_confirmed = Yes (the user edit); Opportunity pipeline/stage = Property Team > Settled; Property Record status = 04_settled, status_change_date = today (Sydney)',
    rule: 'Tick only; untick writes the checkbox and nothing else. Stage skipped if already Property Team > Settled; Property Record skipped if none is linked, it is already 04_settled, or the user set Status in the same save. Stage and Property Record are dry run (log only) until switched on below.',
    log: 'Postgres ctr_settled_log (each step before -> after with read back, plus a run row; switch in ctr_stamp_settings key settled_apply); failures emailed (CTR alerts)',
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
    name: 'Sales Meeting Outcomes Confirmed tick',
    what: 'When a user ticks Confirmed on a meeting row, the GHL appointment is set to confirmed and its title prefixed "CONFIRMED " (the Google invite subject follows); untick puts the previous status back and removes the prefix',
    trigger: 'User ticks / unticks Confirmed in /review-outcomes (/api/review-outcomes/row)',
    fieldsWritten: 'Calendar appointment appointmentStatus, title',
    rule: 'Every meeting incl. self-booked; Presentation Meeting One and Portfolio Review Meeting calendars only. Status before the tick is kept in review_outcomes.confirm_prev_status for the untick. toNotify false. Demo never writes. Dry run (log only) until switched on below.',
    log: 'Postgres review_outcome_log action confirm_ghl (before -> after with read back; switch in review_settings key confirm_apply)',
  },
  {
    name: 'Link reconciliation sweep',
    what: 'Keeps the opportunity\'s Property Record mirrors in line with the record (the Property Record is the master: linked_opportunity_id)',
    trigger: 'Vercel cron /api/contract-team-reporting/link-sweep-cron every 15 min (records and opps updated since the last run) + /api/contract-team-reporting/link-sweep-cron/full daily 15:30 UTC (every record with linked_opportunity_id)',
    fieldsWritten: 'Opportunity linked_property_record_id, linked_property_address, property_record_ctrt_link',
    rule: 'Writes a mirror only when it is blank or differs from the record (address never blanked; CTRT link accepted as record?id=<record> or record?opp=<opp>, written as record?opp=<opp>). Report only, never fixed: a record whose linked_opportunity_id changed outside the Deal Sheet, an opp whose linked record no longer points back, a record linked to a missing opp. Reported cases listed under Link mismatch below and emailed (CTR alerts) once. Dry run (log only, no email) until switched on below.',
    log: 'Postgres link_sweep_log (each field before -> after with read back, record last changed by / when from GHL, opp updatedAt); runs in link_sweep_runs; cases in link_sweep_mismatch; Deal Sheet link writes in link_sweep_dealsheet; switch in ctr_stamp_settings key link_sweep_apply',
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

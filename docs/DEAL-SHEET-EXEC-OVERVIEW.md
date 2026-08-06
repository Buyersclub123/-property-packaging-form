# Deal Sheet — Executive Overview

## What It Does

The Deal Sheet is a live property records dashboard replacing the old Google Sheets deal sheet. It pulls data directly from GHL, auto-refreshes every 15 seconds, and provides a fast, filterable view of all packaged properties.

---

## Default View: Available Records

On load, the sheet shows **Available (01)** and **EOI (02)** records only. These are the active, live records that matter day-to-day.

- **Available** — Properties that have been fully packaged and approved (Packager + QA approved). Ready for BAs.
- **EOI** — Properties where a BA has expressed interest. Still active, being worked.

Other statuses (Contract Exchanged, Removed, Test) are accessible via the **Other Records** dropdown but are not loaded by default — this keeps the sheet fast.

---

## Housekeeping Filters

Two one-click filters surface records that need attention:

- **Awaiting Packager** — Records where the Packager has not yet approved. These need the packager to review and confirm.
- **Awaiting QA** — Records where Packager has approved but QA has not. These need quality assurance sign-off before going live to BAs.

These filters make it easy to identify bottlenecks in the packaging pipeline without scrolling through hundreds of rows.

---

## Auto Emails (Reminders)

Automated reminder emails are built into the system (currently disabled, ready to activate):

- **Packager Reminder** — Sends an email to the assigned packager when their records have been sitting in "Awaiting Packager" status for too long.
- **QA Reminder** — Sends an email when records are stuck in "Awaiting QA" status.

These can be turned on via an environment variable when ready. No code changes needed — just flip the switch.

---

## Views

Three preset views cover common use cases:

1. **Default (All Columns)** — The full picture. All 30 columns visible.
2. **BA View (Key Info)** — Stripped back to what a BA needs: Status, Address, Asking Price, BA Message, CONFIG, Rent, Land, Approvals.
3. **Closing View** — Focused on deals being closed: Closing BA, Close Price, Client, Close Date.

Users can also create their own custom views (saved to their browser) by choosing which columns to show/hide, setting filters, and saving with a name. A **Columns** button lets users toggle individual columns on/off via checkboxes.

---

## Key Features Summary

| Feature | Detail |
|---------|--------|
| Live data | Auto-refreshes every 15s from GHL |
| Status changes | Change status directly from the sheet — updates GHL immediately |
| PDF snapshots | Each record has a PDF link to the BA email snapshot |
| Column management | Show/hide, drag to reorder, resize |
| Filtering | Quick filters + per-column dropdowns + ID search |
| Export | CSV export of filtered or all records |
| New record highlights | Green border on records created in the last 24–72h |
| Themes | Dark / Light mode |
| Views | 3 presets + unlimited custom views per user |

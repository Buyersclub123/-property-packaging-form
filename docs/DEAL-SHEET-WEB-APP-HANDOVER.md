# Deal Sheet Web App — Handover Document

**Date:** 2026-07-21  
**Status:** Built but NOT deployed to production / NOT in active use  
**Current live system:** Google Sheet + Apps Script (Deal Sheet 2026)

---

## Overview

The new Deal Sheet is a Next.js web app that replaces the Google Sheets + Apps Script setup. It reads directly from GHL Custom Objects API and presents a filterable, sortable table with inline status editing.

---

## File Structure

```
src/app/deal-sheet/page.tsx          — Frontend component (1181 lines, single-file)
src/app/api/deal-sheet/route.ts      — GET endpoint: fetches all records from GHL, transforms to deal sheet format
src/app/api/deal-sheet/update-status/route.ts — PUT endpoint: updates a record's status in GHL
```

---

## Architecture

### Data Flow

```
GHL Custom Objects API → /api/deal-sheet (GET) → Frontend table
Frontend status change → /api/deal-sheet/update-status (PUT) → GHL API
```

- **No Google Sheet dependency** — reads/writes directly to GHL
- **No Make.com dependency** — standalone data access
- **Sort key computed on-the-fly** from `deal_type + status + price_group`

### API Configuration (Environment Variables)

| Variable | Purpose |
|----------|---------|
| `GHL_BEARER_TOKEN` | GHL API authentication |
| `GHL_LOCATION_ID` | GHL location identifier |

**GHL Object ID:** `692d04e3662599ed0c29edfa` (hardcoded in route files)

### Pagination

The GET endpoint fetches all records via paginated POST to `/objects/{objectId}/records/search`:
- Page size: 100
- Safety limit: 20 pages (2000 records max)
- All records loaded on page load (no lazy loading)

---

## Frontend Features (Implemented)

| Feature | Status |
|---------|--------|
| Sortable columns (click header) | ✅ |
| Excel-style column filters (checkbox dropdowns) | ✅ |
| Quick filters: All / Available (01) / 01+02 | ✅ |
| Clear Filters button (amber when active) | ✅ |
| Column drag-to-reorder | ✅ |
| Column resize (drag edge) | ✅ |
| Preset views (Default, BA View, Closing View) | ✅ |
| Save/load custom views (localStorage) | ✅ |
| Dark / Light / Blue themes (localStorage) | ✅ |
| Status color coding (01=green, 02=yellow, etc.) | ✅ |
| Type color coding (01=green, 02=cyan, etc.) | ✅ |
| TBC red highlighting | ✅ |
| Packager Approved / QA Approved green bg | ✅ |
| Inline status editing (double-click) | ✅ |
| Bulk status update (checkbox select + dropdown) | ✅ |
| Multi-ID filter (paste IDs) | ✅ |
| Export to CSV | ✅ |
| Portal link on property address | ✅ |
| Folder link icon | ✅ |
| Max cell height (60px default) | ✅ |

---

## Features NOT Implemented (Pending)

| # | Feature | Priority |
|---|---------|----------|
| 15 | PDF modal preview | P1 |
| 18 | Closing columns editable (BA, Price, Client, Date) | P1 |
| 19 | Auto-refresh every 60 seconds | P1 |
| 20 | Multi-column sort (Type → Status → Price Group) | P1 |
| 25 | EOI status change → prompt for Closing BA | P1 |
| 29 | Lock column widths/order behind Edit button | P1 |
| 30 | Auto-record close date on EOI | P1 |
| 44 | PDF regeneration on GHL field change | P1 |
| 31 | Clear Closing BA + Date on revert to Available | P2 |
| 47 | Preset view clears existing filters | P2 |
| 48 | Filter dropdowns scoped to visible data | P2 |
| 32-40 | Additional quick filter views (date ranges, cross-reporting) | P3 |
| 41 | Views menu split: Property Based / Exception Based | P3 |
| 45 | Admin/Config section | P3 |

See full list: `docs/deal-sheet-feature-comparison.md`

---

## Record Transformation Logic

The API route (`/api/deal-sheet/route.ts`) replicates the Make.com Scenario 03 field joins:

- **Type:** `deal_type` → formatted (underscores to spaces, title case)
- **Status:** `status` → formatted
- **Price Group:** `price_group` → formatted (`500__700` → `$500-700k`, `700` → `$700+`)
- **Asking:** `asking` + `asking_text` joined
- **Accept Acq / Total:** Established → `acceptable_acquisition__from/to`; H&L → `land_price + build_price + total_price`
- **CONFIG:** `beds/bath/garage` primary ± secondary (dual occupancy)
- **Current Rent:** Established only, sums primary+secondary for dual
- **Appraised Rent:** Range from `rent_appraisal_primary_from/to` ± secondary
- **Selling Agent:** `agent_name | agent_email | agent_mobile`
- **Portal Link:** Constructed URL with webhook params when `packager_approved = "Approved"`

---

## Status Write-back

Valid GHL status values (dropdown options):
```
01_available, 02_eoi, 03_contr_exchanged,
05_remove_no_interest, 06_remove_lost, 07_test_record
```

The PUT endpoint validates status before sending to GHL. Uses `locationId` as query string parameter (GHL requirement).

---

## Why It's Not Deployed

1. **P1 features missing** — Closing columns not editable, no auto-refresh, no PDF preview
2. **No user testing** — JT has not reviewed the web version with live data
3. **Google Sheet still active** — Team uses it daily, no migration plan agreed

---

## To Resume Development

1. Run locally: `npm run dev` → navigate to `http://localhost:3000/deal-sheet`
2. Requires `.env.local` with `GHL_BEARER_TOKEN` and `GHL_LOCATION_ID`
3. Feature comparison doc tracks all pending work: `docs/deal-sheet-feature-comparison.md`
4. No database — all state is GHL + localStorage (views/theme)

---

## Deployment Notes

- Vercel project exists: `property-packaging-form` (see `.vercel/project.json`)
- Route would be: `https://property-packaging-form.vercel.app/deal-sheet`
- No auth/login gate currently — anyone with the URL can view and edit statuses
- **Auth requirement** should be discussed before production deployment

---

## Related Docs

- `docs/deal-sheet-feature-comparison.md` — Full feature matrix with priorities
- `docs/DEAL-SHEET-SETUP-GUIDE.md` — Original Google Sheet + Apps Script setup
- Google Sheet ID: `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`

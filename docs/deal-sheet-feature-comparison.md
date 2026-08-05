# Deal Sheet Feature Comparison & Action Plan

Last Updated: 2026-05-24

## Data Validation (2026-05-24)

- Old Sheet vs GHL vs New Deal Sheet: **0 status mismatches** after GHL corrections
- 383 non-test records matched across all three sources
- 19 GHL CSV export records have column misalignment (GHL export bug, not data issue — API reads correctly)

## Feature Comparison Table

| # | Feature | Old Sheet (Apps Script) | New Tool | Action | Priority |
|---|---------|------------------------|----------|--------|----------|
| 1 | Portal Links on Property Address | Hyperlink on address when QA status = "Approved" | Portal link as separate column when packagerApproved = "approved" | ✅ Working differently but functional | P1 |
| 2 | Asking Column Color | "Off-market" → magenta bg + white text | ✅ Implemented | ✅ Done | P5 |
| 3 | Status Column Colors | 01=green, 02=yellow, 03=blue, 05=gray, 06=dark gray, 07=light gray | ✅ Implemented | ✅ Done | P5 |
| 4 | Type Column Colors | 01=green, 02=cyan, 03=yellow, 04=pink, 05=orange | ✅ Implemented | ✅ Done | P5 |
| 5 | TBC Red Formatting | Any cell with "TBC" → red bg + white text | ✅ Implemented | ✅ Done | P5 |
| 6 | QA / Packager Approved Formatting | "Approved" → green bg, font size 5 (tiny) | ✅ Green bg + tiny text for both columns | ✅ Done | P5 |
| 7 | Sheet Protection / Lock Structure | Entire sheet locked except editable columns | Read-only by default; only Status editable via dropdown | ✅ N/A for web app | P1 |
| 8 | Status Dropdown Validation | Data validation dropdown (6 values) | ✅ Inline dropdown on double-click | ✅ Done | P1 |
| 9 | Views Menu | "All records", "Available (01)", "Available + EOI (01+02)", "Clear filter" | ✅ Quick filter buttons + saved/preset views | ✅ Done | P3 |
| 10 | Status → GHL Write-back | Editing status pushes to GHL API | ✅ PUT /api/deal-sheet/update-status | ✅ Done | P1 |
| 11 | Portal Link Real-time Toggle | QA edit triggers instant link add/remove | Portal link computed at page load from current GHL data | ✅ Auto-refresh will keep it current | P1 |
| 12 | Auto Sort by Sort Key | Delayed sort after edit via trigger | ✅ Default sort by sortKey on load | ✅ Done — see #20 for multi-column sort | P1 |
| 13 | Sort Key Computation | Composite "Type - Status - Price Group" in hidden column | ✅ Computed in API | Can be removed if #20 multi-column sort is implemented | P1 |
| 14 | Auto Format + Sort on Row Insert | onChange trigger on INSERT_ROW | N/A — new records come from GHL | ✅ N/A | P1 |
| 15 | PDF Modal Preview | Opens Google Drive PDF in modal dialog | ❌ Not implemented | **Needs discussion** | P1 |
| 16 | Auto Sort Timer (every 1 min) | Time-driven trigger sorts sheet | N/A — data fresh on each load | ✅ Replaced by #19 auto-refresh | P1 |
| 17 | QA Column Warning-Only Protection | Soft lock warns before manual edit | Read-only in web app | ✅ Done | P5 |
| 18 | Closing Columns Editable | Closing BA, Price, Client, Date are unprotected | Display-only in new tool | **Needs discussion** | P1 |

## New Requirements

| # | Requirement | Status | Notes | Priority |
|---|-------------|--------|-------|----------|
| 19 | Auto-refresh data every 60 seconds | Pending | Fetches fresh data from GHL without full page reload. Interval TBD | P1 |
| 20 | Multi-column sort (no composite key needed) | Pending | Sort by Type → Status → Price Group directly. If implemented, #13 sort key can be removed | P1 |
| 21 | Blank filter support | ✅ Done | "(blank)" option in filter dropdowns | P2 |
| 22 | Multi-ID filter (paste string of IDs) | ✅ Done | Textarea accepts multiple IDs | P2 |
| 23 | Bulk status update (any status) | ✅ Done | Dropdown + bulk update button | P2 |
| 24 | Packager Approved column (separate from QA) | ✅ Done | Two distinct columns from GHL | P2 |
| 25 | EOI status change → prompt for Closing BA | Pending | When status changed to "02 EOI", popup asks which Closing BA (dropdown of available names) | P1 |
| 26 | Remove "Hide test records" toggle | Pending | No longer needed once development complete | P3 |
| 27 | Remove tick boxes (row selection checkboxes) | Pending | Remove once development/bulk updates finished. **Deferred until data cleanup complete** | P1 |
| 28 | Remember user theme preference | Pending | Persist light/dark theme choice per user (localStorage) | P3 |
| 29 | Lock column widths/order behind Edit button | Pending | Column resize and reorder only possible after pressing an "Edit" button | P1 |
| 30 | Auto-record close date on EOI | Pending | When status changed to "02 EOI", automatically set Closing Date to today | P1 |
| 44 | PDF regeneration on GHL field change | Pending | When key fields change in GHL, re-run email template builder and regenerate PDF snapshot. Currently PDF is only created once at form submission | P1 |
| 31 | Clear Closing BA + Closing Date on revert to Available | Pending | When status moved back from EOI to "01 Available", remove Closing BA and Closing Date values | P2 |
| 32 | Filter view: All non Packager Approved | Pending | Quick filter showing records where Packager Approved is blank | P3 |
| 33 | Filter view: All non QA Approved | Pending | Quick filter showing records where QA Approved is blank | P3 |
| 34 | Filter view: Properties closed this week | Pending | Filter by Closing Date within current week | P3 |
| 35 | Filter view: Properties closed this month | Pending | Filter by Closing Date within current month | P3 |
| 36 | Filter view: Properties closed this quarter | Pending | Filter by Closing Date within current quarter | P3 |
| 37 | Filter view: Properties closed this calendar year | Pending | Filter by Closing Date within current calendar year | P3 |
| 38 | Cross-reporting: closed by Sourcer | Pending | Group/filter closed properties by Sourcer | P3 |
| 39 | Cross-reporting: closed by Packager | Pending | Group/filter closed properties by Packager | P3 |
| 40 | Cross-reporting: closed by Closing BA | Pending | Group/filter closed properties by Closing BA | P3 |
| 41 | Views menu with two categories | Pending | Menu split into "Property Based" views and "Exception Based" views | P3 |
| 42 | Clear all filters button | ✅ Done | Single button to reset all active filters, views, and search back to default | — |
| 43 | Rework filters to behave like Excel | ✅ Done | Column header dropdown with checkboxes, search, Select All/Clear, sort A-Z/Z-A | — |
| 44 | PDF regeneration on GHL field change | Pending | When key fields change in GHL, re-run email template builder and regenerate PDF snapshot | P1 |
| 45 | Admin/Config section in the tool | Pending | Move admin data (BA names, Packager/Sourcer lists, pipeline stages) from external Google Sheet into an in-app admin panel | P3 |
| 46 | Clear Filters button colour indicator | ✅ Done | Button turns amber when any filter is active (quick filter, column exclusions, text search, ID filter); grey when no filters applied | P2 |
| 47 | Preset view clears existing filters | Pending | Selecting a preset/saved view should clear any active column filters, excluded filters, and ID filters before applying the view's settings | P2 |
| 48 | Filter dropdowns scoped to visible data | Pending | Column filter dropdown values should only show options that exist in the currently filtered dataset (respecting quick filters and other column filters), not the full unfiltered dataset | P2 |

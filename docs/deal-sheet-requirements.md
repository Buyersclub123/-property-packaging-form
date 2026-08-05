# Deal Sheet — P1 Requirements Specification

Last Updated: 2026-05-24

## Context

The new deal sheet is a Next.js web app that reads property records from GHL via API and displays them in a filterable, sortable table. This document specifies the P1 features to be implemented.

**Data flow:** GHL (source of truth) → API route (`/api/deal-sheet/route.ts`) → React frontend (`/deal-sheet/page.tsx`)

**PDF flow:** Property Form → Make.com Scenario 02a → generates PDF from email HTML → uploads to Google Drive folder "Deal Sheet Email PDFs" (ID: `13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A`, shared drive "Packaging" `0AFVxBPJiTmjPUk9PVA`) → file named `{recordId}.pdf`, publicly shared

---

## #15 — PDF Modal Preview

### Summary
Display a PDF preview of the property email snapshot in a modal when the user clicks on the QA Approved cell.

### Behaviour
1. The PDF preview trigger lives in the **QA Approved column** — visible only once QA Approved = "Approved"
2. On click, open a **React modal overlay** containing an iframe with: `https://drive.google.com/file/d/{fileId}/preview`
3. Modal should be dismissible (click outside, X button, Escape key)
4. Modal should be large (e.g. 80% viewport height/width) for readability

### Data Fetching (Option B — Pre-fetch)
- At deal sheet load, make **one** Google Drive API call: `files.list` on folder `13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A`
- Returns all PDF filenames (which are `{recordId}.pdf`)
- Build a lookup map: `recordId → fileId`
- Include `pdfFileId` in each record's data passed to the frontend
- No auth needed for the embed since files are publicly shared

### Important Note
- **Every non-test property MUST have a PDF.** If one is missing, it means Make.com has failed for that record — it is NOT an expected state.

### Error Handling
- If a record has QA Approved = "Approved" but NO PDF is found in the folder:
  - Show a **warning indicator** on the row (e.g. orange icon instead of normal PDF icon)
  - Send an **email notification** to john.t@buyersclub.com.au alerting that Make.com may have failed for that record
  - Email should include: Record ID, Property Address, timestamp

### Acceptance Criteria
- [ ] QA Approved cells show clickable PDF indicator when approved
- [ ] Click opens modal with embedded Google Drive PDF viewer
- [ ] PDF loads without requiring user authentication
- [ ] Missing PDF triggers warning indicator + email notification
- [ ] Modal is responsive and works on different screen sizes

---

## #18 — Closing Columns Editable

### Summary
Closing columns become editable under specific conditions tied to status changes.

### Columns & Behaviour

| Column | Editable? | Trigger | Notes |
|--------|-----------|---------|-------|
| Closing BA | Yes — via popup dropdown | Status changes to "02 EOI" or "03 Contr' Exchanged" | Mandatory — must be populated before status change completes |
| Closing Date | Auto-set | Status changes to "02 EOI" or "03 Contr' Exchanged" | Set to today's date automatically, no user prompt |
| Closing Client | Future | — | Requires GHL Opportunities integration (link clients to deals). **Deferred** until that technology is built |
| CB $ (Closing Price) | **Deferred** | — | Not editable for now |

### Write-back
- All editable closing fields write back to GHL immediately (same pattern as Status update)
- Fields: `closing_ba`, `closing_date` on the GHL custom object record

---

## #19 — Auto-Refresh Data

### Summary
Automatically refresh deal sheet data from GHL at a regular interval without full page reload.

### Current State
- Auto-refresh does NOT currently exist. The timestamp shown in the toolbar is from the last manual load/refresh.
- Users must click "Refresh" manually to get updated data.

### Behaviour
1. After initial load, set an interval timer (default: 60 seconds — TBD)
2. Fetch fresh data from `/api/deal-sheet`
3. Update the table in-place, preserving:
   - Current scroll position
   - Active filters/views
   - Column sort order
   - Column widths
   - Selected rows (if any)
4. If a user has a **dropdown open** (e.g. status edit), do NOT refresh until the interaction is complete
5. Show a subtle "last refreshed" timestamp indicator

### Acceptance Criteria
- [ ] Data refreshes automatically at configured interval
- [ ] No UI disruption during refresh (no flash, no scroll reset)
- [ ] Pause refresh when user is mid-edit
- [ ] Timestamp shows time of last successful refresh
- [ ] Refresh preserves all filter/sort/view state

---

## #20 — Multi-Column Sort

### Summary
Replace the composite sort key with direct multi-column sorting: Type → Status → Price Group.

### Behaviour
1. Default sort order on load: **Type (asc) → Status (asc) → Price Group (asc)**
2. Clicking a column header toggles sort on that column (asc → desc → no sort)
3. Multi-column sort maintained as tiebreaker hierarchy
4. If implemented, the `sortKey` field computed in the API (#13) can be removed

### Acceptance Criteria
- [ ] Default sort matches old sheet behaviour (Type → Status → Price Group)
- [ ] Column headers indicate current sort direction
- [ ] Sort persists across auto-refresh cycles
- [ ] `sortKey` computation can be removed from API if this is confirmed working

---

## #25 — Status Change → Prompt for Closing BA

### Summary
When a user changes a record's status to "02 EOI" or "03 Contr' Exchanged", prompt them to select a Closing BA from a dropdown. This is **mandatory** — the status change cannot complete without selecting a BA.

### Behaviour
1. User changes status to "02 EOI" or "03 Contr' Exchanged" via the status dropdown
2. A **popup dropdown** appears immediately asking: "Select Closing BA"
3. Dropdown shows list of available BA names (source TBD — see question below)
4. User MUST select a BA — cannot dismiss without selecting
5. On selection: writes `closing_ba` to GHL + proceeds with status change + auto-sets closing date (#30)
6. If user wants to cancel entirely, they cancel the status change (reverts to original status)

### BA Name Source (CONFIRMED)
- **API route:** `/api/bas` (already exists)
- **Data source:** Google Sheet `1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ` → tab "Packagers & Sourcers"
- **Column:** "Full Name (must match GHL Assigned BA)"
- Returns names sorted alphabetically, filtered to rows with both name and email
- No new infrastructure needed

### Acceptance Criteria
- [ ] Status change to "02 EOI" triggers mandatory Closing BA prompt
- [ ] Status change to "03 Contr' Exchanged" triggers mandatory Closing BA prompt
- [ ] Cannot proceed without selecting a BA
- [ ] Selected BA writes to GHL `closing_ba` field
- [ ] Works in conjunction with #30 (auto-set Closing Date)

---

## #29 — Lock Column Widths/Order Behind Edit Button

### Summary
Prevent accidental column resize and reorder. Only allow layout changes after pressing an "Edit Layout" button.

### Scope
- **Edit Layout unlocks:** Column widths, column order (drag-reorder)
- **Does NOT affect:** Filters, sorting, status dropdowns, views — these work normally without Edit mode
- Purely visual layout control

### Behaviour
1. By default, columns are **locked** — no resize, no drag-reorder
2. An "Edit Layout" button (toolbar area) toggles edit mode
3. In edit mode: columns can be resized and reordered via drag
4. Exiting edit mode locks the layout again
5. Layout preferences should persist (localStorage)
6. Consider a "Reset to default" option to restore original column widths/order

### Acceptance Criteria
- [ ] Columns cannot be resized or reordered by default
- [ ] Edit button enables resize/reorder
- [ ] Filters, sorting, status edits all work without Edit mode
- [ ] Layout persists across sessions (localStorage)
- [ ] Clear visual indicator of edit mode vs locked mode

---

## #30 — Auto-Record Close Date on Status Change

### Summary
When status is changed to "02 EOI" or "03 Contr' Exchanged", automatically set the Closing Date to today's date.

### Behaviour
1. Triggered alongside #25 (same status change event)
2. Set `closing_date` field in GHL to today's date (format TBD — likely YYYY-MM-DD)
3. This happens automatically — no user prompt needed for the date (only for Closing BA per #25)
4. Write to GHL in the same API call as the status update + closing BA

### Acceptance Criteria
- [ ] Status change to "02 EOI" auto-sets Closing Date to today
- [ ] Status change to "03 Contr' Exchanged" auto-sets Closing Date to today
- [ ] Date writes to GHL `closing_date` field
- [ ] Date appears in the deal sheet immediately after refresh
- [ ] Works in conjunction with #25 (Closing BA prompt)

---

## #44 — PDF Regeneration on GHL Field Change

### Summary
When ANY field that appears in the BA email is changed in GHL, regenerate the PDF snapshot. If the BA views an out-of-date PDF and makes decisions on stale data, that's unacceptable.

### Trigger
- **Any field that appears in the email template** must trigger regeneration
- This includes (but is not limited to): asking price, rent, beds/bath/garage, property address, investment highlights, proximity, rental assessment, land/build/total price, status, type, etc.
- Essentially: if it's in the email HTML built by Module 3, changing it in GHL must regenerate the PDF

### Behaviour
1. GHL field change detected (webhook or polling)
2. Re-run the email template builder (Make.com Module 3 logic) with current GHL data
3. Generate a new PDF
4. **Overwrite** the existing PDF in Google Drive (same filename `{recordId}.pdf`, same folder)
5. PDF remains publicly accessible (no sharing change needed)

### Decisions (CONFIRMED)
- **Multiple PDFs per record?** Existing system creates 3 per record (requirements bug). Only the latest matters. New tool will maintain one PDF per record.
- **Re-send email?** No. Silent PDF update only — no approval emails re-sent to BAs.
- **Implementation:** Build as new functionality in the new tool. Do not modify existing Make.com scenarios.

### Multiple PDFs Per Record (Requirements Bug)
- A PDF is created at **each approval stage**: Packager Approve, QA Approve, BA Select
- This means ~3 PDFs per record in the folder, all named `{recordId}.pdf`
- This is unnecessary — only ONE PDF is needed (the final BA version with all data)
- The earlier PDFs (Packager, QA stages) are noise and serve no purpose
- **For the new tool:** only one PDF per record should exist. Regeneration (#44) overwrites/replaces rather than accumulating
- **Existing 02a:** not being fixed now, but acknowledged as a requirements bug (creates unnecessary files at each stage)

### Drive Folder Audit (2026-05-24)

| Metric | Value |
|--------|-------|
| Total files in folder | 2,394 |
| Unique records | 487 |
| Records with duplicates | 428 (88%) |
| Worst offender | 27 copies of one record |

**Findings:**
- **6,263 byte files** are error/failed PDFs (real PDFs are ~100KB). Many records have dozens of these junk files.
- Content differs between real PDFs for the same record (different sizes: ~98KB → ~100KB → ~112KB) — confirms data changes between approval stages.
- **No evidence of field-change regeneration** — all different-sized PDFs were created within minutes/hours on the same day (the approval flow). No record shows a new PDF days/weeks later after a GHL field edit.
- **Confirmed: PDFs are NOT regenerated when GHL fields change.** #44 is genuinely new functionality required.
- The folder contains significant junk (error files + stage duplicates + dev/test reruns from Feb 2026).

### Retrieval Approach
- When pre-fetching for the deal sheet, query with `orderBy: 'modifiedTime desc'`
- **Filter out error files:** only consider PDFs with size > 10KB (real PDFs are ~100KB, error files are 6,263 bytes)
- For each record, take the newest valid PDF — this is the BA stage (final) version
- Do NOT modify existing Make.com Scenario 02a — leave it as-is

### Implementation for #44
- Build regeneration as a **new feature for the new tool** — do not extend existing Make.com scenarios
- The new tool's regeneration should overwrite/create a single updated PDF when GHL fields change
- Existing 02a scenario continues to work unchanged for the approval flow

### Acceptance Criteria
- [ ] Any email-visible field change in GHL triggers PDF regeneration
- [ ] PDF always reflects current GHL data
- [ ] Existing Drive file is overwritten (or replaced at same path)
- [ ] No manual intervention required
- [ ] BA always sees up-to-date information when viewing PDF from deal sheet

---

## #27 — Remove Tick Boxes (Deferred)

### Summary
Remove row selection checkboxes once development and bulk updates are complete.

**Status: DEFERRED** — Only implement once data cleanup is finished and bulk operations are no longer needed for maintenance.

---

## P2 Items (Documented for future implementation)

### #31 — Clear Closing BA + Closing Date on Revert to Available

When status is moved **back** from EOI/Contr' Exchanged to "01 Available":
- Clear the `closing_ba` field in GHL (set to empty)
- Clear the `closing_date` field in GHL (set to empty)
- This is the reverse of #25/#30

### #46 — Clear Filters Button Colour Indicator

- When **any** filter is active (column filters, views, search), the "Clear Filters" button should change to a subtle highlight colour (e.g. blue, orange)
- When **no** filters are active, button is grey/muted
- Gives user an at-a-glance indication that filters are applied

### #45 — Admin/Config Section in the Tool (P3)

- Move admin data (BA names, Packager/Sourcer lists, pipeline stage names) from external Google Sheet into an in-app admin panel
- Currently this data lives in Google Sheet `1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ` and is read via `/api/bas` and `/api/lookups`
- Future: manage this directly in the deal sheet tool so there's no dependency on a separate Google Sheet
- Low priority — current setup works, this is a convenience/consolidation improvement

---

## Data Validation Summary (2026-05-24)

Completed a 3-way comparison between Old Deal Sheet, GHL export, and New Deal Sheet:
- **Result:** 0 mismatches between Old Deal Sheet and New Deal Sheet after corrections
- **GHL export:** 19 records showed corrupted status values — this is a GHL CSV export bug (multiline fields causing column misalignment), NOT a data integrity issue
- **Confirmation:** New Deal Sheet reads from GHL API directly, so it reflects the true values in GHL regardless of CSV export issues
- All 11 previously mismatched records were corrected by updating statuses directly in GHL

---

## Technical Reference

### Key Files
- **Deal Sheet API:** `src/app/api/deal-sheet/route.ts` — fetches records from GHL, transforms via `transformRecord()`
- **Deal Sheet UI:** `src/app/deal-sheet/page.tsx` — React table with filters, sort, status edit
- **BA Names API:** `src/app/api/bas/route.ts` — reads from Admin Google Sheet tab "Packagers & Sourcers"
- **Lookups API:** `src/app/api/lookups/route.ts` — BA ID→Name and Stage ID→Name mappings
- **Admin Sheet:** `1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ` (Property Review System - Admin)

### Make.com Scenarios (relevant)
- **02a** — Property Review Submitted: email processing + PDF generation + upload to Drive
- **03** — Property Review Approval Webhook: field updates to GHL + deal sheet field joins + PDF retrieval

### Google Drive
- **PDF folder:** "Deal Sheet Email PDFs" — ID: `13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A`
- **Shared Drive:** "Packaging" — ID: `0AFVxBPJiTmjPUk9PVA`
- **File naming:** `{recordId}.pdf`
- **Access:** Public (anyone with link = reader)

### GHL Custom Object
- **Object ID:** `692d04e3662599ed0c29edfa`
- **Location ID:** `UJWYn4mrgGodB7KZUcHt`
- **Key fields for closing:** `closing_ba`, `closing_date`, `closing_price`, `client_closed`
- **Status field:** `status` (values like `01_available`, `02_eoi`, `03_contr_exchanged`, etc.)

---

## Items Already Complete (P1, no work needed)

| # | Feature | Status |
|---|---------|--------|
| 1 | Portal Links | ✅ Working (different approach but functional) |
| 7 | Sheet Protection | ✅ N/A for web app |
| 8 | Status Dropdown | ✅ Done |
| 10 | Status → GHL Write-back | ✅ Done |
| 11 | Portal Link Real-time | ✅ Auto-refresh handles this |
| 12 | Auto Sort | ✅ Done (sortKey on load) |
| 13 | Sort Key Computation | ✅ Done (can remove if #20 implemented) |
| 14 | Auto Format on Insert | ✅ N/A |
| 16 | Auto Sort Timer | ✅ Replaced by #19 |

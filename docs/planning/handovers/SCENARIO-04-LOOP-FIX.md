# Handover: Scenario 04 — Break the PDF Write-Back Loop

## Bigger Picture

This is part of the **Deal Sheet Real-Time Sync & PDF Regeneration** project. Full plan: `docs/DEAL-SHEET-SYNC-PLAN.md`. Test plan: `docs/planning/SCENARIO-04-TEST-PLAN.md`.

### Activity Status
| Activity | Status |
|----------|--------|
| 1. GHL Setup (pdf_link field + workflow) | ✅ Done |
| 2. Vercel KV Setup | ✅ Done |
| 3. Vercel API Routes (webhook, changes, record) | ✅ Done |
| 4. Make.com Scenario 04 | ⚠️ Working but blocked by loop |
| 5. Client-Side Polling (15s) | ✅ Done |
| 6. PDF Link Display (column in deal sheet) | ✅ Done |

### What's Working
- Path A (real-time sync): Edit in GHL → webhook → Vercel KV → deal sheet polls and updates. **Fully working.**
- Path B (PDF regen): Edit in GHL → fetch record → search lots → build HTML → generate PDF → upload → share → write link to GHL. **Fully working** — but creates an infinite loop.
- PDF column in deal sheet: 45px "PDF" clickable link. Works when pdf_link is populated.
- PDF content: Confirmed correct — full HTML template generates properly.

### What's Blocking
The **single remaining issue** is the write-back loop described below. Once fixed, the entire project is functionally complete and ready for end-to-end testing.

### What Remains After This Fix
1. End-to-end test (per `docs/planning/SCENARIO-04-TEST-PLAN.md`)
2. Backfill existing records with pdf_link (one-time script or scenario)
3. Add pdf_link write-back to Scenario 02a (so new records get it on creation)
4. Deploy to production (Vercel + publish GHL workflow + activate Make.com scenario)

---

## Problem
Make.com Scenario 04 generates a PDF on every GHL record edit, then writes the `pdf_link` back to the GHL record (Module 16). This write-back triggers the GHL "Property Review Changed" workflow again, which fires the webhook, which triggers Scenario 04 again — creating an infinite loop.

## Current State
- Scenario 04 is **working end-to-end** (PDF generates correctly, uploads to Drive, shares, writes link back)
- The loop has been confirmed (runs every ~16 seconds indefinitely)
- Scenario is currently **turned off** to stop the loop

## Architecture
```
GHL Record Edit
  → GHL Workflow: "PR New Deal Sheet Sync Trigger" (fires on ANY field change)
    → Custom Webhook to Make.com
      → Scenario 04:
        - Path A: POST to Vercel (real-time sync) ✅ no issues
        - Path B: Get Record → Search Lots → Search/Delete old PDF → Build HTML → Generate PDF → Upload → Share → Write pdf_link to GHL ← THIS CAUSES THE LOOP
```

## What We've Tried
1. **GHL Trigger Filters** — The "Property Review Changed" trigger supports a "Has changed" filter on specific fields, but only as an include (fire WHEN this field changes), not an exclude (fire when this field has NOT changed). No "Has not changed" operator exists.
2. **GHL If/Else Condition** — Added a condition between trigger and webhook. The If/Else only offers value-based operators (Is, Is not, Contains, Is empty, etc.) — no "Has changed" operator available here. Cannot detect which field triggered the change.
3. **Make.com Data Store** — Proposed storing recently-processed record IDs and skipping if found. User concern: rapid back-to-back legitimate edits could be incorrectly skipped.

## Constraints
- GHL does not expose "which field changed" in the webhook payload — it only sends the record ID
- The GHL trigger cannot exclude specific field changes
- The solution must not block legitimate rapid edits (user saves, realises mistake, saves again within seconds)

## Possible Approaches Not Yet Explored
1. **Use the GHL API differently** — Is there a way to update a GHL record field via API without triggering the "Changed" workflow? (e.g., a different endpoint, a system/internal update flag, or writing to a field type that doesn't trigger workflows)
2. **Store pdf_link outside GHL** — Don't write back to GHL at all. Store the Drive file ID in a separate database (e.g., Vercel KV, a Google Sheet, or a Make.com data store keyed by record ID). The deal sheet API would look up the PDF link from this store instead of from the GHL record.
3. **Two separate GHL workflows** — One for "real" edits (excluding pdf_link) using a tag-guard pattern. Apply a tag before writing pdf_link, and have the trigger exclude records with that tag.
4. **Conditional re-enrolment settings** — GHL workflows have re-enrolment settings. If disabled, the same record can't re-enter the workflow while it's still "in" it. Would the 16-second processing time be enough to prevent re-entry?
5. **Make.com "sleep" + compare** — At the start of Path B, wait 2 seconds, then fetch the record and compare `updatedAt` to `now - 5s`. If updatedAt is within 3 seconds of the scenario start, it's likely a bounce-back. Risky but simple.
6. **Hash comparison** — Before generating the PDF, hash all PDF-relevant fields. Store the hash after each PDF generation. On next trigger, compare hashes — if identical, skip. This handles both the loop AND the "status-only change doesn't need PDF regen" optimisation.
7. **Separate the write-back into its own scenario on a delay** — Scenario 04 generates PDF and stores the link in a data store. A separate scenario (on a 5-min schedule) reads the data store and batch-writes pdf_links to GHL. The 5-min gap ensures the bounce-back is ignored (since the scheduled check only runs once).

## Key IDs and Values
- **GHL Custom Object ID:** `692d04e3662599ed0c29edfa`
- **GHL Location ID:** `UJWYn4mrgGodB7KZUcHt`
- **GHL API Token:** `pit-1fc3120c-80a7-42d5-b8f1-b391dbf2a793`
- **Google Drive PDF Folder:** `13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A`
- **GHL Workflow:** "PR New Deal Sheet Sync Trigger"
- **Make.com Scenario:** "04 Deal sheet edits"
- **Module 16** (Write pdf_link): HTTP PUT to GHL API updating `pdf_link` field on the record

## Scenario 04 Module Map (Path B)
```
Module 10: HTTP GET — fetch full GHL record
Module 22: HTTP POST — search for project lots
Module 11: Google Drive — search for existing PDF by filename
Module 12: Google Drive — delete old PDF (error handler: Resume)
Module 21: Code — build HTML template (output: result.html_body)
Module 17: Custom JS — GeneratePDFV2 (input: {{21.result.html_body}})
Module 18: Google Drive — upload new PDF
Module 19: Google Drive — share publicly
Module 16: HTTP PUT — write pdf_link to GHL ← CAUSES LOOP
```

## Fixes Applied During This Session
1. Schedule changed from "At regular intervals" to "Immediately"
2. Filter on Module 12 removed (was blocking entire path when no file found)
3. Error handler "Resume" added to Module 12
4. Module 17 HTML field corrected from `{{21.html_body}}` to `{{21.result.html_body}}`
5. All modules confirmed working — PDF generates with correct content

## Blueprint File
Latest exported blueprint: `docs/planning/04 Deal sheet edits.blueprint (3).json`

## Goal
Find a reliable way to break the loop while:
- Allowing all legitimate edits to trigger PDF regeneration
- Not blocking rapid successive edits (user saves, spots mistake, saves again within seconds)
- Keeping the pdf_link accessible to the deal sheet (either from GHL or an alternative store)

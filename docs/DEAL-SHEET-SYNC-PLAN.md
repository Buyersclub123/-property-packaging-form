# Deal Sheet Real-Time Sync & PDF Regeneration Plan

**Last Updated:** 4 Aug 2026
**Status:** PLANNING — Not yet started

---

## Overview

A new Make.com scenario + Vercel KV infrastructure to:
1. Keep the new deal sheet in sync with GHL in real-time
2. Regenerate the PDF snapshot whenever a record changes
3. Display the PDF link in the deal sheet

**Principles:**
- All changes are additive — existing Scenario 02a remains untouched
- Old Google Sheet deal sheet continues as backup
- New GHL workflow (separate from existing) triggers new scenario
- Scenario 02a continues to handle ALL emails (Packager Approved, QA to Verify, BA Auto Send)

---

## Architecture

```
GHL Record Changes (any field)
       │
       ▼
NEW GHL Workflow ("PR New Deal Sheet Sync Trigger")
  - Trigger: Custom Object Record Updated (ANY field change)
  - Separate from existing "PR → Property Review Created" workflow
  - Existing workflow + Scenario 02a untouched
       │
       ▼
NEW Make.com Scenario ("Deal Sheet Sync + PDF Regen")
       │
       ├── Path A: Real-time Sync (fast, always runs)
       │       └── POST to Vercel webhook endpoint
       │           Body: { recordId, timestamp, secret }
       │
       └── Path B: PDF Regeneration (independent, can fail without affecting sync)
               ├── GET record from GHL
               ├── Build HTML (reuse Module 3 email logic)
               ├── GeneratePDFV2
               ├── Search Google Drive for existing {recordId}.pdf → delete if found
               ├── Upload new PDF to folder 13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A
               ├── Share publicly (anyone with link = reader)
               └── Write pdf_link (shareLink) back to GHL record
```

```
Client (Deal Sheet React App)
       │
       ├── On page load: fetch all records from /api/deal-sheet (as now)
       │
       └── Every 15s: poll /api/deal-sheet/changes?since={timestamp}
               │
               ▼
         Vercel KV returns list of changed record IDs
               │
               ▼
         Client fetches only those records individually
               │
               ▼
         Updates local state (no full re-fetch needed)
```

---

## Activities (Handoff-Ready)

Each activity is self-contained and can be handed to a fresh agent with clear inputs/outputs.

---

### Activity 1: GHL Setup (Manual — Owner)

**Who:** JT (manual in GHL)
**Time:** 5 minutes
**Dependencies:** None

**Steps:**
1. Create `pdf_link` field in Custom Object (single line text)
2. Create new GHL Workflow:
   - Name: **"PR New Deal Sheet Sync Trigger"** ✅ DONE
   - Type: Custom Object (Property Review) based workflow
   - Trigger: Property Review Changed (no filters — fires on ANY field change)
   - Action: Custom Webhook (POST) → URL to be filled after Activity 4
   - Status: Draft (do NOT publish until Make.com scenario is ready)

**Output:** `pdf_link` field key, new workflow created (webhook URL filled in after Activity 4)

---

### Activity 2: Vercel KV Setup (Manual — Owner)

**Who:** JT (Vercel dashboard + terminal)
**Time:** 10 minutes
**Dependencies:** None

**Steps:**
1. Vercel dashboard → Storage → Create Redis Database (name: `deal-sheet-sync`) ✅ DONE
   - Region: Sydney (Syd1), Plan: 250 MB ($8/mo)
   - Redis ID: 03727f82-ea44-4c35-b6c2-f8c636183c4
2. Link to `property-packaging-form` project ✅ DONE
3. Add `REDIS_URL` to `.env.local` (pull via `vercel env pull` or copy manually)
4. Add `DEAL_SHEET_WEBHOOK_SECRET=<generate a random string>` to `.env.local`
5. Run: `npm install redis` ✅ DONE

**SDK:** `import { createClient } from 'redis'` (not @vercel/kv)
**Env var:** `REDIS_URL`

**Output:** Redis database linked, env vars in `.env.local`, package installed

---

### Activity 3: Vercel API Routes (Code — Agent) ✅ DONE

**Who:** Chat agent
**Time:** ~30 mins
**Dependencies:** Activity 2 complete (env vars available)

**Files created:**
1. `src/lib/dealSheetTransform.ts` — shared `transformRecord()` + helpers + types
2. `src/lib/redis.ts` — Redis singleton with lazy-connect pattern
3. `src/app/api/deal-sheet/webhook/route.ts` — POST, receives {recordId, timestamp, secret} from Make.com
4. `src/app/api/deal-sheet/changes/route.ts` — GET, polls for changes since a given timestamp
5. `src/app/api/deal-sheet/record/[id]/route.ts` — GET, fetches + transforms single GHL record

**Modified:**
- `src/app/api/deal-sheet/route.ts` — replaced local `transformRecord()` + helpers with import from `@/lib/dealSheetTransform`

**Tested:**
- Webhook: POST → 200 with valid secret, 401 with bad secret ✅
- Changes: GET ?since={ts} → returns {changes: [{recordId, timestamp}]} ✅
- Single record: GET /record/{id} → returns transformed record ✅
- Existing route: GET /api/deal-sheet → still works ✅
- 5-min pruning: old entries cleaned on webhook POST ✅

---

### Activity 4: Make.com Scenario (Manual — Owner)

**Who:** JT (Make.com builder)
**Time:** 30-60 mins
**Dependencies:** Activity 3 deployed (webhook URL live on Vercel)

**Scenario: "Deal Sheet Sync + PDF Regeneration"**

**Module 1:** Custom Webhook (receives GHL record data)

**Router → Path A (Sync):**
- Module 2: HTTP POST to `https://property-packaging-form.vercel.app/api/deal-sheet/webhook`
  - Body: `{ "recordId": "{{1.id}}", "timestamp": "{{now}}", "secret": "{{DEAL_SHEET_WEBHOOK_SECRET}}" }`

**Router → Path B (PDF):**
- Module 3: HTTP GET record from GHL (full properties)
- Module 4: Code module (Module 3 email HTML logic — copy from 02a)
- Module 5: GeneratePDFV2 (HTML → PDF)
- Module 6: Google Drive Search (`{recordId}.pdf` in folder `13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A`)
- Module 7: IF found → Google Drive Delete
- Module 8: Google Drive Upload (filename: `{recordId}.pdf`, folder: `13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A`)
- Module 9: Google Drive Share (anyone with link = reader)
- Module 10: HTTP PUT to GHL — write `pdf_link` = shareLink to record

**Output:** Working scenario, webhook URL to give to GHL workflow (Activity 1 step 2)

---

### Activity 5: Client-Side Polling (Code — Agent)

**Who:** Chat agent
**Time:** ~20 mins
**Dependencies:** Activity 3 complete

**File to modify:** `src/app/deal-sheet/page.tsx`

**What to add:**
- `useEffect` interval polling `/api/deal-sheet/changes?since={lastPollTimestamp}` every 15 seconds
- When changes detected: fetch each changed record via `/api/deal-sheet/record/{id}`
- Update local `records` state in-place (no full re-fetch)
- Show subtle "updated" indicator when records refresh

**Output:** Deal sheet auto-updates when records change in GHL

---

### Activity 6: PDF Link Display (Code — Agent)

**Who:** Chat agent
**Time:** ~15 mins
**Dependencies:** Activity 1 (`pdf_link` field exists in GHL)

**Files to modify:**
1. `src/app/api/deal-sheet/route.ts` — add `pdfLink: p.pdf_link || ''` to `transformRecord()`
2. `src/app/deal-sheet/page.tsx` — add `pdfLink` to interface, make it clickable (opens PDF in new tab)

**Output:** PDF viewable from deal sheet when available

---

## Execution Order

```
Activity 1 (GHL fields + workflow)     ← Manual, JT
Activity 2 (Vercel KV setup)           ← Manual, JT
        │
        ▼
Activity 3 (API routes)                ← Agent, code
        │
        ├──→ Activity 5 (Client polling)    ← Agent, code
        │
        └──→ Activity 6 (PDF link display)  ← Agent, code
        │
        ▼
Activity 4 (Make.com scenario)         ← Manual, JT
        │
        ▼
Connect GHL workflow → Make.com webhook URL
        │
        ▼
End-to-end testing
```

Activities 3, 5, 6 are code tasks ideal for agent handoff.
Activities 1, 2, 4 require manual work in GHL/Vercel/Make.com dashboards.

---

## Environment Variables Needed

```
# Vercel Redis (auto-added when linking Redis in Vercel dashboard)
REDIS_URL=redis://default:***@syd1.redis.vercel-storage.com:6379

# Webhook secret (shared with Make.com scenario)
DEAL_SHEET_WEBHOOK_SECRET=<generate a random string>
```

---

## Double-Fire on Form Submission

When a form is submitted, BOTH Scenario 02a AND the new scenario will fire:
- **02a:** generates PDF + uploads + sends emails + writes to old Google Sheet
- **New scenario:** generates PDF (overwrites 02a's) + syncs to Vercel KV

This is fine — the new scenario's "search and delete" logic means no duplicates. Over time, PDF generation could be removed from 02a once stable (optional, not required).

---

## Notes

- Scenario 02a is NOT retired — it handles all email sending
- New GHL workflow is completely separate from existing "PR → Property Review Created" workflow
- Status changes are NOT excluded from the webhook trigger — simpler, minimal overhead
- Vercel KV entries auto-expire after 5 minutes — client only needs recent changes
- Full page refresh still works as fallback (fetches all records fresh from GHL)
- Old Google Sheet deal sheet is completely unaffected

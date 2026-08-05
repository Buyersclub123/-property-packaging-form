# Depreciation for Project Records — Investigation Handover

**Date:** 13 July 2026  
**Context:** During duplicate tool testing, it was observed that depreciation values for project (multi-lot) records are not being sent to GHL. This document captures the current state for investigation.

---

## Observation

The GHL field **CF Depreciation $** (`cf_depreciation_`) is **empty** for all 3 lots in a test project (Lots 412, 414, 415 — project identifier `PROJ-20260703-154554`). The question is: **was this intentional or a bug?**

---

## How Depreciation Works Today

### 1. FormData Type (`src/types/form.ts`)

There are **two places** depreciation can live:

- **Top-level** (`FormData.depreciation`) — for individual (non-project) records  
  Lines 372–384: `depreciation?: { year1?: string; ... year10?: string; }`

- **Per-lot override** (`LotDetails.cashflowOverrides.depreciation`) — for project records  
  Lines 99–118: Each lot can optionally override depreciation via `cashflowOverrides.overrideDepreciation`

### 2. Submit Endpoint (`src/app/api/ghl/submit-property/route.ts`)

Lines 194–216: The submit endpoint maps `formData.depreciation` → `cf_depreciation_` as a **comma-separated string** (e.g., `"12345,11234,10123,..."`).

**Key finding:** The submit endpoint only reads from `formData.depreciation` (top-level). It does **NOT** check `formData.lots[].cashflowOverrides.depreciation`. This means:
- For **individual records**: depreciation IS sent to GHL ✅
- For **project lots**: depreciation is **NOT sent** to GHL ❌ (unless it falls through to top-level)

### 3. Cashflow Spreadsheet Flow (`src/app/api/create-property-folder/route.ts`)

Lines 222–234: The folder creation endpoint DOES handle per-lot depreciation overrides correctly — it merges `lot.cashflowOverrides.depreciation` with `formData.depreciation` when populating the cashflow spreadsheet. So the cashflow spreadsheet gets the right values, but GHL does not.

### 4. GET Endpoint (`src/app/api/properties/[recordId]/route.ts`)

Lines 659–700: When reading a record back from GHL, it tries to parse `cf_depreciation_` from comma-separated, JSON, or individual fields. Since the field was never written for project lots, it returns empty.

---

## Summary of the Gap

| Flow | Individual Record | Project Lot |
|---|---|---|
| **Cashflow spreadsheet** | ✅ Uses `formData.depreciation` | ✅ Uses lot-level override merged with top-level |
| **GHL field (`cf_depreciation_`)** | ✅ Written via submit endpoint | ❌ **Not written** — submit only reads top-level |
| **Read back from GHL** | ✅ Parses correctly | ❌ Empty (never written) |

---

## Questions to Answer

1. **Was this intentional?** Project lots share the same insurance/depreciation/council rates unless overridden. Was the design intent to only store these values in the cashflow spreadsheet and not in GHL?

2. **If it should be in GHL:** Should each lot's record in GHL have its own `cf_depreciation_` value? If so, the submit endpoint needs updating to:
   - For project submissions, iterate over `formData.lots[]`
   - Check if `cashflowOverrides.overrideDepreciation` is true → use lot-level values
   - Otherwise → use top-level `formData.depreciation`
   - Write the resolved value to each lot's GHL record

3. **Is there a separate submission per lot?** Currently the submit endpoint creates ONE record. For projects with multiple lots, how are the individual lot records created? Are they submitted one at a time, or does the form submit all lots in a single call?

---

## Files to Review

| File | Relevance |
|---|---|
| `src/app/api/ghl/submit-property/route.ts` (lines 190–216) | Where GHL record is built — only reads top-level depreciation |
| `src/app/api/create-property-folder/route.ts` (lines 222–234) | Where cashflow spreadsheet is populated — correctly handles lot overrides |
| `src/types/form.ts` (lines 90–118, 372–384) | FormData type — both top-level and per-lot depreciation |
| `src/components/steps/Step6WashingtonBrown.tsx` | UI for entering depreciation — check how it stores values for projects |
| `src/components/steps/Step7CashflowReview.tsx` | Cashflow review step — uses `cashflowOverrides` |

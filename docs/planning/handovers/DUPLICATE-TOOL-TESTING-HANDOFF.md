# Duplicate Tool — Phase 2 Testing Handoff

## Context
The Duplicate Tool at `/admin/duplicate` now fetches real GHL records and creates new records via the GHL API. This doc guides verification testing.

## What Was Built
- `handleLoad` → fetches from `GET /api/properties/{recordId}` (existing endpoint)
- `handleSubmit` → posts to `POST /api/ghl/submit-property` (existing endpoint)
- Both endpoints already work for the main form — this is their first use in the duplicate tool context

## Test Steps

### 1. Load a source record
1. Go to `/admin/duplicate`
2. Paste a known GHL record ID (pick one with data in most fields)
3. Click "Load Record"
4. **Screenshot** the loaded Page 1 comparison table — note the "Source Value" column

### 2. Confirm fields & submit
1. On Page 1: confirm all fields (tick "Use Existing" or enter new values)
2. Step through Page 2 steps (Market Performance, Content, Cashflow, Agent)
3. On the final step, click "Create Duplicate Record"
4. **Note the new Record ID** displayed in the success banner

### 3. Verify the new record
Use the GET endpoint to fetch the newly created record and compare field values:

```
GET /api/properties/{NEW_RECORD_ID}
```

Or open the browser console on the duplicate tool page and run:
```js
fetch('/api/properties/NEW_RECORD_ID_HERE').then(r => r.json()).then(d => console.log(d.data));
```

### 4. Field-by-field comparison
Compare the new record's values against what was shown in the duplicate tool's "Effective Value" column.

Key fields to verify:
| Category | Fields |
|----------|--------|
| Address | streetNumber, streetName, suburbName, state, postCode, lga, propertyAddress |
| Decision Tree | propertyType, contractTypeSimplified, dwellingType, status, dealType |
| Property | bedsPrimary, bathPrimary, garagePrimary, landSize, buildSize |
| Price | asking, landPrice, buildPrice, totalPrice, cashbackRebateValue |
| Rental | occupancyPrimary, rentAppraisalPrimaryFrom/To, appraisedYield |
| Content | whyThisProperty, proximity, investmentHighlights |
| Agent | sellingAgentName, sellingAgentEmail, sellingAgentMobile |
| Dialogue | propertyDescriptionAdditionalDialogue, messageForBA |

### 5. Check GHL directly
Open the new record in GHL UI and verify key fields appear correctly.

## Known Gaps (not bugs — intentionally skipped)
- No Google Drive folder is created for the new record
- AMAP report is not copied (must be re-selected)
- Subject line is not computed
- Photos/attachments are not copied
- `single_or_dual_occupancy` GHL field is not written by the submit endpoint (pre-existing gap in main form too)

## Troubleshooting
- **"Failed to load record"** → Check the record ID is correct, check `.env.local` has valid `GHL_BEARER_TOKEN`
- **"Failed to create record"** → Check console/network tab for the response body, likely a field mapping issue
- **Fields missing in new record** → The submit endpoint only maps fields it knows about. Compare `src/app/api/ghl/submit-property/route.ts` field mapping

## Files
- Tool UI: `src/app/admin/duplicate/page.tsx`
- GET endpoint: `src/app/api/properties/[recordId]/route.ts`
- POST endpoint: `src/app/api/ghl/submit-property/route.ts`

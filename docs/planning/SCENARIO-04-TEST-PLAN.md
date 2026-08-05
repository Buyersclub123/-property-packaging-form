# Scenario 04 — Test Plan

## Pre-Conditions
- [ ] Scenario 04 is active in Make.com (no errors)
- [ ] Schedule set to "Immediately"
- [ ] GHL workflow "PR New Deal Sheet Sync Trigger" is active
- [ ] Dev server running at localhost:3000

## Test Record
- **Record:** Lot 99, Lapetus St, Burpengary QLD 4505
- **Record ID:** `6a56f0346f2acca22351df7d`

---

## Test 1: Path A — Real-time sync to deal sheet
**Action:** Edit a field on the test record in GHL (e.g. change BA Message)

**Expected:**
1. GHL workflow fires (check Execution Logs)
2. Make.com Scenario 04 runs immediately (check History)
3. Module 3 (POST to Vercel) returns 200
4. Deal sheet at localhost:3000/deal-sheet updates within 15s (polling)

**Result:** ___

---

## Test 2: Path B — PDF regeneration
**Action:** Same edit triggers Path B in parallel

**Expected:**
1. Module 10 (Get GHL Record) returns 200 with full record
2. Module 22 (Search lots) returns 200
3. Module 11 (Search Drive) finds existing PDF (or returns empty)
4. Module 12 (Delete) removes old PDF (if found)
5. Module 21 (Code) outputs html_body
6. Module 17 (GeneratePDFV2) generates PDF file
7. Module 18 (Upload) uploads to Drive folder `13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A`
8. Module 19 (Share) makes it public
9. Module 16 (Write pdf_link) writes link back to GHL record

**Result:** ___

---

## Test 3: PDF link in deal sheet
**Action:** After Test 2 completes, refresh deal sheet

**Expected:**
1. Record shows "PDF" link in the PDF column
2. Clicking it opens the Google Drive PDF in a new tab
3. PDF content reflects the current record data

**Result:** ___

---

## Debugging Steps (if tests fail)

### Check Make.com execution details:
- Click the failed run in History
- Identify which module errored
- Note the error message

### Common issues:
| Symptom | Likely Cause |
|---------|-------------|
| Scenario doesn't run | Schedule not set to Immediately |
| Module 10 fails | GHL API token expired |
| Module 21 fails | Code module input mapping wrong |
| Module 17 fails | html_body not passed correctly |
| Module 18 fails | Google Drive connection expired |
| Module 16 fails | Wrong module ID reference |
| PDF column empty | pdf_link field not in GHL or not mapped in transformRecord |

---

## Current Status
- **Test 1 (Path A):** PASSED — deal sheet updated on edit
- **Test 2 (Path B):** FAILED — no PDF created since 12:55
- **Test 3:** BLOCKED by Test 2

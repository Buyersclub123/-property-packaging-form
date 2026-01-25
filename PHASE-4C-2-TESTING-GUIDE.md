# Phase 4C-2: AI Summary Generation - Testing Guide

**Date:** 2026-01-21  
**Phase:** 4C-2 Testing  
**Estimated Testing Time:** 30-45 minutes

---

## Prerequisites

### Environment Setup
Ensure these environment variables are set:
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com/v1
GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS=...
GOOGLE_SHEETS_CREDENTIALS=...
GOOGLE_HOTSPOTTING_FOLDER_ID=...
```

### Test Data Required
- [ ] Real Hotspotting PDF (e.g., Sunshine Coast, Brisbane, etc.)
- [ ] Access to Google Sheet (Investment Highlights tab)
- [ ] Access to Google Drive (Hotspotting Reports folder)

---

## Test Plan

### Test 1: Basic AI Summary Generation ⭐ CRITICAL

**Objective:** Verify AI can extract infrastructure information from PDF

**Steps:**
1. Navigate to Step 5 (Investment Highlights) in the form
2. Ensure LGA/Suburb and State are filled (e.g., "Brisbane", "QLD")
3. Click "No Match Found" area (if auto-lookup doesn't find it)
4. Upload a Hotspotting PDF (drag & drop or file picker)
5. Wait for metadata extraction (~3 seconds)
6. Verify Report Name and Valid Period are extracted
7. Edit if needed, then click "✓ Confirm & Continue"
8. Wait for success message
9. Click "✨ Generate AI Summary" button
10. Wait for AI generation (~10-30 seconds)
11. Verify success message appears

**Expected Results:**
- ✅ "Generate AI Summary" button appears after PDF confirmation
- ✅ Loading spinner shows during generation
- ✅ Success message: "AI summary generated successfully!"
- ✅ Section editor appears with 7 text areas
- ✅ Main Body textarea shows combined content
- ✅ All 7 sections have content (not empty)

**Validation Checks:**
- [ ] Section 1 (Population Growth Context) is a plain paragraph
- [ ] Sections 2-6 have project entries with **bold costs**
- [ ] Section 7 (Job Implications) mentions job numbers
- [ ] Main Body combines all sections with headers
- [ ] No error messages appear

**If Test Fails:**
- Check server logs for errors
- Verify OPENAI_API_KEY is valid
- Try with different PDF
- Check PDF text extraction (should have >100 characters)

---

### Test 2: Section Editing & Real-Time Updates

**Objective:** Verify section editing updates Main Body in real-time

**Steps:**
1. After Test 1, locate the Section Editor
2. Edit "Population Growth Context" (add/remove text)
3. Observe Main Body textarea
4. Edit "Residential" section (add a new project)
5. Observe Main Body textarea again
6. Edit multiple sections
7. Verify Main Body updates each time

**Expected Results:**
- ✅ Main Body updates immediately after each edit
- ✅ Changes persist in section text areas
- ✅ Main Body format is correct (headers, bold text)
- ✅ No lag or performance issues

**Validation Checks:**
- [ ] Main Body shows edited content
- [ ] Section headers appear correctly
- [ ] Bold formatting preserved
- [ ] Line breaks maintained

---

### Test 3: Save to Google Sheet (All 15 Columns)

**Objective:** Verify all 15 columns save correctly to Google Sheet

**Steps:**
1. After editing sections in Test 2
2. Click "💾 Save All Sections" button
3. Wait for success message
4. Open Google Sheet (Investment Highlights tab)
5. Find the row for your test report (by Report Name + State)
6. Verify all 15 columns (A-O) are populated

**Expected Results:**
- ✅ Success message: "Investment highlights and sections saved successfully!"
- ✅ Row exists in Google Sheet
- ✅ All 15 columns have data

**Validation Checks:**
- [ ] Column A: Suburbs (comma-separated)
- [ ] Column B: State (e.g., "QLD")
- [ ] Column C: Report Name (e.g., "SUNSHINE COAST")
- [ ] Column D: Valid Period (e.g., "October 2025 - January 2026")
- [ ] Column E: Main Body (combined text with headers)
- [ ] Column F: Extra Info (may be empty)
- [ ] Column G: Population Growth Context (plain paragraph)
- [ ] Column H: Residential (project entries)
- [ ] Column I: Industrial (project entries)
- [ ] Column J: Commercial and Civic (project entries)
- [ ] Column K: Health and Education (project entries)
- [ ] Column L: Transport (project entries)
- [ ] Column M: Job Implications (job numbers)
- [ ] Column N: PDF Drive Link (Google Drive URL)
- [ ] Column O: PDF File ID (alphanumeric ID)

**If Test Fails:**
- Check Google Sheets API permissions
- Verify GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS is correct
- Check server logs for save errors
- Verify sheet has 15 columns (A-O)

---

### Test 4: Regenerate Summary

**Objective:** Verify regenerate functionality overwrites sections

**Steps:**
1. After Test 3, manually edit all 7 sections (change text significantly)
2. Click "🔄 Regenerate from PDF" button
3. Wait for AI generation (~10-30 seconds)
4. Verify sections are overwritten with new AI content
5. Verify Main Body updates

**Expected Results:**
- ✅ Loading spinner shows during regeneration
- ✅ All 7 sections update with new AI content
- ✅ Main Body updates automatically
- ✅ Manual edits are replaced

**Validation Checks:**
- [ ] Sections show new AI-generated content
- [ ] Previous manual edits are gone
- [ ] Main Body reflects new sections
- [ ] No errors occur

---

### Test 5: Manual Entry Fallback

**Objective:** Verify manual entry works without AI

**Steps:**
1. Start fresh (reload page or new property)
2. Navigate to Step 5 (Investment Highlights)
3. Ensure "No Match Found" appears
4. Click "Show Manual Entry Form"
5. Fill in Report Name, Valid Period, Main Body manually
6. Click "Save to Google Sheet"
7. Verify save succeeds

**Expected Results:**
- ✅ Manual entry form appears
- ✅ Save succeeds without AI sections
- ✅ Google Sheet row created with columns A-F only
- ✅ Columns G-M are empty (no AI sections)

**Validation Checks:**
- [ ] Row exists in Google Sheet
- [ ] Columns A-F have data
- [ ] Columns G-M are empty
- [ ] No errors occur

---

### Test 6: Error Handling

**Objective:** Verify error handling for common issues

#### Test 6A: Invalid File ID
**Steps:**
1. Manually call API with invalid fileId:
```bash
curl -X POST http://localhost:3000/api/investment-highlights/generate-summary \
  -H "Content-Type: application/json" \
  -d '{"fileId": "invalid-file-id"}'
```
2. Verify error response

**Expected Results:**
- ✅ Error message returned
- ✅ No crash or 500 error

#### Test 6B: Empty PDF
**Steps:**
1. Upload a blank PDF (1 page, no text)
2. Try to generate summary
3. Verify error message

**Expected Results:**
- ✅ Error: "PDF text extraction failed or returned insufficient text"
- ✅ User can retry or enter manually

#### Test 6C: OpenAI API Error (Simulated)
**Steps:**
1. Temporarily set OPENAI_API_KEY to invalid value
2. Try to generate summary
3. Verify error message
4. Restore valid API key

**Expected Results:**
- ✅ Error: "OpenAI API error: [details]"
- ✅ Retry button appears
- ✅ No crash

---

### Test 7: Performance & UX

**Objective:** Verify performance and user experience

**Metrics to Check:**
- [ ] PDF upload: < 5 seconds
- [ ] Metadata extraction: < 5 seconds
- [ ] AI generation: 10-30 seconds (acceptable)
- [ ] Section editing: instant updates
- [ ] Save to sheet: < 3 seconds

**UX Checks:**
- [ ] Loading spinners show during long operations
- [ ] Success messages are clear and helpful
- [ ] Error messages are actionable
- [ ] Buttons disable during operations
- [ ] No UI flickering or jumps

---

### Test 8: Integration with Phase 4C-1

**Objective:** Verify Phase 4C-2 works with Phase 4C-1 PDF upload

**Steps:**
1. Upload PDF (Phase 4C-1 flow)
2. Confirm metadata
3. Verify PDF organizes to CURRENT folder
4. Generate AI summary (Phase 4C-2)
5. Edit sections
6. Save all sections
7. Verify Google Sheet has all data

**Expected Results:**
- ✅ Phase 4C-1 and 4C-2 work together seamlessly
- ✅ PDF link (Column N) preserved from Phase 4C-1
- ✅ File ID (Column O) preserved from Phase 4C-1
- ✅ AI sections (Columns G-M) added by Phase 4C-2

---

## Test Results Template

### Test Summary

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Basic AI Summary Generation | ⏳ | |
| 2 | Section Editing & Real-Time Updates | ⏳ | |
| 3 | Save to Google Sheet (15 Columns) | ⏳ | |
| 4 | Regenerate Summary | ⏳ | |
| 5 | Manual Entry Fallback | ⏳ | |
| 6A | Error Handling - Invalid File ID | ⏳ | |
| 6B | Error Handling - Empty PDF | ⏳ | |
| 6C | Error Handling - OpenAI API Error | ⏳ | |
| 7 | Performance & UX | ⏳ | |
| 8 | Integration with Phase 4C-1 | ⏳ | |

**Legend:**
- ⏳ Not Started
- ✅ Passed
- ❌ Failed
- ⚠️ Partial Pass

### Issues Found

| Issue # | Severity | Description | Steps to Reproduce | Status |
|---------|----------|-------------|-------------------|--------|
| | | | | |

### Overall Assessment

**Phase 4C-2 Status:** [ ] Ready for Production / [ ] Needs Fixes / [ ] Blocked

**Tester Name:** _______________  
**Test Date:** _______________  
**Environment:** [ ] Local / [ ] Staging / [ ] Production

---

## Quick Smoke Test (5 minutes)

If you only have 5 minutes, run this minimal test:

1. ✅ Upload a Hotspotting PDF
2. ✅ Confirm metadata
3. ✅ Click "Generate AI Summary"
4. ✅ Verify 7 sections populate
5. ✅ Edit one section
6. ✅ Click "Save All Sections"
7. ✅ Check Google Sheet (verify row exists)

If all 7 steps pass, Phase 4C-2 is likely working correctly.

---

## Troubleshooting

### AI Generation Takes Too Long (>60 seconds)
- Check OpenAI API status: https://status.openai.com
- Verify network connection
- Check PDF size (should be <50MB)
- Try with smaller PDF

### Sections Are Empty After Generation
- Check server logs for parsing errors
- Verify AI response format
- Try regenerating
- Check PDF text extraction quality

### Google Sheet Not Updating
- Verify sheet permissions (service account has write access)
- Check GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS
- Verify sheet has 15 columns (A-O)
- Check for duplicate rows (should update, not duplicate)

### Main Body Not Updating After Section Edit
- Check browser console for JavaScript errors
- Verify `handleSectionChange()` is called
- Check `generateMainBodyFromSections()` logic
- Try refreshing page

---

## Post-Testing Actions

After completing all tests:

1. [ ] Document any issues found
2. [ ] Update test results table
3. [ ] Share results with team
4. [ ] Create bug tickets for failures
5. [ ] Update PHASE-4C-2-IMPLEMENTATION-SUMMARY.md with findings
6. [ ] Decide on production deployment readiness

---

## Success Criteria

Phase 4C-2 is ready for production if:

- ✅ All critical tests (1, 2, 3) pass
- ✅ No blocking bugs found
- ✅ Performance is acceptable (<30s for AI generation)
- ✅ Error handling works correctly
- ✅ Google Sheet integration works (all 15 columns)
- ✅ Integration with Phase 4C-1 is seamless

---

## Contact & Support

**Developer:** AI Assistant  
**Documentation:** PHASE-4C-2-IMPLEMENTATION-SUMMARY.md  
**Phase 4C-1 Docs:** PHASE-4C-1-HANDOFF-PDF-UPLOAD.md

For issues or questions, check server logs first, then review implementation docs.

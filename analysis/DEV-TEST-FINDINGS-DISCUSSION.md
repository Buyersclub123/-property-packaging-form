# Dev Test Findings - Discussion Document

**Date:** 2026-01-26  
**Test Property:** 5 ACACIA ST, POINT VERNON QLD 4655  
**Test Status:** ✅ **MOSTLY SUCCESSFUL** with critical issues to fix

---

## 🎉 **MAJOR WINS**

1. ✅ **Proximity API - WORKING!** 
   - User confirmed: "proximity seemed to work better (Thanks you)"
   - No 401 errors - the `userEmail` fix worked!

2. ✅ **PDF Upload & Processing - WORKING!**
   - PDF extracted successfully
   - ChatGPT formatting worked (51,353 chars → 2,417 chars)
   - Saved to Google Sheet correctly
   - No 50,000 character limit error

3. ✅ **Hotspotting Report Link - FIRST TIME SUCCESS!**
   - Link appeared in property folder (user: "this is a massive win as its the first time it has done it")
   - File was in Hotspotting Reports folder as expected

4. ✅ **Google Sheet Structure - CORRECT**
   - Main Body in Column E ✅
   - PDF Link in Column N ✅
   - PDF File ID in Column O ✅
   - All 15 columns (A-O) working correctly

---

## 🚨 **CRITICAL ISSUES TO FIX**

### Issue 1: Form Field Not Populating After PDF Upload ⚠️ **BLOCKING**

**Problem:**
- After PDF upload and ChatGPT formatting, the Investment Highlights textarea field is **empty**
- User had to manually type "g" to exit the page
- The formatted content (2,417 chars) was saved to Google Sheet but NOT displayed in the form

**Root Cause:**
In `InvestmentHighlightsField.tsx` → `handleConfirmMetadata()` function:
- After successful PDF upload, the code saves to Google Sheet ✅
- But it **never calls `onChange(formattedMainBody)`** to populate the textarea ❌

**Location:** `src/components/steps/step5/InvestmentHighlightsField.tsx` line ~500

**Current Code:**
```typescript
// After organize-pdf succeeds:
updateFormData({
  hotspottingPdfLink: result.webViewLink || '',
  hotspottingPdfFileId: result.fileId || '',
});
// ❌ MISSING: onChange(formattedMainBody)
```

**Fix Needed:**
Add `onChange(formattedMainBody)` after successful upload to populate the field.

---

### Issue 2: Re-renders Still Happening ⚠️ **PERFORMANCE ISSUE**

**Problem:**
- Component rendered **132 times** (render #1 through #132)
- All renders show "Current value length: 0" until user manually typed "g"
- The fix to remove `value` from useEffect dependencies **didn't fully work**

**Logs Show:**
```
InvestmentHighlightsField.tsx:57 [InvestmentHighlights] Component render # 1
InvestmentHighlightsField.tsx:58 [InvestmentHighlights] Current value length: 0
... (130 more renders) ...
InvestmentHighlightsField.tsx:57 [InvestmentHighlights] Component render # 131
InvestmentHighlightsField.tsx:58 [InvestmentHighlights] Current value length: 1
```

**Root Cause:**
- The `useEffect` fix removed `value` from dependencies, but something else is still triggering re-renders
- Likely the `lookupReport()` function or state updates are causing the loop

**Investigation Needed:**
- Check what's triggering the re-renders after the useEffect fix
- May need to add more refs or memoization

---

### Issue 3: PDF File Naming - Missing Valid Period ⚠️ **MINOR**

**Problem:**
- PDF file name is missing the valid period at the end
- User: "it was just missing the valid period at the end (but it looks cleaner than I have seen previously)"

**Current Code:**
```typescript
const cleanedReportName = cleanReportNameForFilename(reportName);
const newFileName = `${cleanedReportName} - ${validPeriod}.pdf`;
```

**Investigation:**
- The code looks correct - it should include valid period
- May be an issue with how `validPeriod` is passed or formatted
- Need to check what `validPeriod` value is at upload time

---

### Issue 4: PDF Permissions - Cannot Access ⚠️ **BLOCKING**

**Problem:**
- User submitted property and reviewed on phone
- Could open cashflow spreadsheet and photos doc ✅
- But hotspotting report said "I need permission" ❌
- User: "we need to figure out how we give any doc put into the folder view rights to anyone with the link"

**Root Cause:**
The `organize-pdf` route does NOT set file permissions after moving the PDF.

**Current Code:**
```typescript
// organize-pdf/route.ts - moves file but doesn't set permissions
await drive.files.update({
  fileId: fileId,
  addParents: currentFolderId,
  removeParents: parentFolderId,
  requestBody: { name: newFileName },
});
// ❌ MISSING: Set permissions to "anyone with link can view"
```

**Fix Needed:**
Add permission setting after file move:
```typescript
await drive.permissions.create({
  fileId: fileId,
  requestBody: {
    role: 'reader',
    type: 'anyone',
  },
  supportsAllDrives: true,
});
```

---

### Issue 5: Hotspotting Report Name Not Showing in Property Folder ⚠️ **MINOR**

**Problem:**
- Link appeared in property folder ✅
- But report name not showing (user didn't specify what they expected to see)

**Investigation Needed:**
- Check how the shortcut/link is created
- May need to set the shortcut name explicitly

---

## 📊 **WORKFLOW ANALYSIS**

### What Worked:
1. ✅ PDF extraction from upload
2. ✅ Metadata extraction (Report Name, Valid Period)
3. ✅ User verification of metadata
4. ✅ ChatGPT formatting (51,353 → 2,417 chars)
5. ✅ Google Sheet save (correct columns)
6. ✅ File organization (CURRENT/LEGACY folders)
7. ✅ Link creation in property folder
8. ✅ Proximity API (no 401 errors)

### What Didn't Work:
1. ❌ Form field population after upload
2. ❌ PDF file permissions (cannot access)
3. ⚠️ Excessive re-renders (132 times)
4. ⚠️ PDF file name missing valid period (maybe)

---

## 🔍 **DETAILED LOG ANALYSIS**

### ChatGPT Formatting - SUCCESS ✅
```
InvestmentHighlightsField.tsx:413 📝 Preparing AI request: {hasMainBody: true, mainBodyLength: 51353, suburb: 'Point Vernon', state: 'QLD'}
InvestmentHighlightsField.tsx:431 📤 Sending to AI: {type: 'investmentHighlights', rawTextLength: 51353, hasRawText: true}
InvestmentHighlightsField.tsx:461 ✅ Text formatted by AI into 7 sections
InvestmentHighlightsField.tsx:462 📊 Formatted Main Body length: 2417
```

**Analysis:**
- Raw text: 51,353 characters ✅
- Formatted text: 2,417 characters ✅
- Well within 50,000 limit ✅
- ChatGPT formatting step working correctly ✅

### Re-renders - STILL PROBLEMATIC ⚠️
- 132 renders total
- All showing "Current value length: 0" until render #131
- User manually typed "g" at render #131
- Fix didn't fully resolve the issue

### Google Sheet Data - CORRECT ✅
- Suburbs: Point Vernon ✅
- State: QLD ✅
- Report Name: FRASER COAST Wide Bay Burnett Region ✅
- Valid Period: January - April 2026 ✅
- Main Body: Formatted content (2,275 chars in sheet, 2,417 after formatting) ✅
- PDF Link: Column N ✅
- File ID: Column O ✅

---

## 🎯 **PRIORITY FIXES**

### Priority 1: Form Field Population (BLOCKING)
- **Impact:** User cannot see formatted content in form
- **Effort:** Low (add one line: `onChange(formattedMainBody)`)
- **Status:** Ready to fix

### Priority 2: PDF Permissions (BLOCKING)
- **Impact:** Users cannot access PDFs after submission
- **Effort:** Low (add permission setting code)
- **Status:** Ready to fix

### Priority 3: Re-renders (PERFORMANCE)
- **Impact:** Performance issue, but doesn't block workflow
- **Effort:** Medium (need to investigate root cause)
- **Status:** Needs investigation

### Priority 4: PDF File Naming (MINOR)
- **Impact:** Cosmetic issue
- **Effort:** Low (verify validPeriod value)
- **Status:** Needs investigation

---

## 📝 **QUESTIONS FOR DISCUSSION**

1. **Form Field Population:**
   - Should we populate the field immediately after upload?
   - Or should we do a lookup after upload to get the saved data?

2. **Re-renders:**
   - Is 132 renders acceptable for now, or should we prioritize fixing this?
   - The component works, just inefficient

3. **PDF File Naming:**
   - What format do you want? `ReportName - ValidPeriod.pdf`?
   - The code looks correct - need to verify what `validPeriod` value is

4. **Next Test:**
   - You want to test another property in different suburb, same LGA
   - This will test the dropdown for reports
   - Should we fix the blocking issues first, or test dropdown first?

---

## ✅ **READY FOR NEXT STEPS**

**Immediate Actions:**
1. Fix form field population (add `onChange(formattedMainBody)`)
2. Fix PDF permissions (add permission setting)
3. Test dropdown with new property (different suburb, same LGA)

**After Testing:**
- Update test log with findings
- Fix remaining issues
- Deploy to Production

---

**Status:** ✅ **READY FOR DISCUSSION** - Waiting for your input on priorities and approach

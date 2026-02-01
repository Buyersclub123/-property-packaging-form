# Fixes and Updates Needed - Based on Test Results

**Date:** 2026-01-26  
**Status:** Ready to implement

---

## 1. Google Sheets Columns - ✅ **CORRECT** (No Change Needed)

### First Test Data Analysis:
From Test 1 (Point Vernon), the data posted correctly to all 15 columns:

| Column | Header | Data | Status |
|--------|--------|------|--------|
| A | Suburbs | Point Vernon | ✅ |
| B | State | QLD | ✅ |
| C | Report Name | FRASER COAST Wide Bay Burnett Region | ✅ |
| D | Valid Period | January - April 2026 | ✅ |
| E | Main Body | Formatted content (2,275 chars) | ✅ |
| F-M | Extra Info, Sections | Empty (as expected) | ✅ |
| N | PDF Drive Link | https://drive.google.com/file/d/... | ✅ |
| O | PDF File ID | 1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz | ✅ |

**Conclusion:** Columns are correct. All 15 columns (A-O) are being used properly. The code in `organize-pdf/route.ts` is correctly saving to all columns.

**Action:** ✅ **NO CHANGE NEEDED**

---

## 2. PDF File Permissions - ⚠️ **NEEDS FIX**

### Requirements:
- Documents added from form should be **read-only** for non-approved people
- Folder has a setting for this (approved people have edit, everyone else view)
- If files are manually added to folder, can we force the folder to apply the same rule?

### Current Status:
- ❌ No permissions are set after PDF upload
- ❌ Files inherit folder permissions, but we need to ensure "anyone with link" can view

### Fix Needed:

**Location:** `src/app/api/investment-highlights/organize-pdf/route.ts` after file move (line ~185)

**Add after file update:**
```typescript
// Set file permissions: anyone with link can view (read-only)
await drive.permissions.create({
  fileId: fileId,
  requestBody: {
    role: 'reader',
    type: 'anyone',
  },
  supportsAllDrives: true,
});
```

**For Folder Permissions (Manual Files):**
- Google Drive files inherit folder permissions by default
- If folder is set to "anyone with link can view", new files will inherit this
- However, we should also set explicit permissions on files added via form to ensure consistency

**Action:** ⚠️ **IMPLEMENT FIX**

---

## 3. Hotspotting Report File Naming - ⚠️ **NEEDS VERIFICATION**

### User Report:
- User said: "it was just missing the valid period at the end (but it looks cleaner than I have seen previously)"

### Current Code:
```typescript
const cleanedReportName = cleanReportNameForFilename(reportName);
const newFileName = `${cleanedReportName} - ${validPeriod}.pdf`;
```

**The code looks correct** - it should include the valid period.

### Possible Issues:
1. `validPeriod` might be empty or undefined
2. `cleanReportNameForFilename` might be removing it
3. File name might be getting truncated

### Investigation Needed:
- Check what `validPeriod` value is at upload time
- Check what `reportName` value is
- Verify the final filename in Google Drive

**Action:** ⚠️ **INVESTIGATE AND FIX IF NEEDED**

---

## 4. Update Dev Test Log - ⚠️ **NEEDS UPDATE**

### Current Status in Log:
The test log still shows old issues that have been fixed:
- ❌ Google Sheets 50,000 character limit - **FIXED** (ChatGPT formatting added)
- ❌ Proximity API 401 - **FIXED** (userEmail added)
- ⚠️ Re-renders - **IMPROVED** (132 → 36, 73% reduction)

### What Needs Updating:
1. Mark fixed issues as **✅ FIXED**
2. Update re-render status to show improvement
3. Add new issues found in Test 2:
   - Dropdown selection not populating
   - Form field not populating after upload
   - PDF permissions missing
   - Inconsistent checkbox validation

**Action:** ⚠️ **UPDATE TEST LOG**

---

## 5. Folder Permissions for Manual Files - ⚠️ **NEEDS CLARIFICATION**

### User Question:
"If files are manually added to the folder, can we force the folder to apply the same rule?"

### Google Drive Behavior:
- Files **inherit** folder permissions by default
- If folder is set to "anyone with link can view", new files will inherit this
- However, if someone manually adds a file with different permissions, it won't automatically change

### Options:
1. **Manual Process:** User must manually set permissions on manually-added files
2. **Automated Process:** Create a script/function to:
   - List all files in folder
   - Check permissions
   - Set "anyone with link can view" if not already set
   - Run periodically or on-demand

### Recommendation:
- For files added via form: ✅ Set permissions automatically (fix #2 above)
- For manually-added files: Create a utility function that can be called to sync permissions
- This could be a separate API endpoint: `/api/sync-folder-permissions`

**Action:** ⚠️ **IMPLEMENT FOLDER PERMISSIONS SYNC UTILITY** (optional enhancement)

---

## Summary of Actions

### Immediate Fixes:
1. ✅ **Google Sheets Columns** - No change needed (already correct)
2. ⚠️ **PDF File Permissions** - Add permission setting after upload
3. ⚠️ **File Naming** - Investigate valid period issue
4. ⚠️ **Update Test Log** - Mark fixed issues, add new findings

### Optional Enhancements:
5. ⚠️ **Folder Permissions Sync** - Utility to sync permissions on manually-added files

---

**Status:** Ready to implement fixes

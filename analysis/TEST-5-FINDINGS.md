# Test 5 Findings - PDF Shortcut & Suburb Addition

**Date:** 2026-01-26  
**Test Property:** 11 Milkman Way Kawungan QLD  
**Status:** 🔍 **INVESTIGATING**

---

## ✅ **What's Working**

1. **Dropdown Selection:** ✅ Working
   - Logs show: `[InvestmentHighlights] Dropdown selection:` with correct data
   - PDF link and fileId are present in dropdown object

2. **Lookup API:** ✅ Working
   - Logs show: `[InvestmentHighlights] Lookup result data:` with `pdfDriveLink` and `pdfFileId`
   - Data is being retrieved correctly from columns F&G

3. **Data Storage:** ✅ Working
   - Logs show: `[InvestmentHighlights] PDF link and report info stored:` with correct values
   - `pdfLink: 'https://drive.google.com/file/d/1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz/view?usp=drivesdk'`
   - `fileId: '1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz'`

---

## ❌ **Issues Found**

### **Issue 1: PDF Shortcut Not Created**

**Symptom:**
- PDF shortcut does not appear in folder after creation
- Even after populating N&O columns, PDF still not created in 2nd folder

**Evidence from Logs:**
- ✅ Data is stored correctly in form state
- ❌ No logs showing "Adding PDF shortcut to property folder..." in server logs
- This suggests `formData?.hotspottingPdfFileId` is empty when folder creation API is called

**Possible Causes:**
1. Form data not being passed correctly to folder creation API
2. Property name mismatch (though we fixed this)
3. Data lost between Step 5 and Step 6
4. Timing issue - data not persisted before folder creation

**Fix Applied:**
- Added detailed logging to folder creation API
- Added logging to Step6 component to show what's being sent
- Will show in next test what data is actually being sent

---

### **Issue 2: Suburb Not Added to Column A**

**Symptom:**
- Suburb "Kawungan" not added to column A in Investment Highlights sheet

**Evidence:**
- No logs showing `[Step6] Adding suburb to Investment Highlights report:`
- This suggests the condition `if (formData.hotspottingReportName && formData.address?.suburbName && formData.address?.state)` is false

**Possible Causes:**
1. `hotspottingReportName` not stored correctly
2. Suburb name or state missing
3. Condition check failing

**Fix Applied:**
- Added logging to show when suburb addition is skipped and why
- Added detailed logging in add-suburb API to show matching process

---

### **Issue 3: Step 4 (Market Performance) Slow Loading**

**Symptom:**
- Page 4 takes a long time to load initially
- Clicking previous and then next makes it load straight away

**Possible Causes:**
1. Google Sheets API call is slow on first load
2. No caching on first load
3. Component state not preserved on navigation

**Investigation Needed:**
- Check if API response is slow
- Consider adding loading states or caching
- Check if component is re-mounting unnecessarily

---

## 🔧 **Logging Added**

### **Client-Side (Step6):**
```javascript
console.log('[Step6] PDF data in formData:', {
  hotspottingPdfFileId: formData.hotspottingPdfFileId,
  hotspottingPdfLink: formData.hotspottingPdfLink,
  hotspottingReportName: formData.hotspottingReportName,
});
```

### **Server-Side (Folder Creation API):**
```javascript
console.log('[create-property-folder] Checking for PDF shortcut...');
console.log('[create-property-folder] formData?.hotspottingPdfFileId:', formData?.hotspottingPdfFileId);
console.log('[create-property-folder] formData?.hotspottingPdfLink:', formData?.hotspottingPdfLink);
console.log('[create-property-folder] formData?.hotspottingReportName:', formData?.hotspottingReportName);
```

### **Suburb Addition:**
- Added logging to show when skipped and why
- Added row-by-row matching logs in add-suburb API

---

## 📋 **Next Test Steps**

1. **Test PDF Shortcut:**
   - Select report from dropdown
   - Complete form and create folder
   - Check browser console for `[Step6] PDF data in formData:`
   - Check server logs for `[create-property-folder] Checking for PDF shortcut...`
   - Verify if `hotspottingPdfFileId` is present when folder is created

2. **Test Suburb Addition:**
   - Complete form and submit
   - Check browser console for `[Step6] Adding suburb to Investment Highlights report:`
   - Check server logs for `[add-suburb] Matching request:`
   - Verify if suburb is added to column A

3. **Test Market Performance:**
   - Navigate to Step 4
   - Note loading time
   - Check network tab for API call duration
   - Navigate away and back to see if it's faster

---

## 🎯 **Expected Logs**

**When PDF data is present:**
```
[Step6] PDF data in formData: {
  hotspottingPdfFileId: '1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz',
  hotspottingPdfLink: 'https://drive.google.com/file/d/...',
  hotspottingReportName: 'FRASER COAST Wide Bay Burnett Region'
}
[create-property-folder] Checking for PDF shortcut...
[create-property-folder] formData?.hotspottingPdfFileId: 1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz
[create-property-folder] Adding PDF shortcut to property folder...
```

**When PDF data is missing:**
```
[Step6] PDF data in formData: {
  hotspottingPdfFileId: undefined,
  hotspottingPdfLink: undefined,
  hotspottingReportName: undefined
}
[create-property-folder] Checking for PDF shortcut...
[create-property-folder] formData?.hotspottingPdfFileId: undefined
[create-property-folder] No PDF fileId found - skipping shortcut creation
```

---

**Status:** 🔍 **READY FOR NEXT TEST** - Logging added, ready to diagnose

# Server Log Check Guide

**Date:** 2026-01-26  
**Purpose:** Check server terminal for API logs to diagnose PDF shortcut and suburb addition issues

---

## 🔍 **Where to Find Server Logs**

The server logs appear in the **terminal where `npm run dev` is running**, NOT in the browser console.

**Location:**
- The PowerShell/Command Prompt window where you ran `npm run dev`
- This is usually a separate terminal window
- Look for the window showing Next.js compilation messages

---

## 📋 **What to Look For**

### **When Folder is Created:**

Look for these logs in the server terminal:

```
[create-property-folder] Checking for PDF shortcut...
[create-property-folder] formData?.hotspottingPdfFileId: <value or undefined>
[create-property-folder] formData?.hotspottingPdfLink: <value or undefined>
[create-property-folder] formData?.hotspottingReportName: <value or undefined>
```

**Then either:**
```
[create-property-folder] Adding PDF shortcut to property folder...
[create-property-folder] File ID: <fileId>
[create-property-folder] Folder ID: <folderId>
[create-property-folder] PDF shortcut created successfully: <shortcutId>
```

**OR:**
```
[create-property-folder] No PDF fileId found - skipping shortcut creation
```

**OR (if error):**
```
[create-property-folder] Error creating PDF shortcut: <error message>
```

---

### **When Form is Submitted:**

Look for these logs in the server terminal:

```
[add-suburb] Matching request: {
  suburb: 'Torquay',
  state: 'QLD',
  reportName: 'fraser coast wide bay burnett region'
}
[add-suburb] Checking row 2 : {
  rowReportName: 'fraser coast wide bay burnett region',
  rowState: 'QLD',
  normalizedReportName: 'fraser coast wide bay burnett region',
  normalizedState: 'QLD',
  matches: true/false
}
```

**Then either:**
- Success message (if suburb was added)
- Error message (if matching failed)

---

## 🎯 **What This Tells Us**

### **If `hotspottingPdfFileId` is `undefined`:**
- PDF data is NOT reaching the folder creation API
- Data is lost between Step 5 and Step 6
- Need to check formData persistence

### **If `hotspottingPdfFileId` has a value but shortcut fails:**
- Data is reaching the API ✅
- Shortcut creation is failing ❌
- Need to check Google Drive API permissions/errors

### **If suburb addition logs don't appear:**
- Form submission didn't reach that code
- OR condition check failed (but we should see "Skipping" log)

### **If suburb addition logs show matching failed:**
- Report name doesn't match exactly
- State doesn't match
- Need to check exact values being compared

---

## 📝 **How to Share Logs**

1. **Copy the relevant section** from server terminal
2. **Include:**
   - All `[create-property-folder]` logs
   - All `[add-suburb]` logs
   - Any error messages
   - The lines before and after for context

3. **Share:**
   - Browser console logs (Step 6 section)
   - Server terminal logs (folder creation and submission)

---

**Status:** 🔍 **READY TO CHECK** - Follow guide above to find and share server logs

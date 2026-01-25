# Step 7: Cashflow Review & Folder Creation - Logic Flow

**Date:** January 21, 2026  
**Purpose:** Document what goes where in the folder creation process

---

## 🔄 **The Flow: What Happens When User Clicks "Create Folder"**

### **Step 1: User Clicks Button**
- **File:** `Step7CashflowReview.tsx` (line 28-64)
- **Action:** Calls `/api/create-property-folder` with `formData`

---

### **Step 2: API Receives Request**
- **File:** `create-property-folder/route.ts` (line 17-19)
- **Receives:** `propertyAddress` and `formData`

---

### **Step 3: Construct Folder Name**
- **File:** `create-property-folder/route.ts` (line 47-51)
- **Function:** `constructAndSanitizeFolderName(formData.address)`
- **Output:** Folder name like "Lot 17, Unit 5, 123 Main Street Suburb VIC 3000"

---

### **Step 4: Copy Template Folder**
- **File:** `create-property-folder/route.ts` (line 56-61)
- **Function:** `copyFolderStructure()`
- **What it does:**
  - Copies `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID` folder
  - Creates new folder in `GOOGLE_DRIVE_PROPERTIES_FOLDER_ID`
  - Names it with the constructed folder name
  - Returns `propertyFolder` object with `id` and `webViewLink`

---

### **Step 5: Find Google Sheets in New Folder**
- **File:** `create-property-folder/route.ts` (line 99-100)
- **Function:** `findGoogleSheetsInFolder(propertyFolder.id, SHARED_DRIVE_ID)`
- **What it finds:**
  - All Google Sheets files in the new folder
  - Returns array of sheets with `id` and `name`

---

### **Step 6: Delete Wrong Contract Type Sheet**
- **File:** `create-property-folder/route.ts` (line 116-145)
- **Logic:**
  - Finds "Split Contract" sheet
  - Finds "Single Contract" sheet
  - If `contractTypeSimplified === 'Single Contract'` → delete Split sheet
  - If `contractTypeSimplified === 'Split Contract'` → delete Single sheet

**This is why one spreadsheet was deleted!** ✅ Working as designed

---

### **Step 7: Rename HL Sheet**
- **File:** `create-property-folder/route.ts` (line 148-166)
- **Logic:**
  - Finds sheet with "HL" in the name
  - Constructs new name: `CF HL spreadsheet (streetNumber streetName suburbName)`
  - Example: `CF HL spreadsheet (5 Antilles St Parrearra)`
  - Calls `renameFile(hlSheet.id, newName, SHARED_DRIVE_ID)`

**This is why only the HL sheet is renamed, not other files!**

---

### **Step 8: Populate HL Spreadsheet**
- **File:** `create-property-folder/route.ts` (line 174)
- **Function:** `populateHLSpreadsheet(hlSheet.id, formData)`
- **This is where values should be written to the spreadsheet!**

---

## 📊 **Summary: What Goes Where**

### **Folder Structure After Creation:**

```
Properties Folder (GOOGLE_DRIVE_PROPERTIES_FOLDER_ID)
└── [New Folder: "Lot 17, Unit 5, 123 Main Street Suburb VIC 3000"]
    ├── CF HL spreadsheet (5 Antilles St Parrearra) ← RENAMED & POPULATED
    ├── [Other files from template - NOT renamed]
    └── [Either Split or Single Contract sheet DELETED]
```

---

## 🎯 **Key Functions & Their Locations**

| Function | File | What It Does |
|----------|------|--------------|
| `constructAndSanitizeFolderName()` | `lib/addressFormatter.ts` | Creates folder name with Lot/Unit |
| `copyFolderStructure()` | `lib/googleDrive.ts` | Copies template folder |
| `findGoogleSheetsInFolder()` | `lib/googleDrive.ts` | Finds all sheets in folder |
| `deleteFile()` | `lib/googleDrive.ts` | Deletes wrong contract sheet |
| `renameFile()` | `lib/googleDrive.ts` | Renames HL sheet |
| `populateHLSpreadsheet()` | `lib/googleDrive.ts` | **WRITES VALUES TO SHEET** |

---

## ❓ **Questions to Answer:**

1. **Why are no values being written?**
   - Need to check `populateHLSpreadsheet()` function
   - Is it being called? (Yes, line 174)
   - Is it working correctly? (Need to check)

2. **Why are other files not renamed?**
   - Code only renames the "HL" sheet (line 151)
   - Other files keep their template names
   - **Is this intentional or a bug?**

3. **Which spreadsheet should have values?**
   - The "CF HL spreadsheet" (renamed HL sheet)
   - Which tab? "Autofill data" tab?
   - Need to check `populateHLSpreadsheet()` to see what it writes

---

## 🔍 **Next Step: Check `populateHLSpreadsheet()`**

This function is the KEY to understanding why values aren't being written.

**Location:** `lib/googleDrive.ts`

**Should I look at this function next?**

---

**Analysis by:** Coordinator Chat  
**Date:** January 21, 2026

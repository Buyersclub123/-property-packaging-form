# Phase 5 - Step 7: Cashflow Review & Folder Creation - Implementation Handoff

**Date:** January 21, 2026  
**Assignee:** Chat [To Be Assigned]  
**Estimated Time:** 2-3 hours  
**Priority:** High  
**Dependencies:** Phase 2, Phase 3, Phase 4A, Phase 4B, Phase 4C-1 (all complete)

---

## 🎯 **Objective**

Create Step 7 that displays all collected data for review and creates the Google Drive folder with the NEW folder naming convention and populates Google Sheets with ALL data from Phases 2-4.

---

## 📋 **What to Build**

### **UI Components:**

1. **Review Section** - Display all form data in read-only format
   - Property details
   - Financial data
   - Proximity data
   - AI-generated "Why This Property" content
   - Investment highlights
   - Washington Brown depreciation (10 years)

2. **Edit Buttons** - Allow user to go back to any step to edit

3. **Create Folder Button** - Triggers folder creation
   - Disabled until user confirms review
   - Shows loading state during creation

4. **Success State** - After folder created
   - Green checkmark
   - Folder link (clickable)
   - "View Folder" button

5. **Navigation Buttons**
   - Previous (goes to Step 6)
   - Next (goes to Step 8, enabled after folder created)

---

## 🔧 **Implementation Details**

### **File to Create:**
`form-app/src/components/steps/Step7CashflowReview.tsx`

### **Component Structure:**

```typescript
'use client';

import { useState } from 'react';
import { useFormStore } from '@/store/formStore';
import { createPropertyFolder } from '@/lib/googleDrive';

export function Step7CashflowReview() {
  const { formData } = useFormStore();
  const [creating, setCreating] = useState(false);
  const [folderLink, setFolderLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateFolder = async () => {
    setCreating(true);
    setError(null);
    
    try {
      const result = await createPropertyFolder(formData);
      setFolderLink(result.folderLink);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h2>Cashflow Review & Folder Creation</h2>
      {/* Review sections */}
      {/* Create folder button */}
      {/* Success state with folder link */}
    </div>
  );
}
```

---

## 📊 **Review Section Layout**

Display data in collapsible sections:

### **1. Property Details**
- Address (full formatted address)
- Property type (House, Unit, Townhouse, etc.)
- Bedrooms, Bathrooms, Car spaces
- Land size, Building size
- Year built

### **2. Financial Summary**
- Purchase price
- Stamp duty
- Legal fees
- Total acquisition cost
- Rental income (weekly)
- Annual rental yield

### **3. Proximity Data**
- Display the proximity/amenities text from Step 5
- Show in read-only textarea (auto-height)

### **4. Why This Property (AI Content)**
- Display the AI-generated content from Step 5
- Show in read-only textarea (auto-height)

### **5. Investment Highlights**
- Report name
- Valid period
- Main body text
- Show in read-only textarea (auto-height)

### **6. Washington Brown Depreciation**
- Display 10-year table
- Year | Diminishing Value
- Read-only

### **7. Edit Buttons**
- Each section has "Edit" button
- Clicking "Edit" navigates back to the relevant step

---

## 🗂️ **Folder Creation Logic**

### **Key Changes from Old Step 6:**

⚠️ **IMPORTANT:** Use the NEW folder naming logic from Phase 2, NOT the old logic in the current `Step6FolderCreation.tsx`.

### **Folder Naming:**

Use `constructFolderName()` from `form-app/src/lib/addressFormatter.ts`:

```typescript
import { constructFolderName } from '@/lib/addressFormatter';

const folderName = constructFolderName(formData.address);
// Example output: "5_ACACIA_ST_POINT_VERNON_QLD_4655"
```

### **Folder Creation Steps:**

1. **Create main property folder** in Google Drive
   - Parent folder ID: `process.env.GOOGLE_PARENT_FOLDER_ID`
   - Folder name: Use `constructFolderName()`

2. **Copy spreadsheet template** into folder
   - Template ID: `process.env.GOOGLE_TEMPLATE_SHEET_ID`
   - New name: `${folderName}_Cashflow`

3. **Populate Google Sheets** with ALL data:
   - Core fields (Rows 1-13) - Phase 2
   - New fields (Rows 14-27) - Phase 2
   - Proximity data - Phase 4A
   - AI content - Phase 4B
   - Investment highlights - Phase 4C

4. **Return folder link** for display

---

## 📝 **Google Sheets Population**

### **Use Existing Function:**

The `populateGoogleSheet()` function in `form-app/src/lib/googleDrive.ts` already handles most of this. You need to:

1. **Verify it includes ALL fields:**
   - ✅ Core fields (B1-B13)
   - ✅ New fields (B14-B27)
   - ⚠️ **ADD:** Proximity data (check which cell)
   - ⚠️ **ADD:** AI "Why This Property" content (check which cell)
   - ⚠️ **ADD:** Investment highlights (check which cell)

2. **Check the spec:**
   - `planning_docs/03_google_sheets_mapping_core_fields_developer_build_spec.md`
   - `planning_docs/04_google_sheets_mapping_new_fields_developer_build_spec.md`

### **Example Update to populateGoogleSheet():**

```typescript
// In form-app/src/lib/googleDrive.ts

export async function populateGoogleSheet(
  spreadsheetId: string,
  formData: FormData
) {
  // ... existing code for B1-B27 ...
  
  // ADD: Proximity data (example cell B28)
  if (formData.proximityData) {
    updates.push({
      range: 'B28',
      values: [[formData.proximityData]]
    });
  }
  
  // ADD: AI "Why This Property" content (example cell B29)
  if (formData.whyThisProperty) {
    updates.push({
      range: 'B29',
      values: [[formData.whyThisProperty]]
    });
  }
  
  // ADD: Investment highlights (example cell B30)
  if (formData.investmentHighlights) {
    updates.push({
      range: 'B30',
      values: [[formData.investmentHighlights]]
    });
  }
  
  // ... rest of existing code ...
}
```

⚠️ **Note:** You'll need to check the actual cell references for proximity, AI content, and investment highlights. They might already be defined in the specs or you may need to ask the coordinator.

---

## 🔗 **Integration Points**

### **1. Update MultiStepForm.tsx:**

Add Step 7 to the STEPS array:

```typescript
const STEPS = [
  { id: 1, name: 'Address & Risk Check', component: Step0AddressAndRisk },
  { id: 2, name: 'Decision Tree', component: Step2StashCheck },
  { id: 3, name: 'Property Details', component: Step3PropertyDetails },
  { id: 4, name: 'Market Performance', component: Step2MarketPerformance },
  { id: 5, name: 'Proximity & Content', component: Step5Proximity },
  { id: 6, name: 'Washington Brown', component: Step6WashingtonBrown },
  { id: 7, name: 'Cashflow Review', component: Step7CashflowReview }, // NEW
  { id: 8, name: 'Submission', component: Step8Submission }, // To be created
];
```

### **2. Add Validation:**

In `MultiStepForm.tsx`, add validation for Step 7:

```typescript
case 7: // Cashflow Review
  // Check if folder has been created
  if (!formData.folderLink) {
    setValidationError('Please create the property folder before proceeding.');
    return false;
  }
  
  return true;
```

### **3. Save Folder Link to Form Store:**

After folder creation, save the link:

```typescript
updateFormData({
  folderLink: result.folderLink,
  folderId: result.folderId
});
```

---

## 🧪 **Testing**

### **Test Cases:**

1. **Review Display:**
   - Navigate to Step 7
   - Verify all data displays correctly
   - Verify all sections are readable

2. **Edit Navigation:**
   - Click "Edit" on Property Details
   - Verify navigates to Step 3
   - Make a change
   - Navigate back to Step 7
   - Verify change is reflected

3. **Folder Creation (Happy Path):**
   - Click "Create Folder"
   - Wait for loading state
   - Verify success message
   - Verify folder link is clickable
   - Click "View Folder"
   - Verify opens Google Drive in new tab
   - Verify folder name is correct (NEW naming convention)
   - Verify spreadsheet exists in folder
   - Open spreadsheet
   - Verify ALL data is populated (Phases 2-4)

4. **Folder Creation (Error):**
   - Temporarily break Google Drive API key
   - Click "Create Folder"
   - Verify error message displays
   - Verify retry button appears

5. **Navigation:**
   - Click "Previous" - should go to Step 6
   - Click "Next" without creating folder - should show validation error
   - Create folder
   - Click "Next" - should go to Step 8

---

## 📚 **Reference Documents**

1. **`planning_docs/06_new_page_flow_developer_build_spec.md`** - Section 4 (Cashflow Review)
2. **`planning_docs/05_address_construction_folder_naming.md`** - NEW folder naming logic
3. **`planning_docs/03_google_sheets_mapping_core_fields_developer_build_spec.md`** - Core fields
4. **`planning_docs/04_google_sheets_mapping_new_fields_developer_build_spec.md`** - New fields
5. **`form-app/src/lib/googleDrive.ts`** - Existing folder creation functions
6. **`form-app/src/lib/addressFormatter.ts`** - Folder naming functions

---

## ⚠️ **Critical Notes**

1. **DO NOT use the old folder naming logic** from the current `Step6FolderCreation.tsx`. Use `constructFolderName()` from `addressFormatter.ts`.

2. **Verify Google Sheets population includes ALL fields:**
   - Core fields (B1-B13)
   - New fields (B14-B27)
   - Proximity data
   - AI content
   - Investment highlights

3. **Ask coordinator if unsure about cell references** for proximity, AI content, and investment highlights.

4. **Test with real data** to ensure folder naming and Google Sheets population work correctly.

---

## ✅ **Success Criteria**

- [ ] All form data displays correctly in review section
- [ ] Edit buttons navigate to correct steps
- [ ] Folder creation uses NEW naming convention
- [ ] Folder is created in correct parent folder
- [ ] Spreadsheet is copied into folder
- [ ] ALL data populates in Google Sheets (Phases 2-4)
- [ ] Folder link is clickable and opens in new tab
- [ ] Validation prevents proceeding without folder creation
- [ ] Error handling works (retry on failure)
- [ ] Build passes with no errors
- [ ] No linter errors

---

## 🚀 **Ready to Implement!**

This is the most complex step in Phase 5. Take your time, test thoroughly, and ask the coordinator if you need clarification on cell references or data mapping.

**Estimated Time:** 2-3 hours

**Questions?** Refer back to Coordinator Chat for clarification.

# Phase 5: New Page Flow (Steps 6-8) - Handoff Document

**Date:** January 21, 2026  
**Status:** Ready to Implement  
**Coordinator:** AI Assistant  
**Phase:** 5 (New 3-step flow replacing current Step 6)

---

## 🎯 **Overview**

Phase 5 restructures the final submission flow from **1 combined step** into **3 separate steps**:

### **Current State:**
- Step 6: Folder Creation (combined: review, folder creation, checklist, submission)

### **New State:**
- **Step 6:** Washington Brown Calculator (paste & parse depreciation data)
- **Step 7:** Cashflow Review & Folder Creation (display all data + create folder with NEW logic)
- **Step 8:** Pre-Submission Checklist & Final Submission

---

## 📋 **Phase 5 Breakdown**

### **Step 6: Washington Brown Calculator**
**Purpose:** Paste depreciation report data and parse into 10-year diminishing value amounts

**Features:**
- Large textarea for pasting Washington Brown report
- Parse button to extract Year 1-10 depreciation values
- Display parsed values in a table
- Save to `formData.propertyDescription.depreciation`
- Validation: All 10 years must have values

**Reference:** `planning_docs/06_new_page_flow_developer_build_spec.md` Section 3

---

### **Step 7: Cashflow Review & Folder Creation**
**Purpose:** Display all collected data and create Google Drive folder with NEW folder structure

**Features:**
- **Review Section:** Display all form data in read-only format
- **Folder Creation:** 
  - NEW folder naming logic (from `planning_docs/05_address_construction_folder_naming.md`)
  - Create folder in Google Drive
  - Copy spreadsheet templates
  - Populate Google Sheets with all data
  - Generate folder link
- **Edit Buttons:** Allow user to go back and edit any section

**Key Changes:**
- NEW folder naming convention
- NEW spreadsheet population logic (uses all Phase 2-4 work)
- Display proximity, AI content, investment highlights

**Reference:** `planning_docs/06_new_page_flow_developer_build_spec.md` Section 4

---

### **Step 8: Pre-Submission Checklist & Final Submission**
**Purpose:** Final checklist and submit to GHL + send email

**Features:**
- **Checklist:** Dynamic checklist based on property type
  - Base items (cashflow, photos, market performance)
  - Conditional items (P&B report for established, PCI for new)
- **Validation:** All items must be checked before submission
- **Submission:**
  - Create GHL record
  - Send email with folder link
  - Show success message
  - Reset form option

**Reference:** `planning_docs/06_new_page_flow_developer_build_spec.md` Section 5

---

## 🔧 **Implementation Tasks**

### **Task 1: Create Step 6 - Washington Brown Calculator**
**Files to Create:**
- `form-app/src/components/steps/Step6WashingtonBrown.tsx`

**Files to Modify:**
- `form-app/src/components/MultiStepForm.tsx` (update STEPS array, add Step 6 validation)
- `form-app/src/types/form.ts` (ensure `depreciation` field exists)

**Estimated Time:** 1-2 hours

---

### **Task 2: Create Step 7 - Cashflow Review & Folder Creation**
**Files to Create:**
- `form-app/src/components/steps/Step7CashflowReview.tsx`

**Files to Modify:**
- `form-app/src/lib/googleDrive.ts` (update folder creation logic with NEW naming)
- `form-app/src/lib/addressFormatter.ts` (ensure folder naming functions are correct)
- `form-app/src/components/MultiStepForm.tsx` (add Step 7)

**Key Logic:**
- Use `constructFolderName()` from `addressFormatter.ts`
- Populate ALL Google Sheets fields (Phases 2-4)
- Include proximity, AI content, investment highlights

**Estimated Time:** 2-3 hours

---

### **Task 3: Create Step 8 - Pre-Submission Checklist**
**Files to Create:**
- `form-app/src/components/steps/Step8Submission.tsx`

**Files to Modify:**
- `form-app/src/components/MultiStepForm.tsx` (add Step 8, update submission logic)

**Logic to Migrate:**
- Move checklist logic from current `Step6FolderCreation.tsx`
- Move GHL submission from current `Step6FolderCreation.tsx`
- Move email sending from current `Step6FolderCreation.tsx`

**Estimated Time:** 1-2 hours

---

### **Task 4: Update MultiStepForm.tsx**
**Changes Needed:**
- Update `STEPS` array from 6 steps to 8 steps
- Add validation for Step 6 (Washington Brown)
- Add validation for Step 7 (folder creation)
- Add validation for Step 8 (checklist)
- Update progress bar to show 8 steps

**Estimated Time:** 30 minutes

---

### **Task 5: Deprecate Old Step 6**
**Files to Archive/Remove:**
- `form-app/src/components/steps/Step6FolderCreation.tsx` (keep as reference, rename to `Step6FolderCreation.OLD.tsx`)
- `form-app/src/components/steps/Step6PropertyDetails.tsx` (check if still used)

**Estimated Time:** 15 minutes

---

## 📊 **Total Estimated Time**

- **Step 6 (Washington Brown):** 1-2 hours
- **Step 7 (Cashflow Review):** 2-3 hours
- **Step 8 (Submission):** 1-2 hours
- **MultiStepForm updates:** 30 minutes
- **Testing & debugging:** 1-2 hours

**Total:** 6-10 hours

---

## 🔗 **Dependencies**

### **Completed (Required):**
- ✅ Phase 2: Address construction & folder naming logic
- ✅ Phase 3: Step 5 refactoring
- ✅ Phase 4A: Proximity tool integration
- ✅ Phase 4B: AI content generation
- ✅ Phase 4C-1: Investment highlights lookup

### **Optional (Not Blocking):**
- ⚠️ Phase 4C-2: Investment highlights section editor (can be added later)

---

## 📝 **Key Reference Documents**

1. **`planning_docs/05_address_construction_folder_naming.md`**
   - Folder naming logic
   - `constructFolderName()` function spec

2. **`planning_docs/06_new_page_flow_developer_build_spec.md`**
   - Complete spec for Steps 6-8
   - UI mockups
   - Validation rules

3. **`planning_docs/03_google_sheets_mapping_core_fields_developer_build_spec.md`**
   - Core fields mapping (Rows 1-13)

4. **`planning_docs/04_google_sheets_mapping_new_fields_developer_build_spec.md`**
   - New fields mapping (Rows 14-27)

---

## ⚠️ **Important Notes**

1. **Folder Naming:** The NEW folder naming logic from Phase 2 MUST be used (not the old logic in current Step 6)

2. **Google Sheets Population:** Must include ALL fields from Phases 2-4:
   - Core fields (Rows 1-13)
   - New fields (Rows 14-27)
   - Proximity data
   - AI "Why This Property" content
   - Investment highlights

3. **Backward Compatibility:** The form store already has all the data fields needed, so no schema changes required

4. **Testing:** Each step should be tested independently before moving to the next

---

## 🚀 **Implementation Order**

**Recommended order:**

1. **Start with Step 6 (Washington Brown)** - Simplest, no dependencies
2. **Then Step 8 (Submission)** - Migrate existing logic from old Step 6
3. **Finally Step 7 (Cashflow Review)** - Most complex, depends on understanding data flow

**Alternative order (if you prefer):**

1. Step 8 (Submission) - Get the end working first
2. Step 6 (Washington Brown) - Add the new feature
3. Step 7 (Cashflow Review) - Connect everything together

---

## ✅ **Success Criteria**

- [ ] User can paste Washington Brown data and see parsed depreciation values
- [ ] User can review all form data on Step 7
- [ ] Folder is created with correct NEW naming convention
- [ ] Google Sheets are populated with ALL fields (Phases 2-4)
- [ ] Checklist displays correct items based on property type
- [ ] Submission creates GHL record successfully
- [ ] Email is sent with folder link
- [ ] Form can be reset after submission

---

**Ready to begin Phase 5 implementation!** 🎉

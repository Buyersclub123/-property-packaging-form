# Deployment Plan - Property Review System

**Generated:** January 21, 2026  
**Based on:** Developer Build Specs 01-09  
**Purpose:** Implementation order and dependency analysis

---

## **Implementation Order**

### **Phase 1: Foundation & Critical Fixes**

**1. Unit Number Persistence Bug Fix (Doc 08)**
- **Status:** ✅ Already implemented
- **Rationale:** Critical bug affecting data integrity. Must be verified working before building on top of it.
- **Dependencies:** None
- **Risk:** High (data loss)

---

### **Phase 2: Core Infrastructure**

**2. Address Construction & Folder Naming Logic (Doc 05)**
- **Rationale:** Foundational logic used across multiple features (folder creation, spreadsheet naming, display headers). Must be implemented early as many later features depend on it.
- **Dependencies:** None (reuses existing code)
- **Used by:** Steps 6-8, Google Sheets population, duplicate checking
- **Risk:** Medium (affects multiple downstream features)

**3. Google Sheets Core Fields Mapping (Doc 03 - Rows 1-13)**
- **Rationale:** Establishes the base spreadsheet population logic and keyword matching method that all other fields will use.
- **Dependencies:** Address construction (Step 2)
- **Used by:** Review page (Step 7), new fields mapping
- **Risk:** High (core business logic)

**4. Google Sheets New Fields Mapping (Doc 04 - Rows 14-27)**
- **Rationale:** Extends core mapping with additional fields. Must come after core fields to maintain consistency.
- **Dependencies:** Core fields mapping (Step 3)
- **Used by:** Steps 6-7 (Washington Brown, Review page)
- **Risk:** Medium (extends existing pattern)

---

### **Phase 3: Form Refactoring (Enables Parallel Development)**

**5. Step 5 Refactoring - Component Extraction (Doc 02)**
- **Rationale:** Splits Step 5 into modular components (`ProximityField.tsx`, `WhyThisPropertyField.tsx`, `InvestmentHighlightsField.tsx`). This "ringfences" each field's behavior and enables parallel development of the three automation features.
- **Dependencies:** None (pure refactoring)
- **Enables:** Steps 6-8 (parallel work on each section)
- **Risk:** Medium (refactoring risk, but no new features)

---

### **Phase 4: Step 5 Feature Implementation (Can be done in parallel)**

**6A. Proximity Tool Integration (Doc 01 + Doc 07 Section 1)**
- **Rationale:** Tool is already complete and tested. Integration is straightforward now that components are refactored.
- **Dependencies:** Step 5 refactoring (Step 5)
- **Risk:** Low (already tested in isolation)
- **Parallel:** Can be done alongside 6B and 6C

**6B. "Why This Property" AI Generation (Doc 07 Section 2)**
- **Rationale:** Independent feature with clear API requirements. Can be built in parallel with other Step 5 features.
- **Dependencies:** Step 5 refactoring (Step 5)
- **Risk:** Medium (external API dependency)
- **Parallel:** Can be done alongside 6A and 6C

**6C. Investment Highlights / Hotspotting Reports (Doc 07 Section 3)**
- **Rationale:** Most complex Step 5 feature (Google Sheets integration, lookup/save logic, conditional UI). Tackle last among Step 5 features.
- **Dependencies:** Step 5 refactoring (Step 5)
- **Risk:** High (complex conditional logic, new sheet structure)
- **Parallel:** Can be done alongside 6A and 6B

---

### **Phase 5: New Page Flow (Steps 6-8)**

**7. Step 6 - Washington Brown Calculator (Doc 06 Section 3)**
- **Rationale:** New page with paste & parse functionality. Relatively isolated feature. Test module logic already exists.
- **Dependencies:** Google Sheets new fields mapping (Step 4) - needs depreciation field structure
- **Risk:** Low (reuses existing test module logic)

**8. Step 7 - Cashflow Review & Folder Creation (Doc 06 Section 4)**
- **Rationale:** Displays all mapped fields and creates Google Drive folder. Depends on all field mapping logic being complete.
- **Dependencies:** 
  - Address construction (Step 2)
  - Core fields mapping (Step 3)
  - New fields mapping (Step 4)
  - Washington Brown data (Step 7)
- **Risk:** High (integrates all previous work)

**9. Step 8 - Pre-Submission Checklist & Final Submission (Doc 06 Section 5)**
- **Rationale:** Final submission flow. Must come last as it depends on folder creation being complete.
- **Dependencies:** Step 7 folder creation (Step 8)
- **Risk:** Medium (restructures existing Step 6 logic)

---

## **Cross-File Dependencies & Gaps**

### **Critical Dependencies**

1. **Address Construction → Multiple Features**
   - Used by: Folder naming, spreadsheet naming, duplicate checking, Step 7 display
   - **Gap:** Need to verify the existing address display logic location (likely `MultiStepForm.tsx`)

2. **Keyword Matching Method → All Field Mapping**
   - Docs 03 & 04 both use this method
   - **Consistency check needed:** Ensure implementation is reusable across all fields

3. **Dual Occupancy Detection → Multiple Fields**
   - Affects: Bed/Bath/Garage display, Rent calculations
   - **Gap:** Doc 02 flags this as "unresolved" - need to confirm detection method (`formData.decisionTree.dualOccupancy` or secondary field presence?)

4. **Title Type → Insurance Logic**
   - Doc 04 specifies strata types trigger "Insurance & Strata" mode
   - **Dependency:** Requires `formData.propertyDescription.title` from Page 3

5. **Property Type → P&B/PCI Field**
   - Doc 04 requires `formData.decisionTree.propertyType` (New vs Established)
   - **Dependency:** Must be set in Step 2

### **Gaps Requiring Clarification**

1. **Investment Highlights Google Sheet Name** (Doc 07)
   - What should the new sheet be named?
   - Should it be in the same spreadsheet or separate?

2. **AI API Configuration** (Doc 07)
   - User will provide exact prompt text for "Why This Property"
   - User will configure API keys in `.env`
   - **Action needed:** Get prompt text and API provider preference (OpenAI vs Gemini)

3. **Proximity API Endpoint Structure** (Doc 07)
   - Doc says "reuse logic from `test-all-categories`"
   - **Verification needed:** Confirm exact endpoint path and parameters

4. **Body Corp Cost Detection** (Doc 02 - Unresolved)
   - How to determine if property has body corp cost?
   - Is it `bodyCorpPerQuarter > 0` or a boolean flag?

5. **Contract Type Detection** (Doc 03)
   - What field stores contract type ("H&L Split Contract" vs "Single Contract")?
   - Affects: Land/Build cost logic, sheet deletion logic

6. **Form Data Storage Paths** (Doc 07)
   - Exact path structure for Step 5 data needs confirmation
   - Currently specified as `formData.contentSections.proximity` but needs verification for all three sections

### **Testing Sequence Considerations**

1. **Test Module Integration**
   - Doc 01: `test-all-categories` (proximity)
   - Doc 06: `test-sheets-population` (Washington Brown + field mapping)
   - **Strategy:** Reuse test module logic but need integration plan

2. **End-to-End Testing Requirements**
   - Must test full flow: Address entry → Step 5 automation → Washington Brown → Review → Folder Creation → Submission
   - **Gap:** No explicit E2E test scenarios documented

### **Risk Mitigation Notes**

1. **High-Risk Items to Tackle Early:**
   - ✅ Address construction (Step 2) - foundational
   - ✅ Core fields mapping (Step 3) - establishes pattern
   - ⚠️ Investment Highlights (Step 6C) - most complex Step 5 feature

2. **Field Isolation Concern** (Doc 01)
   - User specifically requested "ringfencing" field behaviors
   - Step 5 refactoring (Step 5) addresses this
   - **Must verify:** No cross-field dependencies after refactoring

3. **Fallback Strategy** (Doc 01 & 07)
   - All automation features need manual fallback
   - **Pattern:** If API fails → friendly error + manual paste option
   - Should be implemented consistently across all features

---

## **Recommended Parallel Work Strategy**

### **Sequential Work (Must be done in order)**
- Phase 1: Bug verification
- Phase 2: Core infrastructure (Steps 2-4)
- Phase 3: Step 5 refactoring
- Phase 5: Steps 6-8 (sequential within phase)

### **Parallel Work Opportunities**
- **Phase 4 (Steps 6A, 6B, 6C)** can be done by 3 developers simultaneously after Step 5 refactoring is complete
- Each Step 5 feature is independent and can be built in parallel

### **Team Allocation Suggestion**
- **Developer 1:** Address construction → Core fields → Step 6 (Washington Brown)
- **Developer 2:** New fields → Step 7 (Review page)
- **Developer 3:** Step 5 refactoring → Step 8 (Submission)
- **After Step 5 refactoring complete:**
  - Developer 1: Proximity integration (6A)
  - Developer 2: AI generation (6B)
  - Developer 3: Investment Highlights (6C)

---

## **Implementation Checklist**

### **Phase 1: Foundation**
- [ ] Verify Unit Number bug fix is working correctly
- [ ] Run regression tests on Step 2 (Decision Tree)

### **Phase 2: Core Infrastructure**
- [ ] Implement address construction logic (reuse existing)
- [ ] Add filename length validation (250 char limit)
- [ ] Implement duplicate folder checking
- [ ] Create keyword matching utility function
- [ ] Implement core fields mapping (rows 1-13)
- [ ] Test core fields with sample data
- [ ] Implement new fields mapping (rows 14-27)
- [ ] Test new fields with sample data

### **Phase 3: Refactoring**
- [ ] Extract `ProximityField.tsx` component
- [ ] Extract `WhyThisPropertyField.tsx` component
- [ ] Extract `InvestmentHighlightsField.tsx` component
- [ ] Create `useInvestmentHighlights` hook
- [ ] Simplify `Step5Proximity.tsx` to composition component
- [ ] Test Step 5 functionality after refactoring
- [ ] Verify no cross-field dependencies

### **Phase 4: Step 5 Features**
- [ ] **6A: Proximity Tool**
  - [ ] Integrate proximity API call on page load
  - [ ] Add loading state
  - [ ] Add address override functionality
  - [ ] Implement error handling with fallback
  - [ ] Test with multiple addresses
- [ ] **6B: AI Generation**
  - [ ] Create backend endpoint `/api/generate-content/why-property`
  - [ ] Get AI prompt text from user
  - [ ] Configure API keys in `.env`
  - [ ] Add regenerate button
  - [ ] Implement error handling with fallback
  - [ ] Test with multiple suburbs
- [ ] **6C: Investment Highlights**
  - [ ] Create new Google Sheet structure
  - [ ] Create API endpoints (lookup, list, link, create)
  - [ ] Implement lookup logic
  - [ ] Build "match found" UI
  - [ ] Build "no match" UI with two options
  - [ ] Implement save logic
  - [ ] Test with various scenarios

### **Phase 5: New Page Flow**
- [ ] **Step 6: Washington Brown**
  - [ ] Create Step 6 page component
  - [ ] Add paste textarea
  - [ ] Implement parse logic (DIMINISHING VALUE column)
  - [ ] Add 10 editable fields
  - [ ] Test with sample Washington Brown output
- [ ] **Step 7: Review & Folder Creation**
  - [ ] Create Step 7 page component
  - [ ] Display all fields in spreadsheet order
  - [ ] Implement conditional Insurance UI
  - [ ] Add editable fields (Rates, Insurance, Build Window, Cashback)
  - [ ] Create "Create Folder" button
  - [ ] Implement folder creation logic
  - [ ] Implement spreadsheet population
  - [ ] Implement contract type sheet deletion
  - [ ] Test folder creation end-to-end
- [ ] **Step 8: Submission**
  - [ ] Restructure existing Step 6 as Step 8
  - [ ] Move checklist to Step 8
  - [ ] Move attachments to Step 8
  - [ ] Move submission logic to Step 8
  - [ ] Test submission flow
  - [ ] Verify GHL/Make.com integration

### **Final Testing**
- [ ] End-to-end test: Complete property submission
- [ ] Test dual occupancy properties
- [ ] Test single contract vs split contract
- [ ] Test all property types (New vs Established)
- [ ] Test all title types (especially strata)
- [ ] Test error scenarios (API failures)
- [ ] Test manual fallback options
- [ ] Verify all confirmation blocks from planning docs

---

## **Summary**

**Total Implementation Steps:** 9 (including 1 already complete)  
**Estimated Complexity:** High (multiple external integrations, complex conditional logic)  
**Critical Path:** Address Construction → Core Fields → New Fields → Step 5 Refactoring → Step 5 Features → Steps 6-8  
**Parallel Opportunities:** Step 5 features (6A, 6B, 6C) after refactoring complete  
**Highest Risk Items:** Investment Highlights (6C), Step 7 Review Page (8)  
**Lowest Risk Items:** Unit Number fix (1), Washington Brown (7), Proximity integration (6A)

---

## **Document References**

| Phase | Step | Document Reference |
|-------|------|-------------------|
| 1 | 1 | Doc 08: `08_unit_number_bug_fix_developer_build_spec.md` |
| 2 | 2 | Doc 05: `05_developer_build_spec.md` |
| 2 | 3 | Doc 03: `03_developer_build_spec_google_sheets_core_fields.md` |
| 2 | 4 | Doc 04: `04_google_sheets_mapping_new_fields_DEVELOPER_BUILD_SPEC.md` |
| 3 | 5 | Doc 02: `02_developer_build_spec.md` |
| 4 | 6A | Doc 01: `01_developer_build_spec.md` + Doc 07: `07_step5_proximity_content_requirements_DEVELOPER_BUILD_SPEC.md` |
| 4 | 6B | Doc 07: `07_step5_proximity_content_requirements_DEVELOPER_BUILD_SPEC.md` |
| 4 | 6C | Doc 07: `07_step5_proximity_content_requirements_DEVELOPER_BUILD_SPEC.md` |
| 5 | 7 | Doc 06: `06_developer_build_spec.md` |
| 5 | 8 | Doc 06: `06_developer_build_spec.md` |
| 5 | 9 | Doc 06: `06_developer_build_spec.md` |

---

**Status:** Ready for Implementation  
**Last Updated:** January 21, 2026

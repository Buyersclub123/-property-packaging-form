# 02 - Developer Build Spec

_Extracted from planning session: Form Architecture Analysis & Refactoring Plan_

---

## Document: Form Architecture Analysis & Refactoring Plan

---

## 1. Form Structure Confirmation

The multi-step form consists of 6 steps:
1. **Step 1:** Address & Risk Check (`Step0AddressAndRisk`)
2. **Step 2:** Decision Tree (`Step1DecisionTree`)
3. **Step 3:** Property Details (`Step2PropertyDetails`)
4. **Step 4:** Market Performance (`Step3MarketPerformance`)
5. **Step 5:** Proximity & Content (`Step5Proximity`)
6. **Step 6:** Folder Creation (`Step6FolderCreation`)

---

## 2. Refactoring Plan - Step 5 (Proximity & Content)

### Current State Issues
- Component handles three distinct large text fields in a single file
- Investment Highlights lookup/save logic is intermingled with UI
- State management uses local state synced to global store via `updateFormData`
- Paste handlers clean text from Excel
- Adding auto-generation to "Proximity" would increase complexity

### Approved Refactoring Structure
Create modular architecture in `src/components/steps/proximity/`:

1. **Extract `WhyThisPropertyField.tsx`**
   - Handles "Why This Property" text field
   
2. **Extract `ProximityField.tsx`**
   - Handles proximity text field
   - **Future location for auto-generation button**
   
3. **Extract `InvestmentHighlightsField.tsx`**
   - Contains lookup/save logic
   - Calls `/api/investment-highlights/save`
   - Depends on `address.lga` and `address.state`
   
4. **Extract custom hook `useInvestmentHighlights`**
   - Isolate API logic for Investment Highlights

5. **Simplify `Step5Proximity.tsx`**
   - Becomes a composition component of the three extracted fields

---

## 3. Refactoring Plan - Step 6 (Folder Creation)

### Current State Issues
- Heavy component mixing UI state and business logic
- Handles: folder creation, checklist management, GHL submission, Make.com integration, email resending
- Complex data transformations: `removeInternalFields`, `convertEmptyStringsToNull`
- Risk: Changes to sheet formatting could break GHL submission if they share transformation code

### Approved Refactoring Structure
Create modular architecture in `src/components/steps/folder-creation/`:

1. **Extract `FolderCreationAction.tsx`**
   - Handles folder creation API calls
   - Updates global address state
   
2. **Extract `SubmissionChecklist.tsx`**
   - Reusable checklist component
   
3. **Extract `SubmissionSuccess.tsx`**
   - Success screen component
   
4. **Extract submission logic**
   - Move to `src/lib/submissionHelpers.ts` OR
   - Create hook `useSubmitProperty`
   - Contains data transformation logic (`handleSubmit`)

---

## 4. Google Sheets Population - Field Mapping Logic (Fields 1-13)

### Approved Approach
- Review fields 1-13 first before tackling fields 14-27
- Logic discussion precedes UI design
- Test module exists at: `http://localhost:3000/test-sheets-population`

### Field Mapping Rules

| # | Sheet Field | Value Example | Source Field | New Field? | Business Logic |
|---|-------------|---------------|--------------|------------|----------------|
| 1 | Address | 5 Antilles St Parrearra QLD 4575 | Address | No | Direct mapping |
| 2 | State | QLD | Address State | No | Direct mapping |
| 3 | Land Cost | 450000 | Land Cost | No | Direct mapping |
| 4 | Build Cost | 150000 | Build Cost | No | Direct mapping |
| 5 | Total Cost | 600000 | Total Cost | No | Direct mapping |
| 6 | Cashback Value | 15000 | Cashback Value | No | **Conditional:** Only if cashback/rebate type = "cashback", present cashback value in this field |
| 7 | Total Bed | 3 + 2 | Total Beds | No | **Dual occupancy format:** Primary bed + Secondary bed (e.g., "4 + 2") |
| 8 | Total Bath | 2 + 1 | Total Bath | No | **Dual occupancy format:** Primary bath + Secondary bath (e.g., "3.5 + 1.5") |
| 9 | Total Garage | 1 + 0 | Total Garage | No | **Dual occupancy format:** Primary garage + Secondary garage (e.g., "1 + 1") |
| 10 | Low Rent | 750 | Total of Lower Rent | No | **Dual occupancy:** Sum of "Appraised rent FROM" for primary + secondary |
| 11 | High Rent | 850 | Total of Higher Rent | No | **Dual occupancy:** Sum of "Appraised rent TO" for primary + secondary |
| 12 | Average Rent | 800 | N/A | No | **Auto-calculated in sheet** - No form field needed (average of Low & High Rent) |
| 13 | Rates | 4020 | Rates | **Yes** | Direct mapping - New field required |

### Insurance Fields (Complex Logic)

| # | Sheet Field | Source Field | New Field? | Business Logic |
|---|-------------|--------------|------------|----------------|
| 14 | Insurance or Insurance & Strata | insurance / Insurance / Strata | **Yes** | **Conditional label:**<br>• If property has body corp cost → "Insurance & Strata"<br>• Otherwise → "Insurance" |
| 15 | Insurance (value) | Insurance Value | **Yes** | **Conditional calculation:**<br>• If property has body corp cost → Body corp cost (annualized) + Insurance<br>• Otherwise → Insurance cost value only |

### Property Type Dependent Field

| # | Sheet Field | Source Field | New Field? | Business Logic |
|---|-------------|--------------|------------|----------------|
| 16 | P&B / PCI | N/A | **Yes** | **Property type conditional:**<br>• If NEW property → "P&B + PCI Reports"<br>• If ESTABLISHED property → "Pest & Build (P&B) report" |

### Depreciation Fields (Years 1-10)

| # | Sheet Field | Source Field | New Field? |
|---|-------------|--------------|------------|
| 17-26 | Depreciation Year 1-10 | Depreciation Field Year 1-10 | **Yes** (all 10 fields) |

**Logic:** Direct mapping from form depreciation fields for years 1 through 10.

---

## 5. Technical Decisions

### State Management
- Local state in components syncs to global store via `updateFormData`
- Maintain this pattern during refactoring

### API Dependencies
- Investment Highlights API depends on `address.lga` and `address.state`
- Ensure these dependencies are preserved in extracted components

### Data Transformation
- Existing transformations: `removeInternalFields`, `convertEmptyStringsToNull`
- Must be isolated to prevent breaking GHL submission when sheet formatting changes

### Modular Approach Benefits
- Future "Generate Proximity" feature only touches `ProximityField.tsx`
- Ringfenced behaviors prevent cascading changes

---

## 6. Unresolved / Ambiguous Items

### ⚠️ Flagged for Clarification

1. **Dual Occupancy Detection Logic**
   - How does the system determine if a property is dual occupancy?
   - Is there a specific field or flag in the form?
   - Affects fields: Total Bed, Total Bath, Total Garage, Low Rent, High Rent

2. **Body Corp Cost Detection**
   - How is "has body corp cost" determined?
   - Is there a boolean flag or is it based on body corp cost > 0?
   - Affects: Insurance label and value calculation

3. **Property Type (New vs Established)**
   - What field determines if property is "NEW" or "ESTABLISHED"?
   - Affects: P&B / PCI field value

4. **Depreciation Fields**
   - Are all 10 depreciation year fields mandatory?
   - Should they be validated?

5. **Fields 14-27 Review**
   - User indicated fields 14-27 need separate review after fields 1-13 are confirmed
   - Current spec covers through field 26 (Depreciation Year 10)
   - Field 27 not yet defined

6. **Test Module Integration**
   - How will `test-sheets-population` logic be integrated into main form?
   - Timing of integration relative to refactoring work?

---

## 7. Next Steps (Approved)

1. ✅ Review and confirm field mapping logic for fields 1-13
2. ⏳ Tackle fields 14-27 after confirmation
3. ⏳ Discuss UI aspects after logic is finalized
4. ⏳ Implement refactoring for Step 5 and Step 6
5. ⏳ Integrate test module logic into main form

---

**Document Status:** Ready for developer implementation pending clarification of flagged items.

**User Approval:** "Approved - and of course I expect you to keep documentation on what we agree which is easily picked up by the next chates as neededed"

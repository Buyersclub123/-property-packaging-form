# 02 - Form Architecture Analysis & Refactoring Plan

_Section from planning session transcript: Lines 200-320_

---

**Cursor**

## Analysis of Steps 5 & 6 and "Page 6" Confirmation

### 1. Confirming "Page 6"
Based on `MultiStepForm.tsx`:
- Step 1: Address & Risk Check (`Step0AddressAndRisk`)
- Step 2: Decision Tree (`Step1DecisionTree`)
- Step 3: Property Details (`Step2PropertyDetails`)
- Step 4: Market Performance (`Step3MarketPerformance`)
- **Step 5: Proximity & Content** (`Step5Proximity`)
- **Step 6: Folder Creation** (`Step6FolderCreation`)

So "Page 5" is indeed `Step5Proximity.tsx` and "Page 6" is `Step6FolderCreation.tsx`.

### 2. Analysis of Step 5 (`Step5Proximity.tsx`)
**Coupling & Logic:**
- **State Management:** Uses local state (`proximity`, `whyThisProperty`, `investmentHighlights`) which syncs to the global store via `updateFormData`.
- **Side Effects:**
    - `handleSaveInvestmentHighlights`: Calls `/api/investment-highlights/save`. Depends on `address.lga` and `address.state`.
    - Paste handlers: Clean text from Excel.
- **Risk:**
    - The component handles three distinct large text fields.
    - Logic for "Investment Highlights" (lookup/save) is intermingled with the UI for "Proximity" and "Why This Property".
    - Changing the behavior of "Proximity" (e.g., adding auto-generation) adds more complexity to an already busy component.
- **Refactoring Opportunity:**
    - Extract `WhyThisPropertySection`, `ProximitySection`, and `InvestmentHighlightsSection` into separate sub-components.
    - Isolate the API logic for Investment Highlights into a custom hook `useInvestmentHighlights`.

### 3. Analysis of Step 6 (`Step6FolderCreation.tsx`)
**Coupling & Logic:**
- **Heavy Logic:** Handles folder creation, checklist management, GHL submission, Make.com integration, and email resending.
- **Dependencies:** Heavily relies on `formData` from previous steps (Address, Decision Tree).
- **Complexity:**
    - `handleCreateFolder`: Calls API, updates global address state.
    - `handleSubmit`: Performs complex data cleaning (`removeInternalFields`, `convertEmptyStringsToNull`), connects to Make.com, handles GHL response.
- **Risk:**
    - The "Submit" logic is massive and mixes UI state (success screens, error handling) with business logic (data transformation, API calls).
    - If we change how data is formatted for the sheet (previous user request), we risk breaking the GHL submission logic if they share transformation code.
- **Refactoring Opportunity:**
    - Extract the submission logic into a utility or hook (`usePropertySubmission`).
    - Separate the "Success Screen" into its own component.
    - Extract the "Checklist" into a reusable component.

### 4. Proposed Refactoring Plan
I will structure the refactor to "ringfence" these behaviors.

**Step 5 Refactor:**
1.  Create `src/components/steps/proximity/` folder.
2.  Extract `WhyThisPropertyField.tsx`.
3.  Extract `ProximityField.tsx` (this is where we will eventually add the auto-gen button).
4.  Extract `InvestmentHighlightsField.tsx` (containing the lookup/save logic).
5.  Simplify `Step5Proximity.tsx` to just compose these three.

**Step 6 Refactor:**
1.  Create `src/components/steps/folder-creation/` folder.
2.  Extract `FolderCreationAction.tsx` (handling the folder creation API).
3.  Extract `SubmissionChecklist.tsx`.
4.  Extract `SubmissionSuccess.tsx`.
5.  Move the complex data transformation logic (`handleSubmit`) into `src/lib/submissionHelpers.ts` or a hook `useSubmitProperty`.

This modular approach ensures that when we add "Generate Proximity" later, we only touch `ProximityField.tsx`.

Ready to present this plan.

---

**User**

ok to shre with you  we are currently testing otherr behaviour in a standalone module (http://localhost:3000/test-sheets-population)  for more pages to be brough tinto the form, given the analysis you just did itds perhaps good for you to be aware of it. this is the handover doc the other chat just got, to call out, it is currently built to prove we could create folder, edit gogole sheets, rename, deletd one of the google sheets. this is proven but now I need to work on the logic for how this work, I wonder if it is worth doing everuthing with you. What do you think: Test Sheet population: Handover document created
File: property-review-system/docs/TEST-SHEETS-POPULATION-HANDOVER.md
Contents:
What has been implemented — folder creation, sheet population, contract type deletion, file renaming
Testing status — what's working and what's not yet implemented
What we were about to work on — duplicate folder name checking (highlighted)
Test instructions — how to test each feature
Known issues & resolutions — problems fixed during testing
Next steps — duplicate folder name checking implementation
Highlights:
All core functionality is complete and tested
Duplicate folder name checking is the next item (not yet implemented)
Document includes test instructions and file references
Ready for review. Should I make any changes?

so are you saying we wouldl do the logic for http://localhost:3000/test-sheets-population first, then ensure each page int the for is ringhfewnmced, thenm look at how we put the new pages into the form?

That was a questions, not s difecton, please answer me when  I ask soemthing

Absolutely, I think it would be good if you can review 2 things (at least), fields which already exist in the proeprty form, the code in the http://localhost:3000/test-sheets-population that exists alreadt because therfe is some logic in there already, specifically for fields detailed in rows 1-13: But I think we shoujld revisit each of them to confirm before we tackle fiells 14-27. We will also need to discuss UI aspect but lets do logic first.Field	Value	Mapped Field	New Field neede?	Comments
Address	5 Antilles St Parrearra QLD 4575	Address		
State	QLD	Address State		
Land Cost	450000	Land Cost		
Build Cost	150000	Build Cost		
Total Cost	600000	Total Cost		
Cashback Value	15000	Cashback Value (not rebate)		If cashback / Rebate vlue = cashback, present cashvack value in this field
Total Bed	3 + 2	Total Beds		If Dual occupancy show primary bed + secondary bed i.e 4 + 2
Total Bath	2 + 1	Total Bath		If Dual occupancy show primary bath + secondary bath i.e 3.5 + 1.5
Total Garage	1 + 0	Total Garage		If Dual occupancy show primary garage + secondary garaga i.e 1 + 1
Low Rent	750	Total of Lowe Rent		If dual occupancy total of Appraised rent FROM for primary and secondary
High Rent	850	Total of Higher Rent		If dual occupancy total of Appraised rent TO for primary and secondary
Average Rent	800	Average of Low & High Rent	Auto Calc no field	This could be auto calc in the sheet so no need to pull in from form
Rates	4020	Rates	Yes	
Insurance or Insurance & Strata Field	Insurance	insurance / Insurance / Strata	Yes	If a property has body corp cost, the value in this cell should be Insurance & Strata, other wise the value should just be insurance
Insurance	2800	Insurance Value	Yes	If a proeprty has body corp cost, the value in this cell should be body corp cost (annualisd) + insurance. Otherwise it should just be the insruance cost value
P&B / PCI	Pest & Build (P&B) report		Yes	If this is a new property the value should be P&B + PCI Reports if the property is established the value should be Pest & Build (P&B) report
Depreciation Year 1	12000		Yes	This value need to be from Deprecition Field Year 1
Depreciation Year 2	8000		Yes	This value need to be from Deprecition Field Year 2
Depreciation Year 3	7000		Yes	This value need to be from Deprecition Field Year 3
Depreciation Year 4	7000		Yes	This value need to be from Deprecition Field Year 4
Depreciation Year 5	6000		Yes	This value need to be from Deprecition Field Year 5
Depreciation Year 6	6000		Yes	This value need to be from Deprecition Field Year 6
Depreciation Year 7	6000		Yes	This value need to be from Deprecition Field Year 7
Depreciation Year 8	5000		Yes	This value need to be from Deprecition Field Year 8
Depreciation Year 9	5000		Yes	This value need to be from Deprecition Field Year 9
Depreciation Year 10	5000		Yes	This value need to be from Deprecition Field Year 10

Approved - and of course I expect you to keep documentation on what we agree which is easily picked up by the next chates as neededed

---

## Confirmation Block

**User Approval:** "Approved - and of course I expect you to keep documentation on what we agree which is easily picked up by the next chates as neededed"

**Context:** User agreed to review field mapping logic for Google Sheets population, starting with fields 1-13 before tackling fields 14-27. Logic discussion to precede UI design.

---

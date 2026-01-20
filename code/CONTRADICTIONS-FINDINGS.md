# MODULE-3 Code Review - Contradictions with V6 Requirements

**Date:** 2026-01-15  
**Reviewer:** AI Assistant  
**Baseline:** MODULE-3-COMPLETE-FOR-MAKE.js.baseline-v6  
**Reference:** EMAIL-VISUAL-EXAMPLES-V6 JT-CORRECTED.txt

---

## Review Status: IN PROGRESS

This document captures all contradictions found between the current code implementation and the v6 requirements (visual examples and matrices).

---

## SECTION 1: PURCHASE PRICE

### Contradiction 1.1: Missing "House & Land package" hardcoded text for H&L properties
- **Location:** Lines ~1830-1899 (Purchase Price section)
- **Current Behavior:** Code only shows Asking, Comparable Sales, Accepted Acquisition Target for all properties
- **Expected Behavior (v6):** 
  - For H&L properties (NEW): Should show "House & Land package" as hardcoded text (not from a field), then Price/Land/Build/Total Price, Net Price (if cashback), Comparable Sales
  - For Single Contract (NEW): Should show "House & Land package" as hardcoded text, then Price, Net Price (if cashback), Comparable Sales
  - For Established: Should show Asking, Comparable Sales, Accepted Acquisition Target, Cashback (if 03 contract type)
- **Impact:** HIGH - Completely different structure for New vs Established properties

Asking is a specific term used for established properties, which is why we do not show H&L as an option as this is only for NEW properties, and you would not use H&L with the terminology of Asking. 
So yes to clarify, yes, The code should just include the literal string "House & Land package" in the HTML/text output for New properties where H&L is selected in the H&L or Project field

### Contradiction 1.2: Missing logic to hide "Asking" for New properties
- **Location:** Lines ~1866-1867
- **Current Behavior:** Shows "Asking" for all properties if asking/askingText exists CORRECT - However it is better for you to use the expected behavior you wrote below, see my notes below to explain the history
- **Expected Behavior (v6):** "Asking" should NOT show for New properties (H&L, SMSF, Projects) CORRECT
- **Impact:** HIGH
The reason for what looks like a contradiction, is because when I first asked you to code this, I knew the fields in the form were dynamic, so based on a value of one field, another field would not be visible, so the field SHOULD come across to Make.com empty, HOWEVER, I realised that if someone starts a certain type of record in Make.com but then changes their mind and goes back and changes values, some of the visible fields that has a value entered into them then becomes hidden (because of the dynamic nature for the form) which means by telling you only present a field IF it has a value if flawed.


### Contradiction 1.3: Missing logic to hide "Accepted Acquisition Target" for New properties
- **Location:** Lines ~1877-1878
- **Current Behavior:** Shows "Accepted Acquisition Target" for all properties if values exist
- **Expected Behavior (v6):** "Accepted Acquisition Target" should NOT show for New properties Correct - The reason is the same as I explained for 1.2
- **Impact:** HIGH


### Contradiction 1.4: Missing H&L price structure (Land/Build/Total Price with indentation)
- **Location:** Purchase Price section
- **Current Behavior:** No logic to show Land Price, Build Price, Total Price with proper formatting
- **Expected Behavior (v6):** This was a new requirement I had not detailed this requirement before (wanted to focus on getting the data before working on the formatting)
  - H&L Package: Price (Total Price, bold), then Land Price (indented 30px), Build Price (indented 30px)
  - Single Contract: Just "Price" (bold)
- **Impact:** HIGH

### Contradiction 1.5: Missing Cashback display for Established (03_internal_with_comms contract type)
- **Location:** Purchase Price section
- **Current Behavior:** No logic to show Cashback value for Established properties
- **Expected Behavior (v6):** 
  - For Established with 03_internal_with_comms: Show Cashback/Rebate Value (but NOT the Type field) Yes,
  - Never show Net Price for Established (even if cashback exists) CORRECT
- **Impact:** MEDIUM
LETS PRIORITISE TO TEST THIS SCENARIO

### Contradiction 1.6: Missing logic to hide Cashback/Rebate Value and Type fields for New properties
- **Location:** Purchase Price section (if it exists)
- **Current Behavior:** Unknown - need to check if these fields are shown
- **Expected Behavior (v6):** For New properties, do NOT show "Cashback/Rebate Value" or "Cashback/Rebate Type" fields - the Net Price sentence provides the cashback information
- **Impact:** MEDIUM
For New properties (H&L, Single Contract), the Cashback/Rebate Value and Type fields should NOT be displayed separately because:
- New properties have fixed prices (Land + Build = Total Price), so Net Price can be calculated
- The Net Price sentence (e.g., "Net Price: $732,850 when considering the $20,000 cashback") already contains the cashback information
- Showing separate Cashback/Rebate Value/Type fields would be redundant

This differs from Established properties where:
- Final price is unknown (negotiated), so Accepted Acquisition Target is used instead of Net Price
- Cashback/Rebate Value is shown separately because Net Price cannot be calculated with an unknown final price

ONCE WE REVIEW WHAT THIS LOOKS LIKE I MAY CHANGE MY MIND ON THIS and add the fields into New as well so lets make a priority to test

---

## SECTION 2: PROPERTY DESCRIPTION

### Contradiction 2.1: Registration field showing for Established properties
- **Location:** Lines ~1733-1735
- **Current Behavior:** Shows "Registration" if landRegistrationDisplay exists
- **Expected Behavior (v6):** Established properties NEVER have Registration - only Built Year. Registration should only show for New properties (if applicable)
- **Impact:** HIGH
Correct, again the original logic was based on if a field is populated show it but of course this is flawed. SO the expected behaviour is correct.


### Contradiction 2.2: Body Corp logic needs update for title types
- **Location:** Lines ~1741-1743
- **Current Behavior:** Shows Body Corp if bodyCorpQuarter exists
- **Expected Behavior (v6):** 
  - Show Body Corp $ Cost field ONLY for title types: STRATA, OWNERS CORP (COMMUNITY), SURVET STRATA, BUILT STRATA
  - Do NOT show for: INDIVIDUAL, TORRENS, GREEN, TBC
  - Body Corp Dialogue: Only show if it has text entered (when cost field is shown)
- **Impact:** MEDIUM
Yes - it is preferable for dialogue to be added IF there is a body corp cost but this would make the form too restrictive and could result in poor information being given to the client, so I would prefer no information rather than poor information (key stroke, minus sign etc just to get around the mandatory nature of the field if we went that way)

---

## SECTION 3: RENTAL ASSESSMENT

### Contradiction 3.1: Current Rent/Expiry/Current Yield should always show for tenanted properties (even if null)
- **Location:** Lines ~1944-1952 (single occupancy), ~2000+ (dual occupancy)
- **Current Behavior:** Only shows if value exists (uses `if (currentRentPrimary)`, `if (expiryPrimary)`, `if (yieldPct)`)
- **Expected Behavior (v6):** For Established properties, if tenanted, Current Rent, Expiry, and Current Yield should ALWAYS show (even if value is null, as they're mandatory fields in the form for tenanted properties)
- **Impact:** MEDIUM
- **Reason:** Similar to Contradiction 1.2 - these fields are mandatory in the form for tenanted properties, so even if somehow a value is missing in the data, the fields should still be displayed (they just won't have values, which would indicate a data issue)
Yes, again this was based on the flawed approach I took initially as the form hides these fields if the property was new. but it is better to move to the expected behaviour you show above, they are mandatory fields so the value should never be null. Perhaps we can consider an exception report so fields we expect a value for based on behaviour are flagged if they do not have a value

---

## SECTION 4: SUBJECT LINE

### Contradiction 4.1: Need to review subject line logic against v6 requirements
- **Location:** Lines ~1504-1576 (estimated)
- **Current Behavior:** Code has some subject line logic but needs verification against v6 requirements
- **Expected Behavior (v6):** 6 different subject line formats based on property type: CORRECT
  1. Established: "Property Review: [ADDRESS]"
  2. H&L Single: "Property Review (H&L X-bed Single Family): LOT [ADDRESS]"
  3. H&L Dual: "Property Review (H&L X-bed Dual-key): LOT [ADDRESS]"
  4. SMSF Single: "Property Review (SMSF X-bed Single Family): LOT [ADDRESS]"
  5. SMSF Dual: "Property Review (SMSF X-bed Dual-key): LOT [ADDRESS]"
  6. Projects: "Property Review (H&L Project): [PROJECT NAME], [ESTATE ADDRESS]" or "Property Review (SMSF Project): [PROJECT NAME], [ESTATE ADDRESS]"
- **Impact:** HIGH
- **Notes:** 
  - Property type identification: Use `propertyType`, `dealType`, `templateType`, `is_parent_record` fields
  - Single vs Dual: Use `single_or_dual_occupancy` field
  - Plan: Create inferred "Contract Type" field in form (hidden/computed from "H&L or Project" + "Contract Type (for Deal Sheet)") to simplify logic - this field will flow through GHL → webhook → Make.com
  - Contract Type values: "Single Contract" or "Split Contract" (computed, not user-visible initially)
  - Subject line logic should use this cleaner field structure

---

## SECTION 5: PORTAL VERSION

### Contradiction 5.1: Portal version needs review for all sections
- **Location:** Portal-specific code sections (starting around line ~400)
- **Current Behavior:** Portal version has separate code paths but may not have all the same logic updates as main version
- **Expected Behavior (v6):** Portal version should have IDENTICAL logic as main version for all sections (Purchase Price, Property Description, Rental Assessment, Subject Line, Body Corp, etc.)
- **Impact:** HIGH
- **Notes:** 
  - Portal version is used when selecting a property from the Deal Sheet to send to client(s) (via "Send Again" button)
  - The email output should be IDENTICAL to the main version - only difference is data source (already packaged property from GHL vs. new webhook)
  - Portal version uses separate variables (e.g., `purchaseHtmlPortal`, `rentalHtmlPortal`, `propertyDescHtmlPortal`) but should produce same output
  - Portal version has its own property type detection (`isEstablishedPortal`, `isHAndLPortal`, `isSMSFPortal`) but should use same logic
  - All contradictions found in main version (1.1-1.6, 2.1-2.2, 3.1, 4.1) also apply to Portal version
  - All fixes applied to main version should also be applied to Portal version to ensure identical email formatting

---

## NEXT STEPS

**✅ REVIEW COMPLETE** - All contradictions identified and documented:
- ✅ All sections reviewed (Purchase Price, Property Description, Rental Assessment, Subject Line, Portal Version)
- ✅ All contradictions documented with user clarifications
- ✅ Field descriptions and usage notes added

**Implementation Priority:**
1. Create inferred "Contract Type" field in form (hidden/computed from "H&L or Project" + "Contract Type (for Deal Sheet)")
2. Map Contract Type field through GHL custom object and webhook
3. Map Contract Type through all Make.com scenarios
4. Fix all email formatting contradictions (both main and Portal versions)
5. Fix form validation: Add Comparable Sales as mandatory for H&L Single Contract
6. Test email formatting for all property types and scenarios
7. Implement client send tracking (see CLIENT-SEND-TRACKING-REQUIREMENT.md)

---

## NOTES

- The code appears to have logic for `isEstablished` but need to verify how it's determined
- Need to check contract type detection logic
- Need to verify field names for cashback/rebate values and types
- Body Corp title type field name needs to be identified

---

## REFERENCE DOCUMENTS

- **Field Descriptions & Notes:** `C:\Users\User\.cursor\JT FOLDER\FIELD-DESCRIPTIONS-AND-NOTES.txt`
  - User is providing field descriptions and usage information (GHL, Email, Deal Sheet)
  - This will help clarify field names, purposes, and where they're used

- Visual Examples: `C:\Users\User\.cursor\JT FOLDER\EMAIL-VISUAL-EXAMPLES-V6 JT-CORRECTED.txt`

- Decision Matrices: Various CSV files in `C:\Users\User\.cursor\JT FOLDER\`

- Documentation: `property-review-system/docs/EMAIL-TEMPLATE-FORMATTING-STRUCTURE.md`

---

comparableSales - This should always be shown as it is mandatory for all property types in the form (PLEASE VERIFY I AM RIGHT)
purchasePriceDialogue - Yes this is optional so we only present if they have written something, otherwise having an empty placeholder in the email looks unattractive
rentAppraisalPrimaryFrom/rentAppraisalPrimaryTo Always show for every property as it is needed (in the form should be mandatory for every property anyway
rentAppraisalSecondaryFrom/rentAppraisalSecondaryTo Always show for every property that has secondary dwelling as it is needed (in the form should be mandatory anyway)
appraisedYield Always show for every property as it is needed (in the form it auto populates anyway so every property should have an appraised yield)
rentalAssessmentDialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
propertyDescription_additional_dialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
bodyCorpQuarter Should be mandatory for all title types OTHER THAN Individual, Torrens, Green, and TBC as these fields listed dont have body corp costs
bodyCorp_dialogue (if it exists) Optional in the form as we may not have dialogue so having a blank placeholder in the email is unattractive
zoning This is always needed in the email so should always be visible, the form has this field as mandatory so should always be populated
flood/floodDialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
bushfire/bushfireDialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
mining/miningDialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
otherOverlay/otherOverlayDialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
specialInfrastructure/specialInfrastructureDialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
dueDiligenceAcceptance This should be in for every property as it is needed, it is mandatory in the form anyway so should always have a value
landRegistration This is only used for new properties and is always needed in the email, this should be mandatory in the form anyway for new properties
buildSize This is only used for new properties and is always needed in the email, this should be mandatory in the form anyway for new properties
yearBuilt This is only used for established properties and is always needed in the email, this should be mandatory in the form anyway for established properties
landSize This should be in for every property as it is needed, it should be mandatory in the form anyway for all properties
title This should be in for every property as it is needed, it is mandatory in the form anyway so should always have a value
proximity This should be in for every property as it is needed, it is mandatory in the form anyway so should always have a value
marketPerformance fields (mp3m, mp1y, mp3y, mp5y, medianYield, etc.) This should be in for every property as it is needed, it is mandatory in the form anyway so should always have a value
marketPerformance_additional_dialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
investmentHighlights Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
attachmentsDialogue Optional field in the form so yes only populate in the email if it has a value otherwise an empty placeholder looks unattractive
folderLink This should be in for every property as it is needed, it is mandatory in the form anyway so should always have a value

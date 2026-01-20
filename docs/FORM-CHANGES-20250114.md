# Form Changes - January 14, 2025

**Purpose:** Document form field changes identified during field comparison analysis  
**Status:** In Discussion - Not Yet Implemented

---

## Changes to Remove from Form

### 1. Remove `build_size_primary` and `build_size_secondary`

**Reason:** Not relevant - form uses single `build_size` field across primary and secondary for dual occupancy.

**Fields to Remove:**
- `propertyDescription.buildSizePrimary`
- `propertyDescription.buildSizeSecondary`

**Files to Update:**
- `form-app/src/types/form.ts` - Remove from `PropertyDescription` interface (lines 112-113)
- `form-app/src/components/steps/Step2PropertyDetails.tsx` - Remove form inputs for these fields

**Action:** Delete these fields from form code.

**Priority:** LOW - Currently doesn't error, not urgent.

---

## 2. `project_address` (Module 21 missing)

**Status:** Needs more analysis later - not urgent tonight

**Question:** For single properties (Route 1/Module 21), is `project_address` ever needed, or only for projects (Route 2/Module 22)?

**Action:** Analyze later to determine if Module 21 needs to send `project_address` for single properties.

---

## 3. `project_name` (Module 21 missing)

**Status:** Needs more analysis later - not urgent tonight

**Question:** Should `project_name` be sent in Module 21 for single properties, or only in Module 22 for projects? User noted it's "needed for the email" but needs analysis to determine if single properties need it.

**Action:** Analyze later to determine if Module 21 needs to send `project_name` for single properties.

---

## 4. `review_date` (Module 21 & 22 missing)

**Status:** Can be removed from form later - not urgent tonight

**Reason:** Pointless in form - GHL records it automatically on creation.

**Action:** Remove `review_date` from form code later (low priority, doesn't break anything, just risk if removed now).

**Files to Update:**
- `form-app/src/types/form.ts` - Remove from `FormData` interface
- Form components - Remove any `review_date` inputs/fields

---

## 5. `asking_text` (Module 22 missing)

**Status:** NOT AN ISSUE - Projects don't have asking_text

**Reason:** Module 22 is for projects, and projects don't have `asking_text` field.

**Action:** No change needed - this is correct behavior.

---

## 6. `accepted_acquisition_target` (Module 22 missing)

**Status:** NOT AN ISSUE - Projects don't have this field

**Reason:** Module 22 is for projects, and projects don't have `accepted_acquisition_target` field.

**Action:** No change needed - this is correct behavior.

---

## 7. `push_record_to_deal_sheet` (Module 22 missing)

**Status:** NOT AN ISSUE - Not needed for projects

**Reason:** Purely a GHL field used for testing/pushing data to scenarios. Not needed in Module 22 for projects.

**Action:** No change needed - this is correct behavior.

---

## 8. `projectOverview` vs `projectBrief` mapping

**Status:** NEEDS FIX - Module 22 only (projects only)

**Issue:** Module 22 currently uses `projectOverview` but form has `projectBrief`.

**Fix Required:**
- **Module 22:** Change `shared_data.propertyDescription?.projectOverview` → `shared_data.propertyDescription?.projectBrief`
- **Module 21:** No change needed (single properties don't have project brief)

**Files to Update:**
- `ROUTE-2-MODULE-22-COMPLETE-CODE.js` - Line 149: Fix mapping to use `projectBrief`

**Note:** This is a Make.com module fix, not a form change.

---

## 9. "Contract Type (for Deal Sheet)" Field

**Status:** NOT AN ISSUE - Already in GHL

**Finding:** The form's `contractType` (full code: `01_hl_comms`, etc.) is already being sent to GHL as `deal_type`. The Deal Sheet can read from `deal_type` field - no new field needed.

**Action:** No change needed - `deal_type` contains the full contract type code required for Deal Sheet.

---

## 10. Deal Sheet Field Joins Required

**Status:** IN PROGRESS - Fields being identified

**Purpose:** Fields that need to be joined/combined from multiple GHL fields before writing to Deal Sheet

### Field Join #1: Total Price (NEW Properties - H&L/Projects)

**Deal Sheet Column:** `Total Price` (or similar)

**GHL Fields to Join:**
- `land_price` (may not exist) - Verified in GHL
- `build_price` (may not exist) - Verified in GHL
- `total_price` (always exists) - Verified in GHL

**Format Options:**

**If land_price AND build_price exist:**
```
Land: $345,000
Build: $650,000
Total: $995,000
```

**If only total_price exists (most common):**
```
Total: $995,000
```

**Logic:**
- ⚠️ **IMPORTANT:** Not all NEW properties have both `land_price` and `build_price`
- Some NEW properties will ONLY have `total_price`
- Check if `land_price` AND `build_price` both exist before showing multi-line format
- If either is missing, show only `Total: $X` format
- Format each value with currency symbol and comma separators

**Property Types:** NEW Properties (H&L, Projects) only

---

### Field Join #2: Acceptable Acquisition Range (Established Properties)

**Deal Sheet Column:** `Acceptable_Acquisition` (or similar)

**GHL Fields to Join:**
- `acceptable_acquisition__from` - Verified in GHL
- `acceptable_acquisition__to` - Verified in GHL

**Format:**
```
$590,000 – $650,000
```

**Logic:**
- If both `from` and `to` exist: `$X – $Y` (with en dash or hyphen)
- If only `from` exists: `$X`
- Format with currency symbol and comma separators

**Property Types:** Established properties only

---

### Field Join #3: Format (Bed/Bath/Garage Configuration)

**Deal Sheet Column:** `Format` (or similar)

**GHL Fields to Join:**
- `beds_primary` - Verified in GHL
- `beds_additional__secondary__dual_key` (secondary beds) - Verified in GHL
- `bath_primary` - Verified in GHL
- `baths_additional__secondary__dual_key` (secondary baths) - Verified in GHL
- `garage_primary` - Verified in GHL
- `garage_additional__secondary__dual_key` (secondary garage) - Verified in GHL
- `single_or_dual_occupancy` (to determine if dual) - Verified in GHL

**Format for Dual Occupancy:**
```
4 + 2
2 + 1
1 + 1
```
(Each line: Primary + Secondary)

**Format for Single Occupancy:**
```
4
2
1
```
(Each line: Primary value only)

**Logic:**
- Check `single_or_dual_occupancy` field to determine if dual or single
- **If Dual Occupancy:**
  - Line 1: `{beds_primary} + {beds_secondary}`
  - Line 2: `{bath_primary} + {baths_secondary}`
  - Line 3: `{garage_primary} + {garage_secondary}`
- **If Single Occupancy:**
  - Line 1: `{beds_primary}`
  - Line 2: `{bath_primary}`
  - Line 3: `{garage_primary}`
- Each value on a new line (3 lines total)

**Property Types:** All property types (but only H&L can be dual occupancy)

---

### Field Join #4: Current Rent

**Deal Sheet Column:** `Current_Rent` (or similar)

**GHL Fields to Join:**
- `current_rent_primary__per_week` - Verified in GHL
- `current_rent_secondary__per_week` - Verified in GHL
- `property_type` (to determine if New or Established) - Verified in GHL
- `single_or_dual_occupancy` (to determine if dual) - Verified in GHL

**Format Options:**

**For NEW Properties (H&L, Projects):**
```
No applicable
```
(or empty/N/A)

**For ESTABLISHED Properties - Single Occupancy:**
```
$500
```
(Just the primary rent value)

**For ESTABLISHED Properties - Dual Occupancy:**
```
$800
```
(Sum of primary + secondary: `$500 + $300 = $800`)

**Logic:**
- Check `property_type` to determine if New or Established
- **If NEW Property:** Return "No applicable" (or empty)
- **If ESTABLISHED Property:**
  - Check `single_or_dual_occupancy` to determine if dual
  - **If Single:** Return `current_rent_primary__per_week` only
  - **If Dual:** Return sum of `current_rent_primary__per_week` + `current_rent_secondary__per_week`
- Format with currency symbol (no "per week" text, just the dollar amount)

**Property Types:** 
- NEW Properties: "No applicable"
- ESTABLISHED Properties: Single or dual occupancy calculation

---

### Field Join #5: Appraised Rent

**Deal Sheet Column:** `Appraised_Rent` or `BC_Appraised_Rent` (or similar)

**GHL Fields to Join:**
- `rent_appraisal_primary_from` - Verified in GHL
- `rent_appraisal_primary_to` - Verified in GHL
- `rent_appraisal_secondary_from` - Verified in GHL
- `rent_appraisal_secondary_to` - Verified in GHL
- `single_or_dual_occupancy` (to determine if dual) - Verified in GHL

**Format Options:**

**For ALL Properties - Single Occupancy:**
```
$500 - $550
```
(Range: `rent_appraisal_primary_from` - `rent_appraisal_primary_to`)

**For ALL Properties - Dual Occupancy:**
```
$950 - $1050
```
- From: Sum of `rent_appraisal_primary_from` + `rent_appraisal_secondary_from`
- To: Sum of `rent_appraisal_primary_to` + `rent_appraisal_secondary_to`

**Logic:**
- Check `single_or_dual_occupancy` to determine if dual
- **If Single Occupancy:**
  - Format: `$X - $Y` where X = `rent_appraisal_primary_from`, Y = `rent_appraisal_primary_to`
- **If Dual Occupancy:**
  - Calculate From: `rent_appraisal_primary_from` + `rent_appraisal_secondary_from`
  - Calculate To: `rent_appraisal_primary_to` + `rent_appraisal_secondary_to`
  - Format: `$X - $Y` where X = sum of "from" values, Y = sum of "to" values
- Format with currency symbol and comma separators

**Property Types:** ALL Properties (both NEW and ESTABLISHED)

---

### Field Join #6: Year_Built_Registering_Status

**Deal Sheet Column:** `Year_Built_Registering_Status` (or similar)

**GHL Fields to Join:**
- `year_built` - Verified in GHL
- `land_registration` - Verified in GHL
- `property_type` (to determine if New or Established) - Verified in GHL

**Format Options:**

**For NEW Properties (H&L, Projects):**
```
Registered
```
(or whatever value is in `land_registration` field)

**For ESTABLISHED Properties:**
```
1975
```
(or whatever value is in `year_built` field - could be year like "1975" or "Circa 1960's" or "TBC")

**Logic:**
- Check `property_type` to determine if New or Established
- **If NEW Property:** Return `land_registration` value (e.g., "Registered", "TBC", etc.)
- **If ESTABLISHED Property:** Return `year_built` value (e.g., "1975", "Circa 1960's", "TBC", etc.)
- No formatting needed - use value as-is from GHL

**Property Types:** 
- NEW Properties: Use `land_registration` field
- ESTABLISHED Properties: Use `year_built` field

---

### Field Join #7: Selling Agent

**Deal Sheet Column:** `Selling_Agent` (or similar)

**GHL Fields to Join:**
- `agent_name` - Verified in GHL
- `agent_email` - Verified in GHL
- `agent_mobile` - Verified in GHL

**Format:**
```
Dave
Dave@Dave.com
0450555000
```
(Each field on a new line: Name, Email, Mobile)

**Logic:**
- Line 1: `agent_name`
- Line 2: `agent_email`
- Line 3: `agent_mobile`
- Each value on a new line (3 lines total)
- Use values as-is from GHL (no formatting needed)

**Property Types:** ALL Properties

---

### Field Join #8: Asking (Combined with Asking Text)

**Deal Sheet Column:** `Asking`

**GHL Fields to Join:**
- `asking` - Verified in GHL
- `asking_text` - Verified in GHL

**Format:**
```
On-market - $650,000
```
(If `asking_text` exists: `"{asking} - {asking_text}"`)

**Or:**
```
On-market
```
(If no `asking_text`: just `"{asking}"`)

**Logic:**
- If `asking_text` exists: Format as `"{asking} - {asking_text}"`
- If no `asking_text`: Use just `"{asking}"`
- Use values as-is from GHL

**Property Types:** ALL Properties

---

### Field Join #9: Sort_Key__Dont_edit

**Deal Sheet Column:** `Sort_Key__Dont_edit`

**GHL Fields to Join:**
- `deal_type` - Verified in GHL
- `status` - Verified in GHL
- `price_group` - Verified in GHL

**Format:**
```
01_hl_comms-01_approved-A
```
(Combination: `{deal_type}-{status}-{price_group}`)

**Logic:**
- Combine: `{deal_type}-{status}-{price_group}`
- Use hyphen as separator
- Used for sorting the Deal Sheet
- **Do not edit** - auto-generated

**Property Types:** ALL Properties

---

## Changes to Fix in Form

*(To be added as we discuss each issue)*

---

**Last Updated:** 2025-01-14  
**Discussion Status:** All 8 issues discussed - Summary:
- Issues #1, #4: Can be removed from form later (low priority)
- Issues #2, #3: Need analysis later (not urgent)
- Issues #5, #6, #7: NOT ISSUES - correct behavior
- Issue #8: NEEDS FIX - Module 22 mapping fix required
- Issue #10: Deal Sheet field joins - COMPLETE (9 fields identified: Total Price, Acceptable Acquisition, Format, Current Rent, Appraised Rent, Year_Built_Registering_Status, Selling Agent, Asking, Sort_Key)

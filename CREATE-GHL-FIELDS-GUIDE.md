# Step-by-Step Guide: Create 13 Missing GHL Fields
**Date:** January 9, 2026  
**Purpose:** Create all missing fields in GHL Custom Object

---

## 📋 Pre-Creation Checklist

- [ ] Log into GoHighLevel
- [ ] Navigate to Settings → Custom Objects
- [ ] Find "Property Reviews" custom object (Object ID: `692d04e3662599ed0c29edfa`)
- [ ] Click to edit/add fields

---

## 🎯 Fields to Create (15 total)

**NOTE:** Fields #14 and #15 are **CRITICAL** and were missing from the original list. They must be created before Module 14 will work (currently causes 400 error).

### 1. Purchase Price Fields (5 fields)

#### Field 1: `land_price`
- **Type:** Text
- **Label:** Land Price
- **Description:** Land price component (for H&L split contracts)
- **Required:** No

#### Field 2: `build_price`
- **Type:** Text
- **Label:** Build Price
- **Description:** Build price component (for H&L split contracts)
- **Required:** No

#### Field 3: `total_price`
- **Type:** Text
- **Label:** Total Price
- **Description:** Total price (for H&L single contract)
- **Required:** No

#### Field 4: `cashback_rebate_value`
- **Type:** Text
- **Label:** Cashback/Rebate Value
- **Description:** Cashback or rebate amount
- **Required:** No

#### Field 5: `cashback_rebate_type`
- **Type:** Dropdown
- **Label:** Cashback/Rebate Type
- **Description:** Type of cashback or rebate
- **Options:**
  - Cashback
  - Rebate on Land
  - Rebate on Build
- **Required:** No

---

### 2. Rental Assessment Fields (4 fields)

#### Field 6: `rent_appraisal_primary_from`
- **Type:** Text
- **Label:** Rent Appraisal Primary (From)
- **Description:** Primary rent appraisal from value
- **Required:** No

#### Field 7: `rent_appraisal_primary_to`
- **Type:** Text
- **Label:** Rent Appraisal Primary (To)
- **Description:** Primary rent appraisal to value
- **Required:** No

#### Field 8: `rent_appraisal_secondary_from`
- **Type:** Text
- **Label:** Rent Appraisal Secondary (From)
- **Description:** Secondary rent appraisal from value (for dual occupancy)
- **Required:** No

#### Field 9: `rent_appraisal_secondary_to`
- **Type:** Text
- **Label:** Rent Appraisal Secondary (To)
- **Description:** Secondary rent appraisal to value (for dual occupancy)
- **Required:** No

**Note:** These will supplement/replace the existing `rent_appraisal_primary` and `rent_appraisal_secondary` single fields.

---

### 3. Property Description Fields (2 fields)

#### Field 10: `build_size_primary`
- **Type:** Text
- **Label:** Build Size Primary
- **Description:** Primary dwelling build size in m² (for dual occupancy H&L)
- **Required:** No

#### Field 11: `build_size_secondary`
- **Type:** Text
- **Label:** Build Size Secondary
- **Description:** Secondary dwelling build size in m² (for dual occupancy H&L)
- **Required:** No

**Note:** `build_size` already exists (for single occupancy). These are for dual occupancy.

---

### 4. Project Fields (2 fields)

#### Field 12: `project_brief`
- **Type:** Multi-line Text (Long Text)
- **Label:** Project Brief
- **Description:** Project brief text (appears in email, stored in parent record)
- **Required:** No

#### Field 13: `project_overview`
- **Type:** Multi-line Text (Long Text)
- **Label:** Project Overview
- **Description:** Project overview (shared across all lots, stored in parent record)
- **Required:** No

**Note:** These are stored in parent records only (for projects with multiple lots).

---

### 5. Rental Assessment Occupancy Fields (2 fields) - **CRITICAL - MISSING FROM ORIGINAL LIST**

#### Field 14: `occupancy_primary`
- **Type:** Dropdown
- **Label:** Occupancy (Primary)
- **Description:** Occupancy status for Unit A (single or dual occupancy)
- **Options:**
  - Owner Occupied
  - Tenanted
  - Vacant
- **Required:** No
- **Used For:** Single occupancy properties OR dual occupancy Unit A

#### Field 15: `occupancy_secondary`
- **Type:** Dropdown
- **Label:** Occupancy (Secondary)
- **Description:** Occupancy status for Unit B (dual occupancy only)
- **Options:**
  - Owner Occupied
  - Tenanted
  - Vacant
- **Required:** No
- **Used For:** Dual occupancy Unit B only

**⚠️ CRITICAL NOTE:** 
- These fields were missing from the original creation guides
- Module 14 **REQUIRES** these fields or it will fail with 400 error: `"Invalid key in properties occupancy_primary"`
- GHL currently only has a single `occupancy` field, but the form collects separate primary/secondary occupancy for dual occupancy properties
- **Create these fields FIRST** before testing Module 14

**Form Mapping:**
- `formData.rentalAssessment.occupancyPrimary` → `occupancy_primary`
- `formData.rentalAssessment.occupancySecondary` → `occupancy_secondary`

---

## ✅ Verification Checklist

After creating all fields, verify:

- [ ] All 15 fields appear in GHL Custom Object (13 original + 2 occupancy fields)
- [ ] Field names match exactly (use snake_case with underscores)
- [ ] Field types are correct (Text, Dropdown, Multi-line Text)
- [ ] `cashback_rebate_type` dropdown has 3 options
- [ ] `project_brief` and `project_overview` are Multi-line Text (not regular Text)
- [ ] `occupancy_primary` dropdown has 3 options: "Owner Occupied", "Tenanted", "Vacant"
- [ ] `occupancy_secondary` dropdown has 3 options: "Owner Occupied", "Tenanted", "Vacant"

---

## 🧪 Testing Plan

After fields are created, test with different property types:

1. **H&L Individual (Single Occupancy)**
   - Test: `land_price`, `build_price`, `build_size`, `rent_appraisal_primary_from/to`

2. **H&L Dual Occupancy**
   - Test: `build_size_primary`, `build_size_secondary`, `rent_appraisal_secondary_from/to`

3. **Project (Multiple Lots)**
   - Test: `project_brief`, `project_overview` (in parent record)

4. **Established Property**
   - Test: `total_price`, `rent_appraisal_primary_from/to`, `occupancy_primary`

5. **Dual Occupancy Property**
   - Test: `occupancy_primary`, `occupancy_secondary` (both fields)

---

## 📝 Notes

- **Field Naming:** Use exact field names as listed (snake_case with underscores)
- **Case Sensitivity:** GHL field names are case-sensitive
- **Spaces:** Use underscores, not spaces (e.g., `rent_appraisal_primary_from` not `rent appraisal primary from`)
- **Multi-line Text:** For `project_brief` and `project_overview`, use "Multi-line Text" or "Long Text" type (not regular Text)
- **Priority:** Create `occupancy_primary` and `occupancy_secondary` FIRST (they're required for Module 14 to work)

---

## 🚀 Next Steps After Creation

1. Update Make.com scenario to map these new fields
2. Test with different property types
3. Verify data flows correctly from form → Make.com → GHL

# All Missing GHL Fields - Based on Complete Form
**Date:** January 9, 2026  
**Purpose:** Complete list of ALL fields that need to be created in GHL based on the entire form structure

---

## ✅ Fields Already Created (10 fields)

### Project Architecture
- ✅ `lot_number`
- ✅ `project_parent_id`
- ✅ `is_parent_record`
- ✅ `project_identifier`

### Email Template Storage
- ✅ `email_template_html`
- ✅ `email_template_text`

### Property Description
- ✅ `build_size` (for single occupancy H&L)
- ✅ `land_registration`
- ✅ `lga`

### Attachments
- ✅ `folder_link` (already existed)

---

## ❌ Missing Fields - Purchase Price Section

### For H&L Split Contracts (High Priority)
- ❌ `land_price` (Text) - Land price component
- ❌ `build_price` (Text) - Build price component
- ❌ `total_price` (Text) - Total price (for Single Contract H&L)
- ❌ `cashback_rebate_value` (Text) - Cashback/rebate amount
- ❌ `cashback_rebate_type` (Text/Dropdown) - "Cashback", "Rebate on Land", "Rebate on Build"

**Form Fields:** `landPrice`, `buildPrice`, `totalPrice`, `cashbackRebateValue`, `cashbackRebateType`  
**Used By:** H&L properties (contract types 01, 02, 03)  
**Priority:** HIGH - Needed for H&L properties

---

## ❌ Missing Fields - Rental Assessment Section

### Rent Appraisal Range Fields (High Priority)
- ❌ `rent_appraisal_primary_from` (Text) - Primary rent appraisal from value
- ❌ `rent_appraisal_primary_to` (Text) - Primary rent appraisal to value
- ❌ `rent_appraisal_secondary_from` (Text) - Secondary rent appraisal from value (for dual occupancy)
- ❌ `rent_appraisal_secondary_to` (Text) - Secondary rent appraisal to value (for dual occupancy)

**Form Fields:** `rentAppraisalPrimaryFrom`, `rentAppraisalPrimaryTo`, `rentAppraisalSecondaryFrom`, `rentAppraisalSecondaryTo`  
**Used By:** All property types (primary), H&L dual occupancy (secondary)  
**Priority:** HIGH - Currently GHL has single fields `rent_appraisal_primary` and `rent_appraisal_secondary` but form collects ranges

**Decision Needed:** 
- Option A: Create new `_from` and `_to` fields (recommended)
- Option B: Use existing single fields and store as "From - To" format

---

## ❌ Missing Fields - Property Description Section

### Build Size for Dual Occupancy (Medium Priority)
- ❌ `build_size_primary` (Text) - Primary dwelling build size in m² (for dual occupancy H&L)
- ❌ `build_size_secondary` (Text) - Secondary dwelling build size in m² (for dual occupancy H&L)

**Form Fields:** `buildSizePrimary`, `buildSizeSecondary`  
**Used By:** H&L dual occupancy properties  
**Priority:** MEDIUM - Only needed for dual occupancy H&L

**Note:** `build_size` already exists (for single occupancy), but dual occupancy needs separate primary/secondary fields

---

## ❌ Missing Fields - Project Section

### Project-Specific Fields (Medium Priority)
- ❌ `project_brief` (Multi-line Text) - Project brief text (appears in email)
- ❌ `project_overview` (Multi-line Text) - Project overview (shared across all lots)

**Form Fields:** `projectBrief`, `projectOverview`  
**Used By:** Projects (Multiple Lots)  
**Priority:** MEDIUM - Only needed for projects

**Note:** These are shared project data, stored in parent record

---

## ✅ Selling Agent Fields (Already Exist)

### Individual Fields (Using Existing GHL Fields)
- ✅ `agent_name` (Text) - Selling agent name
- ✅ `agent_mobile` (Text) - Selling agent mobile
- ✅ `agent_email` (Text) - Selling agent email

**Form Fields:** `sellingAgentName`, `sellingAgentEmail`, `sellingAgentMobile`  
**Used By:** All property types  
**Decision:** Using individual fields (more stable long-term) instead of combined field

**Note:** Form can combine these on submit if needed for Deal Sheet, but GHL stores separately

---

## 📊 Summary

### Total Missing Fields: 13 fields (ALL NEEDED)

**All fields are required** - Priority levels are for organization only, but all must be created.

**Purchase Price Fields (5 fields):**
1. `land_price` (Text)
2. `build_price` (Text)
3. `total_price` (Text)
4. `cashback_rebate_value` (Text)
5. `cashback_rebate_type` (Text/Dropdown)

**Rental Assessment Fields (4 fields):**
6. `rent_appraisal_primary_from` (Text)
7. `rent_appraisal_primary_to` (Text)
8. `rent_appraisal_secondary_from` (Text)
9. `rent_appraisal_secondary_to` (Text)

**Property Description Fields (2 fields):**
10. `build_size_primary` (Text)
11. `build_size_secondary` (Text)

**Project Fields (2 fields):**
12. `project_brief` (Multi-line Text)
13. `project_overview` (Multi-line Text)

**Note on Selling Agent:**
- ✅ Using existing individual fields: `agent_name`, `agent_mobile`, `agent_email`
- ✅ No combined `selling_agent` field needed
- ✅ **Long-term architecture:** Moving away from Deal Sheet to GHL, so separate fields make more sense
- ✅ **Interim solution:** Combine fields when building email template: `"${agent_name}, ${agent_email}, ${agent_mobile}"`
- ✅ **Benefits:** Better data integrity, easier to query/filter, easier to update individual pieces

---

## 🎯 Creation Plan

**Create all 13 fields in GHL:**
1. Purchase Price fields (5)
2. Rental Assessment fields (4)
3. Property Description fields (2)
4. Project fields (2)

**Testing Plan:**
- Create test records for different property types:
  - H&L Individual (single occupancy) - tests: land_price, build_price, build_size, rent_appraisal_primary_from/to
  - H&L Dual Occupancy - tests: build_size_primary, build_size_secondary, rent_appraisal_secondary_from/to
  - Project (Multiple Lots) - tests: project_brief, project_overview
  - Established - tests: total_price (if applicable)

This ensures all form data can be properly stored in GHL regardless of property type.

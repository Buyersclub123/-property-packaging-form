# GHL Fields to Create - Complete List
**Date:** January 9, 2026  
**Purpose:** Reference document for creating all missing GHL fields

---

## 📋 All Fields to Create (15 total)

**⚠️ CRITICAL UPDATE:** Added 2 missing occupancy fields (#14 and #15) that are required for Module 14 to work. These were missing from the original list.

### 1. Purchase Price Fields (5 fields)

| Field Name | Type | Notes |
|------------|------|-------|
| `land_price` | Text | Land price component (for H&L split contracts) |
| `build_price` | Text | Build price component (for H&L split contracts) |
| `total_price` | Text | Total price (for H&L single contract) |
| `cashback_rebate_value` | Text | Cashback/rebate amount |
| `cashback_rebate_type` | Dropdown | Options: "Cashback", "Rebate on Land", "Rebate on Build" |

**Form Mapping:**
- `formData.purchasePrice.landPrice` → `land_price`
- `formData.purchasePrice.buildPrice` → `build_price`
- `formData.purchasePrice.totalPrice` → `total_price`
- `formData.purchasePrice.cashbackRebateValue` → `cashback_rebate_value`
- `formData.purchasePrice.cashbackRebateType` → `cashback_rebate_type`

---

### 2. Rental Assessment Fields (4 fields)

| Field Name | Type | Notes |
|------------|------|-------|
| `rent_appraisal_primary_from` | Text | Primary rent appraisal from value |
| `rent_appraisal_primary_to` | Text | Primary rent appraisal to value |
| `rent_appraisal_secondary_from` | Text | Secondary rent appraisal from value (dual occupancy) |
| `rent_appraisal_secondary_to` | Text | Secondary rent appraisal to value (dual occupancy) |

**Form Mapping:**
- `formData.rentalAssessment.rentAppraisalPrimaryFrom` → `rent_appraisal_primary_from`
- `formData.rentalAssessment.rentAppraisalPrimaryTo` → `rent_appraisal_primary_to`
- `formData.rentalAssessment.rentAppraisalSecondaryFrom` → `rent_appraisal_secondary_from`
- `formData.rentalAssessment.rentAppraisalSecondaryTo` → `rent_appraisal_secondary_to`

**Note:** GHL currently has `rent_appraisal_primary` and `rent_appraisal_secondary` as single fields. These new fields will replace/supplement them.

---

### 3. Property Description Fields (2 fields)

| Field Name | Type | Notes |
|------------|------|-------|
| `build_size_primary` | Text | Primary dwelling build size in m² (for dual occupancy H&L) |
| `build_size_secondary` | Text | Secondary dwelling build size in m² (for dual occupancy H&L) |

**Form Mapping:**
- `formData.propertyDescription.buildSizePrimary` → `build_size_primary`
- `formData.propertyDescription.buildSizeSecondary` → `build_size_secondary`

**Note:** `build_size` already exists (for single occupancy). These are for dual occupancy properties.

---

### 4. Project Fields (2 fields)

| Field Name | Type | Notes |
|------------|------|-------|
| `project_brief` | Multi-line Text | Project brief text (appears in email) |
| `project_overview` | Multi-line Text | Project overview (shared across all lots) |

**Form Mapping:**
- `formData.projectBrief` → `project_brief` (stored in parent record)
- `formData.propertyDescription.projectOverview` → `project_overview` (stored in parent record)

**Note:** These are shared project data, stored in parent record only.

---

### 5. Rental Assessment Occupancy Fields (2 fields) - **CRITICAL - MISSING FROM ORIGINAL LIST**

| Field Name | Type | Notes |
|------------|------|-------|
| `occupancy_primary` | Dropdown | Occupancy status for Unit A (single or dual occupancy) |
| `occupancy_secondary` | Dropdown | Occupancy status for Unit B (dual occupancy only) |

**Form Mapping:**
- `formData.rentalAssessment.occupancyPrimary` → `occupancy_primary`
- `formData.rentalAssessment.occupancySecondary` → `occupancy_secondary`

**Dropdown Options:**
- "Owner Occupied"
- "Tenanted"
- "Vacant"

**⚠️ CRITICAL NOTE:** 
- These fields were missing from the original creation guides
- Module 14 **REQUIRES** these fields or it will fail with 400 error: `"Invalid key in properties occupancy_primary"`
- GHL currently only has a single `occupancy` field, but the form collects separate primary/secondary occupancy for dual occupancy properties
- **Create these fields FIRST** before testing Module 14

---

## 🧪 Testing Plan

After creating all fields, test with different property types:

### Test 1: H&L Individual (Single Occupancy)
**Tests:**
- `land_price`, `build_price`
- `build_size` (existing)
- `rent_appraisal_primary_from`, `rent_appraisal_primary_to`
- `cashback_rebate_value`, `cashback_rebate_type`

### Test 2: H&L Dual Occupancy
**Tests:**
- `build_size_primary`, `build_size_secondary`
- `rent_appraisal_secondary_from`, `rent_appraisal_secondary_to`
- All fields from Test 1

### Test 3: Project (Multiple Lots)
**Tests:**
- `project_brief`, `project_overview` (in parent record)
- All lot-specific fields in child records

### Test 4: Established Property
**Tests:**
- `total_price` (if applicable)
- `rent_appraisal_primary_from`, `rent_appraisal_primary_to`
- `occupancy_primary`

### Test 5: Dual Occupancy Property (All Types)
**Tests:**
- `occupancy_primary`, `occupancy_secondary` (both fields - CRITICAL)
- All fields from applicable property type above

---

## ✅ Fields Already Created (10 fields)

**Note:** The occupancy fields below were NOT created yet - they need to be added.

- `lot_number`
- `project_parent_id`
- `is_parent_record`
- `project_identifier`
- `email_template_html`
- `email_template_text`
- `build_size` (single occupancy)
- `land_registration`
- `lga`
- `folder_link`

## ✅ Selling Agent Fields (Using Existing Separate Fields)

**Decision:** Use separate fields for long-term data integrity (moving away from Deal Sheet to GHL)

- ✅ `agent_name` (Text) - Already exists in GHL
- ✅ `agent_mobile` (Text) - Already exists in GHL
- ✅ `agent_email` (Text) - Already exists in GHL

**Form Mapping:**
- `formData.sellingAgentName` → `agent_name`
- `formData.sellingAgentMobile` → `agent_mobile`
- `formData.sellingAgentEmail` → `agent_email`

**Email Template:** Combine these fields when building email template: `"${agent_name}, ${agent_email}, ${agent_mobile}"`

**Benefits:**
- Better data integrity (can update individual pieces)
- Easier to query/filter/search in GHL
- Long-term architecture (moving away from Deal Sheet)
- Can still combine for display/email when needed

---

## 📝 Notes

1. **Field Naming:** All fields use snake_case (underscores) to match GHL conventions
2. **Field Types:** Match the form data types (Text for numbers stored as strings)
3. **Dropdown Options:** 
   - For `cashback_rebate_type`: "Cashback", "Rebate on Land", "Rebate on Build"
   - For `occupancy_primary` and `occupancy_secondary`: "Owner Occupied", "Tenanted", "Vacant"
4. **Multi-line Text:** `project_brief` and `project_overview` should be Multi-line Text fields (not regular Text)
5. **Priority:** Create `occupancy_primary` and `occupancy_secondary` FIRST - Module 14 fails without them (400 error)

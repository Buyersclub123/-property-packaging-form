# New Fields Needed in GHL Custom Object
## Prioritized by Urgency (Based on User Requirements)

---

## 🔴 HIGH PRIORITY - Need UI Now

### 1. Selling Agent (Combined Field)
- **Field:** `selling_agent`
- **Type:** Text (free text: "Name, Email, Mobile")
- **Reason:** Needs to be in UI - single combined field
- **Status:** ❌ NEED TO CREATE (if not exists)
- **Priority:** URGENT

### 2. Sourcer (UI Field)
- **Field:** `sourcer`
- **Type:** Dropdown
- **Reason:** Needs to be in UI - field exists in GHL, just need UI
- **Status:** ✅ EXISTS (just need UI)
- **Priority:** URGENT

### 3. Packager (UI Field) ✅ IMPLEMENTED
- **Field:** `packager`
- **Type:** Auto-populated from email address
- **Implementation:** 
  - Email address entered/edited on Step 1 automatically populates `packager` field
  - When exported to Excel/Google Sheets, stores only username part (before @) - e.g., "john.t" from "john.t@buyersclub.com.au"
- **Reason:** Needs to be in UI - field exists in GHL, just need UI
- **Status:** ✅ IMPLEMENTED (auto-populated from email)
- **Priority:** ✅ COMPLETE

---

## 🟡 MEDIUM PRIORITY - Discuss/Auto-Generate

### 4. Price Group
- **Field:** `price_group`
- **Type:** Text or Dropdown (to be determined)
- **Reason:** Can this be auto-generated? Need to discuss how
- **Status:** ⚠️ NEED TO VERIFY/CREATE
- **Priority:** MEDIUM (discuss auto-generation approach)

---

## 🟢 LOW PRIORITY - Later/Verify Occasionally

### 5. Project Name
- **Field:** `project_name` (or similar)
- **Type:** Text
- **Reason:** For projects - don't worry for now but check occasionally
- **Status:** ⚠️ VERIFY NEED
- **Priority:** LOW (check occasionally)

### 6. Project Commencement Date
- **Field:** `project_commencement_scheduled_for`
- **Type:** Date
- **Reason:** For projects - will come back to this
- **Status:** ⚠️ LATER
- **Priority:** LOW (user will come back)

---

## ⚪ EXCEL SHEET ONLY - Not Needed in GHL

### 7. Cashback/Rebate Payment Details
- **Field:** `cashback__rebate_payment__details`
- **Reason:** Excel sheet only - not needed in GHL custom object
- **Status:** ❌ EXCEL ONLY
- **Priority:** N/A

### 8. Project Completion Date
- **Field:** `project_completion_scheduled_for`
- **Reason:** Excel sheet only - not needed in GHL custom object
- **Status:** ❌ EXCEL ONLY
- **Priority:** N/A

### 9. Notes
- **Field:** General notes field
- **Reason:** Excel sheet only - not needed in GHL custom object
- **Status:** ❌ EXCEL ONLY
- **Priority:** N/A

---

## 📋 Fields Already Implemented (No Action Needed)

### Rent Appraisal Split Fields (Already in UI)
- `rent_appraisal_primary_from` - ✅ IN UI
- `rent_appraisal_primary_to` - ✅ IN UI
- `rent_appraisal_secondary_from` - ✅ IN UI
- `rent_appraisal_secondary_to` - ✅ IN UI
- **Status:** Need to CREATE in GHL if not exists

### Build Size (Already in UI)
- `build_size` - ✅ IN UI
- **Status:** Need to CREATE in GHL if not exists

### Land Registration (Already in UI)
- `land_registration` - ✅ IN UI
- **Status:** Need to CREATE in GHL if not exists

### Cashback/Rebate Fields (Already in UI)
- `cashbackRebateValue` - ✅ IN UI
- `cashbackRebateType` - ✅ IN UI
- **Note:** May map to existing `Client_Cashback__Rebates_Discount` or need new fields
- **Status:** ⚠️ NEED TO VERIFY MAPPING

---

## Summary by Priority

**🔴 URGENT - Create/Add UI Now:**
1. selling_agent (if not exists)
2. sourcer (add UI - field exists)
3. ~~packager (add UI - field exists)~~ ✅ **COMPLETE** - Auto-populated from email address

**🟡 MEDIUM - Discuss Approach:**
4. price_group (verify exists, discuss auto-generation)

**🟢 LOW - Later:**
5. project_name (check occasionally)
6. project_commencement_scheduled_for (user will come back)

**⚪ EXCEL ONLY - No Action:**
7-9. Payment details, completion date, notes (excel only)


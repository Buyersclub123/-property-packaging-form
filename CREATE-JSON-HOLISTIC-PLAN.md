# Create JSON Module - Holistic Implementation Plan

**Date:** January 10, 2026  
**Purpose:** Comprehensive plan for implementing Create JSON modules across BOTH Route 1 (Single Property) and Route 2 (Project)  
**Status:** Planning Phase - DO NOT IMPLEMENT until plan is approved

---

## 🎯 Problem Statement

**Current Issues:**
1. ❌ Route 1 (Module 14): JSON string mode fails with empty values and multi-line fields
2. ❌ Route 2 (Module 12): Same JSON string mode issues with empty values
3. ❌ Route 2 (Module 9): Parent record only has minimal fields - missing shared project data
4. ❌ No unified solution - each route has different problems

**Root Cause:**
- JSON string mode in Make.com doesn't handle empty values correctly
- JSON string mode doesn't properly escape multi-line fields
- Different data structures (root level vs. lots array) need different handling

---

## 📊 Current Scenario Structure

```
Module 1: Custom Webhook (receives form data)
  ↓
Module 2: Router
  ├─ Route 1: Single Property (lotType != "Multiple")
  │   ├─ Module 5: Set Variable (incoming_data)
  │   └─ Module 14: HTTP - Create GHL Record ⚠️ (JSON string mode - has issues)
  │
  └─ Route 2: Project (lotType == "Multiple")
      ├─ Module 6: Set Variable (incoming_data)
      ├─ Module 9: HTTP - Create Parent Record ⚠️ (minimal fields only)
      ├─ Module 10: Set Variable (parent_record_id)
      ├─ Module 11: Iterator (iterates over formData.lots)
      └─ Module 12: HTTP - Create Child Records ⚠️ (JSON string mode - has issues)
```

---

## 📋 Data Structure Analysis

### Route 1 (Single Property) Data Structure:
```json
{
  "formData": {
    // ✅ All fields at ROOT level
    "propertyDescription": { bedsPrimary, bathPrimary, ... },
    "purchasePrice": { asking, landPrice, buildPrice, ... },
    "rentalAssessment": { occupancyPrimary, currentRentPrimary, ... },
    "address": { propertyAddress, streetNumber, ... },
    "riskOverlays": { zoning, flood, ... },
    "contentSections": { whyThisProperty, proximity, investmentHighlights },
    "marketPerformance": { medianPriceChange1Year, ... },
    "decisionTree": { contractType, status, ... },
    "sellingAgentName": "...",
    "sellingAgentEmail": "...",
    "sellingAgentMobile": "..."
  },
  "folderLink": "...",
  "sourcer": "...",
  "packager": "..."
}
```

**Key Point:** All fields accessible at root level via `{{5.incoming_data.formData.propertyDescription...}}`

---

### Route 2 (Project) Data Structure:
```json
{
  "formData": {
    // ✅ SHARED fields at ROOT level
    "address": { projectAddress, streetNumber, ... },  // ✅ Shared
    "riskOverlays": { zoning, flood, ... },            // ✅ Shared
    "contentSections": { whyThisProperty, proximity, investmentHighlights },  // ✅ Shared
    "marketPerformance": { medianPriceChange1Year, ... },  // ✅ Shared
    "decisionTree": { contractType, status, ... },     // ✅ Shared
    "sellingAgentName": "...",                         // ✅ Shared
    "sellingAgentEmail": "...",                        // ✅ Shared
    "sellingAgentMobile": "...",                       // ✅ Shared
    
    // ❌ NO propertyDescription, purchasePrice, rentalAssessment at root
    
    // ✅ LOT-SPECIFIC fields in ARRAY
    "lots": [
      {
        "lotNumber": "222",
        "propertyDescription": { bedsPrimary, bathPrimary, ... },  // ✅ In lot
        "purchasePrice": { landPrice, buildPrice, ... },            // ✅ In lot
        "rentalAssessment": { occupancyPrimary, ... }               // ✅ In lot
      },
      {
        "lotNumber": "223",
        "propertyDescription": { ... },  // Different for each lot
        "purchasePrice": { ... },
        "rentalAssessment": { ... }
      }
    ]
  },
  "folderLink": "...",
  "sourcer": "...",
  "packager": "..."
}
```

**Key Points:**
- Shared data: `{{6.incoming_data.formData.address...}}` (root level)
- Lot-specific data: `{{11.propertyDescription...}}` (from Iterator output)

---

## ✅ Proposed Solution: Create JSON Modules for Each Route

### Option A: Separate Create JSON Module in Each Route (RECOMMENDED)

**Implementation:**

#### Route 1 (Single Property):
1. **Add Create JSON module** after Module 5, before Module 14
2. **Map from root level:** `{{5.incoming_data.formData.propertyDescription...}}`
3. **All 87 fields** accessible from root
4. **Update Module 14:** Use Create JSON output (data structure mode)

#### Route 2 (Project):

**Parent Record (Module 9):**
1. **Add Create JSON module** after Module 6, before Module 9
2. **Map SHARED fields only** from root level: `{{6.incoming_data.formData.address...}}`
3. **Fields:** address, riskOverlays, contentSections, marketPerformance, decisionTree, agent fields, sourcer, packager, folder_link
4. **Add project-specific fields:** `is_parent_record: "Yes"`, `project_identifier`, `project_parent_id: null`
5. **Update Module 9:** Use Create JSON output (data structure mode)

**Child Records (Module 12):**
1. **Add Create JSON module** after Module 11 (Iterator), before Module 12
2. **Map LOT-SPECIFIC fields** from Iterator: `{{11.propertyDescription...}}`, `{{11.purchasePrice...}}`, `{{11.rentalAssessment...}}`
3. **Combine with SHARED fields** from root (Module 6) and Iterator output
4. **Add project-specific fields:** `is_parent_record: "No"`, `project_parent_id: {{10.parent_record_id}}`, `lot_number: {{11.lotNumber}}`
5. **Update Module 12:** Use Create JSON output (data structure mode)

---

## 📋 Detailed Implementation Plan

### Phase 1: Route 1 (Single Property)

**Location:** Route 1, after Module 5, before Module 14

**Create JSON Module (New Module 13):**
- Maps all 87 fields from `{{5.incoming_data.formData...}}`
- Includes multi-line fields (`why_this_property`, `proximity`, `investment_highlights`)
- Handles empty values automatically

**Module 14 (HTTP - Create GHL Record):**
- Change from "JSON string" to "Data structure" mode
- Map to Create JSON output
- Test with empty and filled fields

**Benefits:**
- ✅ Solves empty value issues
- ✅ Solves multi-line field issues
- ✅ Stable long-term solution

---

### Phase 2: Route 2 - Parent Record

**Location:** Route 2, after Module 6, before Module 9

**Create JSON Module (New Module 7 or 8):**
- Maps SHARED fields only from root:
  - `property_address`: `{{6.incoming_data.formData.address.projectAddress}}`
  - `sourcer`, `packager`: from root
  - `deal_type`, `status`: from decisionTree
  - `folder_link`: `{{6.incoming_data.folderLink}}`
  - `street_number`, `street_name`, `suburb_name`, `state`, `post_code`, `lga`, `google_map`
  - `zoning`, `flood`, `flood_dialogue`, `bushfire`, `bushfire_dialogue`, `mining`, etc. (riskOverlays)
  - `why_this_property`, `proximity`, `investment_highlights` (contentSections)
  - `median_price_change__3_months`, etc. (marketPerformance)
  - `agent_name`, `agent_mobile`, `agent_email`
  - `message_for_ba`, `attachments_additional_dialogue`
- Add project-specific fields:
  - `is_parent_record`: `"Yes"`
  - `project_identifier`: `"PROJ-{{formatDate(now; \"YYYYMMDD-HHmmss\")}}"`
  - `project_parent_id`: `null` or empty
- **EXCLUDE:** propertyDescription, purchasePrice, rentalAssessment (not at root for projects)

**Module 9 (HTTP - Create Parent Record):**
- Change from "JSON string" to "Data structure" mode
- Map to Create JSON output
- Now includes all shared project data (not just address)

**Benefits:**
- ✅ Parent record has all shared project data
- ✅ Solves empty value issues
- ✅ Solves multi-line field issues

---

### Phase 3: Route 2 - Child Records

**Location:** Route 2, after Module 11 (Iterator), before Module 12

**Create JSON Module (New Module 12A or 13):**
- Maps LOT-SPECIFIC fields from Iterator output (`{{11...}}`):
  - `beds_primary`: `{{11.propertyDescription.bedsPrimary}}`
  - `bath_primary`: `{{11.propertyDescription.bathPrimary}}`
  - `land_size`: `{{11.propertyDescription.landSize}}`
  - `build_size`: `{{11.propertyDescription.buildSize}}`
  - `land_price`: `{{11.purchasePrice.landPrice}}`
  - `build_price`: `{{11.purchasePrice.buildPrice}}`
  - `total_price`: `{{11.purchasePrice.totalPrice}}`
  - `occupancy_primary`: `{{11.rentalAssessment.occupancyPrimary}}`
  - `rent_appraisal_primary_from`: `{{11.rentalAssessment.rentAppraisalPrimaryFrom}}`
  - All lot-specific propertyDescription, purchasePrice, rentalAssessment fields
- Maps SHARED fields from root (Module 6) - these are the same for all lots:
  - `property_address`: `{{6.incoming_data.formData.address.projectAddress}} - {{11.lotNumber}}`
  - `sourcer`, `packager`: from root
  - `deal_type`, `status`: from root decisionTree
  - `folder_link`: from root
  - All address fields (street, suburb, state, etc.)
  - All riskOverlays fields
  - All contentSections fields (why_this_property, proximity, investment_highlights)
  - All marketPerformance fields
  - All agent fields
- Add project-specific fields:
  - `lot_number`: `{{11.lotNumber}}`
  - `project_parent_id`: `{{10.parent_record_id}}`
  - `is_parent_record`: `"No"`
  - `project_identifier`: `{{10.project_identifier}}` (needs to be stored in Module 10 from parent record)

**Module 12 (HTTP - Create Child Records):**
- Change from "JSON string" to "Data structure" mode
- Map to Create JSON output
- Now includes all fields (shared + lot-specific)

**Benefits:**
- ✅ Child records have complete data
- ✅ Solves empty value issues
- ✅ Handles multi-line fields correctly

---

## 🔄 Updated Scenario Structure (After Implementation)

```
Module 1: Custom Webhook
  ↓
Module 2: Router
  ├─ Route 1: Single Property
  │   ├─ Module 5: Set Variable (incoming_data)
  │   ├─ Module 13: Create JSON ✅ (NEW - all 87 fields from root)
  │   └─ Module 14: HTTP - Create GHL Record ✅ (uses Module 13 output)
  │
  └─ Route 2: Project
      ├─ Module 6: Set Variable (incoming_data)
      ├─ Module 7: Create JSON - Parent Record ✅ (NEW - shared fields only)
      ├─ Module 9: HTTP - Create Parent Record ✅ (uses Module 7 output)
      ├─ Module 10: Set Variable (parent_record_id, project_identifier)
      ├─ Module 11: Iterator (formData.lots)
      ├─ Module 12A: Create JSON - Child Record ✅ (NEW - shared + lot-specific)
      └─ Module 12: HTTP - Create Child Records ✅ (uses Module 12A output)
```

---

## 📝 Implementation Checklist

### Phase 1: Route 1 (Single Property)
- [ ] Add Create JSON module after Module 5 (Route 1)
- [ ] Map all 87 fields from `{{5.incoming_data.formData...}}`
- [ ] Include multi-line fields (why_this_property, proximity, investment_highlights)
- [ ] Update Module 14 to use "Data structure" mode
- [ ] Map Module 14 body to Create JSON output
- [ ] Test with empty and filled fields
- [ ] Verify GHL record created with all fields

### Phase 2: Route 2 - Parent Record
- [ ] Add Create JSON module after Module 6 (Route 2)
- [ ] Map shared fields from root (`{{6.incoming_data.formData...}}`)
- [ ] Add project-specific fields (is_parent_record, project_identifier)
- [ ] Exclude propertyDescription, purchasePrice, rentalAssessment (not at root)
- [ ] Update Module 9 to use "Data structure" mode
- [ ] Map Module 9 body to Create JSON output
- [ ] Update Module 10 to store project_identifier from parent record
- [ ] Test parent record creation with all shared fields

### Phase 3: Route 2 - Child Records
- [ ] Add Create JSON module after Module 11 Iterator (Route 2)
- [ ] Map lot-specific fields from Iterator (`{{11.propertyDescription...}}`)
- [ ] Map shared fields from root (`{{6.incoming_data.formData...}}`)
- [ ] Combine to create complete child record JSON
- [ ] Add project-specific fields (lot_number, project_parent_id, is_parent_record)
- [ ] Update Module 12 to use "Data structure" mode
- [ ] Map Module 12 body to Create JSON output
- [ ] Test child record creation with all fields
- [ ] Verify all child records created correctly

---

## 🎯 Key Decisions Needed

1. **Should we update Module 10 to store project_identifier?**
   - Parent record creates `project_identifier` in Module 9
   - Child records need `project_identifier` (same as parent)
   - Module 10 should capture: `project_identifier: {{9.data.record.properties.project_identifier}}`
   - Or child records can query parent record

2. **Should child records include shared data (contentSections, riskOverlays)?**
   - Option A: Include in child records (duplicate but complete)
   - Option B: Only lot-specific data in child records (query parent for shared data)
   - **Recommendation:** Option A - child records should be complete (easier for Deal Sheet, queries)

3. **Should we remove Module 5 and Module 6 Set Variables?**
   - They're just storing `{{1}}` (webhook data)
   - Could use `{{1.formData...}}` directly
   - **But:** Keeping them makes it clearer what data is being used in each route
   - **Recommendation:** Keep them for clarity

---

## ⚠️ Considerations

1. **Module Numbering:**
   - Numbers will shift when adding new modules
   - Reference modules by function, not number
   - Document final structure after implementation

2. **Testing Order:**
   - Test Route 1 first (simpler - all fields at root)
   - Test Route 2 parent record second
   - Test Route 2 child records last (most complex - combines root + Iterator data)

3. **Error Handling:**
   - Create JSON modules may fail if fields don't exist
   - Route 2 child records depend on parent record existing
   - Need error handling between parent and child creation

4. **Performance:**
   - Multiple Create JSON modules add execution time
   - But provides better error handling and data validation
   - Worth the trade-off for stability

---

## 📚 Reference Documents

- `MODULE-14-CREATE-JSON-IMPLEMENTATION.md` - Detailed field mappings for Route 1
- `HANDOVER-2025-01-08-SESSION.md` - Route 2 current structure
- `PROJECT-LOTS-ARCHITECTURE.md` - Project data structure
- `docs/EXISTING-GHL-INFRASTRUCTURE.md` - GHL field names

---

**Status:** Planning Complete - Awaiting Approval  
**Next Step:** Review and approve plan before implementation  
**Priority:** High - Unified solution for both routes

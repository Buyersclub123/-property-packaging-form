# Module 21 vs Module 22 - Code Comparison

**Date:** January 11, 2026

---

## Module 21 Fixes Needed

### Agent Fields (Already Fixed in Module 22)
1. **agent_name** - Module 21: `formData.agentInfo?.name` → Should be: `formData.sellingAgentName`
2. **agent_email** - Module 21: `formData.agentInfo?.email` → Should be: `formData.sellingAgentEmail`
3. **agent_mobile** - Module 21: `formData.agentInfo?.mobile` → Should be: `formData.sellingAgentMobile`

### Field Mappings (Already Fixed in Module 22)
4. **market_perfornance_additional_dialogue** - Module 21: Typo `market_perfornance` → Should be: `market_performance`
5. **project_brief** - Module 21: Hardcoded `null` → Should be: `nullIfEmpty(formData.propertyDescription?.projectOverview)`

### Missing Fields (Route 1 Needs These Too)
6. **lot_number** - Module 21: Hardcoded `null` → Should be: `nullIfEmpty(formData.address?.lotNumber)`
7. **property_type** - Module 21: Missing → Should add: `nullIfEmpty(formData.decisionTree?.propertyType)`
8. **net_price** - Module 21: Missing → Should add: Calculated field (same logic as Module 22 - only when cashback type is 'cashback')
9. **single_or_dual_occupancy** - Module 21: Uses `does_this_property_have_2_dwellings` (removed from GHL) → Should add: `mapSingleDualOccupancy(formData.decisionTree?.dualOccupancy)` (keep old field in code to see error)

---

## Fields Module 22 Has That Module 21 Doesn't Have

### Project Fields (Expected - Route 2 Only)
1. **project_name** - Module 22 only (maps from `shared_data.address?.projectName`)
2. **project_address** - Module 22 only (maps from `shared_data.address?.projectAddress`)
3. **project_brief** - Module 22 maps data, Module 21 has null (needs fix per Issue #5 above)
4. **lot_number** - Module 22 maps data, Module 21 hardcoded null
5. **project_identifier** - Module 22 maps data, Module 21 hardcoded null
6. **is_parent_record** - Module 22 uses "No", Module 21 hardcoded null

### Non-Project Fields (Route 2 Only)
7. **property_type** - Module 22 only (maps from `shared_data.decisionTree?.propertyType`)
8. **net_price** - Module 22 only (calculated field, only when cashback type is 'cashback')
9. **single_or_dual_occupancy** - Module 22 only (Module 21 has `does_this_property_have_2_dwellings` instead)

---

## Fields Module 21 Has That Module 22 Doesn't Have

### Route 1 Specific Fields (Expected)
1. **does_this_property_have_2_dwellings** - Module 21 only (Module 22 uses `single_or_dual_occupancy` instead)
2. **build_size_primary** - Module 21 only (Route 1 field)
3. **build_size_secondary** - Module 21 only (Route 1 field)
4. **rent_dialogue_primary** - Module 21 only (Route 1 field)
5. **rent_dialogue_secondary** - Module 21 only (Route 1 field)
6. **accepted_acquisition_target** - Module 21 only (Route 1 field)
7. **asking_text** - Module 21 only
8. **occupancy** - Module 21 only (single occupancy field)

---

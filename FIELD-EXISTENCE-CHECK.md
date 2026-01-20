# Field Existence Check - Form vs GHL
**Date:** January 9, 2026  
**Purpose:** Verify all form fields exist in GHL

---

## ✅ Fields Created in Previous Session (Now Exist in GHL)

### Project Architecture Fields
- ✅ `lot_number` (Text)
- ✅ `project_parent_id` (Text)
- ✅ `is_parent_record` (Yes/No Dropdown)
- ✅ `project_identifier` (Text)

### Email Template Storage
- ✅ `email_template_html` (Multi-line Text)
- ✅ `email_template_text` (Multi-line Text)

### Property Description Fields
- ✅ `build_size` (Text)
- ✅ `land_registration` (Text)
- ✅ `lga` (Text)

### Attachments
- ✅ `folder_link` (Text) - Already existed, confirmed

---

## ❌ Fields Still Missing in GHL (Not Yet Created)

### High Priority - Purchase Price Fields (For H&L Split Contracts)
- ❌ `land_price` (Text) - Land price component
- ❌ `build_price` (Text) - Build price component
- ❌ `total_price` (Text) - Total price (land + build)
- ❌ `cashback_rebate_value` (Text) - Cashback/rebate amount
- ❌ `cashback_rebate_type` (Text/Dropdown) - Type of rebate

**Note:** These are needed for H&L properties where land and build prices are separate.

### High Priority - Rental Assessment Range Fields
- ❌ `rent_appraisal_primary_from` (Text) - Primary rent appraisal from value
- ❌ `rent_appraisal_primary_to` (Text) - Primary rent appraisal to value
- ❌ `rent_appraisal_secondary_from` (Text) - Secondary rent appraisal from value
- ❌ `rent_appraisal_secondary_to` (Text) - Secondary rent appraisal to value

**Note:** GHL currently has:
- ✅ `rent_appraisal_primary` (single field)
- ✅ `rent_appraisal_secondary` (single field)

**Decision Needed:** Do we split these existing fields or create new ones?

---

## ✅ Fields That Already Existed in GHL

### Property Description
- ✅ `beds_primary`, `beds_additional__secondary__dual_key`
- ✅ `bath_primary`, `baths_additional__secondary__dual_key`
- ✅ `garage_primary`, `garage_additional__secondary__dual_key`
- ✅ `carport_primary`, `carport_additional__secondary__dual_key`
- ✅ `carspace_primary`, `carspace_additional__secondary__dual_key`
- ✅ `year_built`
- ✅ `land_size`
- ✅ `title`
- ✅ `body_corp__per_quarter`
- ✅ `body_corp_description`
- ✅ `does_this_property_have_2_dwellings`
- ✅ `property_description_additional_dialogue`

### Purchase Price
- ✅ `asking`
- ✅ `asking_text`
- ✅ `acceptable_acquisition__from`
- ✅ `acceptable_acquisition__to`
- ✅ `comparable_sales`
- ✅ `purchase_price_additional_dialogue`

### Rental Assessment
- ✅ `occupancy`
- ✅ `current_rent_primary__per_week`
- ✅ `current_rent_secondary__per_week`
- ✅ `expiry_primary`
- ✅ `expiry_secondary`
- ✅ `rent_appraisal_primary` (single field - needs splitting?)
- ✅ `rent_appraisal_secondary` (single field - needs splitting?)
- ✅ `yield`
- ✅ `appraised_yield`
- ✅ `rent_dialogue_primary`
- ✅ `rent_dialogue_secondary`
- ✅ `rental_assessment_additional_dialogue`

### Risk Overlays
- ✅ `zoning`
- ✅ `flood`, `flood_dialogue`
- ✅ `bushfire`, `bushfire_dialogue`
- ✅ `mining`, `mining_dialogie` (typo in field name)
- ✅ `other_overlay`, `other_overlay_dialogue`
- ✅ `special_infrastructure`, `special_infrastructure_dialogue`
- ✅ `due_diligence_acceptance`

### Market Performance
- ✅ `median_price_change__3_months`
- ✅ `median_price_change__1_year`
- ✅ `median_price_change__3_year`
- ✅ `median_price_change__5_year`
- ✅ `median_yield`
- ✅ `median_rent_change__1_year`
- ✅ `rental_population`
- ✅ `vacancy_rate`
- ✅ `market_perfornance_additional_dialogue` (typo in field name)

### Content Sections
- ✅ `why_this_property`
- ✅ `proximity`
- ✅ `investment_highlights`

### Agent Information
- ✅ `agent_name`
- ✅ `agent_mobile`
- ✅ `agent_email`

### Core Fields
- ✅ `property_address`
- ✅ `template_type`
- ✅ `sourcer`
- ✅ `packager`
- ✅ `deal_type`
- ✅ `review_date`
- ✅ `status`
- ✅ `street_number`
- ✅ `street_name`
- ✅ `suburb_name`
- ✅ `state`
- ✅ `post_code`
- ✅ `google_map`

---

## 📊 Summary

**Total Fields Created This Session:** 10 fields ✅

**Total Fields Still Missing:** 9 fields ❌
- 5 Purchase Price fields (land_price, build_price, total_price, cashback_rebate_value, cashback_rebate_type)
- 4 Rental Assessment range fields (rent_appraisal_primary_from/to, rent_appraisal_secondary_from/to)

**Fields That Already Existed:** ~80+ fields ✅

---

## 🎯 Next Steps

1. **Create Missing Purchase Price Fields** (if needed for H&L split contracts)
2. **Decide on Rental Assessment Fields:**
   - Option A: Create new `_from` and `_to` fields
   - Option B: Use existing `rent_appraisal_primary` and `rent_appraisal_secondary` fields (store as "From - To" format)
3. **Test with actual form data** to verify all mappings work correctly

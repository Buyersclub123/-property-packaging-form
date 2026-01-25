# Route 2 Module 22 - Missing Fields Todo List

## Status: ✅ COMPLETE - All fields added to Module 22 code

**Date Completed:** January 11, 2026
**File:** `ROUTE-2-MODULE-22-COMPLETE-CODE.js`

### Fields Added to Route 2 Module 22 Code (✅ COMPLETE)

#### Step 6:
- ✅ `message_for_ba` - Added (line 204)

#### Step 4 (Market Performance):
- ✅ `median_price_change__3_months` - Added (line 122, using `toFloat()`)
- ✅ `median_price_change__1_year` - Added (line 123, using `toFloat()`)
- ✅ `median_price_change__3_year` - Added (line 124, using `toFloat()`)
- ✅ `median_price_change__5_year` - Added (line 125, using `toFloat()`)
- ✅ `median_yield` - Added (line 126, using `toFloat()`)
- ✅ `median_rent_change__1_year` - Added (line 127, using `toFloat()`)
- ✅ `rental_population` - Added (line 128, using `toFloat()`)
- ✅ `vacancy_rate` - Added (line 129, using `toFloat()`)
- ✅ `market_performance_additional_dialogue` - Added (line 130)

#### Step 3 (Project Level):
- ✅ `project_address` (separate field) - Added (line 91)
- ✅ `project_name` - Added (line 104)
- ✅ `project_brief` - Added (line 105, maps from `shared_data.propertyDescription?.projectBrief`)
- ✅ `net_price` - Added (lines 165-174, calculated when `cashbackRebateType === 'cashback'`)
- ✅ `purchase_price_additional_dialogue` - Added (line 178)

#### Step 1:
- ✅ `property_type` - Added (line 98)

#### Deal Information:
- ✅ `agent_name` - Added (line 199)
- ✅ `agent_email` - Added (line 200)
- ✅ `agent_mobile` - Added (line 201)

### Fields Verified/Added:
- ✅ `unit__lot` (Unit / Lot Primary) - Already in code (line 88)
- ✅ `total_price` - Already in code (line 164)
- ✅ `attachments_additional_dialogue` - Added (line 205)
- ✅ `rental_assessment_additional_dialogue` - Already in code (line 196)
- ✅ `property_description_additional_dialogue` - Already in code (line 156)
- ✅ `price_group` - Added (line 179)
- ✅ `asking` - Added (line 159, using `mapAskingValue()`)

### Fields to Test:
- `body_corp__per_quarter` - Already in code, needs testing
- `body_corp_description` - Already in code, needs testing

### Form Bug to Fix:
- When "Owner Corp (community)" is selected in Title dropdown, Body Corp $ (per quarter) and Body Corp Description fields don't show/drop down (should appear when selected)

### Fields Removed from GHL (do not send):
- `build_size_secondary` - Deleted from GHL (use `build_size` instead)
- `build_size_primary` - Deleted from GHL (use `build_size` instead)
- `project_overview` - Deleted from GHL (use `project_brief` instead)
- `rent_dialogue_primary` - Deleted from GHL (use `rental_assessment_additional_dialogue` instead)
- `rent_dialogue_secondary` - Deleted from GHL (use `rental_assessment_additional_dialogue` instead)

---

## Module 9 Change (Architecture Change)

**Remove parent record - create only children:**
- Remove/disable Module 9 (parent record creation)
- All lots become child records (no parent record)
- Ensure all children get all shared values they need
- Test at same time as body corp fields

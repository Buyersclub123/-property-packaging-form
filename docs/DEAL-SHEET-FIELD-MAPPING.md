# Deal Sheet Field Mapping

**Date:** 2025-01-14  
**Purpose:** Map Deal Sheet columns to GHL fields and identify which fields need joining/combining

**Deal Sheet:** `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`, Tab `Opportunities`

---

## Deal Sheet Column Mapping

| Deal Sheet Column | GHL Field(s) | Field Join Required? | Editable? | Notes |
|-------------------|--------------|---------------------|-----------|-------|
| **Type** | `deal_type` | No | No | Direct mapping from GHL |
| **Packager** | `packager` | No | No | Direct mapping from GHL |
| **Sourcer** | `sourcer` | No | No | Direct mapping from GHL |
| **Status** | `status` | No | ✅ **YES** | **Editable** - syncs back to GHL |
| **Review Date** | `review_date` | No | No | Direct mapping from GHL |
| **Last Update** | System timestamp | No | No | Auto-generated on any change |
| **Property Address** | `property_address` | No | No | Direct mapping from GHL |
| **Asking** | `asking` + `asking_text` | ✅ Yes | No | Join: `asking` + `asking_text` (if exists) |
| **Price Group** | `price_group` | No | No | Direct mapping from GHL |
| **BA Message** | `message_for_ba` | No | No | Direct mapping from GHL |
| **Acceptable Acquisition** | `acceptable_acquisition__from` + `acceptable_acquisition__to` | ✅ Yes | No | Join: Range format `$X – $Y` (Established only) |
| **CONFIG** | `beds_primary` + `beds_secondary` + `bath_primary` + `bath_secondary` + `garage_primary` + `garage_secondary` | ✅ Yes | No | Same as "Format" field - Bed/Bath/Garage combination |
| **Format** | `deal_type` + `status` + `price_group` | ✅ Yes | No | Combination: `{deal_type}-{status}-{price_group}` (same as Sort_Key) |
| **Current Rent $ pw** | `current_rent_primary__per_week` + `current_rent_secondary__per_week` | ✅ Yes | No | Join: Sum for dual, single for single (Established only) |
| **Appraied Rent $ pw** | `rent_appraisal_primary_from/to` + `rent_appraisal_secondary_from/to` | ✅ Yes | No | Join: Range format, sum for dual (All properties) |
| **Land Size** | `land_size` | No | No | Direct mapping from GHL |
| **Title Type** | `title` | No | No | Direct mapping from GHL |
| **Year Built or Registration** | `year_built` OR `land_registration` | ✅ Yes | No | Join: Use `year_built` for Established, `land_registration` for New |
| **Selling Agent** | `agent_name` + `agent_email` + `agent_mobile` | ✅ Yes | No | Join: 3 lines (Name, Email, Mobile) |
| **Cashback or Rebat** | `cashback_rebate_type` | No | No | Direct mapping from GHL (note: typo in header "Rebat") |
| **Cashback or Rebate $** | `cashback_rebate_value` | No | No | Direct mapping from GHL |
| **Closing BA** | TBD - Need to create in GHL | No | ✅ **YES** | **Editable** - Need to create GHL field |
| **Closing Price** | TBD - Need to create in GHL | No | ✅ **YES** | **Editable** - Need to create GHL field |
| **Client_Closed** | TBD - Need to create in GHL | No | ✅ **YES** | **Editable** - Need to create GHL field |
| **Closing_Date** | TBD - Need to create in GHL | No | ✅ **YES** | **Editable** - Need to create GHL field |
| **Sort_Key__Dont_edit** | Calculated | ✅ Yes | No | Join: Combination of `Type` + `Status` + `Price Group` |

---

## Fields Requiring Joining/Combining

### Already Documented (see `FORM-CHANGES-20250114.md`):
1. ✅ **Total Price** (NEW Properties) - `land_price` + `build_price` + `total_price`
2. ✅ **Acceptable Acquisition** (Established) - `acceptable_acquisition__from` + `acceptable_acquisition__to`
3. ✅ **Format** (Bed/Bath/Garage) - `beds_primary` + `beds_secondary` + `bath_primary` + `bath_secondary` + `garage_primary` + `garage_secondary`
4. ✅ **Current Rent** (Established) - `current_rent_primary__per_week` + `current_rent_secondary__per_week`
5. ✅ **Appraised Rent** (All) - `rent_appraisal_primary_from/to` + `rent_appraisal_secondary_from/to`
6. ✅ **Year_Built_Registering_Status** - `year_built` OR `land_registration`
7. ✅ **Selling Agent** - `agent_name` + `agent_email` + `agent_mobile`

### New Fields to Document:
8. **Asking** - `asking` + `asking_text` (if `asking_text` exists, format: `"{asking} - {asking_text}"`)
9. **Sort_Key__Dont_edit** - Combination: `{deal_type}-{status}-{price_group}`

---

## Editable Fields in Deal Sheet

These fields can be edited in the Deal Sheet and should sync back to GHL:

1. ✅ **Status** - Syncs back to GHL `status` field
2. ✅ **Closing BA** - Syncs back to GHL `closing_ba` field
3. ✅ **Closing Price** - Syncs back to GHL `closing_price` field
4. ✅ **Client_Closed** - Syncs back to GHL `client_closed` field
5. ✅ **Closing_Date** - Syncs back to GHL `closing_date` field

**Note:** All other fields are read-only (must be edited via the form, which updates GHL).

---

## Fields Not in Form (GHL Only)

These fields exist in GHL but are NOT collected in the form:
- `closing_ba`
- `closing_price`
- `client_closed`
- `closing_date`

These can be edited directly in the Deal Sheet and will sync back to GHL.

---

## Field Clarifications

- **CONFIG** = Bed/Bath/Garage combination (same as "Format" field join #3)
- **Format** = Type + Status + Price Group combination (same as "Sort_Key" field join #9)
- **Closing fields** - Need to create in GHL: `closing_ba`, `closing_price`, `client_closed`, `closing_date`

---

## Next Steps

1. ✅ Document all field mappings
2. ⏭️ Verify CONFIG field mapping
3. ⏭️ Create Make.com Code module with all field joins
4. ⏭️ Create Make.com scenario to write to Deal Sheet
5. ⏭️ Set up sync back from Deal Sheet to GHL for editable fields

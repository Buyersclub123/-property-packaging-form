# Complete List of GHL Fields from Module 21/22

**Source:** Fields being sent to GHL in Module 21 (single property) and Module 22 (project child records)
**Purpose:** Complete list of fields that should be in GHL webhook payload

---

## Address Fields
- `property_address`
- `street_number`
- `street_name`
- `suburb_name`
- `state`
- `post_code`
- `lga`
- `unit__lot`
- `google_map`
- `project_address` (Module 22 only)
- `lot_number` (Module 22 only)

## Project Fields (Module 22 only)
- `project_identifier`
- `is_parent_record`
- `project_name`

## Core Property Info
- `property_type`
- `sourcer`
- `packager`
- `deal_type`
- `status`
- `folder_link`

## Risk Overlays
- `zoning`
- `flood`
- `flood_dialogue`
- `bushfire`
- `bushfire_dialogue`
- `mining`
- `mining_dialogie` (note: typo in field name)
- `other_overlay`
- `other_overlay_dialogue`
- `special_infrastructure`
- `special_infrastructure_dialogue`
- `due_diligence_acceptance`

## Property Description
- `beds_primary`
- `beds_additional__secondary__dual_key`
- `bath_primary`
- `baths_additional__secondary__dual_key`
- `garage_primary`
- `garage_additional__secondary__dual_key`
- `carport_primary`
- `carport_additional__secondary__dual_key`
- `carspace_primary`
- `carspace_additional__secondary__dual_key`
- `year_built`
- `land_size`
- `build_size`
- `land_registration`
- `title`
- `body_corp__per_quarter`
- `body_corp_description`
- `single_or_dual_occupancy`
- `property_description_additional_dialogue`
- `project_brief`

## Purchase Price
- `asking`
- `asking_text` (Module 21 only)
- `accepted_acquisition_target` (Module 21 only)
- `acceptable_acquisition__from`
- `acceptable_acquisition__to`
- `land_price`
- `build_price`
- `total_price`
- `net_price`
- `cashback_rebate_value`
- `cashback_rebate_type`
- `comparable_sales`
- `purchase_price_additional_dialogue`
- `price_group`

## Rental Assessment
- `occupancy_primary`
- `occupancy_secondary`
- `current_rent_primary__per_week`
- `current_rent_secondary__per_week`
- `expiry_primary`
- `expiry_secondary`
- `rent_appraisal_primary_from`
- `rent_appraisal_primary_to`
- `rent_appraisal_secondary_from`
- `rent_appraisal_secondary_to`
- `yield`
- `appraised_yield`
- `rental_assessment_additional_dialogue`

## Market Performance
- `median_price_change__3_months`
- `median_price_change__1_year`
- `median_price_change__3_year`
- `median_price_change__5_year`
- `median_yield`
- `median_rent_change__1_year`
- `rental_population`
- `vacancy_rate`
- `market_performance_additional_dialogue`

## Content Sections
- `why_this_property`
- `proximity`
- `investment_highlights`

## Agent Info
- `agent_name`
- `agent_email`
- `agent_mobile`

## Workflow/Other
- `message_for_ba`
- `attachments_additional_dialogue`
- `push_record_to_deal_sheet` (Module 21 only)

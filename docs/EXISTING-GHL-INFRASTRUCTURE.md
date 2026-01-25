# Existing GHL Infrastructure

## ✅ Confirmed Setup

### Custom Object: Property Reviews
- **Object Name:** Property Reviews
- **All fields exist** (see complete list below)
- **Can read/write via API**

### GHL Workflows

#### 1. PR → Property Review Created (Trigger) ⭐ MAIN WORKFLOW
- **Purpose:** Triggered when Property Review custom object is created/changed
- **Make.com Webhook URL:** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- **Triggers:**
  - Property Review Created
  - Property Review Changed (when "Resubmit for testing?" = 'yes')
  - Property Review Changed (when "BA Approved" = 'Approved')
  - Property Review Changed (when "Packager Approved" = 'Approved')
- **Payload:** Sends all custom object fields to Make.com (see JSON below)

#### 2. PR Opportunity update Make.com
- **Purpose:** Updates when Opportunity changes
- **Make.com Webhook URL:** `https://hook.eu1.make.com/phqgvu4i3knw9p7y42i5d6dhyw54xbaci`
- **Trigger:** Opportunity Changed (in pipeline 'DA PROPERTY TEAM P...', Status = 'open')
- **Payload:** Sends opportunity data (id, name, stage, contact info, partner info, status, followers)

#### 3. PR - Opportunity Pipeline stage change capture Make
- **Purpose:** Captures pipeline stage changes
- **Make.com Webhook URL:** `https://hook.eu1.make.com/swugj2vzbspklynea8n1q0zh7dq2pztt`
- **Trigger:** Pipeline Stage Changed (in pipeline '04. PROPERTY TEAM P...')
- **Payload:** Sends opportunity_id, stage_name, pipeline_stage_id
- **Note:** User thinks this might be redundant - need to check if still used

---

## GHL Custom Object Fields - Complete List

### Core Property Information
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Property Address | `{{ custom_objects.property_reviews.property_address }}` | Text | Full address |
| Template Type | `{{ custom_objects.property_reviews.template_type }}` | Dropdown | Standard, H&L with Sales Assessment, H&L without Sales Assessment, Project |
| Sourcer | `{{ custom_objects.property_reviews.sourcer }}` | Dropdown | Short names (needs to change to full names with emails) |
| Packager | `{{ custom_objects.property_reviews.packager }}` | Dropdown | Short names (needs to change to full names with emails) |
| Deal Type | `{{ custom_objects.property_reviews.deal_type }}` | Dropdown | 01 H&L Comms, 02 Single Comms, 03 Internal with Comms, 04 Internal No-Comms, 05 Established |
| Review Date | `{{ custom_objects.property_reviews.review_date }}` | Date | Date property was reviewed |
| Status | `{{ custom_objects.property_reviews.status }}` | Dropdown | 01 Available, 02 EOI, 03 Contr' Exchanged, 05 Remove no interest, 06 Remove lost |

### Address Components
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Unit / Lot (Primary) | `{{ custom_objects.property_reviews.unit__lot }}` | Text | Unit/Lot number for primary dwelling |
| Unit / Lot (Secondary) | `{{ custom_objects.property_reviews.unit__lot_secondary }}` | Text | Unit/Lot number for secondary dwelling |
| Street Number | `{{ custom_objects.property_reviews.street_number }}` | Text | Street number component |
| Street Name | `{{ custom_objects.property_reviews.street_name }}` | Text | Street name component |
| Suburb Name | `{{ custom_objects.property_reviews.suburb_name }}` | Text | Used for Market Performance lookup |
| State | `{{ custom_objects.property_reviews.state }}` | Text | State code (VIC, NSW, QLD, etc.) |
| Post Code | `{{ custom_objects.property_reviews.post_code }}` | Text | Postcode |
| Google Map | `{{ custom_objects.property_reviews.google_map }}` | Text | Google Maps link (can be automated) |

### Property Description
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Bed (Primary) | `{{ custom_objects.property_reviews.beds_primary }}` | Dropdown | 1-9 |
| Bed (Secondary) | `{{ custom_objects.property_reviews.beds_additional__secondary__dual_key }}` | Dropdown | 1-9 (only if Dual/Duplex) |
| Bath (Primary) | `{{ custom_objects.property_reviews.bath_primary }}` | Dropdown | 1-9 (in 0.5 increments) |
| Bath (Secondary) | `{{ custom_objects.property_reviews.baths_additional__secondary__dual_key }}` | Dropdown | 1-9 (in 0.5 increments, only if Dual/Duplex) |
| Garage (Primary) | `{{ custom_objects.property_reviews.garage_primary }}` | Dropdown | 1-9 |
| Garage (Secondary) | `{{ custom_objects.property_reviews.garage_additional__secondary__dual_key }}` | Dropdown | 1-9 (only if Dual/Duplex) |
| Car-port (Primary) | `{{ custom_objects.property_reviews.carport_primary }}` | Dropdown | 1-9 |
| Car-port (Secondary) | `{{ custom_objects.property_reviews.carport_additional__secondary__dual_key }}` | Dropdown | 1-9 (only if Dual/Duplex) |
| Car-space (Primary) | `{{ custom_objects.property_reviews.carspace_primary }}` | Dropdown | 1-9 |
| Car-space (Secondary) | `{{ custom_objects.property_reviews.carspace_additional__secondary__dual_key }}` | Dropdown | 1-9 (only if Dual/Duplex) |
| Year Built | `{{ custom_objects.property_reviews.year_built }}` | Text | Numeric, TBC, or Circa support needed |
| Land Size | `{{ custom_objects.property_reviews.land_size }}` | Text | Numeric, TBC support needed |
| Title | `{{ custom_objects.property_reviews.title }}` | Dropdown | Individual, Green, Torrens, Strata, Owners Corp (Community), Survey Strata, Built Strata, TBC |
| Body corp $ (per quarter) | `{{ custom_objects.property_reviews.body_corp__per_quarter }}` | Text | Numeric, TBC support needed, mandatory for certain titles |
| Body Corp Description | `{{ custom_objects.property_reviews.body_corp_description }}` | Text | Additional body corp info |
| Does this property have 2 dwellings? | `{{ custom_objects.property_reviews.does_this_property_have_2_dwellings }}` | Yes/No | Determines if secondary fields show |
| Property Description Additional Dialogue | `{{ custom_objects.property_reviews.property_description_additional_dialogue }}` | Text | Additional property description info |

### Property Overlays
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Zoning | `{{ custom_objects.property_reviews.zoning }}` | Text | From Stash |
| Flood | `{{ custom_objects.property_reviews.flood }}` | Yes/No | From Stash, can override |
| Flood Dialogue | `{{ custom_objects.property_reviews.flood_dialogue }}` | Text | Shows when Flood = Yes |
| Bushfire | `{{ custom_objects.property_reviews.bushfire }}` | Yes/No | From Stash, can override |
| Bushfire Dialogue | `{{ custom_objects.property_reviews.bushfire_dialogue }}` | Text | Shows when Bushfire = Yes |
| Mining | `{{ custom_objects.property_reviews.mining }}` | Yes/No | From Stash, can override |
| Mining Dialogue | `{{ custom_objects.property_reviews.mining_dialogie }}` | Text | **NOTE: Typo in field name** - Shows when Mining = Yes |
| Other (Overlay) | `{{ custom_objects.property_reviews.other_overlay }}` | Yes/No | From Stash, can override |
| Other (Overlay) Dialogue | `{{ custom_objects.property_reviews.other_overlay_dialogue }}` | Text | Shows when Other (Overlay) = Yes |
| Special Infrastructure | `{{ custom_objects.property_reviews.special_infrastructure }}` | Yes/No | From Stash, can override |
| Special Infrastructure Dialogue | `{{ custom_objects.property_reviews.special_infrastructure_dialogue }}` | Text | Shows when Special Infrastructure = Yes |
| Due Diligence Acceptance | `{{ custom_objects.property_reviews.due_diligence_acceptance }}` | Yes/No | Blocks submission if No |

### Purchase Price
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Asking | `{{ custom_objects.property_reviews.asking }}` | Dropdown | On-market, Off-market, Pre-launch, Coming Soon, N/A, TBC |
| Asking Text | `{{ custom_objects.property_reviews.asking_text }}` | Text | Always required, appended to Asking |
| Accepted Acquisition Target | `{{ custom_objects.property_reviews.accepted_acquisition_target }}` | Text | **NOTE: This field exists but requirements say we need "Acceptable Acquisition $ From" and "Acceptable Acquisition $ To" - need to check if this is the same or different** |
| Acceptable Acquisition $ From | `{{ custom_objects.property_reviews.acceptable_acquisition__from }}` | Text | Numeric |
| Acceptable Acquisition $ To | `{{ custom_objects.property_reviews.acceptable_acquisition__to }}` | Text | Numeric |
| Comparable Sales | `{{ custom_objects.property_reviews.comparable_sales }}` | Text | Free text |
| Purchase Price Additional Dialogue | `{{ custom_objects.property_reviews.purchase_price_additional_dialogue }}` | Text | Additional purchase price info |

### Rental Assessment
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Occupancy | `{{ custom_objects.property_reviews.occupancy }}` | Dropdown | Owner Occupied, Tenanted, Vacant |
| Current Rent (Primary) $ per week | `{{ custom_objects.property_reviews.current_rent_primary__per_week }}` | Text | Numeric or TBC, only visible if Tenanted |
| Current Rent (Secondary) $ per week | `{{ custom_objects.property_reviews.current_rent_secondary__per_week }}` | Text | Numeric or TBC, only visible if Tenanted & Dual/Duplex |
| Expiry (Primary) | `{{ custom_objects.property_reviews.expiry_primary }}` | Text | Month/year selector, TBC support needed |
| Expiry (Secondary) | `{{ custom_objects.property_reviews.expiry_secondary }}` | Text | Month/year selector, TBC support needed |
| Rent Appraisal (Primary) | `{{ custom_objects.property_reviews.rent_appraisal_primary }}` | Text | **NOTE: Requirements say we need "Rent Appraisal From" and "Rent Appraisal To" - need to check if this field needs to be split** |
| Rent Appraisal (Secondary) | `{{ custom_objects.property_reviews.rent_appraisal_secondary }}` | Text | **NOTE: Requirements say we need "Rent Appraisal From" and "Rent Appraisal To" - need to check if this field needs to be split** |
| Yield | `{{ custom_objects.property_reviews.yield }}` | Text | Auto-calculated |
| Appraised Yield | `{{ custom_objects.property_reviews.appraised_yield }}` | Text | Auto-calculated |
| Rent Dialogue (Primary) | `{{ custom_objects.property_reviews.rent_dialogue_primary }}` | Text | Additional rent info |
| Rent Dialogue (Secondary) | `{{ custom_objects.property_reviews.rent_dialogue_secondary }}` | Text | Additional rent info |
| Rental Assessment Additional Dialogue | `{{ custom_objects.property_reviews.rental_assessment_additional_dialogue }}` | Text | Additional rental assessment info |

### Market Performance
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Median price change - 3 months | `{{ custom_objects.property_reviews.median_price_change__3_months }}` | Text | Numeric, percentage |
| Median price change - 1 year | `{{ custom_objects.property_reviews.median_price_change__1_year }}` | Text | Numeric, percentage |
| Median price change - 3 year | `{{ custom_objects.property_reviews.median_price_change__3_year }}` | Text | Numeric, percentage |
| Median price change - 5 year | `{{ custom_objects.property_reviews.median_price_change__5_year }}` | Text | Numeric, percentage |
| Median yield | `{{ custom_objects.property_reviews.median_yield }}` | Text | Numeric, percentage |
| Median rent change - 1 year | `{{ custom_objects.property_reviews.median_rent_change__1_year }}` | Text | Numeric, percentage |
| Rental Population | `{{ custom_objects.property_reviews.rental_population }}` | Text | Numeric, percentage |
| Vacancy Rate | `{{ custom_objects.property_reviews.vacancy_rate }}` | Text | Numeric, percentage |
| Market Performance Additional Dialogue | `{{ custom_objects.property_reviews.market_perfornance_additional_dialogue }}` | Text | **NOTE: Typo in field name** - Additional market performance info |

### Content Sections
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Why this property? | `{{ custom_objects.property_reviews.why_this_property }}` | Text | Multi-line free text |
| Proximity | `{{ custom_objects.property_reviews.proximity }}` | Text | Multi-line free text |
| Investment Highlights | `{{ custom_objects.property_reviews.investment_highlights }}` | Text | Multi-line free text |

### Agent Information
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Agent Name | `{{ custom_objects.property_reviews.agent_name }}` | Text | Selling agent name |
| Agent Mobile | `{{ custom_objects.property_reviews.agent_mobile }}` | Text | Selling agent mobile |
| Agent Email | `{{ custom_objects.property_reviews.agent_email }}` | Text | Selling agent email |

### Workflow & Approval
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Packager Approved | `{{ custom_objects.property_reviews.packager_approved }}` | Yes/No | Packager approval flag |
| BA Approved | `{{ custom_objects.property_reviews.ba_approved }}` | Yes/No | BA approval flag |
| Resubmit for testing? | `{{ custom_objects.property_reviews.resubmit_for_testing }}` | Yes/No | Flag to resubmit for testing |
| Message for BA | `{{ custom_objects.property_reviews.message_for_ba }}` | Text | Message from packager to BA |
| Push Record to Deal Sheet? | `{{ custom_objects.property_reviews.push_record_to_deal_sheet }}` | Yes/No | Flag to push to Deal Sheet |

### Other Fields
| Field Name | GHL Reference | Type | Notes |
|------------|---------------|------|-------|
| Price_group | `{{ custom_objects.property_reviews.price_group }}` | Text | Price group classification |
| Attachments Additional Dialogue | `{{ custom_objects.property_reviews.attachments_additional_dialogue }}` | Text | Additional attachment info |

---

## JSON Payload Sent to Make.com

When Property Review is created/changed, GHL sends this JSON to Make.com webhook:

```json
{
    "id": "{{ custom_objects.property_reviews.id }}",
    "property_address": "{{ custom_objects.property_reviews.property_address }}",
    "template_type": "{{ custom_objects.property_reviews.template_type }}",
    "sourcer": "{{ custom_objects.property_reviews.sourcer }}",
    "packager": "{{ custom_objects.property_reviews.packager }}",
    "deal_type": "{{ custom_objects.property_reviews.deal_type }}",
    "review_date": "{{ custom_objects.property_reviews.review_date }}",
    "unit_lot_primary": "{{ custom_objects.property_reviews.unit__lot }}",
    "street_number": "{{ custom_objects.property_reviews.street_number }}",
    "street_name": "{{ custom_objects.property_reviews.street_name }}",
    "suburb_name": "{{ custom_objects.property_reviews.suburb_name }}",
    "state": "{{ custom_objects.property_reviews.state }}",
    "why_this_property": "{{ custom_objects.property_reviews.why_this_property }}",
    "google_map": "{{ custom_objects.property_reviews.google_map }}",
    "beds_primary": "{{ custom_objects.property_reviews.beds_primary }}",
    "beds_secondary": "{{ custom_objects.property_reviews.beds_additional__secondary__dual_key }}",
    "bath_primary": "{{ custom_objects.property_reviews.bath_primary }}",
    "bath_secondary": "{{ custom_objects.property_reviews.baths_additional__secondary__dual_key }}",
    "land_size": "{{ custom_objects.property_reviews.land_size }}",
    "title": "{{ custom_objects.property_reviews.title }}",
    "body_corp_per_quarter": "{{ custom_objects.property_reviews.body_corp__per_quarter }}",
    "garage_primary": "{{ custom_objects.property_reviews.garage_primary }}",
    "garage_secondary": "{{ custom_objects.property_reviews.garage_additional__secondary__dual_key }}",
    "carport_primary": "{{ custom_objects.property_reviews.carport_primary }}",
    "carport_secondary": "{{ custom_objects.property_reviews.carport_additional__secondary__dual_key }}",
    "carspace_primary": "{{ custom_objects.property_reviews.carspace_primary }}",
    "carspace_secondary": "{{ custom_objects.property_reviews.carspace_additional__secondary__dual_key }}",
    "zoning": "{{ custom_objects.property_reviews.zoning }}",
    "flood": "{{ custom_objects.property_reviews.flood }}",
    "bushfire": "{{ custom_objects.property_reviews.bushfire }}",
    "mining": "{{ custom_objects.property_reviews.mining }}",
    "other_overlay": "{{ custom_objects.property_reviews.other_overlay }}",
    "special_infrastructure": "{{ custom_objects.property_reviews.special_infrastructure }}",
    "due_diligence_acceptance": "{{ custom_objects.property_reviews.due_diligence_acceptance }}",
    "asking": "{{ custom_objects.property_reviews.asking }}",
    "asking_text": "{{ custom_objects.property_reviews.asking_text }}",
    "accepted_acquisition_target": "{{ custom_objects.property_reviews.accepted_acquisition_target }}",
    "occupancy": "{{ custom_objects.property_reviews.occupancy }}",
    "current_rent_primary_per_week": "{{ custom_objects.property_reviews.current_rent_primary__per_week }}",
    "current_rent_secondary_per_week": "{{ custom_objects.property_reviews.current_rent_secondary__per_week }}",
    "expiry_primary": "{{ custom_objects.property_reviews.expiry_primary }}",
    "expiry_secondary": "{{ custom_objects.property_reviews.expiry_secondary }}",
    "yield": "{{ custom_objects.property_reviews.yield }}",
    "rent_appraisal_primary": "{{ custom_objects.property_reviews.rent_appraisal_primary }}",
    "rent_appraisal_secondary": "{{ custom_objects.property_reviews.rent_appraisal_secondary }}",
    "appraised_yield": "{{ custom_objects.property_reviews.appraised_yield }}",
    "proximity": "{{ custom_objects.property_reviews.proximity }}",
    "median_price_change_3_months": "{{ custom_objects.property_reviews.median_price_change__3_months }}",
    "median_price_change_1_year": "{{ custom_objects.property_reviews.median_price_change__1_year }}",
    "median_price_change_3_year": "{{ custom_objects.property_reviews.median_price_change__3_year }}",
    "median_price_change_5_year": "{{ custom_objects.property_reviews.median_price_change__5_year }}",
    "median_yield": "{{ custom_objects.property_reviews.median_yield }}",
    "median_rent_change_1_year": "{{ custom_objects.property_reviews.median_rent_change__1_year }}",
    "rental_population": "{{ custom_objects.property_reviews.rental_population }}",
    "vacancy_rate": "{{ custom_objects.property_reviews.vacancy_rate }}",
    "investment_highlights": "{{ custom_objects.property_reviews.investment_highlights }}",
    "status": "{{ custom_objects.property_reviews.status }}",
    "price_group": "{{ custom_objects.property_reviews.price_group }}",
    "acceptable_acquisition_from": "{{ custom_objects.property_reviews.acceptable_acquisition__from }}",
    "acceptable_acquisition_to": "{{ custom_objects.property_reviews.acceptable_acquisition__to }}",
    "year_built": "{{ custom_objects.property_reviews.year_built }}",
    "body_corp_description": "{{ custom_objects.property_reviews.body_corp_description }}",
    "does_this_property_have_2_dwellings": "{{ custom_objects.property_reviews.does_this_property_have_2_dwellings }}",
    "flood_dialogue": "{{ custom_objects.property_reviews.flood_dialogue }}",
    "bushfire_dialogue": "{{ custom_objects.property_reviews.bushfire_dialogue }}",
    "mining_dialogue": "{{ custom_objects.property_reviews.mining_dialogie }}",
    "other_overlay_dialogue": "{{ custom_objects.property_reviews.other_overlay_dialogue }}",
    "special_infrastructure_dialogue": "{{ custom_objects.property_reviews.special_infrastructure_dialogue }}",
    "comparable_sales": "{{ custom_objects.property_reviews.comparable_sales }}",
    "post_code": "{{ custom_objects.property_reviews.post_code }}",
    "unit_lot_secondary": "{{ custom_objects.property_reviews.unit__lot_secondary }}",
    "agent_name": "{{ custom_objects.property_reviews.agent_name }}",
    "agent_mobile": "{{ custom_objects.property_reviews.agent_mobile }}",
    "agent_email": "{{ custom_objects.property_reviews.agent_email }}",
    "push_record_to_deal_sheet": "{{ custom_objects.property_reviews.push_record_to_deal_sheet }}",
    "rent_dialogue_primary": "{{ custom_objects.property_reviews.rent_dialogue_primary }}",
    "rent_dialogue_secondary": "{{ custom_objects.property_reviews.rent_dialogue_secondary }}",
    "property_description_additional_dialogue": "{{ custom_objects.property_reviews.property_description_additional_dialogue }}",
    "purchase_price_additional_dialogue": "{{ custom_objects.property_reviews.purchase_price_additional_dialogue }}",
    "rental_assessment_additional_dialogue": "{{ custom_objects.property_reviews.rental_assessment_additional_dialogue }}",
    "market_performance_additional_dialogue": "{{ custom_objects.property_reviews.market_perfornance_additional_dialogue }}",
    "attachments_additional_dialogue": "{{ custom_objects.property_reviews.attachments_additional_dialogue }}",
    "message_for_ba": "{{ custom_objects.property_reviews.message_for_ba }}",
    "packager_approved": "{{ custom_objects.property_reviews.packager_approved }}",
    "ba_approved": "{{ custom_objects.property_reviews.ba_approved }}",
    "test": "property_review"
}
```

---

## Questions to Answer:

1. **GHL API Access:**
   - What's the API endpoint for writing custom objects?
   - What's the auth method (Bearer token, API key)?
   - Do we have credentials?

2. **Field Mismatches:**
   - `accepted_acquisition_target` exists, but requirements say we need `acceptable_acquisition__from` and `acceptable_acquisition__to` - are these different fields or should we use the existing one?
   - `rent_appraisal_primary` exists, but requirements say we need `rent_appraisal_primary_from` and `rent_appraisal_primary_to` - need to check if we need to create new fields or split existing one

3. **Missing Fields (from requirements):**
   - `build_size` (for H&L & Projects)
   - `lga` (for Investment Highlights lookup)
   - `land_registration` (for H&L/Projects, replaces Year Built)
   - `rent_appraisal_primary_from` / `rent_appraisal_primary_to` (if splitting existing field)
   - `rent_appraisal_secondary_from` / `rent_appraisal_secondary_to` (if splitting existing field)
   - Editing workflow fields (ba_editing_notes, section_flagged, packager_response_notes, blocked_status, etc.)

4. **Packager/Sourcer Dropdowns:**
   - How do we pull full user names with emails from GHL?
   - Is there an API endpoint for users?

---

## Next Steps:

1. ✅ Documented GHL infrastructure
2. ⏭️ Need to understand Make.com scenarios (what do they do?)
3. ⏭️ Need GHL API credentials/endpoint
4. ⏭️ Need to clarify field mismatches
5. ⏭️ Start building form









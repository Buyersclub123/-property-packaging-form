# Property Packaging Field Mapping Matrix

**Purpose:** Comprehensive analysis of all form fields, their destinations (Email Template, Google Sheet Deal Sheet, GHL Custom Object), and property type applicability.

**Last Updated:** 2026-01-06

---

## Legend

- **Email** = Field appears in email template
- **Deal Sheet** = Field goes to Google Sheet Deal Sheet
- **GHL** = Field goes to GHL Custom Object
- **Both** = Field goes to both Email and Deal Sheet
- **All** = Field goes to Email, Deal Sheet, and GHL

**Property Types:**
- **P** = Project (Multiple Lots)
- **H&L** = House & Land (Individual Lot)
- **E** = Established
- **All** = Applies to all property types

---

## Field Mapping Matrix

### 1. PACKAGE INFORMATION

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `packager` | ❌ | ✅ | ✅ | All | Username only (before @) in Deal Sheet/GHL |
| `sourcer` | ❌ | ✅ | ✅ | All | Dropdown - needs GHL API integration |
| `sellingAgent` (combined) | ❌ | ✅ | ✅ | All | Format: "Name, Email, Mobile" |
| `sellingAgentName` | ❌ | ❌ | ❌ | All | Internal only, combined on submit |
| `sellingAgentEmail` | ❌ | ❌ | ❌ | All | Internal only, combined on submit |
| `sellingAgentMobile` | ❌ | ❌ | ❌ | All | Internal only, combined on submit |
| `status` | ❌ | ✅ | ✅ | All | From Decision Tree |
| `dealType` | ❌ | ✅ | ✅ | All | From Decision Tree |
| `reviewDate` | ❌ | ✅ | ✅ | All | Auto-generated |

---

### 2. DECISION TREE

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `propertyType` | ❌ | ✅ | ✅ | All | "New" or "Established" |
| `contractType` | ❌ | ✅ | ✅ | All | 01-05 contract types |
| `lotType` | ❌ | ✅ | ✅ | P | "Individual" or "Multiple" |
| `dualOccupancy` | ❌ | ✅ | ✅ | H&L | "Yes", "No", "Mixed", "TBC" |
| `status` | ❌ | ✅ | ✅ | All | 01-06 status codes |

---

### 3. ADDRESS & LOCATION

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `propertyAddress` | ✅ | ✅ | ✅ | All | Main address (Google Maps link) |
| `projectAddress` | ✅ | ✅ | ✅ | P | Address shown in email for Projects |
| `projectName` | ✅ | ✅ | ✅ | P | Project name (non-mandatory) |
| `streetNumber` | ❌ | ✅ | ✅ | All | Component for validation |
| `streetName` | ❌ | ✅ | ✅ | All | Component for validation |
| `suburbName` | ✅ | ✅ | ✅ | All | Used in email + lookup |
| `state` | ✅ | ✅ | ✅ | All | Used in email + lookup |
| `postCode` | ✅ | ✅ | ✅ | All | Used in email + lookup |
| `lga` | ❌ | ✅ | ✅ | All | For Investment Highlights lookup |
| `googleMap` | ✅ | ✅ | ❌ | All | **Email only** - link in template |
| `latitude` | ❌ | ✅ | ❌ | All | Internal use only |
| `longitude` | ❌ | ✅ | ❌ | All | Internal use only |
| `unitLotPrimary` | ❌ | ✅ | ✅ | H&L/E | Unit/Lot for primary dwelling |
| `unitLotSecondary` | ❌ | ✅ | ✅ | H&L | Unit/Lot for secondary dwelling |
| `lotNumber` | ❌ | ✅ | ✅ | P/H&L | Lot number for new developments |

---

### 4. RISK OVERLAYS

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `zoning` | ✅ | ✅ | ✅ | All | Zone code + description |
| `flood` | ✅ | ✅ | ✅ | All | "Yes" or "No" |
| `floodDialogue` | ✅ | ✅ | ✅ | All | **Email** - appears after "Yes - " |
| `bushfire` | ✅ | ✅ | ✅ | All | "Yes" or "No" |
| `bushfireDialogue` | ✅ | ✅ | ✅ | All | **Email** - appears after "Yes - " |
| `mining` | ✅ | ✅ | ✅ | All | "Yes" or "No" |
| `miningDialogue` | ✅ | ✅ | ✅ | All | **Email** - appears after "Yes - " |
| `otherOverlay` | ✅ | ✅ | ✅ | All | "Yes" or "No" |
| `otherOverlayDialogue` | ✅ | ✅ | ✅ | All | **Email** - appears after "Yes - " |
| `specialInfrastructure` | ✅ | ✅ | ✅ | All | "Yes" or "No" |
| `specialInfrastructureDialogue` | ✅ | ✅ | ✅ | All | **Email** - appears after "Yes - " |
| `dueDiligenceAcceptance` | ❌ | ✅ | ✅ | All | Validation only - blocks submission if "No" |

---

### 5. PROPERTY DESCRIPTION

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `bedsPrimary` | ✅ | ✅ | ✅ | All | Primary dwelling bedrooms |
| `bedsSecondary` | ✅ | ✅ | ✅ | H&L | Secondary dwelling bedrooms |
| `bathPrimary` | ✅ | ✅ | ✅ | All | Primary dwelling bathrooms |
| `bathSecondary` | ✅ | ✅ | ✅ | H&L | Secondary dwelling bathrooms |
| `garagePrimary` | ✅ | ✅ | ✅ | All | Primary dwelling garages |
| `garageSecondary` | ✅ | ✅ | ✅ | H&L | Secondary dwelling garages |
| `carspacePrimary` | ✅ | ✅ | ✅ | All | Primary dwelling car spaces |
| `carspaceSecondary` | ✅ | ✅ | ✅ | H&L | Secondary dwelling car spaces |
| `carportPrimary` | ✅ | ✅ | ✅ | All | Primary dwelling carports |
| `carportSecondary` | ✅ | ✅ | ✅ | H&L | Secondary dwelling carports |
| `yearBuilt` | ✅ | ✅ | ✅ | E | Year built (Established only) |
| `landRegistration` | ✅ | ✅ | ✅ | H&L/P | "Registered" OR "Month Year approx." OR "TBC" |
| `landSize` | ✅ | ✅ | ✅ | All | Land size in sqm |
| `buildSize` | ✅ | ✅ | ✅ | H&L | Single occupancy build size |
| `buildSizePrimary` | ✅ | ✅ | ✅ | H&L | Dual occupancy primary build size |
| `buildSizeSecondary` | ✅ | ✅ | ✅ | H&L | Dual occupancy secondary build size |
| `title` | ✅ | ✅ | ✅ | All | Title type (Individual, Strata, etc.) |
| `bodyCorpPerQuarter` | ✅ | ✅ | ✅ | Strata/Owners Corp | Conditional - only if Title contains "strata" or "owners corp" |
| `bodyCorpDescription` | ✅ | ✅ | ✅ | Strata/Owners Corp | **Email** - "Text will appear exactly as typed" |
| `doesThisPropertyHave2Dwellings` | ❌ | ✅ | ✅ | H&L | Internal validation |
| `propertyDescriptionAdditionalDialogue` | ✅ | ❌ | ❌ | All | **Email only** - "Text will appear exactly as typed" |
| `projectOverview` | ✅ | ✅ | ✅ | P | Project overview (shared across all lots) |

---

### 6. PURCHASE PRICE

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `asking` | ✅ | ✅ | ✅ | All | "On-market", "Off-market", "Pre-launch", etc. |
| `askingText` | ✅ | ✅ | ✅ | All | Additional asking price text |
| `comparableSales` | ✅ | ✅ | ✅ | All | **Email** - "Text will appear exactly as typed" |
| `acceptableAcquisitionFrom` | ❌ | ✅ | ✅ | All | Acceptable acquisition price range (from) |
| `acceptableAcquisitionTo` | ❌ | ✅ | ✅ | All | Acceptable acquisition price range (to) |
| `landPrice` | ✅ | ✅ | ✅ | H&L | Land price (not Single Contract) |
| `buildPrice` | ✅ | ✅ | ✅ | H&L | Build price (not Single Contract) |
| `totalPrice` | ✅ | ✅ | ✅ | H&L | Total price (Single Contract only) |
| `cashbackRebateValue` | ✅ | ✅ | ✅ | 01/02/03 | Cashback/Rebate value |
| `cashbackRebateType` | ✅ | ✅ | ✅ | 01/02/03 | "Cashback", "Rebate on Land", "Rebate on Build" |
| `purchasePriceAdditionalDialogue` | ✅ | ❌ | ❌ | All | **Email only** - "Text will appear exactly as typed" |

---

### 7. RENTAL ASSESSMENT

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `occupancy` | ✅ | ✅ | ✅ | All | "Owner Occupied", "Tenanted", "Vacant" |
| `currentRentPrimary` | ✅ | ✅ | ✅ | All | Current rent for primary dwelling |
| `currentRentSecondary` | ✅ | ✅ | ✅ | H&L | Current rent for secondary dwelling |
| `expiryPrimary` | ✅ | ✅ | ✅ | All | Lease expiry for primary dwelling |
| `expirySecondary` | ✅ | ✅ | ✅ | H&L | Lease expiry for secondary dwelling |
| `rentAppraisalPrimaryFrom` | ✅ | ✅ | ✅ | All | Rent appraisal range (from) |
| `rentAppraisalPrimaryTo` | ✅ | ✅ | ✅ | All | Rent appraisal range (to) |
| `rentAppraisalSecondaryFrom` | ✅ | ✅ | ✅ | H&L | Secondary rent appraisal range (from) |
| `rentAppraisalSecondaryTo` | ✅ | ✅ | ✅ | H&L | Secondary rent appraisal range (to) |
| `yield` | ✅ | ✅ | ✅ | All | Calculated yield |
| `appraisedYield` | ✅ | ✅ | ✅ | All | Appraised yield |
| `rentDialoguePrimary` | ✅ | ✅ | ✅ | All | Additional rent dialogue for primary |
| `rentDialogueSecondary` | ✅ | ✅ | ✅ | H&L | Additional rent dialogue for secondary |
| `rentalAssessmentAdditionalDialogue` | ✅ | ❌ | ❌ | All | **Email only** - "Text will appear exactly as typed" |

---

### 8. MARKET PERFORMANCE

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `medianPriceChange3Months` | ✅ | ✅ | ✅ | All | From Real Estate Investar |
| `medianPriceChange1Year` | ✅ | ✅ | ✅ | All | From Real Estate Investar |
| `medianPriceChange3Year` | ✅ | ✅ | ✅ | All | From Smart Property Investment |
| `medianPriceChange5Year` | ✅ | ✅ | ✅ | All | From Smart Property Investment |
| `medianYield` | ✅ | ✅ | ✅ | All | From Real Estate Investar |
| `medianRentChange1Year` | ✅ | ✅ | ✅ | All | From Real Estate Investar |
| `rentalPopulation` | ✅ | ✅ | ✅ | All | From Real Estate Investar |
| `vacancyRate` | ✅ | ✅ | ✅ | All | From Real Estate Investar |
| `marketPerformanceAdditionalDialogue` | ✅ | ❌ | ❌ | All | **Email only** - "Text will appear exactly as typed" |
| `isSaved` | ❌ | ❌ | ❌ | All | Internal validation flag |
| `isVerified` | ❌ | ❌ | ❌ | All | Internal verification flag |
| `daysSinceLastCheck` | ❌ | ✅ | ❌ | All | Data age tracking (Deal Sheet only) |

---

### 9. CONTENT SECTIONS

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `whyThisProperty` | ✅ | ✅ | ✅ | All | **Email** - "Why this Property?" |
| `proximity` | ✅ | ✅ | ✅ | All | **Email** - Proximity information |
| `investmentHighlights` | ✅ | ✅ | ✅ | All | **Email** - Investment highlights |

---

### 10. PROJECT-SPECIFIC (Multiple Lots)

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `lots[].lotNumber` | ✅ | ✅ | ✅ | P | Lot number |
| `lots[].singleOrDual` | ✅ | ✅ | ✅ | P | "Yes" (Dual) or "No" (Single) |
| `lots[].propertyDescription` | ✅ | ✅ | ✅ | P | Per-lot property description |
| `lots[].purchasePrice` | ✅ | ✅ | ✅ | P | Per-lot purchase price |
| `lots[].rentalAssessment` | ✅ | ✅ | ✅ | P | Per-lot rental assessment |
| `projectBrief` | ✅ | ✅ | ✅ | P | **Email** - "Text will appear exactly as typed" |

---

### 11. AGENT INFORMATION

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `agentName` | ✅ | ✅ | ✅ | All | Agent name |
| `agentMobile` | ✅ | ✅ | ✅ | All | Agent mobile |
| `agentEmail` | ✅ | ✅ | ✅ | All | Agent email |

---

### 12. INTERNAL/ADMINISTRATIVE

| Field Name | Email | Deal Sheet | GHL | Property Type | Notes |
|------------|-------|------------|-----|---------------|-------|
| `attachmentsAdditionalDialogue` | ❌ | ✅ | ❌ | All | Internal notes only |
| `messageForBA` | ❌ | ✅ | ❌ | All | Internal message for BA |
| `pushRecordToDealSheet` | ❌ | ✅ | ❌ | All | Flag to push to Deal Sheet |

---

## Summary Statistics

### By Destination

- **Email Only:** 5 fields (all "Additional Dialogue" fields)
- **Deal Sheet Only:** 3 fields (internal/admin flags)
- **GHL Only:** 0 fields (all GHL fields also go to Deal Sheet)
- **Both Email & Deal Sheet:** ~80+ fields
- **All Three (Email, Deal Sheet, GHL):** ~75+ fields

### By Property Type

- **All Types:** ~60 fields
- **Projects Only:** ~10 fields
- **H&L Only:** ~15 fields
- **Established Only:** ~5 fields

---

## Fields Needing GHL Custom Object Creation

### 🔴 HIGH PRIORITY (Already Identified)

1. `selling_agent` - Combined field (Name, Email, Mobile)
2. `sourcer` - Dropdown (exists in GHL, needs UI)
3. `packager` - ✅ IMPLEMENTED (auto-populated from email)

### 🟡 MEDIUM PRIORITY

4. `price_group` - To be discussed (auto-generation?)
5. `rent_appraisal_primary_from` - Split field
6. `rent_appraisal_primary_to` - Split field
7. `rent_appraisal_secondary_from` - Split field
8. `rent_appraisal_secondary_to` - Split field
9. `build_size` - Build size in sqm
10. `land_registration` - Land registration status
11. `cashbackRebateValue` - Cashback/Rebate value
12. `cashbackRebateType` - Cashback/Rebate type

### 🟢 LOW PRIORITY

13. `project_name` - Project name (for Projects)
14. `project_commencement_scheduled_for` - Project commencement date
15. `acceptableAcquisitionFrom` - Acceptable acquisition from
16. `acceptableAcquisitionTo` - Acceptable acquisition to

---

## Email Template Fields (Exact Text)

These fields appear **exactly as typed** in the email template:

1. `propertyDescriptionAdditionalDialogue`
2. `purchasePriceAdditionalDialogue`
3. `rentalAssessmentAdditionalDialogue`
4. `marketPerformanceAdditionalDialogue`
5. `comparableSales` (or `comparableSales` for Projects)
6. `bodyCorpDescription`
7. `projectBrief` (Projects only)
8. `whyThisProperty`
9. `proximity`
10. `investmentHighlights`

---

## Notes

1. **Google Maps Link:** `googleMap` field is used in email template but stored in Deal Sheet for reference.

2. **Market Performance Data:** Stored in separate Google Sheet tab ("Market Performance") and referenced by suburb/state lookup.

3. **Lots Array:** For Projects with multiple lots, each lot has its own `propertyDescription`, `purchasePrice`, and `rentalAssessment` nested within the `lots[]` array.

4. **Conditional Fields:**
   - `bodyCorpPerQuarter` and `bodyCorpDescription` only show if `title` contains "strata" or "owners corp"
   - `buildSize` vs `buildSizePrimary/Secondary` depends on dual occupancy
   - `landPrice`/`buildPrice` vs `totalPrice` depends on contract type

5. **Field Combinations:**
   - `sellingAgent` is combined from `sellingAgentName`, `sellingAgentEmail`, `sellingAgentMobile` on submit
   - `packager` stores only username part (before @) in Deal Sheet/GHL

---

## Next Steps

1. ✅ Review this matrix with team
2. ⚠️ Verify GHL custom object field mappings
3. ⚠️ Create missing GHL fields (prioritized list above)
4. ⚠️ Document email template field usage
5. ⚠️ Test field mappings with actual property data


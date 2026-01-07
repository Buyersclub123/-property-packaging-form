# Property Packaging Form - Handover Document

**Date:** 2026-01-06  
**Status:** In Progress - Cashflow Sheets Conversion & GHL Integration Prep

---

## 🎯 Current Focus

### Today: Cashflow Spreadsheet Conversion
- Converting Excel cashflow templates to Google Sheets format
- Fixing broken graphs/charts in Google Sheets
- Creating master templates for client copying

### Tomorrow: GHL Integration
- Field mapping verification
- GHL custom object field creation
- Webhook integration setup

---

## 📋 Project Overview

**Purpose:** Multi-step property packaging form that collects property data and integrates with:
- Google Sheets (Deal Sheet)
- GHL (GoHighLevel) Custom Objects
- Email Templates

**Form Steps:**
1. Address & Risk Assessment
2. Property Details
3. Market Performance
4. Proximity & Content
5. Review & Submit

---

## ✅ What's Complete

### Form Functionality
- ✅ Multi-step form with validation
- ✅ Google Sheets integration (Market Performance lookup/save)
- ✅ Address validation via Geoscape/Stash API
- ✅ Risk overlay data from Stash
- ✅ Market Performance data collection (SPI & REI)
- ✅ Excel export for auditing
- ✅ Form state persistence (Zustand)
- ✅ User email authentication

### Field Management
- ✅ Sourcer dropdown (hardcoded list, ready for GHL API)
- ✅ Selling Agent fields (Name, Email, Mobile → combined on submit)
- ✅ Packager auto-population (from user email, username only in export)
- ✅ Project Name field (non-mandatory)
- ✅ All property type variations (Project, H&L, Established)

### Data Collection
- ✅ Market Performance data lookup from Google Sheet
- ✅ Data age tracking and verification workflow
- ✅ Stale data handling (10+ days)
- ✅ Logging when proceeding with old data (>30 days)

---

## 📁 Key Files Created

### Analysis & Mapping
- **`FIELD-MAPPING-MATRIX-FINAL.xlsx`** - Complete field mapping (151 fields)
- **`GHL-FIELD-MAPPING.xlsx`** - GHL integration field mapping (142 exportable fields)
- **`FIELD-MAPPING-MATRIX.md`** - Markdown version of field matrix
- **`NEW-FIELDS-FOR-GHL.md`** - Prioritized list of fields needing GHL creation

### Location
All analysis files: `C:\Users\User\.cursor\JT FOLDER\`

### Cashflow Templates (To Convert)
- **`CF HL spreadsheet template v2.0.xlsx`** - House & Land cashflow template
- **`CF spreadsheet template v3.0 Dev.xlsx`** - General cashflow template

---

## 🔑 Key Decisions Made

### Field Mapping
- **Internal fields excluded:** `addressFieldsEditable`, `addressVerified`, `isSaved`, `isVerified`, `daysSinceLastCheck`
- **Email-only fields:** Additional Dialogue fields, `googleMap`, `comparableSales`
- **GHL field naming:** camelCase → snake_case conversion (e.g., `propertyAddress` → `property_address`)

### Market Performance
- Data freshness threshold: 10 days (was 30, changed to 10)
- Always show data age and "Check data" option
- Red background for data 30+ days old
- Verification required after clicking "Check data"

### Cashflow Spreadsheets
- **Decision:** Use Google Sheets (not Excel attachments)
- **Reason:** 
  - Documents already in Google Drive folders
  - No storage/upload overhead
  - Easier to update (change link, no re-upload)
  - Can link to folders or files
  - Less infrastructure to manage
- **Method:** Master template → Copy URL for clients
- **Copy URL Format:** `https://docs.google.com/spreadsheets/d/[SHEET_ID]/copy`
- **Workflow:** 
  - Create master template in Google Sheets (in property folder)
  - Each client gets their own editable copy via copy URL
  - Client clicks copy URL → Gets their own editable copy automatically
  - No sharing needed - each client has their own copy
- **Issue:** Graphs break when converting Excel → Google Sheets
  - Excel charts use different syntax/formulas
  - Google Sheets charts need different setup
  - Data ranges/references may need adjustment
- **Solution:** Recreate charts using Google Sheets chart syntax
- **Next:** Convert Excel templates to Google Sheets, fix graphs

### Attachments/Documents
- **Decision:** Use links (not file uploads)
- **Reason:** Documents already in Google Drive folders
- **Implementation:** Store Google Drive folder/file links in form data

---

## 🚧 In Progress

### Cashflow Spreadsheet Conversion
**Status:** Form Integration Complete - Ready for Template Conversion  
**Files:** 
- `CF HL spreadsheet template v2.0.xlsx`
- `CF spreadsheet template v3.0 Dev.xlsx`

**Completed:**
- ✅ Added cashflow link fields to form (`cashflowSheetLinkHL`, `cashflowSheetLinkGeneral`)
- ✅ Created `CashflowLinksSection` component with URL validation
- ✅ Integrated into Step 5 (Proximity & Content)
- ✅ Conditional display based on contract type (H&L vs General)
- ✅ Excel export includes cashflow links
- ✅ Copy URL format validation and test link functionality

**Remaining Tasks:**
1. Analyze Excel structure and charts
2. Recreate in Google Sheets format
3. Fix/recreate graphs (Excel charts → Google Sheets charts)
4. Create master templates in Google Sheets
5. Get copy URLs from master templates
6. Test client copy functionality

**Context:**
- Currently using Excel attachments for cashflow spreadsheets
- Want to move to Google Sheets for easier management
- Each client needs their own editable copy (cannot be shared)
- Copy URL method allows clients to create their own copy with one click
- Master templates will be stored in property Google Drive folder
- When deal sent to client, they get copy URL to create their own editable version
- Form now has fields to store copy URLs - ready for template conversion

**Notes:**
- Graphs break when converting Excel → Google Sheets
- Need to recreate charts using Google Sheets chart syntax
- Excel charts don't translate directly - need manual recreation
- Master templates will be copied per client via copy URL
- Form component validates copy URL format: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/copy`

---

## 📅 Tomorrow's Tasks

### GHL Integration Setup

#### 1. Field Mapping Verification
- [ ] Export current GHL custom object field list
- [ ] Cross-reference with `GHL-FIELD-MAPPING.xlsx`
- [ ] Identify existing fields vs. new fields needed
- [ ] Adjust field names if GHL uses different conventions

#### 2. GHL Custom Object Field Creation
**High Priority:**
- [ ] `sourcer` - Verify exists, add UI if needed
- [ ] `selling_agent` - Create combined field
- [ ] `packager` - ✅ Already implemented

**Medium Priority:**
- [ ] `rent_appraisal_primary_from/to` - Split fields
- [ ] `rent_appraisal_secondary_from/to` - Split fields
- [ ] `build_size` - Build size in sqm
- [ ] `land_registration` - Land registration status
- [ ] `cashback_rebate_value/type` - Verify mapping to existing fields
- [ ] `acceptable_acquisition_from/to` - Price range fields

**Low Priority:**
- [ ] `project_name` - For projects
- [ ] `project_commencement_scheduled_for` - Later

#### 3. Webhook Integration
- [ ] Map form data to GHL custom object fields
- [ ] Handle field name conversion (camelCase → snake_case)
- [ ] Handle array fields (`lots[]`) - may need special handling
- [ ] Test with sample property data
- [ ] Verify all fields map correctly

#### 4. Google Sheets Integration
- [ ] Verify Deal Sheet field mappings
- [ ] Test form submission → Deal Sheet update
- [ ] Handle field name differences between form and sheet

---

## 🔧 Technical Details

### Form Data Structure
**Main Sections:**
- `decisionTree` - Property type, contract type, lot type, status
- `address` - Property address, project address, location data
- `riskOverlays` - Zoning, flood, bushfire, mining, etc.
- `propertyDescription` - Beds, baths, land size, build size, etc.
- `purchasePrice` - Asking, comparable sales, land/build price, cashback
- `rentalAssessment` - Occupancy, rent appraisals, yield
- `marketPerformance` - Median price changes, yield, vacancy rate
- `contentSections` - Why this property, proximity, investment highlights
- `agentInfo` - Agent name, mobile, email
- `lots[]` - Array for Projects (multiple lots)

### Field Export Rules
- **Email:** 124 fields (includes "exact text" fields)
- **Deal Sheet:** 142 fields (excludes email-only fields)
- **GHL:** 138 fields (excludes email-only and internal fields)

### Field Naming Conventions
- **Form:** camelCase (e.g., `propertyAddress`)
- **GHL:** snake_case (e.g., `property_address`)
- **Google Sheets:** Mixed (varies by column)

### Special Fields
- **`packager`:** Stores username only (before @) in Deal Sheet/GHL
- **`sellingAgent`:** Combined from Name, Email, Mobile on submit
- **`googleMap`:** Email only - Google Maps link
- **Additional Dialogue fields:** Email only - "Text will appear exactly as typed"

---

## 📊 Field Statistics

### By Destination
- **Email Only:** 5 fields
- **Deal Sheet Only:** 3 fields (internal/admin)
- **Both Email & Deal Sheet:** ~80+ fields
- **All Three (Email, Deal Sheet, GHL):** ~75+ fields

### By Property Type
- **All Types:** ~60 fields
- **Projects Only:** ~10 fields
- **H&L Only:** ~15 fields
- **Established Only:** ~5 fields

---

## 🎯 Production Features (For Show & Tell)

### Address Validation
- ✅ Stash API integration for address validation
- ✅ Geoscape API for address correction
- ✅ Auto-populates individual address fields (streetNumber, streetName, suburbName, state, postCode)
- ✅ Google Maps link generation
- ✅ Risk overlay auto-population from Stash

### Market Performance
- ✅ Google Sheets integration for data storage
- ✅ SPI (Smart Property Investment) data entry
- ✅ REI (Real Estate Investar) data entry
- ✅ Data freshness tracking (10-day threshold)
- ✅ Mock data fallback

### Form Steps
- ✅ Step 0: Address & Risk Overlays
- ✅ Step 1: Decision Tree
- ✅ Step 2: Property Details (supports multiple lots)
- ✅ Step 3: Market Performance
- ✅ Step 4: Comparable Sales
- ✅ Step 5: Proximity
- ✅ Step 6: Investment Highlights
- ✅ Step 7: Review & Submit

### Excel Export
- ✅ Full form data export
- ✅ Separate sheets for different sections
- ✅ Overview sheet with key fields

### Deployment
- ✅ Deployed to Vercel
- ✅ Environment variables configured
- ✅ Google Sheets API access working

---

## 🐛 Known Issues / Questions

### Address Field Editing
- ⚠️ **Issue:** Individual address fields can be edited, but editing them doesn't update the main `propertyAddress` field
  - Impact: Confusing UX - user edits fields but main address stays unchanged
  - Decision needed: Should we auto-rebuild `propertyAddress` when individual fields are edited? Or remove edit capability?

### Market Performance
- Data age checking refreshes from Google Sheet on navigation
- Verification workflow: Click "Check data" → Verify → Can proceed

### Form Validation
- Step 4 (Market Performance) requires verification if "Check data" clicked
- Validation errors clear when navigating away from step

### Body Corp Fields
- Only show when Title contains "strata" or "owners corp"
- Conditional rendering based on `propertyDescription.title`

### Spell Check & Auto-Grow
- All "Additional Dialogue" fields have spell check and auto-grow
- Collapsed by default (non-mandatory fields)

### Planned Features Not Yet Implemented
1. **Cashflow Spreadsheet Links** - Currently manual entry, automation planned
2. **Google Drive Folder Creation** - Planned but not yet implemented
3. **GHL Integration** - Planned but not yet implemented

---

## 🔗 Important Links / References

### Files Location
- **Analysis Files:** `C:\Users\User\.cursor\JT FOLDER\`
- **Form Code:** `property-review-system/form-app/`
- **Field Mapping:** `property-review-system/form-app/FIELD-MAPPING-MATRIX.md`

### Key Code Files
- **Form Store:** `src/store/formStore.ts`
- **Form Types:** `src/types/form.ts`
- **Excel Export:** `src/lib/excelExport.ts`
- **Market Performance:** `src/components/steps/Step3MarketPerformance.tsx`
- **Property Details:** `src/components/steps/Step2PropertyDetails.tsx`

### API Routes
- `/api/market-performance/lookup` - Lookup market performance data
- `/api/market-performance/save` - Save market performance data
- `/api/market-performance/update-timestamp` - Update data timestamp
- `/api/market-performance/log-proceeded` - Log proceeding with old data

---

## 🎯 Next Steps Summary

### Immediate (Today)
1. Analyze Excel cashflow templates
2. Convert to Google Sheets format
3. Fix/recreate graphs
4. Create master templates
5. Set up copy URL workflow

### Short Term (Tomorrow)
1. Verify GHL field mappings
2. Create missing GHL custom object fields
3. Set up webhook integration
4. Test end-to-end flow

### Medium Term
1. GHL API integration for Sourcer dropdown
2. Automated cashflow spreadsheet creation
3. Google Drive folder automation
4. Email template integration

---

## 💡 Product Decisions Needed

1. **Address Editing:** Should individual address fields be editable? If yes, should they auto-update `propertyAddress`?
2. **Folder Creation:** When should folders be created? (On "Continue with Packaging" click?)
3. **Cashflow Templates:** Should we auto-copy templates to folders or require manual upload?

---

## 💡 Important Context

### User Workflow
1. User enters email (validated @buyersclub.com.au)
2. Step 1: Enter address, check Stash, fill risk overlays
3. Click "Continue with Packaging" → Creates Google Drive folder
4. Fill Sourcer and Selling Agent fields
5. Step 2: Property Details (varies by property type)
6. Step 3: Market Performance (lookup or collect data)
7. Step 4: Proximity & Content
8. Step 5: Submit → Excel export + GHL integration

### Data Flow
- **Form → Google Sheets:** Market Performance data saved immediately
- **Form → GHL:** On final submit (webhook)
- **Form → Email:** Template fields populated from form data
- **Form → Excel:** Export for auditing/testing

### Property Type Variations
- **Project:** Multiple lots, shared project overview, project address
- **H&L:** Single or dual occupancy, land/build price split
- **Established:** Year built, existing property details

---

## 📝 Notes for Show & Tell

- Form is fully functional and deployed to Vercel
- Address validation works but has UX issue with field editing (see Known Issues)
- Market Performance data saves to Google Sheets successfully
- Excel export includes all form data
- Multi-lot support working for Projects
- All form steps functional and validated

---

## 📝 Notes for Tomorrow

### GHL Integration Checklist
- [ ] Review `GHL-FIELD-MAPPING.xlsx` sheet "Fields Needing GHL Creation"
- [ ] Export current GHL custom object structure
- [ ] Map form fields to GHL fields
- [ ] Create missing fields in GHL
- [ ] Test webhook with sample data
- [ ] Verify field name conversions work correctly

### Cashflow Spreadsheet Notes
- Excel charts don't translate directly to Google Sheets
- Need to recreate charts using Google Sheets chart syntax
- Master templates will be in property Google Drive folder
- Copy URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/copy`
- Each client gets their own editable copy

---

## ✅ Success Criteria

### Cashflow Spreadsheets
- [ ] Master templates created in Google Sheets
- [ ] All graphs/charts working in Google Sheets
- [ ] Copy URL workflow functional
- [ ] Clients can edit their copies independently

### GHL Integration
- [ ] All form fields map to GHL custom object
- [ ] Missing fields created in GHL
- [ ] Webhook integration working
- [ ] Data flows correctly from form → GHL

---

**Last Updated:** 2026-01-06  
**Next Review:** After cashflow conversion and GHL integration setup


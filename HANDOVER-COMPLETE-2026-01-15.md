# Property Review System - Complete Handover Document

**Date:** January 15, 2026  
**Purpose:** Comprehensive system handover for ongoing maintenance and development  
**Status:** Production system with active features and known issues

---

## Executive Summary

The Property Review System is a multi-component automation platform that manages the property packaging workflow from initial submission through client distribution. The system integrates:

1. **GoHighLevel (GHL)** - CRM and property record storage
2. **Make.com** - Workflow automation and email routing
3. **Next.js Form App** - Property packaging form (deployed on Vercel)
4. **GitHub Pages Portal** - BA client selection interface
5. **Google Sheets** - Deal tracking and data storage
6. **Google Drive** - Property folder management

---

## System Architecture

### High-Level Flow

```
1. Property Submitted (GHL or Form App)
   ↓
2. Make.com Webhook Triggered
   ↓
3. Email to Packager (Approval Required)
   ↓
4. Packager Approves → Email to BA
   ↓
5. BA Reviews in Portal → Selects Clients
   ↓
6. Emails Sent to Selected Clients
   ↓
7. Property Added to Deal Sheet (Google Sheets)
```

### Component Overview

#### 1. GoHighLevel (GHL)
- **Purpose:** Source of truth for all property data
- **Custom Object:** "Property Review" (Object ID: `692d04e3662599ed0c29edfa`)
- **API Version:** `2021-07-28`
- **Key Fields:** See `GHL-FIELDS-BREAKDOWN.md` for complete list

#### 2. Make.com Scenarios

**Scenario 1: "GHL Property Review Submitted" (DO NOT MODIFY)**
- **Status:** Production - Active
- **Webhook URL:** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- **Purpose:** Receives property submissions, routes emails, processes approvals
- **Key Modules:**
  - Module 1: Custom Webhook (trigger)
  - Module 13: Get Record (GHL API)
  - Module 6: Make Code (Preprocessor)
  - Module 3: Make Code (Email Template Builder)
  - Module 7: Make Code (HTML Extractor)
  - Router: 4 email paths (Packager, BA, Test, Clients)
- **⚠️ CRITICAL:** This scenario is production and must remain untouched

**Scenario 2: "02 Form App Property Submission"**
- **Status:** Active
- **Webhook URL:** `https://hook.eu1.make.com/2xbtucntvnp3wfmkjk0ecuxj4q4c500h`
- **Hook ID:** `2303330`
- **Purpose:** Receives form submissions from Next.js form app, creates GHL records
- **Key Modules:**
  - Module 1: Custom Webhook (trigger)
  - Router: Routes to Single Property (Module 21) or Project (Module 22)
  - Module 21: Make Code (Single property field mapping)
  - Module 22: Make Code (Project lot field mapping)
  - Module 14/12: HTTP - Create GHL Record
  - Module 15/23: HTTP - Get GHL Record (verify creation)
- **Used By:** Form app (`Step6FolderCreation.tsx` line 265)

**Scenario 3: "Property Review Approval Webhook"**
- **Status:** Active
- **Webhook URL:** `https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk`
- **Purpose:** Updates GHL record when packager approves/rejects

**Scenario 4: "Deal Sheet Creation - Property Review Approved"**
- **Status:** Active
- **Purpose:** Creates row in Deal Sheet when property approved
- **Modules:**
  - Module 1: Webhook (trigger)
  - Module 11: HTTP - Get GHL Record
  - Module 18: Make Code (Field mapping and formatting)
  - Module 20: Google Sheets - Search rows (duplicate check)
  - Module 21: Router (Found/Not Found)
  - Module 19: Google Sheets - Add Row (if not found)
  - Module 23: Tools - Get variable (no-op if found)
- **Sheet:** Deal List tab in Google Sheet `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`
- **Duplicate Prevention:** Searches by Property Address (Column G) before adding
- **Property Address Link:** Creates HYPERLINK formula pointing to portal with recordId and propertyAddress parameters

**Scenario 5: "Stash API Integration"**
- **Status:** Active
- **Purpose:** Calls Stash API for risk overlays and zoning data
- **Used By:** Form app for property validation

#### 3. Next.js Form App

**Location:** `property-review-system/form-app/`  
**Deployment:** Vercel  
**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- React Hook Form + Zod

**Features:**
- Multi-step property packaging form (Steps 0-7)
- Stash API integration (risk overlays, zoning)
- Google Sheets integration (Market Performance, Investment Highlights)
- ChatGPT integration (Why this property?, Proximity automation)
- Google Drive folder creation and sheet population
- Form state persistence
- GHL record creation/updates
- Test page for sheet population (`/test-sheets-population`)

**Key Routes:**
- `/` - Main form
- `/api/create-property-folder` - Folder creation and sheet population
- `/api/test-populate-sheets` - Test page API for sheet population
- `/test-sheets-population` - Test page UI for testing sheet population
- `/api/stash` - Stash API proxy
- `/api/chatgpt/property-summary` - ChatGPT integration

**Environment Variables:**
- `GOOGLE_SHEETS_API_KEY` - Google Sheets API key
- `GOOGLE_DRIVE_CLIENT_EMAIL` - Service account email
- `GOOGLE_DRIVE_PRIVATE_KEY` - Service account private key
- `OPENAI_API_KEY` - ChatGPT API key

#### 4. BA Portal

**Location:** `property-review-system/portal/`  
**Hosting:** GitHub Pages (`https://buyersclub123.github.io/property-portal`)  
**Purpose:** BA interface for reviewing properties and selecting clients

**Features:**
- Filter properties by BA (Follower) and Pipeline Stage
- Standard message editor (saved per BA)
- Personalized message per client
- Client selection with checkboxes
- Send to selected clients
- Non-Suitable - Send back to packager

**Data Source:** Google Sheet (`1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`, tab: "Opportunities")

#### 5. Google Sheets

**Deal Sheet:**
- **Sheet ID:** `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`
- **Tab:** `Deal List`
- **Columns:** 24 columns (A-X) including Type, Packager, Sourcer, Status, Property Address (with portal link), etc.
- **Purpose:** Track approved properties for BA review
- **Property Address Format:** HYPERLINK formula: `=HYPERLINK("https://buyersclub123.github.io/property-portal/?recordId={recordId}&propertyId={address}&propertyAddress={address}", "{address}")`

**Opportunities Sheet:**
- **Sheet ID:** `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`
- **Tab:** `Opportunities`
- **Purpose:** Portal data source

**Generic BA Messages:**
- **Sheet ID:** `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`
- **Tab:** `Generic BA messages`
- **Purpose:** Store BA standard messages

#### 6. Google Drive

**Master Template Folder:**
- **Folder ID:** `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5`
- **Purpose:** Template for property folders

**Properties Folder:**
- **Folder ID:** `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ`
- **Purpose:** Root folder for all property folders

**Shared Drive ID:** `0AFVxBPJiTmjPUk9PVA`

**Sheet Population:**
- **Tab:** "Autofill data" (in all Google Sheets in property folders)
- **Method:** Reads Column A (field names), writes to Column B (values)
- **CSV Mapping:** See `Autopopulate GoogleSheet values v2.csv` in JT FOLDER
- **Special Logic:** Dual occupancy sums, state format conversion, cashback/rebate conditionals

---

## Configuration & Credentials

### GHL API
- **Bearer Token:** `pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- **API Version:** `2021-07-28`
- **Base URL:** `https://services.leadconnectorhq.com`
- **Object ID:** `692d04e3662599ed0c29edfa`

### Make.com Webhooks
- **Scenario 1 (Production - GHL):** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- **Scenario 2 (Form App):** `https://hook.eu1.make.com/2xbtucntvnp3wfmkjk0ecuxj4q4c500h`
- **Portal/Other:** `https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl`
- **Approval Webhook:** `https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk`
- **Deal Sheet Webhook:** (See Make.com scenario for URL)

### Google Services
- **Deal Sheet:** `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`
- **Opportunities Sheet:** `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`
- **Master Template:** `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5`
- **Properties Folder:** `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ`
- **Shared Drive:** `0AFVxBPJiTmjPUk9PVA`

### Email Addresses
- **Packager (Testing):** `john.t@buyersclub.com.au`
- **BA Group:** `property@buyersclub.com.au`
- **Portal:** `https://buyersclub123.github.io/property-portal`

**Note:** See `CONFIG.md` for complete configuration reference.

---

## Key Features & Functionality

### 1. Property Submission Flow

**From GHL:**
1. Property Review created/updated in GHL
2. GHL workflow triggers Make.com webhook
3. Make.com processes and routes emails

**From Form App:**
1. User fills out multi-step form
2. Form creates GHL record via Make.com webhook
3. Form creates Google Drive folder with populated sheets
4. Make.com processes as above

### 2. Email Routing (Make.com)

**Path 1: Packager Email**
- Trigger: `packager_approved != "Approved"`
- Recipient: Packager email from GHL
- Action: Approve / Needs Editing buttons

**Path 2: BA Email**
- Trigger: `packager_approved == "Approved" AND ba_approved != "Approved"`
- Recipient: `property@buyersclub.com.au`
- Action: Review in portal

**Path 3: Test Path**
- Trigger: Both approved (testing only)

**Path 4: Client Emails**
- Trigger: Portal selection
- Recipient: Selected clients
- From: BA's Gmail (Send mail as)

### 3. Deal Sheet Integration

**When Property Approved:**
1. Make.com scenario triggered
2. Gets full GHL record
3. Formats fields (Module 18 code)
4. Creates portal link in Property Address (HYPERLINK formula)
5. Searches Deal Sheet for duplicate
6. Adds row if not found (prevents duplicates)

**Module 18 Key Features:**
- Maps all 24 Deal Sheet fields from GHL record
- Formats currency values
- Joins multiple fields (e.g., asking + asking_text)
- Handles dual occupancy CONFIG (beds/baths/garages)
- Creates HYPERLINK formula for Property Address
- Handles "1point5" conversion (replaces "point" with ".")

**Property Address Link Format:**
```
=HYPERLINK("https://buyersclub123.github.io/property-portal/?recordId={recordId}&propertyId={encodedAddress}&propertyAddress={encodedAddress}", "{propertyAddress}")
```

### 4. Google Drive Folder Creation

**Trigger:** Form submission (Step 6)
**Process:**
1. Copies master template folder
2. Renames to property address
3. Finds all Google Sheets in folder
4. Populates "Autofill data" tab with form data
5. Maps form fields to sheet cells (see CSV mapping)

**Sheet Population Logic:**
- **Tab:** "Autofill data"
- **Method:** Reads column A for field names, writes to column B
- **CSV Mapping:** See `Autopopulate GoogleSheet values v2.csv`
- **Special Logic:**
  - Dual occupancy: Sums primary + secondary beds/baths/garages
  - State: Converts to uppercase 3-letter (VIC, NSW, QLD, etc.) - **critical for formulas**
  - Cashback/Rebate: Conditional logic based on type
  - Insurance & Strata: Includes body corp if applicable
  - Rent totals: Sums primary + secondary rent ranges for dual occupancy
  - Depreciation: Maps from year1-year10 fields

**Test Page:**
- **URL:** `/test-sheets-population`
- **Purpose:** Test sheet population without full form submission
- **Features:** Manual input of folder IDs, folder name, and form data JSON
- **Documentation:** See `docs/TEST-SHEETS-POPULATION-PAGE.md`

### 5. Form Features

**Multi-Step Workflow:**
- Step 0: Address & Risk Overlays (Stash integration)
- Step 1: Property Details
- Step 2: Purchase Price
- Step 3: Rental Assessment
- Step 4: Market Performance (Google Sheets lookup)
- Step 5: Content Sections (ChatGPT integration)
- Step 6: Folder Creation & Submission
- Step 7: Success confirmation

**State Management:**
- Zustand store (`formStore.ts`)
- Persists to localStorage
- Survives page refresh

**API Integrations:**
- Stash API: Risk overlays, zoning, LGA
- Google Sheets: Market performance data, investment highlights
- ChatGPT: Property summaries, proximity descriptions
- Google Drive: Folder creation, sheet population

**Address Field:**
- **Source:** `formData.address.propertyAddress`
- **Used for:** Folder names, Deal Sheet property address, portal links

---

## Known Issues & Limitations

### 1. Property Address Display
**Priority:** MEDIUM  
**Status:** Under investigation  
**Issue:** Property address not showing at top of form pages  
**Location:** `form-app/src/components/MultiStepForm.tsx:906-911`  
**Workaround:** Address stored in form data, just not displaying  
**Note:** Display logic exists but conditional doesn't render - `formData.address.propertyAddress` appears empty

### 2. Deal Sheet Duplicate Prevention
**Issue:** Uses Property Address (Column G) for duplicate check  
**Note:** Works correctly, but may need refinement if address formats vary

### 3. Sheet Population State Format
**Issue:** State values must match Google Sheets formula format (e.g., "VIC" not "Victoria")  
**Fix Applied:** State values converted to uppercase 3-letter format in `populateSpreadsheet()`  
**Location:** `form-app/src/lib/googleDrive.ts:populateSpreadsheet()`

### 4. Test Page
**Status:** ✅ Functional  
**Note:** Created for testing sheet population independently

### 5. BA Email "Send Mail As"
**Requirement:** BAs must set up "Send mail as" in Gmail  
**Documentation:** See `BA-SEND-MAIL-AS-SETUP-INSTRUCTIONS.md`  
**Status:** Setup required for each BA

### 6. Module 18 "1point5" Fix
**Issue:** Bed/bath values stored as "1point5" instead of "1.5"  
**Fix Applied:** Code replaces "point" with "." in CONFIG field  
**Location:** Module 18 code in Make.com scenario

---

## File Structure

```
property-review-system/
├── README.md                          # Project overview
├── CONFIG.md                          # Configuration reference
├── STATUS.md                          # Current status
├── HANDOVER-COMPLETE-2026-01-15.md   # This document
│
├── docs/                              # Documentation
│   ├── TEST-SHEETS-POPULATION-PAGE.md # Test page documentation
│   ├── DEAL-SHEET-SETUP-GUIDE.md     # Deal Sheet setup steps
│   ├── PRODUCTION-CUTOVER-CHECKLIST.md # Pre-launch checklist
│   ├── MAKECOM-SCENARIOS-AND-GHL-WEBHOOKS.md
│   └── ...
│
├── code/                              # Make.com JavaScript code
│   └── MODULE-3-COMPLETE-FOR-MAKE.js # Email template builder
│
├── form-app/                          # Next.js application
│   ├── src/
│   │   ├── app/                       # Next.js app router
│   │   │   ├── api/                   # API routes
│   │   │   │   ├── create-property-folder/
│   │   │   │   ├── test-populate-sheets/
│   │   │   │   ├── stash/
│   │   │   │   └── chatgpt/
│   │   │   ├── test-sheets-population/ # Test page
│   │   │   └── page.tsx               # Main form page
│   │   ├── components/                # React components
│   │   │   └── steps/                 # Form step components
│   │   ├── lib/                       # Utilities
│   │   │   ├── googleDrive.ts         # Drive API functions
│   │   │   ├── googleSheets.ts        # Sheets API functions
│   │   │   └── formStore.ts           # Zustand store
│   │   └── types/
│   │       └── form.ts                # TypeScript types
│   └── package.json
│
└── portal/                            # BA Portal
    └── index.html                     # Single-page application
```

---

## Maintenance Tasks

### Regular Tasks

1. **Monitor Make.com Scenarios**
   - Check error logs weekly
   - Review execution times
   - Verify webhook deliveries

2. **Google Sheets Maintenance**
   - Review Deal Sheet for duplicates
   - Clean up test data
   - Verify portal data sync

3. **Form App Updates**
   - Monitor Vercel deployments
   - Check error logs
   - Review user feedback

4. **GHL Field Updates**
   - Document new fields
   - Update field mappings in Make.com
   - Update form app types

### Troubleshooting

**Make.com 401 Errors:**
- Check GHL API token expiration
- Verify API version matches
- Confirm object ID is correct

**Deal Sheet Not Updating:**
- Check Make.com scenario execution
- Verify sheet ID and tab name
- Check duplicate prevention logic

**Form App Not Saving:**
- Check Zustand store persistence
- Verify localStorage is enabled
- Check browser console for errors

**Sheet Population Not Working:**
- Verify service account permissions
- Check sheet ID and tab names
- Review CSV mapping for field names
- Use test page (`/test-sheets-population`) to debug

**State Format Issues:**
- Ensure state is converted to uppercase 3-letter format
- Check `populateSpreadsheet()` function
- Verify Google Sheets formulas use correct state format

---

## Development Guidelines

### Make.com

**DO:**
- Test in draft mode first
- Use "Replay" to test with previous data
- Document all module changes
- Keep backup of working blueprints

**DON'T:**
- Modify production scenario without testing
- Delete orphaned modules without checking references
- Change webhook URLs without updating all references

### Form App

**DO:**
- Test locally before deploying
- Use TypeScript types consistently
- Follow existing code patterns
- Update documentation for new features
- Use test page for sheet population testing

**DON'T:**
- Commit environment variables
- Break existing form state persistence
- Modify GHL field mappings without testing
- Deploy without testing on Vercel preview
- Change state format handling without checking formulas

### Code Standards

- **TypeScript:** Strict mode enabled
- **Formatting:** Prettier (if configured)
- **Linting:** ESLint (if configured)
- **Git:** Feature branches, descriptive commits

---

## Deployment

### Form App (Vercel)

**Deployment:** Automatic on push to main branch  
**Preview:** Automatic for pull requests  
**Environment Variables:** Set in Vercel dashboard  
**Build Command:** `npm run build`  
**Output Directory:** `.next`

**Manual Deployment:**
```bash
cd form-app
npm run build
vercel --prod
```

### Portal (GitHub Pages)

**Deployment:** Push to `main` branch  
**Location:** `property-review-system/portal/index.html`  
**URL:** `https://buyersclub123.github.io/property-portal`

**Manual Update:**
1. Edit `portal/index.html`
2. Commit and push to main
3. GitHub Pages auto-deploys

---

## Testing

### Make.com Scenarios

**Test Method:**
1. Use "Run once" for manual testing
2. Use "Replay" to test with previous data
3. Check execution logs for errors
4. Verify output data matches expected format

### Form App

**Local Testing:**
```bash
cd form-app
npm run dev
# Open http://localhost:3000
```

**Test Page:**
- URL: `/test-sheets-population`
- Purpose: Test Google Sheets population without full form
- Use: Test field mappings and sheet operations
- See: `docs/TEST-SHEETS-POPULATION-PAGE.md` for full documentation

### Integration Testing

**End-to-End Test:**
1. Submit property via form app
2. Verify GHL record created
3. Check Make.com scenario executed
4. Verify packager email received
5. Approve property
6. Check BA email received
7. Use portal to select clients
8. Verify client emails sent
9. Check Deal Sheet updated
10. Verify folder created with populated sheets

---

## Support & Resources

### Documentation Files

**Key Documents:**
- `README.md` - Project overview
- `CONFIG.md` - Configuration reference
- `STATUS.md` - Current status
- `QUICK-START.md` - Quick reference for developers
- `HANDOVER-COMPLETE-2026-01-15.md` - This document
- `.cursor/Rules` - **CRITICAL:** Working rules and guidelines for AI assistants - must be followed
- `docs/TEST-SHEETS-POPULATION-PAGE.md` - Test page documentation
- `docs/DEAL-SHEET-SETUP-GUIDE.md` - Deal Sheet setup
- `docs/PRODUCTION-CUTOVER-CHECKLIST.md` - Pre-launch checklist

**Handover Documents:**
- `HANDOVER-2026-01-12.md` - Previous handover
- `HANDOVER-COMPLETE-2026-01-15.md` - This document

### Code References

**Make.com:**
- `code/MODULE-3-COMPLETE-FOR-MAKE.js` - Email template builder
- Module 18 code (in Make.com scenario) - Deal Sheet field mapping
- Make.com blueprints (JSON files in user's JT FOLDER)

**Form App:**
- `form-app/src/lib/googleDrive.ts` - Drive operations
- `form-app/src/lib/googleSheets.ts` - Sheets operations
- `form-app/src/store/formStore.ts` - State management
- `form-app/src/app/test-sheets-population/page.tsx` - Test page

### External Resources

- **GHL API Docs:** https://highlevel.stoplight.io/
- **Make.com Docs:** https://www.make.com/en/help
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs

---

## Recent Changes (January 15, 2026)

### Deal Sheet Integration
- ✅ Implemented Deal Sheet creation scenario in Make.com
- ✅ Added duplicate prevention (searches by Property Address)
- ✅ Created HYPERLINK formula for Property Address linking to portal
- ✅ Fixed "1point5" conversion in CONFIG field

### Google Drive Sheet Population
- ✅ Implemented "Autofill data" tab population
- ✅ Added dual occupancy logic (sums primary + secondary)
- ✅ Fixed state format conversion (uppercase 3-letter)
- ✅ Created test page (`/test-sheets-population`) for independent testing
- ✅ Implemented CSV-based field mapping

### Documentation
- ✅ Created test page documentation
- ✅ Created comprehensive handover document

---

## Future Enhancements

### Planned Features

1. **Property Editing**
   - Edit existing GHL records via form
   - Pre-populate form with GHL data
   - Update instead of create

2. **Enhanced Sheet Population**
   - Delete non-relevant sheets
   - Rename sheets based on property type
   - Auto-populate multiple tabs

3. **Improved Duplicate Prevention**
   - Multi-field matching (address + postcode)
   - Fuzzy matching for address variations
   - Merge duplicate records

4. **Reporting & Analytics**
   - Property submission statistics
   - Email delivery tracking
   - BA activity metrics

### Known Requirements

- See `TODO-LIST.md` for detailed task list
- See `PROJECT-COMPLETION-CHECKLIST.md` for phase completion status
- See `docs/PRODUCTION-CUTOVER-CHECKLIST.md` for pre-launch items

---

## Contact & Escalation

**For Issues:**
1. Check documentation first
2. Review recent handover documents
3. Check Make.com execution logs
4. Review form app error logs (Vercel)
5. Check browser console for portal issues
6. Use test page for sheet population debugging

**For GHL Issues:**
- Verify API credentials
- Check field existence in GHL
- Review GHL workflow configuration

**For Make.com Issues:**
- Review scenario execution logs
- Check webhook delivery status
- Verify module configurations

**For Sheet Population Issues:**
- Use test page to isolate problems
- Check CSV mapping file
- Verify "Autofill data" tab structure
- Check state format conversion

---

## Version History

**2026-01-15:**
- Added Deal Sheet duplicate prevention
- Implemented portal link in Property Address
- Fixed sheet population state format
- Added test page for sheet population
- Created comprehensive handover document
- Created test page documentation

**2026-01-12:**
- Fixed property/project address separation
- Implemented cashback/rebate type defaults
- Fixed folder name logic
- Updated bath value mapping

**2025-01-14:**
- Created Deal Sheet integration
- Implemented Google Drive folder creation
- Added sheet population functionality

---

**End of Handover Document**

*Last Updated: January 15, 2026*  
*For questions or updates, refer to project documentation or contact system administrator.*

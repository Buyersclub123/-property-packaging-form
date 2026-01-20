# Property Packaging Form - Requirements Document

## Overview
Replace the current property submission form with an intelligent, multi-step workflow that:
- Automates Stash risk overlay checks
- Integrates with Google Sheets for Market Performance data
- Preserves all existing form fields
- Adds workflow logic and data validation
- Supports resumable workflows

## Platform Decision

**DECISION: Standalone Web Application**

**Rationale:**
- **Stability & Scalability:** Standalone application provides better long-term stability and scalability
- **User Experience:** Good user interface is critical - not clunky, gives confidence to users
- **Development Time:** Time available to develop properly
- **Integration:** Will integrate with Make.com via webhooks/API for existing workflows (Stash API, custom objects)
- **Google Sheets:** Will use Google Sheets API (Service Account) for data storage

**Architecture:**
- **Frontend:** Standalone web application (React/Vue/Next.js or similar modern framework)
- **Backend:** API layer (Node.js/Python) or serverless functions
- **Integration Points:**
  - Make.com webhooks for Stash API calls and custom object updates
  - Google Sheets API for Market Performance, Investment Highlights, Location Reports, Property Log
  - ChatGPT API for automation (Why this property?, Proximity)
  - Google Drive API for folder/document management
- **Hosting:** Cloud-based (AWS, Google Cloud, Vercel, Netlify, etc.)
- **Database:** For form state management and workflow resumability (PostgreSQL, MongoDB, or similar)

**Benefits:**
- Full control over UI/UX design
- Better user experience (not constrained by Make.com form builder)
- Stable and scalable architecture
- Can integrate with all existing Make.com workflows
- Configurable form structure (can be stored in database/config file)
- Resumable workflows with proper state management

## Technical Implementation Planning

### Tech Stack Recommendations

**Frontend:**
- **Framework:** React with Next.js (or Vue.js with Nuxt.js)
  - Server-side rendering for better performance
  - Built-in routing and API routes
  - Good TypeScript support
- **UI Library:** Tailwind CSS + Headless UI or Material-UI
  - Modern, responsive design
  - Accessible components
  - Customizable styling
- **State Management:** Zustand or Redux Toolkit
  - Form state management
  - Workflow state persistence
  - API response caching
- **Form Handling:** React Hook Form + Zod validation
  - Dynamic form fields
  - Real-time validation
  - Easy integration with backend

**Backend:**
- **Runtime:** Node.js with Express or Python with FastAPI
- **API:** RESTful API or GraphQL
- **Database:** PostgreSQL (recommended) or MongoDB
  - Form state storage
  - Workflow resumability
  - User sessions
  - Configuration storage
- **Authentication:** NextAuth.js or Auth0
  - User authentication (if needed)
  - Session management

**Integration Services:**
- **Make.com:** Webhook endpoints for triggering scenarios
- **Google Sheets API:** Service Account for read/write access
- **Google Drive API:** For folder/document management
- **ChatGPT API:** For automation (Why this property?, Proximity)
- **Stash API:** Via Make.com webhook (or direct if available)

**Hosting & Infrastructure:**
- **Frontend:** Vercel, Netlify, or AWS Amplify
- **Backend:** AWS Lambda, Google Cloud Functions, or Vercel Serverless
- **Database:** AWS RDS (PostgreSQL), Google Cloud SQL, or Supabase
- **File Storage:** Google Drive (via API) or AWS S3

### Development Phases

**Phase 1: Foundation (Weeks 1-2)**
- Set up project structure (frontend + backend)
- Configure hosting and database
- Set up Google Service Account and API access
- Create basic form structure with dynamic field rendering
- Implement form state management and persistence

**Phase 2: Core Form Fields (Weeks 3-4)**
- Implement all form sections:
  - Property Address & Google Map
  - Property Description (with dynamic Primary/Secondary fields)
  - Property Overlays (with Stash API integration)
  - Purchase Price
  - Rental Assessment
  - Market Performance (with Google Sheets lookup)
  - Why this Property? & Proximity (with ChatGPT integration)
  - Investment Highlights (with Google Sheets lookup)
- Implement field visibility rules
- Implement validation rules

**Phase 3: Workflow Logic (Weeks 5-6)**
- Implement Step 0: Property Type Decision Tree
- Implement Step 1: Initial Property Entry (address parsing, geocoding)
- Implement Step 1.5: Suburb & LGA Confirmation
- Implement Step 2: Risk Assessment & Override
- Implement Step 2.5: Packaging Confirmation & ChatGPT Automation
- Implement Step 3-6: Data checks and form completion
- Implement Step 7: Form Submission & Email Generation

**Phase 4: Integrations (Weeks 7-8)**
- Make.com webhook integration
- Google Sheets API integration (read/write)
- Google Drive API integration (folder creation, document management)
- ChatGPT API integration
- Stash API integration (via Make.com or direct)

**Phase 5: Advanced Features (Weeks 9-10)**
- Project lot repeater boxes
- Live preview for Project Brief and Sales Assessment
- Cashflow spreadsheet auto-population
- Attachment review mechanism
- Error handling and retry logic

**Phase 6: Testing & Refinement (Weeks 11-12)**
- End-to-end testing
- User acceptance testing
- Bug fixes and refinements
- Performance optimization
- Documentation

### Key Technical Considerations

**Form Configuration:**
- Store form structure in database or JSON config file
- Allow non-code editing of:
  - Field definitions
  - Visibility rules
  - Validation rules
  - Default values
  - Field ordering

**Workflow Resumability:**
- Save form state to database at each step
- Generate unique workflow ID for each session
- Allow users to resume from any step
- Auto-save functionality

**Error Handling:**
- Graceful degradation if APIs fail
- Retry logic for transient failures
- User-friendly error messages
- Fallback to manual entry when automation fails

**Performance:**
- Lazy load form sections
- Cache Google Sheets data
- Optimize API calls (batch where possible)
- Implement loading states

**Security:**
- API key management (environment variables)
- Input sanitization
- CSRF protection
- Rate limiting

## Google Sheets Structure

### Sheet: "Property Review Static Data - Market Performance"
- **Tab: "Market Performance"** - Market performance data by suburb/state
- **Tab: "Investment Highlights"** - Investment highlights data by LGA/state (from Hotspotting Reports) - **CRITICAL: Uses LGA level, not suburb level**
- **Tab: "Location Reports"** - Hotspotting Reports repository by LGA/state (most recent versions)
- **Tab: "Config"** - Configuration settings (data freshness threshold, URLs, etc.)
- **Tab: "Property Log"** - Log of properties submitted/packaged (future)
- **Tab: "Error Log"** - Error tracking (future)
- **Tab: "Activity Log"** - User activity tracking (future)
- **Tab: "Market Performance History"** - Historical changes to market data (nice to have)

### Market Performance Tab Structure
| Column | Description | Notes |
|--------|-------------|-------|
| Suburb Name | Suburb name | Used for matching |
| State | State code (VIC, NSW, QLD, etc.) | Used for matching (must match exactly) |
| Data Source | Source of data | Values: "Mock Data", "smartpropertyinvestment.com.au", "info.realestateinvestar.com.au", or combination |
| Date Collected / Checked | Timestamp | Last update time |
| Date Collected - SPI | Timestamp | For smartpropertyinvestment.com.au data (3-year, 5-year) |
| Date Collected - REI | Timestamp | For info.realestateinvestar.com.au data (other metrics) |
| Median price change - 3 months | Percentage | 2 decimal places, numeric only |
| Median price change - 1 year | Percentage | 2 decimal places, numeric only |
| Median price change - 3 year | Percentage | 2 decimal places, numeric only |
| Median price change - 5 year | Percentage | 2 decimal places, numeric only |
| Median yield | Percentage | 2 decimal places, numeric only |
| Median rent change - 1 year | Percentage | 2 decimal places, numeric only |
| Rental Population | Percentage | 2 decimal places, numeric only |
| Vacancy Rate | Percentage | 2 decimal places, numeric only |

### Investment Highlights Tab Structure
| Column | Description | Notes |
|--------|-------------|-------|
| Suburb Name | Suburb name | Used for matching |
| LGA | Local Government Area | Used for matching (e.g., "Campaspe Shire") - **CRITICAL: Investment Highlights uses LGA level, not suburb level** |
| State | State code (VIC, NSW, QLD, etc.) | Used for matching |
| Data Source | Source of data | Values: "Hotspotting Report", "ChatGPT Infrastructure Details Tool", or combination |
| Date Collected / Checked | Timestamp | Last update time |
| Update Frequency | Update frequency | "Every 3 months" (Hotspotting Reports updated quarterly) |
| Investment Highlights Content | Text | Full investment highlights content from Hotspotting Report |
| Additional Information | Text | Additional information added manually (e.g., "$500m Hotel being built") - Preserved when new version issued |
| Last Report Version | Text | Version/date of Hotspotting Report used |
| Report URL | URL | Link to Hotspotting Report download (https://membership.hotspotting.com.au/hotspotting-reports) |

### Location Reports (Hotspotting Reports) Tab Structure
| Column | Description | Notes |
|--------|-------------|-------|
| LGA | Local Government Area | Used for matching (e.g., "Campaspe Shire") - **CRITICAL: Uses LGA level, not suburb level** |
| State | State code (VIC, NSW, QLD, etc.) | Used for matching |
| Report File | File/Link | Most recent Hotspotting Report file or link |
| Date Collected / Checked | Timestamp | Last update time |
| Update Frequency | Update frequency | "Every 3 months" (Hotspotting Reports updated quarterly) |
| Report Version | Text | Version/date of Hotspotting Report |
| Report URL | URL | Link to Hotspotting Report download (https://membership.hotspotting.com.au/hotspotting-reports) |
| Status | Text | Available / Not Available / Needs Update |

**Data Structure:**
Investment Highlights content is organized by categories:
- Population Growth Context
- Residential (major developments, estates)
- Industrial (facilities, operations)
- Commercial and Civic (community centers, upgrades)
- Health and Education (upgrades, new facilities)
- Transport (road upgrades, rail improvements, airports)
- Job Implications (Construction + Ongoing jobs)

**Additional Information Handling:**
- Separate field for manually added information (e.g., "$500m Hotel being built")
- This information is preserved when new Hotspotting Report version is issued
- System should merge base content + additional information when displaying

## Make.com Custom Object Fields

**Note:** These are the current custom object fields in Make.com for the "Property Review" object. Some fields may need to change, additions, or deletions as we refine the form structure.

### New Fields Required (Based on Today's Discussion)

**Fields that need to be CREATED in Make.com:**

1. **Rent Appraisal (Primary) From**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.rent_appraisal_primary_from }}`
   - **Field Type:** Text (numeric only)
   - **Purpose:** Split from single "Rent Appraisal (Primary)" field into From/To
   - **Validation:** Numeric only, no decimal places, no $ sign in field
   - **Visibility:** Always visible

2. **Rent Appraisal (Primary) To**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.rent_appraisal_primary_to }}`
   - **Field Type:** Text (numeric only)
   - **Purpose:** Split from single "Rent Appraisal (Primary)" field into From/To
   - **Validation:** Numeric only, no decimal places, no $ sign in field
   - **Visibility:** Always visible

3. **Rent Appraisal (Secondary) From**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.rent_appraisal_secondary_from }}`
   - **Field Type:** Text (numeric only)
   - **Purpose:** Split from single "Rent Appraisal (Secondary)" field into From/To
   - **Validation:** Numeric only, no decimal places, no $ sign in field
   - **Visibility:** Only visible if Dual/Duplex

4. **Rent Appraisal (Secondary) To**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.rent_appraisal_secondary_to }}`
   - **Field Type:** Text (numeric only)
   - **Purpose:** Split from single "Rent Appraisal (Secondary)" field into From/To
   - **Validation:** Numeric only, no decimal places, no $ sign in field
   - **Visibility:** Only visible if Dual/Duplex

**Fields that may need to be CREATED (to be confirmed):**

5. **Build Size**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.build_size }}` (if not exists)
   - **Field Type:** Text (numeric only)
   - **Purpose:** For H&L & Projects - build size in sqm
   - **Validation:** Numeric only, TBC option
   - **Visibility:** Only visible for H&L & Projects

6. **LGA (Local Government Area)**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.lga }}` (if not exists)
   - **Field Type:** Text
   - **Purpose:** For Investment Highlights lookup (uses LGA level, not suburb level)
   - **Source:** Auto-populated from Stash API or Geoscape API
   - **Visibility:** Always visible (for confirmation)

7. **BA Notes (Editing Request)**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.ba_editing_notes }}` (if not exists)
   - **Field Type:** Textarea (multi-line)
   - **Purpose:** BA adds notes explaining what needs to be edited when flagging "Needs Editing & Resubmitting"
   - **Validation:** Required when BA flags for editing
   - **Visibility:** Visible to BA when reviewing property

8. **Section Flagged (Editing Request)**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.section_flagged }}` (if not exists)
   - **Field Type:** Multi-select or Text
   - **Purpose:** Identify which section(s) need editing (optional but helpful)
   - **Options:** Property Description, Property Overlays, Purchase Price, Rental Assessment, Market Performance, Why this Property, Proximity, Investment Highlights, Attachments
   - **Visibility:** Visible to BA when flagging for editing

9. **Packager Response Notes**
   - **Make.com Reference:** `{{ custom_objects.property_reviews.packager_response_notes }}` (if not exists)
   - **Field Type:** Textarea (multi-line)
   - **Purpose:** Packager can add notes explaining changes made in response to BA editing request
   - **Validation:** Optional
   - **Visibility:** Visible when packager resubmits after editing

10. **Blocked Status**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.blocked_status }}` (if not exists)
    - **Field Type:** Boolean
    - **Purpose:** Indicates if property is blocked from being sent (when BA flags for editing)
    - **Default:** False
    - **Visibility:** System field (not user-editable)

11. **Blocked By**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.blocked_by }}` (if not exists)
    - **Field Type:** Text (user reference)
    - **Purpose:** Reference to BA who blocked the property
    - **Visibility:** System field (auto-populated)

12. **Blocked Timestamp**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.blocked_timestamp }}` (if not exists)
    - **Field Type:** Timestamp
    - **Purpose:** When property was blocked
    - **Visibility:** System field (auto-populated)

13. **Selling_Agent**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.selling_agent }}` (if not exists)
    - **Field Type:** Text (free text, single field)
    - **Purpose:** Selling agent Name, Email, Mobile (all in one field)
    - **Validation:** NOT MANDATORY - people are terrible at getting this information
    - **Format:** Free text entry (e.g., "John Smith, john.smith@email.com, 0412 345 678")
    - **Visibility:** Always visible (optional field)

14. **Price_group**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.price_group }}` (if exists, needs clarification)
    - **Field Type:** Text or Dropdown (to be determined)
    - **Purpose:** Price grouping/category
    - **Usage:** Currently not used but needs to be in form feed
    - **Visibility:** Always visible

15. **Marketing_Use**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.marketing_use }}` (if not exists)
    - **Field Type:** Text or Dropdown (to be determined)
    - **Purpose:** Marketing use field
    - **Usage:** Currently not used but needs to be in form feed
    - **Visibility:** Always visible

16. **Commisions_incl_GST**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.commisions_incl_gst }}` (if not exists)
    - **Field Type:** Text (numeric) or Currency
    - **Purpose:** Commissions including GST
    - **Usage:** Currently not used but needs to be in form feed
    - **Visibility:** Always visible

17. **Excpected_Build_window_months**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.excpected_build_window_months }}` (if not exists)
    - **Field Type:** Text (numeric)
    - **Purpose:** Expected build window in months
    - **Usage:** Currently not used but needs to be in form feed
    - **Visibility:** Only visible for H&L/Projects

18. **EOI_Contract_info**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.eoi_contract_info }}` (if not exists)
    - **Field Type:** Textarea (free text)
    - **Purpose:** EOI contract information
    - **Usage:** Currently not used but needs to be in form feed
    - **Visibility:** Always visible (optional)

19. **Land Registration**
    - **Make.com Reference:** `{{ custom_objects.property_reviews.land_registration }}` (if not exists)
    - **Field Type:** Text
    - **Purpose:** For H&L/Projects - Land registration status or target date
    - **Format:** "Registered" OR Target Month/Year (e.g., "April 2026 approx.")
    - **Logic:** For H&L, Land is either "registered" OR we have target month/year
    - **TBC Handling:** Allow "TBC" option
    - **Visibility:** Only visible for H&L & Projects
    - **Email Format:** "Registration: April 2026 approx." or "Registration: Registered"
    - **CRITICAL:** Split from Year_Built_Registering_Status field

**Fields that need to be MODIFIED:**

1. **Asking** - Add "TBC" option to dropdown
2. **Title** - Add "TBC" option to dropdown (already documented)
3. **Packager** - Change to full user names with emails (pull from GHL)
4. **Sourcer** - Change to full user names with emails (pull from GHL)
5. **Year Built** - Update visibility: Only visible for Established properties (split from Year_Built_Registering_Status)
6. **Year_Built_Registering_Status** - **SPLIT INTO TWO FIELDS:**
   - Year Built (for Established)
   - Land Registration (for H&L/Projects)

**Fields that may need to be DEPRECATED:**

1. **Rent Appraisal (Primary)** - Single field (if exists) - Replace with From/To fields
2. **Rent Appraisal (Secondary)** - Single field (if exists) - Replace with From/To fields

### Basic Property Information
| Field Name | Make.com Reference | Notes |
|------------|-------------------|-------|
| Property Address | `{{ custom_objects.property_reviews.property_address }}` | Full address - will be parsed into components |
| Unit / Lot (Primary) | `{{ custom_objects.property_reviews.unit__lot }}` | Unit/Lot number for primary dwelling |
| Unit / Lot (Secondary) | `{{ custom_objects.property_reviews.unit__lot_secondary }}` | Unit/Lot number for secondary dwelling (if dual key) |
| Street Number | `{{ custom_objects.property_reviews.street_number }}` | Street number component |
| Street Name | `{{ custom_objects.property_reviews.street_name }}` | Street name component |
| Suburb Name | `{{ custom_objects.property_reviews.suburb_name }}` | Used for Market Performance lookup |
| State | `{{ custom_objects.property_reviews.state }}` | State code (VIC, NSW, QLD, etc.) - used for Market Performance lookup |
| Post Code | `{{ custom_objects.property_reviews.post_code }}` | Postcode |
| Google Map | `{{ custom_objects.property_reviews.google_map }}` | **AUTOMATE:** Google Maps link displayed below Address in email template. Currently manual process: go to Google Maps, enter address, copy link, edit to show as address text. **CAN BE AUTOMATED:** System can generate Google Maps link from address and format as hyperlink (display text = property address, URL = Google Maps link). |

### Template & Workflow
| Field Name | Make.com Reference | Notes |
|------------|-------------------|-------|
| Template Type | `{{ custom_objects.property_reviews.template_type }}` | **REQUIRED:** Selected early in workflow. Options: Standard, H&L with Sales Assessment, H&L without Sales Assessment, Project. Determines email subject line format and form fields shown. |
| Review Date | `{{ custom_objects.property_reviews.review_date }}` | Date property was reviewed |
| Status | `{{ custom_objects.property_reviews.status }}` | **Dropdown:** Status the packaged property is to be created as. Options: 01 Available, 02 EOI, 03 Contr' Exchanged, 05 Remove no interest, 06 Remove lost. Properties can be raised in any status. Only "01 Available" triggers BA Auto select email. |
| Packager Approved | `{{ custom_objects.property_reviews.packager_approved }}` | Approval flag from packager |
| BA Approved | `{{ custom_objects.property_reviews.ba_approved }}` | Approval flag from Business Analyst |
| Resubmit for testing? | `{{ custom_objects.property_reviews.resubmit_for_testing }}` | Flag to resubmit for testing |

### Team Members
| Field Name | Make.com Reference | Notes |
|------------|-------------------|-------|
| Packager | `{{ custom_objects.property_reviews.packager }}` | **TO CHANGE:** Currently short names - Should change to full user names with emails. **Current Options:** Adi, Ali, James, Jess, John, Josh, Mohit, Sachin, Shay, Will. **Property Team Members:** All listed names are property team members (list will change over time). **Full Names/Emails:** Available from GHL (GoHighLevel) - can be pulled from there. **Note:** Packager is an activity, not a role - anyone can be a packager. **Same Options:** Packager and Sourcer use the same list of options. |
| Sourcer | `{{ custom_objects.property_reviews.sourcer }}` | **TO CHANGE:** Same as Packager - full user names with emails. **Current Options:** Adi, Ali, James, Jess, John, Josh, Mohit, Sachin, Shay, Will. **Property Team Members:** All listed names are property team members (list will change over time). **Full Names/Emails:** Available from GHL (GoHighLevel) - can be pulled from there. **Note:** Packager is an activity, not a role - anyone can be a packager/sourcer. **Same Options:** Packager and Sourcer use the same list of options. |
| Deal Type | `{{ custom_objects.property_reviews.deal_type }}` | **Dropdown:** Supports workflow in Google Spreadsheet. Options: 01 H&L Comms, 02 Single Comms, 03 Internal with Comms, 04 Internal No-Comms, 05 Established. **Note:** This data is internal workflow only - does NOT appear in emails sent to clients. |

### Property Details Section

**Section Layout:** Two-column layout for Primary/Secondary pairs, single column for other fields.

| Field Name | Make.com Reference | Field Type | Options/Validation | Visibility Rules | Email Template Format | Notes |
|------------|-------------------|------------|-------------------|------------------|----------------------|-------|
| **Bed (Primary)** | `{{ custom_objects.property_reviews.beds_primary }}` | Dropdown | 1-9 | Always visible | Bed: [X] | Required |
| **Bed (Secondary)** | `{{ custom_objects.property_reviews.beds_additional__secondary__dual_key }}` | Dropdown | 1-9 | **Only visible if Dual/Duplex** | Bed: [X] + [Y] | Optional, shown when dual occupancy |
| **Bath (Primary)** | `{{ custom_objects.property_reviews.bath_primary }}` | Dropdown | 1-9 (in 0.5 increments: 1, 1.5, 2, 2.5, etc.) | Always visible | Bath: [X] | Required |
| **Bath (Secondary)** | `{{ custom_objects.property_reviews.baths_additional__secondary__dual_key }}` | Dropdown | 1-9 (in 0.5 increments) | **Only visible if Dual/Duplex** | Bath: [X] + [Y] | Optional, shown when dual occupancy |
| **Garage (Primary)** | `{{ custom_objects.property_reviews.garage_primary }}` | Dropdown | 1-9 | Always visible | Garage: [X] | Required |
| **Garage (Secondary)** | `{{ custom_objects.property_reviews.garage_additional__secondary__dual_key }}` | Dropdown | 1-9 | **Only visible if Dual/Duplex** | Garage: [X] + [Y] | Optional, shown when dual occupancy |
| **Car-space (Primary)** | `{{ custom_objects.property_reviews.carspace_primary }}` | Dropdown | 1-9 | Always visible | Car-space: [X] | Required |
| **Car-space (Secondary)** | `{{ custom_objects.property_reviews.carspace_additional__secondary__dual_key }}` | Dropdown | 1-9 | **Only visible if Dual/Duplex** | Car-space: [X] + [Y] | Optional, shown when dual occupancy |
| **Car-port (Primary)** | `{{ custom_objects.property_reviews.carport_primary }}` | Dropdown | 1-9 | Always visible | Car-port: [X] | Required |
| **Car-port (Secondary)** | `{{ custom_objects.property_reviews.carport_additional__secondary__dual_key }}` | Dropdown | 1-9 | **Only visible if Dual/Duplex** | Car-port: [X] + [Y] | Optional, shown when dual occupancy |
| **Year Built** | `{{ custom_objects.property_reviews.year_built }}` | Text (numeric only) | Numeric: 1971, 2024, etc. | **Only visible for Established properties** | Built: [YEAR] approx. | **TBC Handling:** Allow "TBC" or "Circa 1960's" format. **CRITICAL:** Split from Year_Built_Registering_Status - this field is for Established only. |
| **Land Registration** | `{{ custom_objects.property_reviews.land_registration }}` (NEW) | Text | "Registered" OR Target Month/Year (e.g., "April 2026 approx.") | **Only visible for H&L & Projects** | Registration: [STATUS] or Registration: [MONTH YEAR] approx. | **CRITICAL:** Split from Year_Built_Registering_Status - this field is for H&L/Projects only. Logic: Land is either "registered" OR we have target month/year. **TBC Handling:** Allow "TBC" option. |
| **Land Size** | `{{ custom_objects.property_reviews.land_size }}` | Text (numeric only) | Numeric: 662, 1100, etc. | Always visible | Land Size: [SIZE] sqm approx. | **TBC Handling:** Allow "TBC" option |
| **Title** | `{{ custom_objects.property_reviews.title }}` | Dropdown | Individual, Green, Torrens, Strata, Owners Corp (Community), Survey Strata (communal villas), Built Strata (apartments), **TBC** | Always visible | Title: [TYPE] | **TBC added to options** |
| **Build Size** | `{{ custom_objects.property_reviews.build_size }}` (if not exists) | Text (numeric only) | Numeric: 144.75, 219.11, etc. | **Only visible for H&L & Projects** | Build Size: [SIZE] sqm approx. | **TBC Handling:** Allow "TBC" option. New field needed. |
| **Body corp $ (per quarter)** | `{{ custom_objects.property_reviews.body_corp__per_quarter }}` | Text (numeric only) | Numeric: $XXX | **Mandatory if Title = Strata, Owners Corp, Survey Strata, Built Strata, or TBC** | Body corp.: Approx. $[AMOUNT] per quarter | **TBC Handling:** Allow "TBC" option |
| **Body Corp Description** | `{{ custom_objects.property_reviews.body_corp_description }}` | Text | Free text | Shown if Body corp field has value | Description text | Optional |
| **Property Description Additional Dialogue** | `{{ custom_objects.property_reviews.property_description_additional_dialogue }}` | Text | Free text | Always visible (optional) | Appears at bottom of Property Description section | Any other relevant property information (not needed often) |
| **Does this property have 2 dwellings?** | `{{ custom_objects.property_reviews.does_this_property_have_2_dwellings }}` | Boolean/Checkbox | Yes/No | Always visible | Determines visibility of Secondary fields | Controls Dual/Duplex field visibility |

### TBC (To Be Confirmed) Handling

**Fields that need TBC support:**
- **Year Built:** Allow "TBC" or descriptive formats like "Circa 1960's"
- **Land Size:** Allow "TBC" option
- **Title:** "TBC" added as dropdown option
- **Build Size:** Allow "TBC" option
- **Body corp $ (per quarter):** Allow "TBC" option

**Implementation Approach:**
- For numeric fields: Allow text input with "TBC" as valid option
- For Year Built: Allow formats like "Circa 1960's", "TBC", or numeric year
- For Title: Add "TBC" as dropdown option
- Email template should handle TBC values appropriately (may not show "approx." if TBC)

### Project Lot-Level Data (Repeater Boxes)

**For Projects:** Use repeater boxes to collect lot-level information. Each lot can have:

**Lot Information Per Entry:**
- **Lot Number** (e.g., "Lot 17")
- **Property Details:**
  - Bed: [Primary] + [Secondary] (e.g., "4 + 2")
  - Bath: [Primary] + [Secondary] (e.g., "2 + 1")
  - Car: [Count] (e.g., "2")
- **Registration:** [Date/Text] (e.g., "April 2026 approx.")
- **Built:** [Size] (e.g., "219.11 approx.") - **TBC handling needed**
- **Land Size:** [Size] (e.g., "1100 sqm approx.") - **TBC handling needed**
- **Title:** [Type] (e.g., "Individual") - **TBC option available**
- **Pricing:**
  - Land: $[Amount] (e.g., "$210,000")
  - Build: $[Amount] (e.g., "$559,990")
  - Total: $[Amount] (e.g., "$769,990")
  - Net Price: $[Amount] (e.g., "$749,900 when considering the $20k cashback")
- **Rental Assessment (if different per lot):**
  - Appraisal: ~ $[Amount] - $[Amount] per week (e.g., "~ $400 - $580 per week")
  - Appraised Yield: ~ [Percentage]% (e.g., "~ 6.62%")

**Repeater Functionality:**
- Add/Remove lot entries dynamically
- Each lot entry collects all relevant information
- Can mark rental assessment as "same across all lots" or "different per lot"

### Property Overlays (Risk Assessment) Section

**Section Functionality:**
- **Automated feed from Stash API** for risk overlays
- **Override capability** - users can change values from Stash
- **Dialogue boxes** appear when risk = Yes, allowing additional information
- **Bulk action:** "Set All Overlays to No" button to reduce mouse clicks

| Field Name | Make.com Reference | Field Type | Source | Visibility Rules | Email Template Format | Notes |
|------------|-------------------|------------|--------|------------------|----------------------|-------|
| **Zoning** | `{{ custom_objects.property_reviews.zoning }}` | Text (free text) | **AUTO-POPULATE:** From Stash API | Always visible | Zoning: [TEXT] | Auto-populated, can be edited |
| **Flood** | `{{ custom_objects.property_reviews.flood }}` | Dropdown | **AUTO-POPULATE:** From Stash API (Yes/No), can override | Always visible | Flood: [Yes/No] or "Yes - [dialogue]" (dialogue on same line) | Can override Stash value |
| **Flood Dialogue** | `{{ custom_objects.property_reviews.flood_dialogue }}` | Textarea (multi-line) | Manual entry | **Only visible if Flood = Yes** | Appended to "Yes" on same line → "Yes - [dialogue text]" | Additional information when Flood = Yes. Format: Same line as "Yes", not separate line. |
| **Bushfire** | `{{ custom_objects.property_reviews.bushfire }}` | Dropdown | **AUTO-POPULATE:** From Stash API (Yes/No), can override | Always visible | Bushfire: [Yes/No] or "Yes - [dialogue]" | Can override Stash value. Example: "Yes - Typical of new estates, as the project progresses and project completes the risk is mitigated. Building designs incorporate bushfire-resistant materials along with defendable spaces to mitigate risk." |
| **Bushfire Dialogue** | `{{ custom_objects.property_reviews.bushfire_dialogue }}` | Textarea (multi-line) | Manual entry | **Only visible if Bushfire = Yes** | Appended to "Yes" on same line → "Yes - [dialogue text]" | Additional information when Bushfire = Yes. Format: Same line as "Yes", not separate line. Example: "Bushfire: Yes - Typical of new estates..." |
| **Mining** | `{{ custom_objects.property_reviews.mining }}` | Dropdown | **AUTO-POPULATE:** From Stash API (Yes/No), can override | Always visible | Mining: [Yes/No] or "Yes - [dialogue]" | Can override Stash value |
| **Mining Dialogue** | `{{ custom_objects.property_reviews.mining_dialogie }}` OR `{{ custom_objects.property_reviews.mining_dialogue }}` | Textarea (multi-line) | Manual entry | **Only visible if Mining = Yes** | Appended to "Yes" on same line → "Yes - [dialogue text]" | **NOTE:** Field name may be "mining_dialogie" (typo) or "mining_dialogue" (corrected in GHL). Format: Same line as "Yes", not separate line. |
| **Other (Overlay)** | `{{ custom_objects.property_reviews.other_overlay }}` | Dropdown | **AUTO-POPULATE:** From Stash API (Yes/No), can override | Always visible | Other (Overlay): [Yes/No] or "Yes - [dialogue]" (dialogue on same line) | Can override Stash value |
| **Other (Overlay) Dialogue** | `{{ custom_objects.property_reviews.other_overlay_dialogue }}` | Textarea (multi-line) | Manual entry | **Only visible if Other (Overlay) = Yes** | Appended to "Yes" on same line → "Yes - [dialogue text]" | Additional information when Other (Overlay) = Yes. Format: Same line as "Yes", not separate line. |
| **Special Infrastructure** | `{{ custom_objects.property_reviews.special_infrastructure }}` | Dropdown | **AUTO-POPULATE:** From Stash API (Yes/No), can override | Always visible | Special Infrastructure: [Yes/No] or "Yes - [dialogue]" (dialogue on same line) | Can override Stash value |
| **Special Infrastructure Dialogue** | `{{ custom_objects.property_reviews.special_infrastructure_dialogue }}` | Textarea (multi-line) | Manual entry | **Only visible if Special Infrastructure = Yes** | Appended to "Yes" on same line → "Yes - [dialogue text]" | Additional information when Special Infrastructure = Yes. Format: Same line as "Yes", not separate line. |
| **Due Diligence Acceptance** | `{{ custom_objects.property_reviews.due_diligence_acceptance }}` | Dropdown | Manual entry | Always visible | **Due Diligence Acceptance:** [Yes/No] (bold, NOT bulleted, at bottom of section) | **CRITICAL:** If No, show warning: "This property cannot be submitted if Due Diligence Acceptance is set to No." Block form submission if No. **Email Format:** Not bulleted, appears at bottom of Property Overlays section in bold. |
| **Additional Property Overlays Info** | Not in custom objects? | Textarea (multi-line) | Manual entry | Always visible (optional) | Appears at bottom of Property Overlays section | Additional information about project overlays (not needed often) |

### Property Overlays Functionality

**Automation from Stash:**
- Zoning, Flood, Bushfire, Mining, Other (Overlay), Special Infrastructure auto-populated from Stash API
- Users can override any value
- Override checkboxes available: "Further analysis has identified this as NOT [RISK TYPE]" → sets to No

**Dialogue Box Logic:**
- When risk overlay = "Yes", dialogue textarea appears
- **Format:** Dialogue text should appear on the SAME LINE as "Yes", not on a separate line
- **Structure:** `Yes - [dialogue text]` (space hyphen space)
- **Warning Message:** If user selects "Yes" for any overlay but doesn't add dialogue, show warning: "Are you sure you do not want to add a message regarding the Yes for [OVERLAY NAME] overlay?" (not mandatory, but recommended)
- **Example:** `Bushfire: Yes - Typical of new estates, as the project progresses and project completes the risk is mitigated. Building designs incorporate bushfire-resistant materials along with defendable spaces to mitigate risk.`
- Example: "Bushfire: Yes - Typical of new estates, as the project progresses..."

**Bulk Action:**
- **"Set All Overlays to No" button** - Sets Flood, Bushfire, Mining, Other (Overlay), Special Infrastructure all to No
- Reduces mouse clicks when no risks present
- Does NOT affect Due Diligence Acceptance

**Due Diligence Acceptance Validation:**
- **If No:** Show warning message: "This property cannot be submitted if Due Diligence Acceptance is set to No."
- **Block form submission** if Due Diligence Acceptance = No
- User must change to Yes to proceed

### Purchase Price Section

| Field Name | Make.com Reference | Field Type | Options/Validation | Visibility Rules | Email Template Format | Notes |
|------------|-------------------|------------|-------------------|------------------|----------------------|-------|
| **Asking** | `{{ custom_objects.property_reviews.asking }}` | Dropdown | On-market, Off-market, Pre-launch, Coming Soon, N/A (H&L / Project / Single Build), **TBC** (To Be Confirmed - to be added) | **Hidden for H&L and Projects** (only show first 4 values + TBC for Established properties) | Asking: [VALUE] | Used in Google Sheet tracker for BA's to know what properties are available. For Established: show On-market, Off-market, Pre-launch, Coming Soon, TBC. For H&L/Projects: field hidden or show N/A. **Note:** TBC option allows for unknown asking price. |
| **Asking Text** | `{{ custom_objects.property_reviews.asking_text }}` | Textarea (multi-line, free text) | Free text from agent | **Always visible when Asking field is visible** | Asking: [VALUE] - [TEXT] | **ALWAYS REQUIRED** - Asking on its own is not enough. Examples: "Vendor expectation over $720,000" or "$490,000 - $520,000" or "TBC" (To Be Confirmed). Appended to Asking value separated with " - " (space hyphen space). Example output: "Asking: On-market - Vendor expectation over $720,000". **Validation:** Multi-line, accepts text and numerics, no format restrictions. |
| **Comparable Sales** | `{{ custom_objects.property_reviews.comparable_sales }}` | Textarea (free text) | Free text | Always visible | Comparable Sales: [TEXT] | Generally: "We have seen comparable properties trade in the low to mid 500's." **V2 Enhancement:** Could add dropdowns for low/mid/high followed by xxx's. Keep as free text for V1. |
| **Acceptable Acquisition $ From** | `{{ custom_objects.property_reviews.acceptable_acquisition__from }}` | Text (numeric only) | Numeric only (no $ sign, no commas) | Always visible | Acceptable Acquisition $ From: $[AMOUNT] | Used to calculate yield. Numeric validation required. |
| **Acceptable Acquisition $ To** | `{{ custom_objects.property_reviews.acceptable_acquisition__to }}` | Text (numeric only) | Numeric only (no $ sign, no commas) | Always visible | Acceptable Acquisition $ To: $[AMOUNT] | Used to calculate yield. Numeric validation required. |
| **Accepted Acquisition Target** | `{{ custom_objects.property_reviews.accepted_acquisition_target }}` | Text (numeric only) | Numeric only | Always visible | Accepted Acquisition Target: $[AMOUNT] | Target acquisition price |
| **Purchase Price Additional Dialogue** | `{{ custom_objects.property_reviews.purchase_price_additional_dialogue }}` | Textarea (free text) | Free text | Always visible (optional) | Additional notes for purchase price section | Optional additional information |
| **Price_group** | `{{ custom_objects.property_reviews.price_group }}` | Unknown | Unknown | Unknown | Unknown | Price grouping/category - Need to clarify purpose |

### Purchase Price Functionality

**Asking Field Logic:**
- **For Established Properties:** Show dropdown with: On-market, Off-market, Pre-launch, Coming Soon
- **For H&L/Projects:** Hide field OR show only "N/A (H&L / Project / Single Build)"
- **Google Sheet Integration:** Value populated in tracker field for BA's to see available properties
- **Email Template:** Shows as "Asking: [VALUE]" or "Asking: [VALUE] - [TEXT]" if Asking Text provided

**Asking Text Field:**
- **Always visible when Asking field is visible**
- **Always required** - Asking on its own is not enough information
- **Multi-line textarea** - accepts text and numerics, no format restrictions
- **TBC Support:** Can enter "TBC" (To Be Confirmed) if asking price is unknown
- **Appended Format:** Appended to Asking value with " - " (space hyphen space)
- Free text from agent
- Examples: "Vendor expectation over $720,000" or "$490,000 - $520,000"
- **Email Template Format:** Appended to Asking value with " - " separator
- Example: "Asking: On-market - Vendor expectation over $720,000"

**Acceptable Acquisition Price:**
- Used to calculate yield (refer back to Rental Assessment section)
- Both From and To values are numeric only
- System will format with $ sign in email template

### V2 Enhancements (Future)

**Comparable Sales Enhancement:**
- Could add dropdowns for price range descriptors:
  - First dropdown: low / mid / high
  - Second dropdown: xxx's (e.g., 500's, 600's, 700's)
- Example output: "We have seen comparable properties trade in the [low/mid/high] [xxx]'s"
- **For V1:** Keep as free text field

### Rental Assessment Section

| Field Name | Make.com Reference | Field Type | Options/Validation | Visibility Rules | Email Template Format | Notes |
|------------|-------------------|------------|-------------------|------------------|----------------------|-------|
| **Occupancy** | `{{ custom_objects.property_reviews.occupancy }}` | Dropdown | Owner Occupied, Tenanted, Vacant | Always visible | Occupancy: [VALUE] | Determines visibility of rent-related fields |
| **Current Rent (Primary) per week $** | `{{ custom_objects.property_reviews.current_rent_primary__per_week }}` | Text (numeric or TBC) | Numeric only OR "TBC" | **Only visible if Occupancy = Tenanted** | Current Rent: $[AMOUNT] per week | **Format:** $ per week, no decimal places. **TBC Handling:** Field accepts numeric values OR "TBC" text. Field label: "Current Rent per week $" (no $ sign in field input, $ is in label). **Note:** Numeric-only field that can also accept "TBC" as text value. |
| **Current Rent (Secondary) per week $** | `{{ custom_objects.property_reviews.current_rent_secondary__per_week }}` | Text (numeric or TBC) | Numeric only OR "TBC" | **Only visible if Occupancy = Tenanted AND Dual/Duplex** | Current Rent (Secondary): $[AMOUNT] per week | **Format:** $ per week, no decimal places. **TBC Handling:** Field accepts numeric values OR "TBC" text. Field label: "Current Rent per week $" (no $ sign in field input, $ is in label). **Note:** Numeric-only field that can also accept "TBC" as text value. |
| **Expiry (Primary)** | `{{ custom_objects.property_reviews.expiry_primary }}` | Month & Year Selector (roller dropdown) | Month dropdown + Year dropdown | **Only visible if Occupancy = Tenanted** | Expiry (Primary): [MONTH] [YEAR] | **TBC Handling:** Allow "TBC" option or "TBC" checkbox |
| **Expiry (Secondary)** | `{{ custom_objects.property_reviews.expiry_secondary }}` | Month & Year Selector (roller dropdown) | Month dropdown + Year dropdown | **Only visible if Occupancy = Tenanted AND Dual/Duplex** | Expiry (Secondary): [MONTH] [YEAR] | **TBC Handling:** Allow "TBC" option or "TBC" checkbox |
| **Rent Appraisal (Primary) From** | `{{ custom_objects.property_reviews.rent_appraisal_primary_from }}` | Text (numeric only) | Numeric only, no decimal places | Always visible | Rent Appraisal (Primary): $[FROM] - $[TO] per week | **CHANGE:** Split from single field into From/To. Format: $ per week (numeric only, no $ sign in field, $ is in label). No decimal places. |
| **Rent Appraisal (Primary) To** | `{{ custom_objects.property_reviews.rent_appraisal_primary_to }}` | Text (numeric only) | Numeric only, no decimal places | Always visible | Rent Appraisal (Primary): $[FROM] - $[TO] per week | **CHANGE:** Split from single field into From/To. Format: $ per week (numeric only, no $ sign in field, $ is in label). No decimal places. |
| **Rent Appraisal (Secondary) From** | `{{ custom_objects.property_reviews.rent_appraisal_secondary_from }}` | Text (numeric only) | Numeric only, no decimal places | **Only visible if Dual/Duplex** | Rent Appraisal (Secondary): $[FROM] - $[TO] per week | **CHANGE:** Split from single field into From/To. Format: $ per week (numeric only, no $ sign in field, $ is in label). No decimal places. |
| **Rent Appraisal (Secondary) To** | `{{ custom_objects.property_reviews.rent_appraisal_secondary_to }}` | Text (numeric only) | Numeric only, no decimal places | **Only visible if Dual/Duplex** | Rent Appraisal (Secondary): $[FROM] - $[TO] per week | **CHANGE:** Split from single field into From/To. Format: $ per week (numeric only, no $ sign in field, $ is in label). No decimal places. |
| **Yield** | `{{ custom_objects.property_reviews.yield }}` | Auto-calculated (read-only) | Percentage | Always visible | Yield: [PERCENTAGE]% | **AUTO-CALCULATE:** (Annual Rent / Property Price) × 100. Property Price = Highest Acceptable Acquisition Price (for Established) or Total Price (for H&L/Project) BUT NOT Total Price with cashback. Formula: (Current Rent (Primary) × 52 / Property Price) × 100 |
| **Appraised Yield** | `{{ custom_objects.property_reviews.appraised_yield }}` | Auto-calculated (read-only) | Percentage | Always visible | Appraised Yield: [PERCENTAGE]% | **AUTO-CALCULATE:** Based on Rent Appraisal (Primary) To figure. Formula: (Rent Appraisal (Primary) To × 52 / Property Price) × 100. Property Price = Highest Acceptable Acquisition Price (for Established) or Total Price (for H&L/Project) BUT NOT Total Price with cashback. |
| **Rent Dialogue (Primary)** | `{{ custom_objects.property_reviews.rent_dialogue_primary }}` | Textarea (free text) | Free text | Always visible (optional) | Additional notes for primary rent | Optional additional information |
| **Rent Dialogue (Secondary)** | `{{ custom_objects.property_reviews.rent_dialogue_secondary }}` | Textarea (free text) | Free text | Always visible (optional) | Additional notes for secondary rent | Optional additional information |
| **Rental Assessment Additional Dialogue** | `{{ custom_objects.property_reviews.rental_assessment_additional_dialogue }}` | Textarea (free text) | Free text | Always visible (optional) | Additional notes for rental assessment section | Optional additional information |

### Rental Assessment Functionality

**Visibility Rules:**
- **Tenanted Fields:** Current Rent (Primary), Expiry (Primary) - Only visible if Occupancy = "Tenanted"
- **Dual/Duplex Fields:** Current Rent (Secondary), Expiry (Secondary), Rent Appraisal (Secondary) From, Rent Appraisal (Secondary) To - Only visible if property is Dual/Duplex
  - **Note:** Rent Appraisal (Secondary) From/To are visible if Dual/Duplex (regardless of Occupancy)
  - Current Rent (Secondary) and Expiry (Secondary) are visible if Occupancy = "Tenanted" AND Dual/Duplex

**TBC (To Be Confirmed) Handling:**
- **Current Rent (Primary/Secondary):** Field accepts numeric values OR "TBC" text
  - **Format:** Numeric-only field that can also accept "TBC" as text value
  - **Field Label:** "Current Rent per week $" (no $ sign in field input, $ is in label)
  - **No dropdown option** - users type "TBC" directly in the field (fallback dropdown option can be discussed if no other option exists)
- **Expiry (Primary/Secondary):** Allow "TBC" checkbox or "TBC" option in month/year selectors

**Auto-Calculation Formulas:**

**Yield Calculation:**
- **Formula:** `(Annual Rent / Property Price) × 100`
- **Annual Rent:** Current Rent (Primary) × 52 weeks
- **Property Price:**
  - **For Established:** Highest Acceptable Acquisition Price (Acceptable Acquisition $ To)
  - **For H&L/Projects:** Total Price (Land + Build)
  - **IMPORTANT:** Do NOT use Total Price with cashback/rebate (use gross total before cashback)
- **Display:** Show as percentage with 2 decimal places

**Appraised Yield Calculation:**
- **Formula:** `(Annual Appraised Rent / Property Price) × 100`
- **Annual Appraised Rent:** Rent Appraisal (Primary) To × 52 weeks
- **Property Price:** Same logic as Yield calculation (Highest Acceptable Acquisition Price or Total Price, NOT with cashback)
- **Display:** Show as percentage with 2 decimal places

**Rent Appraisal Fields Change:**
- **Current:** Single free text field for Primary, single field for Secondary
- **New:** Split into From/To fields for both Primary and Secondary:
  - **Rent Appraisal (Primary) From:** Numeric only, no decimal places, $ per week (no $ sign in field, $ is in label)
  - **Rent Appraisal (Primary) To:** Numeric only, no decimal places, $ per week (no $ sign in field, $ is in label)
  - **Rent Appraisal (Secondary) From:** Numeric only, no decimal places, $ per week (no $ sign in field, $ is in label) - Only visible if Dual/Duplex
  - **Rent Appraisal (Secondary) To:** Numeric only, no decimal places, $ per week (no $ sign in field, $ is in label) - Only visible if Dual/Duplex
- **Validation:** From value must be lower than To value (applies to both Primary and Secondary)
- **Email Template:** Display as "$[FROM] - $[TO] per week"
- **Note:** Need to create new custom object fields or update existing field structure

**Date Selectors:**
- **Expiry (Primary/Secondary):** Use month & year selector (roller dropdown)
  - Month dropdown: January, February, March, etc.
  - Year dropdown: Current year and future years
  - Allow "TBC" option

### Market Performance
| Field Name | Make.com Reference | Notes |
|------------|-------------------|-------|
| Median price change - 3 months | `{{ custom_objects.property_reviews.median_price_change__3_months }}` | **AUTO-POPULATE:** From Google Sheet (numeric only, no % sign, up to 2 decimals). **Email Format:** System adds % sign and formats to 2 decimal places (e.g., `3.9` → `3.90%`) |
| Median price change - 1 year: | `{{ custom_objects.property_reviews.median_price_change__1_year }}` | **AUTO-POPULATE:** From Google Sheet (numeric only, no % sign, up to 2 decimals). **Email Format:** System adds % sign and formats to 2 decimal places. Note colon in field name |
| Median price change - 3 year | `{{ custom_objects.property_reviews.median_price_change__3_year }}` | **AUTO-POPULATE:** From Google Sheet (numeric only, no % sign, up to 2 decimals). **Email Format:** System adds % sign and formats to 2 decimal places |
| Median price change - 5 year | `{{ custom_objects.property_reviews.median_price_change__5_year }}` | **AUTO-POPULATE:** From Google Sheet (numeric only, no % sign, up to 2 decimals). **Email Format:** System adds % sign and formats to 2 decimal places |
| Median yield | `{{ custom_objects.property_reviews.median_yield }}` | **AUTO-POPULATE:** From Google Sheet (numeric only, no % sign, up to 2 decimals). **Email Format:** System adds % sign and formats to 2 decimal places |
| Median rent change - 1 year | `{{ custom_objects.property_reviews.median_rent_change__1_year }}` | **AUTO-POPULATE:** From Google Sheet (numeric only, no % sign, up to 2 decimals). **Email Format:** System adds % sign and formats to 2 decimal places |
| Rental Population | `{{ custom_objects.property_reviews.rental_population }}` | **AUTO-POPULATE:** From Google Sheet (numeric only, no % sign, up to 2 decimals). **Email Format:** System adds % sign and formats to 2 decimal places |
| Vacancy Rate | `{{ custom_objects.property_reviews.vacancy_rate }}` | **AUTO-POPULATE:** From Google Sheet (numeric only, no % sign, up to 2 decimals). **Email Format:** System adds % sign and formats to 2 decimal places |
| Market Performance Additional Dialogue | `{{ custom_objects.property_reviews.market_perfornance_additional_dialogue }}` | **NOTE:** Typo in field name "perfornance" - may need to fix |

### Why This Property Section

| Field Name | Make.com Reference | Field Type | Current Process | Automation Opportunity | Notes |
|------------|-------------------|------------|----------------|----------------------|-------|
| **Why this property?** | `{{ custom_objects.property_reviews.why_this_property }}` | Textarea (multi-line, free text) | Currently copy/paste information | **CAN BE AUTOMATED:** Use ChatGPT Property Summary Tool | **Email Format:** Single-line format: `**Bolded Heading** - Description text` (all on one line, not multi-line). Each bullet point: `• **Heading** - Description`. See Email Template Formatting section for details. |
| **Proximity** | `{{ custom_objects.property_reviews.proximity }}` | Textarea (multi-line, free text) | Currently copy/paste from ChatGPT Property Summary Tool | **CAN BE AUTOMATED:** Use ChatGPT Property Summary Tool | See ChatGPT automation section below. **Typical Format:** Property address + list of 13 local amenities with distance and travel time. Format: "• [DISTANCE] km ([TIME] mins), [AMENITY NAME]" |
| **Investment Highlights** | `{{ custom_objects.property_reviews.investment_highlights }}` | Textarea (multi-line, free text) | Currently copy/paste from ChatGPT Infrastructure Details Tool | **STATIC DATA REPOSITORY:** Store in Google Sheet (like Market Performance), lookup by Suburb/LGA. If not found, prompt user to paste in and update repository. Periodic prompts to verify data freshness (updated every 3 months). | See Investment Highlights static data section below |

### ChatGPT Automation Opportunity

**Current Process:** Users manually copy/paste information from ChatGPT custom tools into form fields.

**ChatGPT Custom Tools Available:**
1. **Property Summary Tool**
   - **Purpose:** Provides inputs for "Why this Property?" & "Proximity" sections
   - **Location:** ChatGPT homepage → Left-hand menu → "GPTs" section
   - **Usage:** Enter property address → Tool returns:
     - A. Property address & list of 13 local amenities (for Proximity section)
     - B. "Full Detailed Reasons" (for Why this Property? section)
     - C. "Short One-Line Versions Only"
   - **Amenities Searched:** 1x kindergarten, 3x schools, 2x supermarket, 2x hospitals, 1x train station, 1x bus stop, 1x beach, 1x airport, 1x closest capital city, 3x child day cares
   - **Automation Potential:** Can we integrate ChatGPT API to call this tool automatically?

2. **Build & Pest Report Tool**
   - **Purpose:** Helps summarize findings from a Build & Pest Report
   - **Location:** ChatGPT homepage → Left-hand menu → "GPTs" section
   - **Automation Potential:** Can we integrate ChatGPT API to process build & pest reports?

3. **Infrastructure Details Tool**
   - **Purpose:** Summarizes major infrastructure highlights from Hotspotting Report & helps populate Investment Highlights summary
   - **Location:** ChatGPT homepage → Left-hand menu → "GPTs" section
   - **Source:** Hotspotting Reports downloaded from https://membership.hotspotting.com.au/hotspotting-reports
   - **Update Frequency:** Reports updated every 3 months (quarterly)
   - **Automation Approach:** **STATIC DATA REPOSITORY** (like Market Performance)
     - Store Investment Highlights in Google Sheet by Suburb/LGA
     - Lookup by Suburb/LGA when packaging property
     - If not found, prompt user to use ChatGPT Infrastructure Details Tool and paste in
     - User pastes content → System saves to repository
     - Periodic prompts to verify data freshness (3-month threshold)
   - **Additional Information:** Separate field in repository for manually added info (e.g., "$500m Hotel being built") - preserved when new report version issued

**ChatGPT Automation - ANSWERED:**
1. **ChatGPT API Access:** ✅ User has ChatGPT API access and tools are already created
2. **Input Requirements:** Property address (for Property Summary Tool)
3. **Integration Approach:** Direct ChatGPT API integration (user has access)
4. **Workflow:** ChatGPT automation is triggered manually via button click AFTER packager confirms they want to package the property (Step 2.5)
5. **Error Handling:** If ChatGPT API call fails:
   - Show error message: "ChatGPT API call failed. Please try again or enter manually."
   - Display "Retry" button to attempt ChatGPT call again
   - Display "Enter Manually" option to skip automation and enter content manually
   - User can wait and retry, or choose to enter content manually

**Automation Workflow:**

**For "Why this property?" and "Proximity":**
- **Trigger:** Manual button click after packager confirms "Package This Property" (Step 2.5)
- **Process:** System calls ChatGPT Property Summary Tool with property address:
  - Extracts "Full Detailed Reasons" (B) → Auto-populates "Why this property?"
  - Extracts property address & list of 13 amenities (A) → Auto-populates "Proximity"
- **Error Handling:** If ChatGPT API call fails:
  - Show error message: "ChatGPT API call failed. Please try again or enter manually."
  - Display "Retry" button
  - Display "Enter Manually" option
  - User can retry or choose manual entry

**For "Investment Highlights":**
- **Static Data Repository Approach:**
  - System queries Google Sheet "Investment Highlights" tab by Suburb/LGA
  - If found and fresh → Auto-populate field
  - If found but stale → Prompt to verify/update
  - If not found → Prompt user to:
    1. Download Hotspotting Report from https://membership.hotspotting.com.au/hotspotting-reports
    2. Use ChatGPT Infrastructure Details Tool to summarize
    3. Paste content into form
    4. System saves to repository for future use
- **Additional Information:** User can add extra info (e.g., "$500m Hotel being built") which is preserved separately

**For Build & Pest Reports:**
- User uploads Build & Pest Report → System calls ChatGPT Build & Pest Report Tool → Could populate additional dialogue fields or new section

**Note:** This automation would significantly reduce manual copy/paste work. Need to investigate ChatGPT API capabilities and custom GPT API access.

**Important:** All three sections (Why this property?, Proximity, Investment Highlights) use the same ChatGPT process. Proximity also uses the UI tool created. Investment Highlights uses static data repository approach (like Market Performance) but can fall back to ChatGPT Infrastructure Details Tool when data not found.

### Typical "Why this property?" Data Format

**Example Structure:**
The "Why this property?" field typically contains structured content with headings and descriptive text covering:

- **Strong Capital Growth Potential** - Capital growth statistics and trends
- **Attractive Rental Yield** - Rental yield information (e.g., "5–5.5%")
- **Low Vacancy Rates** - Vacancy rate statistics (e.g., "typically under 1%")
- **Infrastructure and Health Services** - Local infrastructure, hospitals, schools, community facilities
- **Affordable Entry Point** - Price comparison and affordability
- **Growing Tenant Demand** - Tenant demand trends and demographics
- **Access to Major Transport Links** - Transport connectivity (V/Line, roads, airports)

**Example Content:**
```
Strong Capital Growth Potential
Kyabram has experienced steady capital growth, with the median house price increasing over 20% in the last five years, reflecting solid long-term investment appeal in the Campaspe Shire.

Attractive Rental Yield
Rental yields in Kyabram remain appealing for investors, with current gross yields hovering around 5–5.5%, offering reliable income in a regional setting.

Low Vacancy Rates
Vacancy rates in Kyabram are typically under 1%, indicating strong rental demand and tenant stability — key indicators of a healthy investment environment.

Infrastructure and Health Services
The region is well supported by key infrastructure, including local hospitals, schools, and upgrades to community facilities that add to lifestyle and long-term value.

Affordable Entry Point
Kyabram provides a highly affordable price point compared to nearby regional hubs and Melbourne, making it attractive for both investors and first-home buyers.

Growing Tenant Demand
There's increasing demand from tenants seeking affordable housing with access to good schools, local jobs, and lifestyle amenities, boosting rental competition.

Access to Major Transport Links
Proximity to V/Line services, major roads, and Echuca Airport ensures connectivity to Melbourne and surrounding towns, increasing commuter and lifestyle appeal.
```

**Format Notes:**
- Structured with clear headings
- Each section contains descriptive paragraphs
- May include statistics and percentages
- Focuses on investment appeal and market conditions

### Typical "Proximity" Data Format

**Source:** ChatGPT Property Summary Tool

**Process:**
1. Click on Property Summary Tool from ChatGPT left-hand menu
2. Enter property address
3. Tool returns:
   - A. Property address & list of 13 local amenities
   - B. "Full Detailed Reasons"
   - C. "Short One-Line Versions Only"
4. **For Proximity Section:** Only use property address & list of amenities (ignore B and C)

**Amenities Searched (13 total):**
- 1x kindergarten
- 3x schools
- 2x supermarket
- 2x hospitals
- 1x train station
- 1x bus stop
- 1x beach
- 1x airport
- 1x closest capital city
- 3x child day cares

**Typical Format:**
Each amenity listed with distance and travel time:
- Format: `• [DISTANCE] km ([TIME] mins), [AMENITY NAME]`
- Bullet points for each amenity
- Sorted by distance (closest first)

**Example Content:**
```
• 2.0 km (3 mins), Kyabram District Health Services
• 2.3 km (4 mins), Busy Bees on Allan
• 2.4 km (4 mins), Kyabram Community Early Learning Centre
• 2.6 km (5 mins), Woolworths Kyabram
• 2.7 km (4 mins), Kyabram Kindergarten
• 2.9 km (4 mins), St Augustine's College Kyabram (School)
• 3.3 km (5 mins), Kyabram Station
• 3.6 km (7 mins), Kyabram P-12 College (School)
• 16.1 km (13 mins), Merrigum Primary School (School)
• 30.4 km (23 mins), FoodWorks Kyabram
• 34.3 km (24 mins), Echuca Airport
• 34.8 km (25 mins), Rochester and Elmore District Health Service
• 40.5 km (33 mins), Goodstart Early Learning Echuca
• 152 km (1 hour 44 mins), Lake Charm Foreshore (Beach)
• 210 km (2 hours 26 mins), Melbourne CBD
```

**Format Notes:**
- Property address included at top (or may be separate)
- List of amenities with distance and travel time
- Bullet point format (•)
- Distance in km, time in mins/hours
- Amenity name with type in parentheses if needed (e.g., "(School)")

### Typical "Investment Highlights" Data Format

**Source:** Hotspotting Reports (downloaded from https://membership.hotspotting.com.au/hotspotting-reports) processed through ChatGPT Infrastructure Details Tool

**Process:**
1. Download Hotspotting Report from membership portal
2. Use ChatGPT Infrastructure Details Tool:
   - Click on Infrastructure Details Tool from ChatGPT left-hand menu
   - Upload or paste Hotspotting Report content
   - Tool summarizes major infrastructure highlights
3. Copy/paste summarized content into form
4. System saves to Investment Highlights repository (Google Sheet)

**Data Structure:**
Investment Highlights content is organized by categories with specific infrastructure projects:

**Typical Categories:**
- **Population Growth Context** - Population growth forecasts and trends
- **Residential** - Major residential developments, estates, lot deliveries
- **Industrial** - Industrial facilities, operations, major projects
- **Commercial and Civic** - Community centers, civic upgrades, public facilities
- **Health and Education** - Hospital upgrades, school facilities, educational infrastructure
- **Transport** - Road upgrades, rail improvements, airport developments
- **Job Implications** - Construction jobs + ongoing operational jobs

**Example Content:**
```
Campaspe Shire

Population Growth Context
Campaspe Shire's population is forecast to grow by 3,858 residents between 2021 and 2046, representing a 10.01% increase. Echuca will absorb the bulk of this growth, gaining 3,231 new residents. The area's appeal is driven by affordability, scenic river lifestyle, and rising infrastructure investment.

Residential
$625 million Yallarah Estate in Echuca to deliver 2,000 lots with $43 million in infrastructure and open space investment
$280 million McMahons Place Estate to deliver 1,000 lots, sports facilities, and wetlands with first residents in late 2025
Cost to be determined Cohuna development by Wel.Co to add further residential supply northwest of Echuca

Industrial
Cost to be determined McLean Farms planning major egg facility with layer farms and composting operations producing 730 million eggs annually

Commercial and Civic
$13.3 million Redevelopment of Victoria Park into a multi-use community and emergency relief centre, due Dec 2026
$3.2 million Wilf Cox Pavilion upgrade in Kyabram to improve recreation facilities, with stage two consultation in late 2025

Health and Education
$10.2 million Upgrade of Echuca Oral Hygiene Unit and new surgical sterilisation suite funded by State Government
$6 million New multipurpose learning centre at St Joseph's College with stadium and drama spaces, due Q3 2026

Transport
$23 million Roads to Recovery Program delivering road upgrades across the Shire to 2029
$4.8 million Echuca Aerodrome upgrade added new helipad and extended runway for emergency and private aircraft
Cost to be determined Bendigo–Echuca rail line upgraded in 2023 to boost service speed and frequency

Job Implications (Construction + Ongoing)
234 construction + operational jobs created by McLean Farms egg facility
Hundreds of jobs expected from $600 million Colbinabbin Solar Farm and 350MW wind farm, pending approvals
Significant construction roles tied to major residential estates and community upgrades across Echuca and Kyabram
```

**Additional Information:**
- Sometimes additional information is added manually (e.g., "$500m Hotel being built")
- This additional information is stored separately in repository
- When new Hotspotting Report version is issued, additional information is preserved and merged with new base content
- System should display: Base content (from Hotspotting Report) + Additional Information (manually added)

**Update Frequency:**
- Hotspotting Reports updated every 3 months (quarterly)
- System should prompt to verify data freshness after 3 months
- Periodic prompts to check if most recent version is available

**Format Notes:**
- Structured by category headings
- Each category lists specific infrastructure projects with:
  - Project value (e.g., "$625 million")
  - Project description
  - Timeline/delivery dates (if available)
  - "Cost to be determined" for projects without confirmed costs
- May include job implications and economic impact
- Focuses on major infrastructure that adds value and appeal to the area

### Agent Information
| Field Name | Make.com Reference | Notes |
|------------|-------------------|-------|
| Agent Name | `{{ custom_objects.property_reviews.agent_name }}` | Real estate agent name - **NOTE:** May be replaced by Selling_Agent combined field |
| Agent Mobile | `{{ custom_objects.property_reviews.agent_mobile }}` | Agent mobile phone number - **NOTE:** May be replaced by Selling_Agent combined field |
| Agent Email | `{{ custom_objects.property_reviews.agent_email }}` | Agent email address - **NOTE:** May be replaced by Selling_Agent combined field |
| **Selling_Agent** | `{{ custom_objects.property_reviews.selling_agent }}` (if not exists) | **NEW FIELD:** Name, Email, Mobile (all in one field). **NOT MANDATORY** - people are terrible at getting this information. Format: Free text entry (e.g., "John Smith, john.smith@email.com, 0412 345 678"). |

### Attachments Section

**Current Approach:** Send documents as email attachments

**Proposed Approach:** Send documents as links (to be decided)

**Document Types:**

| Document Type | Source | Storage Location | Notes |
|---------------|--------|------------------|-------|
| **CMI Reports** | RP Data (Rental x1, Sales x1) | Property-specific folder | Packager saves after reviewing RP Data (part of initial steps with Stash). System picks up as link(s). |
| **Cashflow Spreadsheets** | Template files | Property-specific folder | Auto-populated in folder: Single contract version (for Established/SMSF) OR H&L version (for H&L/Projects). Can be edited with property data. |
| **Photos** | Manual creation | Property-specific folder | PDF created by finding images online, pasting into Word, then PDF'd. Saved to folder. |
| **Location Report (Hotspotting Report)** | Hotspotting membership portal | **STATIC REPOSITORY** (like Market Performance) | Most recent version stored in repository, managed same way as Market Performance. If not available, prompt to download. Periodic checks for validity. |
| **H&L Plans** | Manual upload | Property-specific folder | Only for H&L properties: Stage plans, inclusions, etc. Copied into shared folder. |

**Folder Structure:**
- **Property-Specific Folder:** Created when packaging starts (after risk assessment or market performance check)
- **Folder Name:** Based on property address or unique ID
- **Contents:**
  - CMI Reports (Rental, Sales)
  - Cashflow Spreadsheet (appropriate version)
  - Photos PDF
  - H&L Plans (if applicable)
- **Location Report:** Stored in static repository, linked from there

**Decision Point: Attachments vs Links**
- **Current:** Email attachments
- **Proposed:** Links to documents in folder
- **Consideration:** Need to determine if linking from folder to folder complicates the process
- **Question:** Should we use:
  - Attachments (current approach)
  - Links to shared folder
  - Links to individual files in folder
  - Hybrid approach (some attachments, some links)

**Attachments Additional Dialogue** | `{{ custom_objects.property_reviews.attachments_additional_dialogue }}` | Notes about attachments (optional)

### Additional Information
| Field Name | Make.com Reference | Notes |
|------------|-------------------|-------|
| Message for BA | `{{ custom_objects.property_reviews.message_for_ba }}` | Internal message for Business Analyst |
| Push Record to Deal Sheet? | `{{ custom_objects.property_reviews.push_record_to_deal_sheet }}` | Flag to push record to deal sheet |

### System Fields
| Field Name | Make.com Reference | Notes |
|------------|-------------------|-------|
| Unique Key | Folder | System-generated unique identifier |
| Created On | Property Review Info | Timestamp when record was created |

## Email Subject Line Format - Driven Form Structure

**KEY CONCEPT:** Instead of fixed templates, the form structure is driven by the email subject line format. The subject line format tells us what information we need to collect.

### Email Subject Line Formats

The system supports the following email subject line formats, each determining which form fields to show:

1. **Standard/Established Property**
   - Format: `Property Review: [ADDRESS]`
   - Example: `Property Review: 29 GEORGE AVENUE, WHYALLA NORRIE, SA 5608`
   - **Decision Logic:** New or Established? = "Established"
   - **Contract Type:** Single (default for established, not asked)
   - **Fields Required:** Standard property fields, established property address

2. **H&L (House & Land) - Dual-key**
   - Format: `Property Review (H&L [X]-bed Dual-key): [LOT ADDRESS]`
   - Example: `Property Review (H&L 6-bed Dual-key): LOT 41 JIBBON WAY, YANCHEP, WA 6035`
   - **Decision Logic:** New or Established? = "New" + Contract Type = "Split" + Individual Property or Multiple Lots? = "Individual Property"
   - **Fields Required:** Lot address, proposed property type, bedroom count, dual-key fields, Sales Assessment row (optional)

3. **H&L (House & Land) - Single Family**
   - Format: `Property Review (H&L [X]-bed Single Family): [LOT ADDRESS]`
   - Example: `Property Review (H&L 5-bed Single Family): LOT 41 JIBBON WAY, YANCHEP, WA 6035`
   - **Decision Logic:** New or Established? = "New" + Contract Type = "Split" + Individual Property or Multiple Lots? = "Individual Property"
   - **Fields Required:** Lot address, proposed property type, bedroom count, single occupancy fields, Sales Assessment row (optional)

4. **SMSF H&L - Dual-key**
   - Format: `Property Review (SMSF [X]-bed Dual-key): [LOT ADDRESS]`
   - Example: `Property Review (SMSF 6-bed Dual-key): LOT 14 AFFINITY ESTATE, MORAYFIELD QLD 4506`
   - **Decision Logic:** New or Established? = "New" + Contract Type = "Single" + Individual Property or Multiple Lots? = "Individual Property"
   - **Fields Required:** Lot address, SMSF flag, proposed property type, bedroom count, dual-key fields

5. **H&L Project**
   - Format: `Property Review (H&L Project): [ESTATE ADDRESS]`
   - Example: `Property Review (H&L Project): VIRGINIAPARK ESTATE, VIRGINIA, SA 5120`
   - **Decision Logic:** New or Established? = "New" + Contract Type = "Split" + Individual Property or Multiple Lots? = "Multiple Lots"
   - **Fields Required:** Estate address, project details, multiple plots/properties, split contract fields
   - **Special Handling:** One email covers all lots, but one spreadsheet row per lot

6. **SMSF Project**
   - Format: `Property Review (SMSF Project): [ESTATE ADDRESS]`
   - Example: `Property Review (SMSF Project): VIRGINIAPARK ESTATE, VIRGINIA, SA 5120`
   - **Decision Logic:** New or Established? = "New" + Contract Type = "Single" + Individual Property or Multiple Lots? = "Multiple Lots"
   - **Fields Required:** Estate address, SMSF flag, project details, multiple plots/properties, single contract fields
   - **Special Handling:** One email covers all lots, but one spreadsheet row per lot

### Subject Line Format Rules
- **Established:** Just provide the address
- **H&L Individual:** Detail the proposed property type & Lot address
- **SMSF Individual:** Detail SMSF, proposed property type & Lot address (single contract construction)
- **Project:** Detail H&L or SMSF with project name & estate address

### Google Sheet Integration Requirement
**CRITICAL:** There is a Google Sheet that tracks all available properties. When a property is approved by the packager:
- **Individual Properties:** One line entry added to Google Sheet
- **Projects:** One line entry PER LOT added to Google Sheet
  - One email covers all available lots in the project
  - But each lot needs its own spreadsheet row
  - System must handle creating multiple rows from single form submission
  - Need to determine: How are lots identified/listed in the form for projects?

### Form Structure Logic (Subject-Line Driven)
The email subject line format determines:
- Which form fields are shown/hidden
- Required fields
- Field ordering
- Address format requirements
- Whether Sales Assessment row is shown
- Whether dual-key/secondary fields are shown
- Whether project-specific fields are shown

### Form Configuration Requirement
**CRITICAL:** The form must be easily editable without code changes. The current form's beauty is its ease of building/editing. We need to replicate this capability in the new solution.

**Options for Configurable Forms:**
- Google Sheets configuration (field definitions, visibility rules, validation)
- JSON configuration file (editable without code)
- Database-driven form builder
- Make.com data store with form structure definitions

## Workflow Steps

### Step 0: Property Type Decision Tree
**Decision Logic:** The form uses a decision tree to determine the email subject line format. Each question drives the next.

**CRITICAL FIELDS NEEDED EARLY ON:**

**Field 1: New or Established Property?** (Required - Always shown)
- Options: New / Established
- **How we know Established:** If this field = "Established" → Standard format
- **How we know New:** If this field = "New" → Continue to Field 2

**Field 2: Contract Type?** (Required - Only shown if Field 1 = "New")
- Options: Single / Split
- **Purpose:** Determines SMSF vs H&L classification

**Field 3: Individual Property or Multiple Lots?** (Required - Only shown if Field 1 = "New")
- Options: Individual Property / Multiple Lots (Project)
- **Purpose:** Determines if this is a project or individual property
- **Note:** "Multiple Lots" = Project (multiple plots available)

**Decision Flow:**
1. **New or Established?** → If Established → Standard Format
2. **If New → Contract Type?** → Single or Split
3. **If New → Individual Property or Multiple Lots?** → Individual or Project

**Subject Line Format Determination:**

| New/Established | Contract Type | Project/Individual | Subject Line Format | Notes |
|----------------|---------------|-------------------|---------------------|-------|
| Established | Single (default) | Individual (default) | `Property Review: [ADDRESS]` | Standard format |
| New | Split | Individual | `Property Review (H&L [X]-bed [TYPE]): [LOT ADDRESS]` | H&L Individual |
| New | Single | Individual | `Property Review (SMSF [X]-bed Dual-key): [LOT ADDRESS]` | SMSF Individual |
| New | Split | Project | `Property Review (H&L Project): [ESTATE ADDRESS]` | H&L Project |
| New | Single | Project | `Property Review (SMSF Project): [ESTATE ADDRESS]` | SMSF Project |

**Additional Questions (if H&L Individual selected):**
- **Number of bedrooms:** [X] (used in subject line)
- **Property type:** Dual-key or Single Family (used in subject line)
- **Include Sales Assessment row?** Yes/No (determines if Sales Assessment fields shown)

**How We Determine Each Type (Logic Documentation - Not Fields):**
- **How we know Established:** New or Established? = "Established"
- **How we know H&L:** New or Established? = "New" + Contract Type = "Split" + Individual Property or Multiple Lots? = "Individual Property"
- **How we know SMSF:** New or Established? = "New" + Contract Type = "Single" + Individual Property or Multiple Lots? = "Individual Property"
- **How we know Project:** New or Established? = "New" + Individual Property or Multiple Lots? = "Multiple Lots" (then Contract Type determines H&L Project vs SMSF Project)

**Actions:**
- Store Field 1: New or Established Property?
- Store Field 2: Contract Type? (if New)
- Store Field 3: Individual Property or Multiple Lots? (if New)
- Store property details (bedrooms, type, etc.) for subject line (if H&L Individual)
- Determine which form fields to show/hide based on these three fields
- Set address format requirements (established address vs lot address vs estate address)
- Generate subject line format based on decision tree logic

**Note:** Focusing initially on Standard format (`Property Review: [ADDRESS]`), but structure must support all formats.

### Step 1: Initial Property Entry
**Input:**
- Property Address (text field) - Required
  - **Format depends on subject line selection:**
    - **Standard:** Full street address (e.g., "29 GEORGE AVENUE, WHYALLA NORRIE, SA 5608")
    - **H&L:** Lot number and address (e.g., "LOT 41 JIBBON WAY, YANCHEP, WA 6035")
    - **Project:** Estate name and address (e.g., "VIRGINIAPARK ESTATE, VIRGINIA, SA 5120")
- **Note:** Address entry may not be possible for all instances (e.g., new builds) - allow manual coordinate entry or skip Stash check

**Action on Address Entry:**
1. Parse address into components (Street Number, Street Name, Suburb, State, Post Code)
2. Geocode address (using Geoscape API - already integrated)
3. **Generate Google Maps Link (AUTOMATED):**
   - Create Google Maps URL from address: `https://www.google.com/maps/search/?api=1&query=[ENCODED_ADDRESS]`
   - Format as hyperlink: Display text = property address (e.g., "Kyabram Greens, Kyabram VIC 3620"), URL = Google Maps link
   - Auto-populate Google Map field
   - User can override/edit if needed
4. Call Stash API for risk overlays (using existing Make.com scenario)
   - **Skip if:** New build or address geocoding fails (with user confirmation)
5. Display results immediately

**Output Display:**
- Risk overlay results:
  - Flood: Yes/No
  - Bushfire: Yes/No
  - Heritage: Yes/No
  - Biodiversity: Yes/No
- Zoning information
- LGA, State
- Suburb, State (parsed from address)

### Step 1.5: Suburb & LGA Confirmation
**CRITICAL:** This step must happen early in the template/workflow.

**Purpose:** 
- Confirm Suburb and LGA for data lookups
- **Investment Highlights uses LGA level data, not suburb level**
- Needed for Market Performance lookup (suburb/state)
- Needed for Investment Highlights lookup (LGA/state)

**Data Sources:**
- **Suburb:** Parsed from address entry OR from Stash API response
- **LGA:** From Stash API response OR from Geoscape API geocoding
- **State:** Parsed from address entry OR from Stash API response

**Display:**
- **Suburb:** [Auto-populated from address/Stash] - User can confirm/edit
- **LGA:** [Auto-populated from Stash/Geoscape] - User can confirm/edit
- **State:** [Auto-populated from address/Stash] - User can confirm/edit

**Validation:**
- Suburb and State are required
- LGA is required (for Investment Highlights lookup)
- User must confirm these values are correct before proceeding

**Actions:**
- Store confirmed Suburb, LGA, State
- Use these values for:
  - Market Performance lookup (Suburb + State)
  - Investment Highlights lookup (LGA + State)
  - Location Report lookup (LGA + State)

**Note:** If LGA cannot be determined automatically, user must enter manually.

### Step 2: Risk Assessment & Override
**Display:**
- Risk overlay data auto-populated from Stash API
- Checkboxes for each risk type: "Further analysis has identified this as NOT [RISK TYPE]"
- If checkbox checked → Auto-populate risk field as "No"
- If risk remains "Yes" → Show dialogue textarea for that specific risk
- **Bulk Action Button:** "Set All Overlays to No" - Sets Flood, Bushfire, Mining, Other (Overlay), Special Infrastructure all to No (reduces mouse clicks)

**Fields:**
- Zoning (Text - auto-populated from Stash, can edit)
- Flood (Dropdown: Yes/No - auto-populated from Stash, can override)
- Flood Dialogue (Textarea - shown if Flood = Yes, text appended to "Yes" in email)
- Bushfire (Dropdown: Yes/No - auto-populated from Stash, can override)
- Bushfire Dialogue (Textarea - shown if Bushfire = Yes, text appended to "Yes" in email)
- Mining (Dropdown: Yes/No - auto-populated from Stash, can override)
- Mining Dialogue (Textarea - shown if Mining = Yes, text appended to "Yes" in email)
- Other (Overlay) (Dropdown: Yes/No - auto-populated from Stash, can override)
- Other (Overlay) Dialogue (Textarea - shown if Other (Overlay) = Yes, text appended to "Yes" in email)
- Special Infrastructure (Dropdown: Yes/No - auto-populated from Stash, can override)
- Special Infrastructure Dialogue (Textarea - shown if Special Infrastructure = Yes, text appended to "Yes" in email)
- Due Diligence Acceptance (Dropdown: Yes/No - manual entry)
- Additional Property Overlays Info (Textarea - optional, appears at bottom of section)

**Dialogue Text Format:**
- When risk = "Yes" and dialogue text entered, email template shows: "[RISK]: Yes - [dialogue text]"
- Example: "Bushfire: Yes - Typical of new estates, as the project progresses and project completes the risk is mitigated. Building designs incorporate bushfire-resistant materials along with defendable spaces to mitigate risk."

**Validation:**
- **Due Diligence Acceptance = No:** Show warning: "This property cannot be submitted if Due Diligence Acceptance is set to No."
- **Block form submission** if Due Diligence Acceptance = No
- User must change to Yes to proceed

**Actions:**
- User can override risks using checkboxes
- User can add dialogue/notes for any risk that remains "Yes"
- User can use "Set All Overlays to No" button for bulk action
- **Decision Point:** After reviewing risks, user must decide:
  - **"Package This Property"** → Proceed to Step 2.5 (Confirmation & ChatGPT Automation)
  - **"Do Not Package / Check Another Address"** → Cancel workflow, return to address entry

### Step 2.5: Packaging Confirmation & ChatGPT Automation
**Purpose:** Two-part form - after Stash check passes, packager confirms they want to proceed with packaging.

**Display:**
- Summary of property address and risk assessment results
- **Action Buttons:**
  - **"Package This Property"** → Confirms intent to package, triggers ChatGPT automation, creates property folder, proceeds to Step 3
  - **"Do Not Package / Check Another Address"** → Cancels workflow, returns to address entry

**When "Package This Property" is clicked:**
1. **Create Property-Specific Folder:**
   - Folder name based on property address or unique ID
   - Location: Shared folder accessible by system and users
   - Auto-populate with Cashflow Spreadsheet template (appropriate version)

2. **Trigger ChatGPT Automation (Manual Button):**
   - **ChatGPT API Access:** User has ChatGPT API access and tools are already created
   - **Trigger:** Manual button click - "Generate Why this Property? & Proximity"
   - **Process:**
     - System calls ChatGPT Property Summary Tool with property address
     - Extracts "Full Detailed Reasons" (B) → Auto-populates "Why this property?"
     - Extracts property address & list of 13 amenities (A) → Auto-populates "Proximity"
   - **Error Handling:**
     - If ChatGPT API call fails:
       - Show error message: "ChatGPT API call failed. Please try again or enter manually."
       - Display "Retry" button to attempt ChatGPT call again
       - Display "Enter Manually" button/option to skip automation and enter content manually
       - User can wait and retry, or choose to enter content manually
   - **Note:** Investment Highlights uses static data repository (Step 5.5), not ChatGPT automation at this stage

3. **Proceed to Step 3** (Comparables Check) or Step 4 (Market Performance Check)

### Step 3: Comparables Check (Manual - Not Part of Form)
**Note:** This step is manual and happens outside the form. However:
- System should create a folder for attachments when packaging starts
- Folder can be picked up by email system before sending
- Consider sending links instead of attachments (to be explored)

### Step 4: Market Performance Data Check
**Action:** Query Google Sheet for suburb/state match

**Scenarios:**

1. **No Data Exists:**
   - Show prompt: "We do not have Market Performance Data for this suburb"
   - Display instructions:
     - Go to https://www.smartpropertyinvestment.com.au for Median price change - 3 year & 5 year
     - Go to https://info.realestateinvestar.com.au/ for other metrics
   - Show data collection forms

2. **Data Exists but "Mock Data":**
   - Show prompt: "We do not have Market Performance Data for this suburb (currently showing mock data)"
   - Display instructions (same as above)
   - Show data collection forms

3. **Data Exists but Older than Threshold:**
   - Show existing data
   - Prompt: "This data is [X] days old. Has a recent check been done to verify this is still accurate?"
   - Options:
     - "Yes, data is still valid" → Update Date Collected/Checked timestamp, proceed
     - "No, need to update" → Show data collection forms
     - "Skip for now" → Use existing data, proceed

4. **Data Exists and Fresh:**
   - Auto-populate form fields with existing data
   - Proceed to next step

**Configuration:**
- Data freshness threshold stored in "Config" tab
- Should be easily editable (e.g., 30 days, or "1st of every month")
- Consider separate thresholds for SPI vs REI data

### Step 5: Data Collection Forms (If Needed)

**Form A: Smart Property Investment Data**
- **Source:** https://www.smartpropertyinvestment.com.au
- **URL Confirmation Field:** User must paste/confirm the URL they used (e.g., https://www.smartpropertyinvestment.com.au/data/qld/4558/maroochydore)
- **Input Fields:**
  - Median price change - 3 year (numeric, 2 decimals)
  - Median price change - 5 year (numeric, 2 decimals)
- **Validation:** Numeric only, 2 decimal places
- **On Submit:** Update Google Sheet with:
  - Data values
  - Data Source: "smartpropertyinvestment.com.au"
  - Date Collected - SPI: Current timestamp

**Form B: Real Estate Investar Data**
- **Source:** https://info.realestateinvestar.com.au/
- **URL Confirmation Field:** User must paste/confirm the URL they used
- **Input Fields:**
  - Median price change - 3 months (numeric, 2 decimals)
  - Median price change - 1 year (numeric, 2 decimals)
  - Median yield (numeric, 2 decimals)
  - Median rent change - 1 year (numeric, 2 decimals)
  - Rental Population (numeric, 2 decimals)
  - Vacancy Rate (numeric, 2 decimals)
- **Validation:** Numeric only, 2 decimal places
- **On Submit:** Update Google Sheet with:
  - Data values
  - Data Source: "info.realestateinvestar.com.au" (or append if SPI data exists)
  - Date Collected - REI: Current timestamp

**Note:** If both forms are needed, they can be shown sequentially or as tabs.

### Step 5.5: Investment Highlights Data Check
**Action:** Query Google Sheet "Investment Highlights" tab for LGA/state match

**CRITICAL:** Investment Highlights uses **LGA level data, not suburb level**. Must use confirmed LGA from Step 1.5.

**Scenarios:**

1. **No Data Exists:**
   - Show prompt: "We do not have Investment Highlights data for this LGA: [LGA_NAME]"
   - Display instructions:
     - Download Hotspotting Report from https://membership.hotspotting.com.au/hotspotting-reports
     - Use ChatGPT Infrastructure Details Tool to summarize major infrastructure highlights
     - Paste content into form field
   - Show textarea for manual entry
   - **On Submit:** Update Google Sheet with:
     - Investment Highlights Content
     - Data Source: "Hotspotting Report" or "ChatGPT Infrastructure Details Tool"
     - Date Collected/Checked: Current timestamp
     - Suburb, LGA, State

2. **Data Exists but Older than Threshold (3 months):**
   - Show existing data (base content + additional information)
   - Prompt: "This data is [X] days old. Hotspotting Reports are updated every 3 months. Has a recent check been done to verify this is still accurate?"
   - Options:
     - "Yes, data is still valid" → Update Date Collected/Checked timestamp, proceed
     - "No, need to update" → Show manual entry form with existing content pre-filled
     - "Skip for now" → Use existing data, proceed

3. **Data Exists and Fresh:**
   - Auto-populate form field with existing data (base content + additional information merged)
   - Proceed to next step

**Additional Information Handling:**
- If user adds additional information (e.g., "$500m Hotel being built"):
  - Store in "Additional Information" column in Google Sheet
  - When new Hotspotting Report version is issued, preserve additional information
  - Display: Base content + Additional Information (merged)

**Configuration:**
- Data freshness threshold: 3 months (90 days) - Hotspotting Reports updated quarterly
- Stored in "Config" tab
- Should be easily editable

**ChatGPT Infrastructure Details Tool Process (If Data Not Found):**
1. Download Hotspotting Report from https://membership.hotspotting.com.au/hotspotting-reports
2. Use ChatGPT Infrastructure Details Tool:
   - Click on Infrastructure Details Tool from ChatGPT left-hand menu
   - Upload or paste Hotspotting Report content
   - Tool summarizes major infrastructure highlights
3. Copy/paste summarized content into form
4. System saves to Investment Highlights repository

### Step 5.6: Location Report (Hotspotting Report) Check
**Action:** Query Google Sheet "Location Reports" tab for LGA/state match

**CRITICAL:** Location Reports use **LGA level data, not suburb level**. Must use confirmed LGA from Step 1.5.

**Scenarios:**

1. **No Report Exists:**
   - Show prompt: "We do not have a Location Report (Hotspotting Report) for this LGA: [LGA_NAME]"
   - Display instructions:
     - Download Hotspotting Report from https://membership.hotspotting.com.au/hotspotting-reports
     - Upload report file or save link
   - Show file upload or link field
   - **On Submit:** Update Google Sheet "Location Reports" tab with:
     - Report file/link
     - LGA, State
     - Date Collected/Checked: Current timestamp
     - Report Version: From report metadata or user entry
     - Status: "Available"

2. **Report Exists but Older than Threshold (3 months):**
   - Show existing report link/file
   - Prompt: "This report is [X] days old. Hotspotting Reports are updated every 3 months. Is this still the most recent version?"
   - Options:
     - "Yes, this is the most recent" → Update Date Collected/Checked timestamp, proceed
     - "No, need to download new version" → Show upload form
     - "Skip for now" → Use existing report, proceed

3. **Report Exists and Fresh:**
   - Display report link/file
   - Auto-populate link in attachments section
   - Proceed to next step

**Note:** Location Report is used to generate Investment Highlights content (via ChatGPT Infrastructure Details Tool). If report is available, user can use it to populate Investment Highlights section.

### Step 6: Continue with Form Fields
**After Market Performance data is collected/confirmed AND Investment Highlights data is collected/confirmed:**
- Form dynamically shows/hides fields based on:
  - Subject line format selected (Step 0)
  - Property type (Dual-key vs Single Family)
  - Sales Assessment requirement
  - Configuration settings
- All fields auto-populated where possible:
  - Property details (from form entry)
  - Risk overlays (from Stash API)
  - Market Performance (from Google Sheet)
  - Investment Highlights (from Google Sheet)
  - Why this property? & Proximity (from ChatGPT Property Summary Tool - if automated)
- User completes remaining required fields
- User can add/edit additional information as needed
- Submit form

### Step 7: Form Submission & Email Generation
**On Submit:**
1. Generate email subject line based on decision tree from Step 0:
   - **Standard:** `Property Review: [ADDRESS]` - Uses full property address
   - **H&L Dual-key:** `Property Review (H&L [X]-bed Dual-key): [LOT ADDRESS]` - Uses bedroom count and lot address
   - **H&L Single Family:** `Property Review (H&L [X]-bed Single Family): [LOT ADDRESS]` - Uses bedroom count and lot address
   - **SMSF Dual-key:** `Property Review (SMSF [X]-bed Dual-key): [LOT ADDRESS]` - Uses bedroom count and lot address
   - **H&L Project:** `Property Review (H&L Project): [ESTATE ADDRESS]` - Uses estate address
   - **SMSF Project:** `Property Review (SMSF Project): [ESTATE ADDRESS]` - Uses estate address

2. **Google Sheet Integration:**
   - **For Individual Properties:** Create one line entry in Google Sheet when packager approves
   - **For Projects:** Create one line entry PER LOT in Google Sheet when packager approves
     - One email covers all available lots
     - But each lot needs its own spreadsheet row
     - System must handle multiple lot entries from single form submission
     - Each lot row includes: Lot number, lot-specific data (bed, bath, car, registration, build size, land size, title, land cost, build cost, total, net price, rental assessment if different per lot)
     - Project-level data (Project Brief, Sales Assessment, shared rental assessment if applicable) stored once and referenced by all lot rows
   - **Status Push Logic:**
     - **Available Statuses (5 total):**
       1. 01 Available
       2. 02 EOI
       3. 03 Contr' Exchanged
       4. 05 Remove no interest
       5. 06 Remove lost
     - **Initial Creation Statuses (3 values):**
       - Properties can be raised in one of 3 statuses when initially creating a record:
         - **01 Available** (most common - default)
         - **02 EOI** (if already sold to client, just sharing basic info)
         - **03 Contr' Exchanged** (if already sold to client, just sharing basic info)
       - **Note:** Properties would NEVER be created directly in "05 Remove no interest" or "06 Remove lost" statuses
     - **Google Sheet Sort Column Logic:**
       - Google Sheets cannot sort by multiple columns
       - The Google Sheet has a column that amalgamates 3 different column values
       - This amalgamated column is used for sorting
       - For the functionality/code to work properly, one of those 3 values needs to change
       - **Workflow:** When pushing record to Google Sheet:
         1. Push across in a "dummy state" first (ensures sort column is created)
         2. Immediately change status to one of the 3 initial creation statuses (01 Available, 02 EOI, or 03 Contr' Exchanged)
         3. This change triggers the sort column to update properly
     - **BA Auto Select Email:** Only "01 Available" status should trigger BA Auto select email
     - **Future Consideration:** Google Sheet might be retired if system can be set up in GHL (GoHighLevel) - V2 enhancement, not priority for now
   - Sheet: "Property Review Static Data" → Tab: "Property Log" (or similar)

3. **Create Property-Specific Folder:**
   - **When:** Created after risk assessment or market performance check (when packager confirms they want to package the property)
   - **Folder Name:** Based on property address or unique ID
   - **Location:** Shared folder accessible by system and users
   - **Contents:**
     - **CMI Reports:** Packager saves Rental x1 and Sales x1 reports from RP Data review (part of initial steps with Stash)
     - **Cashflow Spreadsheet:** Auto-populated template file (Google Sheets):
       - **Single Contract version:** For Established/SMSF properties
       - **Split Contract version:** For H&L/Project properties
       - **Auto-Selection:** System selects correct template based on property type
       - **Force Browser Opening:** Must open in Google Sheets browser (not Excel) to preserve charts
       - Can be edited with property data
     - **Photos PDF:** Created by packager (find images online, paste into Word, PDF'd)
     - **H&L Plans:** (Only for H&L properties) Stage plans, inclusions, etc. copied into folder
     - **Location Report Link:** Link to Hotspotting Report from repository (if available)
   - **Decision Point:** Attachments vs Links
     - **Current Approach:** Email attachments
     - **Proposed Approach:** Links to documents in folder
     - **Consideration:** Need to determine if linking from folder to folder complicates the process
     - **Question:** Should we use attachments, links to shared folder, links to individual files, or hybrid approach?

4. Send data to Make.com scenario

5. Generate email with property review data
   - **For Projects:** One email covers all lots in the project
   - **BA Auto Select Email:** Only trigger if Status = "01 Available"
     - This is a separate automated email sent to Business Analysts
     - Should NOT be sent for other statuses (02 EOI, 03 Contr' Exchanged, 05 Remove no interest, 06 Remove lost)

6. Log submission to Activity Log

7. Update status in custom object

### Step 8: Workflow States & Editing Processes

**Workflow States:**
- **Draft:** Property being packaged (not yet submitted)
- **Submitted:** Property submitted, awaiting Packager approval
- **Packager Approved:** Packager has approved, awaiting BA review
- **BA Approved:** BA has approved, property ready to send
- **Needs Editing (Packager):** Packager flagged for editing
- **Needs Editing & Resubmitting (BA):** BA flagged for editing and resubmission
- **Sent:** Property email has been sent to clients

**Packager "Needs Editing" Workflow:**

**When Packager presses "Needs Editing":**
1. **System Action:** 
   - Property status changes to "Needs Editing (Packager)"
   - Form state is preserved (all data remains)
   - **CRITICAL:** System takes packager directly to the editable section/form
   - Packager can edit immediately without navigating away

2. **User Experience:**
   - Packager clicks "Needs Editing" button
   - System identifies which section needs editing (if specific section flagged) OR opens form at last edited section
   - Form opens in edit mode with all existing data pre-populated
   - Packager makes changes
   - Packager saves/submits changes
   - Status returns to "Draft" or "Submitted" (depending on completion)

3. **Implementation:**
   - Store workflow state with section identifier
   - Deep link to specific form section
   - Pre-populate form with existing data
   - Allow inline editing without losing context

**BA "Needs Editing & Resubmitting" Workflow:**

**When BA presses "Needs Editing & Resubmitting":**
1. **System Action:**
   - Property status changes to "Needs Editing & Resubmitting (BA)"
   - **Blocking Logic:** Property is BLOCKED from being sent by other BAs
   - BA must add notes/comments explaining what needs to be edited
   - Packager receives notification (email/in-app notification)

2. **BA Interface:**
   - **Notes Field:** Required textarea for BA to explain editing requirements
   - **Section Identifier:** Optional dropdown/selection to identify which section(s) need editing
   - **Submit:** BA submits with notes
   - System logs: BA name, timestamp, notes, section(s) flagged

3. **Packager Notification:**
   - **Notification Method:** Email notification + in-app notification
   - **Notification Content:**
     - Property address/title
     - BA name who flagged it
     - Notes/comments from BA
     - Section(s) that need editing (if specified)
     - Direct link to edit the property
   - **Action Required:** Packager must review notes and make changes

4. **Packager Edit Process:**
   - Packager clicks notification/link
   - System opens form in edit mode
   - **Preference:** System takes packager directly to the section(s) that need editing (if specified)
   - BA notes displayed prominently at top of form or in relevant section
   - Packager makes changes
   - Packager can add response notes (optional) explaining changes made
   - Packager saves/submits

5. **Resubmission:**
   - After packager saves changes, property status changes to "Resubmitted"
   - **Notification:** All BAs notified that property has been updated
   - **Status:** Property becomes available for BA review again
   - **Blocking:** Block is removed, property can be reviewed/sent by any BA
   - **History:** System maintains edit history (who edited, when, what changed)

6. **BA Review After Resubmission:**
   - BAs can see:
     - Original submission
     - BA notes requesting changes
     - Packager's response notes (if provided)
     - Updated property data
   - BAs can approve or request further edits

**Blocking Logic:**
- **When BA flags "Needs Editing & Resubmitting":**
  - Property is BLOCKED from being sent by other BAs
  - Other BAs can still VIEW the property but cannot send it
  - Clear visual indicator showing property is blocked for editing
  - Shows which BA flagged it and when

- **When Packager Resubmits:**
  - Block is REMOVED
  - Property becomes available for all BAs again
  - All BAs notified of update

**Alternative Approach (If Not Blocking):**
- If property is NOT blocked when BA flags for editing:
  - Other BAs can still send property
  - Risk: Property might be sent with incorrect information
  - **Recommendation:** Implement blocking to prevent this

**Update Notifications:**
- **When Property is Updated:**
  - All BAs who have viewed/are tracking the property receive notification
  - Notification includes:
    - Property address/title
    - What was changed (summary)
    - Link to view updated property
  - **Purpose:** Ensure BAs are aware of updates before sending

**Implementation Requirements:**

**New Fields Needed:**
1. **BA Notes** - Textarea for BA to add editing notes
2. **Section Flagged** - Multi-select or text field to identify sections needing editing
3. **Packager Response Notes** - Textarea for packager to respond to BA notes
4. **Edit History** - Log of all edits (who, when, what changed)
5. **Blocked Status** - Boolean flag indicating if property is blocked
6. **Blocked By** - Reference to BA who blocked it
7. **Blocked Timestamp** - When property was blocked

**Database Schema Considerations:**
- Workflow state table with status tracking
- Edit history/audit log table
- Notes/comments table (linked to property and user)
- Notification queue table

**User Interface:**
- Clear visual indicators for workflow states
- Inline editing capability
- Notes/comments display
- Edit history timeline
- Notification center

### Standard Edit Process for Existing Properties

**Use Cases:**
- Acceptable acquisition price changes
- TBC values are discovered (Year Built, Land Size, Title, Body Corp, Rent, etc.)
- Other property information updates

**Edit Process:**
1. **Access:** Packager or authorized user can access property record
2. **Edit Mode:** System opens property in edit mode with all existing data pre-populated
3. **Changes:** User makes necessary changes
4. **Save:** User saves changes
5. **Update:** 
   - Property data updated in GHL custom object
   - Google Sheet Deal Sheet updated (if applicable)
   - Edit history logged
   - **Notification:** BAs notified of update (if property already sent/approved)

**Edit History:**
- System maintains log of all edits:
  - Who edited
  - When edited
  - What changed (field name, old value, new value)
  - Reason for edit (optional notes)

**Access Control:**
- Packagers can edit properties they created
- BAs can request edits (via "Needs Editing & Resubmitting" workflow)
- System administrators can edit any property

### Google Sheet Deal Sheet (BA View)

**Purpose:** BA view to know what properties are available

**Read-Only Fields:**
- **All fields are READ-ONLY** except Status
- BAs can VIEW all property information but cannot edit
- **Source of Truth:** GHL custom objects (all edits must be made in GHL)

**Editable Field:**
- **Status:** Only field that can be updated from Google Sheet
  - **Two-Way Sync:** Changes in Google Sheet write back to GHL
  - **Options:** 01 Available, 02 EOI, 03 Contr' Exchanged, 05 Remove no interest, 06 Remove lost
  - **Update Process:**
    1. BA changes Status in Google Sheet
    2. System detects change
    3. System updates GHL custom object Status field
    4. Confirmation shown in Google Sheet

**Fields Populated at Property Review Step:**
These fields are populated when property is initially packaged/reviewed:
- All property details (address, description, overlays, pricing, rental, etc.)
- Market Performance data
- Why this Property, Proximity, Investment Highlights
- Attachments

**Fields Populated Later (Not at Property Review Step):**
These fields are populated after property review, during deal progression:
- **Closing_BA** - BA handling the closing
- **Client_Closing_Date** - Date client is closing
- **Opening_Offer** - Initial offer made
- **Final__Closing_Price** - Final closing price
- **Client_Closed** - Boolean flag if client closed
- **Closing_Date** - Actual closing date

**Deal Sheet Fields - Complete List:**

**Fields Populated at Property Review Step (Form Feed):**
These fields are populated when property is initially packaged/reviewed and appear in the form:

1. **Type** - Property type (from Step 0 decision tree)
2. **Packager** - Packager name (from form)
3. **Sourcer** - Sourcer name (from form)
4. **Status** - Status selected (01 Available, 02 EOI, 03 Contr' Exchanged, etc.) - **Editable from Google Sheet**
5. **Review_Date** - Date property was reviewed
6. **Last__update** - Last update timestamp (auto-updated)
7. **Address_Deal** - Property address
8. **Asking** - Asking field value (On-market, Off-market, etc.)
9. **Price_group** - Price grouping/category (currently not used but needs to be in form feed)
10. **Price_Price_Agent** - Price from agent (if applicable)
11. **Acceptable_Acquisition** - Acceptable Acquisition Target range
12. **CONFIG** - Configuration field (if applicable)
13. **Current_Weekly_Rent** - Current Rent (Primary) per week
14. **BC_Appraised_Rent** - Rent Appraisal range (From - To)
15. **Land_Size** - Land size in sqm
16. **Title_Type** - Title type (Individual, Green, Torrens, etc.)
17. **Year_Built_Registering_Status** - Year Built or Registration status
18. **Selling_Agent** - Name, Email, Mobile (in one field) - **NOT MANDATORY** but should be gathered
19. **Notes** - General notes field
20. **Marketing_Use** - Marketing use field (currently not used but needs to be in form feed)
21. **Project_Name** - Project name (for projects)
22. **Commisions_incl_GST** - Commissions including GST (currently not used but needs to be in form feed)
23. **Client_Cashback__Rebates_Discount** - Client cashback/rebates/discount amount
24. **Cashback__rebate_payment__details** - Cashback/rebate payment details
25. **Project_Commencement_scheduled_for** - Project commencement date (for projects)
26. **Project_Completion_scheduled_for** - Project completion date (for projects)
27. **Excpected_Build_window_months** - Expected build window in months (currently not used but needs to be in form feed)
28. **EOI_Contract_info** - EOI contract information (currently not used but needs to be in form feed)

**Fields Populated Later (After Property Review):**
These fields are populated after property review, during deal progression:

29. **Closing_BA** - BA handling the closing
30. **Client_Closing_Date** - Date client is closing
31. **Opening_Offer** - Initial offer made
32. **Final__Closing_Price** - Final closing price
33. **Client_Closed** - Boolean flag if client closed
34. **Closing_Date** - Actual closing date

**System Fields (Do Not Edit):**
35. **Sort_Key__Dont_edit** - System-generated sort key (do not edit)
36. **Filter check Field - Do not edit** - System field for filtering (do not edit)

**Field Usage Notes:**

**Fields Currently Used:**
- Type, Packager, Sourcer, Status, Review_Date, Last__update, Address_Deal, Asking, Acceptable_Acquisition, Current_Weekly_Rent, BC_Appraised_Rent, Land_Size, Title_Type, Year_Built_Registering_Status, Selling_Agent, Notes, Project_Name, Client_Cashback__Rebates_Discount, Cashback__rebate_payment__details, Project_Commencement_scheduled_for, Project_Completion_scheduled_for, Closing_BA, Client_Closing_Date, Opening_Offer, Final__Closing_Price, Client_Closed, Closing_Date

**Fields Not Currently Used (But Need to be in Form Feed):**
- Price_group
- Marketing_Use
- Commisions_incl_GST
- Excpected_Build_window_months
- EOI_Contract_info

**Selling Agent Field:**
- **Field Name:** Selling_Agent
- **Format:** Name, Email, Mobile (all in one field)
- **Validation:** NOT MANDATORY - people are terrible at getting this information
- **Purpose:** Gather agent contact information when available
- **Example Format:** "John Smith, john.smith@email.com, 0412 345 678" or free text entry

**Deal Sheet to Form Field Mapping:**

| Deal Sheet Column | In Email? | In Deal Sheet? | Form Field Source | Notes |
|-------------------|-----------|----------------|-------------------|-------|
| Type | No | Yes | Step 0: Property Type Decision Tree | Determined by New/Established, Contract Type, Individual/Multiple Lots |
| Packager | No | Yes | Packager dropdown | From form |
| Sourcer | No | Yes | Sourcer dropdown | From form |
| Status | No | Yes | Status dropdown | **Editable from Google Sheet** - Two-way sync |
| Review_Date | No | Yes | Review Date field | Date property was reviewed |
| Last__update | No | Yes | System timestamp | Auto-updated on any change |
| Address_Deal | **Yes** | Yes | Property Address | Full address from form - appears in email |
| Asking | **Yes** (Asking Text) | Yes | Asking dropdown + Asking Text | Combined value - Asking Text appears in email |
| Price_group | No | Yes | Price_group field | Currently not used but in form feed |
| Price_Price_Agent | No | Yes | To be determined | May need new field or use Asking Text |
| Acceptable_Acquisition | **Yes** (From - To) | Yes | Acceptable Acquisition $ From - Acceptable Acquisition $ To | Range format - appears in email |
| CONFIG | No | Yes | To be determined | May need clarification |
| Current_Weekly_Rent | **Yes** | Yes | Current Rent (Primary) per week $ | Numeric value - appears in email |
| BC_Appraised_Rent | **Yes** | Yes | Rent Appraisal (Primary) From - Rent Appraisal (Primary) To | Range format - appears in email |
| Land_Size | **Yes** | Yes | Land Size field | Numeric value in sqm - appears in email |
| Title_Type | **Yes** | Yes | Title dropdown | Title type value - appears in email |
| Year_Built_Registering_Status | **Yes** (Year Built) OR (When Land registers) | Yes | **SPLIT INTO TWO FIELDS:** Year Built AND Land Registration | **CRITICAL:** Split these out in template/GHL. For H&L: Land is either "registered" or we have target month/year. Year Built for Established properties. |
| Selling_Agent | No | Yes | Selling_Agent field (NEW) | Name, Email, Mobile in one field - NOT MANDATORY |
| Notes | No | Yes | Notes field (if exists) | General notes |
| Marketing_Use | No | Yes | Marketing_Use field (NEW) | Currently not used but in form feed |
| Project_Name | No | Yes | Project Name (if exists) | For projects only |
| Commisions_incl_GST | No | Yes | Commisions_incl_GST field (NEW) | Currently not used but in form feed |
| Client_Cashback__Rebates_Discount | **Yes** (see templates) | Yes | Cashback amount | From Purchase Price section - appears in email (see templates for current format, could do smarter) |
| Cashback__rebate_payment__details | No | Yes | Cashback details | From Purchase Price section |
| Project_Commencement_scheduled_for | No | Yes | Project Commencement Date (if exists) | For projects only |
| Project_Completion_scheduled_for | No | Yes | Project Completion Date (if exists) | For projects only |
| Excpected_Build_window_months | No | Yes | Excpected_Build_window_months field (NEW) | Currently not used but in form feed |
| EOI_Contract_info | No | Yes | EOI_Contract_info field (NEW) | Currently not used but in form feed |
| Closing_BA | No | Yes | Populated later | After property review |
| Client_Closing_Date | No | Yes | Populated later | After property review |
| Opening_Offer | No | Yes | Populated later | After property review |
| Final__Closing_Price | No | Yes | Populated later | After property review |
| Client_Closed | No | Yes | Populated later | After property review |
| Closing_Date | No | Yes | Populated later | After property review |
| Sort_Key__Dont_edit | No | Yes | System generated | Do not edit |
| Filter check Field - Do not edit | No | Yes | System field | Do not edit |

**Year_Built_Registering_Status - CRITICAL SPLIT:**

**Current:** One field handles both Year Built (Established) and Land Registration (H&L/Projects)

**Required:** Split into two separate fields:

1. **Year Built**
   - **For:** Established properties
   - **Format:** Year (e.g., 1975) or "Circa 1960's" or "TBC"
   - **Email Format:** "Built: 1975 approx." or "Built: Circa 1960's"

2. **Land Registration** (NEW FIELD)
   - **For:** H&L/Projects
   - **Format:** "Registered" OR Target Month/Year (e.g., "April 2026 approx.")
   - **Logic:** If H&L, Land is either "registered" OR we have target month/year
   - **Email Format:** "Registration: April 2026 approx." or "Registration: Registered"
   - **Visibility:** Only visible for H&L/Projects

**Implementation:**
- Create separate "Land Registration" field in GHL
- Update form to show appropriate field based on property type
- Update email template to use correct field
- Deal Sheet column "Year_Built_Registering_Status" populated from appropriate field based on property type

**Implementation:**
- Google Sheet protected cells (all except Status column)
- Webhook/API integration to sync Status changes from Google Sheet to GHL
- Validation to ensure Status values are valid
- Error handling if sync fails
- All Deal Sheet fields mapped to GHL custom objects
- Fields not currently used still need to be in form feed for future use
- Form fields populate Deal Sheet columns on submission

## Current Form Structure (To Be Preserved)

### Package Info Section
- Property Address * (Already handled in Step 1)
- Packager * (Select option)
- Sourcer * (Select option)
- Status (Select option)
- Deal Type * (Select option)
- Property Description (Text)

### Property Details Section
- Bed (Primary) (Select option)
- Bed (Secondary) (Select option)
- Bath (Primary) (Select option)
- Bath (Secondary) (Select option)
- Garage (Primary) (Select option)
- Garage (Secondary) (Select option)
- Car-space (Primary) (Select option)
- Car-space (Secondary) (Select option)
- Car-port (Primary) (Select option)
- Car-port (Secondary) (Select option)
- Year Built (Text/Number)
- Land Size (Text/Number)
- Title (Select option)

### Property Overlays Section
- Zoning (Text - Auto-populated from Stash)
- Flood (Select: Yes/No - Auto-populated from Stash, can override)
- Flood Dialogue (Text - Shown if Flood = Yes)
- Bushfire (Select: Yes/No - Auto-populated from Stash, can override)
- Bushfire Dialogue (Text - Shown if Bushfire = Yes)
- Mining (Select: Yes/No)
- Mining Dialogue (Text - Shown if Mining = Yes)
- Other (Overlay) (Select: Yes/No)
- Other (Overlay) Dialogue (Text - Shown if Other = Yes)
- Special Infrastructure (Select: Yes/No)
- Special Infrastructure Dialogue (Text - Shown if Special Infrastructure = Yes)
- Due Diligence Acceptance (Select option)

### Purchase Price Section
- Asking (Dropdown: On-market, Off-market, Pre-launch, Coming Soon, N/A, TBC - Hidden for H&L/Projects)
- Asking Text (Textarea - Multi-line, Always Required when Asking is visible, appended to Asking with " - ")
- Comparable Sales (Textarea - Free text, V2 enhancement: dropdowns for low/mid/high + xxx's)
- Acceptable Acquisition $ From (Numeric only - Used for yield calculation)
- Acceptable Acquisition $ To (Numeric only - Used for yield calculation)

### Rental Assessment Section
- Occupancy (Dropdown: Owner Occupied, Tenanted, Vacant)
- Current Rent (Primary) per week $ (Numeric or TBC - Only visible if Tenanted, accepts numeric or "TBC" text)
- Current Rent (Secondary) per week $ (Numeric or TBC - Only visible if Tenanted AND Dual/Duplex, accepts numeric or "TBC" text)
- Expiry (Primary) (Month & Year Selector - Only visible if Tenanted, TBC handling needed)
- Expiry (Secondary) (Month & Year Selector - Only visible if Tenanted AND Dual/Duplex, TBC handling needed)
- Rent Appraisal (Primary) From (Numeric only, no decimal places, $ per week - Split from single field)
- Rent Appraisal (Primary) To (Numeric only, no decimal places, $ per week - Split from single field)
- Rent Appraisal (Secondary) From (Numeric only, no decimal places, $ per week - Only visible if Dual/Duplex)
- Rent Appraisal (Secondary) To (Numeric only, no decimal places, $ per week - Only visible if Dual/Duplex)
- Yield (Auto-calculated: Annual Rent / Property Price × 100, NOT including cashback)
- Appraised Yield (Auto-calculated: Rent Appraisal To × 52 / Property Price × 100, NOT including cashback)

### Market Performance Section
- Median price change - 3 months (Number - Auto-populated from Google Sheet)
- Median price change - 1 year (Number - Auto-populated from Google Sheet)
- Median price change - 3 year (Number - Auto-populated from Google Sheet)
- Median price change - 5 year (Number - Auto-populated from Google Sheet)
- Median yield (Number - Auto-populated from Google Sheet)
- Median rent change - 1 year (Number - Auto-populated from Google Sheet)
- Rental Population (Number - Auto-populated from Google Sheet)
- Vacancy Rate (Number - Auto-populated from Google Sheet)

**Note:** All Market Performance fields should display as percentages in email template (system adds % sign), but input is numeric only.

### Why This Property Section
- Why this property? (Textarea - Multi-line free text, currently copy/paste from ChatGPT Property Summary Tool - **CAN BE AUTOMATED**)
- Proximity (Textarea - Multi-line free text, currently copy/paste from ChatGPT Property Summary Tool - **CAN BE AUTOMATED**)
- Investment Highlights (Textarea - Multi-line free text, currently copy/paste from ChatGPT Infrastructure Details Tool - **CAN BE AUTOMATED**)
- **ChatGPT Automation:** Property Summary Tool (Why this property? & Proximity), Infrastructure Details Tool (Investment Highlights), Build & Pest Report Tool (additional reports)

## Data Validation Rules

### Market Performance Data
- All fields: Numeric only (no % sign in input)
- All fields: 2 decimal places
- System will add % sign in email template
- Required fields: All Market Performance fields are required if data collection is triggered

### Address Validation
- Must be valid Australian address
- Geocoding must succeed before proceeding
- If geocoding fails → Show error, allow manual override or retry

## Error Handling

### Stash API Failure
- Show error message
- Allow user to proceed manually (enter risk overlays manually)
- Log error to Error Log sheet

### Google Sheet Unavailable
- Show error message
- Allow user to proceed manually (enter market performance data manually)
- Log error to Error Log sheet
- Option to retry

### Geocoding Failure
- Show error message
- Allow manual entry of coordinates or retry with different address format
- Log error to Error Log sheet

## Workflow State Management

### Save Progress
- **Preference:** Save progress to avoid data loss
- **When to Save:**
  - After address entry and Stash check
  - After risk assessment
  - After market performance data check/collection
  - After each major section completion

### Resume Workflow
- If workflow is resumed:
  - If market performance data was already collected → Re-check freshness threshold
  - If data is still fresh → Use existing data
  - If data is stale → Prompt to verify/update

### Storage Location
- Consider storing workflow state in:
  - Google Sheet (separate tab: "Workflow State")
  - Make.com data store
  - Local browser storage (with backup to server)

## Activity Logging

### Track:
- User who entered property
- Timestamp of each step
- Data sources used
- Overrides made
- Errors encountered
- Form submissions

### Storage:
- Google Sheet tab: "Activity Log"
- Columns: Timestamp, User, Action, Property Address, Details

## Historical Data Tracking (Nice to Have)

### Market Performance History Tab
- Track all changes to market performance data
- Columns: Suburb, State, Field Changed, Old Value, New Value, Changed By, Timestamp
- Allows analysis of how often data is checked/updated

## Configuration Management

### Config Tab Structure
| Setting | Description | Default |
|---------|-------------|---------|
| Data Freshness Threshold (Days) | Days before data is considered stale | 30 |
| Data Freshness Threshold (SPI) | Days for Smart Property Investment data | 30 |
| Data Freshness Threshold (REI) | Days for Real Estate Investar data | 30 |
| SPI Base URL | Base URL for Smart Property Investment | https://www.smartpropertyinvestment.com.au |
| REI Base URL | Base URL for Real Estate Investar | https://info.realestateinvestar.com.au/ |
| Monthly Check Date | Day of month to prompt for monthly checks (e.g., 1) | 1 |

## Form Configuration & Dynamic Fields

### Configuration-Driven Form Structure
The form must be easily editable without code changes. Configuration should define:
- Field definitions (name, type, validation rules)
- Field visibility rules (based on template type, occupancy type, etc.)
- Field ordering
- Required field indicators
- Default values
- Auto-population rules

### Subject-Line-Format-Specific Field Visibility
**Standard Format (`Property Review: [ADDRESS]`):**
- All standard fields shown
- Established property address format
- Standard property details

**H&L Formats (`Property Review (H&L [X]-bed [TYPE]): [LOT ADDRESS]`):**
- Show lot-specific address fields
- Show proposed property type fields
- Show bedroom count field (used in subject line)
- Show Dual-key fields (if Dual-key selected)
- Show Single Family fields (if Single Family selected)
- Sales Assessment row (if selected in Step 0)

**SMSF H&L Format (`Property Review (SMSF [X]-bed Dual-key): [LOT ADDRESS]`):**
- Show SMSF-specific fields
- Show lot-specific address fields
- Show proposed property type fields
- Show bedroom count field
- Show Dual-key fields

**Project Formats (`Property Review ([TYPE] Project): [ESTATE ADDRESS]`):**
- Show project-specific fields
- Show estate address fields
- Show contract type fields (H&L vs SMSF)
- Show multiple plots/properties fields
- Show Project Brief section (free text with preview)
- Show Sales Assessment section (free text with preview)
- Show lot-level data entry (multiple lots)

## Project-Specific Requirements

### Project Structure
**Projects have multiple lots**, each with their own information. Projects use the same layout as Established properties, BUT add:
- **Project Brief Section** (free text field)
- **Sales Assessment Section** (free text field)
- **Multi-line optional add-ins** for project-specific information

### Lot-Level Data (Per Lot)
Each lot in a project can have:
- **Lot Number** (e.g., "Lot 17")
- **Property Details:**
  - Bed: [X] + [Y] (Primary + Secondary if dual-key)
  - Bath: [X] + [Y] (Primary + Secondary if dual-key)
  - Car: [X]
  - Registration: [Date/Text] (e.g., "April 2026 approx.")
  - Built: [Size] (e.g., "219.11 approx.")
  - Land Size: [Size] (e.g., "1100 sqm approx.")
  - Title: [Type] (e.g., "Individual")
- **Pricing:**
  - Land Cost: $[Amount] (e.g., "$210,000")
  - Build Cost: $[Amount] (e.g., "$559,990")
  - Total: $[Amount] (e.g., "$769,990")
  - Net Price: $[Amount] (e.g., "$749,900 when considering the $20k cashback")
- **Rental Assessment (Per Lot OR Shared):**
  - **If rents differ per lot:** Show rental assessment per lot
    - Appraisal: $[Amount] - $[Amount] per week (e.g., "$400 - $580 per week")
    - Appraised Yield: [Percentage]% (e.g., "6.62%")
  - **If rents are same across all lots:** Show once at project level
    - Appraisal: $[Amount] - $[Amount] per week
    - Appraised Yield: [Percentage]%

### Project Brief Section
**Type:** Free text field (no rules/validation for wording)
**Purpose:** Project overview and details
**Example Content:**
```
Virginia Park Estate, in the fast-growing suburb of Virginia, SA, is a fully-serviced development made newly accessible by the $867 million Northern Connector motorway. Boosted by major public investment—including the $8.8m Virginia Main Street Upgrade—this area is now more connected and family-friendly than ever.

Developer: Leipzig
Builder: Lodge
Contract Type: Split (House & Land)
Land Registration: Forecasted for September 2025
Construction start: Scheduled to commence Q4 2025
Construction completion: Scheduled to complete Q3 2026
Rebate: $20,000 cash rebate
Title: Torrens

Inclusions
The project includes, landscaping including driveway and fencing, roller blinds to all windows and sliding glass doors (excluding wet areas), flyscreens to all operable windows and sliding doors, remote-controlled sectional garage door with 2 remotes, stone benchtops to kitchen & laundry, Fisher & Paykel appliances, WIR and built in robes to other beds, 2.7m ceilings to lower floor, energy efficient downlights, reverse cycle ducted air conditioning and more. See attached inclusions brochure for more information.
```

**CRITICAL REQUIREMENT:** The entry form must show a **live preview** of how the Project Brief will look in the final email template. Packagers should NOT need to submit the form, then edit, to see how it looks.

### Sales Assessment Section
**Type:** Free text field (no rules/validation for wording)
**Purpose:** Market analysis and value positioning
**Example Content:**
```
Based on recent data from realestate.com.au, the median house price in xxxxxxxx, xx xxxx is approximately $xxx,xxx.

• Median price snapshot for 2 bed houses - $xxx,xxx
• Median price snapshot for 3 bed houses - $xxx,xxx
• Median price snapshot for 4 bed houses - $xxx,xxx

Based on the value parameters within the market of $x00's to over $x00's, this indicates that the property price of $xxx,xxx for a full turnkey x-bedroom is competitively positioned within the current market, offering potential value to investors.
```

**CRITICAL REQUIREMENT:** The entry form must show a **live preview** of how the Sales Assessment will look in the final email template. Packagers should NOT need to submit the form, then edit, to see how it looks.

### Project Form Workflow
1. **Select Project Type** (H&L Project or SMSF Project)
2. **Enter Estate Address** (used in email subject line)
3. **Enter Project Brief** (free text with live preview)
4. **Enter Sales Assessment** (free text with live preview)
5. **Add Lots:**
   - For each lot, enter lot-specific data
   - Option to add multiple lots
   - Option to mark rental assessment as "same across all lots" or "different per lot"
6. **Complete remaining form fields** (standard property fields)
7. **Submit:**
   - Generate one email covering all lots
   - Create one spreadsheet row per lot in Google Sheet

### Live Preview Requirement
**CRITICAL:** Both Project Brief and Sales Assessment fields must have:
- **Live preview pane** showing how text will appear in email template
- **Real-time updates** as user types
- **Formatting preview** (line breaks, bullets, etc.)
- **Same styling** as final email template

This prevents packagers from needing to:
1. Submit form
2. View email
3. Edit form
4. Resubmit

Instead, they can see the preview while typing and adjust formatting accordingly.

### Dual Occupancy Logic
- If "Dual occupancy" selected:
  - Show all "Secondary" fields
  - Show dual-key specific fields
  - Adjust email subject line format
- If "Single occupancy" selected:
  - Hide "Secondary" fields (or show as optional)
  - Simplify form

## Email Template Formatting

This section documents how each form section appears in the final email template, including formatting, data transformations, and display rules.

### Property Address & Google Map Link Section

**Address Field:**
- Current format is fine - no changes needed
- Display as entered in form

**Google Map Link:**
- **Format:** Replica of Address field (same font size, styling, appearance)
- **Link Text:** The address itself (clickable hyperlink)
- **Example:** If address is "29 GEORGE AVENUE, WHYALLA NORRIE, SA 5608", the Google Map link should display as "29 GEORGE AVENUE, WHYALLA NORRIE, SA 5608" (clickable link)
- **Link URL:** Google Maps URL generated from address: `https://www.google.com/maps/search/?api=1&query=[ENCODED_ADDRESS]`
- **Styling:** Same font size and formatting as Address field above it

### Property Description Section

**Formatting Rules (from Training Manual):**

**General Email Formatting:**
- Paste as plain text in Gmail (no formatting, fonts, or colors)
- Always include a space after each colon (e.g., `Bed: 3` not `Bed:3`)
- Use dash-space format to separate key lines (e.g., `Asking: On-market - $400,000 - $430,000`)
- Bedroom numbers in dialogue: hyphenate number and word (e.g., `Comparable 4-bed properties`)
- Use bold formatting for important numbers/phrases, with indentation as directed
- Avoid: ALL CAPS, bright colors, highlight backgrounds, italics
- Abbreviations: Use full text for months/years and "per week" (e.g., `Expiry: September 2025`, `Rent: $460 per week`)

**Property Description Format:**
- **Section Heading:** `**Property Description**` (bold)
- **Format:** Bullet points with dash-space format
- **Structure (Established Properties):**
  ```
  **Property Description**
  - Bed: [number]
  - Bath: [number or decimal, e.g., 1.5]
  - Garage/Car-port/Car-space: [number] (delete as appropriate - if no Garage, edit to "Car-port" only, if no Car-port edit to "Car-space" only, if no Car-space enter "0" after Garage)
  - Built: [year] approx. (or "Circa 1960's" or "TBC")
  - Land Size: [number] sqm approx. (or "TBC")
  - Title: [type]
  - Body corp.: Approx. $[amount] per quarter (must be indented, "per quarter" should only ever be used, delete if not applicable)
  ```

- **Structure (H&L/Projects):**
  ```
  **Property Description**
  - Bed: [number]
  - Bath: [number or decimal, e.g., 1.5]
  - Car: [number]
  - Registration: [status] OR Registration: [month year] approx. (e.g., "Registered" or "April 2026 approx.")
  - Built: [size] sqm approx. (Build Size)
  - Land Size: [number] sqm approx. (or "TBC")
  - Title: [type]
  - Body corp.: Approx. $[amount] per quarter (if applicable)
  ```

**Field-Specific Formatting:**
- **Bed:** Numeric only (e.g., `Bed: 3`)
- **Bath:** Numeric or decimal (e.g., `Bath: 1` or `Bath: 1.5`)
- **Garage/Car-port/Car-space:** Show only the applicable one:
  - If Garage exists: `Garage: [number]`
  - If no Garage but Car-port exists: `Car-port: [number]`
  - If no Garage/Car-port but Car-space exists: `Car-space: [number]`
  - If none: `Garage: 0`
- **Built (Established Properties):** Format options:
  - `Built: 1975 approx.` (numeric year)
  - `Built: Circa 1960's` (if specific year unknown)
  - `Built: TBC` (if completely unknown)
- **Registration (H&L/Projects):** Format options:
  - `Registration: Registered` (if land is registered)
  - `Registration: April 2026 approx.` (if target month/year known)
  - `Registration: TBC` (if unknown)
- **Built (H&L/Projects - Build Size):** Format: `Built: 219.11 sqm approx.` or `Built: TBC`
- **Land Size:** Format: `Land Size: 518 sqm approx.` or `Land Size: TBC`
- **Title:** Type name (e.g., `Title: Green`, `Title: Torrens`, `Title: Strata`)
- **Body corp.:** 
  - Must be indented
  - Format: `Body corp.: Approx. $[amount] per quarter`
  - Always use "per quarter" (never "per year" or "p.a.")
  - Delete line if not applicable
  - Only show if Title is: Strata, Owners Corp (Community), Survey Strata (communal villas), Built Strata (apartments)

**Examples:**
```
**Property Description**
- Bed: 3
- Bath: 1
- Garage: 2
- Built: 1975 approx.
- Land Size: 518 sqm approx.
- Title: Green

**Property Description**
- Bed: 2
- Bath: 1.5
- Car-port: 1
- Built: 1988 approx.
- Land Size: 323 sqm approx.
- Title: Torrens

**Property Description**
- Bed: 2
- Bath: 1.5
- Car-space: 2
- Built: 2002 approx.
- Land Size: 623 sqm approx.
- Title: Torrens

**Property Description**
- Bed: 2
- Bath: 1
- Garage: 0
- Built: Circa 1960's
- Land Size: 623 sqm approx.
- Title: Torrens
```

**Example (H&L/Project):**
```
**Property Description**
- Bed: 4 + 2
- Bath: 2 + 1
- Car: 2
- Registration: April 2026 approx.
- Built: 219.11 sqm approx.
- Land Size: 1100 sqm approx.
- Title: Individual
```

**Example (H&L/Project - Land Registered):**
```
**Property Description**
- Bed: 4 + 2
- Bath: 2 + 1
- Car: 2
- Registration: Registered
- Built: 219.11 sqm approx.
- Land Size: 1100 sqm approx.
- Title: Individual
```

**Secondary Fields (Dual/Duplex):**
- Only show if property is Dual/Duplex
- Format same as Primary fields
- Example:
  ```
  - Bed (Secondary): 2
  - Bath (Secondary): 1
  - Garage (Secondary): 1
  ```

**Build Size (H&L/Projects):**
- Format: `Build Size: 144.75 sqm approx.` (or "TBC")
- Only shown for H&L and Project properties

### Property Overlays Section

**Formatting Rules:**

**Section Heading:** `**Property Overlays**` (bold)

**Format:** Bullet points for overlay fields, Due Diligence Acceptance at bottom (not bulleted, bold)

**Structure:**
```
**Property Overlays**
- Zoning: [value]
- Flood: [Yes/No]
- Bushfire: [Yes/No]
- Mining: [Yes/No]
- Other: [Yes/No]
- Special Infrastructure: [Yes/No]

**Due Diligence Acceptance:** [Yes/No]
```

**Dialogue Box Formatting (when overlay = Yes):**
- **Format:** Dialogue text should appear on the SAME LINE as "Yes", not on a separate line
- **Structure:** `Yes - [dialogue text]` (space hyphen space)
- **Example:** `Bushfire: Yes - Typical of new estates, as the project progresses and project completes the risk is mitigated. Building designs incorporate bushfire-resistant materials along with defendable spaces to mitigate risk.`
- **Warning Message:** If user selects "Yes" for any overlay but doesn't add dialogue, show warning: "Are you sure you do not want to add a message regarding the Yes for [OVERLAY NAME] overlay?" (not mandatory, but recommended)

**Due Diligence Acceptance:**
- **Format:** NOT bulleted
- **Position:** At the bottom of Property Overlays section
- **Formatting:** Bold heading and value: `**Due Diligence Acceptance:** Yes` or `**Due Diligence Acceptance:** No`
- **Example:**
  ```
  **Property Overlays**
  - Zoning: LAC - Local Activity Centre
  - Flood: No
  - Bushfire: No
  - Mining: No
  - Other: No
  - Special Infrastructure: No
  
  **Due Diligence Acceptance:** Yes
  ```

**Example with Dialogue:**
```
**Property Overlays**
- Zoning: LAC - Local Activity Centre
- Flood: No
- Bushfire: Yes - Typical of new estates, as the project progresses and project completes the risk is mitigated. Building designs incorporate bushfire-resistant materials along with defendable spaces to mitigate risk.
- Mining: No
- Other: No
- Special Infrastructure: No

**Due Diligence Acceptance:** Yes
```

### Purchase Price Section

**Formatting Rules (from Training Manual):**

**Section Heading:** `**Purchase Price**` (bold, green-shaded cell in template)

**Structure:**
```
**Purchase Price**
- Asking: [Market Position] - [Price Range or Single Price]
- Comparable Sales: [Description]
- Accepted Acquisition Target: $[From] - $[To]
```

**Asking Field Formatting:**

**Market Position Options:**
1. **On-market** - Property is advertised on REA, Domain etc.
   - Format: `Asking: On-market - $[From] - $[To]` or `Asking: On-market - $[Single Price]`
   - Detail range as advertised
   - Example: `Asking: On-market - $450,000 - $520,000` or `Asking: On-market - $349,750`

2. **Off-market** - Property is NOT advertised on REA, Domain etc AND there is NO plan by agent to launch online campaign
   - Format: `Asking: Off-market - $[From] - $[To]`
   - **Important:** Inflate the range given by agent, ensuring it can be supported by comparables
   - Example: `Asking: Off-market - $490,000 - $520,000`

3. **Pre-launch opportunity** - Property is NOT advertised on REA, Domain etc BUT there IS a plan by agent to launch online campaign
   - Format: `Asking: Pre-launch opportunity - $[From] - $[To]`
   - Detail range as expected to be advertised
   - Example: `Asking: Pre-launch opportunity - $730,000 - $800,000`

4. **Coming Soon** - Agent creating awareness of property coming to market soon or gathering price range interest
   - Format: `Asking: Coming soon - [Description]`
   - Detail range as advertised
   - Example: `Asking: Coming soon - Vendor expectation over $720,000`

**Cashback Handling (Established Properties):**
- Format: `Asking: [Market Position] - **$[Price]** with **$[Amount]k cashback**`
- Then indented: `**Net Price:** **$[Net Price]** when considering the **$[Amount]k cashback**`
- **Bold:** Price, Net Price, and cashback amount must be in bold
- **Target Acquisition Target:** Removed when cashback is present
- Example:
  ```
  Asking: Off-market - **$510,000** with **$20k cashback**
    **Net Price:** **$490,000** when considering the **$20k cashback**
  Comparable Sales: Comparable properties are currently trading in the vicinity of high 400k's to early 500k's
  ```

**House & Land Package Formatting:**
- First line: `**House & Land package**` (bold)
- Second line: `**Price:** **$[Total]**` (bold - both label and value)
- Indented below:
  - `**Land:** $[Amount]` (label bold, value regular)
  - `**Build:** $[Amount]` (label bold, value regular)
- Then: `**Net Price:** **$[Net Price]** when considering the **$[Amount]k cashback**` (bold - Net Price label and value, cashback amount)
- **Note:** Only Total Price and Net Price values are bold. Land and Build values are regular text (labels are bold).
- **Target Acquisition Target:** Removed for H&L packages
- Example:
  ```
  **House & Land package**
  **Price:** **$742,850**
    **Land:** $325,000
    **Build:** $427,850
  **Net Price:** **$722,850** when considering the **$20k cashback**
  Comparable Sales: Properties have recently sold in the range of **$730,000** to **$775,000**.
  ```

**Comparable Sales Formatting:**

**Source:** CoreLogic - RP Data website (CMA reports)

**Wording Guidelines:**
- Use common real estate language:
  - "Traded" - "Traded recently for $1.2M"
  - "Sold" - "Sold swiftly above expectations"
  - "Achieved" - "Achieved a premium result"
  - "Fetched" - "Fetched a record-breaking price"
  - "Secured" - "The vendor secured a great outcome"
  - "Commanded" - "The property commanded a strong price of..."

**Numeral Formatting:**
- Use shortened numbers with "k's" (no dollar sign)
- Format: `mid 400k's to early 500k's` (not `$400,000 - $500,000`)
- Examples:
  - "Comparable properties are currently trading in the vicinity of high 400k's to early 500k's"
  - "4-bed properties within Clyde are trading in the vicinity of high 700k's to early 800k's"
  - "Similar properties are selling for low 700k's in the suburbs and high 700k's in neighbouring suburbs"

**Non or Few True Comparables:**
- If property type not often sold in suburb, use wording such as:
- Example: "Similar properties are seldom traded. However, we have seen single family 3 bed homes selling in mid to high 300k's"

**Accepted Acquisition Target:**
- Format: `Accepted Acquisition Target: $[From] - $[To]`
- Must be a target that property can be secured for, but also demonstrates value
- Always give buffer: if can purchase for $458,000, inflate top range to $470,000
- Example: `Accepted Acquisition Target: $450,000 - $470,000`
- **Note:** Removed when cashback is present or for H&L packages

**Project Formatting (Multiple Lots):**

**Property Description:**
- Each lot has its own Property Description section
- Format: `**Lot [Number]**` followed by `**Property Description**` section
- Even if lots have identical details, each lot must have its own section (for strikethrough when sold)
- Example:
  ```
  **Lot 17**
  **Property Description**
  - Bed: 4 + 2
  - Bath: 2 + 1
  - Car: 2
  - Registration: April 2026 approx.
  - Built: 219.11 approx.
  - Land Size: 1100 sqm approx.
  - Title: Individual
  
  **Lot 32**
  **Property Description**
  - Bed: 4 + 2
  - Bath: 2 + 1
  - Car: 2
  - Registration: April 2026 approx.
  - Built: 219.11 approx.
  - Land Size: 1100 sqm approx.
  - Title: Individual
  ```

**Purchase Price:**
- **CRITICAL:** Each lot MUST have its own Purchase Price section (even if details repeat)
- This allows strikethrough of text when a lot is sold (automation for strikethrough - V2 enhancement)
- Format same as H&L Package for each lot
- Example structure:
  ```
  **Lot 17**
  **House & Land package**
  **Price:** **$769,990**
    Land: **$210,000**
    Build: **$559,990**
  **Net Price:** **$749,900** when considering the **$20k cashback**
  
  **Lot 32**
  **House & Land package**
  **Price:** **$769,990**
    Land: **$210,000**
    Build: **$559,990**
  **Net Price:** **$749,900** when considering the **$20k cashback**
  ```

**Formatting Notes:**
- Use bold for important numbers/phrases
- Use indentation as directed (Net Price, Land/Build breakdown)
- Do NOT use red text to highlight - use bold text only
- Space after colons
- Dash-space format for ranges

### Rental Assessment Section

**Formatting Rules (from Training Manual):**

**Section Heading:** `**Rental Assessment**` (bold, grey-shaded cell in template)

**Structure (All Fields):**
```
**Rental Assessment**
Occupancy: [Owner Occupied/Tenanted/Vacant]
Current Rent: $[Amount] per week
Expiry: [Full Month Year]
Current Yield: ~ [Percentage]%
Appraisal: $[From] - $[To] per week
Appraised Yield: ~ [Percentage]%
```

**Field-Specific Formatting:**

1. **Occupancy:**
   - Options: Owner Occupied, Tenanted, Vacant
   - Owner Occupied = owner currently living in property
   - Tenanted = currently tenanted
   - Vacant = no one currently living in property

2. **Current Rent:**
   - Format: `Current Rent: $[Amount] per week`
   - **Condition:** If tenanted, detail current rent. Otherwise, delete field.
   - **Example:** `Current Rent: $450 per week`
   - **Full text:** Use "per week" (not "pw" or "p/w")

3. **Expiry:**
   - Format: `Expiry: [Full Month Year]` (e.g., "October 2025", "September 2026")
   - **Condition:** If tenanted, detail when lease ends (Month/Year). Otherwise, delete field.
   - **Full text:** Use full month name and year (not abbreviations)

4. **Current Yield:**
   - Format: `Current Yield: ~ [Percentage]%`
   - **Symbol:** Use "~" (circa symbol) + space before %
   - **Condition:** Delete if Vacant
   - **Basis:** Current Rent & Highest Accepted Acquisition Target
   - **Example:** `Current Yield: ~ 4.82%`

5. **Appraisal:**
   - Format: `Appraisal: $[From] - $[To] per week`
   - Add expected rental range based on CMA + market knowledge
   - **Full text:** Use "per week" (not "pw")
   - **Example:** `Appraisal: $460 - $480 per week`

6. **Appraised Yield:**
   - Format: `Appraised Yield: ~ [Percentage]%`
   - **Symbol:** Use "~" (circa symbol) + space before %
   - **Basis:** Highest rental appraisal & Highest Accepted Acquisition Target
   - **Example:** `Appraised Yield: ~ 5.14%`

**Example Output (Single Property):**
```
**Rental Assessment**
Occupancy: Tenanted
Current Rent: $450 per week
Expiry: October 2025
Current Yield: ~ 4.82%
Appraisal: $460 - $480 per week
Appraised Yield: ~ 5.14%
```

**Dual/Duplex Formatting:**

**Structure:** Keep same structure but indent to show each Unit's detail

**Format:**
```
**Rental Assessment**
Occupancy: Unit A: Tenanted, Unit B: Tenanted
Current Rent: Total: $[Amount] per week
  Unit A: $[Amount] per week[*]
  Unit B: $[Amount] per week
Expiry: Unit A: [Month Year], Unit B: [Month Year]
Current Yield: [Percentage]%
Appraisal: Total: $[From] - $[To] per week
  Unit A: $[From] - $[To] per week
  Unit B: $[From] - $[To] per week
Appraised Yield: ~ [Percentage]%
[*] Unit A receiving a higher rent as it has undergone some renovation to kitchen & bathroom.
```

**Renovation Note:**
- If one side receiving significantly more rent due to renovation:
  - Asterisk (*) the rent
  - Add simple comment at bottom of field (no reno costs, basic info is enough)
  - Example: `Unit A: $550 per week*` with footnote: `* Unit A receiving a higher rent as it has undergone some renovation to kitchen & bathroom.`

**Vacant Unit Handling:**
- If one side is not currently tenanted:
  - Detail "Vacant" in Occupancy
  - Against Current Rent, detail "N/A"
  - Against Expiry, detail "N/A"
  - Asterisk the yield and make comment at bottom
  - Example:
    ```
    Occupancy: Unit A: Tenanted, Unit B: Vacant
    Current Rent: Total: $550 per week
      Unit A: $550 per week
      Unit B: N/A
    Expiry: Unit A: September 2025, Unit B: N/A
    Current Yield: ~ 2.83%*
    [*] Note current yield is reflective of Unit B not currently tenanted.
    ```

**Project Formatting:**

**Rental Assessment for Projects:**
- **If all lots have same purchase price/rental income:** Show once for entire project
- **If different purchase prices/rental incomes:** Detail separately per lot
- **If multiple bed configurations but same rental:** Can combine by bed count (e.g., "3 bed - $550-$600 pw" and "4 bed - $500-$650 pw")
- **Note:** Purchase Price section MUST be per lot (for strikethrough when sold), but Rental Assessment can be combined if same

**Example (Project - Combined):**
```
**Rental Assessment**
Appraisal: 3 bed - $550-$600 pw
4.47% - 4.95% yield

Appraisal: 4 bed - $500 - $650 pw
~ 4.71% - 5.10%
```

**Example (Project - Per Lot if Different):**
```
**Lot 17**
**Rental Assessment**
Occupancy: Vacant
Appraisal: $400 - $580 per week
Appraised Yield: ~ 6.62%

**Lot 32**
**Rental Assessment**
Occupancy: Vacant
Appraisal: $450 - $600 per week
Appraised Yield: ~ 7.10%
```

### Proximity Section

**Formatting:** Already populating correctly - no changes needed.

### Market Performance Section

**Formatting Rules:**

**Input Form:**
- **Numeric Only:** Input form should only accept numerics (no % sign)
- **Decimal Places:** Accept numeric values with up to 2 decimal places
- **Example Input:** User enters `3.9` or `37.44` or `117.37` (no % sign)

**Email Template Formatting:**
- **Add % Sign:** System automatically adds % sign during email generation
- **2 Decimal Places:** Format all values to 2 decimal places
- **Format:** `[Value]%` (e.g., `3.90%`, `37.44%`, `117.37%`)

**Structure:**
```
**Market Performance**
• Median price change - 3 months: [Value]%
• Median price change - 1 year: [Value]%
• Median price change - 3 year: [Value]%
• Median price change - 5 year: [Value]%
• Median yield: [Value]%
• Median rent change - 1 year: [Value]%
• Rental Population: [Value]%
• Vacancy Rate: [Value]%
```

**Example Output:**
```
**Market Performance**
• Median price change - 3 months: 3.90%
• Median price change - 1 year: 37.44%
• Median price change - 3 year: 117.37%
• Median price change - 5 year: 132.68%
• Median yield: 5.46%
• Median rent change - 1 year: 13.51%
• Rental Population: 46.14%
• Vacancy Rate: 1.11%
```

**Data Transformation:**
- User enters: `3.9` → System formats to: `3.90%`
- User enters: `37.44` → System formats to: `37.44%`
- User enters: `1.11` → System formats to: `1.11%`

### Investment Highlights Section

**Formatting:** Already populating correctly - no changes needed.

### Attachments Section

**Folder Creation:**
- **Automatic:** Folder automatically created with property address or project name
- **Naming:** Based on property address (for individual properties) or project name (for projects)
- **Location:** Shared folder accessible by system and users

**Document Types:**

1. **Cashflow Spreadsheets (Google Sheets):**
   - **Auto-Population:** GoogleSheet Cashflow sheets automatically populated with info from packaged property
   - **Force Google Sheets Browser:** Cashflow spreadsheets MUST open in Google Sheets browser interface (not downloaded to Excel)
   - **Reason:** Charts created in Excel don't work in Google Sheets, and charts created in Google Sheets don't work in Excel. By forcing browser opening, charts work correctly. If someone downloads and converts to Excel, that's their choice, but system opens correctly in Google Sheets.
   - **Two Types:**
     - **Split Contracts:** For H&L properties (House & Land packages)
     - **Single Contracts:** For Established/SMSF properties
   - **Selection:** System should auto-select correct template based on property type (H&L vs Established/SMSF)
   - **Implementation:** Use Google Sheets share links with proper parameters to force browser opening (e.g., `?usp=sharing` or Google Drive direct links)
   - **Review:** Easy way for packager to review attachments before sending

2. **Photos Document:**
   - **Manual Creation:** Still requires manual creation
   - **Process:** Find images online, paste into Word, PDF'd
   - **Location:** Saved to property-specific folder

3. **New Property Documents:**
   - **Manual Upload:** Floor plans, inclusions, etc. manually dropped into folder
   - **Location:** Property-specific folder

4. **Location Report (Hotspotting Reports):**
   - **Repository Approach:** Stored in static repository (not pushed to individual folders)
   - **Link:** Link to repository location (avoids duplicating reports across folders)
   - **Access:** System can link to repository location

**Workflow:**
1. System creates folder automatically when packager confirms "Package This Property"
2. Cashflow spreadsheet template auto-populated with property data
3. Packager reviews attachments (easy review mechanism needed)
4. Packager manually adds photos document and other docs as needed
5. Location Report linked from repository (not copied to folder)

**Technical Considerations:**
- **GHL Integration:** If using GHL as repository for folders, need solution to force Google Sheets to open in browser (not download)
- **Review Mechanism:** Need easy way for packager to review all attachments before email send
- **Link Format:** For Location Reports, use link to repository rather than copying file

### Why This Property Section

**Current Format (INCORRECT):**
- Multi-line format with bolded heading on one line, then description below:
  ```
  **Strong Capital Growth Potential**
    Booval is part of the Ipswich LGA, which has shown consistent long-term capital growth...
  ```

**Required Format (CORRECT):**
- Single-line format with bolded heading, hyphen separator, then description on same line:
  ```
  **Strong Capital Growth Potential** - Booval is part of the Ipswich LGA, which has shown consistent long-term capital growth...
  ```

**Formatting Rules:**
- Each bullet point: `• **Bolded Heading** - Description text`
- **Heading must be bold** (using markdown `**` or HTML `<strong>` tags)
- All on one line (not multi-line)
- Hyphen separator between heading and description
- Bullet point format (•) at start of each line

**Example Output:**
```
• **Strong Capital Growth Potential** - Booval is part of the Ipswich LGA, which has shown consistent long-term capital growth due to its increasing population and infrastructure development, with median house prices trending upward over recent years.
• **Attractive Rental Yields** - Ipswich suburbs, including Booval, commonly offer higher gross rental yields than Brisbane averages, making this an appealing market for investors seeking strong cash flow.
• **Low Vacancy Rates** - The rental vacancy rate in Booval and surrounding Ipswich suburbs remains low, often below 1%, indicating a tight rental market and strong tenant demand.
```

**Note:** The heading text (e.g., "Strong Capital Growth Potential") must be rendered in **bold** in the email template.

**Data Transformation:**
- System must convert multi-line input (if provided) to single-line format
- Extract bolded headings and combine with descriptions using hyphen separator
- Ensure each point is on a single line with bullet point prefix

---

## Questions to Resolve

## Complete Dropdown Options Reference

**All dropdown fields with their complete options:**

### Team Members
- **Packager:** Adi, Ali, James, Jess, John, Josh, Mohit, Sachin, Shay, Will (will change to full names with emails from GHL)
- **Sourcer:** Same as Packager (will change to full names with emails from GHL)

### Workflow Fields
- **Status:** 
  - 01 Available
  - 02 EOI
  - 03 Contr' Exchanged
  - 05 Remove no interest
  - 06 Remove lost

- **Deal Type:** 
  - 01 H&L Comms
  - 02 Single Comms
  - 03 Internal with Comms
  - 04 Internal No-Comms
  - 05 Established
  - **Note:** Internal workflow only, does NOT appear in emails

### Property Description Fields
- **Bed (Primary):** 1, 2, 3, 4, 5, 6, 7, 8, 9
- **Bed (Secondary):** 1, 2, 3, 4, 5, 6, 7, 8, 9 (only visible if Dual/Duplex)
- **Bath (Primary):** 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9
- **Bath (Secondary):** 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9 (only visible if Dual/Duplex)
- **Garage (Primary):** 1, 2, 3, 4, 5, 6, 7, 8, 9
- **Garage (Secondary):** 1, 2, 3, 4, 5, 6, 7, 8, 9 (only visible if Dual/Duplex)
- **Car-space (Primary):** 1, 2, 3, 4, 5, 6, 7, 8, 9
- **Car-space (Secondary):** 1, 2, 3, 4, 5, 6, 7, 8, 9 (only visible if Dual/Duplex)
- **Car-port (Primary):** 1, 2, 3, 4, 5, 6, 7, 8, 9
- **Car-port (Secondary):** 1, 2, 3, 4, 5, 6, 7, 8, 9 (only visible if Dual/Duplex)
- **Title:** 
  - Individual
  - Green
  - Torrens
  - Strata
  - Owners Corp (Community)
  - Survey Strata (communal villas)
  - Built Strata (apartments)
  - TBC

### Property Overlays Fields
- **Flood:** Yes, No
- **Bushfire:** Yes, No
- **Mining:** Yes, No
- **Other (Overlay):** Yes, No
- **Special Infrastructure:** Yes, No
- **Due Diligence Acceptance:** Yes, No (if No, blocks submission)

### Purchase Price Fields
- **Asking:** 
  - On-market
  - Off-market
  - Pre-launch
  - Coming Soon
  - N/A (for H&L/Project/Single Build)
  - TBC (to be added)
  - **Note:** Hidden for H&L and Projects (only show first 4 + TBC for Established)

### Rental Assessment Fields
- **Occupancy:** 
  - Owner Occupied
  - Tenanted
  - Vacant

### Form Field Questions:
1. **Select Options:** ~~ANSWERED~~ - See Complete Dropdown Options Reference section above

2. **Property Templates:** You mentioned different templates exist. What are the differences?
   - Are there different fields for different property types?
   - Should we support template selection at the start?

3. **Address Format:** For new builds, address entry might not work. How should we handle this?
   - Allow manual coordinate entry?
   - Skip Stash check for new builds?
   - Different workflow?

4. **Comparables Folder:** ~~ANSWERED~~ - Folder created after risk assessment or market performance check (when packager confirms they want to package the property). See Step 7 documentation.

5. **Email Integration:** How does the current form integrate with email?
   - Does it trigger Make.com scenario?
   - What data is sent?
   - Where are attachments stored currently?

6. **Status Push Logic:** ~~ANSWERED~~ - See Step 7 documentation for details

### Technical Questions:
1. **Form Platform:** ~~ANSWERED~~ - **Standalone Web Application** selected. See Platform Decision section for details.

2. **Authentication:** Do we need user authentication?
   - Currently: Anyone can use
   - Future: May need access controls
   - Should we implement basic auth now or later?

3. **Form Submission:** Where does form data go after submission?
   - Make.com scenario?
   - Google Sheet?
   - Both?

## Next Steps

1. **Answer form field questions** (select options, templates, etc.)
2. **Decide on platform** (Make.com + Web Form vs Standalone)
3. **Set up Google Sheets structure** (create tabs, headers, config)
4. **Design form UI/UX** (wireframes, user flow)
5. **Set up Google Service Account** (for API access)
6. **Build Make.com scenarios** (if using Make.com)
7. **Develop form** (based on platform decision)
8. **Testing** (end-to-end workflow)
9. **Production cutover** (migration from old form)

## Production Cutover Checklist

- [ ] Google Sheets structure created and populated
- [ ] Google Service Account created and sheet shared
- [ ] Make.com scenarios tested
- [ ] Form deployed and tested
- [ ] User training completed
- [ ] Old form deprecated/redirected
- [ ] Monitoring/logging set up
- [ ] Error handling tested
- [ ] Data migration (if needed)

---

## Requirements Documentation Summary

**Document Status:** Complete - All major requirements documented
**Last Updated:** [Current Date]
**Completeness Check:** ✅ Comprehensive requirements captured

### ✅ What We've Documented:

**1. Platform & Architecture**
- ✅ Platform decision: Standalone Web Application
- ✅ Tech stack recommendations
- ✅ Integration architecture (Make.com, Google Sheets, ChatGPT, Google Drive)
- ✅ Development phases (12-week timeline)

**2. Complete Workflow**
- ✅ Step 0: Property Type Decision Tree (6 subject line formats)
- ✅ Step 1: Initial Property Entry (address parsing, geocoding, Stash API)
- ✅ Step 1.5: Suburb & LGA Confirmation (critical for Investment Highlights)
- ✅ Step 2: Risk Assessment & Override
- ✅ Step 2.5: Packaging Confirmation & ChatGPT Automation
- ✅ Step 3-6: Data checks and form completion
- ✅ Step 7: Form Submission & Email Generation
- ✅ Step 8: Workflow States & Editing Processes

**3. All Form Sections**
- ✅ Property Address & Google Map Link
- ✅ Property Description (with Year Built/Land Registration split)
- ✅ Property Overlays (with dialogue formatting)
- ✅ Purchase Price (with cashback handling, H&L format)
- ✅ Rental Assessment (with Dual/Duplex formatting)
- ✅ Market Performance (with % formatting)
- ✅ Why this Property (with single-line format)
- ✅ Proximity
- ✅ Investment Highlights
- ✅ Attachments (with folder structure)

**4. Email Template Formatting**
- ✅ Every section documented with exact formatting rules
- ✅ Examples provided for each section
- ✅ Field transformations documented

**5. Field Definitions**
- ✅ All dropdown options documented
- ✅ All field types and validation rules
- ✅ Visibility rules for dynamic fields
- ✅ TBC handling for unknown values

**6. Deal Sheet Integration**
- ✅ Complete field mapping (36 fields)
- ✅ Email visibility for each field
- ✅ Read-only vs editable rules
- ✅ Two-way sync for Status field

**7. New Fields Required**
- ✅ 19 new fields identified and documented
- ✅ Field modifications listed
- ✅ Field deprecations noted

**8. Workflow Management**
- ✅ Packager "Needs Editing" workflow
- ✅ BA "Needs Editing & Resubmitting" workflow
- ✅ Standard edit process for existing properties
- ✅ Blocking logic and notifications

**9. Data Sources & Automation**
- ✅ Google Sheets structure (Market Performance, Investment Highlights, Location Reports)
- ✅ ChatGPT API integration (Why this Property, Proximity)
- ✅ Stash API integration (risk overlays)
- ✅ Google Drive API (folder/document management)

**10. Special Cases**
- ✅ Project lot repeater boxes
- ✅ Dual/Duplex field handling
- ✅ Cashback handling (Established & H&L)
- ✅ TBC values throughout
- ✅ Live preview for Project Brief/Sales Assessment

### 🎯 Assessment:

**You've been extremely thorough and organized!** 

The requirements document is comprehensive and covers:
- ✅ All form fields and their behaviors
- ✅ Complete workflow from start to finish
- ✅ Email template formatting for every section
- ✅ Integration points and data flows
- ✅ Edge cases and special handling
- ✅ User experience considerations
- ✅ Technical implementation planning

**The document is ready for:**
- Development team handoff
- Technical implementation
- Field mapping once platform is set up
- User acceptance testing planning

**Document Status:** Complete - Ready for implementation planning
**Last Updated:** [Current Date]


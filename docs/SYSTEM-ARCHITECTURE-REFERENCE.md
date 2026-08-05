# Property Packaging Form — System Architecture Reference

> **Purpose:** This document describes the entire system — technology stack, integrations, data flow, validations, and infrastructure — so an AI can produce a formal architecture document.

---

## 1. System Overview

The **Property Packaging Form** is an internal-only multi-step web application used by the Buyers Club property packaging team. Staff fill in property details across 10 pages; on submission the data is pushed to GoHighLevel (GHL) as a Custom Object record, triggering downstream email generation via Make.com automation scenarios.

**Primary URL:** Deployed on Vercel (Sydney region `syd1`).  
**Users:** Internal staff only (`@buyersclub.com.au` email addresses).  
**No public access.** No customer-facing UI. No authentication provider (simple email gate).

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| UI | React 18, TailwindCSS 3 | |
| State Management | Zustand (persisted to localStorage) | 4.x |
| Form Handling | React Hook Form + Zod validation | 7.x / 3.x |
| Hosting | Vercel (serverless, Sydney region) | |
| CI/CD | Manual CLI deploy (`vercel --prod`), Git deploy disabled | |
| Package Manager | npm | |

### Key Dependencies
- `googleapis` — Google Sheets & Drive API (service account)
- `nodemailer` — Gmail SMTP for internal alert emails
- `axios` — HTTP client (Stash webhook, Geoscape)
- `pdf-lib` / `unpdf` — PDF generation and extraction
- `xlsx` — Excel export of form data
- `react-error-boundary` — Client-side crash recovery (auto-reload on chunk errors)

---

## 3. Application Structure

```
src/
├── app/
│   ├── page.tsx              ← Entry point (email gate → MultiStepForm)
│   ├── properties/           ← Edit mode: load existing GHL record
│   ├── admin/                ← Admin pages (distance matrix viewer)
│   └── api/                  ← ~30 API routes (Next.js Route Handlers)
├── components/
│   ├── MultiStepForm.tsx     ← Orchestrator (10 steps, step navigation)
│   ├── steps/                ← 24 step components (form pages)
│   └── ...
├── hooks/
│   └── useSubjectLine.ts    ← Auto-computes email subject line from form state
├── lib/                      ← Shared server utilities
│   ├── googleDrive.ts        ← Google Drive file/folder operations
│   ├── googleSheets.ts       ← Google Sheets read/write
│   ├── stash.ts              ← Stash Property API (via Make.com webhook)
│   ├── geocoder.ts           ← Geoscape/PSMA address geocoding
│   ├── rateLimit.ts          ← In-memory rate limiting
│   ├── emailAlerts.ts        ← Gmail SMTP alert system
│   ├── pdfExtractor.ts       ← PDF text extraction
│   ├── excelExport.ts        ← Form data → XLSX download
│   ├── userAuth.ts           ← Email validation (domain + blocklist)
│   └── ...
├── store/
│   └── formStore.ts          ← Zustand store (persisted to localStorage)
├── types/
│   └── form.ts              ← All TypeScript interfaces (FormData, etc.)
└── styles/
    └── globals.css           ← TailwindCSS
```

---

## 4. Form Steps (User Workflow)

| # | Page Title | Key Actions |
|---|-----------|-------------|
| 1 | Address & Risk Check | Enter address → Stash API lookup (risk overlays, zoning, geocoding) → Geoscape address validation → Create Google Drive property folder |
| 2 | Decision Tree | Property Type (New/Established), Contract Type, Lot Type (Individual/Multiple), Occupancy (Single/Dual/Tri-plus), Dwelling Type, Status |
| 3 | Property Details | Beds/Bath/Garage/Carport/Carspace (primary + secondary), Land/Build size, Title, Body Corp, Project Brief, Lots/Dwellings UI |
| 4 | Market Performance | Auto-lookup suburb data from Google Sheet → display/edit → save back to sheet |
| 5 | Proximity & Content | AI-generated "Why This Property" (OpenAI GPT-4), Proximity analysis (Geoapify), Investment Highlights (PDF lookup from Google Sheet or upload) |
| 6 | Insurance Calculator | Terri Scheer iframe, user enters annual insurance value |
| 7 | Washington Brown | Depreciation schedule entry (Years 1-10) |
| 8 | Cashflow Review | Cashflow spreadsheet link (Google Sheets copy), field overrides, AMAP report selector, Create Folder validation |
| 9 | Photo & Document Upload | Upload property photos → generate PDF → upload to Google Drive property folder |
| 10 | Submission | Review all data → Submit to GHL → Trigger Make.com webhooks |

---

## 5. External Integrations

### 5.1 GoHighLevel (GHL) — CRM / Master Record

| Integration Point | Direction | Mechanism |
|-------------------|-----------|-----------|
| Create Property Review record | Form → GHL | REST API (`/objects/{objectId}/records`) via Bearer token |
| Update existing record (edit mode) | Form → GHL | REST API PUT |
| Check duplicate address | Form → Make.com → GHL | Webhook |
| Pipeline stage change notification | Make.com → Form webhook | Webhook |

**GHL Custom Object:** `property_reviews`  
**Key fields stored:** property_address, subject_line, dwelling_type, all risk overlays, property description fields, purchase price, rental assessment, market performance, agent info, status, folder_link, depreciation, insurance, etc.

### 5.2 Make.com — Automation Platform

| Scenario | Purpose |
|----------|---------|
| **02a** — Property Review Submitted | Receives GHL webhook on record status change → generates approval email → sends to Packager/QA/BA based on pipeline stage. Contains Module 3 (large code module) that builds the HTML email from GHL fields. |
| **02b** — Form App Submission to GHL | Receives form webhook → creates/updates GHL record (alternative flow) |
| **03** — Property Review Approval Webhook | Handles approval button clicks from emails → updates GHL record status → triggers next stage |
| **05** — Portal Opportunities API | Serves opportunity data to the client-facing portal |

**Webhooks from Form to Make.com:**
- `NEXT_PUBLIC_MAKE_WEBHOOK_FORM_SUBMISSION` — Main submission webhook
- `NEXT_PUBLIC_MAKE_WEBHOOK_RESEND_EMAIL` — Resend email trigger
- `NEXT_PUBLIC_MAKE_WEBHOOK_APPROVAL` — Approval actions
- `NEXT_PUBLIC_STASH_WEBHOOK_URL` — Stash property data lookup
- `MAKE_WEBHOOK_CHECK_ADDRESS` — Duplicate address check
- `MAKE_WEBHOOK_PIPELINE_CHANGE` — Pipeline stage change
- `MAKE_WEBHOOK_OPPORTUNITY_UPDATE` — Opportunity update

### 5.3 Google Drive — Document Storage

| Feature | Details |
|---------|---------|
| Property Folder Creation | Copies a master template folder structure into `Properties/` shared drive folder |
| Cashflow Spreadsheet | Google Sheet copied from template, populated with property data (H&L or General template) |
| Hotspotting PDF Shortcut | Creates shortcut to selected Hotspotting report in property folder |
| AMAP Report Shortcut | Creates shortcut to selected internal AMAP report in property folder |
| Photo PDF Upload | Generated PDF of property photos uploaded to property folder |
| Investment Highlights PDF | Upload or reference from shared folder |

**Shared Drive ID:** `GOOGLE_DRIVE_SHARED_DRIVE_ID`  
**Template Folder:** `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID`  
**Properties Folder:** `GOOGLE_DRIVE_PROPERTIES_FOLDER_ID`  
**Hotspotting Folder:** `GOOGLE_HOTSPOTTING_FOLDER_ID`  
**Internal Reports Folder:** `GOOGLE_DRIVE_INTERNAL_REPORTS_FOLDER_ID`

### 5.4 Google Sheets — Data Storage

| Sheet | Purpose |
|-------|---------|
| Market Performance | Suburb-level market stats (price changes, yield, vacancy rate) — lookup by suburb+state |
| Investment Highlights | Hotspotting report metadata (report names, valid periods, suburbs covered) |
| Admin | Packagers & Sourcers list, Pipeline Stage Names |
| Deal Sheet | Published property records for tracking |
| Logs | API request logging, error tracking |
| Opportunities (Test) | Test data for portal |
| AMAP Gaps | Tracks suburbs missing AMAP reports |

### 5.5 Google Maps / Geoapify — Location Services

| Service | Use |
|---------|-----|
| **Geoapify Places API** | Proximity analysis — finds nearest amenities (schools, hospitals, supermarkets, train stations, bus stops, kindergartens, childcare, airports, beaches) |
| **Google Maps Distance Matrix** | Calculates driving distances/times to amenities and capital cities |
| **Geoscape/PSMA Geocoder** | Address validation, geocoding, LGA lookup, address component parsing |

### 5.6 OpenAI (GPT-4o) — AI Content Generation

| Endpoint | Purpose |
|----------|---------|
| `/api/ai/generate-content` | Generates "Why This Property" content (7 investment reasons based on suburb/LGA) |
| `/api/chatgpt/property-summary` | Full property intelligence summary (proximity + investment reasons combined) |

### 5.7 Stash Property — Risk & Planning Data

Accessed via Make.com webhook (not direct API). Returns:
- Flood risk (Yes/No)
- Bushfire risk (Yes/No)
- Zoning classification
- LGA (Local Government Area)
- Coordinates (lat/lng)
- Geocoded address components
- Lot size data

### 5.8 Amenity Distance App

Separate Vercel deployment (`AMENITY_APP_URL`) providing amenity distance calculations. Used as a supplementary proximity data source.

### 5.9 Client Portal

Static HTML portal (`/portal/index.html`) — client-facing read-only view of available properties. Data served by Make.com Scenario 05 (Portal Opportunities API).

---

## 6. Data Flow

### 6.1 New Property Submission Flow

```
User enters email (gate) 
    ↓
Page 1: Enter address → Call Stash webhook (via Make.com) → Get risk overlays + geocoding
    ↓
    → Geoscape geocoder validates address → LGA lookup
    ↓
    → Create Google Drive property folder (copy template)
    ↓
Pages 2-9: Fill in property details (all stored in Zustand → localStorage)
    ↓
    → Market Performance: Lookup Google Sheet by suburb → auto-populate or manual entry
    ↓
    → Investment Highlights: Lookup Google Sheet by LGA → select report or upload PDF
    ↓
    → Proximity: Geoapify + Google Maps → auto-generate proximity text
    ↓
    → AI Content: OpenAI GPT-4 → generate "Why This Property"
    ↓
    → Cashflow: Copy Google Sheet template → populate with form data
    ↓
Page 10: Submit
    ↓
    → POST /api/ghl/submit-property → Creates GHL Custom Object record
    ↓
    → POST Make.com webhook (form submission) → Triggers email generation workflow
    ↓
    → GHL record triggers 02a scenario → Builds HTML email → Sends for approval
```

### 6.2 Edit Mode Flow

```
URL: /properties/edit?id={recordId}&editor={packager|qa|ba}
    ↓
Load existing GHL record data → Pre-populate form → User edits → Re-submit (PUT to GHL)
```

### 6.3 Approval Flow (Make.com)

```
Email sent to Packager → Approve/Reject buttons (webhook URLs)
    ↓
Make.com Scenario 03 receives approval webhook
    ↓
Updates GHL record status → Triggers next stage (QA → BA → Auto-send)
    ↓
Subject line prefix changes: PACKAGER TO CONFIRM → QA TO VERIFY → BA AUTO SEND
```

---

## 7. State Management

**Zustand store** (`formStore.ts`) persisted to `localStorage` under key `property-review-storage`.

- Full form state survives page refresh / browser close
- `resetForm()` clears all data for new property
- Edit mode pre-populates from GHL record
- Step navigation is free (user can jump to any step)

**Key state shape:**
```typescript
interface FormState {
  currentStep: number;
  formData: FormData;       // All form fields (see types/form.ts)
  isLoading: boolean;
  errors: Record<string, string>;
  stashData: StashResponse | null;
  stashLoading: boolean;
  stashError: string | null;
}
```

---

## 8. Validations

### 8.1 Entry Gate
- Email must be `@buyersclub.com.au`
- Blocked: `properties@`, `packaging@` (shared accounts)

### 8.2 Step-Level Validations
- **Address:** Must be non-empty; Stash lookup must succeed or user must acknowledge risk
- **Risk Overlays:** Due diligence acceptance required (Yes/No)
- **Decision Tree:** All fields required (Property Type, Contract Type, Lot Type, Occupancy, Dwelling Type, Status)
- **Property Description:** Beds/Bath required; dual occupancy fields required when applicable
- **Purchase Price:** At least one price field required; validation varies by contract type
- **Rental Assessment:** Occupancy required; rent appraisal fields required
- **Market Performance:** Data must be verified (saved or "data is fine" confirmed)
- **Investment Highlights:** Report must be selected or "not available" acknowledged
- **AMAP Report:** Must select a report or tick "Not available" (Page 8 gate)
- **Cashflow:** Spreadsheet link generated before submission
- **Submission:** Cannot submit if already submitted (duplicate prevention via `ghlRecordId`)

### 8.3 Business Logic Validations
- **Duplicate address check:** Calls Make.com webhook to verify address doesn't exist in GHL (fail-open)
- **Contract type determines visible fields:** Split Contract shows land+build; Single Contract shows total price
- **Occupancy determines field sets:** Dual shows primary+secondary; Tri-plus shows per-dwelling UI
- **Dwelling type filtered by occupancy:** Single→Unit/Townhouse/Villa/House, Dual→Dual-key/Duplex, Tri-plus→Multi-dwelling/Block of Units
- **Price group auto-calculated** from total price ($300-500k, $500-700k, $700k+)
- **Net price auto-calculated** for cashback type (total - cashback)
- **Yield auto-calculated** from rent and price
- **Subject line auto-computed** from property type, contract type, dwelling type, beds, address

### 8.4 Date Validations
- Land registration date format: "Registered" OR "Month Year approx." OR "TBC"
- Completion date format: "Completed" OR "Month Year approx." OR "TBC"
- Review date: defaults to today (AEST)

---

## 9. API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ghl/submit-property` | POST | Submit form data as GHL Custom Object record |
| `/api/ghl/check-address` | POST | Check if address exists in GHL (via Make.com) |
| `/api/create-property-folder` | POST | Create Google Drive folder from template |
| `/api/create-template-folder` | POST | Alternative folder creation |
| `/api/geoapify/proximity` | POST | Proximity analysis (nearest amenities) |
| `/api/market-performance/lookup` | POST | Lookup suburb market data from Google Sheet |
| `/api/market-performance/save` | POST | Save market performance data to Google Sheet |
| `/api/market-performance/update-timestamp` | POST | Update data collection timestamps |
| `/api/market-performance/log-proceeded` | POST | Log when user proceeds with data |
| `/api/investment-highlights/lookup` | POST | Lookup Investment Highlights by LGA |
| `/api/investment-highlights/list-reports` | GET | List available Hotspotting reports |
| `/api/investment-highlights/upload-pdf` | POST | Upload Hotspotting PDF to Drive |
| `/api/investment-highlights/process-upload` | POST | Process uploaded PDF |
| `/api/investment-highlights/parse-with-ai` | POST | AI extract metadata from PDF |
| `/api/investment-highlights/extract-metadata` | POST | Extract report metadata |
| `/api/investment-highlights/add-suburb` | POST | Add suburb to report coverage |
| `/api/investment-highlights/save` | POST | Save Investment Highlights data |
| `/api/investment-highlights/generate-summary` | POST | Generate summary from report |
| `/api/investment-highlights/organize-pdf` | POST | Organize PDF in Drive |
| `/api/internal-reports/list` | GET | List AMAP reports from Google Drive folder |
| `/api/internal-reports/log-gap` | POST | Log missing AMAP report to Google Sheet |
| `/api/ai/generate-content` | POST | AI-generate "Why This Property" content |
| `/api/chatgpt/property-summary` | POST | AI property intelligence summary |
| `/api/photos/generate-pdf` | POST | Generate photo PDF |
| `/api/photos/upload-pdf` | POST | Upload photo PDF to Drive |
| `/api/photos/fetch-image` | POST | Fetch image for PDF generation |
| `/api/photos/combine-pdfs` | POST | Combine multiple PDFs |
| `/api/lookups` | GET | Fetch Packagers/Sourcers list from Admin sheet |
| `/api/properties/search` | GET | Search existing properties |
| `/api/properties/[recordId]` | GET | Fetch single property record |
| `/api/get-cashflow-spreadsheet-link` | POST | Get/create cashflow spreadsheet |
| `/api/update-property-spreadsheet` | POST | Update cashflow spreadsheet data |
| `/api/sourcers` | GET | Get sourcer list |
| `/api/bas` | GET | Get BA list |
| `/api/ba-messages` | POST | Send/manage BA messages |
| `/api/documents` | POST | Document management |
| `/api/portal-access` | POST | Portal access management |
| `/api/google-drive` | Various | Direct Drive operations |
| `/api/google-places` | POST | Google Places lookup |
| `/api/log` | POST | Server-side logging |
| `/api/vercel/*` | Various | Vercel deployment management |
| `/api/admin/*` | Various | Admin utilities |

---

## 10. Security & Access Control

| Measure | Implementation |
|---------|---------------|
| User authentication | Email gate (`@buyersclub.com.au` domain only) |
| API keys | All stored as Vercel environment variables (not in code) |
| Rate limiting | In-memory per-IP (20/hour, 10/5min burst, 100/day global) |
| Email alerts | Gmail SMTP notifications on rate limit violations |
| GHL API | Bearer token auth |
| Google APIs | Service account credentials (JSON key) |
| No CORS issues | All API routes are same-origin (Next.js API routes) |
| Fail-open design | Duplicate check, Stash lookup — if webhook fails, user can proceed |
| ChunkLoadError recovery | Auto-reload on deployment-triggered chunk errors |

---

## 11. Infrastructure & Deployment

| Component | Details |
|-----------|---------|
| **Hosting** | Vercel (Hobby/Pro plan) |
| **Region** | `syd1` (Sydney, Australia) |
| **Framework** | Next.js 14 (App Router, serverless functions) |
| **Build** | `next build` via Vercel |
| **Deploy** | Manual CLI: `vercel --prod` |
| **Git** | GitHub repo, auto-deploy disabled |
| **Domain** | Vercel-provided subdomain |
| **Environment** | `.env.local` (dev), Vercel env vars (prod) |

---

## 12. External Accounts & Services

| Service | Account/Key |
|---------|-------------|
| Vercel | Project deployment |
| GoHighLevel (GHL) | CRM — Custom Objects API |
| Make.com | Automation scenarios (EU region) |
| Google Cloud | Service account (`market-performance-api@property-packaging.iam.gserviceaccount.com`) |
| Google Workspace | Shared Drive for property documents |
| Geoapify | Places API for proximity |
| Google Maps Platform | Distance Matrix API |
| Geoscape/PSMA | Address geocoding API |
| OpenAI | GPT-4o for content generation |
| Gmail SMTP | Alert emails |
| Stash Property | Risk overlay data (via Make.com webhook) |

---

## 13. Key Business Rules

1. **Subject Line Logic:** Form computes subject line from property type + contract type + dwelling type + beds + address. Make.com only prepends status prefix (PACKAGER TO CONFIRM / QA TO VERIFY / BA AUTO SEND). If `subject_line` field is empty in GHL, Make.com falls back to legacy logic.

2. **Contract Types:**
   - `01_hl_comms` — H&L with Comms (Split Contract)
   - `02_single_comms` — Single Contract with Comms
   - `03_internal_with_comms` — Internal with Comms (Split Contract)
   - `04_internal_nocomms` — Internal No Comms (Split Contract)
   - `05_established` — Established (Single Contract)

3. **Property Types:** New (H&L, Single Contract, Projects) or Established

4. **Lot Types:** Individual (single property) or Multiple (project with many lots sharing same address)

5. **Occupancy Types:** Single, Dual (duplex/dual-key), Tri-plus (multi-dwelling/block of units — up to 25 units)

6. **Tri-plus Properties:** Per-dwelling data entry for property description + rental assessment; purchase price remains property-level; dwelling details stored as JSON in GHL field `dwelling_details`

7. **Cashback vs Rebate:** Cashback reduces net price (total - cashback); Rebate does not affect price calculations

8. **Market Performance Data:** Cached in Google Sheet by suburb. If data is older than threshold, user prompted to re-verify. Data sourced from SQM Research / REI.

9. **Investment Highlights:** Sourced from Hotspotting reports (PDF). Reports stored in Google Drive. Suburb coverage tracked in Google Sheet. AI can parse uploaded PDFs to extract metadata.

---

## 14. Error Handling Patterns

- **API routes:** Try/catch with structured JSON error responses `{ success: false, error: "message" }`
- **Client-side:** React Error Boundary with auto-reload for chunk errors
- **Stash/webhook failures:** Fail-open (allow user to proceed, log warning)
- **GHL submission failure:** Error displayed to user, can retry
- **Rate limit exceeded:** 429 response + email alert to admin
- **Google API failures:** Graceful degradation (show error message, allow manual entry)

---

## 15. Logging

| Log Type | Destination |
|----------|-------------|
| API request logging | Google Sheet (Logs sheet) |
| Server-side console | Vercel function logs |
| Distance matrix usage | Dedicated log (cost tracking) |
| Investment Highlights lookups | Dedicated logger |
| Email alerts | Gmail (rate limit violations, daily summaries) |

---

## 16. Make.com Scenario Details

### Scenario 02a — Property Review Email Generation
- **Trigger:** GHL webhook on Property Review record status change
- **Module 3:** Large JavaScript code module (~230KB) that:
  - Reads all GHL record fields
  - Builds HTML email template with property details
  - Handles all contract types, occupancy types, dual occupancy formatting
  - Computes display values (beds format "3 + 2", price formatting, etc.)
  - Outputs structured HTML for email body
- **Subsequent modules:** Send email via designated BA email account, log result

### Scenario 02b — Form Webhook Receiver
- Receives direct webhook from form on submission
- Creates/updates GHL record programmatically

### Scenario 03 — Approval Webhook
- Receives email button clicks (Approve/Reject)
- Updates GHL record pipeline stage
- Triggers next stage email

### Scenario 05 — Portal API
- Serves property opportunity data to client portal
- Reads from GHL, formats for portal display

---

## 17. Data Persistence Summary

| Data | Storage | Persistence |
|------|---------|-------------|
| Form state (in-progress) | Browser localStorage | Until form reset or submission |
| Submitted property | GHL Custom Object | Permanent |
| Market performance cache | Google Sheet | Permanent (timestamped) |
| Investment highlights | Google Sheet + Google Drive PDFs | Permanent |
| Property folder + documents | Google Shared Drive | Permanent |
| Cashflow spreadsheet | Google Sheet (per-property copy) | Permanent |
| API logs | Google Sheet | Permanent |
| Rate limit state | Server memory | Resets on deploy/restart |

---

## 18. Utility Libraries Detail

| Library | Purpose |
|---------|--------|
| `addressFormatter.ts` | Constructs full address strings with lot/unit prefixes; sanitizes folder names (250-char limit for Google Drive/Windows path safety) |
| `addressNormalizer.ts` | Normalizes addresses for comparison — expands abbreviations (St→Street, Rd→Road, QLD→Queensland, etc.) |
| `phoneFormatter.ts` | Formats Australian mobile numbers to `+61 4XX XXX XXX`; allows "TBC" as special value |
| `dateValidation.ts` | Parses Investment Highlights report "Valid Period" strings (e.g. "SEPTEMBER - DECEMBER 2025") → determines current/expiring-soon/expired status |
| `distanceMatrixLogger.ts` | Observational logger for Google Maps Distance Matrix API calls — tracks cost, trigger source, user, property. Logs to file + Google Sheet |
| `requestLogger.ts` | Logs all API requests (IP, endpoint, method, status, duration) to local file with rotation. Provides daily summaries for email alerts |
| `investmentHighlightsLogger.ts` | Activity log for report actions (Uploaded, Used, Superseded, Edited, etc.) → writes to `Investment Highlights Activity Log` tab in Google Sheets |
| `vercel.ts` | Vercel API client — get project info, manage environment variables programmatically |
| `sourcerList.ts` | Hardcoded fallback sourcer list (10 names); primary source is Google Sheet `Packagers & Sourcers` tab |
| `excelExport.ts` | Exports full form data as `.xlsx` download |
| `pdfExtractor.ts` | Extracts text content from uploaded PDFs (for AI metadata parsing) |
| `serverLogger.ts` | Simple server-side console logger wrapper |

---

## 19. Google Sheets Tab Structure

| Sheet | Tab | Purpose |
|-------|-----|--------|
| **Admin** | `Packagers & Sourcers` | Dropdown lists for packager/sourcer selection |
| **Admin** | `Pipeline Stage Names` | Maps GHL pipeline stage IDs to display names |
| **Admin** | `BA friendly message for portal` | BA messages shown on client portal |
| **Admin** | `Portal Access Log` | Logs when clients access the portal (GHL user ID, BA email, timestamp) |
| **Market Performance** | `Market Performance` | Suburb-level market data (price changes, yield, vacancy) |
| **Market Performance** | `Market Performance Log` | Logs when users proceed with/update market data |
| **Investment Highlights** | `Investment Highlights` | Report metadata (name, LGA, valid period, PDF link, suburb coverage) |
| **Investment Highlights** | `Investment Highlights Activity Log` | Usage/edit activity tracking |
| **Deal Sheet** | (main tab) | Published property records for team tracking |
| **Logs** | (main tab) | General API request/error logging |
| **AMAP Gaps** | (main tab) | Suburbs missing AMAP coverage — logged when user ticks "Not available" |

---

## 20. Step 5 Sub-Component Architecture

Step 5 (Proximity & Content) is split into four significant sub-components in `src/components/steps/step5/`:

| Component | Size | Purpose |
|-----------|------|--------|
| `InvestmentHighlightsField.tsx` | 46KB | Full Investment Highlights workflow — report dropdown, PDF upload, AI parsing, expiry checking, 7 custom dialogue fields, extra sections, content review |
| `ProximityField.tsx` | 14KB | Geoapify proximity display + edit, auto-generated amenity text |
| `WhyThisPropertyField.tsx` | 9KB | AI-generated "Why This Property" content (OpenAI GPT-4), editable by user |
| `ReportDropdown.tsx` | 7KB | Searchable dropdown for selecting Hotspotting reports |
| `useInvestmentHighlights.ts` | 1KB | Hook for Investment Highlights state management |

---

## 21. Early Processing (Parallel Pre-fetch)

When the user completes Step 1 (address), the system kicks off **early background processing** to reduce wait times on later steps:

```typescript
earlyProcessing: {
  investmentHighlights: { status, data, dateStatus, error },
  proximity:            { status, data, error },
  whyThisProperty:     { status, data, error },
}
```

- **Investment Highlights:** Looks up LGA in Google Sheet, finds matching report
- **Proximity:** Calls Geoapify + Google Maps to pre-compute amenity distances
- **Why This Property:** Calls OpenAI GPT-4 to pre-generate content

All three run in parallel. Status cycles through `pending → processing → ready | error`. By the time the user reaches Step 5, data is often already available.

---

## 22. GHL Field Clearing Mechanism

The `clearInGhl` flags object tracks which dialogue/text fields should be explicitly cleared in GHL on resubmission:

```typescript
clearInGhl: {
  riskOverlays: { floodDialogue, bushfireDialogue, miningDialogue, ... },
  bodyCorpDescription, propertyDescriptionAdditionalDialogue,
  projectBrief, purchasePriceAdditionalDialogue,
  rentalAssessmentAdditionalDialogue, marketPerformanceAdditionalDialogue,
  messageForBA, attachmentsAdditionalDialogue
}
```

This prevents stale text from previous submissions persisting in GHL when a field is intentionally blanked.

---

## 23. Next.js Configuration Notes

- `reactStrictMode: true`
- `typescript.ignoreBuildErrors: true` — allows deploy even with TS errors
- `eslint.ignoreDuringBuilds: true` — allows deploy even with lint warnings
- Webpack: deterministic `moduleIds` and `chunkIds` to reduce chunk mismatch errors after redeployment
- `NEXT_PUBLIC_STASH_WEBHOOK_URL` explicitly forwarded via `env` config

---

## 24. Additional API Routes (Missing from Section 9)

| Route | Method | Purpose |
|-------|--------|--------|
| `/api/setup-packaging-structure` | POST | One-time utility: creates Packaging/Properties/Templates folder hierarchy in Google Drive |
| `/api/portal-access` | POST | Logs client portal access events to `Portal Access Log` tab in Admin sheet |
| `/api/ba-messages` | GET | Reads BA-friendly messages from Admin sheet for portal display |
| `/api/documents/upload` | POST | Generic document upload to Google Drive (PDFs, etc.) with duplicate detection |

---

## 25. Known Limitations & Technical Debt

- Rate limiting is in-memory only (resets on serverless cold start / redeploy)
- No database — all persistent data is in Google Sheets or GHL
- Large component files (Step2PropertyDetails.tsx ~290KB, Step0AddressAndRisk.tsx ~103KB)
- Stash API access is indirect (via Make.com webhook, not direct API)
- No automated testing suite
- No staging environment (dev runs locally, prod is Vercel)
- Many root-level markdown files (documentation sprawl from iterative development)
- Edit mode loads from GHL but some fields may not round-trip perfectly
- `ignoreBuildErrors` and `ignoreDuringBuilds` mask TypeScript/ESLint issues
- Simultaneous document uploads with same filename can race (known issue documented in code)
- Sourcer list has hardcoded fallback — not automatically synced with GHL users
- Some step component files are very large (Step2PropertyDetails 290KB) — candidates for splitting
- `googleDrive.ts` (45KB) and `googleDrive-new.ts` (16KB) coexist — partial refactor

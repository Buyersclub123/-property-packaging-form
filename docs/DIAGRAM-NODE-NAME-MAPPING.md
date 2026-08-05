# Architecture Diagram — Node Name Mapping

> Give this list to the AI agent so it can recreate the diagrams with friendly descriptive names instead of technical shorthand.

---

## Diagram 1: High-Level Business Architecture

| Technical Node ID | Friendly Descriptive Name |
|---|---|
| `Staff` | Internal Staff (Buyers Club employees) |
| `Gate` | Email Authentication Gate — only @buyersclub.com.au addresses allowed; shared accounts (properties@, packaging@) blocked |
| `Form` | Property Packaging Form — Next.js web application hosted on Vercel (Sydney region) |
| `GHL` | GoHighLevel CRM — Master Record Store (Custom Object: property_reviews) |
| `Drive` | Google Shared Drive — property folders, PDF documents, report shortcuts, cashflow spreadsheet copies |
| `Sheets` | Google Sheets — Market Performance data, Investment Highlights metadata, Admin lists, Deal Sheet, Logs, AMAP Gaps |
| `Stash` | Stash Property Risk Lookup — risk overlays (flood, bushfire), zoning, LGA, lot size (accessed via Make.com webhook) |
| `Geo` | Geoscape / PSMA Geocoder — address validation, geocoding, Local Government Area (LGA) lookup |
| `Places` | Geoapify Places API + Google Maps Distance Matrix — proximity analysis and driving distance calculations to amenities |
| `OpenAI` | OpenAI GPT-4o — AI content generation for "Why This Property" investment reasons and property intelligence summaries |
| `Amenity` | Amenity Distance App — supplementary proximity data source (separate Vercel deployment) |
| `Make02b` | Make.com Scenario 02b — Form Submission Relay to GHL (receives form webhook, creates or updates GHL record) |
| `Make02a` | Make.com Scenario 02a — Property Review Email Builder (triggered by GHL record status change, builds HTML approval email from GHL fields) |
| `Approval` | Approval Email — sent to Packager, QA, or BA depending on pipeline stage |
| `Make03` | Make.com Scenario 03 — Approval Webhook Handler (receives email button clicks, updates GHL pipeline stage and status) |
| `Make05` | Make.com Scenario 05 — Portal Opportunities API (serves property data to client portal) |
| `Portal` | Client Portal — read-only static HTML page showing available properties to clients |
| `Gmail` | Gmail SMTP — internal alert emails for rate limit violations and daily usage summaries |

---

## Diagram 2: Functional Solution Architecture

### Browser Client Layer

| Technical Node ID | Friendly Descriptive Name |
|---|---|
| `Staff` | Internal Staff User |
| `Gate` | Application Entry Point (page.tsx) — email authentication gate |
| `Multi` | Multi-Step Form Orchestrator (MultiStepForm.tsx) — manages 10 form pages and step navigation |
| `Steps` | Form Step Components — 24 individual step components in components/steps/ |
| `Store` | Zustand State Store (formStore.ts) — form data persisted to browser localStorage under key "property-review-storage" |

### Vercel Serverless API Layer

| Technical Node ID | Friendly Descriptive Name |
|---|---|
| `API` | API Route Hub — approximately 30 Next.js Route Handlers under app/api/ |
| `GhlAPI` | GHL Integration Routes — submit property to CRM, check for duplicate addresses, fetch existing property records for editing |
| `DriveAPI` | Google Drive & Cashflow Routes — create property folders, generate cashflow spreadsheet links, update spreadsheet data |
| `MarketAPI` | Market Performance Routes — lookup, save, and log suburb-level market data from Google Sheets |
| `IHAPI` | Investment Highlights Routes — lookup reports by LGA, upload/parse Hotspotting PDFs, AI metadata extraction, manage report coverage |
| `ProxAPI` | Proximity & Location Routes — Geoapify amenity search and Google Maps/Places distance calculations |
| `AiAPI` | AI Content Generation Routes — "Why This Property" content via GPT-4o, full property intelligence summaries |
| `PhotoAPI` | Photo Management Routes — generate photo PDFs, upload to Google Drive, combine multiple PDFs |
| `AdminAPI` | Admin & Lookup Routes — fetch packager/sourcer lists, BA messages, pipeline stage names from Admin Google Sheet |
| `Libs` | Shared Server Utility Libraries — Google Drive operations, Google Sheets client, Stash webhook, Geoscape geocoder, rate limiter, email alerts, PDF extraction, Excel export, user authentication |

### External Services

| Technical Node ID | Friendly Descriptive Name |
|---|---|
| `GHL` | GoHighLevel CRM — Master Record Store (property_reviews custom object with all submitted property data, status, subject line, risk overlays, pricing, rental, and folder link) |
| `Make02a` | Make.com Scenario 02a — Property Review Email Builder (builds approval email HTML from GHL fields) |
| `Email` | Approval Email — sent to Packager / QA / BA with approve/reject action buttons |
| `Make03` | Make.com Scenario 03 — Approval Webhook Handler (updates GHL pipeline stage on approve/reject) |
| `Make02b` | Make.com Scenario 02b — Form Submission Relay to GHL (alternative submission path) |
| `Make05` | Make.com Scenario 05 — Portal Opportunities API (serves property data to client-facing portal) |
| `Portal` | Client Portal — static HTML page for clients to view available properties |
| `GoogleDrive` | Google Shared Drive — property folders, template folder, Hotspotting/AMAP report storage |
| `GoogleSheets` | Google Sheets — Market Performance, Investment Highlights, Admin lists, Deal Sheet, Logs |
| `Maps` | Geoapify Places API + Google Maps Distance Matrix — amenity proximity and driving distance services |
| `Geo` | Geoscape / PSMA — Australian address geocoding and validation service |
| `OpenAI` | OpenAI GPT-4o — large language model for content generation |
| `Stash` | Stash Property — property risk and planning data (accessed via Make.com webhook) |
| `Gmail` | Gmail SMTP — internal alert email delivery |

---

## Diagram 3: Security & Data Storage Architecture

### Access Control & Client Layer

| Technical Node ID | Friendly Descriptive Name |
|---|---|
| `Staff` | Internal Staff User |
| `Gate` | Email Authentication Gate — domain-restricted to @buyersclub.com.au, shared accounts blocked |
| `Browser` | Browser Form Session — client-side application running in user's browser |
| `LocalStorage` | Browser Local Storage — persists in-progress form data under key "property-review-storage" (survives page refresh) |
| `SameOrigin` | Same-Origin API Access — all API calls are same-origin Next.js routes, no CORS configuration needed |

### Security & Server Infrastructure

| Technical Node ID | Friendly Descriptive Name |
|---|---|
| `API` | Next.js Serverless API Routes — hosted on Vercel in Sydney (syd1) region |
| `Env` | Vercel Environment Variables — all API keys, tokens, and secrets stored securely outside source code |
| `RateLimit` | Rate Limiter (rateLimit.ts) — in-memory per-IP tracking: 20 requests/hour, 10 requests/5min burst, 100 requests/day global limit |
| `Alerts` | Email Alert System (emailAlerts.ts) — sends Gmail SMTP notifications on rate limit violations |
| `GHLToken` | GHL API Authentication — Bearer token authorising REST API access to GoHighLevel |
| `GoogleSA` | Google Service Account — JSON key credentials for Google Sheets and Drive API access |
| `Webhooks` | Make.com Webhook URLs — form submission, duplicate address check, approval actions, pipeline stage changes |
| `Memory` | Server Memory — ephemeral rate limit state (resets on every Vercel deploy or cold start) |
| `VercelLogs` | Vercel Function Logs — server-side console output for debugging and monitoring |
| `FailOpen` | Fail-Open Safety Paths — duplicate address check and Stash risk lookup are non-blocking; if they fail, user proceeds with a warning |

### Permanent Data Stores

| Technical Node ID | Friendly Descriptive Name |
|---|---|
| `GHL` | GoHighLevel CRM — Permanent Store for submitted property records, pipeline stages, status tracking, subject lines, and all business fields |
| `Sheets` | Google Sheets — Market Performance cache, Investment Highlights report metadata, Admin reference lists, Deal Sheet tracking, API logs, AMAP coverage gaps |
| `Drive` | Google Shared Drive — property folders, property photo PDFs, Investment Highlights report PDFs, AMAP report shortcuts, cashflow spreadsheet copies |
| `Make` | Make.com Automation Platform — runs scenarios that read/update GHL records and send approval emails |
| `Email` | Approval Emails — sent to Packager / QA / BA with action buttons for the review workflow |

---

## Edge / Connection Labels

These are the connection labels used between nodes. Keep these when recreating:

### Diagram 1
- Staff → Gate: *(no label)*
- Gate → Form: *(no label)*
- Form → GHL: **"Create / update record via /api/ghl/submit-property"**
- Form → Drive: *(no label)*
- Form → Sheets: *(no label)*
- Form → Stash/Geo/Places/OpenAI/Amenity: *(no label, property enrichment connections)*
- Form → Make02b: *(no label)*
- Make02b → GHL: **"create/update"**
- GHL → Make02a: **"record status change"**
- Make02a → Approval: *(no label)*
- Approval → Make03: *(no label)*
- Make03 → GHL: **"updates GHL status"**
- GHL → Make05: **"property opportunity data"**
- Make05 → Portal: *(no label)*
- Form → Gmail: *(no label)*

### Diagram 2
- GhlAPI → GHL: **"POST create / PUT update / GET edit mode"**
- GHL → Make02a: **"webhook on record status change"**
- Make03 → GHL: **"updates GHL pipeline stage / status"**
- GHL → Make05: **"read opportunity data"**

### Diagram 3
- GHLToken → GHL: **"authorises REST API access"**
- API → GHL: **"create / update / read"**
- GHL → Make: **"record status change webhook"**
- Make → GHL: **"reads / updates status"**

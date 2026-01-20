# 5-Day Build Plan - Property Packaging Form

## What We're Building
**A new property packaging form** that replaces the existing form feed, with:
- Multi-step workflow
- Dynamic form fields
- Google Sheets integration
- ChatGPT automation
- Email generation
- Deal Sheet sync

## What Already Exists (Leverage This!)
- ✅ GHL Custom Objects (all fields exist)
- ✅ Make.com scenarios (webhooks, Stash integration)
- ✅ GHL API access (writing back works)
- ✅ Portal code (for reference)
- ✅ Email template code (Module 3)

---

## Day 1: Form Foundation & Core Fields (8 hours)

### Morning (4 hours)
**1. Set up form project**
- [ ] Choose platform: Next.js/React (recommended) OR standalone HTML/JS
- [ ] Set up basic form structure
- [ ] Form state management (localStorage for persistence)
- [ ] Basic routing/navigation

**2. Core form fields**
- [ ] Property Address input
- [ ] Address parsing (street number, street name, suburb, state, postcode)
- [ ] Google Maps link generation (automated)
- [ ] Packager/Sourcer dropdowns (pull from GHL API)
- [ ] Status dropdown
- [ ] Deal Type dropdown

### Afternoon (4 hours)
**3. Property Description section**
- [ ] Bed/Bath/Garage/Car-space/Car-port dropdowns (Primary)
- [ ] Secondary fields (show/hide based on Dual/Duplex)
- [ ] Year Built (numeric, TBC, Circa support)
- [ ] Land Size (numeric, TBC)
- [ ] Title dropdown (with TBC)
- [ ] Body Corp (numeric, TBC, mandatory for certain titles)

**4. Basic validation**
- [ ] Numeric validation
- [ ] Required field validation
- [ ] TBC handling

**Deliverable:** Working form with core fields, can save/load state

---

## Day 2: Workflow Steps & Stash Integration (8 hours)

### Morning (4 hours)
**1. Step 0: Decision Tree**
- [ ] Three critical fields: New/Established, Contract Type, Individual/Multiple Lots
- [ ] Decision logic implementation
- [ ] Subject line format determination
- [ ] Dynamic field visibility based on decisions

**2. Step 1: Address Entry & Geocoding**
- [ ] Address parsing (already done)
- [ ] Geocoding integration (Geoscape or Google Geocoding API)
- [ ] Suburb/LGA confirmation step
- [ ] Store confirmed values

### Afternoon (4 hours)
**3. Step 2: Stash Integration**
- [ ] Connect to existing Make.com Stash webhook
- [ ] Call Stash API with address
- [ ] Display risk overlays (Flood, Bushfire, Mining, etc.)
- [ ] Override checkboxes
- [ ] Dialogue textareas (show when risk = Yes)
- [ ] "Set All Overlays to No" button
- [ ] Due Diligence Acceptance (block submission if No)

**4. Step 2.5: Packaging Confirmation**
- [ ] "Package This Property" button
- [ ] Create property folder (Google Drive API)
- [ ] Store property state

**Deliverable:** Complete workflow Steps 0-2.5, Stash integration working

---

## Day 3: Google Sheets & Data Sections (8 hours)

### Morning (4 hours)
**1. Google Sheets API Setup**
- [ ] Set up Google Service Account (if not done)
- [ ] Test API access
- [ ] Read Market Performance data (by Suburb/State)
- [ ] Read Investment Highlights data (by LGA/State)
- [ ] Read Location Reports data (by LGA/State)

**2. Market Performance Section**
- [ ] Auto-populate from Google Sheet
- [ ] Handle "no data" scenario (show data collection forms)
- [ ] Handle "Mock Data" scenario (prompt for real data)
- [ ] Handle "stale data" scenario (prompt for update)
- [ ] Data collection forms (Smart Property Investment + Real Estate Investar)
- [ ] Write to Google Sheet

### Afternoon (4 hours)
**3. Purchase Price Section**
- [ ] Asking dropdown (On-market, Off-market, Pre-launch, Coming Soon, N/A, TBC)
- [ ] Asking Text (free text, always required)
- [ ] Comparable Sales (free text)
- [ ] Acceptable Acquisition $ From/To (numeric)

**4. Rental Assessment Section**
- [ ] Occupancy dropdown
- [ ] Current Rent (Primary/Secondary) - numeric or TBC
- [ ] Expiry (Primary/Secondary) - month/year selector, TBC
- [ ] Rent Appraisal From/To (Primary/Secondary)
- [ ] Yield auto-calculation
- [ ] Appraised Yield auto-calculation

**Deliverable:** Google Sheets integration working, Purchase Price & Rental Assessment complete

---

## Day 4: ChatGPT, Content Sections & Email Generation (8 hours)

### Morning (4 hours)
**1. ChatGPT Integration**
- [ ] Set up ChatGPT API
- [ ] Test Property Summary Tool call
- [ ] "Generate Why this Property? & Proximity" button
- [ ] Error handling (show error, allow retry, manual entry)
- [ ] Auto-populate fields on success

**2. Content Sections**
- [ ] Why this Property? (textarea, single-line format)
- [ ] Proximity (textarea, already formatted correctly)
- [ ] Investment Highlights (textarea, auto-populated from Google Sheet)

### Afternoon (4 hours)
**3. Email Generation**
- [ ] Email template engine
- [ ] All section formatting rules (% signs, bold, bullet points, etc.)
- [ ] Subject line generation (6 formats based on Step 0)
- [ ] HTML email generation
- [ ] Text email generation

**4. Form Submission**
- [ ] Generate email
- [ ] Push to GHL Custom Object (via Make.com webhook or direct API)
- [ ] Push to Google Sheet (Property Log)
- [ ] Create folder structure (Google Drive)
- [ ] Send to Make.com scenario (trigger BA Auto select email if Status = "01 Available")

**Deliverable:** Complete form submission, email generation working

---

## Day 5: Project Features, Deal Sheet & Testing (8 hours)

### Morning (4 hours)
**1. Project-Specific Features**
- [ ] Project lot repeater boxes
- [ ] Lot-specific data collection (bed, bath, car, registration, build size, land size, title, pricing, rental)
- [ ] Project Brief (free text with live preview)
- [ ] Sales Assessment (free text with live preview)

**2. Deal Sheet Integration**
- [ ] Map all form fields to Deal Sheet columns
- [ ] Write to Deal Sheet on form submission
- [ ] Handle Status push logic (dummy state → real state)
- [ ] Two-way Status sync (Google Sheet → GHL)

### Afternoon (4 hours)
**3. Testing & Polish**
- [ ] Test complete workflow (all property types)
- [ ] Test all edge cases (TBC, Dual/Duplex, Projects)
- [ ] Test error scenarios (Stash unavailable, ChatGPT unavailable, etc.)
- [ ] Bug fixes
- [ ] Final refinements

**Deliverable:** Complete system, tested and ready

---

## Critical Questions to Answer NOW:

**1. Form Platform:**
- [ ] Next.js/React (recommended - modern, scalable)
- [ ] Standalone HTML/JS (faster to start, less scalable)
- [ ] Other?

**2. Google Service Account:**
- [ ] Already set up?
- [ ] Need to create?
- [ ] Credentials available?

**3. Make.com Stash Webhook:**
- [ ] What's the webhook URL?
- [ ] What's the request format?
- [ ] What's the response format?

**4. GHL API:**
- [ ] What's the API endpoint?
- [ ] What's the auth method?
- [ ] Can we write custom objects directly?

**5. ChatGPT API:**
- [ ] API key available?
- [ ] Custom tools accessible via API?
- [ ] Or need to use ChatGPT UI?

---

## Quick Start Decision:

**Option A: Next.js/React (Recommended)**
- Modern, scalable
- Better for complex forms
- Takes ~1 hour to set up
- Better long-term

**Option B: Standalone HTML/JS**
- Faster to start (30 mins)
- Simpler deployment
- Good for MVP
- Can migrate later

**Recommendation:** Start with **Option B** for speed, migrate to Option A if needed.

---

## Immediate Next Steps:

1. **Answer the 5 critical questions above**
2. **Choose form platform**
3. **Start Day 1 tasks**

**Ready to start? Let me know:**
- Form platform choice
- Google Service Account status
- Make.com Stash webhook URL
- GHL API details
- ChatGPT API access

Then we can start building immediately!









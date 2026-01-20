# Property Packaging Form - Implementation Roadmap

## Suggested Order of Activities & Rationale

### Phase 1: Foundation & Infrastructure Setup (Week 1)

**Why Start Here:**
- Establishes the foundation for everything else
- No dependencies - can be done independently
- Validates technical approach before building features
- Enables testing infrastructure early

**Activities:**
1. **Project Setup**
   - Initialize frontend project (Next.js/React recommended)
   - Initialize backend/API project (Node.js/Python)
   - Set up version control (Git)
   - Configure development environment
   - **Rationale:** Get the basic structure in place

2. **Hosting & Database Setup**
   - Set up hosting (Vercel/Netlify for frontend, AWS/GCP for backend)
   - Set up database (PostgreSQL recommended)
   - Configure environment variables
   - Set up CI/CD pipeline basics
   - **Rationale:** Need infrastructure before building features

3. **Google Service Account Setup**
   - Create Google Service Account
   - Generate credentials (JSON key file)
   - Set up Google Sheets API access
   - Set up Google Drive API access
   - Test API connectivity
   - **Rationale:** Critical for Market Performance, Investment Highlights, Location Reports, and folder management

4. **Basic Form Framework**
   - Set up form library (React Hook Form recommended)
   - Create basic form structure with sections
   - Implement form state management (Zustand/Redux)
   - Set up routing/navigation
   - **Rationale:** Core framework needed for all form features

**Deliverables:**
- ✅ Working development environment
- ✅ Database connected
- ✅ Google APIs accessible
- ✅ Basic form structure rendering

---

### Phase 2: Google Sheets Structure & Test Data (Week 1-2)

**Why This Early:**
- Data structure drives form design
- Need test data for development
- Validates Google Sheets API integration
- Can be done in parallel with Phase 1

**Activities:**
1. **Create Google Sheet Structure**
   - Create "Property Review Static Data - Market Performance" sheet
   - Set up tabs: Market Performance, Investment Highlights, Location Reports, Config, Property Log
   - Add all column headers
   - Set up data validation rules
   - **Rationale:** Data structure must be defined before building form

2. **Populate Test Data**
   - Add Market Performance test data (use existing CSV)
   - Add sample Investment Highlights data
   - Add sample Location Reports
   - Configure Config tab (data freshness thresholds, URLs)
   - **Rationale:** Need test data to develop against

3. **Google Sheets API Integration - Read**
   - Build API endpoint to read Market Performance data
   - Build API endpoint to read Investment Highlights data
   - Build API endpoint to read Location Reports
   - Test with real data
   - **Rationale:** Form needs to read this data - test early

**Deliverables:**
- ✅ Google Sheet structure created
- ✅ Test data populated
- ✅ Read operations working

---

### Phase 3: Core Form Fields - Basic Sections (Week 2)

**Why This Order:**
- Start with simplest, most independent sections
- Build confidence and momentum
- Establishes patterns for complex sections
- Can test immediately

**Activities:**
1. **Property Address Section**
   - Address input field
   - Address parsing (street number, street name, suburb, state, postcode)
   - Google Map link generation (automated)
   - Basic validation
   - **Rationale:** Simple, foundational, needed for everything else

2. **Property Description Section - Basic Fields**
   - Bed (Primary) dropdown (1-9)
   - Bath (Primary) dropdown (1-9, 0.5 increments)
   - Garage/Car-port/Car-space dropdowns (1-9)
   - Land Size (numeric, TBC support)
   - Title dropdown (with TBC)
   - Year Built (for Established) - numeric, TBC, Circa support
   - **Rationale:** Core property details, relatively straightforward

3. **Basic Validation & Field Rules**
   - Numeric validation
   - TBC handling
   - Required field validation
   - **Rationale:** Establish validation patterns early

**Deliverables:**
- ✅ Address section working
- ✅ Basic Property Description fields working
- ✅ Validation framework in place

---

### Phase 4: Workflow Steps 0-1.5 (Week 2-3)

**Why This Order:**
- Establishes the decision tree logic
- Needed before dynamic field visibility
- Validates workflow approach

**Activities:**
1. **Step 0: Property Type Decision Tree**
   - Three critical fields: New/Established, Contract Type, Individual/Multiple Lots
   - Decision logic implementation
   - Subject line format determination
   - Store decision state
   - **Rationale:** Drives all other form behavior - must be first

2. **Step 1: Initial Property Entry**
   - Address entry (already done)
   - Address parsing (already done)
   - Geocoding integration (Geoscape API or similar)
   - Google Maps link generation (already done)
   - **Rationale:** Natural flow after Step 0

3. **Step 1.5: Suburb & LGA Confirmation**
   - Display parsed Suburb, LGA, State
   - Allow user confirmation/edit
   - Store confirmed values
   - **Rationale:** Critical for Investment Highlights lookup (uses LGA)

**Deliverables:**
- ✅ Decision tree working
- ✅ Address entry and parsing working
- ✅ Suburb/LGA confirmation working

---

### Phase 5: Stash API Integration (Week 3)

**Why This Order:**
- Needed for Step 2 (Risk Assessment)
- Can be developed/tested independently
- Validates Make.com integration approach

**Activities:**
1. **Stash API Integration**
   - Set up Make.com webhook for Stash API calls
   - OR set up direct Stash API integration (if available)
   - Build API endpoint to call Stash
   - Parse Stash response (risk overlays, zoning, LGA)
   - Error handling (if Stash unavailable)
   - **Rationale:** Required for Property Overlays section

2. **Test Stash Integration**
   - Test with real addresses
   - Test error scenarios
   - Validate data format
   - **Rationale:** Ensure integration works before building UI

**Deliverables:**
- ✅ Stash API integration working
- ✅ Risk overlay data available
- ✅ Error handling in place

---

### Phase 6: Property Overlays Section (Week 3)

**Why This Order:**
- Depends on Stash API (Phase 5)
- Relatively self-contained
- Can test immediately

**Activities:**
1. **Property Overlays UI**
   - Display Stash data (auto-populated)
   - Override checkboxes ("Further analysis has identified this as NOT [RISK]")
   - Dialogue textareas (appear when risk = Yes)
   - "Set All Overlays to No" bulk action button
   - Due Diligence Acceptance field (blocks submission if No)
   - **Rationale:** Complete section that can be tested end-to-end

2. **Step 2: Risk Assessment & Override**
   - Implement Step 2 workflow
   - Decision point: "Package This Property" vs "Do Not Package"
   - **Rationale:** Natural workflow progression

**Deliverables:**
- ✅ Property Overlays section complete
- ✅ Step 2 workflow working
- ✅ Can test risk assessment flow

---

### Phase 7: Google Sheets Integration - Market Performance (Week 3-4)

**Why This Order:**
- Data structure already set up (Phase 2)
- Needed for Step 4 workflow
- Can be developed independently

**Activities:**
1. **Market Performance Lookup**
   - Build API endpoint to query Market Performance by Suburb/State
   - Handle "no data" scenario
   - Handle "Mock Data" scenario (prompt for real data)
   - Handle "stale data" scenario (prompt for update)
   - **Rationale:** Core data lookup functionality

2. **Market Performance Data Collection Forms**
   - Form A: Smart Property Investment data entry
   - Form B: Real Estate Investar data entry
   - URL confirmation fields
   - Numeric validation (2 decimal places)
   - Write to Google Sheet
   - **Rationale:** Need to collect data when missing/stale

3. **Step 4: Market Performance Check**
   - Implement Step 4 workflow
   - Auto-populate form fields
   - Display data collection forms when needed
   - **Rationale:** Complete the data check workflow

**Deliverables:**
- ✅ Market Performance lookup working
- ✅ Data collection forms working
- ✅ Step 4 workflow complete

---

### Phase 8: Investment Highlights & Location Reports (Week 4)

**Why This Order:**
- Similar to Market Performance (can reuse patterns)
- Needed for Step 5.5 and 5.6
- Completes static data repository approach

**Activities:**
1. **Investment Highlights Lookup**
   - Build API endpoint to query by LGA/State
   - Handle "no data" scenario (prompt for ChatGPT tool)
   - Handle "stale data" scenario (3-month threshold)
   - Additional information handling (preserve when new version)
   - **Rationale:** Complete Investment Highlights workflow

2. **Location Reports Lookup**
   - Build API endpoint to query by LGA/State
   - Handle "no data" scenario (prompt to download)
   - Handle "stale data" scenario (3-month threshold)
   - Link to repository (not copy to folder)
   - **Rationale:** Complete Location Reports workflow

3. **Step 5.5 & 5.6 Implementation**
   - Implement Investment Highlights check workflow
   - Implement Location Reports check workflow
   - **Rationale:** Complete data check workflows

**Deliverables:**
- ✅ Investment Highlights lookup working
- ✅ Location Reports lookup working
- ✅ Steps 5.5 & 5.6 complete

---

### Phase 9: Purchase Price & Rental Assessment Sections (Week 4-5)

**Why This Order:**
- Core business logic sections
- Needed for yield calculations
- Can be developed independently

**Activities:**
1. **Purchase Price Section**
   - Asking dropdown (with TBC option)
   - Asking Text (always required, multi-line)
   - Comparable Sales (free text)
   - Acceptable Acquisition $ From/To (numeric)
   - Cashback handling (Established & H&L formats)
   - **Rationale:** Core pricing information

2. **Rental Assessment Section**
   - Occupancy dropdown
   - Current Rent (Primary/Secondary) - numeric or TBC
   - Expiry (Primary/Secondary) - month/year selector, TBC
   - Rent Appraisal From/To (Primary/Secondary) - numeric, no decimals
   - Yield auto-calculation
   - Appraised Yield auto-calculation
   - Dual/Duplex formatting (indented Unit A/Unit B)
   - **Rationale:** Core rental information with calculations

**Deliverables:**
- ✅ Purchase Price section complete
- ✅ Rental Assessment section complete
- ✅ Auto-calculations working

---

### Phase 10: ChatGPT Integration (Week 5)

**Why This Order:**
- Depends on address entry (Phase 3)
- Can be developed independently
- Needed for Step 2.5

**Activities:**
1. **ChatGPT API Setup**
   - Set up ChatGPT API credentials
   - Test API connectivity
   - Test Property Summary Tool call
   - **Rationale:** Validate API access before building UI

2. **ChatGPT Automation UI**
   - "Generate Why this Property? & Proximity" button
   - Error handling (show error, retry, manual entry)
   - Auto-populate fields on success
   - **Rationale:** Complete ChatGPT integration

3. **Step 2.5: Packaging Confirmation & ChatGPT**
   - Implement "Package This Property" button
   - Trigger ChatGPT automation
   - Create property folder
   - **Rationale:** Complete packaging confirmation workflow

**Deliverables:**
- ✅ ChatGPT API integration working
- ✅ Automation button working
- ✅ Step 2.5 complete

---

### Phase 11: Remaining Form Sections (Week 5-6)

**Why This Order:**
- Complete all form sections
- Can be done in parallel
- Needed before email generation

**Activities:**
1. **Why this Property Section**
   - Textarea field
   - Single-line format conversion (if multi-line input)
   - **Rationale:** Complete content sections

2. **Proximity Section**
   - Textarea field
   - Already populated correctly (no changes needed)
   - **Rationale:** Simple section

3. **Investment Highlights Section**
   - Textarea field
   - Already populated from repository
   - **Rationale:** Simple section

4. **Attachments Section**
   - Folder creation (already in Step 2.5)
   - Document upload/link interface
   - Review mechanism
   - **Rationale:** Complete attachments workflow

**Deliverables:**
- ✅ All form sections complete
- ✅ Form can be filled end-to-end

---

### Phase 12: Project-Specific Features (Week 6)

**Why This Order:**
- More complex features
- Depends on basic form working
- Can be developed after core functionality

**Activities:**
1. **Project Lot Repeater Boxes**
   - Add/remove lot entries
   - Lot-specific data collection (bed, bath, car, registration, build size, land size, title, pricing, rental)
   - **Rationale:** Complex feature, build after basics work

2. **Project Brief & Sales Assessment**
   - Free text fields
   - Live preview functionality
   - **Rationale:** Critical UX feature for projects

**Deliverables:**
- ✅ Project lot repeater boxes working
- ✅ Live preview working

---

### Phase 13: Email Generation & Template Formatting (Week 7)

**Why This Order:**
- Depends on all form data being collected
- Final output - validates everything works
- Can be tested with real data

**Activities:**
1. **Email Template Engine**
   - Build template system
   - Implement all section formatting rules
   - Handle all field transformations (% signs, bold, etc.)
   - **Rationale:** Core output functionality

2. **Subject Line Generation**
   - Implement all 6 subject line formats
   - Based on Step 0 decision tree
   - **Rationale:** Complete email generation

3. **Step 7: Form Submission**
   - Generate email
   - Push to Google Sheet (Property Log)
   - Create folder structure
   - Send to Make.com scenario
   - **Rationale:** Complete submission workflow

**Deliverables:**
- ✅ Email generation working
- ✅ All formatting rules implemented
- ✅ Step 7 complete

---

### Phase 14: Google Sheet Deal Sheet Integration (Week 7-8)

**Why This Order:**
- Depends on form submission working
- Two-way sync complexity
- Can be developed independently

**Activities:**
1. **Deal Sheet Write**
   - Map all form fields to Deal Sheet columns
   - Write on form submission
   - Handle Status push logic (dummy state → real state)
   - **Rationale:** Complete data sync

2. **Deal Sheet Read & Status Sync**
   - Set up Google Sheet webhook/trigger
   - Detect Status changes in Google Sheet
   - Write Status back to GHL
   - Protect all other columns (read-only)
   - **Rationale:** Two-way sync for Status field

**Deliverables:**
- ✅ Deal Sheet integration complete
- ✅ Two-way Status sync working

---

### Phase 15: Workflow Management & Editing (Week 8)

**Why This Order:**
- Advanced workflow features
- Depends on basic form working
- Needed for production use

**Activities:**
1. **Workflow State Management**
   - Save form state at each step
   - Resume workflow functionality
   - Workflow state tracking
   - **Rationale:** Enable resumable workflows

2. **Packager "Needs Editing" Workflow**
   - "Needs Editing" button
   - Direct navigation to editable section
   - Inline editing
   - **Rationale:** Complete editing workflow

3. **BA "Needs Editing & Resubmitting" Workflow**
   - BA notes field
   - Section identifier
   - Blocking logic
   - Packager notification
   - Resubmission process
   - **Rationale:** Complete BA review workflow

4. **Standard Edit Process**
   - Edit existing properties
   - Edit history/audit log
   - Update notifications
   - **Rationale:** Enable property updates

**Deliverables:**
- ✅ Workflow management complete
- ✅ Editing workflows working
- ✅ Notifications working

---

### Phase 16: Advanced Features & Polish (Week 9-10)

**Why This Order:**
- Nice-to-have features
- Can be developed after core functionality
- Improves user experience

**Activities:**
1. **Cashflow Spreadsheet Auto-Population**
   - Template selection (Single Contract vs Split Contract)
   - Auto-populate with property data
   - Force Google Sheets browser opening
   - **Rationale:** Automation improvement

2. **Attachment Review Mechanism**
   - Easy review interface
   - Document preview
   - **Rationale:** UX improvement

3. **Error Handling & Retry Logic**
   - Comprehensive error handling
   - Retry mechanisms
   - User-friendly error messages
   - **Rationale:** Production readiness

4. **Performance Optimization**
   - Lazy loading
   - Caching
   - API call optimization
   - **Rationale:** Production readiness

**Deliverables:**
- ✅ Advanced features complete
- ✅ System optimized
- ✅ Production-ready

---

### Phase 17: Testing & Refinement (Week 11-12)

**Why Last:**
- Need complete system to test properly
- Validates all integrations work together
- Final polish before launch

**Activities:**
1. **End-to-End Testing**
   - Test complete workflow
   - Test all property types
   - Test all edge cases
   - **Rationale:** Ensure everything works together

2. **User Acceptance Testing**
   - Packager testing
   - BA testing
   - Gather feedback
   - **Rationale:** Validate with real users

3. **Bug Fixes & Refinements**
   - Fix identified issues
   - Refine based on feedback
   - **Rationale:** Production quality

4. **Documentation**
   - User guide
   - Technical documentation
   - API documentation
   - **Rationale:** Support users and developers

**Deliverables:**
- ✅ System tested and validated
- ✅ Documentation complete
- ✅ Ready for production

---

## Summary: Why This Order?

**Foundation First (Phases 1-2):**
- No dependencies
- Enables everything else
- Validates technical approach early

**Core Features Next (Phases 3-9):**
- Builds on foundation
- Establishes patterns
- Can test incrementally

**Integration & Workflow (Phases 10-14):**
- Connects all pieces
- Validates end-to-end flow
- Completes core functionality

**Advanced Features Last (Phases 15-17):**
- Nice-to-haves
- Polish and optimization
- Production readiness

**Key Principles:**
1. ✅ Build incrementally (test as you go)
2. ✅ Minimize dependencies (parallel work where possible)
3. ✅ Validate early (test integrations before building UI)
4. ✅ Establish patterns (reuse code/approaches)
5. ✅ Risk mitigation (complex features after basics work)

---

## Quick Start Recommendation

**If you want to see something working quickly:**

**Week 1 Quick Win:**
1. Set up basic Next.js project
2. Create simple form with Address field
3. Add Google Maps link generation
4. Test address parsing

**This gives you:**
- ✅ Working form
- ✅ Visible progress
- ✅ Validates approach
- ✅ Foundation for everything else

Would you like me to start with Phase 1 (Foundation Setup) or the Quick Win approach?









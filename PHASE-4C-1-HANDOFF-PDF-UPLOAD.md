# Phase 4C-1 Handoff Document
## PDF Upload + Metadata Extraction + Version Management

**Date:** January 21, 2026  
**For:** Chat F  
**Branch:** `feature/phase-4c-1-pdf-upload` (to be created from `feature/phase-3-step5-refactor`)  
**Previous Phase:** Phase 4C Base Complete ✅

---

## 🎯 Objective

Implement PDF upload functionality for Investment Highlights, including:
- PDF upload to Google Drive
- Agile metadata extraction from front page
- User verification of extracted data
- Version management (CURRENT/LEGACY folders)
- Activity logging

**Note:** AI summary generation and proximity fix will be in Phase 4C-2.

---

## 📋 What's Already Complete

**Phase 4C Base:**
- ✅ `InvestmentHighlightsField.tsx` component exists
- ✅ Google Sheets lookup by LGA/suburb working
- ✅ Manual entry form working
- ✅ Auto-growing textarea working

**What's Missing (Your Job):**
- ❌ PDF upload functionality
- ❌ Metadata extraction from PDF front page
- ❌ Version management (CURRENT/LEGACY)
- ❌ Activity logging

---

## 📊 Google Sheet Structure

### Main Tab: "Investment Highlights"

**Headers (15 columns A-O):**
```
Suburbs (comma-separated)	State	Report Name	Valid Period	Main Body	Extra Info	Population Growth Context	Residential	Industrial	Commercial and Civic	Health and Education	Transport	Job Implications	PDF Drive Link	PDF File ID
```

**Column Details:**
- A: Suburbs (comma-separated) - e.g., "Maroochydore, Mooloolaba"
- B: State - e.g., "QLD"
- C: Report Name - e.g., "SUNSHINE COAST" (auto-extracted from PDF)
- D: Valid Period - e.g., "October 2025 - January 2026" (auto-extracted)
- E: Main Body - Combined text (will be populated in Phase 4C-2)
- F: Extra Info - Optional notes
- G-M: Individual sections (will be populated in Phase 4C-2)
- N: PDF Drive Link - Shareable link to CURRENT PDF
- O: PDF File ID - Google Drive file ID

### Log Tab: "Investment Highlights Activity Log"

**Headers:**
```
Timestamp	Action Type	Report Name	Valid Period	User/BA	PDF Link	Details
```

**Action Types:**
- "Uploaded" - New PDF uploaded
- "Used" - Report linked to a property
- "Superseded" - Moved to legacy folder
- "Edited Section" - User edited individual section
- "Edited Main Body" - User edited main body
- "Deleted Extra Line" - User deleted extra info
- "Confirmed Current" - User confirmed report still valid
- "Expiry Warning Shown" - System showed expiry warning

---

## 📁 Google Drive Folder Structure

```
Hotspotting Reports/
├── SUNSHINE COAST/
│   ├── CURRENT/
│   │   └── SUNSHINE COAST - October 2025 - January 2026.pdf
│   └── LEGACY/
│       ├── SUNSHINE COAST - July 2025 - October 2025.pdf
│       └── SUNSHINE COAST - April 2025 - July 2025.pdf
└── INNER WEST/
    ├── CURRENT/
    │   └── INNER WEST - November 2025 - February 2026.pdf
    └── LEGACY/
        └── INNER WEST - August 2025 - November 2025.pdf
```

**Logic:**
1. New upload → Save to `[Report Name]/CURRENT/` folder
2. If CURRENT already exists → Move old one to `[Report Name]/LEGACY/`
3. Always use CURRENT → System automatically uses latest
4. Google Sheet → Always points to CURRENT version

---

## 🔧 Implementation Requirements

### Feature 1: PDF Upload UI

**Location:** `InvestmentHighlightsField.tsx`

**UI When No Match Found:**
```
┌─────────────────────────────────────────────────┐
│ Investment Highlights                            │
├─────────────────────────────────────────────────┤
│ ⚠️ No Match Found                               │
│ No existing report for Maroochydore, QLD        │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │  📄 Upload Hotspotting PDF                  │ │
│ │  Drag & drop or click to browse             │ │
│ │  (PDF files only, max 50MB)                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ─── OR ───                                       │
│                                                  │
│ [Show Manual Entry Form]                        │
│                                                  │
│ 💡 Check for latest reports:                    │
│ 🔗 https://membership.hotspotting.com.au/...   │
│    (Opens in new tab)                           │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Use HTML5 drag & drop API
- File validation: PDF only, max 50MB
- Show upload progress indicator
- Handle errors gracefully

---

### Feature 2: Agile Metadata Extraction

**Extract from PDF front page:**
1. **Report Name** - e.g., "SUNSHINE COAST" or "SUNSHINE COAST South East Queensland"
2. **Valid Period** - e.g., "October 2025 - January 2026"

**Agile Parsing Rules:**
- Report Name: Look for large text near top of page (case-insensitive)
- May include subtitle (e.g., "South East Queensland")
- Valid Period: Look for date range patterns:
  - "October 2025 - January 2026"
  - "Oct 2025 - Jan 2026"
  - "10/2025 - 01/2026"
  - Month YYYY - Month YYYY format

**Backend Endpoint:** `/api/investment-highlights/extract-metadata`

**Request:**
```json
{
  "fileId": "google_drive_file_id"
}
```

**Response:**
```json
{
  "reportName": "SUNSHINE COAST",
  "validPeriod": "October 2025 - January 2026",
  "confidence": "high"
}
```

---

### Feature 3: User Verification UI

**After extraction, show verification screen:**
```
┌─────────────────────────────────────────────────┐
│ ✅ PDF Uploaded: sunshine-coast-oct-2025.pdf    │
├─────────────────────────────────────────────────┤
│ 📋 Extracted Information:                       │
│                                                  │
│ Report Name *                                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ SUNSHINE COAST                              │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Valid Period *                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ October 2025 - January 2026                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ⚠️ Please verify the information above          │
│                                                  │
│ [✓ Confirm & Continue] [✗ Cancel]              │
└─────────────────────────────────────────────────┘
```

**Logic:**
- User can edit extracted values
- Both fields required
- "Confirm" → Proceed to save
- "Cancel" → Remove uploaded PDF, return to upload screen

---

### Feature 4: Version Management

**Backend Endpoint:** `/api/investment-highlights/upload-pdf`

**Logic:**
```typescript
1. Upload PDF to Google Drive temp location
2. Extract metadata from front page
3. Return to frontend for verification
4. After user confirms:
   a. Check if [Report Name]/CURRENT/ folder exists
   b. If exists:
      - Move current PDF to [Report Name]/LEGACY/
      - Log "Superseded" action
   c. Move new PDF to [Report Name]/CURRENT/
   d. Get shareable link
   e. Save to Google Sheet (columns N, O)
   f. Log "Uploaded" action
```

**Folder Creation:**
```typescript
// Create folder structure if doesn't exist
Hotspotting Reports/
  └── [Report Name]/
      ├── CURRENT/
      └── LEGACY/
```

---

### Feature 5: Activity Logging

**Log to "Investment Highlights Activity Log" tab:**

**When to log:**
- PDF uploaded
- PDF superseded (moved to legacy)
- Report used for a property
- User edits sections (Phase 4C-2)
- User confirms report still valid (Phase 4C-3)

**Backend Function:** `logInvestmentHighlightsActivity()`

```typescript
interface ActivityLogEntry {
  timestamp: string; // ISO format
  actionType: 'Uploaded' | 'Used' | 'Superseded' | 'Edited Section' | 'Edited Main Body' | 'Deleted Extra Line' | 'Confirmed Current' | 'Expiry Warning Shown';
  reportName: string;
  validPeriod: string;
  userEmail: string;
  pdfLink: string;
  details: string; // Additional context
}
```

**Example Log Entries:**
```
2026-01-21 14:32:15	Uploaded	SUNSHINE COAST	October 2025 - January 2026	john@example.com	https://drive.google.com/...	New report uploaded
2026-01-21 14:32:15	Superseded	SUNSHINE COAST	July 2025 - October 2025	john@example.com	https://drive.google.com/...	Moved to legacy folder
2026-01-21 15:45:22	Used	SUNSHINE COAST	October 2025 - January 2026	jane@example.com	https://drive.google.com/...	Linked to property at 15 Barker Street
```

---

## 🔑 Environment Variables

**Already configured:**
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_PARENT_FOLDER_ID=...
GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS=...
```

**No new environment variables needed.**

---

## 📦 Dependencies

**Install:**
```bash
npm install pdf-parse
```

**Already installed:**
- `googleapis` (from Phase 2)

---

## 🎨 Component Structure

**Modified Files:**
1. `form-app/src/components/steps/step5/InvestmentHighlightsField.tsx`
   - Add PDF upload UI
   - Add verification UI
   - Handle upload flow

**New Files:**
2. `form-app/src/app/api/investment-highlights/upload-pdf/route.ts`
   - Handle PDF upload to Google Drive
   - Manage version control (CURRENT/LEGACY)

3. `form-app/src/app/api/investment-highlights/extract-metadata/route.ts`
   - Extract Report Name and Valid Period from PDF front page
   - Return extracted data for verification

4. `form-app/src/lib/pdfExtractor.ts`
   - Utility functions for PDF text extraction
   - Agile parsing for metadata

5. `form-app/src/lib/investmentHighlightsLogger.ts`
   - Activity logging functions
   - Write to "Investment Highlights Activity Log" tab

---

## ✅ Success Criteria

### Functional Requirements
- [ ] PDF upload via drag & drop or file picker
- [ ] File validation (PDF only, max 50MB)
- [ ] Upload to Google Drive temp location
- [ ] Extract Report Name from front page (agile parsing)
- [ ] Extract Valid Period from front page (multiple date formats)
- [ ] Show verification UI with extracted data
- [ ] User can edit extracted values
- [ ] Create folder structure: [Report Name]/CURRENT/ and /LEGACY/
- [ ] Move old PDF to LEGACY when new one uploaded
- [ ] Save PDF link to Google Sheet (columns N, O)
- [ ] Log all activities to Activity Log tab
- [ ] Link to Hotspotting membership site

### Code Quality
- [ ] Build passes with no errors
- [ ] No linter errors
- [ ] Type-safe implementation
- [ ] Proper error handling
- [ ] Loading states for async operations

---

## 🧪 Testing Checklist

1. **Test PDF upload:**
   - Drag & drop PDF
   - Click to browse and select PDF
   - Verify file validation (reject non-PDF)
   - Verify size validation (reject > 50MB)

2. **Test metadata extraction:**
   - Upload sample Hotspotting PDF
   - Verify Report Name extracted correctly
   - Verify Valid Period extracted correctly
   - Test with different date formats

3. **Test user verification:**
   - Edit extracted Report Name
   - Edit extracted Valid Period
   - Click "Confirm" → should proceed
   - Click "Cancel" → should return to upload

4. **Test version management:**
   - Upload first PDF → should create CURRENT folder
   - Upload second PDF for same report → should move first to LEGACY
   - Verify Google Sheet updated with new PDF link

5. **Test activity logging:**
   - Verify "Uploaded" log entry created
   - Verify "Superseded" log entry when replacing
   - Check all log fields populated correctly

---

## 📚 Reference Documents

**Planning Docs:**
- `planning_docs/07_step5_proximity_content_requirements_DEVELOPER_BUILD_SPEC.md`
- `planning_docs/deployment_plan.md`

**Phase 4C Base:**
- `PHASE-4C-HANDOFF-INVESTMENT-HIGHLIGHTS.md`
- `PHASE-4C-IMPLEMENTATION-SUMMARY.md`

**Tracking:**
- `IMPLEMENTATION-TRACKER.md`
- `COORDINATION-STATUS.md`

---

## 🚨 Important Notes

### PDF Processing
- ⚠️ **Cannot send PDF file to OpenAI API**
- ✅ Extract text from PDF using `pdf-parse`
- ✅ Send extracted text to API (Phase 4C-2)

### Front Page Parsing
- ⚠️ **Format may vary between reports**
- ✅ Use flexible pattern matching
- ✅ Look for large text near top
- ✅ Handle multiple date formats

### Version Management
- ✅ Always use CURRENT folder
- ✅ Keep old versions in LEGACY
- ✅ Google Sheet always points to CURRENT

### Don't Implement Yet
- ❌ AI summary generation (Phase 4C-2)
- ❌ Section editing (Phase 4C-2)
- ❌ Expiry warnings (Phase 4C-3)
- ❌ Proximity fix (Phase 4C-2)

---

## 🎯 Estimated Effort

**Complexity:** Medium  
**Estimated Time:** 2-3 hours  
**Risk Level:** Medium (PDF parsing, Google Drive API)

**Breakdown:**
- PDF upload UI: 30 min
- Metadata extraction: 1 hour (agile parsing)
- Version management: 45 min
- Activity logging: 30 min
- Testing: 30 min

---

## 📞 When Complete

1. Commit all changes to `feature/phase-4c-1-pdf-upload`
2. Update `IMPLEMENTATION-TRACKER.md`
3. Create `PHASE-4C-1-IMPLEMENTATION-SUMMARY.md`
4. Return to **Coordinator Chat** with summary

---

## 🚀 Ready to Begin

**Branch:** Create `feature/phase-4c-1-pdf-upload` from `feature/phase-3-step5-refactor`  
**Status:** Ready to start  
**Next Phase:** Phase 4C-2 (AI Summary Generation + Proximity Fix)

---

**Prepared by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Ready for Chat F

# Investment Highlights Enhanced Workflow - Analysis Prompt

**COPY THIS PROMPT INTO NEW SONNET 4.5 CHAT:**

---

You are analyzing a Next.js property review system. 

**READ THIS FILE:**
`property-review-system/form-app/PROMPT-INVESTMENT-HIGHLIGHTS-WORKFLOW.md`

**YOUR TASK:**
1. Read the full requirements in that file
2. Analyze the workflow and answer all questions marked "Questions:"
3. Provide a detailed implementation plan with phases and file changes
4. Identify edge cases and risks

**CRITICAL RULES:**
- ❌ DO NOT WRITE ANY CODE
- ✅ Analysis and planning ONLY
- ✅ Save your analysis as: `property-review-system/form-app/INVESTMENT-HIGHLIGHTS-ANALYSIS.md`

**DELIVERABLES:**
1. Architecture overview (components, data flow, APIs)
2. Implementation plan (Phase 1, 2, 3 with file changes)
3. Edge case analysis
4. Answers to all questions in the requirements
5. Recommendations

---

## SIMPLIFIED PROMPT VERSION (if file access doesn't work):

You are analyzing an Investment Highlights workflow for a Next.js property review system.

**CONTEXT:**
- Next.js 14 (App Router), React 18, TypeScript, Zustand state management
- Google Drive API for PDFs, Google Sheets API for data storage
- Current files: InvestmentHighlightsField.tsx, lookup/save/upload-pdf/extract-metadata API routes

**REQUIREMENTS:**
Read the detailed requirements in `property-review-system/form-app/PROMPT-INVESTMENT-HIGHLIGHTS-WORKFLOW.md`

**YOUR TASK:**
Provide implementation plan with:
1. Architecture (components, APIs, data flow)
2. Phase-by-phase implementation order
3. Edge case handling
4. Answers to all "Questions:" in requirements

**SAVE OUTPUT AS:**
`property-review-system/form-app/INVESTMENT-HIGHLIGHTS-ANALYSIS.md`

**DO NOT WRITE CODE - ANALYSIS ONLY**

---

## Current System Context

### Google Sheet Structure
**Sheet Name:** "Investment Highlights Data"  
**Columns:**
- **A:** Suburbs (comma-separated, e.g., "Petersham, Stanmore, Lewisham")
- **B:** State (e.g., "NSW", "QLD")
- **C:** Report Name (e.g., "INNER WEST LGA")
- **D:** Valid Period (single field, e.g., "SEPTEMBER - DECEMBER 2025")
- **E-N:** Content fields (Population Growth Context, Residential, Industrial, etc.)
- **O:** PDF Drive Link (Google Drive URL)
- **P:** PDF File ID (Google Drive File ID - unique identifier)
- **Q:** Display Name (NEW - user-friendly name for dropdown, e.g., "Inner West LGA (Sep-Dec 2025)")

### Current Implementation Files
1. **`src/components/steps/step5/InvestmentHighlightsField.tsx`**
   - Main component for Investment Highlights on Step 5
   - Currently has: PDF upload, auto-extract metadata, manual paste fields
   - Uses: `useFormStore` for state management

2. **`src/app/api/investment-highlights/lookup/route.ts`**
   - Searches Google Sheet for matching suburb
   - Returns report data if found

3. **`src/app/api/investment-highlights/save/route.ts`**
   - Saves new report data to Google Sheet
   - Called after PDF upload + extraction

4. **`src/app/api/investment-highlights/upload-pdf/route.ts`**
   - Uploads PDF to Google Drive (Hotspotting folder)
   - Returns fileId and driveLink

5. **`src/app/api/investment-highlights/extract-metadata/route.ts`**
   - Downloads PDF from Google Drive
   - Extracts text using pdf-parse
   - Parses report name, valid period, and content fields
   - **Known Issue:** Timing issue with fresh uploads (see PDF-EXTRACTION-FIX-ANALYSIS.md)

6. **`src/app/api/investment-highlights/organize-pdf/route.ts`**
   - Moves PDF to correct state subfolder in Hotspotting folder
   - Called after extraction

7. **`src/lib/googleDrive.ts`**
   - Utility functions for Google Drive operations
   - Has: uploadFile, createFolder, moveFile, etc.

8. **`src/lib/googleSheets.ts`**
   - Utility functions for Google Sheets operations
   - Has: readSheet, appendRow, updateRow, etc.

---

## User Requirements (Detailed Workflow)

### Branch 1: System Matches Suburb & Report is In-Date
**Trigger:** User arrives on Step 5, system auto-runs suburb lookup

**Flow:**
1. System searches Google Sheet for suburb match (column A)
2. Match found → Check "Valid Period" (column D)
3. Extract end date from "Valid Period" (e.g., "DECEMBER 2025" → Dec 31, 2025)
4. Compare end date with today's date
5. If **in-date** → Auto-populate all fields from Google Sheet
6. Show success message: "✓ Hotspotting Report found: [Display Name]"

**Questions:**
- How to parse various date formats in "Valid Period"? (e.g., "SEPTEMBER - DECEMBER 2025", "October 2025 - January 2026")
- What if "Valid Period" is malformed or missing?
- Should system show report age (e.g., "Report valid until Dec 2025 (11 months remaining)")?

---

### Branch 2: No Suburb Match → User Reviews Dropdown
**Trigger:** No suburb match found in Google Sheet

**Flow:**
1. System shows message: "No matching Hotspotting report exists for [SUBURB], but please review the dropdown below to see if a report exists in the repository."
2. Display **searchable dropdown** with all reports from Google Sheet
   - **Display:** "Display Name" (column Q) - e.g., "Inner West LGA (Sep-Dec 2025)"
   - **Grouped by:** State (column B) - e.g., "NSW", "QLD", "VIC"
   - **Sorted:** Alphabetically within each state group
   - **Searchable:** User can type to filter
3. If user selects a report from dropdown:
   - Check if report is in-date (same logic as Branch 1)
   - If **in-date** → Auto-populate fields
   - If **out-of-date** → Go to Branch 4
   - **Automatically add current suburb to that report's suburb list** (column A)
   - Show confirmation: "✓ [Suburb] added to [Report Name]"

**Sub-Branch 2A: Report Not in Dropdown**
**Flow:**
1. User confirms report doesn't exist in dropdown
2. System prompts: "Please download the appropriate report from [Hotspotting URL]"
3. Show **drag & drop zone** for PDF upload (directly on page, not file picker)
4. User drops PDF → System uploads to Hotspotting folder
5. System attempts **auto-extract** metadata:
   - **Success** → Auto-populate fields, prompt for Report Name + Valid Period confirmation
   - **Failure** → Show fallback message: "Auto-extraction failed. Please use ChatGPT to extract data and paste values below."
6. **Force user to provide:**
   - Report Name (from PDF front page)
   - Valid Period (from PDF front page)
7. System saves report to Google Sheet with:
   - Current suburb in "Suburbs" column
   - User-provided Report Name + Valid Period
   - Extracted/pasted content fields
   - PDF Drive Link + File ID
   - Auto-generated Display Name (e.g., "[Report Name] ([Valid Period])")
8. **Force save PDF to Hotspotting folder** (already done in step 4)
9. **Add Google Drive shortcut** (not copy) of PDF to property folder

**Questions:**
- How to implement drag & drop zone? (React component, styling)
- Should system validate Report Name against PDF content?
- What if user provides wrong Valid Period?
- How to generate Display Name automatically?

---

### Branch 3: System Has Values But Report is Out-of-Date
**Trigger:** Report found (auto-match or dropdown), but end date < today's date

**Flow:**
1. Show warning: "⚠️ This report is out of date (valid until [END DATE]). Check if a new report is available: [Hotspotting URL]"
2. Provide two buttons:
   - **"Use Existing Report"** → Populate fields with existing data, continue
   - **"Upload New Report"** → Show drag & drop zone
3. If "Upload New Report":
   - User drops PDF → Upload to Hotspotting folder
   - System attempts auto-extract
   - Prompt for new Valid Period
   - **Update existing Google Sheet row** (match by File ID or Report Name?)
   - **Retain suburb relationships** (don't delete existing suburbs in column A)
   - If Report Name changed → Update Display Name
   - **Replace old PDF with new PDF** in Hotspotting folder? Or keep both?

**Questions:**
- How to handle Report Name changes? (Use File ID as primary key?)
- Should system keep old PDF or delete it?
- What if user uploads wrong PDF (different report)?
- How to validate new PDF matches existing report?

---

### Branch 4: Suburb Mapping & Multi-Layer Validation
**Trigger:** User selects report from dropdown (Branch 2)

**Flow:**
1. System checks if current suburb is in report's suburb list (column A)
2. If **not in list**:
   - Extract suburbs from PDF (if possible)
   - Compare current suburb with extracted suburbs
   - If **match found in PDF** → Automatically add to Google Sheet
   - If **no match in PDF** → Show confirmation dialog:
     - "This report does not list [SUBURB]. Are you sure this report covers [SUBURB]?"
     - Buttons: "Yes, Add Suburb" | "Cancel"
   - If confirmed → Add suburb to column A (comma-separated)
3. Show confirmation: "✓ [Suburb] added to [Report Name]"

**Questions:**
- How to extract suburbs from PDF reliably?
- What if PDF has 50+ suburbs listed? (Performance concern)
- Should system track "manually added" vs "auto-detected" suburbs?
- What if user adds wrong suburb to wrong report? (Undo mechanism?)

---

### Additional Requirements

#### PDF Storage & Linking
1. **Hotspotting Folder:** All PDFs saved to main Hotspotting folder (organized by state subfolders)
2. **Property Folder:** Add **Google Drive shortcut** (not copy) to property folder
   - Shortcut points to PDF in Hotspotting folder
   - Appears as normal file in property folder
   - Single source of truth (update Hotspotting PDF → all properties see latest)

**Questions:**
- How to create Google Drive shortcut via API?
- Should shortcut have custom name? (e.g., "Hotspotting Report - [Report Name]")
- What if property folder doesn't exist yet? (Step 5 happens before folder creation)

#### Date Validation Logic
**Valid Period Examples:**
- "SEPTEMBER - DECEMBER 2025"
- "October 2025 - January 2026"
- "Q4 2025"
- "2025"

**Requirements:**
- Parse end date from various formats
- Compare with today's date
- Handle edge cases (malformed dates, missing dates)
- Show user-friendly messages (e.g., "Report valid until Dec 2025")

**Questions:**
- Use regex parsing or date library (e.g., date-fns)?
- What if Valid Period spans multiple years? (e.g., "Dec 2025 - Jan 2026")
- Should system support custom date formats?

#### Report Name Changes & File ID Tracking
**Requirement:** Use File ID (column P) as unique identifier, not Report Name

**Scenario:**
1. Report originally named "Fraser Coast" (File ID: abc123)
2. User uploads new PDF, renames to "Fraser Coast LGA" (same File ID: abc123)
3. System should:
   - Update Report Name (column C)
   - Update Display Name (column Q)
   - **Retain all suburb relationships** (column A)
   - Update Valid Period (column D)
   - Update content fields (columns E-N)

**Questions:**
- How to detect if uploaded PDF is update vs new report?
- Should system ask user: "Is this an update to [OLD NAME] or a new report?"
- What if File ID changes? (User manually deletes old PDF, uploads new one)
- Should system track version history?

#### Searchable Dropdown Implementation
**Requirements:**
- Display all reports from Google Sheet
- Show "Display Name" (column Q)
- Group by State (column B)
- Sort alphabetically within each state
- User can type to search/filter
- Select report → Populate fields

**Questions:**
- Use existing React component library (e.g., react-select, Headless UI)?
- How to handle large number of reports (100+)? (Pagination, virtual scrolling)
- Should dropdown show report age/status? (e.g., "Out of Date" badge)
- Cache dropdown data or fetch fresh each time?

---

## Technical Constraints

1. **Next.js 14** (App Router)
2. **React 18** with TypeScript
3. **Zustand** for state management (useFormStore)
4. **Google Drive API** for file operations
5. **Google Sheets API** for data storage
6. **pdf-parse** for PDF text extraction
7. **Tailwind CSS** for styling

---

## Your Deliverables

Please provide:

### 1. Architecture Overview
- Component hierarchy (which components need to be created/modified)
- Data flow diagram (text-based is fine)
- API endpoints needed (new or modified)
- State management approach

### 2. Implementation Plan (Step-by-Step)
Break down into phases:
- **Phase 1:** Core functionality (what to build first)
- **Phase 2:** Enhanced features (what to add next)
- **Phase 3:** Edge cases & polish (what to handle last)

For each phase, list:
- Files to create/modify
- Dependencies (what must be done before this)
- Estimated complexity (simple/medium/complex)

### 3. Edge Case Analysis
Identify potential issues:
- What could go wrong?
- How to handle errors gracefully?
- What validation is needed?
- What user feedback is required?

### 4. Answers to Questions
Address all questions marked **"Questions:"** throughout this document.

### 5. Recommendations
- Best practices for this workflow
- Potential optimizations
- Future enhancements to consider

---

## Reminder

**DO NOT WRITE ANY CODE.**

Provide analysis, architecture, and implementation plan only. The implementation will be done by another AI assistant based on your analysis.

---

## Context Documents (if needed)

You may reference:
- `PDF-EXTRACTION-FIX-ANALYSIS.md` (timing issue with PDF extraction)
- `PRIORITY-CHECKLIST.md` (current project priorities)
- `CURRENT-SESSION-HANDOVER.md` (project context)

---

**End of Prompt**

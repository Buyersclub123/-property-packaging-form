# Investment Highlights Enhanced Workflow - Analysis Prompt

**⚠️ IMPORTANT: DO NOT WRITE ANY CODE. PROVIDE ANALYSIS AND RECOMMENDATIONS ONLY.**

---

## Your Task

Analyze the current Investment Highlights workflow and provide a detailed implementation plan for the enhanced workflow described below. Your output should be a comprehensive analysis document, NOT code implementation.

---

## Context

### Current System
The Investment Highlights field on Step 5 of a property packaging form currently:
1. Auto-looks up suburb/LGA in Google Sheet
2. If found → populates field with stored data
3. If not found → shows "no match" message with manual entry or PDF upload options

### Google Sheet Structure
**Sheet:** Investment Highlights  
**Columns:**
- A: Suburbs (comma-separated)
- B: State
- C: Report Name
- D: Valid Period (e.g., "October 2025 - January 2026")
- E: Main Body
- F: Extra Info
- G-M: Individual sections (Population Growth, Residential, Industrial, etc.)
- N: PDF Drive Link
- O: PDF File ID
- P: Display Name (NEW - user-friendly name for dropdown)

---

## Enhanced Workflow Requirements

### Branch 1: Perfect Match (Suburb + In-Date Report)
- Auto-populate form with stored values
- Show success message

### Branch 2: No Match for Suburb
1. Show message: "No matching Hotspotting report exists for [SUBURB]"
2. Show **searchable dropdown** with all reports:
   - Alphabetical order
   - Grouped by state
   - Display "Display Name" field (Column P)
3. User options:
   - **Select existing report** → Use stored values, add suburb to that report's list
   - **Upload new PDF** → Drag & drop, auto-extract, save to Hotspotting folder

### Branch 3: Suburb Not Auto-Matched, But Report Exists
1. Show dropdown of all reports
2. User selects matching report
3. System uses stored values
4. System adds suburb to that report's suburb list

### Branch 4: Match Found BUT Report is Out of Date
1. Parse "Valid Period" field (e.g., "October 2025 - January 2026")
2. Extract end date (e.g., "January 2026")
3. Compare with today's date
4. If expired → Show warning: "⚠️ This report expired in [Month Year]. Check for updates: https://membership.hotspotting.com.au/hotspotting-reports"
5. User options:
   - **"Use Existing Report"** → Use stored values as-is
   - **"Upload New Report"** → Upload new PDF, retain suburb relationships

---

## Key Features to Analyze

### 1. Searchable Dropdown
- How to implement searchable dropdown in React/Next.js?
- How to group by state and sort alphabetically?
- How to handle large lists (50+ reports)?
- Best UI/UX library or component?

### 2. Date Validation
- How to parse "Valid Period" field (various formats)?
- How to extract end date reliably?
- How to compare with today's date?
- How to handle edge cases (TBC, missing dates, etc.)?

### 3. Drag & Drop PDF Upload
- Already implemented, but needs review
- Current implementation in `InvestmentHighlightsField.tsx`
- How to improve UX?

### 4. Auto-Extract PDF Metadata
- Already implemented, but has timing issues
- Current issue: Google Drive needs time to process PDF after upload
- How to implement retry logic with exponential backoff?

### 5. Suburb Auto-Mapping
- When user selects report from dropdown, add current suburb to that report's suburb list
- How to update Google Sheet?
- How to handle duplicates?
- Show confirmation message

### 6. File ID Tracking
- Use PDF File ID (Column O) as unique identifier
- Display Name (Column P) shown to users
- Report Name (Column C) can change, File ID stays constant
- How to validate user didn't accidentally select wrong file?

### 7. Google Drive Shortcuts
- Add shortcut to Hotspotting PDF in property folder
- NOT a copy, a shortcut (single source of truth)
- How to create shortcuts in Google Drive API?
- How to ensure client can't navigate to Hotspotting folder?

---

## Current Implementation Files

### Main Component
**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`  
**Current features:**
- Auto-lookup on mount
- PDF upload with drag & drop
- Metadata extraction
- Match found/not found UI
- Manual entry fallback

### API Endpoints
1. `/api/investment-highlights/lookup` - Lookup by suburb/LGA
2. `/api/investment-highlights/save` - Save new report to sheet
3. `/api/investment-highlights/upload-pdf` - Upload PDF to Google Drive
4. `/api/investment-highlights/extract-metadata` - Extract report name/period from PDF
5. `/api/investment-highlights/organize-pdf` - Move PDF to CURRENT/LEGACY folders

### Known Issues
1. **PDF Extraction Timing:** Google Drive needs time to process PDF after upload, causing 404 errors
2. **Field Clearing:** Investment Highlights field clears when Proximity loads (separate issue, being fixed)

---

## Your Analysis Should Include

### 1. Architecture Review
- Review current component structure
- Identify what needs to change vs what can stay
- Propose component breakdown (if needed)

### 2. UI/UX Design
- Searchable dropdown design (library recommendations)
- State grouping approach
- Date validation UI (warning messages, colors, icons)
- User flow for each branch (1-4)

### 3. Data Flow
- How data flows from Google Sheet → Dropdown → Form
- How suburb mapping updates sheet
- How File ID tracking works
- How shortcuts are created

### 4. API Changes Needed
- New endpoints required?
- Modifications to existing endpoints?
- Error handling improvements?

### 5. Edge Cases
- What if dropdown has 100+ reports?
- What if "Valid Period" format is inconsistent?
- What if user uploads same PDF twice?
- What if suburb already in report's list?
- What if Google Drive API fails?

### 6. Implementation Phases
Break down into phases:
- **Phase 1:** Core functionality (dropdown, date validation)
- **Phase 2:** Enhanced features (drag & drop improvements, shortcuts)
- **Phase 3:** Polish (error handling, edge cases, UX refinements)

### 7. Testing Strategy
- What needs to be tested?
- Test scenarios for each branch
- Edge cases to cover

---

## Questions to Answer

1. **Dropdown Library:** What's the best React library for searchable, grouped dropdowns?
2. **Date Parsing:** How to reliably parse "Valid Period" in various formats?
3. **Retry Logic:** Best approach for PDF extraction retry with exponential backoff?
4. **State Management:** Does current form store need changes?
5. **Performance:** How to handle large dropdown lists efficiently?
6. **Validation:** How to prevent user from selecting wrong report?
7. **Shortcuts:** Google Drive API method for creating shortcuts?

---

## Expected Output Format

Please provide your analysis as a markdown document with these sections:

```markdown
# Investment Highlights Enhanced Workflow - Analysis

## 1. Architecture Review
[Your analysis of current structure and proposed changes]

## 2. UI/UX Design Recommendations
[Dropdown design, state grouping, date validation UI]

## 3. Data Flow Diagram
[Describe data flow for each branch]

## 4. API Changes Required
[New endpoints, modifications, error handling]

## 5. Edge Cases & Solutions
[List edge cases and how to handle them]

## 6. Implementation Phases
[Break down into manageable phases with estimates]

## 7. Testing Strategy
[Test scenarios and coverage]

## 8. Library Recommendations
[Specific libraries/packages to use]

## 9. Risks & Mitigation
[Potential issues and how to avoid them]

## 10. Open Questions
[Questions that need user input/clarification]
```

---

## Additional Context

### User Preferences
- Drag & drop is preferred over file navigation
- Shortcuts preferred over copies (single source of truth)
- Auto-mapping should be automatic (no confirmation prompt)
- Display Name (Column P) should be shown to users, not File ID

### Technical Stack
- Next.js 14
- React
- TypeScript
- Zustand (state management)
- Google Drive API
- Google Sheets API
- Tailwind CSS

### Time Constraints
- This is a high-priority feature (big win)
- User wants to start implementation today
- Estimated effort: 6-8 hours total

---

**Remember: DO NOT write code. Provide comprehensive analysis and recommendations only.**

Your analysis will be used by another AI to implement the solution, so be thorough and specific.

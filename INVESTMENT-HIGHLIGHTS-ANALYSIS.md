# Investment Highlights Enhanced Workflow - Analysis & Implementation Plan

**Date:** January 22, 2026  
**Analyst:** AI Assistant (Claude Sonnet 4.5)  
**Status:** Analysis Complete - Ready for Implementation  
**Priority:** High - Core workflow enhancement

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Current System Analysis](#current-system-analysis)
4. [Answers to Requirements Questions](#answers-to-requirements-questions)
5. [Implementation Plan](#implementation-plan)
6. [Edge Case Analysis](#edge-case-analysis)
7. [Recommendations](#recommendations)
8. [Appendix](#appendix)

---

## Executive Summary

### Purpose
Enhance the Investment Highlights workflow to provide intelligent report matching, date validation, suburb mapping, and seamless PDF management across a multi-branch decision tree.

### Key Enhancements
1. **Date Validation:** Automatically check if reports are in-date vs out-of-date
2. **Searchable Dropdown:** Allow users to browse all reports when no suburb match exists
3. **Suburb Mapping:** Automatically add suburbs to reports when selected from dropdown
4. **PDF Shortcuts:** Create Google Drive shortcuts in property folders (not copies)
5. **Report Updates:** Handle report updates while preserving suburb relationships

### Complexity Assessment
- **Overall Complexity:** Medium-High
- **Estimated Implementation Time:** 16-20 hours
- **Risk Level:** Medium (Google Drive API complexity, date parsing edge cases)

### Current State
- ✅ Basic lookup by suburb/LGA + state
- ✅ PDF upload with auto-extraction
- ✅ Manual entry fallback
- ✅ Google Sheets storage (15 columns A-O)
- ⚠️ Known issue: PDF extraction timing (documented in PDF-EXTRACTION-FIX-ANALYSIS.md)

### Target State
- ✅ All current features preserved
- ✅ Date validation with user-friendly messages
- ✅ Searchable dropdown with state grouping
- ✅ Automatic suburb mapping with validation
- ✅ PDF shortcuts in property folders
- ✅ Report update workflow with version preservation

---

## Architecture Overview

### Component Hierarchy

```
Step5 (Parent Component)
└── InvestmentHighlightsField (Main Component)
    ├── ReportStatusDisplay (NEW - shows match/no-match/out-of-date)
    ├── ReportDropdown (NEW - searchable dropdown with state grouping)
    ├── DateValidator (NEW - utility component for date parsing)
    ├── PdfUploadZone (EXISTING - drag & drop)
    ├── MetadataVerification (EXISTING - confirm extracted data)
    ├── SectionEditor (EXISTING - AI-generated sections)
    └── ManualEntryForm (EXISTING - fallback)
```

### Data Flow Diagram

```
User arrives on Step 5
        ↓
[Auto-lookup by suburb/LGA + state]
        ↓
    ┌───────────────────────────────────┐
    │   Match found?                    │
    └───────────────────────────────────┘
            ↓ YES                ↓ NO
    ┌──────────────┐      ┌──────────────────┐
    │ Check date   │      │ Show dropdown    │
    │ validity     │      │ with all reports │
    └──────────────┘      └──────────────────┘
         ↓                      ↓
    ┌──────────┐           ┌──────────┐
    │ In-date? │           │ User     │
    └──────────┘           │ selects? │
         ↓                  └──────────┘
    YES ↓    NO ↓               ↓ YES
    ┌────┐  ┌────────┐     ┌──────────┐
    │Auto│  │Warning │     │Add suburb│
    │fill│  │+ Upload│     │to report │
    └────┘  │or Use  │     └──────────┘
            │Existing│          ↓
            └────────┘     ┌──────────┐
                           │Check date│
                           └──────────┘
                                ↓
                           ┌──────────┐
                           │Auto-fill │
                           └──────────┘
```

### API Endpoints

#### Existing (to be modified)
1. **`/api/investment-highlights/lookup`** (POST)
   - **Current:** Returns match/no-match
   - **Enhancement:** Add date validation, return date status
   - **New Response:** `{ found, data, dateStatus: 'in-date' | 'out-of-date' | 'unknown', daysRemaining }`

2. **`/api/investment-highlights/save`** (POST)
   - **Current:** Saves new report or updates existing
   - **Enhancement:** Handle suburb additions, validate File ID for updates
   - **New Logic:** Check if suburb already exists before adding

#### New Endpoints
3. **`/api/investment-highlights/list-all`** (GET)
   - **Purpose:** Return all reports for dropdown
   - **Response:** `{ reports: [{ displayName, reportName, state, validPeriod, fileId, suburbs, dateStatus }] }`
   - **Sorting:** Group by state, alphabetically within each group

4. **`/api/investment-highlights/add-suburb`** (POST)
   - **Purpose:** Add suburb to existing report
   - **Input:** `{ fileId, suburb, validateInPdf: boolean }`
   - **Logic:** Check if suburb exists in PDF (optional), add to column A
   - **Response:** `{ success, message }`

5. **`/api/investment-highlights/create-shortcut`** (POST)
   - **Purpose:** Create Google Drive shortcut in property folder
   - **Input:** `{ pdfFileId, propertyFolderId, customName }`
   - **Response:** `{ success, shortcutId }`

6. **`/api/investment-highlights/update-report`** (POST)
   - **Purpose:** Update existing report (new PDF, new dates)
   - **Input:** `{ fileId, newReportName?, newValidPeriod, newPdfFileId?, preserveSuburbs: true }`
   - **Logic:** Update report data, optionally replace PDF, keep suburbs
   - **Response:** `{ success, message }`

### State Management (Zustand)

**Current Store Structure:**
```typescript
useFormStore: {
  investmentHighlights: string, // Main body text
  // ... other form fields
}
```

**No Changes Required** - All new functionality uses local component state. The main `investmentHighlights` field remains the single source of truth for the textarea content.

### Google Sheets Structure

**Sheet Name:** "Investment Highlights Data"  
**Current Columns (A-O):**
- **A:** Suburbs (comma-separated)
- **B:** State
- **C:** Report Name
- **D:** Valid Period
- **E:** Main Body (combined text)
- **F:** Extra Info
- **G:** Population Growth Context
- **H:** Residential
- **I:** Industrial
- **J:** Commercial and Civic
- **K:** Health and Education
- **L:** Transport
- **M:** Job Implications
- **N:** PDF Drive Link
- **O:** PDF File ID

**New Column (to be added):**
- **P:** Display Name (auto-generated: "[Report Name] ([Valid Period])")

**Note:** Display Name can be generated on-the-fly from columns C + D, so adding column P is optional. Recommend generating dynamically to avoid sync issues.

---

## Current System Analysis

### Strengths
1. ✅ **Robust PDF Upload:** Drag & drop, file validation, size limits
2. ✅ **Auto-Extraction:** Metadata extraction from PDFs (with known timing issue)
3. ✅ **Flexible Matching:** Searches by both LGA and suburb
4. ✅ **Manual Fallback:** Users can paste data if extraction fails
5. ✅ **AI Summary:** Phase 4C-2 AI-powered section extraction
6. ✅ **State Persistence:** Zustand store maintains form state

### Weaknesses
1. ❌ **No Date Validation:** System doesn't check if reports are current
2. ❌ **No Report Discovery:** Users can't browse available reports
3. ❌ **No Suburb Mapping:** Can't add suburb to existing report
4. ❌ **PDF Duplication:** No shortcut mechanism (would need to copy PDFs)
5. ❌ **No Update Workflow:** Unclear how to update existing reports
6. ❌ **Timing Issue:** PDF extraction fails on fresh uploads (documented separately)

### Technical Debt
1. **PDF Extraction Timing:** Needs retry logic with exponential backoff (see PDF-EXTRACTION-FIX-ANALYSIS.md)
2. **Error Handling:** Some error states lack user-friendly messages
3. **Loading States:** Some async operations don't show progress indicators
4. **Validation:** Limited validation on user inputs (Report Name, Valid Period)

### Dependencies
- **Google Drive API:** File upload, download, move, shortcut creation
- **Google Sheets API:** Read, write, update rows
- **pdf-parse:** PDF text extraction
- **Next.js 14:** App Router, API routes
- **React 18:** Component rendering
- **Zustand:** State management
- **Tailwind CSS:** Styling

---

## Answers to Requirements Questions

### Branch 1: Date Validation Questions

**Q: How to parse various date formats in "Valid Period"?**

**A:** Use a multi-strategy parsing approach:

1. **Strategy 1: Month Range Extraction**
   - Pattern: `"SEPTEMBER - DECEMBER 2025"` → Extract end month + year
   - Regex: `/(\w+)\s*-\s*(\w+)\s+(\d{4})/i`
   - Logic: Parse second month as end date (Dec 31, 2025)

2. **Strategy 2: Single Month**
   - Pattern: `"October 2025"` → Extract month + year
   - Regex: `/(\w+)\s+(\d{4})/i`
   - Logic: Parse as last day of month (Oct 31, 2025)

3. **Strategy 3: Quarter**
   - Pattern: `"Q4 2025"` → Map quarter to end month
   - Mapping: Q1→Mar, Q2→Jun, Q3→Sep, Q4→Dec
   - Logic: Parse as last day of quarter (Dec 31, 2025)

4. **Strategy 4: Year Only**
   - Pattern: `"2025"` → Assume end of year
   - Logic: Parse as Dec 31, 2025

5. **Strategy 5: Cross-Year Ranges**
   - Pattern: `"December 2025 - January 2026"` → Extract end date
   - Logic: Parse second date (Jan 31, 2026)

**Implementation:**
```typescript
function parseValidPeriodEndDate(validPeriod: string): Date | null {
  const cleaned = validPeriod.trim().toUpperCase();
  
  // Strategy 1: Month range (e.g., "SEPTEMBER - DECEMBER 2025")
  const rangeMatch = cleaned.match(/(\w+)\s*-\s*(\w+)\s+(\d{4})/);
  if (rangeMatch) {
    const [_, startMonth, endMonth, year] = rangeMatch;
    return parseMonthYear(endMonth, year);
  }
  
  // Strategy 2: Single month (e.g., "October 2025")
  const singleMatch = cleaned.match(/(\w+)\s+(\d{4})/);
  if (singleMatch) {
    const [_, month, year] = singleMatch;
    return parseMonthYear(month, year);
  }
  
  // Strategy 3: Quarter (e.g., "Q4 2025")
  const quarterMatch = cleaned.match(/Q([1-4])\s+(\d{4})/);
  if (quarterMatch) {
    const [_, quarter, year] = quarterMatch;
    const endMonth = ['MARCH', 'JUNE', 'SEPTEMBER', 'DECEMBER'][parseInt(quarter) - 1];
    return parseMonthYear(endMonth, year);
  }
  
  // Strategy 4: Year only (e.g., "2025")
  const yearMatch = cleaned.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1]), 11, 31); // Dec 31
  }
  
  // Strategy 5: Cross-year range (e.g., "December 2025 - January 2026")
  const crossYearMatch = cleaned.match(/(\w+)\s+(\d{4})\s*-\s*(\w+)\s+(\d{4})/);
  if (crossYearMatch) {
    const [_, startMonth, startYear, endMonth, endYear] = crossYearMatch;
    return parseMonthYear(endMonth, endYear);
  }
  
  return null; // Unable to parse
}

function parseMonthYear(month: string, year: string): Date {
  const monthMap: Record<string, number> = {
    'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3,
    'MAY': 4, 'JUNE': 5, 'JULY': 6, 'AUGUST': 7,
    'SEPTEMBER': 8, 'OCTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11
  };
  
  const monthIndex = monthMap[month.toUpperCase()];
  if (monthIndex === undefined) return new Date(parseInt(year), 11, 31); // Default to Dec 31
  
  // Get last day of month
  const yearNum = parseInt(year);
  const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
  return new Date(yearNum, monthIndex, lastDay);
}
```

**Recommendation:** Use `date-fns` library for robust date manipulation:
```typescript
import { parse, lastDayOfMonth, isAfter, differenceInDays } from 'date-fns';
```

---

**Q: What if "Valid Period" is malformed or missing?**

**A:** Implement graceful degradation:

1. **Missing Valid Period:**
   - Show warning: "⚠️ Report date unknown. Please verify this report is current."
   - Allow user to proceed (don't block)
   - Log warning for admin review

2. **Malformed Valid Period:**
   - Attempt all parsing strategies
   - If all fail, treat as "unknown date"
   - Show same warning as missing
   - Provide "Edit Report" button to fix date

3. **Ambiguous Dates:**
   - If multiple interpretations possible, choose most conservative (earliest end date)
   - Show warning: "⚠️ Report date is ambiguous. Interpreted as [DATE]."

**Implementation:**
```typescript
function validateReportDate(validPeriod: string): DateValidationResult {
  if (!validPeriod || validPeriod.trim() === '') {
    return {
      status: 'unknown',
      message: 'Report date unknown. Please verify this report is current.',
      endDate: null,
      daysRemaining: null,
    };
  }
  
  const endDate = parseValidPeriodEndDate(validPeriod);
  
  if (!endDate) {
    return {
      status: 'unknown',
      message: `Unable to parse date: "${validPeriod}". Please verify manually.`,
      endDate: null,
      daysRemaining: null,
    };
  }
  
  const today = new Date();
  const daysRemaining = differenceInDays(endDate, today);
  
  if (daysRemaining < 0) {
    return {
      status: 'out-of-date',
      message: `Report expired on ${formatDate(endDate)} (${Math.abs(daysRemaining)} days ago)`,
      endDate,
      daysRemaining,
    };
  }
  
  return {
    status: 'in-date',
    message: `Report valid until ${formatDate(endDate)} (${daysRemaining} days remaining)`,
    endDate,
    daysRemaining,
  };
}
```

---

**Q: Should system show report age?**

**A:** **YES** - Highly recommended for transparency.

**Display Logic:**
- **In-date:** "✓ Report valid until Dec 2025 (245 days remaining)"
- **Out-of-date:** "⚠️ Report expired on Dec 2024 (45 days ago)"
- **Unknown:** "⚠️ Report date unknown. Please verify manually."

**Color Coding:**
- **Green:** In-date (>30 days remaining)
- **Yellow:** Expiring soon (1-30 days remaining)
- **Red:** Out-of-date (expired)
- **Gray:** Unknown date

**User Actions:**
- **In-date:** Auto-populate fields, allow proceed
- **Expiring soon:** Show warning, allow proceed, suggest checking for update
- **Out-of-date:** Show warning, offer "Use Existing" or "Upload New Report"
- **Unknown:** Show warning, allow proceed with caution

---

### Branch 2: Dropdown & Upload Questions

**Q: How to implement drag & drop zone?**

**A:** Already implemented! Current component has excellent drag & drop:

**Existing Implementation (lines 274-300 in InvestmentHighlightsField.tsx):**
```typescript
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
  
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    const file = files[0];
    handlePdfUpload(syntheticEvent);
  }
};
```

**Styling (lines 575-606):**
- Border changes on drag: `border-blue-500 bg-blue-50` when dragging
- Visual feedback: File icon, clear instructions
- Disabled state: Opacity 50% when uploading

**No changes needed** - existing implementation is production-ready.

---

**Q: Should system validate Report Name against PDF content?**

**A:** **YES, but as optional validation** (not blocking).

**Approach:**
1. **Extract Report Name from PDF** (already done in `extract-metadata`)
2. **Compare with user input:**
   - Exact match → ✓ Auto-confirm
   - Partial match → ⚠️ Show warning: "Extracted name: [X], you entered: [Y]. Continue?"
   - No match → ⚠️ Show warning: "Could not verify report name from PDF. Please confirm."
3. **Allow user to override** (don't block submission)

**Rationale:** PDF extraction isn't 100% reliable. User judgment is final authority.

---

**Q: What if user provides wrong Valid Period?**

**A:** Implement validation + correction workflow:

1. **Extraction Phase:**
   - Show extracted Valid Period in editable field
   - Highlight field if parsing fails (red border)
   - Show format hint: "e.g., October 2025 - January 2026"

2. **Validation Phase:**
   - Parse user input on blur
   - Show preview: "Interpreted as: Valid until Jan 31, 2026"
   - If parsing fails: Show error: "Unable to parse date. Please use format: [examples]"

3. **Correction Phase:**
   - Allow user to edit anytime
   - Re-validate on change
   - Save original PDF text for reference

**Implementation:**
```typescript
const [validPeriodInput, setValidPeriodInput] = useState('');
const [validPeriodParsed, setValidPeriodParsed] = useState<Date | null>(null);
const [validPeriodError, setValidPeriodError] = useState('');

const handleValidPeriodChange = (value: string) => {
  setValidPeriodInput(value);
  
  const parsed = parseValidPeriodEndDate(value);
  if (parsed) {
    setValidPeriodParsed(parsed);
    setValidPeriodError('');
  } else {
    setValidPeriodParsed(null);
    setValidPeriodError('Unable to parse date. Use format: "Month - Month Year" or "Month Year"');
  }
};
```

---

**Q: How to generate Display Name automatically?**

**A:** Use template: `"[Report Name] ([Valid Period])"`

**Implementation:**
```typescript
function generateDisplayName(reportName: string, validPeriod: string): string {
  const cleanReportName = reportName.trim();
  const cleanValidPeriod = validPeriod.trim();
  
  if (!cleanReportName) return 'Unnamed Report';
  if (!cleanValidPeriod) return cleanReportName;
  
  return `${cleanReportName} (${cleanValidPeriod})`;
}
```

**Examples:**
- Input: `reportName="INNER WEST LGA"`, `validPeriod="SEPTEMBER - DECEMBER 2025"`
- Output: `"INNER WEST LGA (SEPTEMBER - DECEMBER 2025)"`

**Storage:** Generate on-the-fly (don't store in column P). This avoids sync issues if Report Name or Valid Period changes.

---

### Branch 3: Report Update Questions

**Q: How to handle Report Name changes? (Use File ID as primary key?)**

**A:** **YES - Use File ID (column O) as primary key.**

**Rationale:**
- Report Names can change (e.g., "Fraser Coast" → "Fraser Coast LGA")
- File ID is immutable (assigned by Google Drive)
- File ID uniquely identifies the PDF source

**Update Logic:**
```typescript
async function updateReport(fileId: string, updates: Partial<ReportData>) {
  // 1. Find row by File ID (column O)
  const rows = await fetchAllRows();
  const rowIndex = rows.findIndex(row => row[14] === fileId); // Column O
  
  if (rowIndex === -1) {
    throw new Error('Report not found');
  }
  
  // 2. Merge updates with existing data
  const existingRow = rows[rowIndex];
  const updatedRow = {
    suburbs: updates.suburbs ?? existingRow[0], // Preserve suburbs
    state: updates.state ?? existingRow[1],
    reportName: updates.reportName ?? existingRow[2], // Allow name change
    validPeriod: updates.validPeriod ?? existingRow[3],
    mainBody: updates.mainBody ?? existingRow[4],
    // ... other fields
    fileId: existingRow[14], // Never change File ID
  };
  
  // 3. Update row in Google Sheets
  await updateSheetRow(rowIndex, updatedRow);
}
```

**Edge Case:** What if user uploads completely new PDF (new File ID)?
- Treat as new report
- Ask user: "Is this an update to [OLD REPORT] or a new report?"
- If update: Copy suburbs from old report, delete old row
- If new: Create new row

---

**Q: Should system keep old PDF or delete it?**

**A:** **Keep old PDF in "LEGACY" folder.**

**Workflow:**
1. User uploads new PDF for existing report
2. System detects update (same Report Name, different File ID)
3. **Move old PDF** to `Hotspotting/[STATE]/LEGACY/` folder
4. **Rename old PDF** with timestamp: `[Report Name]_archived_[DATE].pdf`
5. **Upload new PDF** to `Hotspotting/[STATE]/CURRENT/` folder
6. **Update Google Sheet** with new File ID + Drive Link
7. **Update shortcuts** in property folders (shortcuts automatically point to new file)

**Benefits:**
- Audit trail (can recover old reports)
- No data loss
- Shortcuts automatically update (they reference File ID, which now points to new location)

**Implementation:**
```typescript
async function archiveOldPdf(oldFileId: string, reportName: string) {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const newName = `${reportName}_archived_${timestamp}.pdf`;
  
  // Move to LEGACY folder
  await moveFile(oldFileId, legacyFolderId);
  
  // Rename file
  await renameFile(oldFileId, newName);
}
```

---

**Q: What if user uploads wrong PDF (different report)?**

**A:** Implement validation + confirmation:

1. **Extraction Phase:**
   - Extract Report Name from new PDF
   - Compare with existing Report Name
   - Calculate similarity score (e.g., Levenshtein distance)

2. **Validation Phase:**
   - **High similarity (>80%):** Auto-confirm, proceed
   - **Medium similarity (50-80%):** Show warning: "New report name '[X]' differs from existing '[Y]'. Continue?"
   - **Low similarity (<50%):** Show error: "This appears to be a different report. Are you sure?"

3. **User Confirmation:**
   - Show side-by-side comparison:
     ```
     Existing Report: FRASER COAST
     New PDF: SUNSHINE COAST
     
     These appear to be different reports.
     [ ] I confirm this is an update to FRASER COAST
     [ ] This is a new report (create separate entry)
     ```

**Implementation:**
```typescript
function calculateSimilarity(str1: string, str2: string): number {
  // Use Levenshtein distance or simple token matching
  const tokens1 = str1.toLowerCase().split(/\s+/);
  const tokens2 = str2.toLowerCase().split(/\s+/);
  
  const commonTokens = tokens1.filter(t => tokens2.includes(t));
  const similarity = (commonTokens.length * 2) / (tokens1.length + tokens2.length);
  
  return similarity * 100; // Return percentage
}
```

---

**Q: How to validate new PDF matches existing report?**

**A:** Multi-factor validation:

1. **Report Name Similarity** (see above)
2. **State Match:**
   - Extract state from PDF (if possible)
   - Compare with existing report state
   - Mismatch → Show error: "State mismatch: existing [NSW], new [QLD]"

3. **Suburb Overlap:**
   - Extract suburbs from new PDF
   - Compare with existing suburbs in column A
   - Calculate overlap percentage
   - Low overlap (<30%) → Show warning: "New PDF covers different suburbs"

4. **Content Similarity:**
   - Compare section headings (Residential, Industrial, etc.)
   - If structure differs significantly → Show warning

**Recommendation:** Use Report Name + State as primary validation. Suburb/content checks are optional (nice-to-have).

---

### Branch 4: Suburb Mapping Questions

**Q: How to extract suburbs from PDF reliably?**

**A:** Use pattern matching + AI extraction (hybrid approach).

**Strategy 1: Pattern Matching**
```typescript
function extractSuburbsFromPdf(pdfText: string): string[] {
  // Look for suburb lists in common formats:
  // - "Suburbs: Petersham, Stanmore, Lewisham"
  // - "Covering: Petersham | Stanmore | Lewisham"
  // - Bullet lists with suburb names
  
  const patterns = [
    /Suburbs?:\s*([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*)/gi,
    /Covering:\s*([A-Z][a-z]+(?:[,|]\s*[A-Z][a-z]+)*)/gi,
    /Areas?:\s*([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*)/gi,
  ];
  
  const suburbs: Set<string> = new Set();
  
  for (const pattern of patterns) {
    const matches = pdfText.matchAll(pattern);
    for (const match of matches) {
      const suburbList = match[1].split(/[,|]/).map(s => s.trim());
      suburbList.forEach(s => suburbs.add(s));
    }
  }
  
  return Array.from(suburbs);
}
```

**Strategy 2: AI Extraction (if pattern matching fails)**
```typescript
async function extractSuburbsWithAI(pdfText: string): Promise<string[]> {
  // Use OpenAI API to extract suburbs
  const prompt = `Extract all suburb names from this Hotspotting report. Return as comma-separated list:\n\n${pdfText.substring(0, 5000)}`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });
  
  const suburbsText = response.choices[0].message.content;
  return suburbsText.split(',').map(s => s.trim());
}
```

**Recommendation:** Start with pattern matching (fast, free). Fall back to AI if no matches found.

---

**Q: What if PDF has 50+ suburbs listed? (Performance concern)**

**A:** Implement pagination + search in confirmation dialog.

**Approach:**
1. **Extract all suburbs** from PDF (background task)
2. **Store in temporary state** (don't add to sheet yet)
3. **Show confirmation dialog** with searchable list:
   ```
   This report covers 52 suburbs. Current suburb: [SUBURB NAME]
   
   [Search box: Filter suburbs...]
   
   ☐ Suburb 1
   ☐ Suburb 2
   ...
   ☑ [Current Suburb] (auto-selected)
   ...
   ☐ Suburb 52
   
   [✓ Confirm] [✗ Cancel]
   ```
4. **User confirms** → Add only current suburb to column A
5. **Future users** → System already knows this report covers that suburb

**Performance:** Extracting 50+ suburbs is fast (<1s). Rendering in UI is also fast with virtualization.

---

**Q: Should system track "manually added" vs "auto-detected" suburbs?**

**A:** **Optional - Not critical for MVP, but useful for auditing.**

**If implemented:**
- Add column Q: "Suburb Source" (values: "auto" | "manual" | "pdf-extracted")
- Store as JSON: `{"Petersham": "auto", "Stanmore": "manual"}`
- Use for analytics: "How many suburbs were manually added?"

**Recommendation:** Skip for MVP. Add later if needed.

---

**Q: What if user adds wrong suburb to wrong report? (Undo mechanism?)**

**A:** Implement soft undo + admin review.

**Approach 1: Soft Undo (Session-based)**
```typescript
// Store recent actions in session storage
const recentActions = [
  { action: 'add-suburb', reportId: 'abc123', suburb: 'Petersham', timestamp: Date.now() }
];

// Show "Undo" button for 30 seconds
<button onClick={() => undoLastAction()}>
  ⟲ Undo: Added Petersham to Inner West LGA
</button>
```

**Approach 2: Admin Review Log**
- Add column R: "Last Modified" (timestamp)
- Add column S: "Modified By" (user email)
- Admin can review recent changes in Google Sheet
- Admin can manually remove incorrect suburbs

**Recommendation:** Use Approach 2 (simpler, no complex undo logic). Trust users + provide admin oversight.

---

### PDF Storage & Linking Questions

**Q: How to create Google Drive shortcut via API?**

**A:** Use `files.create` with `mimeType: 'application/vnd.google-apps.shortcut'`.

**Implementation:**
```typescript
async function createShortcut(
  targetFileId: string,
  parentFolderId: string,
  shortcutName: string
): Promise<string> {
  const drive = getDriveClient();
  
  const response = await drive.files.create({
    requestBody: {
      name: shortcutName,
      mimeType: 'application/vnd.google-apps.shortcut',
      shortcutDetails: {
        targetId: targetFileId,
      },
      parents: [parentFolderId],
    },
    supportsAllDrives: true,
  });
  
  return response.data.id!;
}
```

**Usage:**
```typescript
// Create shortcut in property folder
const shortcutId = await createShortcut(
  pdfFileId, // Hotspotting PDF in main folder
  propertyFolderId, // Property-specific folder
  `Hotspotting Report - ${reportName}.pdf`
);
```

**Benefits:**
- Shortcut appears as normal file in property folder
- No duplication (single source of truth)
- Update Hotspotting PDF → All properties see latest version
- Saves storage space

---

**Q: Should shortcut have custom name?**

**A:** **YES** - Use format: `"Hotspotting Report - [Report Name].pdf"`

**Examples:**
- `"Hotspotting Report - Inner West LGA.pdf"`
- `"Hotspotting Report - Sunshine Coast.pdf"`

**Rationale:**
- Clear identification in property folder
- Distinguishes from other PDFs
- Consistent naming convention

**Implementation:**
```typescript
function generateShortcutName(reportName: string): string {
  return `Hotspotting Report - ${reportName}.pdf`;
}
```

---

**Q: What if property folder doesn't exist yet?**

**A:** **Defer shortcut creation until folder exists.**

**Approach:**
1. **Step 5 (Investment Highlights):**
   - User selects/uploads report
   - System saves report data to Google Sheet
   - **DO NOT create shortcut yet** (folder doesn't exist)
   - Store `pendingShortcut: { pdfFileId, reportName }` in form state

2. **Step 7 (Final Submission):**
   - System creates property folder
   - Check if `pendingShortcut` exists
   - If yes, create shortcut in newly created folder
   - Clear `pendingShortcut` flag

**Alternative:** Create shortcut retroactively
- Add "Create Shortcut" button on Step 5
- Only enable if property folder exists
- Show message: "Shortcut will be created when property folder is generated"

**Recommendation:** Use deferred creation (cleaner UX, no user action needed).

---

### Searchable Dropdown Questions

**Q: Use existing React component library?**

**A:** **YES** - Use **Headless UI** (already in Next.js ecosystem).

**Recommendation:** `@headlessui/react` Combobox component
- Built for accessibility (ARIA compliant)
- Unstyled (full Tailwind control)
- Supports search/filter
- Supports grouping
- Lightweight (~10KB)

**Installation:**
```bash
npm install @headlessui/react
```

**Example Implementation:**
```typescript
import { Combobox } from '@headlessui/react';

function ReportDropdown({ reports, onSelect }) {
  const [query, setQuery] = useState('');
  
  const filteredReports = reports.filter(report =>
    report.displayName.toLowerCase().includes(query.toLowerCase())
  );
  
  // Group by state
  const groupedReports = groupBy(filteredReports, 'state');
  
  return (
    <Combobox value={selectedReport} onChange={onSelect}>
      <Combobox.Input
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search reports..."
      />
      <Combobox.Options>
        {Object.entries(groupedReports).map(([state, stateReports]) => (
          <div key={state}>
            <div className="font-bold text-gray-700">{state}</div>
            {stateReports.map(report => (
              <Combobox.Option key={report.fileId} value={report}>
                {report.displayName}
              </Combobox.Option>
            ))}
          </div>
        ))}
      </Combobox.Options>
    </Combobox>
  );
}
```

**Alternative:** `react-select` (more features, heavier ~50KB)

---

**Q: How to handle large number of reports (100+)?**

**A:** Implement virtual scrolling + lazy loading.

**Strategy 1: Virtual Scrolling**
- Use `react-window` or `react-virtual`
- Only render visible items (10-20 at a time)
- Smooth scrolling for 1000+ items

**Strategy 2: Lazy Loading**
- Load first 50 reports on mount
- Load more as user scrolls
- Show "Loading..." indicator

**Strategy 3: Smart Filtering**
- Filter on backend (if >500 reports)
- Send query to `/api/investment-highlights/search?q=[query]`
- Return top 50 matches

**Recommendation:** Start with Strategy 1 (virtual scrolling). Most likely <100 reports for foreseeable future.

---

**Q: Should dropdown show report age/status?**

**A:** **YES** - Show status badge for clarity.

**Display Format:**
```
NSW
  ✓ Inner West LGA (Sep-Dec 2025) [245 days remaining]
  ⚠️ Parramatta LGA (Jan-Mar 2025) [EXPIRED]
  
QLD
  ✓ Sunshine Coast (Oct 2025-Jan 2026) [180 days remaining]
```

**Badge Colors:**
- **Green ✓:** In-date (>30 days remaining)
- **Yellow ⚠️:** Expiring soon (1-30 days)
- **Red ⚠️:** Out-of-date (expired)
- **Gray ?:** Unknown date

**Implementation:**
```typescript
function ReportStatusBadge({ dateStatus, daysRemaining }) {
  if (dateStatus === 'in-date' && daysRemaining > 30) {
    return <span className="text-green-600">✓</span>;
  }
  if (dateStatus === 'in-date' && daysRemaining <= 30) {
    return <span className="text-yellow-600">⚠️</span>;
  }
  if (dateStatus === 'out-of-date') {
    return <span className="text-red-600">⚠️ EXPIRED</span>;
  }
  return <span className="text-gray-500">?</span>;
}
```

---

**Q: Cache dropdown data or fetch fresh each time?**

**A:** **Hybrid approach: Cache with TTL (Time-To-Live).**

**Strategy:**
1. **First Load:** Fetch all reports from API
2. **Cache in Memory:** Store in component state (React Query or SWR)
3. **TTL:** 5 minutes (reports don't change frequently)
4. **Refresh:** On user action (e.g., "Refresh Reports" button)
5. **Invalidate:** After user uploads new report

**Implementation with SWR:**
```typescript
import useSWR from 'swr';

function useReports() {
  const { data, error, mutate } = useSWR(
    '/api/investment-highlights/list-all',
    fetcher,
    { refreshInterval: 300000 } // 5 minutes
  );
  
  return {
    reports: data?.reports || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}
```

**Benefits:**
- Fast subsequent loads (no API call)
- Fresh data every 5 minutes
- Manual refresh option
- Automatic revalidation on focus

**Recommendation:** Use SWR (Next.js recommended, lightweight).

---

## Implementation Plan

### Phase 1: Core Date Validation & Dropdown (Priority: HIGH)

**Goal:** Enable date validation and report browsing.

**Estimated Time:** 6-8 hours

#### 1.1 Date Validation Utility (2 hours)
**Files to Create:**
- `src/lib/dateValidation.ts` (new file)

**Functions:**
```typescript
export function parseValidPeriodEndDate(validPeriod: string): Date | null
export function validateReportDate(validPeriod: string): DateValidationResult
export function formatDateUserFriendly(date: Date): string
export function getDateStatusColor(status: DateStatus): string
```

**Dependencies:** Install `date-fns`
```bash
npm install date-fns
```

**Testing:**
- Test all date formats from requirements
- Test edge cases (malformed, missing, cross-year)
- Test timezone handling

**Complexity:** Medium (regex parsing, edge cases)

---

#### 1.2 List All Reports API (1 hour)
**Files to Create:**
- `src/app/api/investment-highlights/list-all/route.ts` (new file)

**Logic:**
1. Read all rows from Google Sheet (columns A-O)
2. For each row:
   - Generate display name
   - Validate date
   - Calculate days remaining
3. Sort by state, then alphabetically
4. Return JSON array

**Response Format:**
```typescript
{
  reports: [
    {
      fileId: string,
      displayName: string,
      reportName: string,
      state: string,
      validPeriod: string,
      suburbs: string[],
      dateStatus: 'in-date' | 'out-of-date' | 'unknown',
      daysRemaining: number | null,
      endDate: string | null,
    }
  ]
}
```

**Dependencies:** None (uses existing `googleSheets.ts`)

**Complexity:** Simple

---

#### 1.3 Enhanced Lookup API (1 hour)
**Files to Modify:**
- `src/app/api/investment-highlights/lookup/route.ts`

**Changes:**
1. Add date validation to lookup response
2. Return `dateStatus`, `daysRemaining`, `endDate`
3. Add `displayName` to response

**Before:**
```typescript
return NextResponse.json({ found: true, data });
```

**After:**
```typescript
const dateValidation = validateReportDate(data.validPeriod);
return NextResponse.json({ 
  found: true, 
  data,
  dateStatus: dateValidation.status,
  daysRemaining: dateValidation.daysRemaining,
  endDate: dateValidation.endDate,
  displayName: generateDisplayName(data.reportName, data.validPeriod),
});
```

**Complexity:** Simple

---

#### 1.4 Report Status Display Component (2 hours)
**Files to Create:**
- `src/components/steps/step5/ReportStatusDisplay.tsx` (new file)

**Props:**
```typescript
interface ReportStatusDisplayProps {
  status: 'checking' | 'found' | 'not-found' | 'out-of-date';
  reportName?: string;
  validPeriod?: string;
  dateStatus?: 'in-date' | 'out-of-date' | 'unknown';
  daysRemaining?: number | null;
  onUploadNew?: () => void;
  onUseExisting?: () => void;
}
```

**Displays:**
- ✓ Match found (green) - in-date
- ⚠️ Match found (yellow) - expiring soon
- ⚠️ Match found (red) - out-of-date (with action buttons)
- ⚠️ No match (yellow) - show dropdown prompt

**Complexity:** Simple (mostly UI)

---

#### 1.5 Searchable Dropdown Component (3-4 hours)
**Files to Create:**
- `src/components/steps/step5/ReportDropdown.tsx` (new file)

**Dependencies:**
```bash
npm install @headlessui/react swr
```

**Features:**
- Fetch reports from `/api/investment-highlights/list-all`
- Group by state
- Search/filter by report name or suburb
- Show status badges (in-date, expired)
- Virtual scrolling (if >50 reports)

**Props:**
```typescript
interface ReportDropdownProps {
  onSelect: (report: Report) => void;
  currentSuburb?: string;
  currentState?: string;
}
```

**Complexity:** Medium (Headless UI integration, grouping, search)

---

#### 1.6 Integrate into InvestmentHighlightsField (1 hour)
**Files to Modify:**
- `src/components/steps/step5/InvestmentHighlightsField.tsx`

**Changes:**
1. Replace inline status display with `<ReportStatusDisplay />`
2. Add `<ReportDropdown />` when `matchStatus === 'not-found'`
3. Handle dropdown selection → trigger date validation → auto-populate
4. Update state management for new fields

**Complexity:** Simple (integration)

---

### Phase 2: Suburb Mapping & PDF Shortcuts (Priority: MEDIUM)

**Goal:** Enable suburb additions and PDF shortcut creation.

**Estimated Time:** 5-6 hours

#### 2.1 Add Suburb API (1.5 hours)
**Files to Create:**
- `src/app/api/investment-highlights/add-suburb/route.ts` (new file)

**Logic:**
1. Receive: `{ fileId, suburb, validateInPdf: boolean }`
2. Find row by File ID (column O)
3. Check if suburb already exists in column A
4. If not, append to comma-separated list
5. Update Google Sheet
6. Return success

**Optional:** PDF validation
- If `validateInPdf: true`, extract suburbs from PDF
- Check if suburb exists in extracted list
- Return warning if not found

**Complexity:** Medium (string manipulation, validation)

---

#### 2.2 Create Shortcut API (2 hours)
**Files to Create:**
- `src/app/api/investment-highlights/create-shortcut/route.ts` (new file)

**Logic:**
1. Receive: `{ pdfFileId, propertyFolderId, customName }`
2. Check if shortcut already exists (search by name)
3. If exists, return existing shortcut ID
4. If not, create new shortcut using Google Drive API
5. Return shortcut ID

**Dependencies:** Existing `googleDrive.ts` utility

**New Function in `googleDrive.ts`:**
```typescript
export async function createShortcut(
  targetFileId: string,
  parentFolderId: string,
  shortcutName: string
): Promise<string>
```

**Complexity:** Medium (Google Drive API)

---

#### 2.3 Suburb Addition Workflow (1.5 hours)
**Files to Modify:**
- `src/components/steps/step5/InvestmentHighlightsField.tsx`

**Changes:**
1. When user selects report from dropdown:
   - Check if current suburb is in report's suburb list
   - If not, show confirmation dialog:
     ```
     This report does not list [SUBURB].
     Add [SUBURB] to this report?
     
     [✓ Yes, Add Suburb] [✗ Cancel]
     ```
2. On confirm, call `/api/investment-highlights/add-suburb`
3. Show success message: "✓ [Suburb] added to [Report Name]"
4. Proceed with auto-populate

**Complexity:** Simple (UI + API call)

---

#### 2.4 Shortcut Creation Workflow (1 hour)
**Files to Modify:**
- `src/components/steps/step5/InvestmentHighlightsField.tsx`
- Form submission logic (Step 7 or final submission)

**Changes:**
1. Store `pendingShortcut` in form state when report selected
2. On final submission (when property folder created):
   - Check if `pendingShortcut` exists
   - Call `/api/investment-highlights/create-shortcut`
   - Log success/failure

**Alternative:** Add "Create Shortcut" button on Step 5
- Only show if property folder already exists
- Manual trigger by user

**Complexity:** Simple (deferred execution)

---

### Phase 3: Report Updates & Edge Cases (Priority: LOW)

**Goal:** Handle report updates, validation, and edge cases.

**Estimated Time:** 5-6 hours

#### 3.1 Update Report API (2 hours)
**Files to Create:**
- `src/app/api/investment-highlights/update-report/route.ts` (new file)

**Logic:**
1. Receive: `{ fileId, newReportName?, newValidPeriod, newPdfFileId?, preserveSuburbs: true }`
2. Find row by File ID (column O)
3. If `newPdfFileId` provided:
   - Archive old PDF to LEGACY folder
   - Update PDF Drive Link (column N)
   - Update File ID (column O)
4. Update Report Name (column C) if provided
5. Update Valid Period (column D)
6. Preserve suburbs (column A) if `preserveSuburbs: true`
7. Update Google Sheet

**Complexity:** Medium (multi-step process, file operations)

---

#### 3.2 Report Update Workflow (2 hours)
**Files to Modify:**
- `src/components/steps/step5/InvestmentHighlightsField.tsx`

**Changes:**
1. When `matchStatus === 'out-of-date'`:
   - Show two buttons: "Use Existing Report" | "Upload New Report"
2. If "Upload New Report":
   - Show PDF upload zone
   - After upload, show verification form
   - Pre-fill with existing Report Name
   - Allow user to edit Report Name + Valid Period
   - On confirm, call `/api/investment-highlights/update-report`
3. If "Use Existing Report":
   - Auto-populate with existing data
   - Show warning banner: "⚠️ Using out-of-date report"

**Complexity:** Medium (conditional UI, state management)

---

#### 3.3 PDF Validation & Confirmation (1.5 hours)
**Files to Modify:**
- `src/app/api/investment-highlights/extract-metadata/route.ts`

**Changes:**
1. Add Report Name similarity check
2. Return similarity score in response
3. Frontend shows confirmation if similarity < 80%

**New Function in `src/lib/textUtils.ts`:**
```typescript
export function calculateSimilarity(str1: string, str2: string): number
```

**Complexity:** Simple (string comparison)

---

#### 3.4 Error Handling & User Feedback (1.5 hours)
**Files to Modify:**
- All API routes (add try-catch, better error messages)
- `InvestmentHighlightsField.tsx` (show user-friendly errors)

**Improvements:**
- Replace generic "Failed to..." with specific errors
- Add retry buttons for transient failures
- Add "Contact Support" link for persistent errors
- Log errors to console with context

**Complexity:** Simple (error handling patterns)

---

### Phase 4: Polish & Testing (Priority: LOW)

**Goal:** Fix bugs, improve UX, comprehensive testing.

**Estimated Time:** 4-5 hours

#### 4.1 Fix PDF Extraction Timing Issue (2 hours)
**Files to Modify:**
- `src/app/api/investment-highlights/extract-metadata/route.ts`

**Changes:**
- Implement retry logic with exponential backoff (see PDF-EXTRACTION-FIX-ANALYSIS.md)
- Add response type validation
- Better error messages

**Complexity:** Medium (async retry logic)

---

#### 4.2 UI/UX Improvements (1 hour)
- Add loading spinners for all async operations
- Improve button states (disabled, loading)
- Add tooltips for unclear actions
- Improve mobile responsiveness

**Complexity:** Simple (CSS + conditional rendering)

---

#### 4.3 Testing (2 hours)
**Test Cases:**
1. **Branch 1:** Auto-match, in-date report
2. **Branch 1:** Auto-match, out-of-date report
3. **Branch 2:** No match, user selects from dropdown
4. **Branch 2:** No match, user uploads new PDF
5. **Branch 3:** Out-of-date, user uploads new report
6. **Branch 3:** Out-of-date, user uses existing
7. **Branch 4:** Suburb not in report, user confirms addition
8. **Edge:** Malformed dates
9. **Edge:** PDF extraction failure
10. **Edge:** Large dropdown (50+ reports)

**Complexity:** Medium (comprehensive testing)

---

## Edge Case Analysis

### 1. Date Parsing Edge Cases

| Input | Expected Output | Handling |
|-------|----------------|----------|
| `"SEPTEMBER - DECEMBER 2025"` | Dec 31, 2025 | ✓ Parse end month |
| `"October 2025 - January 2026"` | Jan 31, 2026 | ✓ Parse cross-year |
| `"Q4 2025"` | Dec 31, 2025 | ✓ Map quarter to month |
| `"2025"` | Dec 31, 2025 | ✓ Assume end of year |
| `"Invalid Date"` | null | ⚠️ Show "unknown date" warning |
| `""` (empty) | null | ⚠️ Show "date missing" warning |
| `"Sept-Dec 2025"` (abbreviated) | Dec 31, 2025 | ✓ Handle abbreviations |
| `"December 2025 - January 2025"` (backwards) | Jan 31, 2025 | ⚠️ Show warning, use later date |

**Mitigation:**
- Comprehensive regex patterns
- Fallback to "unknown" status (don't block user)
- Allow manual override

---

### 2. Suburb Mapping Edge Cases

| Scenario | Handling |
|----------|----------|
| Suburb already exists in report | Skip addition, show message: "Already linked" |
| User adds wrong suburb | Allow admin to remove via Google Sheet |
| Suburb name has typo | No validation (trust user input) |
| Suburb name has special chars | Sanitize: trim, remove extra spaces |
| Multiple suburbs with same name (different states) | State already stored in column B (no conflict) |
| User adds LGA name instead of suburb | Allow (LGA is valid search term) |

**Mitigation:**
- Duplicate check before adding
- Admin review log (columns R-S: Last Modified, Modified By)
- No complex validation (KISS principle)

---

### 3. PDF Upload Edge Cases

| Scenario | Handling |
|----------|----------|
| PDF too large (>50MB) | Show error: "File too large. Max 50MB." |
| Non-PDF file | Show error: "Please select a PDF file." |
| Corrupted PDF | Extraction fails → Show manual entry form |
| PDF with no text (scanned images) | Extraction fails → Show manual entry form |
| PDF upload fails (network error) | Show retry button, log error |
| Google Drive quota exceeded | Show error: "Storage full. Contact admin." |
| PDF already exists (duplicate) | Check File ID, show warning: "This PDF already exists." |

**Mitigation:**
- File type + size validation before upload
- Graceful fallback to manual entry
- Clear error messages
- Retry mechanism for transient failures

---

### 4. Google Drive API Edge Cases

| Scenario | Handling |
|----------|----------|
| Shortcut creation fails | Log error, don't block form submission |
| Property folder doesn't exist | Defer shortcut creation to final submission |
| User lacks permissions | Show error: "Permission denied. Contact admin." |
| File ID not found | Show error: "PDF not found. May have been deleted." |
| Rate limit exceeded | Implement exponential backoff, retry |
| Network timeout | Show error: "Request timed out. Please retry." |

**Mitigation:**
- Deferred shortcut creation (non-blocking)
- Retry logic with backoff
- Admin notification for permission errors

---

### 5. Google Sheets API Edge Cases

| Scenario | Handling |
|----------|----------|
| Sheet not found | Show error: "Database not configured. Contact admin." |
| Row not found (File ID mismatch) | Treat as new report, create new row |
| Concurrent updates (race condition) | Last write wins (acceptable for this use case) |
| Cell value too long (>50,000 chars) | Truncate with warning: "Content truncated." |
| Invalid characters in cell | Sanitize: remove control characters |
| Sheet quota exceeded | Show error: "Database full. Contact admin." |

**Mitigation:**
- Validate Sheet ID on app startup
- Truncate long content (rare edge case)
- Admin monitoring for quota

---

### 6. User Workflow Edge Cases

| Scenario | Handling |
|----------|----------|
| User navigates away mid-upload | Upload continues (background), state lost (acceptable) |
| User refreshes page after upload | State lost, user must re-upload (acceptable) |
| User uploads report, then goes back to Step 4 | Form state preserved (Zustand), report data intact |
| User changes suburb on Step 1, returns to Step 5 | Re-trigger lookup with new suburb |
| Multiple users upload same report simultaneously | Last write wins, both reports saved (duplicate rows) |
| User manually edits Google Sheet | App reflects changes on next lookup (no caching issues) |

**Mitigation:**
- Zustand persists form state across navigation
- Re-lookup on suburb change (useEffect dependency)
- Accept duplicate rows (admin can clean up)

---

### 7. Display Name Edge Cases

| Input | Generated Display Name | Notes |
|-------|------------------------|-------|
| `reportName="INNER WEST LGA"`, `validPeriod="SEP-DEC 2025"` | `"INNER WEST LGA (SEP-DEC 2025)"` | ✓ Standard case |
| `reportName=""`, `validPeriod="SEP-DEC 2025"` | `"Unnamed Report"` | ⚠️ Missing report name |
| `reportName="INNER WEST LGA"`, `validPeriod=""` | `"INNER WEST LGA"` | ⚠️ Missing valid period |
| `reportName="  INNER WEST LGA  "`, `validPeriod="  SEP-DEC 2025  "` | `"INNER WEST LGA (SEP-DEC 2025)"` | ✓ Trim whitespace |

**Mitigation:**
- Trim whitespace
- Handle missing fields gracefully
- Generate on-the-fly (don't store)

---

### 8. Dropdown Performance Edge Cases

| Scenario | Handling |
|----------|----------|
| 100+ reports in dropdown | Implement virtual scrolling (react-window) |
| User types fast in search box | Debounce search (300ms delay) |
| API call fails | Show error: "Failed to load reports. Retry?" |
| API call slow (>5s) | Show loading spinner, allow cancel |
| No reports match search | Show message: "No reports found. Try different search." |

**Mitigation:**
- Virtual scrolling for large lists
- Debounced search for performance
- Timeout + retry for slow API calls

---

## Recommendations

### 1. Technical Recommendations

#### Use TypeScript Strictly
- Define interfaces for all API responses
- Use strict null checks
- Avoid `any` type

**Example:**
```typescript
interface DateValidationResult {
  status: 'in-date' | 'out-of-date' | 'unknown';
  message: string;
  endDate: Date | null;
  daysRemaining: number | null;
}
```

---

#### Implement Comprehensive Logging
- Log all API calls (request + response)
- Log user actions (suburb additions, report updates)
- Use structured logging (JSON format)

**Example:**
```typescript
console.log('[InvestmentHighlights]', {
  action: 'add-suburb',
  reportId: fileId,
  suburb: suburb,
  user: userEmail,
  timestamp: new Date().toISOString(),
});
```

---

#### Add Monitoring & Alerts
- Track API error rates
- Alert if Google Drive/Sheets API fails
- Monitor PDF extraction success rate

**Tools:** Sentry, LogRocket, or custom logging

---

#### Implement Feature Flags
- Roll out new features gradually
- A/B test dropdown vs manual entry
- Disable features if issues arise

**Example:**
```typescript
const ENABLE_DROPDOWN = process.env.NEXT_PUBLIC_ENABLE_DROPDOWN === 'true';
```

---

#### Write Unit Tests
- Test date parsing functions
- Test suburb addition logic
- Test display name generation

**Framework:** Jest + React Testing Library

---

### 2. UX Recommendations

#### Progressive Disclosure
- Don't show all options at once
- Reveal dropdown only when needed
- Hide advanced features behind "Show More"

---

#### Clear Visual Hierarchy
- Use color coding (green=good, yellow=warning, red=error)
- Use icons for status (✓, ⚠️, ✗)
- Use whitespace to separate sections

---

#### Helpful Error Messages
- ❌ Bad: "Error: 500"
- ✅ Good: "Failed to upload PDF. Please check your internet connection and try again."

---

#### Loading States
- Show spinner for all async operations
- Show progress for multi-step processes (Upload → Extract → Save)
- Disable buttons during loading (prevent double-submit)

---

#### Confirmation Dialogs
- Ask before destructive actions (delete, replace)
- Show preview of changes ("You are about to add [SUBURB] to [REPORT]")
- Provide "Cancel" option

---

### 3. Data Management Recommendations

#### Use File ID as Primary Key
- Never use Report Name as identifier (can change)
- Always use File ID (column O) for updates
- Index File ID column in Google Sheet (if possible)

---

#### Normalize Suburb Names
- Store in lowercase (easier matching)
- Trim whitespace
- Remove special characters (optional)

**Example:**
```typescript
function normalizeSuburb(suburb: string): string {
  return suburb.trim().toLowerCase().replace(/[^a-z0-9\s]/gi, '');
}
```

---

#### Audit Trail
- Add columns: Last Modified (timestamp), Modified By (email)
- Log all changes to separate "Audit Log" sheet
- Useful for debugging + compliance

---

#### Backup Strategy
- Google Sheets auto-saves (built-in backup)
- Export to CSV weekly (manual backup)
- Version history available in Google Sheets

---

### 4. Future Enhancements (Post-MVP)

#### AI-Powered Suburb Extraction
- Use OpenAI API to extract suburbs from PDF
- Validate user-added suburbs against PDF content
- Auto-suggest suburbs when user types

---

#### Bulk Operations
- "Add Multiple Suburbs" button
- "Update All Out-of-Date Reports" batch job
- Admin dashboard for bulk edits

---

#### Report Analytics
- Track most-used reports
- Track suburb additions (manual vs auto)
- Track PDF extraction success rate

---

#### Email Notifications
- Notify admin when report expires
- Notify users when new report available
- Weekly summary of report updates

---

#### Mobile Optimization
- Responsive dropdown (touch-friendly)
- Simplified UI for small screens
- Native file picker for mobile

---

#### Offline Support
- Cache reports in IndexedDB
- Allow form filling offline
- Sync when online

---

## Appendix

### A. File Structure

```
src/
├── app/
│   └── api/
│       └── investment-highlights/
│           ├── lookup/route.ts (MODIFY)
│           ├── save/route.ts (EXISTING)
│           ├── upload-pdf/route.ts (EXISTING)
│           ├── extract-metadata/route.ts (MODIFY)
│           ├── organize-pdf/route.ts (EXISTING)
│           ├── generate-summary/route.ts (EXISTING)
│           ├── list-all/route.ts (NEW)
│           ├── add-suburb/route.ts (NEW)
│           ├── create-shortcut/route.ts (NEW)
│           └── update-report/route.ts (NEW)
├── components/
│   └── steps/
│       └── step5/
│           ├── InvestmentHighlightsField.tsx (MODIFY)
│           ├── ReportStatusDisplay.tsx (NEW)
│           ├── ReportDropdown.tsx (NEW)
│           └── SuburbConfirmationDialog.tsx (NEW - optional)
├── lib/
│   ├── googleSheets.ts (EXISTING)
│   ├── googleDrive.ts (MODIFY - add createShortcut)
│   ├── dateValidation.ts (NEW)
│   └── textUtils.ts (NEW)
└── types/
    └── investmentHighlights.ts (NEW - shared types)
```

---

### B. API Endpoint Summary

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/investment-highlights/lookup` | POST | Find report by suburb/LGA | MODIFY |
| `/api/investment-highlights/save` | POST | Save new report | EXISTING |
| `/api/investment-highlights/upload-pdf` | POST | Upload PDF to Drive | EXISTING |
| `/api/investment-highlights/extract-metadata` | POST | Extract PDF metadata | MODIFY |
| `/api/investment-highlights/organize-pdf` | POST | Move PDF to state folder | EXISTING |
| `/api/investment-highlights/generate-summary` | POST | AI summary generation | EXISTING |
| `/api/investment-highlights/list-all` | GET | Get all reports for dropdown | NEW |
| `/api/investment-highlights/add-suburb` | POST | Add suburb to report | NEW |
| `/api/investment-highlights/create-shortcut` | POST | Create Drive shortcut | NEW |
| `/api/investment-highlights/update-report` | POST | Update existing report | NEW |

---

### C. Dependencies to Install

```bash
# Date utilities
npm install date-fns

# Dropdown component
npm install @headlessui/react

# Data fetching (optional, but recommended)
npm install swr

# Virtual scrolling (if needed for large lists)
npm install react-window

# Testing (optional)
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

---

### D. Environment Variables

**Required (existing):**
```env
GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS=...
GOOGLE_SHEETS_CREDENTIALS=...
GOOGLE_DRIVE_FOLDER_ID_HOTSPOTTING=...
```

**Optional (new):**
```env
NEXT_PUBLIC_ENABLE_DROPDOWN=true
NEXT_PUBLIC_ENABLE_SUBURB_MAPPING=true
NEXT_PUBLIC_ENABLE_PDF_SHORTCUTS=true
```

---

### E. Testing Checklist

#### Unit Tests
- [ ] Date parsing functions
- [ ] Suburb normalization
- [ ] Display name generation
- [ ] Similarity calculation

#### Integration Tests
- [ ] Lookup API with date validation
- [ ] List all reports API
- [ ] Add suburb API
- [ ] Create shortcut API

#### E2E Tests
- [ ] Branch 1: Auto-match, in-date
- [ ] Branch 1: Auto-match, out-of-date
- [ ] Branch 2: No match, select from dropdown
- [ ] Branch 2: No match, upload new PDF
- [ ] Branch 3: Update out-of-date report
- [ ] Branch 4: Add suburb to report

#### Manual Tests
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile (iOS, Android)
- [ ] Test with slow network (throttle to 3G)
- [ ] Test with large PDFs (>10MB)
- [ ] Test with 100+ reports in dropdown

---

### F. Rollout Plan

#### Phase 1: Internal Testing (Week 1)
- Deploy to staging environment
- Test with 5-10 internal users
- Collect feedback
- Fix critical bugs

#### Phase 2: Beta Release (Week 2)
- Deploy to production with feature flag
- Enable for 20% of users
- Monitor error rates
- Collect user feedback

#### Phase 3: Full Release (Week 3)
- Enable for 100% of users
- Monitor performance
- Provide user training/documentation
- Iterate based on feedback

---

### G. Success Metrics

**Quantitative:**
- **Lookup Success Rate:** >95% (reports found automatically)
- **PDF Extraction Success Rate:** >90% (metadata extracted correctly)
- **Date Parsing Success Rate:** >95% (dates parsed correctly)
- **User Completion Rate:** >90% (users complete Step 5 without errors)
- **Average Time on Step 5:** <3 minutes (down from current ~5 minutes)

**Qualitative:**
- User feedback: "Easier to find reports"
- User feedback: "Date validation is helpful"
- User feedback: "Dropdown is intuitive"
- Reduced support tickets for Investment Highlights

---

### H. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Date parsing fails for edge cases | Medium | Low | Graceful fallback to "unknown" status |
| Google Drive API rate limits | Low | Medium | Implement exponential backoff |
| Dropdown performance with 100+ reports | Low | Low | Virtual scrolling |
| User adds wrong suburb to report | Medium | Low | Admin review log |
| PDF extraction timing issue persists | Medium | Medium | Implement retry logic (Phase 4) |
| Shortcut creation fails | Low | Low | Non-blocking, log error |
| Concurrent updates cause data loss | Low | Medium | Acceptable (last write wins) |

**Overall Risk Level:** **LOW-MEDIUM**

---

## Conclusion

This analysis provides a comprehensive roadmap for enhancing the Investment Highlights workflow. The implementation is broken into 4 phases, with Phase 1 (date validation + dropdown) being the highest priority.

**Key Takeaways:**
1. ✅ **Feasible:** All requirements can be implemented with existing tech stack
2. ✅ **Incremental:** Phases can be implemented independently
3. ✅ **Low Risk:** Most edge cases have clear mitigation strategies
4. ✅ **User-Centric:** Focuses on improving UX and reducing manual work

**Estimated Total Time:** 16-20 hours

**Recommended Start:** Phase 1 (Core Date Validation & Dropdown)

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Status:** Ready for Implementation  
**Next Steps:** Review with team, prioritize phases, begin Phase 1 implementation

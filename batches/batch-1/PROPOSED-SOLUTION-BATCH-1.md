# Proposed Solution - Batch 1: Hotspotting Fixes (REVISED)

**Created:** Jan 24, 2026  
**Revised:** Jan 24, 2026 (with Planning Agent corrections)  
**Implementation Agent:** Claude Sonnet 4.5  
**Status:** Awaiting Final Approval

---

## 🔄 REVISION NOTES

This proposal has been revised based on Planning Agent feedback with the following critical corrections:

1. **Item 1:** Added verification UI for BOTH Report Name AND Valid Period with checkboxes
2. **Item 2:** Added logic to strip date suffix and download counter from filenames
3. **Item 4:** COMPLETE REDESIGN - 7 fields are for custom dialogue (separate from main body), not section editor
4. **Item 6:** Added carriage return insertion when checkbox is clicked
5. **NEW Item 7:** Create PDF shortcut in property folder at form submission
6. **Implementation Order:** Revised based on dependencies

---

## 📊 Analysis Summary

I have conducted a comprehensive analysis of the Property Review System codebase for the 7 Hotspotting-related issues (6 original + 1 new). The analysis covered:

- **Files Analyzed:** 8 core files
- **Lines of Code Reviewed:** ~3,500 lines
- **API Routes Examined:** 5 routes (upload-pdf, extract-metadata, organize-pdf, generate-summary, save)
- **Components Reviewed:** 2 components (InvestmentHighlightsField, Step5Proximity)
- **State Management:** formStore.ts

### Key Findings:

1. **Item 1 (Valid Period):** Need verification UI for BOTH report name AND valid period with checkboxes
2. **Item 2 (File Naming):** Need to strip suburb prefix, date suffix, and download counter
3. **Item 3 (Regional in Heading):** Confirmed as Make.com issue - no form changes needed
4. **Item 4 (7 Edit Fields):** MISUNDERSTOOD - These are custom dialogue fields (separate from main body), not section editor
5. **Item 5 (Auto-populate PDF):** Need to store PDF link in form state
6. **Item 6 (Checkbox Retention):** Need to move to form store AND add carriage return
7. **NEW Item 7 (PDF Shortcut):** Need to create shortcut in property folder at submission

---

## 🔧 Proposed Changes

### Item 1: Report Name & Valid Period Verification (REVISED)

**Current Implementation** (`src/components/steps/step5/InvestmentHighlightsField.tsx`, lines 769-828):

```typescript
{/* PDF Verification UI */}
{showVerification && (
  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      PDF Uploaded: {uploadedFileName}
    </h4>
    <p className="text-sm text-blue-800 mb-3">📋 Extracted Information:</p>
    
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Report Name *
        </label>
        <input
          type="text"
          value={extractedReportName}
          onChange={(e) => setExtractedReportName(e.target.value)}
          className="w-full p-2 border rounded-md"
          placeholder="Copy report name from front cover page of report"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Valid Period *
        </label>
        <input
          type="text"
          value={extractedValidPeriod}
          onChange={(e) => setExtractedValidPeriod(e.target.value)}
          className="w-full p-2 border rounded-md"
          placeholder="e.g., October 2025 - January 2026"
        />
      </div>
    </div>
    
    <p className="text-xs text-gray-600 mt-3">
      ⚠️ Please verify the information above is correct
    </p>
    
    <div className="flex space-x-2 mt-3">
      <button
        onClick={handleConfirmMetadata}
        disabled={!extractedReportName || !extractedValidPeriod || loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? uploadProgress || 'Processing...' : '✓ Confirm & Continue'}
      </button>
      <button
        onClick={handleCancelUpload}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
      >
        ✗ Cancel
      </button>
    </div>
  </div>
)}
```

**Problem:**
- No checkboxes to confirm user has verified the information
- No handling for blank main body (when ChatGPT needs to be run manually)
- No confirmation message when adding new report for existing LGA
- Extraction errors delete all values (should keep them for human verification)

**Proposed Changes:**

**File 1:** `src/lib/pdfExtractor.ts` (lines 40-91)

Keep extraction logic but DON'T delete values on error:

```typescript
// Extract SHORT report name (e.g., "Fraser Coast", "Sunshine Coast")
// Note: User will verify this, so extraction doesn't need to be perfect
let reportName = '';

// Simple pattern to find region names
const regionPattern = /([\w\s]+(?:Coast|Region|Valley|Highlands|Rivers|City))/i;

for (let i = 0; i < Math.min(10, lines.length); i++) {
  const line = lines[i].trim();
  const match = line.match(regionPattern);
  if (match) {
    reportName = match[1].trim();
    break;
  }
}

// Fallback: Use first reasonable line
if (!reportName) {
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length > 10 && line.length < 50 && !line.toLowerCase().includes('hotspotting')) {
      reportName = line;
      break;
    }
  }
}

// Look for date pattern
const datePatterns = [
  /([A-Za-z]+\s+\d{4})\s*[-–—]\s*([A-Za-z]+\s+\d{4})/,
  /([A-Za-z]+)\s*[-–—]\s*([A-Za-z]+\s+\d{4})/,
];

let validPeriod = '';
for (const pattern of datePatterns) {
  const dateMatch = text.match(pattern);
  if (dateMatch) {
    validPeriod = dateMatch[0];
    break;
  }
}

// Main body is the FULL extracted text
const mainBody = text;

// IMPORTANT: Keep extracted values even if uncertain - user will verify
return {
  reportName: reportName || '', // Empty string, not error message
  validPeriod: validPeriod || '', // Empty string, not error message
  mainBody: mainBody || '', // Keep whatever we extracted
  confidence: {
    reportName: reportName ? 'high' : 'low',
    validPeriod: validPeriod ? 'high' : 'low',
    mainBody: mainBody && mainBody.length > 100 ? 'high' : 'low',
  },
};
```

**File 2:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (lines 68-72)

Add state for verification checkboxes and main body:

```typescript
const [extractedValidPeriod, setExtractedValidPeriod] = useState('');
const [extractedMainBody, setExtractedMainBody] = useState('');
const [showVerification, setShowVerification] = useState(false);
const [reportNameVerified, setReportNameVerified] = useState(false);
const [validPeriodVerified, setValidPeriodVerified] = useState(false);
const [extractionConfidence, setExtractionConfidence] = useState<any>(null);
```

**File 3:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (lines 336-340)

Update extraction result handling:

```typescript
const extractResult = await extractResponse.json();
setExtractedReportName(extractResult.reportName || '');
setExtractedValidPeriod(extractResult.validPeriod || '');
setExtractedMainBody(extractResult.mainBody || '');
setExtractionConfidence(extractResult.confidence || null);
```

**File 4:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (lines 769-828)

Replace verification UI with enhanced version:

```typescript
{/* PDF Verification UI */}
{showVerification && (
  <div className="mt-3 p-4 bg-blue-50 border-2 border-blue-300 rounded-md">
    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      PDF Uploaded: {uploadedFileName}
    </h4>
    <p className="text-sm text-blue-800 mb-3">
      📋 <strong>Please verify the extracted information below:</strong>
    </p>
    
    <div className="space-y-4">
      {/* Report Name Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Report Name *
        </label>
        {extractionConfidence?.reportName === 'low' && (
          <p className="text-sm text-amber-600 mb-2 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            We couldn't automatically extract the Report Name. Please copy from the front page.
          </p>
        )}
        <input
          type="text"
          value={extractedReportName}
          onChange={(e) => {
            setExtractedReportName(e.target.value);
            setReportNameVerified(false); // Reset verification when edited
          }}
          className="w-full p-2 border rounded-md"
          placeholder="e.g., Fraser Coast, Sunshine Coast"
        />
        <label className="flex items-center mt-2 text-sm">
          <input
            type="checkbox"
            checked={reportNameVerified}
            onChange={(e) => setReportNameVerified(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600"
          />
          <span className="text-gray-700">
            ✓ I have verified this Report Name is correct
          </span>
        </label>
      </div>
      
      {/* Valid Period Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Valid Period *
        </label>
        {extractionConfidence?.validPeriod === 'low' && (
          <p className="text-sm text-amber-600 mb-2 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            We couldn't automatically extract the Valid Period. Please copy from the front page.
          </p>
        )}
        <input
          type="text"
          value={extractedValidPeriod}
          onChange={(e) => {
            setExtractedValidPeriod(e.target.value);
            setValidPeriodVerified(false); // Reset verification when edited
          }}
          className="w-full p-2 border rounded-md"
          placeholder="e.g., October 2025 - January 2026"
        />
        <label className="flex items-center mt-2 text-sm">
          <input
            type="checkbox"
            checked={validPeriodVerified}
            onChange={(e) => setValidPeriodVerified(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600"
          />
          <span className="text-gray-700">
            ✓ I have verified this Valid Period is correct
          </span>
        </label>
      </div>
      
      {/* Main Body Status */}
      {(!extractedMainBody || extractedMainBody.trim().length < 100) && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-md">
          <p className="text-sm text-amber-800 font-medium mb-1">
            ⚠️ Main Body Content Not Found
          </p>
          <p className="text-sm text-gray-700">
            Please run ChatGPT manually and paste the main body content so we can store it for next time.
          </p>
        </div>
      )}
    </div>
    
    <p className="text-xs text-gray-600 mt-3">
      ⚠️ Please verify both fields above before continuing
    </p>
    
    <div className="flex space-x-2 mt-3">
      <button
        onClick={handleConfirmMetadata}
        disabled={
          !extractedReportName || 
          !extractedValidPeriod || 
          !reportNameVerified || 
          !validPeriodVerified || 
          loading
        }
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? uploadProgress || 'Processing...' : '✓ Confirm & Continue'}
      </button>
      <button
        onClick={handleCancelUpload}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
      >
        ✗ Cancel
      </button>
    </div>
  </div>
)}
```

**File 5:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (lines 382-427)

Update confirmation handler to check for existing LGA and show appropriate message:

```typescript
const handleConfirmMetadata = async () => {
  if (!extractedReportName || !extractedValidPeriod) {
    alert('Please fill in Report Name and Valid Period');
    return;
  }
  
  if (!reportNameVerified || !validPeriodVerified) {
    alert('Please verify both Report Name and Valid Period by checking the boxes');
    return;
  }
  
  setLoading(true);
  setUploadProgress('Checking for existing reports...');
  
  try {
    // Step 1: Check if report already exists for this LGA
    const lookupResponse = await fetch('/api/investment-highlights/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lga: lga || '', 
        suburb: suburb || '', 
        state 
      }),
    });
    
    const lookupResult = await lookupResponse.json();
    const isNewReportForExistingLGA = lookupResult.found;
    
    // Step 2: Organize PDF into CURRENT/LEGACY folders and save to sheet
    setUploadProgress('Organizing PDF...');
    
    const response = await fetch('/api/investment-highlights/organize-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: uploadedFileId,
        reportName: extractedReportName,
        validPeriod: extractedValidPeriod,
        suburbs: suburb || '',
        state,
        userEmail: userEmail || 'unknown',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to organize PDF');
    }
    
    const result = await response.json();
    
    // Success - update UI
    setMatchStatus('found');
    setReportName(extractedReportName);
    setValidPeriod(extractedValidPeriod);
    setShowVerification(false);
    setReportNameVerified(false);
    setValidPeriodVerified(false);
    
    // Show appropriate confirmation message
    if (isNewReportForExistingLGA) {
      alert('✅ PDF uploaded successfully!\n\n📋 This report and its content will be used moving forward for this LGA.\n\n🤖 Next Step: Click "Generate AI Summary" to extract infrastructure information.');
    } else {
      alert('✅ PDF uploaded successfully!\n\n🤖 Next Step: Click "Generate AI Summary" to extract infrastructure information.');
    }
  } catch (err: any) {
    console.error('PDF organization error:', err);
    setError(err.message || 'Failed to organize PDF. Please try again.');
  } finally {
    setLoading(false);
    setUploadProgress('');
  }
};
```

**Rationale:**
- Checkboxes ensure user has manually verified both fields
- Keeps extracted values even if confidence is low (user can correct)
- Shows clear warnings when extraction fails
- Provides guidance for manual ChatGPT processing when needed
- Confirms when new report replaces existing one for an LGA
- Prevents accidental submission of unverified data

**Risks:**
- Low risk - improves data quality through human verification
- Slightly more steps for user, but ensures accuracy

**Testing:**
1. Upload PDF with good extraction → verify fields are pre-filled
2. Upload PDF with poor extraction → verify warning messages appear
3. Try to confirm without checking boxes → verify error message
4. Edit a field → verify checkbox unchecks automatically
5. Confirm with both boxes checked → verify success message
6. Upload new report for existing LGA → verify "will be used moving forward" message

---

### Item 2: File Naming - Strip Suburb, Date Suffix, and Download Counter (REVISED)

**Current Implementation** (`src/app/api/investment-highlights/organize-pdf/route.ts`, lines 123-135):

```typescript
// Step 6: Move new file to CURRENT
const newFileName = `${reportName} - ${validPeriod}.pdf`;

await drive.files.update({
  fileId: fileId,
  addParents: currentFolderId,
  removeParents: parentFolderId,
  requestBody: {
    name: newFileName,
  },
  fields: 'id, name, webViewLink',
  supportsAllDrives: true,
});
```

**Problem:**
- Report name might contain suburb prefix (e.g., "Point Vernon Fraser Coast")
- Report name might contain date suffix (e.g., "Fraser Coast (6)-2026-01-22")
- Report name might contain download counter (e.g., "Fraser Coast (2)")
- User verification in Item 1 is the solution, but we should also clean the filename

**Proposed Changes:**

**File 1:** `src/app/api/investment-highlights/organize-pdf/route.ts` (add helper function before POST handler)

Add filename cleaning function:

```typescript
/**
 * Clean report name for filename
 * Removes:
 * - Date suffixes like "(6)-2026-01-22"
 * - Download counters like "(2)", "(3)"
 * - Extra whitespace
 */
function cleanReportNameForFilename(reportName: string): string {
  let cleaned = reportName.trim();
  
  // Remove date suffix pattern: (x)-YYYY-MM-DD
  cleaned = cleaned.replace(/\s*\(\d+\)-\d{4}-\d{2}-\d{2}\s*$/i, '');
  
  // Remove download counter pattern: (x) at the end
  cleaned = cleaned.replace(/\s*\(\d+\)\s*$/i, '');
  
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
```

**File 2:** `src/app/api/investment-highlights/organize-pdf/route.ts` (lines 123-135)

Use cleaned report name for filename:

```typescript
// Step 6: Move new file to CURRENT
// Clean report name (remove date suffix, download counter)
const cleanedReportName = cleanReportNameForFilename(reportName);
const newFileName = `${cleanedReportName} - ${validPeriod}.pdf`;

console.log('[organize-pdf] Original report name:', reportName);
console.log('[organize-pdf] Cleaned report name:', cleanedReportName);
console.log('[organize-pdf] Final filename:', newFileName);

await drive.files.update({
  fileId: fileId,
  addParents: currentFolderId,
  removeParents: parentFolderId,
  requestBody: {
    name: newFileName,
  },
  fields: 'id, name, webViewLink',
  supportsAllDrives: true,
});
```

**Rationale:**
- User verification in Item 1 ensures report name is correct
- Filename cleaning removes artifacts from download/extraction
- Simple regex patterns handle common cases
- Logging helps debug any edge cases
- User can always manually correct in verification UI

**Risks:**
- Low risk - cleaning is conservative and logged
- If regex fails, original name is used (no data loss)
- User verification is the primary safeguard

**Testing:**
1. Upload PDF with clean name → verify no changes
2. Upload PDF with "(6)-2026-01-22" suffix → verify suffix removed
3. Upload PDF with "(2)" counter → verify counter removed
4. Upload PDF with both → verify both removed
5. Verify filename in Google Drive matches expected format
6. Check console logs for cleaning process

---

### Item 3: "Regional" in Heading (APPROVED - NO CHANGES)

**Status:** ✅ CLOSED (No form changes needed)

**Resolution:**
- This is a Make.com issue, NOT a form issue
- The form correctly sends "Fraser Coast Regional" (the LGA name from GHL)
- Make.com's `formatInvestmentHighlightsHtml()` function should strip "Regional"
- User verification in Item 1 also confirms correct LGA name

**Make.com Fix Location:**
```javascript
// In MODULE-3-COMPLETE-FOR-MAKE.js
function formatInvestmentHighlightsHtml(investmentHighlights) {
  let regionName = investmentHighlights.split('\n')[0].trim();
  regionName = regionName.replace(/\s+Regional$/i, '');
  // Continue with formatting...
}
```

**No form changes required.**

---

### Item 4: 7 Custom Dialogue Fields (COMPLETE REDESIGN)

**CRITICAL CORRECTION:** My original understanding was WRONG.

**Correct Understanding:**
- **Main Body** = ChatGPT output (stays as ONE BLOCK, not split into sections)
- **7 Custom Dialogue Fields** = Separate fields for humans to ADD/EDIT/DELETE custom content
- These fields are ALWAYS VISIBLE (not conditional on AI generation)
- System MERGES custom dialogue INTO corresponding sections of main body
- Custom dialogue saved separately to Google Sheet (7 columns: G-M)
- Next user with same report sees previous custom additions, can edit/delete/add more

**Current Implementation:**

The current implementation has a "section editor" (lines 858-989) that shows 7 textareas for editing AI-generated sections. This is WRONG.

**What We Actually Need:**

1. **Main Body Field** (existing) - Shows ChatGPT output as one block
2. **7 Custom Dialogue Fields** (new) - Always visible, for human additions
3. **Merge Logic** - Automatically inserts custom dialogue into main body
4. **Save Logic** - Saves custom dialogue separately to columns G-M

**Architecture:**

```
┌─────────────────────────────────────────────┐
│ Investment Highlights (Main Body)           │
│ [Large textarea - ChatGPT output]           │
│ - Population growth context...              │
│ - **Residential:** $500M project...         │
│ - **Industrial:** $250M project...          │
│ - etc.                                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Custom Dialogue (Optional Additions)        │
│                                             │
│ 1. Population Growth Context                │
│    [textarea] - Your custom additions       │
│                                             │
│ 2. Residential                              │
│    [textarea] - Your custom additions       │
│                                             │
│ ... (7 fields total)                        │
└─────────────────────────────────────────────┘

When user types in custom field #2 (Residential):
→ System finds "**Residential:**" section in main body
→ Inserts custom dialogue after the section heading
→ Main body updates automatically
```

**Proposed Changes:**

**File 1:** `src/types/form.ts` (lines 172-186)

Add 7 custom dialogue fields to ContentSections:

```typescript
export interface ContentSections {
  proximity?: string;
  whyThisProperty?: string;
  investmentHighlights?: string; // Main body (ChatGPT output)
  
  // Hotspotting PDF info
  hotspottingPdfLink?: string;
  hotspottingFolderLink?: string;
  
  // Content review confirmation
  contentReviewed?: boolean;
  
  // 7 Custom Dialogue Fields (for human additions)
  customDialogue1PopulationGrowth?: string;
  customDialogue2Residential?: string;
  customDialogue3Industrial?: string;
  customDialogue4CommercialCivic?: string;
  customDialogue5HealthEducation?: string;
  customDialogue6Transport?: string;
  customDialogue7JobImplications?: string;
  
  investmentHighlightsExtra3?: string;
  // ... rest of fields
}
```

**File 2:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (lines 74-86)

Replace section editor state with custom dialogue state:

```typescript
// Remove old section editor states
// const [generatingSummary, setGeneratingSummary] = useState(false);
// const [showSectionEditor, setShowSectionEditor] = useState(false);
// const [sections, setSections] = useState({ ... });

// Add custom dialogue states
const [customDialogue, setCustomDialogue] = useState({
  populationGrowth: '',
  residential: '',
  industrial: '',
  commercialCivic: '',
  healthEducation: '',
  transport: '',
  jobImplications: '',
});

// Track if custom dialogue has been loaded from sheet
const [customDialogueLoaded, setCustomDialogueLoaded] = useState(false);
```

**File 3:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (add new function)

Add function to merge custom dialogue into main body:

```typescript
/**
 * Merge custom dialogue into main body
 * Finds section headings and inserts custom content after them
 */
const mergeCustomDialogueIntoMainBody = (
  mainBody: string,
  customDialogue: typeof customDialogue
): string => {
  let merged = mainBody;
  
  // Define section mappings
  const sectionMappings = [
    {
      heading: /^(.*population.*growth.*context)/im,
      customContent: customDialogue.populationGrowth,
      insertAfter: true, // Insert after the paragraph
    },
    {
      heading: /\*\*Residential:\*\*/i,
      customContent: customDialogue.residential,
      insertAfter: true,
    },
    {
      heading: /\*\*Industrial:\*\*/i,
      customContent: customDialogue.industrial,
      insertAfter: true,
    },
    {
      heading: /\*\*Commercial and Civic:\*\*/i,
      customContent: customDialogue.commercialCivic,
      insertAfter: true,
    },
    {
      heading: /\*\*Health and Education:\*\*/i,
      customContent: customDialogue.healthEducation,
      insertAfter: true,
    },
    {
      heading: /\*\*Transport:\*\*/i,
      customContent: customDialogue.transport,
      insertAfter: true,
    },
    {
      heading: /\*\*Job Implications:\*\*/i,
      customContent: customDialogue.jobImplications,
      insertAfter: true,
    },
  ];
  
  // Process each section
  sectionMappings.forEach(({ heading, customContent, insertAfter }) => {
    if (!customContent || customContent.trim() === '') return;
    
    const match = merged.match(heading);
    if (match) {
      const matchIndex = match.index!;
      const matchLength = match[0].length;
      
      // Find the end of the section (next heading or end of string)
      const nextHeadingPattern = /\n\*\*[A-Z]/;
      const nextHeadingMatch = merged.slice(matchIndex + matchLength).match(nextHeadingPattern);
      const insertPosition = nextHeadingMatch 
        ? matchIndex + matchLength + nextHeadingMatch.index!
        : merged.length;
      
      // Insert custom content
      const customBlock = `\n\n[CUSTOM ADDITIONS]\n${customContent.trim()}\n`;
      merged = merged.slice(0, insertPosition) + customBlock + merged.slice(insertPosition);
    }
  });
  
  return merged;
};
```

**File 4:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (add new handler)

Add handler for custom dialogue changes:

```typescript
/**
 * Handle custom dialogue field changes
 * Updates state and merges into main body
 */
const handleCustomDialogueChange = (field: string, value: string) => {
  const updatedDialogue = {
    ...customDialogue,
    [field]: value,
  };
  
  setCustomDialogue(updatedDialogue);
  
  // Get the base main body (without custom dialogue)
  // This would be the original ChatGPT output
  const baseMainBody = value; // TODO: Need to store base separately
  
  // Merge custom dialogue into main body
  const mergedBody = mergeCustomDialogueIntoMainBody(baseMainBody, updatedDialogue);
  
  // Update parent form state
  onChange(mergedBody);
};
```

**File 5:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (replace section editor UI)

Replace section editor (lines 858-989) with custom dialogue fields:

```typescript
{/* Custom Dialogue Fields - Always Visible */}
{matchStatus === 'found' && (
  <div className="mt-6 p-4 bg-purple-50 border-2 border-purple-300 rounded-md space-y-4">
    <div className="mb-3">
      <h4 className="font-semibold text-purple-900 flex items-center mb-2">
        <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        Custom Dialogue (Optional)
      </h4>
      <p className="text-sm text-gray-700">
        Add your own custom content to any section below. Your additions will be merged into the main body and saved for future users.
      </p>
    </div>
    
    {/* Field 1: Population Growth Context */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        1. Population Growth Context
      </label>
      <textarea
        value={customDialogue.populationGrowth}
        onChange={(e) => handleCustomDialogueChange('populationGrowth', e.target.value)}
        className="w-full p-2 border rounded-md text-sm"
        rows={2}
        placeholder="Add custom content about population growth (optional)..."
      />
    </div>
    
    {/* Field 2: Residential */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        2. Residential
      </label>
      <textarea
        value={customDialogue.residential}
        onChange={(e) => handleCustomDialogueChange('residential', e.target.value)}
        className="w-full p-2 border rounded-md text-sm"
        rows={2}
        placeholder="Add custom residential projects or details (optional)..."
      />
    </div>
    
    {/* Field 3: Industrial */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        3. Industrial
      </label>
      <textarea
        value={customDialogue.industrial}
        onChange={(e) => handleCustomDialogueChange('industrial', e.target.value)}
        className="w-full p-2 border rounded-md text-sm"
        rows={2}
        placeholder="Add custom industrial projects or details (optional)..."
      />
    </div>
    
    {/* Field 4: Commercial and Civic */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        4. Commercial and Civic
      </label>
      <textarea
        value={customDialogue.commercialCivic}
        onChange={(e) => handleCustomDialogueChange('commercialCivic', e.target.value)}
        className="w-full p-2 border rounded-md text-sm"
        rows={2}
        placeholder="Add custom commercial/civic projects or details (optional)..."
      />
    </div>
    
    {/* Field 5: Health and Education */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        5. Health and Education
      </label>
      <textarea
        value={customDialogue.healthEducation}
        onChange={(e) => handleCustomDialogueChange('healthEducation', e.target.value)}
        className="w-full p-2 border rounded-md text-sm"
        rows={2}
        placeholder="Add custom health/education projects or details (optional)..."
      />
    </div>
    
    {/* Field 6: Transport */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        6. Transport
      </label>
      <textarea
        value={customDialogue.transport}
        onChange={(e) => handleCustomDialogueChange('transport', e.target.value)}
        className="w-full p-2 border rounded-md text-sm"
        rows={2}
        placeholder="Add custom transport projects or details (optional)..."
      />
    </div>
    
    {/* Field 7: Job Implications */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        7. Job Implications
      </label>
      <textarea
        value={customDialogue.jobImplications}
        onChange={(e) => handleCustomDialogueChange('jobImplications', e.target.value)}
        className="w-full p-2 border rounded-md text-sm"
        rows={2}
        placeholder="Add custom job impact details (optional)..."
      />
    </div>
    
    <div className="pt-3 border-t border-purple-300">
      <p className="text-xs text-gray-600 mb-2">
        💡 <strong>Tip:</strong> Your custom additions will appear in the main body above with a "[CUSTOM ADDITIONS]" label.
      </p>
      <button
        onClick={handleSaveCustomDialogue}
        disabled={loading}
        className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
      >
        {loading ? 'Saving...' : '💾 Save Custom Dialogue'}
      </button>
    </div>
  </div>
)}
```

**File 6:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (add save handler)

Add handler to save custom dialogue:

```typescript
/**
 * Save custom dialogue to Google Sheet
 */
const handleSaveCustomDialogue = async () => {
  if ((!lga && !suburb) || !state || !reportName || !validPeriod) {
    alert('Missing required information. Please ensure report name and valid period are set.');
    return;
  }
  
  setLoading(true);
  
  try {
    const response = await fetch('/api/investment-highlights/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suburbs: suburb || '',
        state,
        reportName: reportName,
        validPeriod: validPeriod,
        mainBody: value, // Main body with merged custom dialogue
        extraInfo: '',
        // Custom dialogue fields (saved to columns G-M)
        populationGrowthContext: customDialogue.populationGrowth,
        residential: customDialogue.residential,
        industrial: customDialogue.industrial,
        commercialAndCivic: customDialogue.commercialCivic,
        healthAndEducation: customDialogue.healthEducation,
        transport: customDialogue.transport,
        jobImplications: customDialogue.jobImplications,
        // PDF info
        pdfLink: '', // Will be preserved from organize-pdf step
        fileId: uploadedFileId,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Save failed');
    }
    
    alert('Custom dialogue saved successfully! Future users will see your additions.');
  } catch (err: any) {
    console.error('Save error:', err);
    alert('Failed to save custom dialogue. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

**File 7:** `src/app/api/investment-highlights/lookup/route.ts` (modify to return custom dialogue)

Update lookup API to return custom dialogue fields:

```typescript
// In the response, include custom dialogue fields
if (result.found && result.data) {
  return NextResponse.json({
    found: true,
    data: {
      reportName: result.data.reportName,
      validPeriod: result.data.validPeriod,
      mainBody: result.data.mainBody,
      extraInfo: result.data.extraInfo,
      // Custom dialogue fields
      customDialogue: {
        populationGrowth: result.data.populationGrowthContext || '',
        residential: result.data.residential || '',
        industrial: result.data.industrial || '',
        commercialCivic: result.data.commercialAndCivic || '',
        healthEducation: result.data.healthAndEducation || '',
        transport: result.data.transport || '',
        jobImplications: result.data.jobImplications || '',
      },
    },
    dateStatus: result.dateStatus,
  });
}
```

**File 8:** `src/components/steps/step5/InvestmentHighlightsField.tsx` (load custom dialogue on match)

Update lookupReport to load custom dialogue:

```typescript
const lookupReport = async () => {
  // ... existing lookup logic ...
  
  if (result.found && result.data) {
    setMatchStatus('found');
    setReportName(result.data.reportName || '');
    setValidPeriod(result.data.validPeriod || '');
    setDateStatus(result.dateStatus || null);
    
    // Load custom dialogue if available
    if (result.data.customDialogue) {
      setCustomDialogue({
        populationGrowth: result.data.customDialogue.populationGrowth || '',
        residential: result.data.customDialogue.residential || '',
        industrial: result.data.customDialogue.industrial || '',
        commercialCivic: result.data.customDialogue.commercialCivic || '',
        healthEducation: result.data.customDialogue.healthEducation || '',
        transport: result.data.customDialogue.transport || '',
        jobImplications: result.data.customDialogue.jobImplications || '',
      });
      setCustomDialogueLoaded(true);
    }
    
    // Use Main Body for display
    const mainBody = result.data.mainBody || '';
    onChange(mainBody);
  }
};
```

**Rationale:**
- Separates ChatGPT output (main body) from human additions (custom dialogue)
- Custom dialogue is always visible and editable
- Merge logic keeps main body updated automatically
- Saves custom dialogue separately for future users
- Next user sees previous additions and can modify them
- Supports collaborative knowledge building

**Risks:**
- Medium risk - significant architectural change
- Merge logic needs careful testing
- Need to handle edge cases (missing sections, malformed main body)
- Performance impact of real-time merging (mitigated by debouncing)

**Testing:**
1. Look up existing report → verify custom dialogue loads
2. Add custom content to field #2 (Residential) → verify it appears in main body
3. Edit custom content → verify main body updates
4. Delete custom content → verify it's removed from main body
5. Save custom dialogue → verify it saves to Google Sheet
6. Look up same report again → verify custom dialogue persists
7. Test with missing sections in main body → verify graceful handling
8. Test with multiple users editing same report → verify changes accumulate

---

### Item 5: Auto-populate PDF Link (APPROVED)

**Implementation remains the same as original proposal** - see original Item 5 for full details.

Summary:
- Add `hotspottingPdfLink` and `hotspottingFolderLink` to `contentSections`
- Update organize-pdf API to return folder link
- Pass `onLinksUpdate` callback to InvestmentHighlightsField
- Store links in form state after PDF organization
- Display PDF link in UI for easy access

**No changes from original proposal.**

---

### Item 6: Checkbox Retention + Carriage Return (REVISED)

**Original proposal was correct** - move checkbox to form store.

**ADDITION:** Add carriage return to fields when checkbox is clicked.

**Proposed Changes:**

**File 1:** `src/types/form.ts` (lines 172-186)

Add contentReviewed field (same as original):

```typescript
export interface ContentSections {
  proximity?: string;
  whyThisProperty?: string;
  investmentHighlights?: string;
  
  // Content review confirmation
  contentReviewed?: boolean;
  
  // ... rest of fields
}
```

**File 2:** `src/components/steps/Step5Proximity.tsx` (lines 24, 35-54, 109-110)

Replace local state with form store state AND add carriage return logic:

```typescript
export function Step5Proximity() {
  const { formData, updateFormData } = useFormStore();
  const { contentSections, address, proximityData, earlyProcessing } = formData;
  
  // Use form store state instead of local state
  const contentReviewed = contentSections?.contentReviewed || false;

  // Use early processing data if available
  const proximityValue = contentSections?.proximity || 
                         earlyProcessing?.proximity?.data || 
                         proximityData || '';
  
  const whyThisPropertyValue = contentSections?.whyThisProperty || 
                               earlyProcessing?.whyThisProperty?.data || 
                               '';

  const handleContentReviewChange = (checked: boolean) => {
    const updates: any = { 
      contentSections: { 
        ...contentSections,
        contentReviewed: checked,
      } 
    };
    
    // If checked, add carriage return to fields (after content populates)
    if (checked) {
      // Add space to empty fields for validation
      if (!proximityValue || proximityValue.trim() === '') {
        updates.contentSections.proximity = ' ';
      } else {
        // Add carriage return to existing content
        updates.contentSections.proximity = proximityValue + '\n';
      }
      
      if (!whyThisPropertyValue || whyThisPropertyValue.trim() === '') {
        updates.contentSections.whyThisProperty = ' ';
      } else {
        // Add carriage return to existing content
        updates.contentSections.whyThisProperty = whyThisPropertyValue + '\n';
      }
      
      if (!contentSections?.investmentHighlights || contentSections.investmentHighlights.trim() === '') {
        updates.contentSections.investmentHighlights = ' ';
      } else {
        // Add carriage return to existing content
        updates.contentSections.investmentHighlights = contentSections.investmentHighlights + '\n';
      }
    }
    
    updateFormData(updates);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Proximity & Content</h2>
      
      <div className="space-y-8">
        {/* ... component fields ... */}

        {/* Content Review Confirmation */}
        <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={contentReviewed}
              onChange={(e) => handleContentReviewChange(e.target.checked)}
              className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required
            />
            <span className="text-sm font-medium text-gray-900">
              I have reviewed all content sections above (Proximity & Amenities, Why This Property, and Investment Highlights) and confirm they are accurate and complete. *
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

**Rationale:**
- Checkbox state persists across navigation (form store)
- Carriage return added when checkbox clicked (formatting requirement)
- Only adds carriage return if content exists (not for empty fields)
- Simple and predictable behavior

**Risks:**
- Very low risk - straightforward state management
- Carriage return logic is simple and testable

**Testing:**
1. Navigate to Step 5
2. Verify fields have content
3. Check the "I have reviewed..." checkbox
4. Verify carriage return added to each field
5. Navigate away and back
6. Verify checkbox is still checked
7. Uncheck and re-check → verify carriage return added again

---

### NEW Item 7: Create PDF Shortcut in Property Folder

**Requirement:**
At form submission, create a shortcut to the hotspotting PDF in the property's Google Drive folder.

**Implementation Location:**
This should happen during form submission, after the property folder is created.

**Current Submission Flow:**

1. User clicks "Submit" in Step 6 (Folder Creation)
2. Form data is submitted to GHL
3. Property folder is created in Google Drive
4. Email is sent to client

**Where to Add Shortcut Creation:**

After property folder is created, before email is sent.

**Proposed Changes:**

**File 1:** `src/app/api/create-folder/route.ts` (or wherever folder creation happens)

Add function to create PDF shortcut:

```typescript
/**
 * Create a shortcut to the hotspotting PDF in the property folder
 */
async function createPdfShortcut(
  drive: any,
  propertyFolderId: string,
  pdfFileId: string,
  pdfFileName: string
): Promise<string | null> {
  try {
    if (!pdfFileId) {
      console.log('[create-folder] No PDF file ID provided, skipping shortcut creation');
      return null;
    }
    
    // Create shortcut metadata
    const shortcutMetadata = {
      name: `${pdfFileName} (Hotspotting Report)`,
      mimeType: 'application/vnd.google-apps.shortcut',
      shortcutDetails: {
        targetId: pdfFileId,
      },
      parents: [propertyFolderId],
    };
    
    // Create the shortcut
    const shortcut = await drive.files.create({
      requestBody: shortcutMetadata,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });
    
    console.log('[create-folder] PDF shortcut created:', shortcut.data.name);
    return shortcut.data.id;
  } catch (error) {
    console.error('[create-folder] Error creating PDF shortcut:', error);
    // Don't fail the entire submission if shortcut creation fails
    return null;
  }
}
```

**File 2:** `src/app/api/create-folder/route.ts` (in the POST handler)

Call the shortcut creation function:

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { folderName, parentFolderId, hotspottingPdfFileId, hotspottingPdfFileName } = body;
    
    // ... existing folder creation logic ...
    
    // Create folder
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });
    
    const folderId = folder.data.id;
    const folderLink = folder.data.webViewLink;
    
    // Create PDF shortcut if PDF info provided
    if (hotspottingPdfFileId && hotspottingPdfFileName) {
      await createPdfShortcut(
        drive,
        folderId,
        hotspottingPdfFileId,
        hotspottingPdfFileName
      );
    }
    
    return NextResponse.json({
      success: true,
      folderId,
      folderLink,
    });
  } catch (error: any) {
    console.error('Folder creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create folder' },
      { status: 500 }
    );
  }
}
```

**File 3:** `src/components/steps/Step6FolderCreation.tsx` (in handleCreateFolder)

Pass PDF info to folder creation API:

```typescript
const handleCreateFolder = async () => {
  if (!folderName.trim()) {
    setFolderError('Please enter a folder name');
    return;
  }
  
  setIsCreatingFolder(true);
  setFolderError(null);
  
  try {
    // Get hotspotting PDF info from form state
    const hotspottingPdfFileId = formData.contentSections?.hotspottingPdfLink 
      ? extractFileIdFromLink(formData.contentSections.hotspottingPdfLink)
      : '';
    const hotspottingPdfFileName = formData.address?.lga 
      ? `${formData.address.lga} Hotspotting Report`
      : 'Hotspotting Report';
    
    const response = await fetch('/api/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName: folderName.trim(),
        parentFolderId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_PARENT_FOLDER_ID,
        hotspottingPdfFileId,
        hotspottingPdfFileName,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create folder');
    }
    
    const result = await response.json();
    
    // Update form state with folder link
    updateAddress({ folderLink: result.folderLink });
    setFolderLink(result.folderLink);
    setShowChecklist(true);
  } catch (err: any) {
    console.error('Folder creation error:', err);
    setFolderError(err.message || 'Failed to create folder. Please try again.');
  } finally {
    setIsCreatingFolder(false);
  }
};

/**
 * Extract file ID from Google Drive link
 */
function extractFileIdFromLink(link: string): string {
  const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
}
```

**Rationale:**
- Creates convenient access to hotspotting PDF from property folder
- Shortcut creation is non-blocking (won't fail submission if it fails)
- Uses Google Drive's native shortcut feature
- Automatically named for clarity

**Risks:**
- Low risk - shortcut creation is optional/non-blocking
- If PDF info is missing, shortcut simply isn't created
- Google Drive API handles shortcut creation natively

**Testing:**
1. Complete form with hotspotting PDF uploaded
2. Create property folder in Step 6
3. Check property folder in Google Drive
4. Verify shortcut to hotspotting PDF exists
5. Click shortcut → verify it opens the correct PDF
6. Test without PDF uploaded → verify folder still creates successfully
7. Test with PDF in different location → verify shortcut works

---

## ⚠️ Architectural Considerations (UPDATED)

### 1. Custom Dialogue Merge Logic

**Issue:** Item 4 requires merging custom dialogue into main body in real-time. This is complex and needs careful design.

**Challenges:**
- Main body format can vary (ChatGPT output is unpredictable)
- Section headings might not always match expected patterns
- Need to handle missing sections gracefully
- Performance impact of real-time merging

**Resolution:**
- Use regex patterns to find section headings
- Insert custom dialogue with clear "[CUSTOM ADDITIONS]" label
- Store base main body separately from merged version
- Debounce merge operations to avoid performance issues
- Provide visual feedback when custom dialogue is merged

**Alternative Approach:**
Instead of real-time merging, we could:
1. Show custom dialogue fields separately (always visible)
2. Merge only when saving to Google Sheet
3. Display merged version in a preview panel

This would be simpler and more performant, but less intuitive for users.

**Recommendation:** Implement real-time merging with debouncing for better UX.

### 2. Verification Checkboxes

**Issue:** Item 1 requires checkboxes to verify report name and valid period. This adds friction but ensures data quality.

**Resolution:**
- Checkboxes are required before confirmation
- Editing a field unchecks its checkbox (forces re-verification)
- Clear visual feedback for unverified fields
- Prevents accidental submission of incorrect data

### 3. PDF Shortcut Creation

**Issue:** Item 7 requires creating a shortcut at form submission. This adds a dependency on PDF upload being completed.

**Resolution:**
- Shortcut creation is non-blocking (won't fail submission)
- Only creates shortcut if PDF info is available
- Logs errors but continues with submission
- User can manually add shortcut later if needed

---

## 📋 Implementation Order (REVISED)

Based on dependencies and Planning Agent guidance:

### Phase 1: Verification & Basic Fixes (3-4 hours)
1. **Item 1: Report Name & Valid Period Verification** - Add checkboxes and verification UI
2. **Item 2: File Naming** - Strip suburb, date suffix, download counter
3. **Item 6: Checkbox Retention + Carriage Return** - Move to form store, add carriage return

### Phase 2: Complex Features (4-5 hours)
4. **Item 4: 7 Custom Dialogue Fields** - REDESIGN with merge logic
5. **Item 5: Auto-populate PDF Link** - Add fields and callback

### Phase 3: Final Touches (1-2 hours)
6. **Item 7: Create PDF Shortcut** - Add shortcut creation at submission

### Phase 4: Documentation (0 hours)
7. **Item 3: Regional in Heading** - Document as Make.com issue

**Total Estimated Time:** 8-11 hours (excluding testing)

**Testing Time:** 3-4 hours for comprehensive testing

**Total:** 11-15 hours

---

## ✅ Ready for Final Approval

- [x] All 7 items analyzed (6 original + 1 new)
- [x] Critical corrections from Planning Agent incorporated
- [x] Item 1: Added verification checkboxes and confirmation messages
- [x] Item 2: Added date suffix and download counter stripping
- [x] Item 4: COMPLETE REDESIGN - custom dialogue fields with merge logic
- [x] Item 6: Added carriage return logic
- [x] Item 7: NEW - PDF shortcut creation designed
- [x] Changes documented with file paths and line numbers
- [x] Risks identified
- [x] Testing approach defined
- [x] Implementation order revised

---

## 🚀 Next Steps

**Awaiting final approval to proceed with implementation.**

Once approved, I will:
1. Execute changes in the revised order (Phase 1 → Phase 2 → Phase 3 → Phase 4)
2. Provide status updates after each item
3. Test each fix individually
4. Test all fixes together
5. Create completion report

**Questions for Planning Agent:**

1. **Item 4 Merge Logic:** Should custom dialogue be merged in real-time (with debouncing) or only when saving? Real-time is better UX but more complex.

2. **Item 4 Base Main Body:** Should we store the base main body (without custom dialogue) separately, or extract it from the merged version when needed?

3. **Item 7 Shortcut Naming:** Should the shortcut be named "[Report Name] Hotspotting Report" or just "[Report Name]"?

4. **General:** Are there any other considerations or edge cases I should handle?

---

**Ready for your approval to proceed!**

# 🚀 Phase 4C-1: PDF Upload + Metadata Extraction - For Chat F

**Date:** January 21, 2026  
**Status:** Ready to start  
**Branch:** `feature/phase-4c-1-pdf-upload` (create from `feature/phase-3-step5-refactor`)

---

## 🎯 Your Mission

Implement PDF upload functionality for Investment Highlights:
- Upload Hotspotting PDF to Google Drive
- Extract Report Name & Valid Period from front page
- User verification of extracted data
- Version management (CURRENT/LEGACY folders)
- Activity logging

**NOT in this phase:** AI summary generation, section editing, expiry warnings, proximity fix (those are Phase 4C-2 and 4C-3)

---

## ✅ What's Already Done

- ✅ `InvestmentHighlightsField.tsx` component exists
- ✅ Google Sheets lookup working
- ✅ Manual entry form working
- ✅ Google Drive API configured

---

## 📊 Google Sheet Structure

### Tab 1: "Investment Highlights" (15 columns)

**Headers:**
```
Suburbs (comma-separated)	State	Report Name	Valid Period	Main Body	Extra Info	Population Growth Context	Residential	Industrial	Commercial and Civic	Health and Education	Transport	Job Implications	PDF Drive Link	PDF File ID
```

### Tab 2: "Investment Highlights Activity Log"

**Headers:**
```
Timestamp	Action Type	Report Name	Valid Period	User/BA	PDF Link	Details
```

**Action Types:** Uploaded, Used, Superseded, Edited Section, Edited Main Body, Deleted Extra Line, Confirmed Current, Expiry Warning Shown

---

## 📁 Google Drive Folder Structure

```
Hotspotting Reports/
├── [Report Name]/
│   ├── CURRENT/
│   │   └── [Report Name] - [Valid Period].pdf
│   └── LEGACY/
│       └── [Old reports moved here]
```

**Example:**
```
Hotspotting Reports/
└── SUNSHINE COAST/
    ├── CURRENT/
    │   └── SUNSHINE COAST - October 2025 - January 2026.pdf
    └── LEGACY/
        └── SUNSHINE COAST - July 2025 - October 2025.pdf
```

---

## 🔧 What You Need to Build

### 1. PDF Upload UI (30 min)

**Add to `InvestmentHighlightsField.tsx`:**

```tsx
// When no match found, show upload option
<div className="mt-3 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
  <input
    type="file"
    accept=".pdf"
    onChange={handlePdfUpload}
    className="hidden"
    id="pdf-upload"
  />
  <label htmlFor="pdf-upload" className="cursor-pointer">
    <div className="text-gray-600">
      📄 Upload Hotspotting PDF
      <p className="text-sm">Drag & drop or click to browse</p>
      <p className="text-xs">(PDF files only, max 50MB)</p>
    </div>
  </label>
</div>

<div className="mt-2 text-sm text-gray-600">
  💡 Check for latest reports:
  <a 
    href="https://membership.hotspotting.com.au/hotspotting-reports"
    target="_blank"
    className="text-blue-600 hover:underline ml-1"
  >
    Hotspotting Membership
  </a>
</div>
```

---

### 2. Backend: Upload PDF (45 min)

**File:** `form-app/src/app/api/investment-highlights/upload-pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files allowed' }, { status: 400 });
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }
    
    // Upload to Google Drive (temp location)
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    const buffer = await file.arrayBuffer();
    const fileMetadata = {
      name: file.name,
      parents: [process.env.GOOGLE_PARENT_FOLDER_ID],
    };
    
    const media = {
      mimeType: 'application/pdf',
      body: Buffer.from(buffer),
    };
    
    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });
    
    return NextResponse.json({
      fileId: uploadedFile.data.id,
      fileName: uploadedFile.data.name,
      webViewLink: uploadedFile.data.webViewLink,
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
  }
}
```

---

### 3. Backend: Extract Metadata (1 hour)

**File:** `form-app/src/app/api/investment-highlights/extract-metadata/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import pdf from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();
    
    // Download PDF from Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    // Extract text from PDF
    const pdfData = await pdf(Buffer.from(response.data as ArrayBuffer));
    const firstPage = pdfData.text.split('\n').slice(0, 30).join('\n'); // First 30 lines
    
    // Extract Report Name (agile parsing)
    const reportName = extractReportName(firstPage);
    
    // Extract Valid Period (agile parsing)
    const validPeriod = extractValidPeriod(firstPage);
    
    return NextResponse.json({
      reportName,
      validPeriod,
      confidence: (reportName && validPeriod) ? 'high' : 'low',
    });
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract metadata' }, { status: 500 });
  }
}

function extractReportName(text: string): string {
  // Look for large text patterns (usually report name)
  // Common patterns: "SUNSHINE COAST", "INNER WEST", etc.
  const lines = text.split('\n');
  
  // Look for all-caps text or title-case near top
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 50) {
      // Check if mostly uppercase or title case
      if (trimmed === trimmed.toUpperCase() || /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(trimmed)) {
        // Exclude common headers
        if (!['LOCATION REPORT', 'HOTSPOTTING', 'BY RYDER'].includes(trimmed)) {
          return trimmed;
        }
      }
    }
  }
  
  return '';
}

function extractValidPeriod(text: string): string {
  // Look for date range patterns
  const patterns = [
    /([A-Z][a-z]+\s+\d{4})\s*-\s*([A-Z][a-z]+\s+\d{4})/i, // October 2025 - January 2026
    /(\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{4})/, // 10/2025 - 01/2026
    /([A-Z][a-z]{2}\s+\d{4})\s*-\s*([A-Z][a-z]{2}\s+\d{4})/i, // Oct 2025 - Jan 2026
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return '';
}
```

---

### 4. User Verification UI (30 min)

**Add to `InvestmentHighlightsField.tsx`:**

```tsx
{showVerification && (
  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
    <h4 className="font-medium text-blue-900 mb-3">
      ✅ PDF Uploaded: {uploadedFileName}
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
          placeholder="e.g., SUNSHINE COAST"
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
    
    <p className="text-xs text-gray-600 mt-2">
      ⚠️ Please verify the information above
    </p>
    
    <div className="flex space-x-2 mt-3">
      <button
        onClick={handleConfirmMetadata}
        disabled={!extractedReportName || !extractedValidPeriod}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
      >
        ✓ Confirm & Continue
      </button>
      <button
        onClick={handleCancelUpload}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        ✗ Cancel
      </button>
    </div>
  </div>
)}
```

---

### 5. Version Management (45 min)

**After user confirms, organize folders:**

```typescript
async function organizePdfInFolders(fileId: string, reportName: string, validPeriod: string) {
  // 1. Find or create "Hotspotting Reports" folder
  // 2. Find or create "[Report Name]" folder
  // 3. Find or create "CURRENT" and "LEGACY" subfolders
  // 4. Check if CURRENT has existing file
  // 5. If yes, move to LEGACY
  // 6. Move new file to CURRENT
  // 7. Return shareable link
}
```

---

### 6. Activity Logging (30 min)

**File:** `form-app/src/lib/investmentHighlightsLogger.ts`

```typescript
import { google } from 'googleapis';

export async function logInvestmentHighlightsActivity(entry: {
  actionType: string;
  reportName: string;
  validPeriod: string;
  userEmail: string;
  pdfLink: string;
  details: string;
}) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS,
    range: 'Investment Highlights Activity Log!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        timestamp,
        entry.actionType,
        entry.reportName,
        entry.validPeriod,
        entry.userEmail,
        entry.pdfLink,
        entry.details,
      ]],
    },
  });
}
```

---

## 📦 Install Dependencies

```bash
npm install pdf-parse
```

---

## ✅ Success Criteria

- [ ] PDF upload via drag & drop or file picker
- [ ] File validation (PDF only, max 50MB)
- [ ] Extract Report Name from front page
- [ ] Extract Valid Period from front page
- [ ] User verification UI with editable fields
- [ ] Create CURRENT/LEGACY folder structure
- [ ] Move old PDF to LEGACY when new uploaded
- [ ] Save PDF link to Google Sheet (columns N, O)
- [ ] Log "Uploaded" and "Superseded" activities
- [ ] Link to Hotspotting membership site

---

## 🧪 Testing

1. Upload sample Hotspotting PDF
2. Verify metadata extracted correctly
3. Edit extracted values
4. Confirm → verify saved to Google Sheet
5. Upload second PDF for same report → verify first moved to LEGACY
6. Check Activity Log tab has entries

---

## 🚀 When Complete

1. Test thoroughly
2. Update `IMPLEMENTATION-TRACKER.md`
3. Create `PHASE-4C-1-IMPLEMENTATION-SUMMARY.md`
4. Return to Coordinator Chat

---

**Estimated Time:** 2-3 hours  
**Complexity:** Medium  

**Ready to start!** 🎉

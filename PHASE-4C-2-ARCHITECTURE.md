# Phase 4C-2: Architecture & Data Flow

**Date:** 2026-01-21  
**Phase:** 4C-2 (AI Summary Generation)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  InvestmentHighlightsField.tsx                            │  │
│  │                                                            │  │
│  │  • Upload PDF                                             │  │
│  │  • Generate AI Summary Button                             │  │
│  │  • Section Editor (7 text areas)                          │  │
│  │  • Save All Sections Button                               │  │
│  │  • Real-time Main Body updates                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               ↓
┌──────────────────────────────┼────────────────────────────────────┐
│                         API Routes (Next.js)                      │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/investment-highlights/generate-summary             │   │
│  │                                                           │   │
│  │  1. Download PDF from Google Drive                       │   │
│  │  2. Extract text using pdfExtractor.ts                   │   │
│  │  3. Send to OpenAI API                                   │   │
│  │  4. Parse AI response into 7 sections                    │   │
│  │  5. Return sections + Main Body                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/investment-highlights/save                         │   │
│  │                                                           │   │
│  │  1. Receive all 15 column values                         │   │
│  │  2. Find existing row (by Report Name + State)           │   │
│  │  3. Update or insert row                                 │   │
│  │  4. Save to Google Sheet                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────┼────────────────────────────────────┐
│                      External Services                            │
│                              ↓                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │  Google Drive   │    │  OpenAI API     │    │ Google      │  │
│  │                 │    │                 │    │ Sheets      │  │
│  │  • Store PDFs   │    │  • GPT-4o       │    │             │  │
│  │  • Organize     │    │  • Extract      │    │  • 15       │  │
│  │    folders      │    │    sections     │    │    columns  │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: AI Summary Generation

```
┌─────────────┐
│ User clicks │
│ "Generate   │
│  Summary"   │
└──────┬──────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: handleGenerateSummary()                            │
│ • Set generatingSummary = true                               │
│ • Show loading spinner                                       │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ API: POST /api/investment-highlights/generate-summary        │
│ Body: { fileId: "abc123..." }                                │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Download PDF from Google Drive                       │
│ • Use Google Drive API                                       │
│ • Get file by fileId                                         │
│ • Download as Buffer                                         │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Extract text from PDF                                │
│ • Call extractPdfText(buffer)                                │
│ • Uses pdf-parse library                                     │
│ • Returns full text string                                   │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Build AI prompt                                      │
│ • buildInfrastructurePrompt(pdfText)                         │
│ • Include PDF text + formatting instructions                │
│ • Specify 7 sections                                         │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Send to OpenAI API                                   │
│ • POST https://api.openai.com/v1/chat/completions            │
│ • Model: gpt-4o                                              │
│ • Temperature: 0.3 (consistent output)                       │
│ • Max tokens: 4000                                           │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 5: Parse AI response                                    │
│ • parseAiResponse(aiResponse)                                │
│ • Extract 7 sections using regex                             │
│ • Fallback to keyword parsing if regex fails                 │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 6: Generate Main Body                                   │
│ • generateMainBody(sections)                                 │
│ • Combine sections with headers                              │
│ • Format with bold text                                      │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ API Response                                                  │
│ {                                                             │
│   success: true,                                             │
│   sections: {                                                │
│     populationGrowthContext: "...",                          │
│     residential: "...",                                      │
│     industrial: "...",                                       │
│     commercialAndCivic: "...",                               │
│     healthAndEducation: "...",                               │
│     transport: "...",                                        │
│     jobImplications: "..."                                   │
│   },                                                         │
│   mainBody: "..."                                            │
│ }                                                            │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: Update state                                        │
│ • setSections(result.sections)                               │
│ • onChange(result.mainBody)                                  │
│ • setShowSectionEditor(true)                                 │
│ • setGeneratingSummary(false)                                │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────┐
│ User sees    │
│ 7 sections   │
│ populated    │
└──────────────┘
```

---

## Data Flow: Section Editing

```
┌─────────────┐
│ User edits  │
│ a section   │
└──────┬──────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: handleSectionChange(sectionName, newValue)         │
│ • Update sections state                                      │
│ • Call generateMainBodyFromSections()                        │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ generateMainBodyFromSections(sections)                       │
│ • Combine all sections                                       │
│ • Add section headers (except Population Growth)             │
│ • Format with bold text                                      │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: onChange(newMainBody)                              │
│ • Update Main Body textarea                                  │
│ • Real-time update (no API call)                             │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────┐
│ User sees    │
│ Main Body    │
│ updated      │
└──────────────┘
```

---

## Data Flow: Save to Google Sheet

```
┌─────────────┐
│ User clicks │
│ "Save All   │
│  Sections"  │
└──────┬──────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: handleSaveSections()                               │
│ • Set loading = true                                         │
│ • Generate Main Body from sections                           │
│ • Prepare all 15 column values                               │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ API: POST /api/investment-highlights/save                    │
│ Body: {                                                      │
│   suburbs, state, reportName, validPeriod,                   │
│   mainBody, extraInfo,                                       │
│   populationGrowthContext, residential, industrial,          │
│   commercialAndCivic, healthAndEducation, transport,         │
│   jobImplications, pdfLink, fileId                           │
│ }                                                            │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Find existing row                                    │
│ • Query Google Sheet (A2:O)                                  │
│ • Match by Report Name + State                               │
│ • Get row index if exists                                    │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Prepare row data (15 columns)                        │
│ A: Suburbs                                                   │
│ B: State                                                     │
│ C: Report Name                                               │
│ D: Valid Period                                              │
│ E: Main Body                                                 │
│ F: Extra Info                                                │
│ G: Population Growth Context                                 │
│ H: Residential                                               │
│ I: Industrial                                                │
│ J: Commercial and Civic                                      │
│ K: Health and Education                                      │
│ L: Transport                                                 │
│ M: Job Implications                                          │
│ N: PDF Drive Link                                            │
│ O: PDF File ID                                               │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Update or Insert                                     │
│ • If row exists: Update A{row}:O{row}                        │
│ • If row doesn't exist: Append to A:O                        │
│ • Preserve existing PDF link/file ID if not provided         │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ API Response                                                  │
│ { success: true }                                            │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: Show success message                               │
│ • alert("Investment highlights and sections saved!")         │
│ • Set loading = false                                        │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────┐
│ User sees    │
│ success      │
│ message      │
└──────────────┘
```

---

## Google Sheet Structure (15 Columns)

```
┌───┬─────────────────────────────┬──────────────────────────────┐
│ # │ Column Name                 │ Example Value                │
├───┼─────────────────────────────┼──────────────────────────────┤
│ A │ Suburbs                     │ "Brisbane, South Brisbane"   │
│ B │ State                       │ "QLD"                        │
│ C │ Report Name                 │ "BRISBANE"                   │
│ D │ Valid Period                │ "October 2025 - Jan 2026"    │
│ E │ Main Body                   │ "Population growth... **$..  │
│ F │ Extra Info                  │ "Additional notes..."        │
│ G │ Population Growth Context   │ "Brisbane's population..."   │
│ H │ Residential                 │ "**$500M** New development"  │
│ I │ Industrial                  │ "**$250M** Industrial park"  │
│ J │ Commercial and Civic        │ "**$180M** Civic center"     │
│ K │ Health and Education        │ "**$120M** Hospital exp."    │
│ L │ Transport                   │ "**$2.5B** Rail extension"   │
│ M │ Job Implications            │ "5,000 construction jobs"    │
│ N │ PDF Drive Link              │ "https://drive.google.com/." │
│ O │ PDF File ID                 │ "1abc2def3ghi..."            │
└───┴─────────────────────────────┴──────────────────────────────┘
```

---

## State Management (Frontend)

```typescript
// InvestmentHighlightsField.tsx

// Phase 4C-1 states (PDF upload)
const [uploadingPdf, setUploadingPdf] = useState(false);
const [uploadedFileId, setUploadedFileId] = useState('');
const [uploadedFileName, setUploadedFileName] = useState('');
const [extractedReportName, setExtractedReportName] = useState('');
const [extractedValidPeriod, setExtractedValidPeriod] = useState('');
const [showVerification, setShowVerification] = useState(false);

// Phase 4C-2 states (AI summary)
const [generatingSummary, setGeneratingSummary] = useState(false);
const [showSectionEditor, setShowSectionEditor] = useState(false);
const [sections, setSections] = useState({
  populationGrowthContext: '',
  residential: '',
  industrial: '',
  commercialAndCivic: '',
  healthAndEducation: '',
  transport: '',
  jobImplications: '',
});

// Shared states
const [loading, setLoading] = useState(false);
const [matchStatus, setMatchStatus] = useState<'checking' | 'found' | 'not-found' | null>(null);
const [reportName, setReportName] = useState('');
const [validPeriod, setValidPeriod] = useState('');
const [error, setError] = useState<string | null>(null);
```

---

## API Contracts

### Generate Summary Endpoint

**Request:**
```typescript
POST /api/investment-highlights/generate-summary
Content-Type: application/json

{
  fileId: string  // Google Drive file ID
}
```

**Response (Success):**
```typescript
{
  success: true,
  sections: {
    populationGrowthContext: string,
    residential: string,
    industrial: string,
    commercialAndCivic: string,
    healthAndEducation: string,
    transport: string,
    jobImplications: string
  },
  mainBody: string  // Combined text of all sections
}
```

**Response (Error):**
```typescript
{
  error: string  // Error message
}
```

### Save Endpoint

**Request:**
```typescript
POST /api/investment-highlights/save
Content-Type: application/json

{
  // Basic info (A-D)
  suburbs: string,
  state: string,
  reportName: string,
  validPeriod: string,
  
  // Main content (E-F)
  mainBody: string,
  extraInfo: string,
  
  // Individual sections (G-M)
  populationGrowthContext: string,
  residential: string,
  industrial: string,
  commercialAndCivic: string,
  healthAndEducation: string,
  transport: string,
  jobImplications: string,
  
  // PDF info (N-O)
  pdfLink: string,
  fileId: string
}
```

**Response (Success):**
```typescript
{
  success: true
}
```

**Response (Error):**
```typescript
{
  error: string  // Error message
}
```

---

## OpenAI API Integration

### Request Format

```typescript
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer {OPENAI_API_KEY}
Content-Type: application/json

{
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: "You are an expert real estate analyst..."
    },
    {
      role: "user",
      content: "I need you to analyze this Hotspotting property report..."
    }
  ],
  temperature: 0.3,
  max_tokens: 4000
}
```

### Response Format

```typescript
{
  choices: [
    {
      message: {
        content: "SECTION 1: Population Growth Context\n..."
      }
    }
  ]
}
```

---

## Error Handling Flow

```
┌─────────────┐
│ Error       │
│ Occurs      │
└──────┬──────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Catch block in API route or frontend                         │
│ • Log error to console                                       │
│ • Extract error message                                      │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Return error response                                         │
│ • Status: 400 or 500                                         │
│ • Body: { error: "User-friendly message" }                   │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: Display error                                       │
│ • setError(errorMessage)                                     │
│ • Show error UI with retry button                            │
└──────┬───────────────────────────────────────────────────────┘
       ↓
┌──────────────┐
│ User sees    │
│ error + can  │
│ retry        │
└──────────────┘
```

---

## Performance Optimization

### Caching Strategy
- **PDF Text:** Not cached (extracted fresh each time)
- **AI Response:** Not cached (may vary with temperature)
- **Google Sheet Data:** Not cached (always fresh)

### Optimization Opportunities (Future)
1. **Cache PDF text** - Store extracted text in database
2. **Cache AI responses** - Store by PDF hash
3. **Batch AI requests** - Process multiple PDFs at once
4. **Stream AI responses** - Show sections as they're generated

---

## Security Considerations

### API Keys
- OpenAI API key stored in environment variable
- Google credentials stored in environment variable
- Never exposed to frontend

### File Access
- Only access files user uploaded
- Validate file IDs before processing
- Use Google Drive API permissions

### Data Validation
- Validate all input fields
- Sanitize text before saving to sheet
- Check for SQL injection (not applicable, using Google Sheets API)

---

## Monitoring & Logging

### Key Metrics to Track
1. **AI Generation Success Rate** - % of successful generations
2. **AI Generation Time** - Average time to generate
3. **Save Success Rate** - % of successful saves
4. **Error Rate** - % of requests with errors
5. **User Adoption** - % of users using AI vs manual

### Logs to Monitor
```
Downloading PDF from Google Drive, fileId: ...
PDF downloaded, size: ...
Extracting text from PDF...
Text extracted, length: ...
Sending to OpenAI API...
AI response received, length: ...
```

---

## Conclusion

Phase 4C-2 architecture is designed for:
- **Simplicity:** Straightforward data flow
- **Reliability:** Comprehensive error handling
- **Performance:** Optimized for typical use cases
- **Maintainability:** Well-documented and modular
- **Scalability:** Can handle multiple concurrent requests

**Next:** Test with real data to validate architecture.

# PDF Extraction Timing Issue - Analysis Prompt

**FOR EXTERNAL AI CHAT (Google AI / ChatGPT)**  
**TASK: Analyze the issue and propose solutions**

---

## The Problem

When users upload a PDF to Google Drive and immediately try to extract metadata from it, we get this error:

```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**What's happening:**
1. User uploads PDF to Google Drive ✅
2. Upload succeeds, we get a `fileId` ✅
3. Frontend immediately calls `/api/investment-highlights/extract-metadata` with the `fileId` ✅
4. API tries to download the PDF from Google Drive using `drive.files.get()` ❌
5. Google Drive returns an HTML error page (404) instead of the PDF ❌
6. We try to parse HTML as JSON → Error ❌

**Why it happens:**
Google Drive needs time to process/index the uploaded file before it can be downloaded again. This is a **timing/race condition** issue.

**Workaround that works:**
- Upload PDF
- Wait 10-15 seconds
- Refresh page
- Try extraction again → Works! ✅

---

## Current Code

### Frontend Upload Flow
**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`

```typescript
// 1. Upload PDF to Google Drive
const uploadResponse = await fetch('/api/investment-highlights/upload-pdf', {
  method: 'POST',
  body: formData,
});

const uploadResult = await uploadResponse.json();
// uploadResult = { fileId: "abc123", fileName: "Fraser Coast.pdf", webViewLink: "..." }

// 2. Wait 3 seconds (not enough!)
await new Promise(resolve => setTimeout(resolve, 3000));

// 3. Immediately try to extract metadata
const extractResponse = await fetch('/api/investment-highlights/extract-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileId: uploadResult.fileId }),
});

const extractResult = await extractResponse.json();
// ❌ ERROR: Unexpected token '<', "<!DOCTYPE "...
```

### Backend Extract Metadata API
**File:** `src/app/api/investment-highlights/extract-metadata/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fileId } = body;
  
  // Initialize Google Drive API
  const drive = google.drive({ version: 'v3', auth });
  
  // Download PDF from Google Drive
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  
  // ❌ response.data is HTML error page, not PDF
  
  // Try to extract text using pdf-parse
  const pdfData = await pdfParse(Buffer.from(response.data));
  // ❌ Fails because response.data is not a valid PDF
}
```

---

## Questions for Analysis

### 1. Root Cause
- Is this a known Google Drive API limitation?
- How long does Google Drive typically take to process a file?
- Is there a way to check if a file is "ready" before downloading?

### 2. Solution Approaches

**Option A: Retry Logic with Exponential Backoff**
- Try download
- If fails (404 or HTML response), wait and retry
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max retries: 5-7 attempts
- Total max wait: ~30 seconds

**Pros:** Robust, handles variable processing times  
**Cons:** Complex, may still fail if Google Drive is slow

**Option B: Longer Fixed Delay**
- Increase wait time from 3s to 15-20s
- Simple to implement

**Pros:** Simple  
**Cons:** Always waits full time, even if file is ready sooner

**Option C: Polling/Status Check**
- Poll Google Drive to check if file is "ready"
- Use `drive.files.get()` with `fields: 'id,name,mimeType'` (metadata only)
- When metadata returns successfully, file is ready

**Pros:** Efficient, only waits as long as needed  
**Cons:** More API calls, may hit rate limits

**Option D: Deferred Processing**
- Upload PDF, save `fileId` to database
- Show "Processing..." message to user
- Background job processes PDF later (webhook, cron, or user-triggered)

**Pros:** No waiting, better UX  
**Cons:** More complex architecture

**Option E: Early Upload (User's Idea)**
- Upload PDF on an earlier step (Step 2 or 3)
- By the time user reaches Step 5, file is ready
- Extract metadata when they arrive at Step 5

**Pros:** Natural delay, no artificial waiting  
**Cons:** Requires UI/UX changes

### 3. Error Detection
How to detect if the response is an error vs valid PDF?
- Check `response.headers['content-type']` for `application/pdf`?
- Check for HTML in response body?
- Catch specific error codes?

### 4. User Experience
- Should we show a progress indicator during retries?
- What message to show: "Processing PDF..." or "Waiting for Google Drive..."?
- Should we allow user to continue without extraction and try again later?

---

## Your Task

Please analyze and provide:

1. **Root Cause Explanation**
   - Why does Google Drive need processing time?
   - Is this documented in Google Drive API docs?

2. **Recommended Solution**
   - Which option (A, B, C, D, E, or hybrid) is best?
   - Why?
   - Any gotchas or edge cases?

3. **Implementation Guidance**
   - Pseudocode or conceptual approach
   - How to detect errors vs valid PDF
   - Retry strategy (if applicable)

4. **Alternative Ideas**
   - Any other solutions we haven't considered?

---

## Additional Context

**Tech Stack:**
- Next.js 14 (App Router)
- Google Drive API v3
- `pdf-parse` library for text extraction

**Current Behavior:**
- Upload works 100% of the time
- Extraction fails 100% of the time on fresh uploads
- Extraction works 100% of the time after 10-15 second wait

**User's Idea (Early Upload):**
- Move PDF upload to Step 2 or 3
- User fills out other form fields (takes 2-5 minutes)
- By Step 5, Google Drive has processed the file
- No artificial delays needed

---

## Output Format

Save your analysis as a document with:
- Clear recommendation
- Implementation steps
- Code examples (pseudocode is fine)
- Pros/cons of your approach

**DO NOT write actual code** - just provide analysis and guidance.

---

**End of Prompt**

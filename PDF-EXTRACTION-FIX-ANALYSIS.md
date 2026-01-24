# PDF Extraction Timing Issue - Root Cause Analysis

**Date:** January 22, 2026  
**Issue:** "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" error for Hotspotting Reports  
**Source:** External AI Chat Analysis  
**Status:** Analysis Complete, Implementation Pending

---

## ROOT CAUSE ANALYSIS

### The Problem

**Frontend Code** (`InvestmentHighlightsField.tsx`, lines 262-266):
```typescript
const extractResponse = await fetch('/api/investment-highlights/extract-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileId: uploadResult.fileId }),
});
```

The frontend sends a JSON request with `fileId` to the extract-metadata endpoint.

**Backend Code** (`extract-metadata/route.ts`, lines 40-44):
```typescript
// Download PDF from Google Drive
const response = await drive.files.get(
  { fileId, alt: 'media', supportsAllDrives: true },
  { responseType: 'arraybuffer' }
);
```

The API tries to download the PDF from Google Drive **immediately after upload**.

**The Issue:** Google Drive needs time to process the uploaded file before it can be downloaded again.

---

## Why Manual Save Works

When you manually save the PDF first, then upload it:
1. ✅ The file has been on Google Drive for a while
2. ✅ Google Drive has fully processed and indexed it
3. ✅ The download works immediately

---

## Why Fresh Uploads Fail

When you upload a PDF directly:
1. File is uploaded to Google Drive (`upload-pdf` route)
2. Frontend waits 3 seconds (line 257)
3. Frontend immediately calls `extract-metadata`
4. ❌ **BUT** Google Drive hasn't finished processing the file yet
5. ❌ The download fails, returning a 404 HTML error page
6. ❌ Frontend tries to parse HTML as JSON → **"Unexpected token '<'" error**

---

## The Solution

**Add proper retry logic with exponential backoff** in the `extract-metadata` endpoint.

### Implementation Approach:

1. **Retry Logic:**
   - Attempt download
   - If fails (404 or HTML response), wait and retry
   - Use exponential backoff (1s, 2s, 4s, 8s, etc.)
   - Max retries: 5-7 attempts
   - Total max wait: ~30 seconds

2. **Error Detection:**
   - Check response type (should be PDF, not HTML)
   - Check for 404 errors
   - Validate response is actually a PDF

3. **User Feedback:**
   - Show progress indicator during retries
   - Display helpful message: "Waiting for Google Drive to process file..."
   - Show error if all retries fail

---

## Files to Modify

### Primary:
- **`src/app/api/investment-highlights/extract-metadata/route.ts`**
  - Add retry logic with exponential backoff
  - Add response type validation
  - Add better error handling

### Secondary (Optional):
- **`src/components/steps/step5/InvestmentHighlightsField.tsx`**
  - Increase wait time from 3s to 5s (line 257)
  - Add progress indicator for extraction
  - Better error messages

---

## Proposed Retry Logic (Pseudocode)

```typescript
async function downloadPDFWithRetry(fileId: string, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
      );
      
      // Validate response is actually a PDF
      if (response.headers['content-type']?.includes('application/pdf')) {
        return response.data;
      }
      
      throw new Error('Response is not a PDF');
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error('Failed to download PDF after maximum retries');
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const waitTime = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retry ${attempt}/${maxRetries} - waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

---

## Testing Strategy

### Test Cases:
1. **Fresh upload** - Upload new PDF, verify extraction works
2. **Multiple uploads** - Upload several PDFs in sequence
3. **Large files** - Test with large PDFs (10MB+)
4. **Network issues** - Test with slow connection
5. **Manual save** - Verify manual save still works

### Expected Results:
- ✅ Fresh uploads work without errors
- ✅ User sees progress indicator during retries
- ✅ Clear error message if extraction fails
- ✅ Manual save workflow unchanged

---

## Priority

**Medium-High** - This is a known workaround (manual save), but affects UX.

**Estimated Effort:** 2-3 hours
- 1 hour: Implement retry logic
- 1 hour: Testing
- 30 min: UI improvements

---

## Related Issues

This is part of the larger **Investment Highlights Enhanced Workflow** but can be implemented independently.

---

## Notes

- Current workaround: User manually saves PDF before uploading
- This issue was mentioned on Jan 21, 2026
- Solution was analyzed by external AI chat on Jan 22, 2026
- Implementation pending based on priority

---

**Status:** Ready for implementation when prioritized.

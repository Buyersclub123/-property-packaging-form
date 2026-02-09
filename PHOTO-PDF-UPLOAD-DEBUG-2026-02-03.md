# Photo PDF Upload Issue - Debug Log (2026-02-03)

## Current Issue
**Problem:** Photo PDFs are not being created in Google Drive folder when user clicks "Generate PDF" button.

**Status:** Under investigation - diagnostic logging added

## What We Know
1. **Code Location:** 
   - Component: `form-app/src/components/steps/Step9PhotoDocuments.tsx`
   - API Route: `form-app/src/app/api/photos/upload-pdf/route.ts`
   - These are the PRODUCTION files (not a test rig)

2. **Expected Behavior:**
   - User adds photos in Step 9
   - User clicks "Generate PDF" button
   - PDF is generated client-side using `pdf-lib`
   - PDF is uploaded to Google Drive via `/api/photos/upload-pdf`
   - PDF should appear in the property folder

3. **Current Behavior:**
   - Button click triggers `handleGeneratePDF()`
   - PDF generation may or may not complete
   - Upload may or may not be called
   - No PDFs appear in Google Drive folder

## Diagnostic Logging Added (2026-02-03)

### Client-Side Logs (Browser Console)
All logs prefixed with `[PHOTO_PDF]`:
- `[PHOTO_PDF] handleGeneratePDF called` - When function starts
- `[PHOTO_PDF] Starting PDF generation...` - After validation
- `[PHOTO_PDF] About to save PDF document...` - Before PDF save
- `[PHOTO_PDF] PDF saved successfully` - After PDF save (with size)
- `[PHOTO_PDF] PDF size OK, proceeding to upload...` - Before upload
- `[PHOTO_PDF] uploadPDF called` - When upload function starts
- `[PHOTO_PDF] Generated filename:` - Filename being used
- `[PHOTO_PDF] Sending upload request to /api/photos/upload-pdf` - Before fetch
- `[PHOTO_PDF] Upload response status:` - HTTP response status
- `[PHOTO_PDF] Upload successful:` - On success
- `[PHOTO_PDF] ERROR in handleGeneratePDF:` - Any errors caught

### Server-Side Logs (Terminal/Server Console)
All logs prefixed with `[API]`:
- `[API] /api/photos/upload-pdf - Request received` - When API route is hit
- `[API] /api/photos/upload-pdf - FormData parsed` - After parsing FormData

## How to Debug

1. **Open Browser Console** (F12 → Console tab)
2. **Click "Generate PDF" button**
3. **Look for `[PHOTO_PDF]` logs** - These show where client-side process stops
4. **Check Server Terminal** - Look for `[API]` logs to see if request reaches server
5. **Share the logs** - The last log message shows where it's failing

## Possible Failure Points

1. **PDF Generation Fails:**
   - Error in image processing
   - Error in PDF creation
   - Check for `[PHOTO_PDF] ERROR` logs

2. **Upload Not Called:**
   - PDF generation completes but upload never starts
   - Should see "PDF saved successfully" but no "uploadPDF called"

3. **Upload Fails:**
   - Request sent but API returns error
   - Check `[PHOTO_PDF] Upload response status:` for error codes
   - Check `[PHOTO_PDF] Upload failed:` for error details

4. **API Not Receiving Request:**
   - No `[API]` logs in server terminal
   - Network error or route not found

5. **API Receives But Fails:**
   - `[API]` logs appear but upload fails
   - Check server terminal for Google Drive API errors

## Next Steps

1. **Get console logs from user** - This will show exactly where it fails
2. **Fix the identified issue** - Based on where logs stop
3. **Test again** - Verify fix works
4. **Update this doc** - Document the root cause and fix

## Related Documentation

- `PHOTO-PDF-CLIENT-SIDE-HANDOVER.md` - Original implementation plan
- `PHOTO-UPLOAD-INTEGRATION-PLAN.md` - Integration details
- `AI_CHANGES_LOG.md` - AI-generated changes tracking

## Code Tags

All modified code sections are tagged with `AI_GENERATED_TAG` for future reference:
- `AI_GENERATED_TAG: PHOTO_PDF_UPLOAD_ROUTE`
- `AI_GENERATED_TAG: PHOTO_PDF_UPLOAD_HELPER`
- `AI_GENERATED_TAG: DUPLICATE_CHECK`

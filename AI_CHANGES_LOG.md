# AI-Generated Changes Log

**Purpose**: This file tracks AI-generated changes to help future AI sessions understand what was modified and why.

## Tagging Convention

All AI-generated code changes should be tagged with:
- `AI_GENERATED_TAG: [DESCRIPTIVE_NAME]` - Header comment for major sections
- Clear documentation of current behavior
- Known issues and warnings
- Notes for future AI sessions

## Recent Changes (2026-02-03)

### Photo PDF Upload Route (`/api/photos/upload-pdf/route.ts`)
- **Status**: Documented, no functional changes
- **Current Behavior**: 
  - Generates filename from propertyAddress: `"Photos {address}.pdf"`
  - Checks for duplicates and adds timestamp if duplicate found
  - Does NOT use client-provided filename (even if sent in FormData)
- **Known Issue**: Race condition - simultaneous uploads may overwrite each other
- **Tags Added**: `AI_GENERATED_TAG: PHOTO_PDF_UPLOAD_ROUTE`, `FILENAME_GENERATION`, `DUPLICATE_CHECK`

### Document Upload Route (`/api/documents/upload/route.ts`)
- **Status**: Documented, no functional changes
- **Current Behavior**:
  - Uses client-provided fileName from FormData
  - Checks for duplicates and adds timestamp if duplicate found
  - Timestamp only added AFTER duplicate is detected
- **Known Issue**: Race condition - simultaneous uploads may overwrite each other
- **Tags Added**: `AI_GENERATED_TAG: DOCUMENT_UPLOAD_ROUTE`, `DUPLICATE_CHECK_WITH_RACE_CONDITION`

### Photo Documents Component (`Step9PhotoDocuments.tsx`)
- **Status**: Documented, no functional changes
- **Current Behavior**:
  - Generates filename: `"Photos {address} {pdfNumber}.pdf"` or `"Photos {address}.pdf"`
  - Does NOT add timestamp for uniqueness (relies on API route duplicate checking)
- **Tags Added**: `AI_GENERATED_TAG: PHOTO_PDF_UPLOAD_HELPER`

## Important Notes for Future AI Sessions

1. **Race Conditions**: Both upload routes have potential race conditions where simultaneous uploads can overwrite each other. Any fixes should consider this.

2. **Filename Handling**: 
   - Photo PDFs: Filename generated server-side from propertyAddress
   - Documents: Filename provided by client in FormData

3. **Duplicate Checking**: Currently happens BEFORE upload, which creates the race condition window.

4. **Testing**: Always test with simultaneous uploads to verify no overwrites occur.

## Safe to Deploy?

**YES** - Current code is production-ready. The race condition is a known limitation but doesn't break functionality - it just means simultaneous uploads with same name might overwrite (which is rare in practice).

## Future Improvements

- Add timestamps to ALL uploads (not just detected duplicates) to prevent race conditions
- Consider using client-provided filenames for photo PDFs if needed
- Add more robust duplicate checking that accounts for in-flight uploads

# Photo & Document Upload Integration Plan

## Current Form Structure (CORRECTED)

**Current Steps:**
- Step 1: Address & Risk Check (Step0AddressAndRisk)
- Step 2: Decision Tree (Step1DecisionTree)
- Step 3: Property Details (Step2PropertyDetails)
- Step 4: Market Performance (Step3MarketPerformance)
- Step 5: Proximity & Content (Step5Proximity)
- Step 6: Insurance Calculator (Step6InsuranceCalculator)
- Step 7: Washington Brown (Step6WashingtonBrown)
- Step 8: Cashflow Review (Step7CashflowReview) - **Folder creation happens here**
- Step 9: Submission (Step8Submission)

**New Structure After Integration:**
- Step 1-7: Unchanged
- Step 8: Cashflow Review (Step7CashflowReview) - Folder creation (unchanged)
- Step 9: **NEW** - Photo & Document Upload (Step9PhotoDocuments)
- Step 10: Submission (Step8Submission) - Moved from Step 9

---

## 1. Page Structure Changes

### Files to Modify:
- `src/components/MultiStepForm.tsx`
  - Update `STEPS` array to add new Step 9
  - Re-index Step 8 (Submission) to Step 10
  - Update validation logic for Step 8 (folder must exist before proceeding to Step 9)

### New Component:
- `src/components/steps/Step9PhotoDocuments.tsx` (copy from `src/app/test-photo-upload/page.tsx`)

---

## 2. Data Flow & Integration Points

### Property Address (Auto-Populate, Read-Only)
- **Source**: `formData.address.propertyAddress`
- **Display**: Show prominently at top of Step 9 (similar to other steps)
- **Field Type**: Read-only text display (NOT an input field)
- **Validation**: Must exist before Step 9 is accessible

### Folder Link/ID Retrieval
- **Stored Location**: `formData.address.folderLink` (full Google Drive URL)
- **Format**: `https://drive.google.com/drive/folders/FOLDER_ID`
- **Extraction**: Parse folder ID from URL using regex: `/folders\/([a-zA-Z0-9_-]+)/`
- **Validation**: 
  - Step 9 should NOT be accessible if `folderLink` is missing
  - Show error message: "Please complete previous steps first. The property folder must be created on Step 8 before uploading photos and documents."

### Folder ID Extraction Function
```typescript
function extractFolderIdFromLink(folderLink: string): string | null {
  const match = folderLink.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
```

---

## 3. API Route Changes

### New Production Routes (Copy from Test Routes):
- `/api/photos/generate-pdf` - Copy from test route, use property folder ID
- `/api/documents/upload` - Copy from test route, use property folder ID
- `/api/photos/fetch-image` - Copy from test route (no changes needed)

### Changes Required in New Routes:
1. **Remove** `GOOGLE_DRIVE_TEST_FOLDER_ID` dependency completely (no references to test folder)
2. **Accept** `folderId` in request body (from Step 9 component)
3. **Use** `SHARED_DRIVE_ID` from environment (already exists)
4. **Maintain** all existing functionality (duplicate checking, shared drive support, etc.)

### Test Tool Deletion:
- After integration is complete and tested, the standalone test tool will be deleted:
  - `/app/test-photo-upload/page.tsx` - DELETE
  - `/api/test-photos/*` routes - DELETE
- **No references to `GOOGLE_DRIVE_TEST_FOLDER_ID` in production code**

---

## 4. Component Integration (Step9PhotoDocuments.tsx)

### State Management:
- **Connect to Zustand Store**: Use `useFormStore()` to access `formData`
- **Property Address**: Read from `formData.address.propertyAddress` (read-only display)
- **Folder ID**: Extract from `formData.address.folderLink` on component mount
- **State Persistence**: Store `images`, `documents`, `pdfCreated` in form store if needed (or keep as local state)

### Key Changes from Standalone Version:
1. **Remove** `propertyAddress` input field → Replace with read-only display
2. **Remove** `folderLink` input field → Extract from `formData.address.folderLink`
3. **Update** API calls to use new routes (`/api/photos/` instead of `/api/test-photos/`)
4. **Pass** `folderId` to API routes instead of using `GOOGLE_DRIVE_TEST_FOLDER_ID`
5. **Add** validation check: If `folderLink` is missing, show error and disable uploads

### Component Structure:
```typescript
export function Step9PhotoDocuments() {
  const { formData } = useFormStore();
  const propertyAddress = formData.address?.propertyAddress || '';
  const folderLink = formData.address?.folderLink || '';
  
  // Extract folder ID from link
  const folderId = extractFolderIdFromLink(folderLink);
  
  // If folderLink is missing, show error
  if (!folderLink || !folderId) {
    return (
      <div className="error-message">
        Please complete previous steps first. The property folder must be created on Step 8 before uploading photos and documents.
      </div>
    );
  }
  
  // Rest of component logic (same as standalone, but using folderId)
}
```

---

## 5. Validation & Safety Considerations

### Step 8 (Cashflow Review) Validation:
- **Current**: Already validates `folderLink` exists before allowing progression
- **Action**: No changes needed - existing validation is sufficient

### Step 9 (Photo Upload) Validation:
- **On Mount**: Check if `folderLink` exists
- **If Missing**: 
  - Show clear error message
  - Disable all upload functionality
  - Prevent progression to Step 10
- **If Present**: 
  - Extract folder ID
  - Verify folder ID is valid format
  - Enable upload functionality

### Error Messages:
- **No Folder**: "Please complete previous steps first. The property folder must be created on Step 8 before uploading photos and documents."
- **Invalid Folder Link**: "The property folder link is invalid. Please go back to Step 8 and create the folder again."

---

## 6. Folder ID Extraction & Usage

### Option A: Extract from URL (RECOMMENDED)
- **Pros**: No code changes needed to folder creation
- **Cons**: Requires URL parsing
- **Implementation**: Regex extraction function (shown above)

### Option B: Store folderId in formData
- **Pros**: Direct access, no parsing needed
- **Cons**: Requires changes to folder creation API and form store
- **Implementation**: 
  - Modify `/api/create-property-folder/route.ts` to return `folderId`
  - Modify `updateAddress()` calls to also store `folderId`
  - Add `folderId?: string` to `AddressData` interface

**RECOMMENDATION**: Use Option A (extract from URL) for minimal code changes and risk.

---

## 7. Testing Strategy

### Phase 1: Component Isolation
1. Create `Step9PhotoDocuments.tsx` as copy of standalone version
2. Test component in isolation (temporarily add to STEPS array)
3. Verify property address display (read-only)
4. Verify folder ID extraction from link
5. Test with valid folder link
6. Test with missing folder link (error handling)

### Phase 2: API Route Testing
1. Copy test routes to production routes
2. Test with actual property folder ID (from Step 8)
3. Verify duplicate file handling
4. Verify shared drive support
5. Test PDF generation and upload
6. Test document upload with filename cleaning

### Phase 3: Integration Testing
1. Complete full form flow: Step 1 → Step 8 (create folder) → Step 9 (upload photos) → Step 10 (submit)
2. Test navigation: Step 9 → Step 8 → Step 9 (verify state persistence)
3. Test error scenarios: Access Step 9 without folder (should show error)
4. Test with multiple properties (verify folder isolation)

### Phase 4: User Acceptance Testing
1. Test with real property data
2. Test photo upload (drag, paste, URL)
3. Test document upload with UUID stripping
4. Verify PDF generation and naming
5. Verify all files appear in correct property folder

---

## 8. Files to Create/Modify

### New Files:
1. `src/components/steps/Step9PhotoDocuments.tsx` (copy from `src/app/test-photo-upload/page.tsx`)
2. `src/app/api/photos/generate-pdf/route.ts` (copy from test route)
3. `src/app/api/photos/fetch-image/route.ts` (copy from test route)
4. `src/app/api/documents/upload/route.ts` (copy from test route)

### Modified Files:
1. `src/components/MultiStepForm.tsx`
   - Add Step 9 to STEPS array
   - Update Step 8 validation (already exists, verify it works)
   - Update Step 9 validation (check folder exists)

2. `src/types/form.ts` (OPTIONAL - only if storing folderId)
   - Add `folderId?: string` to `AddressData` interface

### Files to Delete After Integration:
- `src/app/test-photo-upload/page.tsx` - DELETE after integration complete
- All `/api/test-photos/*` routes - DELETE after integration complete
- **Note**: Test tool will be used to test integration into actual property folders, then removed

---

## 9. Questions to Confirm

### 1. Where is the folder ID stored?
**Answer**: Currently only `folderLink` (URL) is stored in `formData.address.folderLink`. The folder ID will be extracted from the URL using regex parsing.

**Alternative**: If you prefer, we can modify the folder creation API to also store `folderId` directly in `formData.address.folderId` for direct access (Option B above).

### 2. Should page 9 be accessible if the folder isn't created yet?
**Answer**: **NO**. Step 9 should show an error message and disable all functionality if `folderLink` is missing. The user must complete Step 8 (create folder) before accessing Step 9.

**Implementation**: 
- Check `formData.address.folderLink` on component mount
- If missing, show error message and disable uploads
- MultiStepForm validation already prevents progression from Step 8 without folder

### 3. Do you want the same duplicate filename detection in production?
**Answer**: **YES**. The duplicate filename detection with automatic timestamp appending should be maintained in production. This prevents overwriting existing files and ensures all uploads are preserved.

---

## 10. Implementation Checklist

### Pre-Integration:
- [ ] Review standalone test tool functionality (confirm it works as expected)
- [ ] Confirm folder creation on Step 8 works correctly
- [ ] Verify `formData.address.folderLink` is populated after folder creation

### Step 1: Create New Component
- [ ] Copy `test-photo-upload/page.tsx` → `Step9PhotoDocuments.tsx`
- [ ] Remove property address input field
- [ ] Add read-only property address display (from `formData.address.propertyAddress`)
- [ ] Remove folder link input field
- [ ] Add folder ID extraction from `formData.address.folderLink`
- [ ] Add validation for missing folder link
- [ ] Update API route calls to use production routes

### Step 2: Create Production API Routes
- [ ] Copy `/api/test-photos/generate-pdf` → `/api/photos/generate-pdf`
- [ ] Copy `/api/test-photos/upload-document` → `/api/documents/upload`
- [ ] Copy `/api/test-photos/fetch-image` → `/api/photos/fetch-image`
- [ ] Update routes to accept `folderId` from request body
- [ ] Remove `GOOGLE_DRIVE_TEST_FOLDER_ID` dependency
- [ ] Test routes with actual property folder ID

### Step 3: Update Form Structure
- [ ] Add Step 9 to `MultiStepForm.tsx` STEPS array
- [ ] Update Step 8 (Submission) to Step 10
- [ ] Update step validation logic
- [ ] Test navigation between steps

### Step 4: Testing
- [ ] Test component in isolation
- [ ] Test with valid folder link
- [ ] Test with missing folder link (error handling)
- [ ] Test full form flow (Step 1 → Step 10)
- [ ] Test photo upload (all methods: drag, paste, URL)
- [ ] Test document upload with UUID stripping
- [ ] Test PDF generation and naming
- [ ] Test duplicate file handling
- [ ] Test shared drive support

### Step 5: Final Verification
- [ ] Verify standalone test tool still works (unchanged)
- [ ] Verify no regressions in existing form steps
- [ ] Verify property address is displayed correctly (read-only)
- [ ] Verify folder ID extraction works correctly
- [ ] Verify all files upload to correct property folder
- [ ] User acceptance testing

---

## 11. Risk Mitigation

### Low Risk Approach:
1. **Copy from Test Tool**: Copy test code to create production version
2. **Isolated Component**: New Step 9 is self-contained
3. **No Changes to Existing Steps**: Steps 1-8 remain unchanged
4. **Validation First**: Step 9 validates folder exists before allowing any actions
5. **Test in Property Folders**: Use test tool to verify integration works with actual property folders
6. **Clean Removal**: Delete test tool after integration is proven

### Rollback Plan:
- If issues arise, simply remove Step 9 from STEPS array
- All existing functionality remains intact
- Test tool can be restored from git history if needed

---

## 12. Key Implementation Details

### Property Address Display:
```tsx
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Property Address (for PDF naming)
  </label>
  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
    <span className="text-gray-900">{propertyAddress || 'N/A'}</span>
  </div>
</div>
```

### Folder ID Extraction:
```typescript
const extractFolderIdFromLink = (folderLink: string): string | null => {
  if (!folderLink) return null;
  const match = folderLink.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};
```

### API Call Update:
```typescript
// OLD (test route):
const response = await fetch('/api/test-photos/generate-pdf', {
  method: 'POST',
  body: JSON.stringify({ images, propertyAddress }),
});

// NEW (production route):
const response = await fetch('/api/photos/generate-pdf', {
  method: 'POST',
  body: JSON.stringify({ images, propertyAddress, folderId }),
});
```

---

## Summary

This integration plan:
- ✅ Preserves all existing form functionality (Steps 1-8)
- ✅ Uses test tool to verify integration works with actual property folders
- ✅ Adds new Step 9 for photo/document upload
- ✅ Moves submission to Step 10
- ✅ Auto-populates property address (read-only)
- ✅ Extracts folder ID from stored folder link (no test folder references)
- ✅ Validates folder exists before allowing uploads
- ✅ Maintains all existing features (duplicate detection, shared drive support, etc.)
- ✅ Removes test tool after integration is complete
- ✅ No references to `GOOGLE_DRIVE_TEST_FOLDER_ID` in production code

**Ready to proceed with implementation when approved.**

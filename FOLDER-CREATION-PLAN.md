# Folder Creation Implementation Plan - Fit for Purpose

## Answers to Questions

### 1. Parent Folder & Access Model

**How it works:**
- ✅ Service account creates folder (not packager's login)
- ✅ Folder owned by service account
- ✅ Packager gets "Viewer" access (can download, cannot edit)
- ✅ Can share folder with others (viewer/editor permissions)
- ✅ Can move folder to different parent later (via API)

**Decision:** Create in root of service account Drive (simplest)
- Can organize later if needed
- Can create parent folder structure later
- For now: Keep it simple

### 2. Folder Naming & Uniqueness Check

**Format:** `{propertyAddress}` (e.g., "123 Hedge Road Somewhere ACT")
- ✅ Must be unique in GHL (check before submission)
- ⚠️ If duplicate found, append date: `{propertyAddress} - {date}`
- ⚠️ Date format: `YYYY-MM-DD` (e.g., "123 Hedge Road - 2026-01-07")

**GHL Uniqueness Check:**
- Before final submission, check GHL custom object for existing `property_address`
- If exists: Append date to folder name
- Store in form: `folderName` field

### 3. Folder Link Display

**Location:** Top header (persistent, discreet)
- Show below property address & packager email
- Only visible after folder created (Step 0, after "Continue with Packaging")
- Small, unobtrusive: "📁 Folder: [link]"
- Copy link button for easy sharing

**Why not sidebar:** No sidebar in current design, header is simpler

### 4. Initial Files (Template Folder Approach)

**Template Folder Strategy:**
- Create master template folder with:
  - Cashflow spreadsheet template (Excel)
  - Empty subfolders: "CMI Reports", "Photos", etc.
- When property folder created: Copy template folder contents
- Packager downloads and edits their own copies

**Files in Template:**
- `Cashflow Spreadsheet Template.xlsx` (or appropriate version based on property type)
- Empty folders: `CMI Reports/`, `Photos/`, `Location Reports/`

**Other Files:** Packager uploads manually (CMI reports, photos, etc.)

---

## Implementation Plan

### Phase 1: Folder Creation (Fit for Purpose)

**Step 1: Create Google Drive Utility**
- File: `src/lib/googleDrive.ts`
- Functions:
  - `createPropertyFolder(address: string, parentFolderId?: string)`
  - `copyTemplateFolderToPropertyFolder(templateFolderId: string, propertyFolderId: string)`
  - `setFolderPermissions(folderId: string, role: 'reader' | 'writer')`

**Step 2: Create API Route**
- File: `src/app/api/create-property-folder/route.ts`
- Input: `{ propertyAddress: string }`
- Output: `{ folderId: string, folderLink: string, folderName: string }`
- Logic:
  1. Create folder with property address as name
  2. Copy template folder contents
  3. Set permissions to "Viewer" (reader)
  4. Return folder link

**Step 3: Update Form Store**
- Add `folderLink?: string` to FormData
- Add `folderName?: string` to FormData

**Step 4: Update Step 0 Component**
- Call API when "Continue with Packaging" clicked
- Store folder link in form data
- Show folder link below address/packager (discreet)

**Step 5: Folder Link Display Component**
- Create `FolderLinkDisplay.tsx` (persistent header component)
- Show on all pages after folder created
- Small, unobtrusive: "📁 Folder: [link]" with copy button

### Phase 2: GHL Uniqueness Check (Before Submission)

**Step 6: GHL Address Check API**
- File: `src/app/api/ghl/check-address/route.ts`
- Check if `property_address` exists in GHL custom object
- Return: `{ exists: boolean, existingRecords?: [...] }`

**Step 7: Update Folder Creation**
- Before creating folder, check GHL
- If address exists: Append date to folder name
- Store both `propertyAddress` and `folderName` in form

### Phase 3: Final Review Step (Before Submission)

**Step 8: Create Review Step**
- New step: "Step 6: Documents Review" (before final submission)
- Checklist:
  - ✅ Folder created
  - ✅ Cashflow spreadsheet in folder
  - ✅ CMI Reports uploaded
  - ✅ Photos uploaded
  - ✅ Location Report uploaded
- Links to folder for easy access
- Cannot submit until all checked (or marked as "Not applicable")

**Step 9: Separate Link Fields**
- Market Performance: Reusable link (can be same for multiple properties)
- Other attachments: Property-specific (folder link)
- Add fields:
  - `marketPerformanceLink?: string` (optional, reusable)
  - `folderLink?: string` (required, property-specific)

---

## File Structure

```
src/
├── lib/
│   ├── googleDrive.ts          # NEW: Drive API utilities
│   └── googleSheets.ts          # Existing
├── components/
│   ├── FolderLinkDisplay.tsx    # NEW: Persistent folder link
│   └── steps/
│       ├── Step0AddressAndRisk.tsx  # UPDATE: Create folder
│       └── Step6DocumentsReview.tsx # NEW: Final review step
├── app/
│   └── api/
│       ├── create-property-folder/
│       │   └── route.ts        # NEW: Folder creation API
│       └── ghl/
│           └── check-address/
│               └── route.ts    # NEW: Address uniqueness check
└── types/
    └── form.ts                 # UPDATE: Add folder fields
```

---

## Environment Variables Needed

```env
# Already exists:
GOOGLE_SHEETS_CREDENTIALS='...'

# New (optional - for template folder):
GOOGLE_DRIVE_TEMPLATE_FOLDER_ID='folder_id_here'
GOOGLE_DRIVE_PARENT_FOLDER_ID='folder_id_here'  # Optional, defaults to root
```

---

## Permissions Model

**Folder Permissions:**
- **Owner:** Service account (full control)
- **Viewers:** Anyone with link (can view/download, cannot edit)
- **Packager:** Gets viewer access (can download, cannot edit folder structure)

**Why Viewer Only:**
- Forces download-and-edit workflow
- Prevents accidental edits to templates
- Each packager works on their own downloaded copy

---

## Template Folder Setup (Manual)

**Create once in Google Drive:**
1. Create folder: "Property Packaging Templates"
2. Add subfolder: "Cashflow Templates"
3. Upload: `CF spreadsheet template v3.0 Dev.xlsx`
4. Upload: `CF HL spreadsheet template v2.0.xlsx`
5. Create empty folders: "CMI Reports", "Photos", "Location Reports"
6. Get folder ID from URL
7. Add to `.env.local`: `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID='...'`

---

## Next Steps (Priority Order)

1. ✅ **Create `googleDrive.ts`** - Basic folder creation
2. ✅ **Create API route** - `/api/create-property-folder`
3. ✅ **Update Step 0** - Call API, store link
4. ✅ **Create FolderLinkDisplay** - Show link persistently
5. ⏭️ **GHL uniqueness check** - Before folder creation
6. ⏭️ **Template folder copy** - Copy files on creation
7. ⏭️ **Documents Review step** - Final checklist before submission

---

## Questions to Resolve

1. **Template Folder:** Do you have a template folder set up, or should we create one?
2. **Cashflow Template Selection:** How do we choose which template (H&L vs General)?
   - Based on contract type from decision tree?
3. **Documents Review:** What are the required documents?
   - Cashflow spreadsheet (required)
   - CMI Reports (required?)
   - Photos (required?)
   - Location Report (required?)
4. **GHL API:** Do you have GHL API credentials yet, or should we mock this for now?

---

## Fit for Purpose Approach

- ✅ Basic folder creation (no fancy features)
- ✅ Simple permissions (viewer only)
- ✅ Template copy (basic file copy)
- ✅ Link display (simple, functional)
- ⚠️ Polish later if needed
- ⚠️ Can enhance after testing



# Folder Creation Options - Comparison Analysis

## Research Findings

### GHL (GoHighLevel) File Management
**Finding:** GHL does NOT have native folder creation APIs
- GHL has Google Drive integration (syncs files/folders)
- GHL Media Storage can create folders via UI, but no API endpoints
- GHL custom fields support file uploads (contact profiles only, max 250MB)
- Folder management happens through Google Drive sync, not direct API

**Conclusion:** Cannot use GHL API for folder creation. Must use Google Drive API or Dropbox API.

---

## Option Comparison

### Option 1: Google Drive API ✅ **RECOMMENDED**

**Pros:**
- ✅ Already integrated in project (Google Sheets API uses same credentials)
- ✅ Well-documented API with robust folder/file management
- ✅ Can set granular permissions (Viewer = download only)
- ✅ GHL already syncs with Google Drive (files appear in GHL Media Storage)
- ✅ Free tier: 15GB storage per account
- ✅ Easy to share links (view-only, download-only)
- ✅ Can create folders programmatically via API
- ✅ Can upload files programmatically
- ✅ Can set folder colors, descriptions, etc.

**Cons:**
- ⚠️ Requires Google Cloud service account setup (already done)
- ⚠️ Need to manage permissions/sharing

**API Capabilities:**
- Create folder: `POST /drive/v3/files` with `mimeType: 'application/vnd.google-apps.folder'`
- Set permissions: `POST /drive/v3/files/{fileId}/permissions` with `role: 'reader'` (viewer/download only)
- Get shareable link: `GET /drive/v3/files/{fileId}?fields=webViewLink`
- Upload files: `POST /drive/v3/files` with `multipart/related`

**Implementation:**
- Use existing `googleapis` package (already installed)
- Use same service account credentials as Google Sheets
- Add Drive scope: `https://www.googleapis.com/auth/drive`

---

### Option 2: Dropbox API

**Pros:**
- ✅ Good API documentation
- ✅ Can create folders programmatically
- ✅ Can set permissions (view-only links)
- ✅ Free tier: 2GB storage

**Cons:**
- ❌ Not integrated with GHL (no sync)
- ❌ Requires separate API setup/credentials
- ❌ Less storage than Google Drive
- ❌ Would need to add Dropbox SDK dependency
- ❌ No existing integration in project

**API Capabilities:**
- Create folder: `POST /2/files/create_folder_v2`
- Create shareable link: `POST /2/sharing/create_shared_link_with_settings`
- Upload files: `POST /2/files/upload`

---

### Option 3: GHL Media Storage (via UI sync)

**Pros:**
- ✅ Files appear in GHL Media Storage automatically
- ✅ No API needed (if using Google Drive sync)

**Cons:**
- ❌ No programmatic folder creation
- ❌ Requires manual Google Drive connection in GHL UI
- ❌ Folders created via API won't automatically sync (need to be in connected Drive)
- ❌ Less control over permissions

---

## Recommendation: **Google Drive API**

### Why Google Drive API?
1. **Already Set Up:** Project already uses Google APIs (Sheets)
2. **Same Credentials:** Can reuse service account
3. **GHL Integration:** GHL syncs with Google Drive automatically
4. **Full Control:** Programmatic folder creation, permissions, file uploads
5. **Better Storage:** 15GB vs 2GB (Dropbox)

### Implementation Plan

**Step 1: Add Google Drive API Client**
- Extend existing `googleSheets.ts` pattern
- Create `googleDrive.ts` utility
- Add Drive scope to auth

**Step 2: Create API Route**
- `/api/create-property-folder`
- Creates folder with property address as name
- Sets permissions to "Viewer" (download only)
- Returns folder ID and shareable link

**Step 3: Update Form**
- Call API when "Continue with Packaging" clicked
- Store folder link in form data
- Display folder link on all pages (persistent component)

**Step 4: GHL Integration**
- Store folder link in GHL custom object field
- Send via webhook on form submission

---

## Folder Structure Example

```
Property Folders (Parent Folder)
├── 123 Hedge Road Somewhere ACT
│   ├── Cashflow Spreadsheet.xlsx (download only)
│   ├── CMI Reports/
│   │   ├── RP Data Rental.pdf
│   │   └── RP Data Sales.pdf
│   ├── Photos.pdf
│   └── Location Report.pdf
```

---

## Permissions Model

**Folder Permissions:**
- **Owner:** Service account (full control)
- **Viewers:** Anyone with link (can view/download, cannot edit)
- **Packagers:** Can upload files (if needed later)

**File Permissions:**
- Inherit from folder (view/download only)
- Prevents accidental edits
- Forces users to download and work on their own copies

---

## Next Steps

1. ✅ Research complete - Google Drive API recommended
2. ⏭️ Create `googleDrive.ts` utility file
3. ⏭️ Create `/api/create-property-folder` route
4. ⏭️ Update `Step0AddressAndRisk.tsx` to call API
5. ⏭️ Add folder link display component (persistent across pages)
6. ⏭️ Store folder link in form data
7. ⏭️ Test folder creation and permissions

---

## Questions to Resolve

1. **Parent Folder:** Where should property folders be created?
   - Root of service account Drive?
   - Specific parent folder ID?
   - Need to create "Property Folders" parent first?

2. **Folder Naming:** What format?
   - `{propertyAddress}` (e.g., "123 Hedge Road Somewhere ACT")
   - `{propertyAddress} - {date}` (e.g., "123 Hedge Road - 2026-01-07")
   - `{sourcer} - {propertyAddress}` (e.g., "John Doe - 123 Hedge Road")

3. **Initial Files:** Should we upload cashflow template automatically?
   - Yes: Upload Excel template when folder created
   - No: Packager uploads manually later

4. **Folder Link Display:** Where exactly?
   - Top of every page (persistent header)?
   - Sidebar component?
   - Step 0 only (after creation)?



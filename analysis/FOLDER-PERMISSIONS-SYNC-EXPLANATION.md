# Folder Permissions Sync Utility - Explanation

**Date:** 2026-01-26

---

## ❓ **Is It Automated?**

**NO** - The folder permissions sync utility is **NOT automated**. It's a **manual utility** that you can call when needed.

---

## 📁 **What Folder Does It Apply To?**

The utility applies to **any folder ID you pass to it**. Specifically:

### Primary Use Case: Property Folders
- **Property folders** created for each property (created in Step 0)
- These folders are stored in `formData.address.folderLink`
- Folder ID can be extracted from the folder link

### How to Get Folder ID:
1. From folder link: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
2. From form data: `formData.address.folderLink` contains the full link
3. Extract the folder ID from the URL

---

## 🔧 **How to Use It**

### Option 1: Manual API Call (Postman/Browser Console)

**Endpoint:** `POST /api/google-drive/sync-folder-permissions`

**Request Body:**
```json
{
  "folderId": "your_folder_id_here",
  "role": "reader",  // optional, defaults to "reader"
  "driveId": "your_drive_id_here"  // optional, only if using Shared Drive
}
```

**Response:**
```json
{
  "success": true,
  "filesProcessed": 5,
  "filesUpdated": 5,
  "errors": []
}
```

### Option 2: Add to Form (Future Enhancement)

We could add a button in the form to sync permissions:
- Location: Step 6 (Folder Creation) or Step 8 (Submission)
- Button: "Sync Folder Permissions"
- Calls the API endpoint automatically

---

## 🎯 **When to Use It**

1. **After manually adding files to a property folder**
   - Someone manually uploads a file to the folder
   - File might not have "anyone with link can view" permissions
   - Call sync utility to fix permissions

2. **Bulk fix for existing folders**
   - If you have multiple folders with permission issues
   - Can call the utility for each folder

3. **After folder creation** (if we automate it)
   - Could automatically sync permissions after folder creation
   - Ensures all files have correct permissions from the start

---

## 🔄 **Current Behavior**

### Files Added via Form:
- ✅ **Automatically get permissions** - "anyone with link can view"
- ✅ No manual action needed
- ✅ Happens automatically in `organize-pdf/route.ts`

### Files Added Manually:
- ⚠️ **May not have correct permissions** - depends on folder settings
- ⚠️ **Manual sync needed** - call the utility to fix
- ✅ Utility available to fix permissions

---

## 💡 **Future Enhancement Options**

1. **Automate after folder creation:**
   - Call `syncFolderPermissions()` automatically after creating property folder
   - Ensures all files (even manually-added ones) have correct permissions

2. **Add UI button:**
   - Add "Sync Permissions" button in Step 6 or Step 8
   - User can click to sync permissions for the current property folder

3. **Scheduled sync:**
   - Run periodically to fix permissions on all property folders
   - Could be a cron job or scheduled task

---

## 📝 **Example Usage**

### Extract Folder ID from Link:
```javascript
// If folderLink is: "https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j"
// Extract folder ID: "1a2b3c4d5e6f7g8h9i0j"

const folderLink = formData.address.folderLink;
const folderId = folderLink.split('/folders/')[1]?.split('?')[0];
```

### Call Sync API:
```javascript
const response = await fetch('/api/google-drive/sync-folder-permissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    folderId: folderId,
    role: 'reader',
  }),
});

const result = await response.json();
console.log('Files processed:', result.filesProcessed);
console.log('Files updated:', result.filesUpdated);
```

---

**Status:** ✅ Utility created and ready to use (manual)

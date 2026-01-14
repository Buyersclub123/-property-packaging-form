# Folder Name Logic - Important Note

## Current Behavior (After Fix)
- **Folder name ALWAYS uses `propertyAddress` from Step 1**
- This applies to both single properties and projects
- `projectAddress` is NOT used for folder names

## What Was Broken
- Previously, the code was checking for `projectAddress` first for projects
- This caused folder names to use project address instead of property address
- Fixed by removing the project address check and always using `propertyAddress`

## Important Context
- `property_address` and `project_address` are SEPARATE fields in GHL
- `property_address` = actual property address (used for folder names, individual lots)
- `project_address` = separate field for project address (stored in GHL but NOT used for folder names)
- These fields do NOT overwrite each other - they are independent

## DO NOT CHANGE
- Do NOT add logic to use `projectAddress` for folder names
- Do NOT assume project address should be used for projects
- Folder name should ALWAYS be `propertyAddress` from Step 1

## Location
- File: `src/components/steps/Step6FolderCreation.tsx`
- Function: `getFolderName()`
- Current implementation: Always returns `address?.propertyAddress || ''`

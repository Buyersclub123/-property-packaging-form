# Deployment Status

**Date:** 2026-01-26  
**Commit:** `94dd95b` - Fix: PDF link property name mismatch

---

## ✅ **Changes Committed & Pushed**

**Files Modified:**
1. `src/components/steps/step5/InvestmentHighlightsField.tsx`
   - Fixed property names: `pdfLink` → `pdfDriveLink`, `fileId` → `pdfFileId`
   - Added detailed logging for debugging

2. `src/components/steps/Step6FolderCreation.tsx`
   - Added logging for suburb addition process
   - Shows what data is being sent and received

3. `src/app/api/investment-highlights/add-suburb/route.ts`
   - Added logging for matching process
   - Shows row-by-row matching attempts

**Commit Message:**
```
Fix: PDF link property name mismatch - use pdfDriveLink/pdfFileId instead of pdfLink/fileId. Add logging for suburb addition debugging.
```

**Git Status:**
- ✅ Committed to local repository
- ✅ Pushed to `origin/main`
- ✅ Branch: `main`
- ✅ Commit hash: `94dd95b`

---

## 🚀 **Deployment**

**Platform:** Vercel (based on handover documentation)

**Auto-Deployment:**
- Vercel typically auto-deploys on push to `main` branch
- Deployment usually takes 2-5 minutes
- Check Vercel dashboard for deployment status

**Local Dev Server:**
- Dev server should be running on `http://localhost:3000`
- If not running, start with: `npm run dev`

---

## ✅ **Ready for Testing**

**Status:** 🟢 **READY**

**What to Test:**
1. Select report from dropdown on Step 5
2. Check browser console for PDF link/fileId logs
3. Submit form
4. Verify PDF shortcut appears in folder
5. Verify suburb is added to column A in sheet
6. Check console logs for suburb addition process

**Console Logs to Watch:**
- `[InvestmentHighlights] Dropdown report object:` - Shows dropdown data
- `[InvestmentHighlights] Lookup result data:` - Shows lookup API response
- `[InvestmentHighlights] PDF link and report info stored:` - Shows final stored values
- `[Step6] Adding suburb to Investment Highlights report:` - Shows suburb addition attempt
- `[add-suburb] Matching request:` - Shows API matching process
- `[add-suburb] Checking row X:` - Shows row-by-row matching

---

**Last Updated:** 2026-01-26

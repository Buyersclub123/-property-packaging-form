# Project Status - Consolidated View

**Last Updated:** January 22, 2026  
**Context:** After 30-hour MVP push, consolidating all TODOs and recent work

---

## 📊 RECENT WORK (Last 2-3 Days)

### ✅ COMPLETED

#### 1. API Protection System (Jan 21-22)
**Status:** ✅ Complete - Not Deployed  
**Files:**
- `src/lib/rateLimit.ts` - Rate limiting logic
- `src/lib/requestLogger.ts` - Request logging with rotation
- `src/lib/emailAlerts.ts` - Email alerts via Gmail SMTP
- `src/app/api/geoapify/proximity/route.ts` - Integrated protection
- `API-PROTECTION-SYSTEM.md` - Full documentation
- `PROTECTION-SYSTEM-SUMMARY.md` - Quick reference

**Features:**
- Rate limiting: 20 req/hour per IP, 10 req/5min burst, 100 req/day global
- Request logging with 7-day retention
- Email alerts: Rate limit, burst activity, daily cost ($5 threshold)
- Daily summary emails (6 PM AEST)
- CORS protection

**Root Cause:** Google Distance Matrix API cost spike ($104.90 on Jan 20)

---

#### 2. Form Validation Fix - Step 5 Fields (Jan 22)
**Status:** ✅ Complete - In Dev, Not Deployed  
**Files:**
- `src/components/steps/step5/WhyThisPropertyField.tsx`
- `src/components/steps/step5/InvestmentHighlightsField.tsx`

**Issue Fixed:** Removed `internalValue` state pattern that caused race condition where AI/API-populated data wouldn't display in textarea until user manually added a space.

**Root Cause:** Internal state (`internalValue`) not syncing with parent `value` prop due to conditional `useEffect`.

---

#### 3. Insurance Calculator Step (Jan 22)
**Status:** ✅ Complete - In Dev, Not Deployed  
**Files:**
- `src/components/steps/Step6InsuranceCalculator.tsx` (NEW)
- `src/types/form.ts` - Added `insurance` field
- `src/components/MultiStepForm.tsx` - Inserted step, renumbered all subsequent
- `src/components/steps/Step7CashflowReview.tsx` - Pre-populates insurance
- `INSURANCE-CALCULATOR-IMPLEMENTATION.md` - Full documentation

**Changes:**
- **NEW Step 6:** Insurance Calculator (before Washington Brown)
- **Step renumbering:** All subsequent steps shifted by 1
  - Washington Brown: Step 6 → Step 7
  - Cashflow Review: Step 7 → Step 8
  - Submission: Step 8 → Step 9
- **Terri Scheer:** Opens in new tab (iframe blocked by X-Frame-Options)
- **Insurance field:** Read-only on Step 8 (entered on Step 6)
- **Property summary:** Matches Washington Brown format (Address, Total Cost, Year Built, Land Registration)

---

### 🐛 KNOWN ISSUES (Not Yet Fixed)

#### Issue #1: Step 5 Fields Clear on Initial Load
**Priority:** P1 (High)  
**Status:** Not Fixed  
**Description:**
- When Step 5 loads, Investment Highlights & Why This Property clear if Proximity loads last
- Data is in form store, but display doesn't sync on first render
- Going back/forward fixes it (fresh component mount)

**Root Cause:** `useEffect` race conditions in all three Step 5 field components when they mount simultaneously.

**Files Affected:**
- `src/components/steps/step5/WhyThisPropertyField.tsx`
- `src/components/steps/step5/InvestmentHighlightsField.tsx`
- `src/components/steps/step5/ProximityField.tsx`

---

#### Issue #2: Hotspotting PDF Not Added to Property Folder
**Priority:** P1 (High)  
**Status:** Not Fixed  
**Description:** When property folder is created, the Hotspotting report PDF link/shortcut is not being added to the folder.

**Action Needed:** Add Google Drive shortcut to Hotspotting PDF in newly created property folder.

---

#### Issue #3: Proximity API Timeout/Error
**Priority:** P2 (Medium)  
**Status:** Acceptable (has fallback)  
**Description:** Proximity API shows error on Step 5, but pre-fetched data from Step 2 populates correctly.

**Current Behavior:** Error message displays, but field works due to pre-fetch backup.

**Possible Fix:** Hide error message if pre-fetched data exists.

---

### 📋 BACKLOG (On Shelf)

#### Enhancement #1: Investment Highlights Workflow
**Priority:** P1 (High)  
**Status:** Detailed plan exists, not implemented  
**Description:** Enhanced workflow with:
- Searchable dropdown of all reports (alphabetical, grouped by state)
- Date validation (out-of-date warnings)
- Drag & drop PDF upload
- Auto-suburb mapping
- File ID tracking
- Google Drive shortcuts in property folder

**Documentation:** Detailed plan discussed in chat, needs formal doc.

**New Google Sheet Column:** `Display Name` (Column P) - Added by user ✅

---

#### Enhancement #2: Attachments Note
**Priority:** P? (Unknown)  
**Status:** Needs clarification  
**Description:** User mentioned "ATTACHMENTS NOTE" - needs details.

**From FORM-CHANGES-TODO.md:**
- Add "Attachments Additional Dialogue" field to Step 6
- Maps to `formData.attachmentsAdditionalDialogue`

---

#### Enhancement #3: BA Note
**Priority:** P? (Unknown)  
**Status:** Needs clarification  
**Description:** User mentioned "BA NOTE" - needs details.

**Possible meanings:**
- Buyer's Agent note?
- Building Approval note?
- Something else?

---

## 📚 EXISTING TODO LISTS REVIEW

### From `TODO-LIST.md` (Main TODO)

#### Still Relevant:
1. ✅ **Phase 5 Complete** - 3-step flow (Washington Brown, Cashflow, Submission) - ✅ DONE (now 4 steps with Insurance)
2. ⚠️ **Market Performance Check Buttons** - Functionality disturbed (HIGH priority)
3. ⚠️ **Separate Market Performance Field Functionality** - Refactor to isolate fields (HIGH priority)
4. ⏳ **Test Page Syntax Error** - `/test-proximity` page has JSX error
5. ⏳ **Project Email Formatting** - Define visual format for multi-lot projects
6. ⏳ **Form Edit Access** - Edit existing records (not just create new)
7. ⏳ **Email Button Options** - "Edit Property" button in emails
8. ⏳ **New Deal Sheet** - View all properties with filtering
9. ⏳ **Deal Sheet → Client Selection** - Send properties to clients
10. ⏳ **Send Tracking & Logging** - Track who sent what to which clients
11. ⏳ **Portal Client Status Display** - Show "Sent" badge for already-sent properties
12. ⏳ **Mobile Responsive Email Template** - Bullet points overlap on mobile

#### Already Complete:
- ✅ Proximity Consolidation - Integrated in Phase 4A

---

### From `FORM-CHANGES-TODO.md`

#### Still Relevant:
1. ⏳ **Attachments Additional Dialogue Field** - Add to Step 6 (now Step 9 Submission)
2. ⏳ **Save Calculated totalPrice to Lot Data** - For multi-lot projects
3. ⏳ **Price Group Calculation** - Auto-generate price_group field
4. ⏳ **Remove CMI Reports Notice** - From Page 1
5. ⏳ **Fix Project Address Overwriting Property Address** - Route 2 Module 22

#### GHL Configuration (Not Code):
- ⏳ **Unit / Lot Field Name** - Rename in GHL (not code change)

---

### From `ROUTE-2-MODULE-22-MISSING-FIELDS-TODO.md`

**Status:** ✅ COMPLETE - All fields added to Module 22 code

#### Remaining:
- ⏳ **Test body_corp fields** - Needs testing
- ⏳ **Form Bug:** "Owner Corp (community)" dropdown doesn't show Body Corp fields
- ⏳ **Module 9 Change:** Remove parent record, create only children

---

### From `TODO-ADDRESS-VALIDATION.md`

**Status:** Deferred  
**Description:** Address validation with spelling correction suggestions

#### Features to Add Later:
- Geocoding validation before/after Stash check
- Address suggestion modal
- Geoscape API integration

**Current Behavior:** No validation, Stash called directly

---

## 🎯 RECOMMENDED PRIORITIES

### P0 (Critical - Blocking)
*None currently blocking*

### P1 (High - Important for UX)
1. **Fix Step 5 field clearing issue** - Data disappears on initial load
2. **Add Hotspotting PDF to property folder** - Missing functionality
3. **Fix Market Performance Check Buttons** - Functionality disturbed
4. **Separate Market Performance Field Functionality** - Prevent future breakage
5. **Investment Highlights enhanced workflow** - Major UX improvement

### P2 (Medium - Nice to Have)
1. **Hide Proximity error if pre-fetched data exists** - Better UX
2. **Attachments Additional Dialogue field** - Missing field
3. **Test Page Syntax Error** - Fix `/test-proximity` page
4. **Save totalPrice to Lot Data** - For multi-lot projects
5. **Price Group Calculation** - Auto-generate field

### P3 (Low - Future Enhancements)
1. **Form Edit Access** - Edit existing records
2. **Email Button Options** - "Edit Property" button
3. **New Deal Sheet** - View all properties
4. **Deal Sheet → Client Selection** - Send to clients
5. **Send Tracking & Logging** - Track sends
6. **Portal Client Status Display** - Show "Sent" badge
7. **Mobile Responsive Email Template** - Fix bullet overlap
8. **Address Validation** - Spelling correction suggestions

---

## 📦 DEPLOYMENT STATUS

### Ready to Deploy (Tested in Dev):
- ✅ API Protection System
- ✅ Form Validation Fix (Step 5)
- ✅ Insurance Calculator Step

### Not Ready (Needs Testing):
- ⚠️ Market Performance buttons (broken)

### Not Ready (Needs Implementation):
- ❌ Step 5 field clearing fix
- ❌ Hotspotting PDF to folder
- ❌ Investment Highlights workflow

---

## 🔄 NEXT STEPS

### Immediate (Next 1-2 hours):
1. Review and confirm priorities with user
2. Fix Step 5 field clearing issue (P1)
3. Test Insurance Calculator end-to-end
4. Deploy API Protection + Insurance Calculator to production

### Short Term (Next 1-2 days):
1. Fix Market Performance buttons (P1)
2. Add Hotspotting PDF to folder (P1)
3. Implement Investment Highlights workflow (P1)
4. Test all changes thoroughly

### Medium Term (Next week):
1. Attachments field
2. Multi-lot project improvements
3. Form edit access
4. Deal Sheet enhancements

---

## 📝 NOTES

- **30-hour MVP push:** Explains shortcuts in working process
- **Show & tell pressure:** Caused rapid issue discovery without full documentation
- **Need to return to structured approach:** TODO lists, documentation, testing
- **Current dev server:** Running on `localhost:3001` (port 3000 in use)

---

**Action Required:** Review priorities and confirm next steps with user.

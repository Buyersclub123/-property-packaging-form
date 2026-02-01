# Early Processing Workflow - Design Document

**Date:** January 22, 2026  
**Concept:** Pre-fetch all Step 5 data immediately after Step 1  
**Status:** Ready to implement

---

## The Problem (Current State)

**Current Flow:**
```
Step 1 (Address) → Step 2 → Step 3 → Step 4 → Step 5
                                              ↓
                                    START processing here
                                    (User waits 10-30 seconds)
```

**Issues:**
- User waits on Step 5
- PDF extraction fails (timing)
- Proximity/Why This Property/Investment Highlights all load slowly

---

## The Solution (New Flow)

**New Flow:**
```
Step 1 (Address) → Step 1A (Investment Highlights Check)
       ↓                    ↓
   Trigger:          Check for match
   - Proximity       - If match found → Prepare in background
   - Why This        - If no match → Show dropdown
   - Inv Highlights  - If not in dropdown → Upload PDF
                     ↓
              All processing starts NOW
                     ↓
Step 2 → Step 3 → Step 4 → Step 5 (Everything ready!)
```

---

## Step 1A: Investment Highlights Check (NEW PAGE)

### Trigger
**When:** User clicks "Next" on Step 1 (after entering address)

### Auto-Check
**System checks Google Sheet for suburb match:**

#### Branch A: Match Found & In-Date ✅
```
┌────────────────────────────────────────────┐
│ ✓ Investment Highlights Report Found!     │
│                                            │
│ Report: Fraser Coast                       │
│ Valid Period: October 2025 - January 2026 │
│ Status: Current                            │
│                                            │
│ I'm preparing this report for you.        │
│ You'll see it on Step 5.                  │
│                                            │
│ [Continue to Step 2 →]                    │
└────────────────────────────────────────────┘
```
**Action:** Start processing in background, continue to Step 2

---

#### Branch B: No Match - Show Dropdown 🔍
```
┌────────────────────────────────────────────┐
│ ⚠ No Investment Highlights match found    │
│   for Point Vernon, QLD                    │
│                                            │
│ Please review the list below to see if a  │
│ report exists in our repository:           │
│                                            │
│ [Search for a Hotspotting report...    🔍]│
│ ↓ QLD                                      │
│   Fraser Coast (Oct 2025 - Jan 2026)      │
│   Sunshine Coast (Oct 2025 - Jan 2026)    │
│ ↓ NSW                                      │
│   Inner West LGA (Sep - Dec 2025)         │
│                                            │
│ Not in the list? Upload PDF below ↓       │
└────────────────────────────────────────────┘
```

**Sub-Branch B1: User Selects from Dropdown**
```
✓ Report selected: Fraser Coast

I'm preparing this report for you.
You'll see it on Step 5.

[Continue to Step 2 →]
```
**Action:** Start processing in background, continue to Step 2

**Sub-Branch B2: User Uploads PDF**
```
┌────────────────────────────────────────────┐
│ Upload Hotspotting Report                  │
│                                            │
│ [Drag & drop PDF here or click to browse] │
│                                            │
│ ✓ Uploaded: Fraser Coast.pdf (2.4 MB)     │
│                                            │
│ I'm processing this report in the         │
│ background. You'll review the extracted   │
│ information on Step 5.                    │
│                                            │
│ [Continue to Step 2 →]                    │
└────────────────────────────────────────────┘
```
**Action:** 
- Upload to Google Drive
- Store `fileId`, `uploadTimestamp`
- Start extraction in background (will be ready by Step 5)
- Continue to Step 2

---

#### Branch C: Match Found but Out-of-Date ⚠️
```
┌────────────────────────────────────────────┐
│ ⚠ Investment Highlights Report Found      │
│   (Out of Date)                            │
│                                            │
│ Report: Fraser Coast                       │
│ Valid Period: January - March 2024        │
│ Status: Expired 10 months ago             │
│                                            │
│ Options:                                   │
│ [ Use Existing Report (Out of Date) ]     │
│ [ Upload New Report ]                      │
│                                            │
│ Check for updates:                         │
│ https://membership.hotspotting.com.au/...  │
└────────────────────────────────────────────┘
```

---

## Background Processing (Starts After Step 1)

**Once user leaves Step 1 (or Step 1A), system immediately starts:**

### 1. Proximity & Amenities
```javascript
// Trigger: Address entered
fetch('/api/geoapify/proximity', {
  method: 'POST',
  body: JSON.stringify({ address: "5 Acacia St Point Vernon QLD 4655" })
})
```
**Stores result in:** `formData.proximityData`

### 2. Investment Highlights
```javascript
// Trigger: Suburb + State known
// Option A: Match found → Fetch from Google Sheet
fetch('/api/investment-highlights/lookup', {
  method: 'POST',
  body: JSON.stringify({ suburb: "Point Vernon", state: "QLD" })
})

// Option B: PDF uploaded → Extract metadata (after 15s age check)
if (uploadedPdfFileId && fileAge > 15) {
  fetch('/api/investment-highlights/extract-metadata', {
    method: 'POST',
    body: JSON.stringify({ fileId: uploadedPdfFileId })
  })
}
```
**Stores result in:** `formData.contentSections.investmentHighlights`

### 3. Why This Property (Future)
```javascript
// Trigger: Suburb + LGA known
// Could pre-generate context or fetch templates
```
**Stores result in:** `formData.contentSections.whyThisProperty`

---

## Step 5: Review & Edit (Everything Ready!)

**When user reaches Step 5:**

```
┌────────────────────────────────────────────┐
│ Proximity & Content                        │
├────────────────────────────────────────────┤
│                                            │
│ Proximity & Amenities *                    │
│ ✓ Already loaded                           │
│ [Pre-populated with proximity data]        │
│                                            │
│ Why this Property? *                       │
│ ✓ Already loaded                           │
│ [Pre-populated or ready to generate]       │
│                                            │
│ Investment Highlights *                    │
│ ✓ Report ready: Fraser Coast               │
│ [Pre-populated with report data]           │
│                                            │
│ You can edit any content above as needed.  │
└────────────────────────────────────────────┘
```

**Fallback (if processing failed):**
- Show error message
- Provide manual entry option
- Allow retry

---

## Technical Implementation

### Form State Updates

**Add to `formStore.ts`:**
```typescript
interface FormData {
  // Existing fields...
  
  // NEW: Early processing state
  earlyProcessing: {
    investmentHighlights: {
      status: 'pending' | 'processing' | 'ready' | 'failed';
      uploadedPdfFileId?: string;
      uploadedPdfTimestamp?: number;
      selectedFromDropdown?: boolean;
      error?: string;
    };
    proximity: {
      status: 'pending' | 'processing' | 'ready' | 'failed';
      error?: string;
    };
    whyThisProperty: {
      status: 'pending' | 'processing' | 'ready' | 'failed';
      error?: string;
    };
  };
}
```

### New Component

**Create:** `src/components/steps/Step1AInvestmentHighlightsCheck.tsx`

**Responsibilities:**
1. Auto-check for suburb match
2. Show dropdown if no match
3. Handle PDF upload
4. Trigger background processing
5. Show status messages
6. Continue to Step 2

### Modified Components

**`MultiStepForm.tsx`:**
- Add Step 1A between Step 1 and Step 2
- Trigger background processing after Step 1A
- Check processing status on Step 5

**`Step5Proximity.tsx`:**
- Check if data already loaded
- Show "Already loaded" indicator
- Skip auto-fetch if data exists

---

## User Experience

### Timeline
```
Step 1 (30 seconds)
  → Address entered
  → Click "Next"
  
Step 1A (10-30 seconds)
  → Auto-check for report
  → Select from dropdown OR upload PDF
  → Click "Continue"
  → Background processing starts
  
Step 2 (60 seconds)
  → User fills property details
  → Background: Proximity fetching, PDF extracting
  
Step 3 (90 seconds)
  → User fills market performance
  → Background: Still processing
  
Step 4 (60 seconds)
  → User fills rental assessment
  → Background: Processing complete!
  
Step 5 (10 seconds)
  → Everything ready!
  → User just reviews and edits
```

**Total background processing time:** 3-4 minutes (plenty for PDF + APIs)

---

## Benefits

### For Users
✅ No waiting on Step 5  
✅ Instant review/edit experience  
✅ Clear feedback on processing status  
✅ Option to upload PDF early  

### For System
✅ No race conditions  
✅ PDF has 3-4 minutes to process  
✅ Fewer API failures  
✅ Better error handling  

### For Development
✅ Cleaner architecture  
✅ Easier to test  
✅ Fewer edge cases  
✅ Better user feedback  

---

## Implementation Phases

### Phase 1: Step 1A Component (2-3 hours)
- Create Step 1A page
- Auto-check logic
- Dropdown integration
- PDF upload UI
- Status messages

### Phase 2: Background Processing (2-3 hours)
- Trigger processing after Step 1A
- Store processing state
- Age-based extraction for PDFs
- Error handling

### Phase 3: Step 5 Integration (1-2 hours)
- Check for pre-loaded data
- Show status indicators
- Fallback for failures
- Manual entry option

### Phase 4: Testing (1-2 hours)
- Test all branches
- Test timing
- Test errors
- Test user flow

**Total Time:** 6-10 hours

---

## Next Steps

1. **Approve design** ✅
2. **Create Step 1A component**
3. **Add background processing logic**
4. **Update Step 5 to use pre-loaded data**
5. **Test end-to-end**

---

**Status:** Ready to implement! 🚀

**End of Document**

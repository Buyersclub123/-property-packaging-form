# Phase 4C Handoff Document
## Investment Highlights / Hotspotting Reports

**Date:** January 21, 2026  
**For:** Chat E  
**Branch:** `feature/phase-4-highlights` (to be created from `feature/phase-3-step5-refactor`)  
**Previous Phase:** Phase 3 Complete ✅

---

## 🎯 Objective

Integrate Google Sheets lookup for Investment Highlights/Hotspotting Reports. Auto-lookup reports by suburb/LGA, allow selection of existing reports, or creation of new reports.

---

## 📋 Phase 3 Completion Summary

**What was completed:**
- ✅ `InvestmentHighlightsField.tsx` extracted as independent component
- ✅ Component uses controlled pattern with `value` and `onChange` props
- ✅ Props include `lga` and `state` parameters (ready for sheet lookup)
- ✅ `useInvestmentHighlights.ts` hook placeholder created
- ✅ Manual paste functionality working
- ✅ Smart quote cleanup implemented

**Component Location:** 
- `form-app/src/components/steps/step5/InvestmentHighlightsField.tsx`
- `form-app/src/components/steps/step5/useInvestmentHighlights.ts`

---

## 📚 Required Documents

**Primary Reference:**
- `planning_docs/07_step5_proximity_content_requirements_DEVELOPER_BUILD_SPEC.md` - Section 3

**Supporting References:**
- `IMPLEMENTATION-TRACKER.md` - Overall project tracking
- `PHASE-3-IMPLEMENTATION-SUMMARY.md` - Component structure

---

## 📊 Google Sheet Structure

### New Sheet Required: "Investment Highlights" (or user-specified name)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | Suburbs | Text | Comma-separated list (e.g., "Belmont, Redcliffe, Clontarf") |
| B | State | Text | State code (QLD, NSW, VIC, etc.) |
| C | Report Name | Text | Display name (e.g., "Belmont LGA") |
| D | Valid From | Date | Report validity start date |
| E | Valid To | Date | Report validity end date |
| F | Main Body | Text | Content (7 bullet points) |
| G | Extra Info | Text | Additional user notes |

**Key Design:**
- One report can apply to multiple suburbs (comma-separated in Column A)
- Avoids duplicate rows
- Easy to link new suburbs to existing reports

---

## 🔧 Implementation Requirements

### Feature 1: Auto-Lookup on Page Load

**Trigger:** When Step 5 loads and LGA/suburb is available

**Logic:**
```typescript
useEffect(() => {
  if (lga && state && !value) {
    lookupReport(lga, state);
  }
}, [lga, state]);
```

**API Call:**
- Endpoint: `GET /api/investment-highlights/lookup?lga={lga}&state={state}`
- Response: `{ found: boolean, report?: Report }`

**Loading State:**
- Show spinner with text: "Looking up report..."
- Disable fields while loading

---

### Feature 2: Match Found View

**When:** Report found for current suburb/LGA

**UI Components:**
```
┌─────────────────────────────────────────────────┐
│ ✓ Report Found: [Report Name]                   │
│ Valid: [Valid From] - [Valid To]                │
├─────────────────────────────────────────────────┤
│ Main Body:                                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ * **Infrastructure** - Major upgrades...    │ │
│ │ [Editable text area, pre-populated]         │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Extra Info:                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Editable text area, pre-populated]         │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ [Save Changes] (if edited)                      │
└─────────────────────────────────────────────────┘
```

**Behavior:**
- Pre-populate both fields
- Allow editing
- Show "Save Changes" button if content modified
- Save updates back to Google Sheet

---

### Feature 3: No Match Found View

**When:** No report found for current suburb/LGA

**UI Components:**
```
┌─────────────────────────────────────────────────┐
│ ⚠ No report found for [Suburb]                  │
├─────────────────────────────────────────────────┤
│ Option 1: Select Existing Report                │
│                                                  │
│ Select report: [Dropdown of all reports]        │
│ [Use This Report]                                │
│                                                  │
│ ─────────────────────────────────────────────── │
│                                                  │
│ Option 2: Create New Report                     │
│                                                  │
│ Report Name: [input field]                      │
│ Valid From: [date picker]                       │
│ Valid To: [date picker]                         │
│                                                  │
│ Main Body:                                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Paste area for content]                    │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Extra Info:                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Text area]                                  │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Suburbs (comma-separated):                      │
│ [input field, pre-filled with current suburb]   │
│                                                  │
│ [Save New Report]                                │
└─────────────────────────────────────────────────┘
```

---

### Feature 4: API Endpoints (To Create)

#### 1. Lookup Report
```typescript
// GET /api/investment-highlights/lookup?lga={lga}&state={state}
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lga = searchParams.get('lga');
  const state = searchParams.get('state');
  
  // Query Google Sheet
  // Check if LGA exists in Column A (comma-separated list)
  // Return report if found
  
  return NextResponse.json({
    found: boolean,
    report?: {
      reportName: string,
      validFrom: string,
      validTo: string,
      mainBody: string,
      extraInfo: string,
      suburbs: string[], // Array of suburbs this report covers
    }
  });
}
```

#### 2. List All Reports
```typescript
// GET /api/investment-highlights/list?state={state}
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state'); // Optional filter
  
  // Query Google Sheet
  // Return all reports (optionally filtered by state)
  
  return NextResponse.json({
    reports: [
      { id: string, reportName: string, state: string },
      // ...
    ]
  });
}
```

#### 3. Link Existing Report to New Suburb
```typescript
// POST /api/investment-highlights/link
export async function POST(request: NextRequest) {
  const { reportName, newSuburb } = await request.json();
  
  // Find report row by name
  // Append newSuburb to Column A (comma-separated)
  // Update Google Sheet
  
  return NextResponse.json({ success: true });
}
```

#### 4. Create New Report
```typescript
// POST /api/investment-highlights/create
export async function POST(request: NextRequest) {
  const {
    reportName,
    validFrom,
    validTo,
    mainBody,
    extraInfo,
    suburbs, // Array or comma-separated string
    state,
  } = await request.json();
  
  // Create new row in Google Sheet
  // Columns: suburbs (comma-separated), state, reportName, validFrom, validTo, mainBody, extraInfo
  
  return NextResponse.json({ success: true });
}
```

---

## 📦 Updated Component Interface

```typescript
interface InvestmentHighlightsFieldProps {
  value: string; // Main body content
  onChange: (value: string) => void;
  lga?: string; // LGA/suburb from formData
  state?: string; // State from formData
  disabled?: boolean;
}

interface Report {
  reportName: string;
  validFrom: string;
  validTo: string;
  mainBody: string;
  extraInfo: string;
  suburbs: string[];
}

export function InvestmentHighlightsField({ 
  value, 
  onChange, 
  lga, 
  state, 
  disabled 
}: InvestmentHighlightsFieldProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [extraInfo, setExtraInfo] = useState('');
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Auto-lookup on mount
  useEffect(() => {
    if (lga && state && !report) {
      lookupReport(lga, state);
    }
  }, [lga, state]);

  const lookupReport = async (lga: string, state: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/investment-highlights/lookup?lga=${lga}&state=${state}`
      );
      
      if (!response.ok) throw new Error('Lookup failed');
      
      const data = await response.json();
      
      if (data.found) {
        setReport(data.report);
        onChange(data.report.mainBody);
        setExtraInfo(data.report.extraInfo);
      } else {
        // No match - fetch all reports for dropdown
        await fetchAllReports(state);
      }
    } catch (err) {
      setError('Failed to lookup report');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReports = async (state?: string) => {
    const url = state 
      ? `/api/investment-highlights/list?state=${state}`
      : `/api/investment-highlights/list`;
    
    const response = await fetch(url);
    const data = await response.json();
    setAllReports(data.reports);
  };

  // ... rest of component
}
```

---

## 🎨 Workflow States

### State 1: Loading
```
[Spinner] Looking up report...
```

### State 2: Match Found
```
✓ Report Found: Belmont LGA
Valid: 2024-01-01 - 2024-12-31

[Editable fields pre-populated]
[Save Changes] (if edited)
```

### State 3: No Match - Selection Mode
```
⚠ No report found for [Suburb]

Option 1: Select Existing Report
[Dropdown] [Use This Report]

Option 2: Create New Report
[Create form fields]
[Save New Report]
```

### State 4: Error
```
⚠ Failed to lookup report
[Retry] [Manual Paste]
```

---

## ✅ Success Criteria

### Functional Requirements
- [ ] Auto-lookup runs when Step 5 loads
- [ ] Match found: Pre-populate fields correctly
- [ ] Match found: Allow editing and saving changes
- [ ] No match: Show both options (select existing or create new)
- [ ] No match: Dropdown lists all reports
- [ ] No match: "Use This Report" links suburb to selected report
- [ ] No match: "Create New Report" adds new row to sheet
- [ ] Error handling displays friendly message
- [ ] Manual paste fallback always available

### Google Sheets Integration
- [ ] Lookup queries sheet correctly
- [ ] Comma-separated suburbs handled correctly
- [ ] New suburbs appended without duplicates
- [ ] New reports created with all fields
- [ ] Date formatting handled correctly

### Code Quality
- [ ] No linter errors
- [ ] Type-safe implementation
- [ ] Proper error handling
- [ ] Loading states managed correctly
- [ ] No race conditions

---

## 🚨 Important Notes

### Google Sheets API
- **Existing Integration:** Project already uses Google Sheets API
- **Reference:** Check existing `googleDrive.ts` or similar files for auth pattern
- **Credentials:** Should already be configured in `.env.local`

### Sheet Name
⚠️ **User needs to specify:** What should the new sheet be named?
- Default suggestion: "Investment Highlights"
- Or: "Hotspotting Reports"

### Comma-Separated Suburbs
**Critical:** Column A contains comma-separated suburbs
```
Example: "Belmont, Redcliffe, Clontarf, Woody Point"
```

**Lookup Logic:**
```typescript
// Check if suburb exists in comma-separated list
const suburbs = row[0].split(',').map(s => s.trim());
const found = suburbs.some(s => 
  s.toLowerCase() === lga.toLowerCase()
);
```

### Don't Break Existing Functionality
- ✅ Keep manual paste working
- ✅ Keep smart quote cleanup
- ✅ Keep controlled component pattern
- ✅ Don't change component props interface

---

## 📊 Implementation Checklist

### Setup
- [ ] Review `InvestmentHighlightsField.tsx` current implementation
- [ ] Review `useInvestmentHighlights.ts` hook
- [ ] Check existing Google Sheets integration code
- [ ] Get sheet name from user
- [ ] Create `feature/phase-4-highlights` branch
- [ ] Update `IMPLEMENTATION-TRACKER.md` status to "In Progress"

### Google Sheets Setup
- [ ] Create new sheet in Google Sheets (or confirm user created it)
- [ ] Set up columns A-G as specified
- [ ] Test sheet access with existing credentials

### Backend Implementation
- [ ] Create `/api/investment-highlights/lookup/route.ts`
- [ ] Create `/api/investment-highlights/list/route.ts`
- [ ] Create `/api/investment-highlights/link/route.ts`
- [ ] Create `/api/investment-highlights/create/route.ts`
- [ ] Implement Google Sheets queries
- [ ] Handle comma-separated suburbs correctly
- [ ] Add error handling
- [ ] Test all endpoints independently

### Frontend Implementation
- [ ] Update `useInvestmentHighlights.ts` hook
- [ ] Add state management (loading, error, report, allReports)
- [ ] Implement auto-lookup useEffect
- [ ] Implement "Match Found" view
- [ ] Implement "No Match" view with both options
- [ ] Add dropdown for existing reports
- [ ] Add create form for new reports
- [ ] Implement save/link/create functions
- [ ] Add loading states
- [ ] Add error handling

### Testing
- [ ] Test auto-lookup on Step 5 load
- [ ] Test with suburb that has existing report
- [ ] Test with suburb that has no report
- [ ] Test selecting existing report
- [ ] Test creating new report
- [ ] Test linking suburb to existing report
- [ ] Test editing and saving changes
- [ ] Test error handling
- [ ] Test manual paste fallback
- [ ] Verify no console errors

### Documentation
- [ ] Update `IMPLEMENTATION-TRACKER.md` with progress
- [ ] Add inline comments
- [ ] Document Google Sheets structure
- [ ] Create `PHASE-4C-IMPLEMENTATION-SUMMARY.md`

### Completion
- [ ] Commit changes with clear message
- [ ] Update tracker to "Complete"
- [ ] Return to Coordinator Chat

---

## 🔗 Related Files

**To Create:**
- `form-app/src/app/api/investment-highlights/lookup/route.ts` (NEW)
- `form-app/src/app/api/investment-highlights/list/route.ts` (NEW)
- `form-app/src/app/api/investment-highlights/link/route.ts` (NEW)
- `form-app/src/app/api/investment-highlights/create/route.ts` (NEW)

**To Modify:**
- `form-app/src/components/steps/step5/InvestmentHighlightsField.tsx`
- `form-app/src/components/steps/step5/useInvestmentHighlights.ts`

**To Reference:**
- Existing Google Sheets integration code (for auth pattern)

---

## 🎯 Estimated Effort

**Complexity:** High  
**Estimated Time:** 4-6 hours  
**Risk Level:** High (complex conditional logic, Google Sheets integration)

**Risks:**
- Google Sheets API rate limiting
- Comma-separated suburb parsing edge cases
- Complex UI with multiple states
- Data synchronization issues

**Mitigation:**
- Comprehensive error handling
- Thorough testing of suburb matching
- Clear UI state management
- Cache sheet data when possible

---

## 📞 Coordination

**When Complete:**
1. Commit all changes to `feature/phase-4-highlights`
2. Update `IMPLEMENTATION-TRACKER.md`
3. Create `PHASE-4C-IMPLEMENTATION-SUMMARY.md`
4. Return to **Coordinator Chat** with summary

**If Blocked:**
1. Need Google Sheet name from user
2. Need confirmation on sheet structure
3. Need access to existing Google Sheets credentials
4. Document blocker in `IMPLEMENTATION-TRACKER.md`
5. Return to **Coordinator Chat** for assistance

---

## 🚀 Ready to Begin

**Branch:** Create `feature/phase-4-highlights` from `feature/phase-3-step5-refactor`  
**Status:** Ready to start (pending user input on sheet name)  
**Parallel Work:** Can be done alongside Phase 4A and 4B

---

**Prepared by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Ready for Chat E (pending sheet name confirmation)

# 🚀 Phase 4C - Investment Highlights - For Chat E

**Date:** January 21, 2026  
**Status:** Ready to start  
**Branch:** `feature/phase-4-highlights` (create from `feature/phase-3-step5-refactor`)

---

## 🎯 Your Mission

Integrate Google Sheets lookup for Investment Highlights in the `InvestmentHighlightsField` component.

**What you're building:**
- Auto-lookup suburb in Google Sheet when Step 5 loads
- Display match/no-match UI
- Link suburb to existing report (if found)
- Save new report to Google Sheet (if not found)
- Log all actions to "Investment Highlights Log" tab
- Auto-growing textarea (reuse Phase 4A hook!)

---

## ✅ What's Already Done

Phase 3 extracted the component:
- ✅ `InvestmentHighlightsField.tsx` exists and works
- ✅ Manual paste functionality working
- ✅ Smart quote cleanup implemented
- ✅ Controlled component pattern

Phase 4A created reusable hook:
- ✅ `useAutoResize` hook available at `form-app/src/hooks/useAutoResize.ts`
- ✅ Just import and use it!

---

## 📊 Google Sheet Structure (Provided by User)

### Main Tab: "Investment Highlights"

**Headers:**
```
Suburb | State | Report Name | Valid Period | Investment Highlights
```

**Example Data:**
```
Lewisham | NSW | Lewisham Investment Report Jan 2026 | October 2025 - January 2026 | * Strong capital growth...
```

**Field Details:**
- **Suburb:** Suburb name (e.g., "Lewisham")
- **State:** 3-letter state code (e.g., "NSW")
- **Report Name:** Descriptive name (e.g., "Lewisham Investment Report Jan 2026")
- **Valid Period:** Copyable value from report front page (e.g., "October 2025 - January 2026")
- **Investment Highlights:** 7 bullet points (multi-line text)

### Logging Tab: "Investment Highlights Log"

**Headers:**
```
Timestamp | Action Type | Report Name | Suburb | State | User/BA | Details
```

**Action Types:**
- "Linked" - Suburb linked to existing report
- "Saved" - New report saved
- "Updated" - Existing report updated

**Example Log Entry:**
```
2026-01-21 14:32:15 | Linked | Lewisham Investment Report Jan 2026 | Lewisham | NSW | john@example.com | Linked to property at 15 Barker Street
```

---

## 🔧 Implementation Steps

### Step 1: Create Backend API Endpoints (2-3 hours)

#### Endpoint 1: Lookup Suburb

**File:** `form-app/src/app/api/investment-highlights/lookup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { suburb, state } = await request.json();
    
    if (!suburb || !state) {
      return NextResponse.json(
        { error: 'Suburb and state are required' },
        { status: 400 }
      );
    }
    
    // Authenticate with Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.INVESTMENT_HIGHLIGHTS_SHEET_ID;
    
    // Read from "Investment Highlights" tab
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Investment Highlights!A:E',
    });
    
    const rows = response.data.values || [];
    
    // Skip header row, find matching suburb + state
    for (let i = 1; i < rows.length; i++) {
      const [rowSuburb, rowState, reportName, validPeriod, highlights] = rows[i];
      
      if (rowSuburb?.toLowerCase() === suburb.toLowerCase() && 
          rowState?.toUpperCase() === state.toUpperCase()) {
        return NextResponse.json({
          found: true,
          reportName,
          validPeriod,
          highlights,
          rowIndex: i + 1, // 1-based for Google Sheets
        });
      }
    }
    
    return NextResponse.json({ found: false });
  } catch (error) {
    console.error('Investment Highlights lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup investment highlights' },
      { status: 500 }
    );
  }
}
```

#### Endpoint 2: Link Suburb to Report

**File:** `form-app/src/app/api/investment-highlights/link/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { suburb, state, reportName, userEmail, propertyAddress } = await request.json();
    
    // Log to "Investment Highlights Log" tab
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.INVESTMENT_HIGHLIGHTS_SHEET_ID;
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const details = `Linked to property at ${propertyAddress}`;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Investment Highlights Log!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, 'Linked', reportName, suburb, state, userEmail, details]],
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Investment Highlights link error:', error);
    return NextResponse.json(
      { error: 'Failed to log link action' },
      { status: 500 }
    );
  }
}
```

#### Endpoint 3: Save New Report

**File:** `form-app/src/app/api/investment-highlights/save/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { suburb, state, reportName, validPeriod, highlights, userEmail } = await request.json();
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.INVESTMENT_HIGHLIGHTS_SHEET_ID;
    
    // Save to "Investment Highlights" tab
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Investment Highlights!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[suburb, state, reportName, validPeriod, highlights]],
      },
    });
    
    // Log to "Investment Highlights Log" tab
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const details = `New report created`;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Investment Highlights Log!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, 'Saved', reportName, suburb, state, userEmail, details]],
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Investment Highlights save error:', error);
    return NextResponse.json(
      { error: 'Failed to save investment highlights' },
      { status: 500 }
    );
  }
}
```

---

### Step 2: Update InvestmentHighlightsField Component (2-3 hours)

**File:** `form-app/src/components/steps/step5/InvestmentHighlightsField.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize'; // Import Phase 4A hook!

interface InvestmentHighlightsFieldProps {
  value: string;
  onChange: (value: string) => void;
  suburb?: string;
  state?: string;
  streetAddress?: string; // For logging
  userEmail?: string; // For logging
  disabled?: boolean;
}

export function InvestmentHighlightsField({ 
  value, 
  onChange, 
  suburb,
  state,
  streetAddress,
  userEmail,
  disabled 
}: InvestmentHighlightsFieldProps) {
  const textareaRef = useAutoResize(value); // Use Phase 4A hook!
  
  const [loading, setLoading] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'checking' | 'found' | 'not-found' | null>(null);
  const [reportName, setReportName] = useState('');
  const [validPeriod, setValidPeriod] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Form fields for saving new report
  const [newReportName, setNewReportName] = useState('');
  const [newValidPeriod, setNewValidPeriod] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Auto-lookup on mount
  useEffect(() => {
    if (suburb && state && !value) {
      lookupSuburb();
    }
  }, [suburb, state]);

  const lookupSuburb = async () => {
    if (!suburb || !state) return;
    
    setLoading(true);
    setMatchStatus('checking');
    setError(null);
    
    try {
      const response = await fetch('/api/investment-highlights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb, state }),
      });
      
      if (!response.ok) throw new Error('Lookup failed');
      
      const data = await response.json();
      
      if (data.found) {
        setMatchStatus('found');
        setReportName(data.reportName);
        setValidPeriod(data.validPeriod);
        onChange(data.highlights);
      } else {
        setMatchStatus('not-found');
      }
    } catch (err) {
      setError('Failed to lookup investment highlights. Please enter manually.');
      setMatchStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!suburb || !state || !reportName) return;
    
    try {
      await fetch('/api/investment-highlights/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suburb, 
          state, 
          reportName, 
          userEmail: userEmail || 'unknown',
          propertyAddress: streetAddress || 'unknown'
        }),
      });
    } catch (err) {
      console.error('Failed to log link action:', err);
    }
  };

  const handleSave = async () => {
    if (!suburb || !state || !newReportName || !newValidPeriod || !value) {
      alert('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/investment-highlights/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suburb, 
          state, 
          reportName: newReportName,
          validPeriod: newValidPeriod,
          highlights: value,
          userEmail: userEmail || 'unknown'
        }),
      });
      
      if (!response.ok) throw new Error('Save failed');
      
      alert('Investment highlights saved successfully!');
      setShowSaveForm(false);
      setMatchStatus('found');
      setReportName(newReportName);
      setValidPeriod(newValidPeriod);
    } catch (err) {
      alert('Failed to save investment highlights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Investment Highlights
        </label>
        
        {loading && matchStatus === 'checking' && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center space-x-2 text-blue-600">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Looking up {suburb}, {state}...</span>
            </div>
          </div>
        )}
        
        {matchStatus === 'found' && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Match Found!</span>
            </div>
            <p className="text-sm text-gray-700">
              <strong>Report:</strong> {reportName}<br />
              <strong>Valid Period:</strong> {validPeriod}
            </p>
          </div>
        )}
        
        {matchStatus === 'not-found' && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center space-x-2 text-yellow-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">No Match Found</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              No existing report for {suburb}, {state}. Please paste highlights and save.
            </p>
            <button
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              {showSaveForm ? 'Hide Save Form' : 'Show Save Form'}
            </button>
          </div>
        )}
        
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={lookupSuburb}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
        
        {showSaveForm && matchStatus === 'not-found' && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name
              </label>
              <input
                type="text"
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                placeholder="e.g., Lewisham Investment Report Jan 2026"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Period
              </label>
              <input
                type="text"
                value={newValidPeriod}
                onChange={(e) => setNewValidPeriod(e.target.value)}
                placeholder="e.g., October 2025 - January 2026"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !value}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save to Google Sheet'}
            </button>
          </div>
        )}
        
        <textarea
          ref={textareaRef} // Auto-growing!
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
          style={{ 
            overflow: 'hidden', 
            resize: 'none',
            minHeight: '100px'
          }}
          placeholder="Investment highlights will appear here, or paste manually..."
        />
      </div>
      
      {matchStatus === 'found' && (
        <button
          onClick={handleLink}
          disabled={disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          Use This Report
        </button>
      )}
    </div>
  );
}
```

---

### Step 3: Update Step5Proximity to Pass Props (30 min)

**File:** `form-app/src/components/steps/Step5Proximity.tsx`

Make sure it passes all required props to InvestmentHighlightsField:

```typescript
<InvestmentHighlightsField
  value={formData.investmentHighlights || ''}
  onChange={(value) => updateFormData({ investmentHighlights: value })}
  suburb={formData.suburb}
  state={formData.state}
  streetAddress={formData.streetAddress}
  userEmail={formData.userEmail || 'unknown'} // You may need to add this to formData
  disabled={isSubmitting}
/>
```

---

### Step 4: Add Environment Variables (5 min)

**File:** `form-app/.env.local`

```env
# ---------------------------------------------------------
# 7. Investment Highlights (Phase 4C)
# ---------------------------------------------------------
INVESTMENT_HIGHLIGHTS_SHEET_ID=your_google_sheet_id_here
```

**Note:** Google Sheets credentials should already be configured from Phase 2.

---

## ✅ Success Criteria

**Functional:**
- [ ] Auto-lookup runs when Step 5 loads
- [ ] Match found: Shows green success box with report details
- [ ] No match: Shows yellow warning with save form option
- [ ] Link button logs action to "Investment Highlights Log" tab
- [ ] Save form creates new row in "Investment Highlights" tab
- [ ] Save form logs action to "Investment Highlights Log" tab
- [ ] Textarea auto-grows with content
- [ ] Manual paste works
- [ ] Error handling works

**Data Quality:**
- [ ] Lookup matches suburb + state (case-insensitive)
- [ ] Log entries have correct timestamp format
- [ ] All log fields populated correctly

**Code Quality:**
- [ ] Build passes
- [ ] No linter errors
- [ ] Proper error handling
- [ ] Google Sheets credentials stay server-side only

---

## 🧪 Testing Checklist

1. **Test auto-lookup (existing suburb):**
   - Use suburb that exists in sheet
   - Verify match found message
   - Verify highlights populate
   - Click "Use This Report"
   - Verify log entry created

2. **Test auto-lookup (new suburb):**
   - Use suburb that doesn't exist
   - Verify no match message
   - Show save form
   - Fill in report name and valid period
   - Click "Save to Google Sheet"
   - Verify new row created
   - Verify log entry created

3. **Test auto-growing:**
   - Add/remove content manually
   - Verify textarea expands/shrinks

4. **Test error handling:**
   - Temporarily break Google Sheets credentials
   - Verify error message appears
   - Verify "Retry" button works

5. **Test manual paste:**
   - Clear content
   - Paste manually
   - Verify it works

---

## 📦 No New Dependencies Needed!

✅ Uses existing `googleapis` package (from Phase 2)  
✅ Reuses Google Sheets authentication  
✅ Reuses `useAutoResize` hook (from Phase 4A)

---

## 🚀 When Complete

1. Test thoroughly with both existing and new suburbs
2. Verify Google Sheet updates correctly
3. Verify logging works
4. Update `IMPLEMENTATION-TRACKER.md`
5. Create `PHASE-4C-IMPLEMENTATION-SUMMARY.md`
6. Return to Coordinator Chat with summary

---

## 📚 Reference Documents

Full details in:
- `PHASE-4C-HANDOFF-INVESTMENT-HIGHLIGHTS.md` - Complete implementation guide
- `PHASE-4-STEP5-UI-ENHANCEMENTS.md` - Auto-grow hook documentation

---

**Estimated Time:** 4-5 hours  
**Complexity:** Medium-High  
**Risk:** Medium (Google Sheets API dependency)

**Ready to start!** 🎉

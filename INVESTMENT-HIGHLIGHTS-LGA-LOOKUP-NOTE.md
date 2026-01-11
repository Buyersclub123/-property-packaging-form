# Investment Highlights LGA Lookup Feature - Planning Note

**Date:** 2026-01-11  
**Status:** ✅ **IMPLEMENTED** - Investment Highlights lookup and save functionality is now live  
**Sheet:** "Property Review Static Data - Investment Highlights"  
**Sheet ID:** `1i9ZNOFNkEy3KT0BJCJoxhVPnKkksqSi7A9TpAVpcqcI`

---

## Feature Overview

Similar to Market Performance lookup, but for Investment Highlights using LGA (Local Government Area) as the lookup key.

**Current Reference:** Market Performance uses suburb + state for lookup  
**Proposed:** Investment Highlights would use LGA for lookup

---

## Proposed Functionality

### 1. Lookup by LGA
- When user enters LGA, lookup Investment Highlights data from Google Sheet
- Similar pattern to Market Performance: `lookupMarketPerformance(suburb, state)`
- New function: `lookupInvestmentHighlights(lga)`

### 2. Auto-populate Field
- If data exists in Google Sheet for that LGA, auto-populate the Investment Highlights field
- Similar to how Market Performance data auto-populates

### 3. Save to Google Sheet
- When user enters/modifies Investment Highlights data, save it back to Google Sheet
- Similar to Market Performance save functionality

### 4. Track Document Source
- Record the filename/source document name where the data came from
- Track metadata:
  - Which document the data came from
  - If the source document has been updated (date tracking?)
  - If we need more info/updates

---

## Questions to Resolve

### Google Sheet Configuration
1. **Which Google Sheet?**
   - ✅ **CREATED:** "Property Review Static Data - Investment Highlights"
   - ✅ **Sheet ID:** `1i9ZNOFNkEy3KT0BJCJoxhVPnKkksqSi7A9TpAVpcqcI`
   - ✅ **Tab:** "Investment Highlights"

2. **Which Tab?**
   - New tab name: "Investment Highlights"?
   - Or add to existing tab?

### Data Structure
3. **What fields should be stored?**
   - LGA (lookup key)
   - Investment Highlights text/content
   - Document filename/source
   - Last updated date
   - Document last updated date?
   - Other metadata?

4. **Column structure?**
   - Column A: LGA
   - Column B: Investment Highlights (text/multi-line?)
   - Column C: Source Document Filename
   - Column D: Last Updated Date
   - Column E: Document Last Updated Date?
   - Other columns?

### Form Integration
5. **Where in form should this auto-populate?**
   - Investment Highlights field in content sections (Step 2 or Step 3?)
   - Current location: `formData.contentSections.investmentHighlights`

6. **When should lookup happen?**
   - When LGA is entered/changed in Step 0?
   - Or when user navigates to the Investment Highlights field?

7. **User experience:**
   - Auto-populate and allow editing?
   - Show indicator if data came from lookup?
   - Show document source info to user?

### Document Tracking
8. **How to track document updates?**
   - Store document filename in sheet
   - Track "document last updated date"?
   - How to know if source doc has been updated since last lookup?

9. **Update workflow:**
   - If document updated, flag that data might be stale?
   - Allow user to refresh/re-lookup?

---

## Implementation Approach (When Ready)

### Similar to Market Performance Pattern

**File Structure:**
- `src/lib/googleSheets.ts` - Add `lookupInvestmentHighlights()` and `saveInvestmentHighlights()`
- `src/app/api/investment-highlights/lookup/route.ts` - API route for lookup
- `src/app/api/investment-highlights/save/route.ts` - API route for save
- Form component - Add lookup on LGA change, save on field update

**Authentication:**
- Same Google service account as Market Performance
- Same Google Sheets API client

**Lookup Pattern:**
```typescript
// Similar to lookupMarketPerformance
async function lookupInvestmentHighlights(lga: string): Promise<InvestmentHighlightsLookupResult> {
  // Read from Google Sheet
  // Match by LGA (case-insensitive)
  // Return data + metadata (document source, dates)
}
```

**Save Pattern:**
```typescript
// Similar to saveMarketPerformanceData
async function saveInvestmentHighlights(lga: string, data: InvestmentHighlightsData): Promise<void> {
  // Add or update row in Google Sheet
  // Store LGA, content, document source, dates
}
```

---

## Current Market Performance Reference

**Sheet:** `1M_en0zLhJK6bQMNfZDGzEmPDMwtb3BksvgOsm8N3tlY`  
**Tab:** "Market Performance"  
**Lookup Key:** Suburb Name + State  
**API Routes:** `/api/market-performance/lookup`, `/api/market-performance/save`  
**Functions:** `lookupMarketPerformance()`, `saveMarketPerformanceData()` in `googleSheets.ts`

---

## Notes

- Make.com is NOT in scope for this feature (per user note)
- Direct Google Sheets integration (same as Market Performance)
- LGA data comes from Stash (already being collected in Step 0)
- Investment Highlights field already exists in form structure

---

## Implementation Status

✅ **COMPLETED:**
1. ✅ Google Sheet created: "Property Review Static Data - Investment Highlights"
2. ✅ Data structure defined: LGA, State, Investment Highlights Content, Data Source, Date Collected/Checked, Source Document
3. ✅ Form integration: Step5Proximity component
4. ✅ Lookup function: `lookupInvestmentHighlights()` in `googleSheets.ts`
5. ✅ Save function: `saveInvestmentHighlightsData()` in `googleSheets.ts`
6. ✅ API routes: `/api/investment-highlights/lookup` and `/api/investment-highlights/save`
7. ✅ Integrated into form component: Auto-lookup on mount, manual save button
8. ⏳ Testing: Ready for user testing

## Current Market Performance Reference

**Sheet:** `1M_en0zLhJK6bQMNfZDGzEmPDMwtb3BksvgOsm8N3tlY`  
**Tab:** "Market Performance"  
**Lookup Key:** Suburb Name + State  
**API Routes:** `/api/market-performance/lookup`, `/api/market-performance/save`  
**Functions:** `lookupMarketPerformance()`, `saveMarketPerformanceData()` in `googleSheets.ts`

## Investment Highlights Reference

**Sheet:** `1i9ZNOFNkEy3KT0BJCJoxhVPnKkksqSi7A9TpAVpcqcI`  
**Tab:** "Investment Highlights"  
**Lookup Key:** LGA + State  
**API Routes:** `/api/investment-highlights/lookup`, `/api/investment-highlights/save`  
**Functions:** `lookupInvestmentHighlights()`, `saveInvestmentHighlightsData()` in `googleSheets.ts`

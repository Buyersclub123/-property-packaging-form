# 01 - Developer Build Spec - Proximity Tool

_Extracted from planning session: 01_initial_proximity_tool_review.md_

---

## **Structured Developer Build Spec**

### **1. Proximity Tool - Core Functionality**

1.1. **Endpoint**: `/api/geoapify/proximity`
   - Consolidated endpoint handling all 9 proximity categories
   - Status: Complete and tested at `http://localhost:3000/test-all-categories`
   - **Not yet integrated into main property form** (shelved for later)

1.2. **Distance Calculation Method**
   - All results use **Google Maps Distance Matrix API**
   - Traffic simulation: **Wednesday 9 AM**
   - Distance type: **Drive distances** (not straight-line/Haversine)
   - Note: `calculateDistance()` Haversine function exists in code but is **unused by design**

1.3. **API Batching**
   - Batch size: **25 destinations per API call**
   - Maintains result alignment even if batches fail

1.4. **Error Handling**
   - Failed categories are **skipped** (no fallback logic)
   - Failed batches push `{distance: 0, duration: 0}` to maintain alignment
   - System continues processing other categories if one fails

1.5. **Category Processing Rules**
   - **9 categories** processed in total
   - Category name appending logic implemented
   - Train stations: **Filter out societies/clubs**
   - Airports: Tier logic applied, **26 hardcoded airports**
   - Cities: Tier logic applied, **31 hardcoded cities**

### **2. Test Module Implementation**

2.1. **Test Page**: `/test-all-categories/page.tsx`
   - Standalone test module (not in production)
   - Input: Address field
   - Output: Proximity results display
   - Features: Copy-to-clipboard, loading states, disclaimer display

2.2. **Data Sources**
   - Uses `formData.address.propertyAddress` or coordinates (latitude/longitude)

### **3. Future Integration Point**

3.1. **Target Location**: Step 5 (Proximity & Content) - `Step5Proximity.tsx`
   - Current state: Manual textarea entry with Excel quote stripping
   - Data stored in: `formData.contentSections.proximity`
   - Integration approach (when ready):
     - Add "Generate Proximity" button
     - Call proximity API with property address/coordinates
     - Auto-populate textarea with results
     - Allow manual editing after auto-population

3.2. **Architecture**
   - Form store: Zustand with localStorage persistence
   - TypeScript interfaces defined
   - Data flow: `formData.contentSections.proximity` → GHL submission

### **4. Documentation & User Communication**

4.1. **Disclaimer**
   - Already implemented in code and UI
   - Informs packagers that all distances are drive distances (Wednesday 9 AM traffic)

---

## **UI Behaviors & Field Requirements**

### **Test Module UI** (`/test-all-categories`)
- Address input field
- Generate/Submit button
- Loading state indicator during API calls
- Results display area with formatted proximity data
- Copy-to-clipboard functionality
- Disclaimer text visible to users

### **Form Integration (Future)**
- Step 5 will have manual textarea (current) + auto-generate button (future)
- Manual editing allowed after auto-population
- Paste handler strips Excel quotes from manual entries

---

## **Unresolved/Ambiguous Logic**

### **1. Field Isolation Concern** ⚠️
- **User concern raised**: Changes to fields on Page 5 have caused knock-on effects to Pages 4-5
- **User request**: Code review needed to "ringfence" each field's behavior before integration
- **Status**: User wants to review Pages 5 and 6 field logic before deploying proximity functionality to property form
- **Action needed**: Review and refactor field dependencies to ensure isolated behavior per field

### **2. Integration Timeline** ⚠️
- Proximity tool is complete but **intentionally shelved**
- User testing other features in isolation first
- Integration into property form deferred until field isolation review complete

### **3. No Fallback Strategy**
- If Google Maps API fails completely, no alternative distance calculation method
- This appears to be **by design** but not explicitly confirmed as final decision

---

## **Key Technical Notes for Developers**

- **Do not modify** the main property form yet
- Proximity endpoint file: `form-app/src/app/api/geoapify/proximity/route.ts` (1010 lines)
- Test page file: `form-app/src/app/test-all-categories/page.tsx`
- All agreed rules documented in: `TODO-LIST.md` lines 266-331
- Handover doc: `docs/PROXIMITY-CONSOLIDATED-HANDOVER.md`
- Baseline test results verified with multiple test addresses

---

## **Summary**

The proximity tool is functionally complete and tested in isolation. Integration is blocked pending a code review to ensure field behaviors on Pages 5-6 are properly isolated to prevent cross-field dependencies.

---

**Related Documents:**
- Source: `01_initial_proximity_tool_review.md`
- Handover: `docs/PROXIMITY-CONSOLIDATED-HANDOVER.md`
- Rules: `TODO-LIST.md` (lines 266-331)

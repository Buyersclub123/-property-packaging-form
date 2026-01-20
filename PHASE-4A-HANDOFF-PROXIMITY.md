# Phase 4A Handoff Document
## Proximity Tool Integration

**Date:** January 21, 2026  
**For:** Chat C  
**Branch:** `feature/phase-4-proximity` (to be created from `feature/phase-3-step5-refactor`)  
**Previous Phase:** Phase 3 Complete ✅

---

## 🎯 Objective

Integrate proximity automation into the `ProximityField` component. Auto-calculate amenities when Step 5 loads, with address override and error handling.

---

## 📋 Phase 3 Completion Summary

**What was completed:**
- ✅ `ProximityField.tsx` extracted as independent component
- ✅ Component uses controlled pattern with `value` and `onChange` props
- ✅ Props include `address` parameter (ready for automation)
- ✅ Manual paste functionality working
- ✅ Smart quote cleanup implemented

**Component Location:** `form-app/src/components/steps/step5/ProximityField.tsx`

---

## 📚 Required Documents

**Primary Reference:**
- `planning_docs/07_step5_proximity_content_requirements_DEVELOPER_BUILD_SPEC.md` - Section 1
- `planning_docs/01_developer_build_spec.md` - Proximity tool review

**Supporting References:**
- `IMPLEMENTATION-TRACKER.md` - Overall project tracking
- `PHASE-3-IMPLEMENTATION-SUMMARY.md` - Component structure

**Existing API:**
- `/api/geoapify/proximity` - Already implemented and tested
- Located at: `form-app/src/app/api/geoapify/proximity/route.ts`

---

## 🔧 Implementation Requirements

### Feature 1: Auto-Run on Page Load

**Trigger:** When Step 5 loads and address is available

**Logic:**
```typescript
useEffect(() => {
  if (address && !value) {
    // Only auto-run if field is empty
    calculateProximity(address);
  }
}, [address]);
```

**API Call:**
- Endpoint: `POST /api/geoapify/proximity`
- Body: `{ address: string }`
- Response: `{ results: string }` (formatted proximity list)

**Loading State:**
- Show spinner with text: "Calculating amenities..."
- Disable text area while loading
- Display: "Amenities calculated for: [Address]"

---

### Feature 2: Address Override

**UI Components:**
- Label: "Use different address for proximity calculation"
- Text input for alternate address
- Button: "Update & Rerun"

**Logic:**
```typescript
const [overrideAddress, setOverrideAddress] = useState('');

const handleOverride = async () => {
  if (overrideAddress) {
    await calculateProximity(overrideAddress);
  }
};
```

**Behavior:**
- When user clicks "Update & Rerun", recalculate with override address
- Update display text to show override address was used
- Keep override address in input field

---

### Feature 3: Error Handling

**Trigger:** If API call fails

**Error Message:**
```
"Google Maps could not be accessed to perform the check. 
Please calculate manually via Chat GPT and the amenity tool, 
then paste the results below."
```

**Fallback:**
- Show error message (friendly, obvious)
- Provide empty text area for manual paste
- Allow user to try again with "Retry" button

**Error States:**
```typescript
interface ProximityState {
  loading: boolean;
  error: string | null;
  calculatedFor: string | null;
}
```

---

## 📦 Updated Component Interface

```typescript
interface ProximityFieldProps {
  value: string;
  onChange: (value: string) => void;
  address?: string; // Property address from formData
  disabled?: boolean;
}

export function ProximityField({ 
  value, 
  onChange, 
  address, 
  disabled 
}: ProximityFieldProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedFor, setCalculatedFor] = useState<string | null>(null);
  const [overrideAddress, setOverrideAddress] = useState('');

  // Auto-run on mount
  useEffect(() => {
    if (address && !value && !calculatedFor) {
      calculateProximity(address);
    }
  }, [address]);

  const calculateProximity = async (addr: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/geoapify/proximity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      onChange(data.results);
      setCalculatedFor(addr);
    } catch (err) {
      setError('Google Maps could not be accessed...');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
}
```

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────┐
│ Proximity & Amenities                           │
├─────────────────────────────────────────────────┤
│                                                  │
│ [Loading Spinner] Calculating amenities...      │
│                                                  │
│ OR                                               │
│                                                  │
│ ✓ Amenities calculated for: 123 Main St...      │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ • 169 m (1 min), Lewisham Train Station    │ │
│ │ • 2.3 km (5 mins), Westfield Shopping...   │ │
│ │ [Editable text area with results]          │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Use different address:                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Override address input]                    │ │
│ └─────────────────────────────────────────────┘ │
│ [Update & Rerun]                                │
│                                                  │
│ OR (if error)                                    │
│                                                  │
│ ⚠ Google Maps could not be accessed...         │
│ [Retry]                                          │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

### Functional Requirements
- [ ] Auto-calculation runs when Step 5 loads
- [ ] Loading spinner displays during calculation
- [ ] Results populate text area when complete
- [ ] Text area remains fully editable after population
- [ ] Address override functionality works
- [ ] Error handling displays friendly message
- [ ] Manual paste fallback works when API fails
- [ ] "Retry" button works after error

### User Experience
- [ ] Loading state is clear and obvious
- [ ] User knows which address was used
- [ ] User can override address easily
- [ ] Errors are friendly and actionable
- [ ] Manual fallback is always available

### Code Quality
- [ ] No linter errors
- [ ] Type-safe implementation
- [ ] Proper error handling
- [ ] Loading states managed correctly
- [ ] No race conditions

---

## 🚨 Important Notes

### API Endpoint
- **Endpoint:** `/api/geoapify/proximity`
- **Already implemented:** Yes ✅
- **Location:** `form-app/src/app/api/geoapify/proximity/route.ts`
- **Status:** Tested and working

### Don't Break Existing Functionality
- ✅ Keep manual paste working
- ✅ Keep smart quote cleanup
- ✅ Keep controlled component pattern
- ✅ Don't change component props interface (only add internal state)

### Performance Considerations
- Only auto-run once (check if already calculated)
- Don't re-run on every render
- Cancel pending requests if component unmounts

---

## 📊 Implementation Checklist

### Setup
- [ ] Review `ProximityField.tsx` current implementation
- [ ] Review `/api/geoapify/proximity` endpoint
- [ ] Create `feature/phase-4-proximity` branch
- [ ] Update `IMPLEMENTATION-TRACKER.md` status to "In Progress"

### Feature Implementation
- [ ] Add state management (loading, error, calculatedFor)
- [ ] Implement auto-run useEffect
- [ ] Implement calculateProximity function
- [ ] Add loading spinner UI
- [ ] Add "Amenities calculated for" display
- [ ] Add address override input and button
- [ ] Implement error handling
- [ ] Add error message display
- [ ] Add "Retry" button

### Testing
- [ ] Test auto-run on Step 5 load
- [ ] Test with valid address
- [ ] Test with invalid address
- [ ] Test address override functionality
- [ ] Test error handling (simulate API failure)
- [ ] Test manual paste fallback
- [ ] Test that results remain editable
- [ ] Verify no console errors

### Documentation
- [ ] Update `IMPLEMENTATION-TRACKER.md` with progress
- [ ] Add inline comments
- [ ] Create `PHASE-4A-IMPLEMENTATION-SUMMARY.md`

### Completion
- [ ] Commit changes with clear message
- [ ] Update tracker to "Complete"
- [ ] Return to Coordinator Chat

---

## 🔗 Related Files

**To Modify:**
- `form-app/src/components/steps/step5/ProximityField.tsx`

**To Reference:**
- `form-app/src/app/api/geoapify/proximity/route.ts` (existing API)

**Type Definitions:**
- `form-app/src/types/form.ts` (if needed)

---

## 🎯 Estimated Effort

**Complexity:** Low-Medium  
**Estimated Time:** 2-3 hours  
**Risk Level:** Low (API already tested)

**Risks:**
- API might be slow for some addresses
- Error handling needs to be robust
- Race conditions if user navigates quickly

**Mitigation:**
- Add timeout for API calls
- Comprehensive error handling
- Cancel pending requests on unmount

---

## 📞 Coordination

**When Complete:**
1. Commit all changes to `feature/phase-4-proximity`
2. Update `IMPLEMENTATION-TRACKER.md`
3. Create `PHASE-4A-IMPLEMENTATION-SUMMARY.md`
4. Return to **Coordinator Chat** with summary

**If Blocked:**
1. Document blocker in `IMPLEMENTATION-TRACKER.md`
2. Return to **Coordinator Chat** for assistance

---

## 🚀 Ready to Begin

**Branch:** Create `feature/phase-4-proximity` from `feature/phase-3-step5-refactor`  
**Status:** Ready to start  
**Parallel Work:** Can be done alongside Phase 4B and 4C

---

**Prepared by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Ready for Chat C

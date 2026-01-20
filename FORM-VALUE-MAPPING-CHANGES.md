# Form Value Mapping Changes Needed

## Fields that need form value updates to match GHL

### 1. asking (Purchase Price → Asking)
**File:** `form-app/src/components/steps/Step2PropertyDetails.tsx`
**Line:** ~854-858

**Current form values:**
- `"On-market"` ❌
- `"Off-market"` ❌
- `"Pre-launch"` ❌
- `"Coming Soon"` ❌
- `"TBC"` ❌

**GHL expects:**
- `"on-market"` or `"onmarket"` ✅
- `"off-market"` or `"offmarket"` ✅
- `"pre-launch opportunity"` or `"prelaunch_opportunity"` ✅
- `"coming soon"` or `"coming_soon"` ✅
- `null` (for TBC) ✅

**Changes needed:**
```tsx
// Change from:
<option value="On-market">On-market</option>
<option value="Off-market">Off-market</option>
<option value="Pre-launch">Pre-launch</option>
<option value="Coming Soon">Coming Soon</option>
<option value="TBC">TBC</option>

// To:
<option value="on-market">On-market</option>
<option value="off-market">Off-market</option>
<option value="pre-launch opportunity">Pre-launch</option>
<option value="coming soon">Coming Soon</option>
<option value="">TBC</option>  // Empty string = null in GHL
```

**Also update TypeScript type:**
**File:** `form-app/src/types/form.ts`
**Line:** ~9

```typescript
// Change from:
export type AskingType = 'On-market' | 'Off-market' | 'Pre-launch' | 'Coming Soon' | 'N/A' | 'TBC';

// To:
export type AskingType = 'on-market' | 'off-market' | 'pre-launch opportunity' | 'coming soon' | '' | null;
```

---

### 2. deal_type / contractType
**Status:** ✅ Already correct
**Form sends:** `"01 H&L Comms"`, `"02 Single Comms"`, `"03 Internal with Comms"`, `"04 Internal No-Comms"`, `"05 Established"`
**GHL expects:** Same values (confirmed in docs)

---

### 3. status
**Status:** ✅ Already correct
**Form sends:** `"01 Available"`, `"02 EOI"`, `"03 Contr' Exchanged"`
**GHL expects:** Same values (confirmed in docs: "01 Available, 02 EOI, 03 Contr' Exchanged, 05 Remove no interest, 06 Remove lost")

---

### 4. occupancy
**File:** `form-app/src/components/steps/Step2PropertyDetails.tsx`
**Line:** ~1199-1201, ~1228-1230, ~1259-1261

**Current form values:**
- `"Owner Occupied"` ❓
- `"Tenanted"` ❓
- `"Vacant"` ❓

**GHL expects:** ⚠️ Need to verify - check GHL field allowed values
**Action:** Test or check GHL field configuration

---

### 5. cashback_rebate_type / cashbackRebateType
**File:** `form-app/src/components/steps/Step2PropertyDetails.tsx`
**Line:** ~1014-1016

**Current form values:**
- `"Cashback"` ❓
- `"Rebate on Land"` ❓
- `"Rebate on Build"` ❓

**GHL expects:** ⚠️ Need to verify - check GHL field allowed values
**Action:** Test or check GHL field configuration

---

## Summary

### Immediate Changes Needed:
1. ✅ **asking field** - Change values to lowercase with dashes/spaces (HIGH PRIORITY - already failing)

### Need Verification:
2. ⚠️ **occupancy field** - Check if GHL accepts current values or needs mapping
3. ⚠️ **cashback_rebate_type field** - Check if GHL accepts current values or needs mapping

### Already Correct:
- ✅ deal_type / contractType
- ✅ status

---

## Notes
- The form display text (what user sees) can stay the same: "On-market", "Pre-launch", etc.
- Only the `value` attribute needs to change to match GHL expectations
- Test each field after changing to verify GHL accepts the values

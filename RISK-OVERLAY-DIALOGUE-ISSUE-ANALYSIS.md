# Risk Overlay Dialogue Persistence Issue - Analysis

**Date:** 2026-01-08  
**Issue:** Dialogue text persists when risk overlay changes from "Yes" to "No", potentially causing email generation confusion

---

## 🔴 CRITICAL ISSUE IDENTIFIED

### Problem Scenario:
1. User selects Flood = "Yes"
2. Enters dialogue text: "some dialogue text"
3. Changes Flood = "No"
4. Changes Flood back to "Yes"
5. **Dialogue text "some dialogue text" is still there** ⚠️

### Email Generation Risk:

**Current Make.com Code Behavior:**
```javascript
function overlayBlock(label, status, dialogue) {
  if (status) {
    // Adds "Flood: No" or "Flood: Yes"
  }
  if (dialogue) {
    // Adds "- [dialogue text]" INDEPENDENTLY
  }
}
```

**Problem:** The email generation checks `if (dialogue)` separately from `if (status === "Yes")`. This means:

**Scenario 1 (Current Code):**
- Flood = "No"
- floodDialogue = "some dialogue text" (stale data)
- Email output: `Flood: No\n- some dialogue text` ❌ **WRONG!**

**Scenario 2 (Expected):**
- Flood = "No"  
- floodDialogue = "" (cleared)
- Email output: `Flood: No` ✅ **CORRECT**

**Scenario 3 (Expected):**
- Flood = "Yes"
- floodDialogue = "some dialogue text"
- Email output: `Flood: Yes\n- some dialogue text` ✅ **CORRECT** (but should be "Yes - [dialogue]" format)

---

## Current Code Behavior

### Form Level (Step0AddressAndRisk.tsx):
- `handleOverlayChange` (line 863): Only updates the overlay value (Yes/No)
- **Does NOT clear dialogue text** when changing from "Yes" to "No" ❌

```typescript
const handleOverlayChange = (field: keyof typeof riskOverlays, value: YesNo) => {
  updateRiskOverlays({ [field]: value }); // Only updates Yes/No, keeps dialogue
  checkDialogueWarning(field, value);
};
```

### Email Generation (Make.com):
- Checks `if (dialogue)` independently of status
- **Does NOT verify status === "Yes" before including dialogue** ❌

---

## Impact Assessment

**Risk Level:** 🔴 **HIGH**

**What Could Happen:**
1. User sets Flood = "Yes", enters dialogue
2. User changes Flood = "No" (dialogue text remains in form data)
3. Form submitted with: `flood: "No"`, `floodDialogue: "some text"`
4. Email shows: "Flood: No - some text" ❌ **INCORRECT**
5. Confuses recipients about actual flood risk

---

## Recommended Fix

### Fix 1: Clear Dialogue When Overlay Changes to "No" (Form Level)

**Location:** `src/components/steps/Step0AddressAndRisk.tsx`

**Update `handleOverlayChange` function:**

```typescript
const handleOverlayChange = (field: keyof typeof riskOverlays, value: YesNo) => {
  const updates: Partial<RiskOverlays> = { [field]: value };
  
  // Clear dialogue text when changing to "No" or empty
  if (value !== 'Yes') {
    if (field === 'flood') {
      updates.floodDialogue = '';
    } else if (field === 'bushfire') {
      updates.bushfireDialogue = '';
    } else if (field === 'mining') {
      updates.miningDialogue = '';
    } else if (field === 'otherOverlay') {
      updates.otherOverlayDialogue = '';
    } else if (field === 'specialInfrastructure') {
      updates.specialInfrastructureDialogue = '';
    }
  }
  
  updateRiskOverlays(updates);
  checkDialogueWarning(field, value);
};
```

### Fix 2: Update Email Generation (Make.com) - Safety Check

**Location:** Make.com Module 3 code

**Update `overlayBlock` function to only include dialogue if status === "Yes":**

```javascript
function overlayBlock(label, status, dialogue) {
  let h = "";
  let t = "";
  if (status) {
    const nice = neatValue(status);
    h += htmlLine(label, nice);
    t += textLine(label, nice);
  }
  // Only add dialogue if status is "Yes"
  if (dialogue && status === "Yes") {
    h += `<p>- ${dialogue}</p>`;
    t += `- ${dialogue}\n`;
  }
  return { h, t };
}
```

---

## Priority

**🔴 HIGH PRIORITY** - Fix at form level (Fix 1) prevents stale data from being submitted. Fix 2 is a safety net in email generation.

---

## Testing Scenarios

After fix, test:
1. Set Flood = "Yes", enter dialogue → dialogue visible ✅
2. Change Flood = "No" → dialogue cleared ✅
3. Change Flood back to "Yes" → dialogue field empty (not stale text) ✅
4. Submit form with Flood = "No" → no dialogue in email ✅
5. Submit form with Flood = "Yes" + dialogue → dialogue appears correctly ✅

---

**Status:** Analysis complete - Ready for implementation



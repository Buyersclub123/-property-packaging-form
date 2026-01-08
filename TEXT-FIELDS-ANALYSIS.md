# Text Fields Analysis - Spellcheck and Label Text

**Date:** 2026-01-08  
**Purpose:** Identify text fields missing spellcheck and fields missing "(Text will appear exactly as typed in email template)" label text

---

## Analysis Results

### Step 0: Address & Risk (Step0AddressAndRisk.tsx)

#### Text Input Fields (no spellcheck needed - these are not text fields):
- Property Address input ✅
- Street Number input ✅
- Street Name input ✅
- Suburb input ✅
- State input ✅
- Post Code input ✅
- LGA input ✅
- Zoning input ✅
- Google Maps Link input ✅

#### Textarea Fields:

1. **Flood Dialogue** (line 1444)
   - ✅ Has `spellCheck={true}`
   - ❌ Missing "(Text will appear exactly as typed in email template)"
   - Note: Textarea appears when user selects "Yes" from dropdown. User types dialogue text that appears in email as "Yes - [dialogue text]". The "Yes" part is from the dropdown (auto), but the dialogue text is user-entered.

2. **Bushfire Dialogue** (line 1479)
   - ✅ Has `spellCheck={true}`
   - ❌ Missing "(Text will appear exactly as typed in email template)"
   - Note: Same as Flood - user types dialogue text, appears as "Yes - [dialogue text]"

3. **Mining Dialogue** (line 1514)
   - ✅ Has `spellCheck={true}`
   - ❌ Missing "(Text will appear exactly as typed in email template)"
   - Note: Same as Flood - user types dialogue text, appears as "Yes - [dialogue text]"

4. **Other Overlay Dialogue** (line 1548)
   - ✅ Has `spellCheck={true}`
   - ❌ Missing "(Text will appear exactly as typed in email template)"
   - Note: Same as Flood - user types dialogue text, appears as "Yes - [dialogue text]"

5. **Special Infrastructure Dialogue** (line 1582)
   - ✅ Has `spellCheck={true}`
   - ❌ Missing "(Text will appear exactly as typed in email template)"
   - Note: Same as Flood - user types dialogue text, appears as "Yes - [dialogue text]"

---

### Step 2: Property Details (Step2PropertyDetails.tsx)

#### Textarea Fields (Main Property Description):

1. **Body Corp Description** (line 734)
   - ✅ Has `spellCheck={true}`
   - ✅ Has "(Text will appear exactly as typed in email template)" in label

2. **Property Description Additional Dialogue** (line 770)
   - ✅ Has `spellCheck={true}` (line 781)
   - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 758)

3. **Comparable Sales** (line 997)
   - ✅ Has `spellCheck={true}`
   - ✅ Has "(Text will appear exactly as typed in email template)" in label

4. **Purchase Price Additional Dialogue** (line 1098)
   - ✅ Has `spellCheck={true}` (line 1109)
   - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 1086)

5. **Rental Assessment Additional Dialogue** (line 1699)
   - ✅ Has `spellCheck={true}`
   - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 1687)

#### Textarea Fields (Project Level):

6. **Project Address** (line 2060) - Text input, not textarea ✅

7. **Project Name** (line 2089) - Text input, has `spellCheck={true}` ✅

8. **Comparable Sales (Shared)** (line 2182)
   - ✅ Has `spellCheck={true}`
   - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 2170)

9. **Project Brief** (line 2232)
   - ✅ Has `spellCheck={true}`
   - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 2220)

#### Textarea Fields (Lot Level):

10. **Body Corp Description (Lot)** (line 3202)
    - ✅ Has `spellCheck={true}`
    - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 3201)

11. **Property Description Additional Dialogue (Lot/Shared)** (line 2694)
    - ✅ Has `spellCheck={true}` (line 2705)
    - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 2682)

12. **Purchase Price Additional Dialogue (Lot/Shared)** (line 2730)
    - ✅ Has `spellCheck={true}` (line 2741)
    - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 2718)

13. **Rental Assessment Additional Dialogue (Lot/Shared)** (line 2766)
    - ✅ Has `spellCheck={true}` (line 2777)
    - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 2754)

---

### Step 3: Market Performance (Step3MarketPerformance.tsx)

1. **Market Performance Additional Dialogue** (line 1655)
   - ✅ Has `spellCheck={true}`
   - ✅ Has "(Text will appear exactly as typed in email template)" in label (line 1643)

---

### Step 5: Proximity (Step5Proximity.tsx)

1. **Why this Property?** (line 59)
   - ❌ **MISSING `spellCheck={true}`** ⚠️
   - ❌ **MISSING "(Text will appear exactly as typed in email template)"** in label ⚠️
   - Label: "Why this Property? *"

2. **Proximity** (line 82)
   - ❌ **MISSING `spellCheck={true}`** ⚠️
   - ❌ **MISSING "(Text will appear exactly as typed in email template)"** in label ⚠️
   - Label: "Proximity *"

3. **Investment Highlights** (line 101)
   - ❌ **MISSING `spellCheck={true}`** ⚠️
   - ❌ **MISSING "(Text will appear exactly as typed in email template)"** in label ⚠️
   - Label: "Investment Highlights *"

---

## Summary

### Missing Spellcheck (`spellCheck={true}`):

1. **Step 5 - Why this Property?** (line 59) ⚠️
2. **Step 5 - Proximity** (line 82) ⚠️
3. **Step 5 - Investment Highlights** (line 101) ⚠️

### Missing "(Text will appear exactly as typed in email template)" Label Text:

1. **Step 0 - Flood Dialogue** (line 1444)
   - User types dialogue text in textarea when "Yes" is selected from dropdown
   - In email: "Yes - [dialogue text]" (Yes is from dropdown, dialogue text is user-typed)
   - Missing label clarification

2. **Step 0 - Bushfire Dialogue** (line 1479)
   - Same as Flood - missing label clarification

3. **Step 0 - Mining Dialogue** (line 1514)
   - Same as Flood - missing label clarification

4. **Step 0 - Other Overlay Dialogue** (line 1548)
   - Same as Flood - missing label clarification

5. **Step 0 - Special Infrastructure Dialogue** (line 1582)
   - Same as Flood - missing label clarification

6. **Step 5 - Why this Property?** (line 59) ⚠️
7. **Step 5 - Proximity** (line 82) ⚠️
8. **Step 5 - Investment Highlights** (line 101) ⚠️

---

## Notes

- Risk overlay dialogue fields: When user selects "Yes" from dropdown, a textarea appears where they type dialogue text. In the email, this appears as "Yes - [dialogue text]". The "Yes" comes from the dropdown selection (auto), but the dialogue text is user-entered and should have the label clarification.

- Step 5 fields (Why this Property, Proximity, Investment Highlights) definitely appear in email and should have both spellcheck and the label text.

- All lot-level/shared "Additional Dialogue" fields have spellcheck ✅

---

**Next Steps:** Verify remaining fields and implement fixes


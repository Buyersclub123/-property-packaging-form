# GHL Field Creation Instructions - contract_type_simplified

**Date:** 2026-01-15  
**Field Name:** `contract_type_simplified`  
**Purpose:** Computed field indicating "Single Contract" or "Split Contract" for H&L properties

---

## Step-by-Step Instructions

### 1. Log into GHL (GoHighLevel)
- Navigate to your GHL account
- Go to your location/workspace

### 2. Navigate to Custom Objects
- In the left sidebar, find **"Custom Objects"** or **"Settings" → "Custom Objects"**
- Click on **"Custom Objects"**

### 3. Select Property Reviews Object
- Find and click on the **"Property Reviews"** custom object
- This should have the Object ID: `692d04e3662599ed0c29edfa`

### 4. Add New Field
- Look for a button/link to **"Add Field"**, **"Create Field"**, or **"Fields"** tab
- Click to add a new field

### 5. Field Configuration

**Field Name (Internal):** `contract_type_simplified`
- **Important:** Use exact name: `contract_type_simplified` (lowercase, with underscores)
- This is the internal field name that will be used in API calls and webhooks

**Field Label (Display Name):** `Contract Type Simplified`
- This is what users see in the GHL interface (optional, since field is hidden/computed)

**Field Type:** 
- **Recommended:** Text (Single Line)
- **Alternative:** Dropdown (if you want to restrict values, but Text is simpler)

**Field Options (if using Dropdown):**
- Option 1: `Single Contract`
- Option 2: `Split Contract`
- (Leave empty/null for non-H&L properties)

**Description (Optional):**
- "Computed field indicating Single Contract or Split Contract for H&L properties. Automatically set by the form."

**Required:** ❌ NO (field can be empty for Established/Project properties)

**Visible:** ✅ YES (can be visible in GHL interface for debugging, but field is computed automatically)

---

## Field Specifications Summary

| Property | Value |
|----------|-------|
| **Internal Field Name** | `contract_type_simplified` |
| **Display Label** | Contract Type Simplified |
| **Field Type** | Text (Single Line) |
| **Required** | No |
| **Default Value** | (leave empty) |
| **Possible Values** | `"Single Contract"`, `"Split Contract"`, or `""` (empty) |

---

## Important Notes

1. **Exact Field Name:** Must be exactly `contract_type_simplified` (lowercase, underscores) - this matches what the form sends
2. **Case Sensitive:** The field name is case-sensitive - use lowercase with underscores
3. **Empty Values:** Field will be empty (`""`) for Established and Project properties - this is expected and correct
4. **No Manual Entry:** Field is computed automatically by the form - users should not manually enter values

---

## Verification Steps

After creating the field:

1. **Check Field Exists:**
   - Go to Property Reviews custom object
   - View the fields list
   - Confirm `contract_type_simplified` appears in the list

2. **Test Form Submission:**
   - Submit a test property from the form
   - Go to GHL → Property Reviews → Find the test record
   - Check that `contract_type_simplified` field exists and has a value (for H&L properties) or is empty (for Established/Projects)

3. **Verify Webhook:**
   - Check the webhook payload in Make.com
   - Confirm `contract_type_simplified` appears in the data
   - This should happen automatically - GHL sends all custom object fields

---

## Troubleshooting

**Field not appearing in webhook:**
- Verify the field name is exactly `contract_type_simplified` (no typos, correct case)
- Check that the field is saved/activated in GHL
- Wait a few minutes after creation (sometimes GHL needs time to sync)

**Field not populating from form:**
- Verify the form code is sending the field (already implemented)
- Check the field name matches exactly: `contract_type_simplified`
- Check GHL API response for errors

**Wrong values:**
- For H&L with Contract Type "01 H&L Comms" → Should be "Split Contract"
- For H&L with Contract Type "02 Single Comms" → Should be "Single Contract"
- For Established/Projects → Should be empty (`""`)

---

## Next Steps After Field Creation

1. ✅ Field created in GHL
2. ⏳ Test form submission (submit a test property)
3. ⏳ Verify field populates correctly
4. ⏳ Verify webhook includes the field
5. ⏳ Update Make.com code (see `CONTRACT-TYPE-SIMPLIFIED-IMPLEMENTATION.md`)

---

## Reference

- **Form Code:** `form-app/src/app/api/ghl/submit-property/route.ts` (line 39)
- **Implementation Guide:** `CONTRACT-TYPE-SIMPLIFIED-IMPLEMENTATION.md`
- **Summary:** `CONTRACT-TYPE-FIELD-SUMMARY.md`
- **GHL Object ID:** `692d04e3662599ed0c29edfa`
- **GHL Location ID:** `UJWYn4mrgGodB7KZUcHt`

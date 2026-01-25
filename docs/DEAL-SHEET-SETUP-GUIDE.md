# Deal Sheet Setup Guide - Complete Steps

**Date:** 2025-01-14  
**Purpose:** Complete step-by-step guide to set up Deal Sheet integration

---

## Step 1: Create Google Sheet with Headers

**Action:** Create or update Google Sheet with these column headers (25 columns total - matching original):

```
Type,Packager,Sourcer,Status,Review Date,Last Update,Property Address,Asking,Price Group,BA Message,Acceptable Acquisition,CONFIG,Current Rent $ pw,Appraied Rent $ pw,Land Size,Title Type,Year Built or Registration,Selling Agent,Cashback or Rebat,Cashback or Rebate $,Closing BA,Closing Price,Client_Closed,Closing_Date,Sort_Key__Dont_edit
```

**Notes:**
- Sheet ID: `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8` ✅ **Correct Sheet ID**
- Tab Name: `Opportunities` (or whatever you named the tab)
- **CONFIG** = Bed/Bath/Garage combination (already exists in header)
- **Sort_Key__Dont_edit** = Type + Status + Price Group combination (already exists in header)
- **Format** - Need to clarify: Is this a separate column needed, or is Sort_Key sufficient?
- Make sure headers are in Row 1

---

## Step 2: Create GHL Fields (If Not Exist)

**Action:** Check if these fields exist in GHL Custom Object "Property Review", create if missing:

### Field 1: Closing BA
- **Field Type:** Single Line (Text)
- **Name:** `Closing BA`
- **Object:** Property Review
- **Group:** Property Review Info
- **Unique Key:** `custom_objects.property_reviews.closing_ba`
- **GHL Field Name:** `closing_ba`
- **Placeholder:** (optional - can set "Field Placeholder" or leave blank)

### Field 2: Closing Price
- **Field Type:** Single Line (Text) ✅ **Confirmed - Text field chosen**
- **Name:** `Closing Price`
- **Object:** Property Review
- **Group:** Property Review Info
- **Unique Key:** `custom_objects.property_reviews.closing_price`
- **GHL Field Name:** `closing_price`
- **Placeholder:** (optional - can set "Field Placeholder" or leave blank)

### Field 3: Client Closed
- **Field Type:** Single Line (Text) ✅ **Confirmed - Text field chosen**
- **Name:** `Client Closed`
- **Object:** Property Review
- **Group:** Property Review Info
- **Unique Key:** `custom_objects.property_reviews.client_closed`
- **GHL Field Name:** `client_closed`
- **Placeholder:** (optional - can set "Field Placeholder" or leave blank)

### Field 4: Closing Date
- **Field Type:** Single Line (Text) ✅ **Confirmed - Text field chosen** (not Date field)
- **Name:** `Closing Date`
- **Object:** Property Review
- **Group:** Property Review Info
- **Unique Key:** `custom_objects.property_reviews.closing_date`
- **GHL Field Name:** `closing_date`
- **Placeholder:** (optional - can set "Field Placeholder" or leave blank)
- **Note:** Created as Text field for flexibility - can format dates in Google Sheets with date picker validation

**Note:** 
- `status` field already exists (verified)
- All fields use "Property Review Info" group
- Unique keys follow pattern: `custom_objects.property_reviews.{field_name}`
- All 4 new fields created as Single Line (Text) for maximum flexibility
- Date formatting can be handled in Google Sheets with Data Validation → Date picker

---

## Step 3: Create Make.com Scenario

**Action:** In Make.com, create a new scenario:

**Name:** "Deal Sheet Creation - Property Review Approved"

**Trigger:** 
- Module: **Webhooks** → **Custom webhook**
- This will be triggered when `packager_approved = "Approved"` (from existing "Property Review Approval Webhook" scenario)

---

## Step 4: Add Module 1 - Get GHL Record

**Action:** Add module after webhook:

**Module Type:** **GoHighLevel** → **Get a Record** (or **HTTP** → **Make a request** to GHL API)

**Purpose:** Get full GHL record with all fields

**Input:**
- Record ID: `{{1.recordId}}` (from webhook)
- Custom Object: Property Review

**Output:** Full GHL record with all fields

---

## Step 5: Add Module 2 - Code Module (Field Joins)

**Action:** Add **Code** → **Run JavaScript** module

**Purpose:** Join/combine all fields that need joining

**Code:** (See complete code in next section)

**Input:** Full GHL record from Module 1

**Output:** Combined fields ready for Deal Sheet

---

## Step 6: Add Module 3 - Google Sheets Add Row

**Action:** Add **Google Sheets** → **Add a row** module

**Purpose:** Write combined data to Deal Sheet

**Configuration:**
- Spreadsheet: `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`
- Sheet: `Opportunities`
- Map all fields from Module 2 output

---

## Complete Make.com Code Module (Step 5)

**Copy this entire code block:**

```javascript
// Deal Sheet Field Joins - Complete Code
// Input: Full GHL record from previous module
// Output: All fields ready for Deal Sheet

const ghlRecord = input.data || input;

// Helper function to format currency
function formatCurrency(value) {
  if (!value || value === '' || value === null) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return '$' + num.toLocaleString('en-AU');
}

// Helper function to check if value exists
function hasValue(val) {
  return val !== null && val !== undefined && val !== '' && val !== '0';
}

// 1. Type - Direct mapping
const type = ghlRecord.deal_type || '';

// 2. Packager - Direct mapping
const packager = ghlRecord.packager || '';

// 3. Sourcer - Direct mapping
const sourcer = ghlRecord.sourcer || '';

// 4. Status - Direct mapping (editable)
const status = ghlRecord.status || '';

// 5. Review Date - Direct mapping
const reviewDate = ghlRecord.review_date || '';

// 6. Last Update - System timestamp
const lastUpdate = new Date().toISOString();

// 7. Property Address - Direct mapping
const propertyAddress = ghlRecord.property_address || '';

// 8. Asking - Join asking + asking_text
let asking = ghlRecord.asking || '';
if (ghlRecord.asking_text && ghlRecord.asking_text.trim() !== '') {
  asking = `${asking} - ${ghlRecord.asking_text}`;
}

// 9. Price Group - Direct mapping
const priceGroup = ghlRecord.price_group || '';

// 10. BA Message - Direct mapping
const baMessage = ghlRecord.message_for_ba || '';

// 11. Acceptable Acquisition - Join from + to (Established only)
let acceptableAcquisition = '';
if (ghlRecord.property_type && ghlRecord.property_type.toLowerCase().includes('established')) {
  const from = ghlRecord.acceptable_acquisition__from;
  const to = ghlRecord.acceptable_acquisition__to;
  if (hasValue(from) && hasValue(to)) {
    acceptableAcquisition = `${formatCurrency(from)} – ${formatCurrency(to)}`;
  } else if (hasValue(from)) {
    acceptableAcquisition = formatCurrency(from);
  }
}

// 12. CONFIG - Bed/Bath/Garage combination
let config = '';
const isDual = ghlRecord.single_or_dual_occupancy && 
               ghlRecord.single_or_dual_occupancy.toLowerCase().includes('dual');
const bedsPrimary = ghlRecord.beds_primary || '';
const bedsSecondary = ghlRecord.beds_additional__secondary__dual_key || '';
const bathPrimary = ghlRecord.bath_primary || '';
const bathSecondary = ghlRecord.baths_additional__secondary__dual_key || '';
const garagePrimary = ghlRecord.garage_primary || '';
const garageSecondary = ghlRecord.garage_additional__secondary__dual_key || '';

if (isDual && hasValue(bedsSecondary)) {
  // Dual occupancy format
  config = `${bedsPrimary || ''} + ${bedsSecondary || ''}\n${bathPrimary || ''} + ${bathSecondary || ''}\n${garagePrimary || ''} + ${garageSecondary || ''}`;
} else {
  // Single occupancy format
  config = `${bedsPrimary || ''}\n${bathPrimary || ''}\n${garagePrimary || ''}`;
}

// 13. Current Rent $ pw - Join primary + secondary (Established only)
let currentRent = '';
if (ghlRecord.property_type && ghlRecord.property_type.toLowerCase().includes('established')) {
  if (isDual && hasValue(ghlRecord.current_rent_secondary__per_week)) {
    const primary = parseFloat(ghlRecord.current_rent_primary__per_week || 0);
    const secondary = parseFloat(ghlRecord.current_rent_secondary__per_week || 0);
    const total = primary + secondary;
    currentRent = formatCurrency(total);
  } else if (hasValue(ghlRecord.current_rent_primary__per_week)) {
    currentRent = formatCurrency(ghlRecord.current_rent_primary__per_week);
  } else {
    currentRent = 'No applicable';
  }
} else {
  currentRent = 'No applicable';
}

// 14. Appraised Rent $ pw - Join primary + secondary ranges (All properties)
let appraisedRent = '';
const rentPrimaryFrom = parseFloat(ghlRecord.rent_appraisal_primary_from || 0);
const rentPrimaryTo = parseFloat(ghlRecord.rent_appraisal_primary_to || 0);
const rentSecondaryFrom = parseFloat(ghlRecord.rent_appraisal_secondary_from || 0);
const rentSecondaryTo = parseFloat(ghlRecord.rent_appraisal_secondary_to || 0);

if (isDual && hasValue(rentSecondaryFrom)) {
  // Dual: sum the from values and sum the to values
  const fromTotal = rentPrimaryFrom + rentSecondaryFrom;
  const toTotal = rentPrimaryTo + rentSecondaryTo;
  appraisedRent = `${formatCurrency(fromTotal)} - ${formatCurrency(toTotal)}`;
} else if (hasValue(rentPrimaryFrom) && hasValue(rentPrimaryTo)) {
  // Single: use primary range
  appraisedRent = `${formatCurrency(rentPrimaryFrom)} - ${formatCurrency(rentPrimaryTo)}`;
}

// 15. Land Size - Direct mapping
const landSize = ghlRecord.land_size || '';

// 16. Title Type - Direct mapping
const titleType = ghlRecord.title || '';

// 17. Year Built or Registration - Use year_built OR land_registration
let yearBuiltOrRegistration = '';
if (ghlRecord.property_type && ghlRecord.property_type.toLowerCase().includes('established')) {
  yearBuiltOrRegistration = ghlRecord.year_built || '';
} else {
  yearBuiltOrRegistration = ghlRecord.land_registration || '';
}

// 18. Selling Agent - Join name + email + mobile (3 lines)
let sellingAgent = '';
const agentName = ghlRecord.agent_name || '';
const agentEmail = ghlRecord.agent_email || '';
const agentMobile = ghlRecord.agent_mobile || '';

if (agentName || agentEmail || agentMobile) {
  sellingAgent = `${agentName}\n${agentEmail}\n${agentMobile}`;
}

// 19. Cashback or Rebat - Direct mapping
const cashbackType = ghlRecord.cashback_rebate_type || '';

// 20. Cashback or Rebate $ - Direct mapping
const cashbackValue = ghlRecord.cashback_rebate_value || '';

// 21. Format - Type + Status + Price Group combination
const format = `${ghlRecord.deal_type || ''}-${ghlRecord.status || ''}-${ghlRecord.price_group || ''}`;

// 22. Closing BA - Direct mapping (editable, may be empty initially)
const closingBA = ghlRecord.closing_ba || '';

// 23. Closing Price - Direct mapping (editable, may be empty initially)
const closingPrice = ghlRecord.closing_price || '';

// 24. Client_Closed - Direct mapping (editable, may be empty initially)
const clientClosed = ghlRecord.client_closed || '';

// 25. Closing_Date - Direct mapping (editable, may be empty initially)
const closingDate = ghlRecord.closing_date || '';

// 26. Sort_Key__Dont_edit - Same as Format
const sortKey = format;

// Total Price (for NEW properties) - Not in header but may be needed
let totalPrice = '';
if (ghlRecord.property_type && !ghlRecord.property_type.toLowerCase().includes('established')) {
  const landPrice = ghlRecord.land_price;
  const buildPrice = ghlRecord.build_price;
  const total = ghlRecord.total_price;
  
  if (hasValue(landPrice) && hasValue(buildPrice)) {
    totalPrice = `Land: ${formatCurrency(landPrice)}\nBuild: ${formatCurrency(buildPrice)}\nTotal: ${formatCurrency(total)}`;
  } else if (hasValue(total)) {
    totalPrice = `Total: ${formatCurrency(total)}`;
  }
}

// Return all fields for Google Sheets
return {
  type,
  packager,
  sourcer,
  status,
  reviewDate,
  lastUpdate,
  propertyAddress,
  asking,
  priceGroup,
  baMessage,
  acceptableAcquisition,
  config,
  currentRent,
  appraisedRent,
  landSize,
  titleType,
  yearBuiltOrRegistration,
  sellingAgent,
  cashbackType,
  cashbackValue,
  format,
  closingBA,
  closingPrice,
  clientClosed,
  closingDate,
  sortKey,
  // Additional field for reference
  totalPrice
};
```

---

## Step 7: Map Fields in Google Sheets Module

**Action:** In Module 3 (Google Sheets Add Row), map each field:

| Deal Sheet Column | Make.com Field |
|-------------------|----------------|
| Type | `{{2.type}}` |
| Packager | `{{2.packager}}` |
| Sourcer | `{{2.sourcer}}` |
| Status | `{{2.status}}` |
| Review Date | `{{2.reviewDate}}` |
| Last Update | `{{2.lastUpdate}}` |
| Property Address | `{{2.propertyAddress}}` |
| Asking | `{{2.asking}}` |
| Price Group | `{{2.priceGroup}}` |
| BA Message | `{{2.baMessage}}` |
| Acceptable Acquisition | `{{2.acceptableAcquisition}}` |
| CONFIG | `{{2.config}}` |
| Current Rent $ pw | `{{2.currentRent}}` |
| Appraied Rent $ pw | `{{2.appraisedRent}}` |
| Land Size | `{{2.landSize}}` |
| Title Type | `{{2.titleType}}` |
| Year Built or Registration | `{{2.yearBuiltOrRegistration}}` |
| Selling Agent | `{{2.sellingAgent}}` |
| Cashback or Rebat | `{{2.cashbackType}}` |
| Cashback or Rebate $ | `{{2.cashbackValue}}` |
| Format | `{{2.format}}` |
| Closing BA | `{{2.closingBA}}` |
| Closing Price | `{{2.closingPrice}}` |
| Client_Closed | `{{2.clientClosed}}` |
| Closing_Date | `{{2.closingDate}}` |
| Sort_Key__Dont_edit | `{{2.sortKey}}` |

---

## Step 8: Connect to Existing Approval Webhook

**Action:** Modify existing "Property Review Approval Webhook - by Ahmad" scenario:

**Current flow:**
1. Webhook receives approval
2. Updates GHL with `packager_approved = "Approved"`

**Add:**
3. After GHL update, trigger new "Deal Sheet Creation" scenario
   - Option A: Add modules to existing scenario
   - Option B: Use webhook response to trigger new scenario

**Recommended:** Add modules to existing scenario (simpler)

---

## Step 9: Test Scenario

**Action:** Test end-to-end:

1. Trigger approval webhook
2. Verify GHL record updated
3. Verify Deal Sheet row created
4. Verify all fields populated correctly

---

## Step 10: Set Up Sync Back from Deal Sheet to GHL (Future)

**Action:** Create separate scenario for syncing edits back:

**Trigger:** Google Sheets webhook (when row edited)
**Action:** Update GHL record with edited fields (Status, Closing BA, Closing Price, Client_Closed, Closing_Date)

**Note:** This is a separate enhancement - can be done later.

---

## Summary

**Total Steps:** 10 steps
**Critical Steps:** 1-7 (Deal Sheet creation)
**Future Enhancement:** Step 10 (Sync back)

**Files Created:**
- `DEAL-SHEET-FIELD-MAPPING.md` - Field mappings
- `DEAL-SHEET-SETUP-GUIDE.md` - This guide

**Next:** Follow steps 1-7 to set up Deal Sheet creation.

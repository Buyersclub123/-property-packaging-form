# Project Lots Architecture - Data Storage & Email Recreation

**Problem Statement:**
- Day 1: Submit project → Create ONE email with ALL lots → Create MULTIPLE GHL records (one per lot)
- Day 4: Click "Send Again" button → Need to recreate email → Where does the data come from?

---

## 🎯 Requirements

1. **Initial Submission:**
   - ✅ ONE email showing ALL lots
   - ✅ MULTIPLE GHL records (one per lot, each with its own lifecycle)
   - ✅ MULTIPLE Deal Sheet rows (one per lot)

2. **Future "Send Again":**
   - ✅ Button in Deal Sheet row
   - ✅ Opens portal/client selection (same as initial submission)
   - ✅ Recreates email with ALL lots
   - ✅ Question: Where does lot data come from?

---

## 📊 Current Data Structure

### Form Data Structure
```typescript
{
  // Shared project data (same for all lots)
  address: { projectAddress, ... },
  riskOverlays: { zoning, flood, ... },
  contentSections: { whyThisProperty, proximity, investmentHighlights },
  marketPerformance: { ... },
  agentInfo: { ... },
  projectBrief: "...", // Project-specific
  salesAssessment: "...", // Project-specific
  
  // Lot-specific data (different for each lot)
  lots: [
    {
      lotNumber: "Lot 17",
      singleOrDual: "Yes",
      propertyDescription: { beds, bath, landSize, buildSize, ... },
      purchasePrice: { landPrice, buildPrice, totalPrice, ... },
      rentalAssessment: { currentRent, rentAppraisal, ... }
    },
    {
      lotNumber: "Lot 18",
      singleOrDual: "No",
      propertyDescription: { ... },
      purchasePrice: { ... },
      rentalAssessment: { ... }
    }
  ]
}
```

### Email Structure (for Projects)
```
Subject: Property Review ([TYPE] Project): [ESTATE ADDRESS]

[Shared Project Data]
- Project Address
- Risk Overlays
- Why this Property?
- Proximity
- Investment Highlights
- Market Performance
- Project Brief
- Sales Assessment
- Agent Info

[All Lots Listed]
Lot 17:
- Lot Number: Lot 17
- Property Description (beds, bath, land size, build size, etc.)
- Purchase Price (land, build, total)
- Rental Assessment

Lot 18:
- Lot Number: Lot 18
- Property Description
- Purchase Price
- Rental Assessment
```

---

## 🏗️ Proposed Architecture: Parent-Child Record Structure

### Option A: Parent Record + Child Records (RECOMMENDED)

#### Structure:
1. **Parent Record (Project-Level):**
   - Contains ALL shared project data
   - Contains complete email template (HTML/text)
   - `project_parent_id` = null (it's the parent)
   - `project_type` = "Project"
   - `is_parent_record` = true
   - `project_identifier` = unique project ID (e.g., "PROJ-2025-001")

2. **Child Records (Lot-Level):**
   - Contains lot-specific data only
   - `project_parent_id` = parent record ID
   - `project_identifier` = same as parent (for grouping)
   - `is_parent_record` = false
   - `lot_number` = "Lot 17", "Lot 18", etc.

#### GHL Records Created:
```
Parent Record (ID: abc123):
  - property_address: "123 Main St, Suburb, State" (project address)
  - project_parent_id: null
  - project_identifier: "PROJ-2025-001"
  - is_parent_record: true
  - project_brief: "..."
  - sales_assessment: "..."
  - why_this_property: "..."
  - proximity: "..."
  - investment_highlights: "..."
  - risk_overlays: { ... }
  - market_performance: { ... }
  - email_template_html: "<html>...</html>" (complete email)
  - email_template_text: "..."
  - lots_data: JSON array of all lot data (for reference)

Child Record 1 (ID: def456):
  - property_address: "123 Main St, Suburb, State - Lot 17"
  - project_parent_id: "abc123"
  - project_identifier: "PROJ-2025-001"
  - is_parent_record: false
  - lot_number: "Lot 17"
  - beds_primary: "4"
  - land_size: "1100"
  - build_size: "219.11"
  - land_price: "$210,000"
  - build_price: "$559,990"
  - total_price: "$769,990"
  - current_rent: "..."
  - rent_appraisal: "..."
  - status: "01 Available"
  - (only lot-specific fields)

Child Record 2 (ID: ghi789):
  - property_address: "123 Main St, Suburb, State - Lot 18"
  - project_parent_id: "abc123"
  - project_identifier: "PROJ-2025-001"
  - is_parent_record: false
  - lot_number: "Lot 18"
  - (lot-specific fields only)
```

#### Deal Sheet Rows:
```
Row 1: Parent Record (optional - may not need in Deal Sheet)
  - Property Address: "123 Main St, Suburb, State"
  - Type: "Project"
  - Status: (aggregated from children?)
  - Button: "Send to Clients" (uses parent record)

Row 2: Child Record 1
  - Property Address: "123 Main St, Suburb, State - Lot 17"
  - Type: "Project Lot"
  - Lot Number: "Lot 17"
  - Status: "01 Available"
  - Button: "Send to Clients" (uses parent record + this lot only?)

Row 3: Child Record 2
  - Property Address: "123 Main St, Suburb, State - Lot 18"
  - Type: "Project Lot"
  - Lot Number: "Lot 18"
  - Status: "02 EOI"
  - Button: "Send to Clients" (uses parent record + this lot only?)
```

#### "Send Again" Flow:
1. User clicks "Send to Clients" button in Deal Sheet row
2. **If clicking parent row:**
   - Get parent record (contains email template)
   - Use stored email template OR rebuild from parent + all children
   - Open portal with email template
   - User selects clients
   - Send email (shows ALL lots)

3. **If clicking child row:**
   - Get parent record (contains shared data)
   - Get this child record (contains lot-specific data)
   - Rebuild email from parent + this child only (or all children?)
   - Open portal with email template
   - User selects clients
   - Send email (shows this lot only, or all lots?)

**Decision Needed:** When clicking child row, show:
- **Option 1:** This lot only (filtered email)
- **Option 2:** All lots (same as parent row)

---

### Option B: Store All Data in Each Lot Record

#### Structure:
- Each lot record contains:
  - Its own lot-specific data
  - PLUS all shared project data (duplicated in each record)
- `project_identifier` = same for all lots (for grouping)
- No parent record

#### Pros:
- ✅ Each lot is self-contained
- ✅ Can send individual lots if needed
- ✅ No need to query parent record

#### Cons:
- ❌ Data duplication (shared data stored multiple times)
- ❌ If shared data changes, need to update all lot records
- ❌ Larger storage footprint

---

### Option C: Store Email Template in Each Lot Record

#### Structure:
- Each lot record contains:
  - Its own lot-specific data
  - Complete email HTML/text (stored at submission time)
- `project_identifier` = same for all lots
- When "Send Again": Use stored email from any lot record

#### Pros:
- ✅ Simple, exact email recreation
- ✅ No need to rebuild email

#### Cons:
- ❌ Email is static (can't update if property changes)
- ❌ Data duplication (email stored in each lot record)
- ❌ If email format changes, old emails are outdated

---

## 🎯 Recommended Solution: Option A (Parent-Child)

### Why Option A?
1. **Single Source of Truth:** Shared data stored once in parent record
2. **Flexible:** Can rebuild email dynamically (updates if data changes)
3. **Scalable:** Easy to add/remove lots without affecting others
4. **Clear Structure:** Parent = project, Children = lots
5. **Email Recreation:** Parent record has email template OR can rebuild from parent + children

### Implementation Steps:

#### 1. Update Form Submission (Step 6)
```typescript
// When submitting project with multiple lots:
if (isProject && lots.length > 0) {
  // Create parent record first
  const parentRecord = {
    // All shared project data
    property_address: formData.address.projectAddress,
    project_parent_id: null,
    project_identifier: generateProjectId(), // "PROJ-2025-001"
    is_parent_record: true,
    project_brief: formData.projectBrief,
    sales_assessment: formData.salesAssessment,
    why_this_property: formData.contentSections.whyThisProperty,
    proximity: formData.contentSections.proximity,
    investment_highlights: formData.contentSections.investmentHighlights,
    // ... all shared fields
    email_template_html: generatedEmailHtml, // Store complete email
    email_template_text: generatedEmailText,
    lots_data: JSON.stringify(lots), // Store all lot data for reference
  };
  
  // Create parent record via Make.com
  const parentResponse = await fetch(MakeWebhook, {
    method: 'POST',
    body: JSON.stringify({
      source: 'form_app',
      action: 'create_parent_record',
      formData: parentRecord,
    }),
  });
  
  const parentResult = await parentResponse.json();
  const parentRecordId = parentResult.recordId;
  
  // Create child records for each lot
  for (const lot of lots) {
    const childRecord = {
      // Lot-specific data only
      property_address: `${formData.address.projectAddress} - ${lot.lotNumber}`,
      project_parent_id: parentRecordId,
      project_identifier: parentRecord.project_identifier,
      is_parent_record: false,
      lot_number: lot.lotNumber,
      beds_primary: lot.propertyDescription?.bedsPrimary,
      land_size: lot.propertyDescription?.landSize,
      build_size: lot.propertyDescription?.buildSize,
      land_price: lot.purchasePrice?.landPrice,
      build_price: lot.purchasePrice?.buildPrice,
      total_price: lot.purchasePrice?.totalPrice,
      // ... all lot-specific fields
    };
    
    // Create child record via Make.com
    await fetch(MakeWebhook, {
      method: 'POST',
      body: JSON.stringify({
        source: 'form_app',
        action: 'create_child_record',
        formData: childRecord,
      }),
    });
  }
}
```

#### 2. Update Make.com Scenario
- **Module 1:** Webhook receives form data
- **Module 6:** Preprocess data, detect if project with lots
- **If parent:** Create parent record in GHL
- **If child:** Create child record in GHL, link to parent
- **Module 3:** Build email template (for parent record)
- **Store email template in parent record**

#### 3. Update "Send Again" Flow
```typescript
// When "Send Again" button clicked in Deal Sheet:
async function sendAgain(recordId: string) {
  // Get record from GHL
  const record = await getGHLRecord(recordId);
  
  if (record.is_parent_record) {
    // Parent record: Use stored email template
    const emailTemplate = record.email_template_html;
    // OR rebuild from parent + all children
    const children = await getChildrenRecords(record.project_identifier);
    const emailTemplate = rebuildEmail(record, children);
    
    // Open portal with email template
    openPortal(emailTemplate, record);
  } else {
    // Child record: Get parent + this child (or all children)
    const parent = await getParentRecord(record.project_parent_id);
    const children = await getChildrenRecords(record.project_identifier);
    
    // Rebuild email from parent + children
    const emailTemplate = rebuildEmail(parent, children);
    
    // Open portal with email template
    openPortal(emailTemplate, parent);
  }
}
```

#### 4. Update Deal Sheet Button
- Google Apps Script button in Deal Sheet row
- Calls Make.com webhook with `action: 'send_again'`
- Make.com gets record, determines if parent/child
- Rebuilds email, opens portal

---

## 📋 Required GHL Fields

### New Fields Needed:
1. **`project_parent_id`** (Text) - Parent record ID (null for parent)
2. **`project_identifier`** (Text) - Unique project ID (same for all lots in project)
3. **`is_parent_record`** (Yes/No) - Is this a parent record?
4. **`lot_number`** (Text) - Lot number (for child records)
5. **`email_template_html`** (Text/Long Text) - Complete email HTML (for parent)
6. **`email_template_text`** (Text/Long Text) - Complete email text (for parent)
7. **`lots_data`** (Text/Long Text) - JSON array of all lot data (for parent, reference only)

### Field Mapping:
- Parent record: All shared fields + email template
- Child record: Only lot-specific fields + parent reference

---

## ❓ Questions to Answer

1. **Deal Sheet Display:**
   - Show parent record row? Or only child records?
   - If only children, how do we access parent email template?

2. **"Send Again" from Child Row:**
   - Show this lot only? Or all lots?
   - **Recommendation:** Show all lots (same as parent), but highlight this lot

3. **Email Template Storage:**
   - Store in parent record? Or rebuild dynamically?
   - **Recommendation:** Store in parent, but allow rebuild if needed

4. **Parent Record Status:**
   - Does parent record have its own status?
   - Or aggregate status from children?
   - **Recommendation:** Parent has status, but can be overridden by children

5. **Deal Sheet Filtering:**
   - Can filter by project (show all lots)?
   - Can filter by individual lot?
   - **Recommendation:** Both options

---

## ✅ Next Steps

1. **Decide on architecture** (Option A recommended)
2. **Create new GHL fields** (see list above)
3. **Update form submission** to create parent + children
4. **Update Make.com scenario** to handle parent/child records
5. **Update "Send Again" flow** to use parent record
6. **Create Deal Sheet button** with parent/child logic
7. **Test end-to-end:** Submit project → Verify records → Send again → Verify email

---

**Last Updated:** January 2025  
**Status:** 🔴 Pending decision on architecture

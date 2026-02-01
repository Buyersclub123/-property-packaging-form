# Opportunity ID vs Contact ID - Data Comparison

## Current (WRONG) - Using Contact ID

**Module 59 Mapping:** `"id": "{{11.id}}"` (Contact ID)

**Example Data Sent to Portal:**
```json
{
  "id": "contact_abc123xyz",           // ❌ Contact ID (wrong)
  "name": "2 John Truscott PROPERTY TEAM PIPELINE TEST 2",
  "stage": "25e97d2a-5001-4107-9764-4d39bf1ead00",
  "client": "John Truscott",
  "partner": null,
  "emails": "john.t@buyersclub.com.au",
  "follower": ["follower_id_1"],
  "assignedBA": "John Smith"
}
```

**Problem:** When portal sends `id: "contact_abc123xyz"` to Make.com, Make.com can't find an opportunity with that ID because it's a contact ID, not an opportunity ID.

---

## Correct - Using Opportunity ID

**Module 59 Mapping:** `"id": "{{10.id}}"` (Opportunity ID)

**Example Data Sent to Portal:**
```json
{
  "id": "opp_xyz789abc",               // ✅ Opportunity ID (correct)
  "name": "2 John Truscott PROPERTY TEAM PIPELINE TEST 2",
  "stage": "25e97d2a-5001-4107-9764-4d39bf1ead00",
  "client": "John Truscott",
  "partner": null,
  "emails": "john.t@buyersclub.com.au",
  "follower": ["follower_id_1"],
  "assignedBA": "John Smith"
}
```

**Result:** When portal sends `id: "opp_xyz789abc"` to Make.com, Make.com can correctly find and update the opportunity.

---

## GHL ID Format Examples

**Opportunity IDs** (from Module 10):
- Format: Alphanumeric string, typically 10-20 characters
- Examples: `abc123xyz`, `opp_xyz789abc`, `1234567890abcdef`
- Location: `{{10.id}}` from Module 10 (Get An Opportunity)

**Contact IDs** (from Module 11):
- Format: Alphanumeric string, typically 10-20 characters  
- Examples: `contact_abc123xyz`, `cont_xyz789abc`, `9876543210fedcba`
- Location: `{{11.id}}` from Module 11 (Get A Contact)

**Note:** Both look similar (alphanumeric strings), but they reference different GHL objects. Using the wrong one breaks the integration.

---

## What Happens in the Portal

**Current (Wrong):**
1. Portal receives: `id: "contact_abc123xyz"` (Contact ID)
2. User selects opportunity and clicks "Action the Above"
3. Portal sends to Make.com: `{ id: "contact_abc123xyz", ... }`
4. Make.com tries to find opportunity with ID `"contact_abc123xyz"`
5. ❌ **FAILS** - No opportunity found (it's a contact ID)

**Correct:**
1. Portal receives: `id: "opp_xyz789abc"` (Opportunity ID)
2. User selects opportunity and clicks "Action the Above"
3. Portal sends to Make.com: `{ id: "opp_xyz789abc", ... }`
4. Make.com finds opportunity with ID `"opp_xyz789abc"`
5. ✅ **SUCCESS** - Opportunity found and processed correctly

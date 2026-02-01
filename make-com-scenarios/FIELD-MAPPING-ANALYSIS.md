# Scenario 5 - Field Mapping Analysis

## Purpose
This document analyzes the CURRENT field mappings in Module 59 (TextAggregator) compared to what is REQUIRED.

**Status:** Analysis complete. All required fields are available in blueprint interfaces. Field mappings need to be corrected in Module 59.

---

## Current Mapping (Module 59)

Looking at the blueprint, Module 59 has this mapping:

```json
{
  "id": "{{11.id}}",
  "name": "{{10.name}}",
  "stage": "{{10.pipelineStageId}}",
  "client": "{{11.firstName}} {{11.lastName}}",
  "emails": "{{11.email}}",
  "partner": null,
  "follower": "{{11.followers}}",
  "assignedBA": "{{10.customField.NXqFwEzo28k6lOkbyT5N}}"
}
```

---

## Field-by-Field Analysis

### 1. **id** (Opportunity ID)
- **Current:** `{{11.id}}` (Contact ID from Module 11)
- **Required:** `{{10.id}}` (Opportunity ID from Module 10)
- **Status:** ❌ **WRONG MAPPING** - Field is available, but using wrong source
- **Available:** ✅ `{{10.id}}` is available in Module 10 interface (confirmed in blueprint)
- **Fix Needed:** Change `{{11.id}}` to `{{10.id}}`
- **Impact:** Portal will show contact IDs instead of opportunity IDs, breaking opportunity identification

---

### 2. **name** (Opportunity Name)
- **Current:** `{{10.name}}` (Opportunity name from Module 10)
- **Required:** `{{10.name}}` (Opportunity name from Module 10)
- **Status:** ✅ **CORRECT**

---

### 3. **stage** (Pipeline Stage)
- **Current:** `{{10.pipelineStageId}}` (Pipeline Stage ID from Module 10)
- **Required:** `{{10.pipelineStageId}}` OR `{{10.pipelineStage}}` (Stage ID or name)
- **Status:** ✅ **CORRECT** - Using ID is fine, portal can use lookup to convert to name

---

### 4. **client** (Client Name)
- **Current:** `{{11.firstName}} {{11.lastName}}` (Contact first + last name from Module 11)
- **Required:** `{{11.firstName}} {{11.lastName}}` OR `{{11.name}}` (Full name from contact)
- **Status:** ✅ **CORRECT** - Combining firstName and lastName works

---

### 5. **partner** (Partner Name)
- **Current:** `null` (Hardcoded null value)
- **Required:** `{{11.customField.xFKbtz7Lt1X2nNTeFSSH}}` (Partner Name custom field from Contact)
- **Status:** ❌ **WRONG MAPPING** - Field is available, but hardcoded to null
- **Available:** ✅ `{{11.customField.xFKbtz7Lt1X2nNTeFSSH}}` is available in Module 11 interface (confirmed in blueprint)
- **Fix Needed:** Change `null` to `{{11.customField.xFKbtz7Lt1X2nNTeFSSH}}`
- **Impact:** Partner names will always be empty/null in portal

---

### 6. **emails** (Email Addresses)
- **Current:** `{{11.email}}` (Only main contact email from Module 11)
- **Required:** Combine `{{11.email}}` + `{{11.customField.d0iUirsqy4kdUVMpHLfD}}` with `\n` separator
- **Status:** ❌ **INCOMPLETE MAPPING** - Fields are available, but partner email is missing
- **Available:** ✅ `{{11.email}}` is available (currently used) ✅ `{{11.customField.d0iUirsqy4kdUVMpHLfD}}` is available in Module 11 interface (confirmed in blueprint)
- **Fix Needed:** Combine both emails with `\n` separator (need to check Make.com expression syntax)
- **Impact:** Partner emails are not included, emails field incomplete
- **Note:** Need to handle case where partner email might be empty

---

### 7. **follower** (Follower)
- **Current:** `{{11.followers}}` (Contact followers from Module 11)
- **Required:** `{{10.followers}}` (Opportunity followers from Module 10)
- **Status:** ❌ **WRONG MAPPING** - Field is available, but using wrong source
- **Available:** ✅ `{{10.followers}}` is available in Module 10 interface (confirmed in blueprint)
- **Fix Needed:** Change `{{11.followers}}` to `{{10.followers}}`
- **Impact:** Wrong follower data displayed (contact vs opportunity followers are different)

---

### 8. **assignedBA** (Assigned Buyers Agent)
- **Current:** `{{10.customField.NXqFwEzo28k6lOkbyT5N}}` (Assigned BA custom field from Opportunity)
- **Required:** `{{10.customField.NXqFwEzo28k6lOkbyT5N}}` (Assigned BA custom field from Opportunity)
- **Status:** ✅ **CORRECT**

---

## Summary

### ✅ Correctly Mapped (4 fields):
1. `name` - Opportunity name ✅
2. `stage` - Pipeline stage ID ✅
3. `assignedBA` - Assigned Buyers Agent ✅
4. `client` - Client name (firstName + lastName) ✅

### ❌ Incorrectly Mapped (4 fields) - **All fields are available, just need mapping fixes:**
1. `id` - ❌ Using `{{11.id}}` (contact) → Should use `{{10.id}}` (opportunity) ✅ Available
2. `partner` - ❌ Hardcoded `null` → Should use `{{11.customField.xFKbtz7Lt1X2nNTeFSSH}}` ✅ Available
3. `emails` - ❌ Only `{{11.email}}` → Should combine with `{{11.customField.d0iUirsqy4kdUVMpHLfD}}` ✅ Both available
4. `follower` - ❌ Using `{{11.followers}}` (contact) → Should use `{{10.followers}}` (opportunity) ✅ Available

**Key Finding:** All required fields ARE available in the blueprint interfaces. The issue is purely incorrect field mappings in Module 59. No missing data sources.

---

## Module Reference

- **Module 8:** Webhook trigger
- **Module 9:** List Opportunities (returns array of opportunities)
- **Module 10:** Get An Opportunity (gets full opportunity details including custom fields)
- **Module 11:** Get A Contact (gets full contact details including custom fields)
- **Module 59:** TextAggregator (currently mapping fields - THIS IS WHERE MAPPINGS ARE)
- **Module 60:** Compose Transformer (passes through data)
- **Module 7:** Webhook Response (returns data to portal)

---

## Data Source Reference

### From Module 10 (Get An Opportunity) - Blueprint Interface:
According to the blueprint provided, Module 10 returns these fields in its interface:

**Key Fields Available:**
- `{{10.id}}` - Opportunity ID ✅ **AVAILABLE**
- `{{10.name}}` - Opportunity name ✅ **AVAILABLE** (currently used correctly)
- `{{10.pipelineStageId}}` - Pipeline stage ID ✅ **AVAILABLE** (currently used correctly)
- `{{10.followers}}` - Opportunity followers (array) ✅ **AVAILABLE** (but currently using wrong source)
- `{{10.customField.NXqFwEzo28k6lOkbyT5N}}` - Assigned BA custom field ✅ **AVAILABLE** (currently used correctly)

**Full Interface from Blueprint:**
- `id` (text) - Opportunity ID
- `name` (text) - Name
- `pipelineStageId` (text) - Pipeline Stage ID
- `followers` (array) - Followers
- `customFields` (array) - Custom Fields (includes Assigned BA field)

**Conclusion:** `{{10.id}}` IS available in Module 10's output according to the blueprint interface. The current mapping using `{{11.id}}` is incorrect.

---

### From Module 11 (Get A Contact) - Blueprint Interface:
According to the blueprint provided, Module 11 returns these fields:

**Key Fields Available:**
- `{{11.id}}` - Contact ID ❌ **WRONG SOURCE** (currently used for opportunity.id, but should use {{10.id}})
- `{{11.firstName}}` - Contact first name ✅ **AVAILABLE** (currently used correctly)
- `{{11.lastName}}` - Contact last name ✅ **AVAILABLE** (currently used correctly)
- `{{11.email}}` - Contact main email ✅ **AVAILABLE** (currently used, but missing partner email)
- `{{11.followers}}` - Contact followers ❌ **WRONG SOURCE** (currently used, but should use {{10.followers}})
- `{{11.customField.xFKbtz7Lt1X2nNTeFSSH}}` - Partner Name custom field ✅ **AVAILABLE** (but currently hardcoded to null)
- `{{11.customField.d0iUirsqy4kdUVMpHLfD}}` - Partner Email custom field ✅ **AVAILABLE** (but currently not used)

**Full Interface from Blueprint:**
- `id` (text) - Contact ID
- `firstName` (text) - First Name
- `lastName` (text) - Last Name
- `email` (text) - Email
- `followers` (array) - Followers
- `customField` (collection) - Custom Fields (includes Partner Name and Partner Email)

---

## Next Steps

**All required data is available** - confirmed from blueprint interfaces. We just need to fix the mappings:

1. **Simple field replacements (3 fields):**
   - Change `{{11.id}}` → `{{10.id}}` for opportunity ID
   - Change `null` → `{{11.customField.xFKbtz7Lt1X2nNTeFSSH}}` for partner name
   - Change `{{11.followers}}` → `{{10.followers}}` for follower

2. **Email combination (1 field):**
   - Need to combine `{{11.email}}` + `{{11.customField.d0iUirsqy4kdUVMpHLfD}}` with `\n` separator
   - May need Make.com expression like: `{{11.email}}{{if(empty(11.customField.d0iUirsqy4kdUVMpHLfD); ""; "\n" + 11.customField.d0iUirsqy4kdUVMpHLfD)}}`
   - Or simpler: `{{11.email}}\n{{11.customField.d0iUirsqy4kdUVMpHLfD}}` (if Make.com handles empty values gracefully)

3. **Handle null/empty values:**
   - Partner name: Use `{{11.customField.xFKbtz7Lt1X2nNTeFSSH}}` - Make.com should return empty string if null
   - Partner email: Expression above handles empty case

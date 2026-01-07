# Missing Fields Audit

## Fields Currently NOT Collected in Form

### Critical Missing Fields (Required for GHL/Email/Deal Sheet)

1. **Template Type** (`template_type`)
   - **GHL Reference:** `{{ custom_objects.property_reviews.template_type }}`
   - **Type:** Dropdown
   - **Options:** Standard, H&L with Sales Assessment, H&L without Sales Assessment, Project
   - **Purpose:** Determines email subject line format and form fields shown
   - **Status:** ❌ NOT COLLECTED

2. **Selling Agent** (`selling_agent`) - Combined Field
   - **GHL Reference:** `{{ custom_objects.property_reviews.selling_agent }}`
   - **Type:** Text (free text, single field)
   - **Format:** "Name, Email, Mobile" (e.g., "John Smith, john.smith@email.com, 0412 345 678")
   - **Purpose:** Selling agent contact info (all in one field)
   - **Note:** We have separate `agentName`, `agentMobile`, `agentEmail` but NOT the combined field
   - **Status:** ⚠️ PARTIAL (have separate fields, missing combined field)

3. **Accepted Acquisition Target** (`accepted_acquisition_target`)
   - **GHL Reference:** `{{ custom_objects.property_reviews.accepted_acquisition_target }}`
   - **Type:** Text (numeric)
   - **Purpose:** Target acquisition price (single value)
   - **Note:** We have `acceptableAcquisitionFrom` and `acceptableAcquisitionTo` but NOT the single target field
   - **Status:** ⚠️ PARTIAL (have range, missing target)

### Fields Required for Deal Sheet (But Not Currently Used)

4. **Price Group** (`price_group`)
   - **GHL Reference:** `{{ custom_objects.property_reviews.price_group }}`
   - **Type:** Text or Dropdown (to be determined)
   - **Purpose:** Price grouping/category
   - **Status:** ❌ NOT COLLECTED
   - **Note:** Currently not used but needs to be in form feed

5. **Marketing Use** (`marketing_use`)
   - **GHL Reference:** `{{ custom_objects.property_reviews.marketing_use }}`
   - **Type:** Text or Dropdown (to be determined)
   - **Purpose:** Marketing use field
   - **Status:** ❌ NOT COLLECTED
   - **Note:** Currently not used but needs to be in form feed

6. **Commissions Incl GST** (`commisions_incl_gst`)
   - **GHL Reference:** `{{ custom_objects.property_reviews.commisions_incl_gst }}`
   - **Type:** Text (numeric) or Currency
   - **Purpose:** Commissions including GST
   - **Status:** ❌ NOT COLLECTED
   - **Note:** Currently not used but needs to be in form feed

7. **Expected Build Window Months** (`excpected_build_window_months`)
   - **GHL Reference:** `{{ custom_objects.property_reviews.excpected_build_window_months }}`
   - **Type:** Text (numeric)
   - **Purpose:** Expected build window in months
   - **Visibility:** Only visible for H&L/Projects
   - **Status:** ❌ NOT COLLECTED
   - **Note:** Currently not used but needs to be in form feed

8. **EOI Contract Info** (`eoi_contract_info`)
   - **GHL Reference:** `{{ custom_objects.property_reviews.eoi_contract_info }}`
   - **Type:** Textarea (free text)
   - **Purpose:** EOI contract information
   - **Status:** ❌ NOT COLLECTED
   - **Note:** Currently not used but needs to be in form feed

### Workflow/Approval Fields (May Not Need in Form)

9. **Packager Approved** (`packager_approved`)
   - **Type:** Yes/No
   - **Purpose:** Approval flag from packager
   - **Status:** ❓ MAY NOT NEED (set automatically on submit?)

10. **BA Approved** (`ba_approved`)
    - **Type:** Yes/No
    - **Purpose:** Approval flag from Business Analyst
    - **Status:** ❓ MAY NOT NEED (set by BA, not packager)

11. **Resubmit for Testing** (`resubmit_for_testing`)
    - **Type:** Yes/No
    - **Purpose:** Flag to resubmit for testing
    - **Status:** ❓ MAY NOT NEED (workflow flag, not form input)

## Summary

### Must Add (Critical):
- ✅ Template Type
- ✅ Selling Agent (combined field) OR keep separate fields but ensure combined field is populated
- ✅ Accepted Acquisition Target (single value)

### Should Add (For Deal Sheet):
- ⚠️ Price Group
- ⚠️ Marketing Use
- ⚠️ Commissions Incl GST
- ⚠️ Expected Build Window Months
- ⚠️ EOI Contract Info

### May Not Need (Workflow Flags):
- ❓ Packager Approved (set automatically?)
- ❓ BA Approved (set by BA, not packager)
- ❓ Resubmit for Testing (workflow flag)

## Fields We HAVE But May Need Mapping:

1. **Packager** (`packager`) - ✅ HAVE (in FormData)
2. **Sourcer** (`sourcer`) - ✅ HAVE (in FormData)
3. **Status** (`status`) - ✅ HAVE (in DecisionTree)
4. **Deal Type** (`dealType`) - ✅ HAVE (in FormData)
5. **Review Date** (`reviewDate`) - ✅ HAVE (in FormData)
6. **Message for BA** (`messageForBA`) - ✅ HAVE (in FormData)
7. **Push Record to Deal Sheet** (`pushRecordToDealSheet`) - ✅ HAVE (in FormData)
8. **Attachments Additional Dialogue** (`attachmentsAdditionalDialogue`) - ✅ HAVE (in FormData)

## Notes:

- **Template Type** is critical - it determines the entire form structure and email format
- **Selling Agent** - Need to decide: keep separate fields OR add combined field (or both)
- **Accepted Acquisition Target** - May be calculated from From/To range, or may need separate input
- Deal Sheet fields (Price Group, Marketing Use, etc.) are "nice to have" for future use but not critical for MVP



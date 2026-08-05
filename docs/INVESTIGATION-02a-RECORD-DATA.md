# Record Data — 02a Not Firing Investigation

**Date:** 4 Aug 2026  
**Status:** RESOLVED  
**Root Cause:** The existing GHL workflow "PR → Property Review Created (Trigger)" had its trigger accidentally set to Draft while creating the new "PR New Deal Sheet Sync Trigger" workflow. Republishing the trigger fixed the issue. All 3 records processed successfully.  
**Source:** GHL export `records (51).csv`, rows 2-4

---

## Record 1: Mildura (row 2)

| Field | Value |
|-------|-------|
| Record ID | `6a713cc1bef74120e543dc46` |
| Address | Unit 1, 37 Cureton Av Mildura VIC 3500 |
| Created | Aug 04 2026 11:13 AM |
| Status | 01 Available |
| Deal Type | 05 Established |
| Property Type | Established |
| Single or Dual Occupancy | Single Occupancy |
| Contract Type | Single Contract |
| project_identifier | *(empty)* |
| is_parent_record | *(empty)* |
| project_parent_id | *(empty)* |
| lot_number | *(empty)* |
| Resubmit for testing | *(empty)* |
| Packager Approved | *(empty)* |
| BA Approved | *(empty)* |
| Push Record to Deal Sheet | *(empty)* |
| Dwelling Type | *(empty)* |
| Subject Line | *(empty)* |
| Net Price | *(empty)* |

---

## Record 2: Geraldton — 11:06 AM (row 3)

| Field | Value |
|-------|-------|
| Record ID | `6a713b2c61119ed1df3ca9f3` |
| Address | UNIT 4 12 Johnston St, Geraldton Geraldton WA 6530 |
| Created | Aug 04 2026 11:06 AM |
| Status | 01 Available |
| Deal Type | 05 Established |
| Property Type | Established |
| Single or Dual Occupancy | Single Occupancy |
| Contract Type | Single Contract |
| project_identifier | *(empty)* |
| is_parent_record | *(empty)* |
| project_parent_id | *(empty)* |
| lot_number | *(empty)* |
| Resubmit for testing | *(empty)* |
| Packager Approved | *(empty)* |
| BA Approved | *(empty)* |
| Push Record to Deal Sheet | *(empty)* |
| Dwelling Type | *(empty)* |
| Subject Line | *(empty)* |
| Net Price | *(empty)* |

---

## Record 3: Geraldton — 10:44 AM (row 4)

| Field | Value |
|-------|-------|
| Record ID | `6a713609174c71ad4606fb40` |
| Address | UNIT 4 12 Johnston St, Geraldton Geraldton WA 6530 |
| Created | Aug 04 2026 10:44 AM |
| Updated | Aug 04 2026 11:21 AM |
| Status | 01 Available |
| Deal Type | 05 Established |
| Property Type | Established |
| Single or Dual Occupancy | Single Occupancy |
| Contract Type | Single Contract |
| project_identifier | *(empty)* |
| is_parent_record | *(empty)* |
| project_parent_id | *(empty)* |
| lot_number | *(empty)* |
| **Resubmit for testing** | **Yes** |
| Packager Approved | *(empty)* |
| BA Approved | *(empty)* |
| Push Record to Deal Sheet | *(empty)* |
| Dwelling Type | *(empty)* |
| Subject Line | *(empty)* |
| Net Price | *(empty)* |

---

## Comparison: Last Successful Record (row 5 — Tarneit)

| Field | Value |
|-------|-------|
| Record ID | `6a707291d2c48bc742c28ef7` |
| Address | 29 Waight Ct Tarneit VIC 3029 |
| Created | Aug 03 2026 08:50 PM |
| Status | *(visible in row 5 of CSV)* |
| Deal Type | 05 Established |

This record successfully triggered 02a at ~8:57 PM on 3 Aug.

---

## Analysis

### Key Observations

1. **`project_identifier` is empty on all 3 failing records** — so a filter like "project_identifier is empty" would INCLUDE them, not exclude them. This rules out the hypothesis in the investigation doc.

2. **All records have Status = "01 Available"** — this is expected for new records.

3. **Record 3 (6a713609174c71ad4606fb40) has `Resubmit for testing = Yes`** — this was likely set manually after 02a failed to fire, as a retry attempt. The 02a "Resubmit" trigger fires on Changed (resubmit=yes), which ALSO didn't fire.

4. **All field values look normal** — Deal Type, Occupancy, Contract Type, Property Type all have expected values. There's nothing obviously "wrong" with the data that would cause a filter to exclude them.

5. **The issue is NOT data-related** — since the values are unremarkable and match the pattern of previous successful records, the problem is likely at the GHL platform/workflow level, not a field-value filter issue.

---

## Likely Root Causes (revised)

Since the data looks normal, the issue is almost certainly one of:

1. **GHL Workflow silently stopped/paused** — Check if the workflow shows "Published" but has actually stalled. GHL has known issues where workflows stop processing without changing their visible status.

2. **The new Draft workflow ("PR New Deal Sheet Sync Trigger") interfered** — Despite being in Draft, GHL may have a bug where creating a new Custom Object workflow with a "Changed" trigger disrupts existing workflows on the same object. This is the most suspicious change made today (~10:15 AM — just before the 10:44 AM record).

3. **GHL platform outage/delay** — Check GHL status page for any incidents on 4 Aug 2026.

---

## Recommended Immediate Actions

1. **Toggle the existing workflow off and back on** — Unpublish "PR → Property Review Created (Trigger)", wait 30 seconds, republish it. This forces GHL to re-register the triggers.

2. **Delete the Draft workflow** — Remove "PR New Deal Sheet Sync Trigger" entirely (we can recreate it later). If a Draft workflow on the same Custom Object is causing interference, removing it eliminates that variable.

3. **Re-test** — After steps 1-2, manually resubmit one of the Geraldton records (set `resubmit_for_testing = Yes` on a record that doesn't already have it, or clear and re-set it on record 6a713609174c71ad4606fb40).

4. **If still broken** — Manually fire the webhook for these records by sending a test payload to the 02a webhook URL.

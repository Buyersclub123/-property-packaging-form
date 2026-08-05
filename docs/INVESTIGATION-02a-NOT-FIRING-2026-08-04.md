# Investigation: Scenario 02a Not Firing for New Records

**Date:** 4 Aug 2026
**Priority:** HIGH — Packager emails not being sent

---

## Problem

Two records were created today (4 Aug 2026) and show in Scenario 02b's history, but Scenario 02a has NOT fired since 3 Aug 2026 ~8:57pm. No packager email was sent for these records.

**Affected Records:**
- UNIT 4 12 Johnston St, Geraldton WA 6530 — Created 4 Aug 2026, 10:44 AM
- UNIT 4 12 Johnston St, Geraldton WA 6530 — Created 4 Aug 2026, 11:06 AM (duplicate?)

---

## What We Know

1. **Scenario 02b** (Form App Property Submission to GHL) DID run — records were created in GHL
2. **Scenario 02a** (GHL Property Review Submitted — approval & email processing) did NOT run — last execution was 3 Aug 8:57pm
3. **GHL Workflow** "PR → Property Review Created (Trigger)" execution logs show NO entries for today — the workflow did not enroll these records

---

## Flow (how it should work)

```
Form submitted → 02b creates record in GHL → GHL workflow fires → sends webhook to 02a → 02a sends packager email
```

The break is between step 2 and step 3: GHL workflow is not triggering.

---

## Change Made This Morning (likely NOT the cause)

This morning (4 Aug ~10:15am) we created a NEW GHL workflow called **"PR New Deal Sheet Sync Trigger"**:
- Custom Object (Property Review) based workflow
- Trigger: Property Review Changed (no filters)
- Action: Custom Webhook (no URL configured yet)
- **Status: DRAFT (not published)**

Because it is in Draft mode and has no URL configured, it should have ZERO effect on anything. However, noting it here for completeness.

---

## Investigation Steps

1. **Check GHL Workflow "PR → Property Review Created (Trigger)":**
   - Is it still Published? (screenshot showed it was as of earlier today)
   - Check the "Created" trigger — does it have a filter/condition like `project_identifier is empty`?
   - Check enrollment settings — is there a re-enrollment limit?

2. **Check the Geraldton records in GHL:**
   - Do they have a `project_identifier` value? (if so, the Created trigger's filter would exclude them)
   - Were they created via the expected path (02b → GHL API)?
   - Check the record's enrollment history in the workflow

3. **Check if this is a broader issue:**
   - Were there other records created between 3 Aug 8:57pm and now?
   - Is the GHL workflow paused or hitting a rate limit?

4. **Check Scenario 02a webhook:**
   - In Make.com, go to 02a → Webhook → check if it's receiving data or if the webhook is disabled/paused

---

## Key References

- **02a Blueprint (latest):** `make-com-scenarios/02a GHL Property Review Submitted approval & email processing.blueprint (37).json`
- **02a Webhook hook ID:** 2216766
- **02a Webhook URL:** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- **GHL Workflow name:** "PR → Property Review Created (Trigger)"
- **GHL Object ID:** 692d04e3662599ed0c29edfa
- **Existing workflow triggers:** Created, Changed (Resubmit=yes), Changed (BA Approved), Changed (Packager Approved)

---

## Most Likely Cause

The GHL workflow's "Created" trigger has a condition that these records don't satisfy. Check whether the trigger filters on `project_identifier is empty` — if the form sets a project_identifier on these records, they'd be excluded from the Created trigger and would never fire 02a.

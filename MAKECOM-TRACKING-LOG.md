
## 2026-03-15

Received 1 project packager QA email (expected).

Issue: Body Corp Per Quarter ($) is not populating in the email.

Issue: Body Corp Description is not populating in the email (record has a value).

Approved project email:

Deal List: 5 separate records/rows created (expected).

Issue: QA to verify email sent 5 times (should be 1 per project).

Issue: QA to verify email missing lot-specific info (content appears shared/general; no per-lot sections like purchase price/rental assessment).

Update: Lot-specific info now present in project emails (Purchase Price / Rental Assessment etc. per lot).

Update: Body corp fields now appear correctly in output when present (Body corp. per quarter + Body corp. description).

Root cause (duplicate emails): GHL workflow uses multiple "Property Review Changed" triggers (e.g. Packager Approved / BA Approved / Resubmit for testing) which fire per-record; for projects each lot is its own record, so a change can trigger multiple webhook calls.

Observed GHL workflow triggers:
- Property Review Created (filtered: project_identifier is empty) => non-project only.
- Property Review Changed (filtered: Resubmit for testing? has changed to Yes).
- Property Review Changed (filtered: BA Approved has changed to Approved).
- Property Review Changed (filtered: Packager Approved has changed to Approved).

Recommended fix: Add one gating condition immediately before the Custom Webhook step:
- Allow only if is_parent_record is not "no" (blocks child lots, allows parent and allows singles if blank).

Next: Implement gating condition in GHL workflow and re-test a multi-lot project to confirm only one email per stage.

Note: Deal sheet duplicates can still occur during testing if the same project_identifier is processed multiple times (manual reruns / multiple approvals), because the sheet write uses addRow (append) and is not idempotent.

Future hardening (optional): In 02a, before the Deal sheet google-sheets:addRow, add a guard that searches existing rows and only adds if not found:
- Match keys: project_identifier + lot_number (or record id)
- Condition: if no existing row, then addRow; else skip


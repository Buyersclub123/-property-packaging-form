# Deployment scope agreement (Dev -> Prod)

## Objective
Align Dev with the current Production snapshot for the form app **except** for the approved **Edit Tool** improvements. Deploy from a clean commit so production receives **only** the intended changes.

## Source of truth
- Production snapshot baseline: `dpl_9Uxje6XbT…` (Production Backup folder).

## Rules we are following
- Edit Tool must work in Production exactly as it does in Dev.
- **Edit Tool related changes are allowed to differ from the Production snapshot and must be deployed.**
- **Everything not required for the Edit Tool must match the Production snapshot** to avoid regressions.
- Work **one file at a time** and avoid unrequested changes.

## Confirmed Edit Tool components (deploy to prod)
These are part of the Edit Tool surface area and are intended to ship:
- `src/app/properties/[id]/edit/page.tsx`
- `src/components/MultiStepForm.tsx` (edit-mode loading behavior)
- `src/app/api/properties/[recordId]/route.ts` (GHL record GET/PUT used by edit flow)

## File-by-file decisions made so far
### 1) `src/app/api/properties/[recordId]/route.ts`
- **Decision:** Treat as **Edit Tool**. It must be deployed.
- **Cache-busting:** Keep `_t=Date.now()` cache-busting on the GHL GET request (important).
- **Logging:** Diagnostic logging was discussed. Any logging adjustments must not break the build.

### 2) Submission / No-resubmit guard (must ship tonight)
#### `src/components/steps/Step8Submission.tsx`
- **Decision:** Deploy.
- **Reason:** Hard guard to prevent resubmitting a property after successful submission.
- **Notes:** Persist `ghlRecordId`/`submittedAt` on success; clear `submissionAttempted` on failure to allow retry.

#### `src/components/steps/Step6FolderCreation.tsx`
- **Decision:** Deploy.
- **Reason:** Re-enable success screen after successful submission.
- **Notes:** `setShowSuccess(true)` was previously commented out and is now active.

## Decision log (use this for TODO #2)
When reviewing diffs vs the production snapshot, record each file here before changing it.

Template:
- **File:** `...`
  - **Class:** Edit Tool | Non–Edit Tool | Required (No-resubmit) | Unknown
  - **Decision:** Keep Dev | Revert to Prod Snapshot | Defer
  - **Reason:** ...

Current working set (from `git diff --name-status -- src`):
- **File:** `src/app/api/properties/[recordId]/route.ts`
  - **Class:** Edit Tool
  - **Decision:** Keep Dev
  - **Reason:** Required for Edit Tool GET/PUT; approved to ship.

- **File:** `src/components/steps/Step6FolderCreation.tsx`
  - **Class:** Required (No-resubmit)
  - **Decision:** Keep Dev
  - **Reason:** Re-enabled success screen after successful submission.

- **File:** `src/components/steps/Step8Submission.tsx`
  - **Class:** Required (No-resubmit)
  - **Decision:** Keep Dev
  - **Reason:** Hard guard + persisted submission state.

- **File:** `src/components/steps/step5/WhyThisPropertyField.tsx`
  - **Class:** Non–Edit Tool
  - **Decision:** Keep Dev
  - **Reason:** Already synced to match the production snapshot.

- **File:** `src/store/formStore.ts`
  - **Class:** Non–Edit Tool
  - **Decision:** Revert to Prod Snapshot
  - **Reason:** Contains extra `noMessageNeeded` initial state not present in prod snapshot; not required for Edit Tool or no-resubmit.

- **File:** `src/types/form.ts`
  - **Class:** Non–Edit Tool
  - **Decision:** Revert to Prod Snapshot
  - **Reason:** Contains extra `noMessageNeeded` field not present in prod snapshot; not used.

- **File:** `src/app/test-all-categories/page.tsx`
  - **Class:** Non–Edit Tool
  - **Decision:** Keep deletion (matches Prod Snapshot)
  - **Reason:** Not present in production snapshot.

- **File:** `src/app/test-folder-creation/page.tsx`
  - **Class:** Non–Edit Tool
  - **Decision:** Keep deletion (matches Prod Snapshot)
  - **Reason:** Not present in production snapshot.

- **File:** `src/app/test-proximity/page.tsx`
  - **Class:** Non–Edit Tool
  - **Decision:** Keep deletion (matches Prod Snapshot)
  - **Reason:** Not present in production snapshot.

- **File:** `src/app/test-sheets-population/page.tsx`
  - **Class:** Non–Edit Tool
  - **Decision:** Keep deletion (matches Prod Snapshot)
  - **Reason:** Not present in production snapshot.

- **File:** `src/app/test/proximity-api/page.tsx`
  - **Class:** Non–Edit Tool
  - **Decision:** Keep deletion (matches Prod Snapshot)
  - **Reason:** Not present in production snapshot.

- **File:** `src/app/washington-brown/page.tsx`
  - **Class:** Non–Edit Tool
  - **Decision:** Keep deletion (matches Prod Snapshot)
  - **Reason:** Not present in production snapshot.

## Non–Edit Tool code
- Any file not required for the Edit Tool must be reverted/synced to match the Production snapshot.
- Example non-edit-tool file previously identified for review: `src/components/steps/step5/WhyThisPropertyField.tsx`.

## Next steps
- Define/confirm any additional files that are required by the Edit Tool.
- Sync remaining non-edit-tool files to the Production snapshot.
- Create a clean deploy commit containing:
  - Production snapshot sync changes (non-edit-tool)
  - Edit Tool changes

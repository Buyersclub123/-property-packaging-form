# Experimental Changes - NOT FOR PRODUCTION

**Last Updated:** $(Get-Date -Format "yyyy-MM-dd")

## Files with Skip-Worktree (Git ignores local changes)

These files are tracked in Git but have local changes that should NOT be committed to production:

1. **src/components/steps/Step2PropertyDetails.tsx** - Line ending differences only (no code changes)
2. **src/components/steps/Step6FolderCreation.tsx** - Line ending differences only (no code changes)
3. **src/components/steps/Step8Submission.tsx** - Line ending differences only (no code changes)
4. **src/components/steps/step5/WhyThisPropertyField.tsx** - Line ending differences only (no code changes)

**Reason:** These are experimental changes or line ending differences that we decided not to use or went in a different direction.

## Other Modified Files (Not Protected)

These files have changes but are NOT protected with skip-worktree. Review before committing:

- **src/components/steps/step5/ProximityField.tsx** - Small code change (removed redundant check)
- **src/app/api/geoapify/proximity/route.ts** - Your changes
- **src/app/test-proximity/page.tsx** - Your changes
- **vercel.json** - Your changes
- **PRIORITY-CHECKLIST.md** - Your changes

## How to Remove Skip-Worktree (if needed later)

If you want to commit these files later, run:
```bash
git update-index --no-skip-worktree src/components/steps/Step2PropertyDetails.tsx
git update-index --no-skip-worktree src/components/steps/Step6FolderCreation.tsx
git update-index --no-skip-worktree src/components/steps/Step8Submission.tsx
git update-index --no-skip-worktree src/components/steps/step5/WhyThisPropertyField.tsx
```

## Status Check

To see which files have skip-worktree enabled:
```bash
git ls-files -v | Select-String "^S"
```

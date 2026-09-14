# Project rules for AI agents

## Deployment workflow — IMPORTANT
- Workflow: make changes locally → user tests on the local dev server (`npm run dev`, localhost:3000) → ONCE the user confirms dev testing is done, commit and push to GitHub → the USER then pulls that deployment into production via Vercel themselves.
- Committing/pushing to GitHub is the agent's job, but ONLY after the user says dev testing passed. Never commit untested changes.
- BEFORE every commit: list the exact changes in the batch and ask the user to confirm THAT LIST is tested and approved. Do not infer approval from a general "tests fine" — get explicit confirmation against the list. One batch = one explicit approval.
- Pushing to GitHub does NOT deploy to production — the user manually promotes it from Vercel as a deliberate safety gate.
- DOCUMENTS ARE NEVER COMMITTED: `.md` docs, notes and trackers stay untracked (this is why `docs/` is full of untracked files). Do not `git add` anything in `docs/` or other documentation files.
- Do NOT run `npm run build` while the dev server is running — they share `.next` and it corrupts the dev server.

## Verification
- Type-check with: `npx tsc --noEmit -p tsconfig.json` (two pre-existing errors in Step2PropertyDetails.tsx and Step9PhotoDocuments.tsx are known/unrelated; the Next build skips type validation).

## Conventions
- The Contract Team Reporting Tool feedback tracker lives at `docs/contract-team-reporting-feedback.md` — log user feedback there as numbered items before acting; do not act on items marked "do not action yet".
- Alert emails for the reporting tool go to john.t@buyersclub.com.au and julie.l@buyersclub.com.au (see `src/app/api/contract-team-reporting/alerts.ts`).

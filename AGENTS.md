# Project instructions

## Current phase

The project owner approved development on 2026-09-24 and publication on 2026-09-26. V1 is live at https://reportburst.vercel.app/. Keep future changes consistent with `SPEC.md` and verify each release on the production URL.

## Source of truth

Read `SPEC.md` before product or architecture decisions. Follow the project owner's latest explicit instructions if they change the scope. Keep `PLAN.md` and `STATUS.md` accurate.

## Non-negotiable product rules after development is approved

- Spreadsheet contents and metadata must remain in the user's browser. Never introduce any network transmission of spreadsheet contents without explicit product approval.
- V1 is a static, public Web App with no spreadsheet-processing backend, user accounts, cloud storage, AI API, real payments or direct email sending.
- Keep spreadsheet business logic separate from the React UI. Prefer simple, testable code and commercially compatible dependencies.
- Never silently corrupt workbook data or silently choose among conflicting recipients.
- Preview and export must use the same generation plan.

## Quality

Once code exists, run the relevant typecheck, lint, unit/integration tests and production build before declaring a milestone complete. Verify browser behavior for the core flow. Add a regression test for a bug when practical. Record technical decisions, limitations and verification evidence in `STATUS.md`.

If a requirement conflicts with another requirement or cannot be met reliably, document the conflict and obtain a product decision before implementing a user-visible compromise.

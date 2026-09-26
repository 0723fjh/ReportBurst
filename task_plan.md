# Active implementation plan

Goal: Deliver the ReportBurst V1 described in `SPEC.md`: browser-only spreadsheet processing, report split, preview, XLSX/ZIP/EML download, and deployment-ready static build.

## Phases

1. **Technical validation (complete)** — ExcelJS browser read/write and MIT license verified; formula and merge limitations identified.
2. **Foundation (complete)** — Vite/React/TypeScript app with lint, tests, build.
3. **Core processing (complete for core flow)** — parse XLSX/CSV, detect headers, group rows, resolve recipients, build a deterministic plan.
4. **Export (complete for core flow)** — generate per-group XLSX, ZIP and attached EML locally.
5. **UI (complete for core flow)** — upload/configure/preview/generate/download with warnings and accessible controls.
6. **Verification (complete for local V1)** — unit/integration/browser tests, format fixtures, privacy and performance checks.
7. **Handoff (complete for local V1)** — README, limitations, license notes, deployment preparation and status.
8. **Localization (complete for local V1)** — English/Simplified Chinese interface, browser-language default, saved preference, localized defaults and validation messages; browser regression check.

## Guardrails

- No file content or metadata leaves the browser.
- No five-report limit, payments, accounts, backend or direct email sending.
- Never silently corrupt data or choose conflicting recipients.
- Do not claim public deployment without a verified production URL.

## Errors encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| npm registry lookup could not write its default cache outside the workspace (`EPERM`) | `npm view` with default cache | Retry with a cache inside this workspace. |
| TypeScript flagged an optional Papa Parse error row | First typecheck | Handle an absent row number in the error message. |
| TypeScript requires a Node Buffer in a test's ExcelJS load call | First test typecheck | Wrap the ZIP bytes with `Buffer.from` in the Node test. |
| First candidate patch for recipient suggestions had an invalid patch hunk | Patch application | Corrected the patch syntax; no source file was changed by the failed attempt. |
| ExcelJS and current Node Buffer declarations disagree in test-only load calls | Build typecheck after adding E2E | Cast the Node test input at the library boundary; runtime behavior is exercised by the tests. |
| 100k CSV did not complete after moving parse to a worker | Browser performance run | Found `Math.max(...100k rows)` can exceed the argument limit; replaced it with a loop and will retest. |
| New E2E case failed to parse because `await` was used inside a non-async callback | First expanded E2E run | Await the download path before the file-read callback. |
| Python's standard MIME parser chose the ASCII fallback filename over RFC 2231 Unicode continuation | Unicode EML check | Put the extended filename parameters first; rebuild and verify with an independent parser. |

## Current next step

Await owner review for public publication; if authorized, deploy and verify the production URL.

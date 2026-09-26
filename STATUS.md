# ReportBurst status

**Phase:** V1 published and verified at https://reportburst.vercel.app/.

**Product decision:** V1 has no five-report cap, payment flow, Pro restriction, account, backend or direct email sending.

## Implemented

- Static React/TypeScript/Vite Web App with an upload → configure → preview → download workflow.
- XLSX/CSV import, sheet and header selection, sample preview, group splitting, recipient resolution and explicit handling of missing/conflicting email and blank groups.
- One deterministic `GenerationPlan` used by preview and ZIP export. The full workbook and export run in a browser worker; the page receives only a small sample and group summaries.
- Per-group XLSX reports, optional `.eml` drafts with matching XLSX attachments, and ZIP download. No cap on the number of reports.
- User-facing errors for unsupported formats and data patterns, plus basic keyboard and label accessibility.
- English/Simplified Chinese interface switching with browser-language default and a locally saved preference. Core validation and processing messages are localized; user-edited templates and spreadsheet data remain unchanged.
- A Chinese end-user guide (`使用说明.md`) covers the current local workflow, recipient decisions, downloaded files, privacy and limitations.

## Verification on 2026-09-24

| Check | Result |
| --- | --- |
| TypeScript typecheck | Passed via `npm run build` |
| ESLint | Passed |
| Unit/round-trip tests | 9 passed |
| Edge browser end-to-end tests | 5 passed against the local production preview, including Chinese switching, CSV/Excel ZIP downloads, and reopening generated XLSX |
| Static production build | Passed; `dist/` contains static assets only |
| Privacy request check | Tested CSV flow made only GET requests to the local app origin; no file-content request observed |
| MIME check | Python standard email parser read long Unicode subject, Unicode filename and intact XLSX attachment |
| Visual check | Landing and configured workflow screenshots inspected at 1440 px; no page errors |

Performance on one Windows/Edge machine with five groups: 1k/10k/50k/100k-row CSV files completed download. In the final worker architecture, approximate file-read-to-ready times were 295/133/275/456 ms, and generation-to-download times were 306/331/995/2044 ms. A 50k-row XLSX sample (856 KB) took about 5.1 s to read and 0.8 s to generate/download. These are sample observations, not guarantees for other devices or workbook shapes.

## Deployment preparation on 2026-09-26

- Added `vercel.json` with Vite, `npm run build` and `dist`; added `.vercelignore` to exclude sample workbooks, tests, scripts, documentation and local build output from source uploads. `.gitignore` excludes `outputs/` and `.vercel/`.
- Re-ran typecheck, lint, 9 unit tests, static build and 5 Edge browser tests against the production preview; all passed. The browser test checks that a sample CSV flow makes only GET requests to the local app origin.
- `dist/` contains only `index.html`, one CSS asset, one app JavaScript asset and one worker JavaScript asset. No app source call to `fetch`, `XMLHttpRequest` or `sendBeacon` was found.
- `npm audit --omit=dev` still reports a moderate transitive `uuid` advisory through ExcelJS 4.4.0. The app's installed ExcelJS source imports only UUID v4; the advisory concerns v3/v5/v6 buffered APIs. This is a scoped code inspection, not a claim of zero dependency risk.
- The Vercel CLI login could not complete on this Windows machine due to a character-encoding error. The owner instead published the reviewed `dist/` build with Vercel Drop.

## Production verification on 2026-09-26

- Public URL: https://reportburst.vercel.app/. An isolated Edge browser received HTTP 200, the ReportBurst page title, and the Chinese interface.
- The five Edge browser end-to-end tests passed against the production URL. They cover CSV and XLSX upload, per-group ZIP and EML output, generated XLSX contents, conflicting and missing recipients, blank split values, more than five groups, Chinese/English switching, and a request check that observed only GET requests to the app origin for the sample CSV flow.
- The first production run had one false failure in the mobile language-menu check because the test retained a scrolled position after editing fields. The test now scrolls to the page top before checking the header menu; a separate 375 px browser check found the menu at x=274, y=20, and all five tests then passed. This was a test-only change; the published app files did not change.
- Vercel Drop is not connected to this local folder for automatic redeployment. Future app changes require a new deployment workflow.

## GitHub integration on 2026-09-27

- Created the private repository https://github.com/0723fjh/ReportBurst and pushed the reviewed V1 source on `main` (initial commit `bdfeba8`). Build output, sample workbooks, local environment files and caches are excluded from Git.
- Linked the local folder to the existing Vercel project `dopamine15/reportburst`. The public site remains live.
- Vercel rejected `vercel git connect` because the Vercel account does not yet have a GitHub login connection. The owner needs to add GitHub account `0723fjh` in Vercel account Authentication settings, then the connection can be retried.

## Known limitations and risks

- Input cap: 40 MB. Legacy `.xls`, encrypted workbooks, non-UTF-8 CSV and CSV delimiter customization are not supported.
- Formula cells, complex cell values and merged cells in the chosen sheet block export to avoid silent data corruption. Charts, pivot tables, macros, external links and other workbook features are not copied. See `README.md` for the full list.
- ExcelJS 4.4.0 has a moderate transitive UUID advisory in `npm audit --omit=dev`. The affected UUID v3/v5/v6 buffered APIs are not used in ReportBurst; ExcelJS uses v4 in the inspected source. Recheck dependencies before future releases.
- `.eml` was checked with an independent MIME parser, but has not been manually opened in multiple desktop email clients.
- The interface supports English and Simplified Chinese; generated workbook sheet names and some technical parser details can still be English. Uploaded spreadsheet values and user-edited templates are not translated.
- Browser checks use generated sample files, not the owner's real workbooks. Compatibility with representative real files and downloaded EML behavior in the owner's email client remain unverified.

## Next action

The public V1 is live. Complete the GitHub login connection in Vercel, connect the existing project to the private repository, then verify a Git-triggered production build on the same URL.

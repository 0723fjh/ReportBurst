# Findings

## Workspace

- Initially contained only six Markdown planning documents and no Git repository.
- Local Node.js is v24.13.0 and npm is v11.6.2.

## Source requirements

- Public static Web App, but spreadsheet parsing/export remains in the user's browser.
- `.xlsx` and `.csv` input; per-group XLSX reports; ZIP and attached `.eml` drafts.
- Preview and export must use the same deterministic plan.
- V1 has no five-report cap, payment flow, accounts, backend or direct send.

## Library decision

- ExcelJS 4.4.0 has an MIT license and passed a real Edge browser read/write flow. A Node round-trip preserved a currency number format and column data. It does not rewrite formula references after splitting, so the app blocks sheets containing formulas; merged cells are also blocked.
- SheetJS Community Edition documents browser XLSX output and Apache-2.0 licensing; style preservation needs evaluation.
- Vite and Vercel document static production deployment.
- JSZip 3.10.2 is dual MIT/GPL; this project uses the MIT option. Papa Parse 5.7.0 is MIT.
- npm audit reports a moderate UUID advisory through ExcelJS. The affected UUID v3/v5/v6 buffer API is not called by this app; document and revisit before production publication.

## Verification so far

- Production build passed; initial lint and five core tests passed.
- Edge browser end-to-end checks passed for CSV ZIP/XLSX/EML output and XLSX recipient conflict blocking.
- Browser request capture for a distinctive CSV marker saw only GET requests for local static resources; no spreadsheet network transmission in that path.
- Visual screenshots at 1440 px showed a usable landing page and configured workflow without console exceptions.
- The final worker architecture retains the full workbook in the worker and sends only a sample/group summary to the page. In Edge, a 100k-row CSV became ready in about 0.46 s and downloaded in about 2.0 s; a 50k-row XLSX became ready in about 5.1 s and downloaded in about 0.8 s.
- Python's standard email parser validated a long Unicode subject, Unicode filename and intact XLSX attachment after a generated EML was extracted from the production-preview ZIP.
- Four browser E2E tests passed against the static production preview, including more than five report groups and missing/blank-data decisions.

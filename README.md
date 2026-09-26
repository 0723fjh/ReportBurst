# ReportBurst

**Turn one spreadsheet into ready-to-send reports.**

ReportBurst is a static Web App for turning one `.xlsx` or `.csv` spreadsheet into separate XLSX reports and optional email drafts. The flow is **choose file → choose sheet/header → choose split and recipient columns → review issues → download ZIP**. V1 has no report-count limit, login, payment flow, backend, cloud file storage, or direct email sending.

## Current status

The app is live at [https://reportburst.vercel.app/](https://reportburst.vercel.app/). The static production build passed automated browser tests against that URL. See [STATUS.md](STATUS.md) for verification evidence and [SPEC.md](SPEC.md) for the full product specification.

For step-by-step instructions for end users, see the [Chinese user guide](使用说明.md).

The interface supports English and Simplified Chinese. It starts in the saved language, or follows the browser language on first visit; users can switch languages in the header. Only the language preference is stored locally. Uploaded spreadsheet contents are never translated. Default file-name and email templates follow the selected language until the user edits them.

## Privacy model

The hosting service only serves static HTML, CSS, JavaScript and worker assets. Spreadsheet parsing, grouping, plan creation, XLSX/EML creation and ZIP packaging all run in a browser worker. The UI receives a small sample and group summaries, while the complete workbook remains in that worker until the page closes or a new file is chosen. The app code contains no backend, analytics, error tracking, cloud storage or email sending integration.

Automated Edge browser checks observed only GET requests to the app origin during a distinctive CSV sample flow, both locally and on the public URL. This supports the claim that this tested flow did not transmit spreadsheet contents; it does not prove the safety of future code changes or third-party browser extensions. Re-run the privacy check before publishing changes.

## Local development

Requirements: Node.js 20.19+ or a version supported by the installed Vite release, and npm. This project was tested with Node.js 24.13.0 and npm 11.6.2.

```bash
npm install
npm run dev
```

Open the local address printed by Vite, normally `http://localhost:5173`.

## Checks and production build

```bash
npm run typecheck
npm run lint
npm run test
npm run e2e
npm run build
npm run preview
```

`npm run e2e` uses Microsoft Edge on the development machine. If Edge is unavailable, update `playwright.config.ts` to use an installed Playwright browser and install its runtime. To run the end-to-end checks against a local production preview at `http://127.0.0.1:4173`, start `npm run preview -- --host 127.0.0.1 --port 4173`, then set `REPORTBURST_BASE_URL` to that URL before `npm run e2e`.

The production output is `dist/`. The build contains static files only; no server runtime or secret environment variables are required.

## Architecture

- `src/App.tsx` provides the upload, configuration, preview and download interface.
- `src/i18n.ts` provides the English/Simplified Chinese UI translations and language preference.
- `src/core/parse.worker.ts` owns the uploaded workbook and the current `GenerationPlan`. The main page receives only summaries, not all rows.
- `src/core/workbook.ts` parses XLSX/CSV. `src/core/sheet.ts` detects headers and describes columns.
- `src/core/plan.ts` groups rows, resolves recipients, validates issues, makes safe filenames and constructs one deterministic plan for both preview and export.
- `src/core/export.ts` creates per-group XLSX, MIME email drafts with matching attachments, and the ZIP archive.
- `tests/` contains round-trip unit and Edge browser end-to-end checks. `scripts/performance-check.mjs` runs optional CSV performance samples.

## Known limitations

- Supported input: `.xlsx` and UTF-8 `.csv`. Legacy `.xls`, password-protected workbooks and some damaged files are rejected. CSV delimiter/encoding customization has not been added.
- Only the selected data sheet and rows below the selected header are exported. Other sheets, title rows, charts, pivot tables, macros, data validation, external links and workbook-level features are not copied.
- To avoid silently wrong output, a selected sheet with formulas, complex cell values or merged cells is blocked from export. Basic values, common cell styles, number formats, column widths and row heights are copied where supported by ExcelJS. Arbitrary Excel formatting is not guaranteed.
- CSV fields starting with `=` remain text in exported XLSX; they are not evaluated as formulas.
- Workbook input is limited to 40 MB to reduce browser memory failures. CSV files with 100,000 rows were tested on one Edge/Windows machine; results vary by device and file shape. Large XLSX workbooks, many unique groups and extremely wide sheets can use substantial browser memory.
- Email drafts are `.eml` files for the user to review and send. Client display behavior can vary. Direct sending and real mailbox integration are outside V1.
- The interface currently has English and Simplified Chinese. Spreadsheet values, column names and user-edited text remain unchanged when switching languages. Generated workbook sheet names and some technical parser details can still be English.

## Dependencies and licensing

The browser workbook engine is ExcelJS 4.4.0 (MIT), chosen after verifying XLSX read/write in Edge and a basic style/number-format round trip. CSV parsing uses Papa Parse 5.7.0 (MIT), archive generation uses JSZip 3.10.2 (MIT option in its MIT/GPL dual license), and the UI uses React 19.3.0 (MIT). Verify licenses again when upgrading dependencies.

`npm audit --omit=dev` currently reports a **moderate transitive UUID advisory** through ExcelJS 4.4.0. The affected UUID v3/v5/v6 buffered APIs are not called by this app; ExcelJS source uses UUID v4 for conditional formatting identifiers. This is a scoped assessment, not a claim that every dependency risk is eliminated. Recheck before future releases.

## Deploy to Vercel

The owner published the reviewed `dist/` folder with Vercel Drop to [https://reportburst.vercel.app/](https://reportburst.vercel.app/). The project also includes `vercel.json` for the Vite build and `.vercelignore` to exclude sample workbooks, tests, documentation and development files from CLI source uploads. No serverless functions or environment secrets are required.

**Direct CLI deployment (no GitHub repository required):** After reviewing the local build, install Vercel CLI, sign in with the account owner, link this folder as a Vercel project, deploy a preview and verify it. Publish to production only after the project owner approves that concrete build. Vercel assigns a `.vercel.app` address; a custom domain is optional.

**Git-connected deployment:** The reviewed source is in the private [ReportBurst GitHub repository](https://github.com/0723fjh/ReportBurst). The existing Vercel project is linked locally; the Vercel GitHub App still needs access to this private repository before its Git integration can be enabled. `.gitignore` excludes `node_modules/`, `.npm-cache/`, `dist/`, sample outputs and Vercel's local project link. Once connected, Vercel can rebuild after later pushes.

For either route, confirm **Build Command** is `npm run build` and **Output Directory** is `dist`. On the deployed URL, test XLSX and CSV upload, sheet/header selection, recipient warnings, ZIP download, report contents and EML attachments. Check the browser Network panel for unexpected requests.

Vercel Drop does not automatically redeploy this local folder after code changes. Complete the GitHub connection before relying on automatic releases, then verify the resulting public URL.

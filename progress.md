# Progress log

## 2026-09-24

- Project owner confirmed the expanded specification and authorized development.
- Read `SPEC.md` and repository rules. Confirmed the initial workspace had documents only.
- Checked local Node/npm versions and began comparing browser spreadsheet libraries.
- Created persistent implementation plan and findings log.
- npm registry lookup failed because the default cache is outside the writable workspace; switching npm cache to a workspace directory.
- Installed project dependencies with a workspace npm cache, scaffolded the static app, and implemented initial browser parser, generation plan, XLSX/ZIP/EML exporter, and UI.
- First lint run passed. First typecheck found one optional CSV error-row issue; fixed it and will rerun.
- Production build succeeded. Five initial core tests pass, including ZIP/XLSX/EML round-trip checks and recipient-conflict blocking.
- A production dependency audit found a moderate transitive `uuid` advisory through ExcelJS; the affected UUID variants are not called by the app, but this needs a final dependency decision and documentation.
- Two Edge browser end-to-end tests passed. The first uploaded CSV, downloaded ZIP, reread an XLSX report, and checked that no spreadsheet-bearing request left the browser. The second verified that conflicting XLSX recipients block generation until resolved.
- Captured and visually inspected landing/workflow screenshots at 1440 px; no browser page errors were reported.
- Baseline Edge CSV performance before the worker: 1k parse/export 324/285 ms; 10k 1389/441 ms; 50k 9109/1148 ms; 100k 19157/2267 ms. After the first worker version, 100k exposed a spread-argument limit in CSV width detection; fixed and retesting.
- Refactored the worker to retain the workbook and plan, returning only summaries to the UI. Final 100k CSV sample became ready in about 456 ms and generated/downloaded in about 2044 ms. A 50k XLSX sample became ready in about 5081 ms and generated/downloaded in about 787 ms.
- Expanded unit tests to 9 and Edge browser tests to 4. Fixed RFC 2231 Unicode filename parameter order after an independent Python MIME parser initially chose the ASCII fallback. The parser now reads long Unicode subject, filename and attachment correctly.
- Updated the README, status and plan with actual commands, dependency licenses, verified behavior and limitations. Local production preview was tested; no public deployment has been performed.
- Owner requested additional languages and selected Simplified Chinese plus English. Added a header language selector, browser-language default, local preference, Chinese UI/validation text and localized default templates while preserving user edits. Final checks passed: typecheck, lint, 9 unit tests, production build, and 5 Edge browser tests against the local production preview. The Chinese test verifies persistence, recipient warning translation, untouched user edits and visibility at a 375 px viewport.
- On owner request, re-audited the app against `SPEC.md` and reran the checks. Extended the real Edge `.xlsx` conflict test through ZIP download and reopening the generated workbook; all 5 browser tests, 9 unit tests, typecheck, lint and production build passed. Public deployment, representative owner workbooks and desktop email-client opening remain unverified.

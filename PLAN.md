# ReportBurst plan

## Product document review (complete)

- [x] Read the referenced conversation and identify the V1 scope.
- [x] Draft `SPEC.md`, `AGENTS.md`, `START_CODEX.md`, `PLAN.md`, `STATUS.md` and `README.md`.
- [x] Project owner resolves the free-limit decision: V1 has no five-report cap.
- [x] Project owner reviews the expanded documents.
- [x] Project owner explicitly approves starting development on 2026-09-24.

## Development milestones

- [x] Inspect the repository and validate browser XLSX handling, commercial licenses, formatting and formula behavior.
- [x] Build the static Web App and the upload/configure/preview flow.
- [x] Implement deterministic grouping, recipient validation and generation planning.
- [x] Generate XLSX, ZIP and EML locally in a browser worker.
- [x] Verify core browser flow, 100k CSV performance, privacy request boundary and accessible controls.
- [x] Finish edge-case and MIME verification, document limitations and deployment steps.
- [x] Add Simplified Chinese and English interface switching, browser-language default and preference persistence; verify edited templates remain intact.
- [x] Prepare Vercel build settings and exclude test data and development files from CLI uploads; rerun local release checks.
- [x] Owner publishes the reviewed static build with Vercel Drop; verify the public production URL and core flow.
- [x] Create a private GitHub repository and push the reviewed V1 source.
- [x] Connect the existing Vercel `reportburst` project to the private GitHub repository.
- [x] Verify a push to `main` triggers a successful production deployment on the existing public URL.

Detailed implementation findings and checks are recorded in `task_plan.md`, `findings.md`, `progress.md`, and `STATUS.md`.

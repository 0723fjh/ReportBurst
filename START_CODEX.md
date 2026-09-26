# Development handoff — historical note

The project owner approved development on 2026-09-24, and implementation is underway. This file preserves the original handoff wording for future work; current scope and status are in `SPEC.md`, `PLAN.md`, and `STATUS.md`.

For a future continuation task, use this message:

> Read `SPEC.md`, `AGENTS.md`, `PLAN.md`, `STATUS.md` and `README.md` in full. Start from the repository's actual state. Implement the ReportBurst V1 described in `SPEC.md`, following the privacy boundary and acceptance checklist.
>
> First inspect the repository and validate the main technical risks: browser-only XLSX read/write, format and formula preservation, commercial dependency licenses, EML attachments, and performance. Update `PLAN.md` with milestones and checks. Then implement the smallest complete slices, run the relevant checks, fix failures, and update `STATUS.md` with evidence and known limitations after each milestone.
>
> Make ordinary engineering decisions independently. Ask for a product decision only when `SPEC.md` leaves a material conflict unresolved, when a compliant implementation is infeasible, or when an account/credential or permission is required. Do not claim that the app is deployed unless a public production URL has been tested.
>
> At the end, report what works, which checks passed, browser privacy verification, Excel library decision, performance observations, limitations, and the exact remaining steps for deployment if it is not yet public.

The project owner resolved the earlier free-limit question: V1 has no five-report cap. Do not duplicate completed work when continuing from this repository.

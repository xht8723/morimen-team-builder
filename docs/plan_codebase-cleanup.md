# Repository-Wide Cleanup and Correctness Hardening

## Goals

- Preserve the current UI, synchronous offline architecture, browser-save compatibility, production source maps, additive data updater, and existing Chaos/Ultra color corrections.
- Use the green baseline of 47 unit/integration tests and 13 passing Playwright scenarios as the behavioral contract.
- Remove stale code, dependencies, generated duplication, styling residue, and historical plan noise while strengthening domain, persistence, compiler, and UI correctness.

## Implementation checklist

- [x] Centralize slot, target, and assignment helpers; add stable failure reasons and deterministic hydration repair.
- [x] Reject duplicate unique entities in share codes while preserving the exact 17-field wire format.
- [x] Migrate browser storage losslessly from `morimens-five-team-builder` to `morimens-team-builder`.
- [x] Generate catalog schema v2 with explicit `selectable` metadata and preserve compatibility-only Primordial Memory entities.
- [x] Strengthen compiler field, manifest byte-count, and SHA-256 validation; remove runtime Zod parsing and duplicate font output.
- [x] Remove unused Immer/Tailwind/Zod code and dependencies, and localize transient About state.
- [x] Extract picker view-model logic and introduce a shared accessible modal shell.
- [x] Correct no-op, clipboard, picker reselect, and rename-cancellation behavior.
- [x] Split and prune the stylesheet without overwriting the corrected Chaos/Ultra colors.
- [x] Add explicit Oxfmt configuration, expand lint coverage, consolidate CI, and split production catalog/vendor chunks.
- [x] Replace historical plan files with a concise project history while retaining durable compatibility decisions.
- [x] Add the planned domain, compiler, persistence, localization, and UI coverage.
- [x] Run `pnpm verify`, `pnpm test:e2e`, `git diff --check`, production-output audits, and bounded desktop/mobile browser QA.
- [x] Confirm preview port 4173 and project Vite processes are clear after verification.

## Compatibility constraints

- Keep the synchronous catalog-loading and offline-only runtime model.
- Keep valid historical five-team and current ten-team saves.
- Keep the exact `@@...@@` 17-field share-code format.
- Keep compatibility-only entities renderable from old saves, but prevent new selection.
- Do not prune tracked raw records/assets or translation overlays.
- Do not update dependency versions beyond removing dependencies made obsolete by this cleanup.

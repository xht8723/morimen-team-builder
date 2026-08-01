# Expand the Builder to Ten Teams

## Goals

- Expand the fixed builder roster from five to exactly ten teams.
- Preserve all existing team-building, uniqueness, import, share-code, persistence, and Undo rules.
- Migrate existing five-team saves by retaining teams 1–5 and appending empty teams 6–10.
- Keep ten-team navigation usable across desktop, tablet, and mobile layouts.

## Implementation Checklist

- [x] Change the shared team-count invariant from 5 to 10 while retaining four loadout slots per team.
- [x] Preserve the current state schema and historical local-storage key so five-team saves reconcile in place.
- [x] Make the desktop team-card list independently scrollable while keeping its heading and Reset control fixed.
- [x] Reveal the active team card when selection or restored state changes; retain the horizontal mobile strip.
- [x] Update English, Simplified Chinese, static metadata, and README wording from five teams to ten teams.
- [x] Correct the README deployment branch reference to `master`.
- [x] Add domain, migration, rule, UI, responsive, and localization coverage for teams 6–10.
- [x] Run data preparation, formatting, linting, TypeScript checks, unit/integration tests, and the production build.
- [ ] Complete Playwright browser execution. Test discovery passes, but the local managed runner stalled and was terminated; no preview listener remains.

## Compatibility Decisions

- Keep `Team`, loadout, picker, command, and 17-field share-code interfaces unchanged.
- Continue enforcing awakener, wheel, and posse uniqueness across the complete teams array; covenants remain reusable.
- Retain the `morimens-five-team-builder` storage key intentionally to preserve saved browser data.
- Keep historical implementation plans unchanged.

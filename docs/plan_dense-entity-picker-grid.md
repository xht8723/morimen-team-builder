# Dense Entity Picker Grid

## Goals

- Replace loose full-width picker rows with a responsive, artwork-led icon grid.
- Remove visible entity descriptions while preserving full descriptions as hover tooltips.
- Sort wheels by rarity, awakeners by realm, posses by realm/tag category, and covenants alphabetically.
- Preserve picker filters, warnings, accessibility, selection behavior, and responsive bottom-sheet behavior.

## Implementation Checklist

- [x] Recompose picker results as compact thumbnail tiles with names, badges, relevant metadata, and actionable warnings.
- [x] Add deterministic category-aware sorting with alphabetical tie-breakers.
- [x] Remove visible picker description markup and obsolete list-row styling while retaining tooltip content.
- [x] Add unit coverage for tooltip-only descriptions, sorting, filtering, and preserved statuses.
- [x] Update responsive browser coverage for dense grid geometry and overflow.
- [x] Run formatting, linting, TypeScript, unit, build, and Playwright verification.
- [x] Perform bounded visual QA and confirm all temporary Vite processes and listeners are removed.

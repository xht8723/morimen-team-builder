# Dense Team-Rail Loadout Overview

## Goals

- Prioritize awakeners, wheels, and posse artwork in every team-rail card.
- Replace full realm badges and posse-name copy with compact, accessible icons.
- Preserve complete loadout summaries across desktop and small-screen layouts without clipping.

## Implementation Checklist

- [x] Recompose each rail card into a compact header, four-awakener row, and eight-wheel row.
- [x] Group wheel spacing by loadout slot while keeping the wheel row visually separate.
- [x] Show the posse as an icon only and realms as tiny bare icons, retaining localized tooltips and screen-reader text.
- [x] Keep token-missing feedback as a compact accessible warning icon.
- [x] Render stable empty placeholders and omit covenants from the rail.
- [x] Keep entity summaries visible in the horizontally scrolling small-screen rail.
- [x] Preserve independent desktop scrolling, active-card reveal, and the existing max-content clipping fix.
- [x] Add component and browser regression coverage for content, accessibility, clipping, and overflow.
- [x] Run finite formatting, linting, type-checking, unit/integration, production-build, and Playwright checks.

## Compatibility

- Team selection, persistence, Undo, uniqueness rules, picker behavior, and share-code behavior remain unchanged.
- Wheel order remains slot 1 wheels 1-2 through slot 4 wheels 1-2.
- Visible posse and realm names are removed only from the team rail; localized accessible names remain available.

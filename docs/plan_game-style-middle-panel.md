# Game-Style Middle Team Panel

## Goals

- Redesign only the center team board to resemble the Morimens formation screen.
- Present four artwork-led awakener columns with independent covenant and wheel controls.
- Move the posse below the formation and remove all progression/statistic presentation.
- Preserve existing team rules, picker targets, persistence, import/export, and Undo behavior.

## Implementation Checklist

- [x] Extend shared entity artwork rendering with a backwards-compatible full-art option.
- [x] Extract a reusable game-style loadout column with full awakener art, realm treatment,
      covenant overlay, and two full wheel cards.
- [x] Recompose the center board with the existing header, four-column formation, and lower posse
      dock.
- [x] Add container-responsive four-column, 2x2, and phone single-column layouts.
- [x] Preserve accessible names, keyboard activation, empty states, and picker routing.
- [x] Add component and browser regression coverage for artwork, controls, omitted stats, and
      responsive geometry.
- [x] Run formatting, linting, type checks, unit/integration tests, production build, Playwright,
      and visual QA.

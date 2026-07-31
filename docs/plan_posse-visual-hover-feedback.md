# Posse Visual Fixes and Empty-Slot Hover Feedback

## Goals

- Remove the decorative shield from the center-board posse dock.
- Center iconless posse realm tags without changing icon-backed realm badges.
- Add subtle, accessible hover and focus feedback to all empty builder slots.
- Preserve builder behavior, responsive layouts, and reduced-motion support.

## Implementation Checklist

- [x] Remove the posse shield markup/import and rebalance the dock grid.
- [x] Add an explicit text-only state to iconless realm badges and center their text.
- [x] Add empty-only lift, glow, border, and add-affordance feedback to awakener, wheel, covenant, and posse slots.
- [x] Keep non-spatial feedback while suppressing lift/scale under reduced motion.
- [x] Add component and browser regression coverage.
- [x] Run formatting, linting, TypeScript, unit, build, Playwright, and visual checks.

## Follow-up

- [x] Extend the same lift-and-glow interaction to filled awakener, wheel, covenant, and posse slots while retaining the empty-only add-affordance animation.

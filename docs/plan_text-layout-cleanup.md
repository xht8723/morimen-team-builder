# Website Text Layout and Copy Cleanup

## Goals

- Correct unintended text clipping, overlap, scrollbar obstruction, and container overflow.
- Remove redundant picker and team-rail copy while preserving actionable warnings.
- Keep two-line entity descriptions and existing builder behavior.
- Simplify the idle picker to its ornament and one instruction.

## Implementation Checklist

- [x] Make picker-card rows content-sized and keep descriptions and statuses inside their cards.
- [x] Prevent picker names, badges, and scrollbars from obstructing one another.
- [x] Remove awakener, covenant, and duplicate posse metadata while retaining wheel metadata.
- [x] Remove positive availability and code-ready statuses while retaining actionable exceptions.
- [x] Reduce the idle picker to its ornament and “Select a slot to begin.”
- [x] Harden wrapping and truncation across team headers, rails, alerts, dialogs, toasts, and footer.
- [x] Remove unused translations and styles.
- [x] Add component and responsive browser regression coverage.
- [x] Run formatting, linting, type checks, tests, production build, Playwright, and visual QA.

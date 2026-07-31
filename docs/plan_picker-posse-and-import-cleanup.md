# Picker Posse and Import Cleanup

## Goals

- Remove the redundant visible wrapper around picker realm icons.
- Abbreviate Faded Legacy posse badges to FL while retaining the full accessible label.
- Exclude every Primordial Memory posse from picker results.
- Move Import from the global header into the active team board.

## Implementation Checklist

- [x] Make picker icon-only realm badges visually wrapperless without changing their stable footprint.
- [x] Render Faded Legacy as FL in picker tiles only.
- [x] Filter Primordial Memory posses before picker search, filters, sorting, and counts.
- [x] Move the Import action into the team board action row.
- [x] Rebalance desktop and mobile action layouts.
- [x] Update component and browser coverage.
- [x] Run finite formatting, type-checking, linting, tests, build, and visual QA.
- [x] Stop the exact QA server and confirm its port is clear.

# Enlarge Picker Realm Icons

## Goals

- Make picker realm glyphs visibly larger without increasing the existing badge wrapper.
- Preserve icon-only picker badges and text-only fallback categories.
- Use the alternate realm icon set only if scaling the current indexed assets is not clear enough.

## Implementation Checklist

- [x] Scale the current realm artwork within the picker-only badge wrapper.
- [x] Verify all four icon-backed realms remain centered, clear, and unclipped.
- [x] If necessary, copy only the four mapped alternate icons and update the deterministic asset pipeline.
- [x] Update visual assertions for the enlarged icon treatment.
- [x] Run finite formatting, type-checking, linting, tests, build, and browser QA.
- [x] Stop the exact QA server and confirm its port is clear.

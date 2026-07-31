# Picker Realm Icons and Used-Entity States

## Goals

- Make icon-backed realm badges icon-only inside the entity picker.
- Replace used-location copy with a dark used state and a centered Replace overlay.
- Preserve move/swap behavior and all actionable warnings.

## Implementation Checklist

- [x] Add a picker-only icon mode to the shared realm badge while keeping iconless labels.
- [x] Replace the picker’s usage-label dependency with a boolean assignment check.
- [x] Add the dimmed used-tile state and hover/focus Replace overlay.
- [x] Preserve realm-limit and tokenless planning warnings independently.
- [x] Remove obsolete usage-location translations and add the Replace translation.
- [x] Update component and browser coverage for the new behavior.
- [x] Run formatting, linting, type-checking, unit tests, build, and Playwright checks.
- [x] Complete visual QA without leaving an extra Vite process or listener.

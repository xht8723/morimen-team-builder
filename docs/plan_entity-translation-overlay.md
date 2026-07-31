# Separate Entity Translation Overlay

## Goals

- Add app-owned Simplified Chinese entity names and descriptions without modifying SKeyDB records.
- Cover every authoritative awakener, wheel, covenant, and posse while allowing field-level English fallback after future data changes.
- Keep canonical entities and domain state language-neutral, and resolve localized text only at presentation boundaries.
- Keep translation generation offline and deterministic for local builds and GitHub Actions.

## Implementation Checklist

- [x] Store versioned overlays by stable ID under `translations/entities/zh-CN/`, with source hashes and per-field provenance.
- [x] Extend the data compiler to validate overlays, ignore stale removed IDs, report coverage and drift, and emit `src/generated/entity-translations.json`.
- [x] Add a typed entity-text resolver and React hooks without mutating canonical catalog records.
- [x] Refactor picker search/sorting, formation cards, team rail, posse dock, import previews, tooltips, accessible labels, and token warnings to use localized entity text.
- [x] Replace display strings in domain results with stable entity and team references.
- [x] Generate Chinese names and descriptions for all current catalog entities, using established local names as a glossary when confidently matched.
- [x] Verify fallback, drift, search, sorting, locale switching, domain invariants, formatting, linting, type-checking, tests, and production build.

## Defaults

- Missing, stale, or unsupported translations fall back to canonical English per field and do not fail builds.
- Current machine/reference provenance remains metadata-only.
- Canonical English names, aliases, and search tags remain searchable in every locale.
- No translation API, runtime fetch, backend, or build-time network dependency is introduced.

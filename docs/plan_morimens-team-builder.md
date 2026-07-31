# Morimens Five-Team Builder

## Goals

- Build a desktop-first, responsive React and TypeScript static site for
  planning five Morimens teams.
- Enforce global awakener, wheel, and posse uniqueness, covenant reuse, and a
  two-realm maximum per team.
- Generate and import the documented 17-field Morimens share-code format.
- Compile the tracked SKeyDB records and asset metadata at build time so
  same-schema data updates require no application-code edits.
- Persist local team state, support reversible moves/imports, and deploy through
  GitHub Pages.
- Ship an English interface whose text is ready for future localization.

## Implementation Checklist

- [x] Scaffold React 19, TypeScript, Vite, Tailwind CSS, Zustand/Immer, Zod,
  Fuse.js, react-i18next, Vitest, Testing Library, and Playwright.
- [x] Extend `update-data.bat` to sync the public-v3 manifest, asset index, and
  builder catalog alongside records and assets.
- [x] Generate a validated builder catalog and deployable referenced-asset set
  from `data/` before development and production builds.
- [x] Implement the normalized five-team model, centralized rule engine,
  move/swap/clear/import commands, one-level undo, and versioned persistence.
- [x] Implement case-sensitive share-code encoding and category-specific trie
  decoding with documented regression fixtures.
- [x] Build the desktop three-pane team rail, loadout board, and contextual
  picker with search, realm/main-stat filters, artwork, descriptions, and
  responsive mobile behavior.
- [x] Add partial-team copying, tokenless-record handling, import previews,
  conflict resolution, data reconciliation, and feedback surfaces.
- [x] Add English i18n resources, accessibility behavior, SKeyDB attribution,
  noncommercial/non-affiliation language, and the asset/IP notice.
- [x] Add unit, integration, and end-to-end coverage plus GitHub Pages
  deployment.
- [x] Run data validation, type checking, linting, tests, and a production build.

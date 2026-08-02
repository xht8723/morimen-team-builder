# Project History and Durable Decisions

This document replaces the completed one-off implementation plans that accumulated during the builder's initial development. It records the decisions that remain part of the product contract.

## Architecture and persistence

- The builder is a static, synchronous, offline-first React application. Catalog data is compiled ahead of time and imported synchronously; browser startup does not depend on a server.
- Team state is stored locally. The canonical key is `morimens-team-builder`; a one-time lossless migration reads `morimens-five-team-builder`, preserves an existing canonical save, and removes legacy data only after a successful copy.
- Historical five-team saves expand deterministically to ten teams. Hydration preserves known entities and names, drops missing references, retains the first placement of each unique entity, and removes later uniqueness or realm-limit violations.

## Data and updater compatibility

- `update-data.bat` remains additive for raw `data/assets` and `data/records`. The upstream manifest and builder catalog determine what the compiler consumes; local files outside that authority are retained but ignored.
- The compiler verifies schema, emitted fields, source record byte counts, and SHA-256 hashes before generating catalog schema v2.
- Builder-catalog entities are selectable. The eight tokenless Primordial Memory posse records remain compatibility-only so historical saves can render them, but they cannot be newly selected.
- Vite bundles Droid Serif from the raw source path. The compiler does not copy a second identical font tree into generated public assets.

## Team and share-code rules

- The roster contains ten named teams, each with four loadout slots, two wheels per slot, one covenant per slot, and one team posse.
- Awakeners, wheels, and posses are unique across teams; covenants are reusable. Moving an awakener swaps its complete loadout when necessary. A team may contain at most two awakener realms.
- The wire format remains the exact case-sensitive 17-field `@@...@@` format documented in `team-share-code-format.md`. The reserved empty token is `a`; category tries decode prefix-safe tokens. Imports reject repeated unique entities and realm-invalid teams.

## Localization

- English entity data is canonical. Simplified Chinese overlays are compiled only when their source hashes match; stale or absent fields fall back to canonical English values.
- Missing localized aliases fall back to canonical aliases, and search indexes localized names together with canonical names, aliases, and tags.
- Established Chinese terminology for awakeners, wheels, covenants, posses, realms, and wheel main stats is treated as a compatibility contract.

## UI and accessibility

- The compact header, ten-team rail, game-styled loadout board, contextual picker, and desktop/mobile layouts are intentional.
- Picker ordering is deterministic: selectable unused records first, used records next, realm-blocked records last; category ordering precedes localized name ordering. Compatibility-only records never appear.
- Shared modal behavior traps focus, restores the opener, closes only on its own backdrop or Escape, and prevents Escape from leaking to the underlying picker.
- Team rename Escape cancels, no-op clears do not create undo/toast state, clipboard failures are reported, and reselecting the current entity closes the picker without creating history.

## Attribution

- The project remains an unofficial, noncommercial fan tool. SKeyDB and HuijiWiki attribution and asset notices remain visible in the application and repository.

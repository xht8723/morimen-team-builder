# Sort Greyed Picker Options Last

## Goals

- Place picker options in selectable, used, then realm-limit-only groups.
- Treat used-and-blocked awakeners as used for sorting while leaving them disabled.
- Preserve existing category ordering, including wheel rarity and realm sorting, inside each availability group.
- Keep move/swap, realm-limit, filtering, search, and localization behavior unchanged.

## Implementation Checklist

- [x] Precompute each filtered entity's used and blocked state once.
- [x] Rank selectable entities first, used entities second, and realm-limit-only awakeners last.
- [x] Give used status precedence when an awakener is both used and blocked.
- [x] Preserve category and localized-name ordering within all availability groups.
- [x] Reuse the precomputed state for picker-card rendering.
- [x] Recompute ordering when teams, the target, search, filters, or locale change.
- [x] Leave covenants and planning-only records in their normal selectable ordering.
- [x] Add regression tests for used, blocked, overlapping, filtered, and category ordering.
- [x] Run finite formatting, linting, type-checking, unit/integration, build, and browser checks.

## Compatibility

- Used awakeners, wheels, and posses remain selectable for the existing move/swap behavior.
- Realm-conflicting awakeners remain disabled, including used-and-blocked awakeners sorted in the used group.
- The current-slot entity counts as assigned and sorts with the greyed group.
- No domain model, persistence, share-code, or command behavior changes.

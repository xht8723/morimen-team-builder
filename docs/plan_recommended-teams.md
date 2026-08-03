# Replace Recommendation Entity Lists with Team Codes

## Goals

- Keep the Recommended Teams tab, bilingual metadata, responsive cards, and copy-only behavior.
- Store each recommendation lineup as one game-compatible share code.
- Decode and validate recommendations at runtime with the existing share-code implementation.
- Silently omit invalid or outdated recommendations without affecting Team Builder state.
- Restore Aurita in the first planned lineup and ship the five supplied team codes.

## Implementation checklist

- [x] Replace `posse` and `slots` in `data/recommended-teams.json` with a trimmed `code` field for each recommendation.
- [x] Simplify compiler validation to schema version, unique IDs, bilingual metadata, and non-empty single-line codes.
- [x] Remove category/name/ID reference indexes and entity-resolution compiler logic.
- [x] Replace recommendation entity-list types with source definitions and runtime-decoded recommendations.
- [x] Decode exact `@@[A-Za-z0-9]+@@` codes at runtime and silently filter invalid teams.
- [x] Render recommendation details from decoded teams and copy the stored code verbatim.
- [x] Update unit, component, localization, state-preservation, desktop, and mobile tests.
- [x] Update README guidance to document code-based recommendations.
- [x] Run `pnpm verify`, `pnpm test:e2e`, and `git diff --check` with bounded preview teardown and port verification.

## Data contract

- The source file keeps `schemaVersion: 1` and an unrestricted `teams` array.
- Each team contains a unique `id`, bilingual `name`, bilingual `summary`, and a single-line `code` string.
- Build-time compilation trims and preserves the code without resolving catalog entities.
- Runtime loading accepts only an exact `@@[A-Za-z0-9]+@@` wrapper and passes it to `decodeTeam`.
- The gallery exposes and counts only successfully decoded recommendations; invalid codes are skipped silently.

## Compatibility constraints

- Team Builder remains the default, non-persisted tab.
- Switching tabs preserves saved builder teams while closing transient builder UI.
- Recommendations never overwrite or otherwise mutate builder state.
- Recommendation JSON changes require rebuilding and redeploying the site.

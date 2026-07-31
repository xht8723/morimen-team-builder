# Header Branding and Team Transitions

## Goals

- Use the supplied Morimens game icon in the header and browser tab.
- Rename the product heading and remove its subtitle.
- Fade the active team board out and the next team board in when switching teams.
- Preserve immediate team selection, picker closing, keyboard behavior, and reduced-motion support.

## Implementation Checklist

- [x] Replace the decorative header mark and add the game icon as the favicon.
- [x] Update the localized title and remove the unused subtitle copy and styling.
- [x] Add a robust out–in transition around active team changes.
- [x] Keep rapid switching and reduced-motion behavior deterministic.
- [x] Add component and browser regression tests.
- [x] Run formatting, linting, TypeScript, unit, build, Playwright, and visual checks.

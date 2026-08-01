# Panel Fade Transition Refinement

## Goals

- Fade the right picker in quickly whenever its selected slot target changes.
- Switch center-board team content immediately and animate only the new team fading in.
- Preserve reduced-motion behavior and all builder interactions.

## Implementation Checklist

- [x] Remove the center board's delayed `out` phase and pending-team state.
- [x] Switch active team content immediately and apply a short fade-in animation to the new board.
- [x] Restart the picker fade-in by replacing only its host element when the picker target changes.
- [x] Preserve picker component state, focus behavior, auto-advance, and mobile bottom-sheet layout.
- [x] Update component and browser transition assertions.
- [x] Run finite formatting, linting, TypeScript, unit/integration, build, and browser checks.

## Compatibility

- Team, picker, persistence, Undo, import, and share-code behavior remain unchanged.
- Reduced-motion mode keeps immediate content changes with effectively no animation.

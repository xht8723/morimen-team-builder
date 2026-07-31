# npm Script Compatibility

## Goals

- Allow `npm run dev` and the other project scripts to run without a globally installed `pnpm`.
- Keep pnpm as the repository lockfile and CI package manager.
- Avoid changing application behavior or generated data.

## Implementation Checklist

- [x] Replace nested `pnpm` calls in npm lifecycle scripts with direct local-tool commands.
- [x] Document that development scripts work through npm after dependencies are installed.
- [x] Run finite npm-based data, formatting, lint, test, type-check, and build verification.
- [x] Start `npm run dev` on one strict tracked port, confirm it responds, and terminate it.
- [x] Confirm no listener remains on the QA port.

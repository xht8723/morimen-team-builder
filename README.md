# Morimens Ten-Team Builder

A desktop-first static React team builder for planning ten Morimens teams, enforcing shared-roster rules, and generating game-compatible share codes. It runs entirely in the browser and stores builds locally.

## Develop

Requirements: Node.js 22.16 or newer and pnpm 10.

```powershell
pnpm install
pnpm dev
```

pnpm remains the lockfile and CI package manager. Once dependencies are installed, the project
scripts do not require a global pnpm command, so `npm run dev` and `npm run verify` work as well.

The data compiler runs automatically before development and production builds. It validates `data/meta`, verifies consumed record byte counts and SHA-256 hashes, emits catalog schema v2 selectability metadata, and copies only referenced artwork into generated build directories.

## Update recommended teams

Edit [`data/recommended-teams.json`](data/recommended-teams.json) and rebuild the site. Each entry
keeps its bilingual name and summary alongside one game-compatible `@@...@@` team code. The data
compiler validates the metadata and preserves the trimmed code without resolving catalog entities.

Summaries support safe GitHub Flavored Markdown. A locale may use a normal string or an array of
lines; line arrays are joined with newlines during the build and make paragraphs and lists easier to
edit in JSON. For example:

```json
"summary": {
  "en": "A short **formatted** summary.",
  "zh-CN": ["### 核心思路", "", "- 第一项", "- 第二项"]
}
```

Headings, emphasis, lists, blockquotes, links, tables, task lists, strikethrough, and code are
supported. Raw HTML and Markdown images are ignored.

When the app loads, it decodes every code against the current catalog and displays every valid team;
there is no fixed recommendation limit. Invalid or outdated codes are skipped silently, so editors
should test copied codes after catalog updates. Recommendations are copy-only and never replace a
Team Builder formation.

## Refresh SKeyDB data

Run from any working directory:

```powershell
.\update-data.bat --no-pause
pnpm data:prepare
pnpm verify
```

The updater shallow-clones the current SKeyDB `main` branch, additively refreshes `data/assets` and `data/records`, and replaces the authoritative files in `data/meta`. Local-only files remain, but the compiler ignores records absent from the current upstream manifest and builder catalog.

## Verification

```powershell
pnpm verify
pnpm exec playwright install chromium
pnpm test:e2e
```

`verify` checks generated data, formatting, lint, types, unit/integration tests, and the production build. Playwright provides desktop and mobile browser smoke coverage.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` verifies and deploys `dist` on pushes to `master` or manual dispatch. Vite emits relative asset paths, so the same build works on a repository subpath or a custom domain.

After connecting this directory to a GitHub repository, enable **Settings → Pages → Source: GitHub Actions**.

## Data and asset notices

See [ATTRIBUTION.md](ATTRIBUTION.md). This is an unofficial, noncommercial fan project and is not affiliated with or endorsed by Qookka Games.

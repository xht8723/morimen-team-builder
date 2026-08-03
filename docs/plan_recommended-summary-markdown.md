# Render Recommendation Summaries as Safe Markdown

## Goals

- Render bilingual recommendation summaries with safe GitHub Flavored Markdown.
- Keep source JSON human-readable by accepting either strings or arrays of Markdown lines.
- Preserve canonical runtime summaries as strings and leave recommendation codes and decoding unchanged.
- Reformat the current Glotan Chinese summary into readable Markdown sections.
- Prevent raw HTML, remote images, unsafe links, and responsive overflow.

## Implementation checklist

- [x] Add `react-markdown` and `remark-gfm` as runtime dependencies.
- [x] Extend recommendation compilation to normalize string-or-line-array summaries into LF-delimited strings.
- [x] Reject empty, all-whitespace, or non-string summary content while preserving meaningful indentation.
- [x] Add a dedicated safe Markdown summary renderer with accessible heading mappings and external-link attributes.
- [x] Add card-scoped Markdown styling for prose, lists, blockquotes, code, task lists, and scrollable tables.
- [x] Convert the Glotan Chinese summary to Markdown sections and bullets without changing its gameplay meaning.
- [x] Document the Markdown authoring contract and supported syntax.
- [x] Add compiler, component, localization, safety, responsive, and browser tests.
- [x] Run `pnpm verify`, `pnpm test:e2e`, `git diff --check`, and preview teardown checks.

## Data contract

- Recommendation names remain localized strings.
- Each summary locale accepts either a non-empty Markdown string or an array of string lines.
- Empty array entries represent blank Markdown lines; arrays must contain at least one non-whitespace line.
- The compiler joins arrays with `\n`, normalizes string line endings to LF, and emits localized strings.
- IDs, codes, runtime decoding, invalid-code filtering, and copy behavior remain unchanged.

## Rendering and safety

- Enable GFM headings, paragraphs, emphasis, lists, blockquotes, links, tables, task lists, strikethrough, and code.
- Ignore raw HTML and suppress Markdown images; do not enable `rehype-raw`.
- Use the renderer's safe URL transformation and open rendered links in a new tab with `noopener noreferrer`.
- Map summary headings below the recommendation card's existing `h3` hierarchy.
- Contain long links and code and make tables horizontally scrollable on narrow screens.

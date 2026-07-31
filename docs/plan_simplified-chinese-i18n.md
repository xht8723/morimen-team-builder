# Simplified Chinese i18n

## Goals

- Add complete Simplified Chinese UI translations without changing upstream entity data.
- Automatically select Chinese for Chinese browser locales and persist the user's manual choice.
- Provide a compact, accessible language switch that fits the reduced header.
- Localize dynamic realm, posse-category, wheel-stat, date, status, dialog, and accessibility text.

## Implementation Checklist

- [x] Add the complete `zh-CN` translation catalog and enum labels.
- [x] Add supported-language detection, persistence, fallback, and document-language updates.
- [x] Add a compact English/Chinese switch to the header.
- [x] Localize realm badges, picker metadata/filters, picker labels, and generated dates.
- [x] Add component tests for switching, persistence, translated enums, and English fallback.
- [x] Add responsive browser coverage for Chinese desktop and phone layouts.
- [x] Run finite formatting, linting, type-checking, unit tests, build, and Playwright flows.
- [x] Reuse the existing development server for visual QA without creating another listener.

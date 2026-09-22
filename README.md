# ApplyBoard

A lightweight job application tracker that turns a job posting URL into an editable spreadsheet row. It extracts structured `JobPosting` metadata when available and stores your applications locally in your browser.

## Features

- Parse company, role, and posting date from a URL
- Review and correct extracted details before saving
- Track application date and pipeline status
- Star important applications to keep them above the selected sort order
- Edit, search, delete, and export applications to CSV
- No account or database required; data stays in browser storage
- Responsive layout for desktop and mobile

## Run locally

Requires Node.js 24 or newer (see `.nvmrc`).

```bash
npm ci
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

The React/Next.js version reads the existing `applyboard.applications.v1` browser storage key. Use the same browser profile and origin (including hostname and port) to retain access to your applications. Loading never writes to storage; unreadable data is left untouched and editing is disabled. Export a CSV backup before switching browsers or clearing site data.

## Test

```bash
npm run validate
npm run build
npx playwright install chromium
npm run test:e2e
```

`validate` runs lint, strict TypeScript checks, formatting checks, and unit tests. Browser tests start an isolated production server on port 3100 and use fresh browser storage, leaving your applications untouched. Build first and keep port 3100 available.

Use `npm run format` to format source files. To enable the optional repository-local pre-commit checks, run `npm run hooks:install` after reviewing any existing Git hook configuration.

## Stack

Next.js App Router, React, and strict TypeScript power the interface and HTTP route. Existing JavaScript parsing modules remain behind a typed server-only service boundary. Styling uses the original CSS; application data remains in localStorage, with no database or authentication service.

## Project structure

- `src/app/` — Next.js layout, page, global CSS, and Node-runtime `/api/parse` route
- `src/components/applications/` — focused React board, table, row, form, dialog, and control components
- `src/hooks/useApplications.ts` — client-only storage loading and persisted mutations
- `src/lib/applications/` — shared application types, status metadata, storage, sorting, and CSV formatting
- `src/lib/server/parse-job.ts` — typed server-only adapter to the existing parsing service
- `src/job-service.js` — parsing workflow with injectable fetch, page-parser, and resolver dependencies
- `src/job-parser.js` — job page metadata extraction
- `src/structured-data.js` — structured job selection, organization references, and microdata reading
- `src/custom-job-board.js` — discovers embedded Greenhouse links and verifies domain-derived board candidates against the original job URL; no company-specific mappings
- `src/public-fetch.js` — validates DNS addresses, redirects, and response sizes
- `src/company-resolver.js` — ranked structured-data, ATS API, metadata, and domain company resolution
- `src/url-security.js` — public URL validation
- `test/` — deterministic parser, security, storage, and sorting unit tests
- `e2e/` — browser regression tests for persistence, interaction, CSV export, and route validation

## Notes

Some job sites block automated page access or omit structured job metadata. ApplyBoard opens the edit form in those cases so you can enter any missing details manually.

The general parser supports JSON-LD (including organization references), embedded JSON job records, microdata/RDFa, job headings, and company website metadata. It uses public-suffix-aware domain parsing for low-confidence company fallbacks. Inferred Greenhouse board names are accepted only if the job ID and returned job URL match. Posting dates are not inferred from edit timestamps.

JavaScript is not executed: jobs available only after client-side rendering, sign-in, or browser verification may require manual entry. This is not a universal extraction guarantee. Automated tests use synthetic HTML and mocked dependencies, independent of live job availability; they do not establish an accuracy percentage across the web.

## Roadmap

- Optional cloud sync and authentication
- Browser extension for one-click capture
- Notes, contacts, reminders, and analytics

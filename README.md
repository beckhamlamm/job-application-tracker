# Applyboard

A lightweight job application tracker that turns a job posting URL into an editable spreadsheet row. It extracts structured `JobPosting` metadata when available and stores your applications locally in your browser.

## Features

- Parse company, role, and posting date from a URL
- Review and correct extracted details before saving
- Track application date and pipeline status
- Edit, search, delete, and export applications to CSV
- No account or database required; data stays in browser storage
- Responsive layout for desktop and mobile

## Run locally

Requires Node.js 18 or newer.

```bash
npm ci
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Test

```bash
npm test
```

## Project structure

- `server.js` — HTTP routing and static file delivery
- `src/job-parser.js` — job page metadata extraction
- `src/custom-job-board.js` — discovers embedded Greenhouse links and verifies domain-derived board candidates against the original job URL; no company-specific mappings
- `src/public-fetch.js` — validates DNS addresses, redirects, and response sizes
- `src/company-resolver.js` — ranked structured-data, ATS API, metadata, and domain company resolution
- `src/url-security.js` — public URL validation
- `public/app.mjs` — browser event and rendering orchestration
- `public/js/application-store.mjs` — application persistence
- `public/js/application-sorting.mjs` — sorting strategies
- `public/js/formatting.mjs` — display and CSV formatting

## Notes

Some job sites block automated page access or omit structured job metadata. Applyboard opens the edit form in those cases so you can enter any missing details manually.

The general parser supports JSON-LD (including organization references), embedded JSON job records, microdata/RDFa, job headings, and company website metadata. It uses public-suffix-aware domain parsing for low-confidence company fallbacks. Inferred Greenhouse board names are accepted only if the job ID and returned job URL match. Posting dates are not inferred from edit timestamps.

JavaScript is not executed: jobs available only after client-side rendering, sign-in, or browser verification may require manual entry. This is not a universal extraction guarantee. Tests use varied HTML fixtures plus live spot checks; they do not establish an accuracy percentage across the web.

## Roadmap

- Optional cloud sync and authentication
- Browser extension for one-click capture
- Notes, contacts, reminders, and analytics

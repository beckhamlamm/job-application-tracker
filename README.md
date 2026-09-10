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
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Test

```bash
npm test
```

## Notes

Some job sites block automated page access or omit structured job metadata. Applyboard opens the edit form in those cases so you can enter any missing details manually.

## Roadmap

- Optional cloud sync and authentication
- Browser extension for one-click capture
- Notes, contacts, reminders, and analytics

# Applyboard coding standards

This project uses the supplied Coding Standards skill, adapted to Node CommonJS and browser ES modules. No TypeScript migration or application behavior changes are required.

## Automated checks

Use Node 24 for development (`.nvmrc`). ESLint 10 does not support Node 23, even though the app itself can run on it. The runtime requirement in `package.json` is separate from development tooling requirements.

```sh
npm ci
npm run lint
npm run format:check
npm test
# Run all three checks:
npm run validate
# Deliberate local fixes:
npm run lint:fix
npm run format
```

ESLint checks Node and browser globals separately, recommended correctness rules, strict equality, required braces, unused variables, and const/let usage. Prettier enforces two spaces, semicolons, single quotes, and a 100-column wrapping target for JavaScript, JSON, and Markdown. HTML/CSS layout files are outside this formatting pass. Lockfiles are managed by npm.

## Pre-commit checks

After selecting Node 24, enable the repository's versioned hook:

```sh
npm run hooks:install
```

This changes only this repository's `core.hooksPath`. Check any existing hook configuration before running it. The hook runs `npm run validate` against the working tree; it does not rewrite files, stage changes, or isolate partially staged content. It is provided but not automatically enabled, so dependency installation does not alter Git settings.

## Readability and design

- Use camelCase for functions/variables, PascalCase for types, and descriptive uppercase names for fixed limits.
- Keep a file-level responsibility comment in source, tests, and executable configuration.
- Document public boundaries, return values, errors, and non-obvious security or fallback decisions. Avoid comments that merely repeat the code.
- Keep functions focused; fewer than 50 lines and complexity below 10 are review targets, not enforced thresholds in this initial pass. Existing orchestration and network adapters need further decomposition before imposing them as hard limits.
- Prefer injected dependencies and small modules; retain the SOLID boundaries described in `REFACTORING.md`.
- Catch errors only when recovery is intentional. Explain ignored malformed optional metadata; propagate cancellation and unsafe-network errors where required by the existing contract.
- Preserve API shapes and fallback ordering during style-only changes.

## Review checklist

- Run validation and review both the formatted diff and behavioral changes.
- Add synthetic regression tests for new behavior, including failure paths; do not depend on live job postings.
- Keep public URL, DNS, redirect, and response-size protections intact.
- Never commit credentials or local application data.
- Update documentation when dependencies, setup, or behavior change.

## Remaining standards work

An 80% coverage gate, browser interaction tests, and CI enforcement are not configured by this pass. Establish accurate coverage measurement and missing integration tests before claiming that threshold. The downloaded skill's linked templates and companion standards were unavailable; this configuration implements its self-contained JavaScript guidance.

Configuration references: [ESLint configuration](https://eslint.org/docs/latest/use/configure/configuration-files), [Prettier configuration](https://prettier.io/docs/configuration).

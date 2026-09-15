# SOLID Refactoring Analysis

Target: Applyboard application code (648 JavaScript lines before refactoring, excluding tests and dependencies).

## SOLID scorecard

| Principle | Assessment | Findings |
| --- | --- | --- |
| Single Responsibility | Improved | HTTP parsing endpoint mixed transport, fetching, timeouts, and extraction. Structured-record reading was mixed with page-field selection. Both boundaries are now separated. |
| Open/Closed | Improved, remaining opportunity | Workflow dependencies can be replaced without editing orchestration. Provider recognition still uses conditionals; consider a provider registry when more integrations are added. |
| Liskov Substitution | No inheritance issue found | No subclass overrides or unsupported inherited methods. Injected async dependencies retain compatible response contracts. |
| Interface Segregation | No large interface found | Small function-based dependencies; no fat service interfaces requiring unused implementations. |
| Dependency Inversion | Improved | Parsing workflow accepts fetch, parser, and resolver functions, with production defaults wired at construction. |

## Priority refactorings applied

### 1. Separate parsing orchestration from HTTP handling

Violation: Single Responsibility and Dependency Inversion.

Extracted `src/job-service.js` from `server.js`. The server retains request-body handling, response serialization, routing, and static delivery. The service owns URL validation, the parsing timeout, safe fetching, board lookup, and company/field composition. All lookups receive the same injected fetch function and abort signal.

Impact: One HTTP endpoint and its parsing workflow. Risk: Medium, because error propagation, fallback order, and API response fields must remain stable. Effort: One service extraction and six orchestration tests. Tests cover successful composition, private URLs, blocked pages, board fallback, injected strategies, and failures/timeouts.

### 2. Extract structured-data reading

Violation: Single Responsibility; dense nested selection logic.

Extracted `src/structured-data.js` and named helpers for JSON traversal, page matching, job selection, and microdata reading. `src/job-parser.js` retains page-field selection and keeps its existing exports compatible.

Impact: Structured extraction used by page and company parsing. Risk: Low to medium, principally selection and reference precedence. Effort: One module extraction and four additional characterization tests, alongside existing format tests.

## Code smells and quick wins

| Smell | Location | Treatment |
| --- | --- | --- |
| Coupled workflow and HTTP response mutation | Former `server.js` parsing handler | Extracted service; destructuring excludes internal fields without mutating parser output. |
| Dense nested record-selection logic | Former `src/job-parser.js` | Extracted named helpers in `src/structured-data.js`. |
| Magic timeout/depth/HTML limits | Parsing workflow and structured reader | Named constants; timeout injectable for deterministic test setup. |
| Repeated HTML parsing | Page parsing and metadata helpers | Deferred; sharing a document context warrants separate performance measurement and tests. |
| UI rendering, forms, and networking together | `public/app.mjs` | Deferred; 141-line coordinator already delegates storage, sorting, and formatting. Browser interaction tests should precede further extraction. |

## Safety and technical debt

- Preserved the prior synthetic-fixture changes in a checkpoint commit on `refactor/solid-parsing`.
- Ran the existing suite before changes and after each extraction; added offline regression tests.
- Retained provider priority, URL security, public response fields, existing exports, and browser behavior.
- No class hierarchy or framework added merely to satisfy SOLID terminology.
- This refactoring does not add parser formats or JavaScript rendering and does not establish extraction accuracy across websites.
- Remaining work: browser interaction coverage, HTTP route integration coverage, and provider-registration design if provider count grows.

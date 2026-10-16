# TASK 011 - Study object navigation

Status: READY FOR INDEPENDENT QA - NOT MERGED.

Repository: Marleohar/Franks-projekt (Herb Wiki).
Verified starting main: `4709be99e12d3e9beada3c3b4bce328bcb26fc8f`.
Branch: `task011-study-routing`. The task commit is the branch HEAD; obtain its
exact immutable ID with `git rev-parse HEAD` (also recorded in the PR).

## Change

Filter-search study links encode the original ID as one URI component. The
study router decodes exactly once and matches `db.studyObjects` by exact ID.
Missing, empty, malformed percent encoding and extra path components display
an explicit study not-found view rather than guessing a record.

The new read-only view displays existing name, type and desc as escaped literal
text, preserving description newlines. Property links use `getPropKeys` (false,
null and undefined relationships excluded); system links use the existing
singular `system` OR plural `systems.includes` semantics against known systems.
Both representations of the same system produce one link. No editor, delete,
normalization, migration, persistence or schema changes were introduced.
Existing herb/property/category/system route branches are unchanged.

Changed files:

- `index.html`
- `tests/filter-search.test.cjs` - canonical encoded study-link expectation
- `tests/browser-filter-search.cjs` - encoded link and working detail expectation
- `tests/fixtures/study-library.cjs` - entirely synthetic records
- `tests/study-routing.test.cjs`
- `tests/browser-study-routing.cjs`
- `tests/STUDY-ROUTING.md`

Historical reports are unchanged.

## Independent tooling and execution

Executed 2026-10-16 on Windows, Node `v24.12.0`, Playwright `1.56.1`, real
headless Chrome/Chromium `155.0.8059.84` at
`C:/Program Files/Google/Chrome/Application/chrome.exe`.
The checkout is `C:/dev/Franks projekt/franks-task011`.
No Digital GM dependencies, node_modules or other project paths were used.
Install tooling before testing (this setup step downloads npm packages):

```powershell
npm.cmd install --prefix "$env:TEMP/franks-task011-tooling" --no-audit --no-fund --ignore-scripts playwright@1.56.1
$env:PLAYWRIGHT_MODULE="$env:TEMP/franks-task011-tooling/node_modules/playwright"
node --test tests/*.test.cjs
Get-ChildItem tests/browser-*.cjs | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { throw $_.Name } }
```

No network access is required by the test executions. Browser scripts strip SDK
script tags, Firebase configuration and initialization from a disposable copy.
They use fresh browser contexts, synthetic data, service-worker blocking, a
blocked egress proxy, request interception and CSP connect-src none. Loopback
requests are fulfilled from memory; no server or production library is used.
Node tests execute extracted actual functions in capability-limited VMs with
network/service APIs unavailable. No .env files or real library data were read.

## Results

Baseline before modification: **92/92 Node tests passed**.
Final: **115/115 passed**, 0 failed, skipped, cancelled or TODO (23 added).
The 92 baseline tests remain, with only the study-link expectation updated.

All browser commands passed:

| Script (`tests/`) | Result |
| --- | --- |
| browser-study-routing.cjs | PASS |
| browser-core-rendering.cjs | PASS |
| browser-filter-search.cjs | PASS |
| browser-formula-rendering.cjs | PASS |
| browser-glossary-rendering.cjs | PASS |
| browser-import-smoke.cjs | PASS |
| browser-property-rendering.cjs | PASS |
| browser-system-rendering.cjs | PASS |

Study coverage includes actual search-result clicks, hash routing, nine fresh
document bookmarks through the startup router, ordinary IDs, spaces, both quote
characters, percent signs, encoded slashes, Unicode, adversarial markup/JavaScript
text, and distinct literal-percent/space IDs. Seven malformed/missing routes
fail safely. Ordinary herb results still navigate to the exact herb. Node tests
also cover singular-only, plural-only, null/missing systems, omitted properties
and absent study collection. Literal name/type/description and relationship
counts are asserted in the browser. No inline edit/delete controls are present.

A first new Node harness run failed because its extraction omitted the existing
search keydown dependency. Adding that real function fixed the harness; no
production behavior was changed to satisfy the failure. Review caught shell
encoding replacing newly authored Unicode characters; source labels were fixed
and the fixture now uses explicit JavaScript Unicode escapes. Final Unicode
Node and browser checks passed.

## Complete data preservation

Node tests compare complete serialized synthetic libraries before and after
route sequences and search rendering, including all collections, original IDs,
metadata, associations and nested unknown fields. Every new test requires exact
snapshot equality, zero persistence calls and zero storage mutations.

Chromium compares the entire serialized fixture after navigation actions and
for every fresh bookmark. It instruments persist and all three Storage mutation
methods (setItem/removeItem/clear). Result: **zero persistence calls, zero storage
writes, zero payload executions, zero injected elements, zero page errors and
zero external requests**. Fresh bookmarks inject only synthetic in-memory db
before the real startup router; they do not seed browser storage.

Some inherited browser scripts deliberately test synthetic editing/importing;
their expected writes still occur and pass their existing assertions. Zero-write
claims here apply to search/study/herb navigation, not those intentional mutation
scenarios. No production Firestore calls occur in any browser run.

## Assumptions and inherited limitations

IDs follow the existing string-ID contract. URI components decode once; a raw
slash must be encoded and a literal percent must be percent-encoded. Malformed
URLs do not fall back to an alternate identity. Only known system records are
shown, as on existing system surfaces; no missing relationship target is created.

Existing collection/record shape assumptions remain. This task does not add
validation for arbitrary corrupt nested data, redesign legacy routing or harden
unrelated surfaces. Recovery defaults, Firestore sync, concurrency, editors,
imports and other historical risks remain outside scope. Synthetic offline tests
do not establish production-data or production-service behavior.

No merge, deployment or auto-merge. Independent QA and owner review are required.

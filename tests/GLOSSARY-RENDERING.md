# TASK 009: glossary rendering and inline editing

Verified main baseline: `a308aca1e1a0b3badfe428d1008e38a487750858`.

## Scope and behavior

Botanical input values and herb display names are escaped with escapeCoreText.
Both grouped and unassigned rows use canonical #herb-id/<encoded-id> links.
Original group keys and herb IDs are encoded as JSON in escaped data attributes,
then restored exactly by DOM-bound blur listeners. The click dispatcher receives
one fixed glossaryCreate action; it does not handle blur. Radio change listeners
retain all/with_bot/no_bot behavior. Group sorting, unassigned order and creation
record shape remain unchanged. No library data is modified during rendering.

Application changes are limited to renderGlossaryPage, the one glossaryCreate
case in bindCoreActions, and the group comparison in updateGlossaryBotanicalName.
All other application bytes, including filter search, system associations,
property/detail rendering, legacy routing, Firebase and import/export are unchanged.
No dependencies added.

## Explicit whitespace correction

The baseline renderer groups Botanical Name values after trim(), but the baseline
updater compares raw strings against that trimmed key. Executing the actual updater
extracted from baseline git show against a synthetic two-herb group reproduced:
only the unspaced record changed, the whitespace variant stayed unchanged, and one
persist call occurred. The visible group therefore was not edited coherently.

The updater now compares the same trimmed key used by the renderer. An explicit
rename changes every record in that existing visible group, including leading/
trailing-whitespace variants, and persists once. Full-library Node/browser assertions
prove unrelated botanical groups, unassigned records, properties and metadata remain
unchanged. This is a narrowly scoped targeting correction, not a migration.

Rendering and unchanged group blur preserve original stored whitespace. Empty edits
remain ignored. Existing trimming of newly saved input is retained. Renaming a group
to an already-used name still combines display groups without deleting records;
there is no broader grouping/identity redesign. Repeated unassigned setter calls and
unmatched programmatic group calls retain their existing persistence semantics.

## Node validation

Node.js **v24.12.0**. Both commands exited 0:

```sh
node --test tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs tests/filter-search.test.cjs tests/glossary-rendering.test.cjs
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs tests/filter-search.test.cjs tests/glossary-rendering.test.cjs
```

Each: **83 passed, 0 failed, 0 TODO, 0 skipped/cancelled** (73 existing + 10 new).
Tests extract actual application functions into a restricted VM/minimal DOM. Tests
cover adversarial text/input values, exact blur arguments, two-herb grouping,
filter modes/ordering/empty states, canonical URLs, whitespace variants/no-op,
individual assignment with missing taxonomy support, creation cancellation and
record shape, literal entities and complete library snapshots/write counts.
An initial harness run exposed a local variable shadowing its fixture input; the
harness input name was corrected without application changes.

## Isolated Chrome validation

Environment-provided Playwright, Chrome **155.0.8059.84**. All six exit 0 / PASS:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\Digital GM\node_modules\playwright'
node tests/browser-glossary-rendering.cjs
node tests/browser-filter-search.cjs
node tests/browser-system-rendering.cjs
node tests/browser-property-rendering.cjs
node tests/browser-core-rendering.cjs
node tests/browser-import-smoke.cjs
```

The glossary script uses real focus/fill/click-to-blur transitions, not artificial
blur dispatch. It verifies complete readable input values, quotes/apostrophes,
literal &amp; and &#39; strings, long Unicode names, and adversarial HTML event payloads.
It switches all three radios; unchanged group blur leaves raw legacy whitespace
and all records intact. A real grouped edit changes exactly both original herbs;
an unassigned edit changes exactly the special-ID herb, preserving Other taxonomy
and metadata. Expected writes: one persist/localStorage write per edit (two total).

Actual canonical links open item%20name, item name, and the quote/slash/percent/
Unicode/script-like ID. Description editor and delete controls receive exact IDs;
editor is closed and delete dialogs dismissed. Navigation makes zero writes.
Both first- and second-prompt cancellation preserve the complete library with zero
writes. Successful creation appends exactly the existing record shape, preserving
literal characters and persisting once. Full expected-library comparisons are made
after every operation. Render/open/filter/navigation and unchanged group blur have
zero writes. Expected counts are local instrumentation, not cloud verification.

Glossary results: **0 payload executions, 0 injected elements, 0 uncaught errors,
0 external requests, 0 unexpected writes**; two intentional edit writes in one
scenario and one intentional creation write after fixture reset. All previous
scripts also report PASS and zero unexpected writes.

## Isolation and evidence

All six scripts remove Firebase SDK tags/configuration/initialization, assert removal
before Chrome startup, and fulfill HTML through intercepted loopback requests.
External requests abort. Dead outbound proxy, disabled background networking,
blocked service workers, CSP connect-src none and fresh disposable profiles/context/
storage supplement isolation. Inline script/event execution is allowed during XSS
tests. Only synthetic data is used; no production website, Firestore, credentials,
real library or paid service is accessed.

Successful temporary evidence directories (not committed):

- Glossary: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-Jzwq1G`
- Filter: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-IlHMJh`
- System: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-EyH9mN`
- Property: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-XI5Nm7`
- Core: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-7xyNCU`
- Import: `C:\Users\veija\AppData\Local\Temp\franks-import-browser-Tt7TEp`

Developer validation awaits independent QA. Native prompts are automated. Existing
single-line input/new-value trimming and blur-triggered full rerender are retained.
Formula, general source-library and trash rendering remain unsafe/out of scope;
the whole application is not XSS-safe. Missing study routing, unverified server
authorization and asynchronous cloud persistence/conflict behavior remain unresolved.

Merging main automatically publishes GitHub Pages. Do not merge, auto-merge,
deploy or begin TASK 010.

**READY FOR INDEPENDENT QA — NOT MERGED.**

# TASK 004: safe library replacement

Baseline: `76fc572e8f73925b88e6b3168abba123cc6f748e`, after approved PR #2 merged.

## Behavior

Import remains whole-library replacement. Parsing and validation happen before
any change to the library or call to `persist`. The top level must be an object
with an `objects` array, including an empty array. Optional record lists
(`studyObjects`, `sources`, `trash`) must be arrays of objects; `objects` has the
same entry check. Optional name-keyed collections (`categories`, `properties`,
`systems`, `formulas`) must be objects whose values are records. `systemOrder`,
when present, must be an array of strings. Null collections and primitive entries
are rejected because existing consumers expect record collections.

Optional collections may be omitted. Known fields consumed by string/array methods
are type-checked with their failing path in the error message. These include
object name/description, props/taxonomy containers, the three display-name
taxonomies, native systems, study systems, property summaries/related names,
category subcategories, system categories, source titles/tags, and recognized
trash restoration payloads. Study names and source titles must be strings because
their ordinary selection lists unconditionally call `toLowerCase`; optional
object names and other supported absent/null fields remain accepted. IDs are
unchanged. No field limits, categorization, coercion, or cleanup are imposed.
Unknown fields, duplicate names, long text and legacy metadata are preserved.
This is consumer-driven type checking, not a comprehensive new schema.
Existing `ensureDbStructure` default additions remain unchanged.

Valid imports first offer the existing Exportera JSON mechanism. OK starts export;
Cancel skips export and proceeds to the separate replacement confirmation. That
final confirmation shows the filename, current/incoming object counts, populated
collection summaries, replacement semantics, backup advice and unsynchronized
change warning. Cancel there performs no replacement or persistence. Download
completion cannot be verified and is not claimed. Export startup failure stops
the import. Uploaded files are read only.

On final confirmation the prior library remains referenced, untouched, in memory.
Only incoming data receives defaults. Routing runs before the import's explicit
persist call and success message. A synchronous rendering/application/persistence
error restores the prior library reference and attempts to redraw the old page.
Already-started persistence is not promised
to roll back. Success reports in-memory replacement and invocation of the existing
save routine; it does not claim local durability or cloud success. The input resets
so the same file can be selected again. Read errors/aborts have explicit messages.

## Automated validation

Node.js `v24.12.0`, repository root, no installation/dependencies:

```sh
node --test tests/legacy-preservation.test.cjs tests/import-backup.test.cjs
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs tests/import-backup.test.cjs
```

Both: exit 0, **34 passed, 0 failed, 0 TODO, 0 skipped/cancelled**.

The 9 existing preservation tests, their harness and fixtures are unchanged.
25 import tests cover TASK 004 acceptance cases: valid/minimal/empty libraries,
malformed JSON/top levels/collection types, complete duplicate record preservation,
long text/unknown fields, preview contents, cancellation, confirmation ordering,
existing export execution, original `persist` entry point, synchronous defaults
and persistence rollback, export failure, file errors/abort, and isolation.
Corrections add numeric-name rejection, a table of incompatible known fields,
supported optional/null metadata, actual duplicate index rendering, and rendering
failure rollback with no success message or persistence.
The final routing correction additionally reproduces the supplied category
failure, exercises strict propagation through the actual router, verifies import
rollback/UI restoration with zero saves, checks normal/event/truthy-argument
fallback, and preserves legitimate `constructor` names and unknown metadata.

The new harness extracts actual import/validation/summary/default/export functions
and the initial state from `index.html`, plus actual `getDisplayObjName`,
`getPropKeys`, `hasProp`, `renderIndexPage`, `renderCategoryPage`, and
`handleRouting`. It executes them in an isolated VM using synthetic fixtures and
in-context FileReader, dialogs, download objects, and a recording `persist`
stand-in. A wrapper counts router calls but delegates unchanged to the extracted
actual router. No replacement import or routing algorithm is maintained.
No host objects/callbacks enter the VM; dynamic compilation is disabled. Firebase,
network APIs, Node access, and real localStorage are absent. Actual cloud/local
persistence is deliberately not executed. Regex extraction depends on reviewed
top-level formatting and is not a sandbox for malicious future source.

## Limits, risks, and deployment

An isolated real Chrome smoke test passed; see `BROWSER-QA.md` for the exact command,
configuration, scenarios and limits. No production browser test was performed.
No claim is made that cloud sync, authentication, or import
durability was integration-tested. Existing asynchronous saves, remote snapshots,
and whole-document overwrite races remain. A synchronous failure after a write
starts cannot guarantee storage rollback; only memory is restored. The existing
post-import routing function and its known side effects are unchanged: a missing
category route may create a category and invoke persist inside routing after
confirmation. Therefore rendering before the explicit import save is not a
transactional guarantee against every existing route side effect. Normal routing
retains its existing fallback. The importer alone calls `handleRouting(true)`:
only literal boolean true propagates caught rendering exceptions, so browser
event objects cannot accidentally opt in. A failure is caught by the importer
before its explicit persist/success, then old memory/UI restoration is attempted
using normal routing. The category grouping defect itself is deliberately not
fixed, and names such as `constructor` are not rejected or modified.
An initial new test expecting the object name `constructor` to render on the index
failed (33 pass, 1 fail) because the existing display-name dictionary also has
inherited-key behavior. The fixture now uses a valid selected category route to
test name preservation without assuming that unrelated defect is fixed; the
application dictionary was not changed. Final results are the 34 passes above.
Unsafe
rendering of imported content remains a separate existing security task.

Application edits are limited to import handling, its two validation/preview
helpers, and the router's explicit error-propagation option. No production access, real data import, migration, credentials, manual
deployment, synchronization redesign, or changes to unrelated features.

GitHub Actions history shows successful `pages build and deployment` runs for
`main` at both prerequisite merge commits (`673bdeb7...` and `76fc572e...`). This
is evidence that merges to main automatically deploy the website under current
configuration; merging TASK 004 must be treated as a deployment action. The Pages
configuration endpoint is unavailable through the connector, so the exact hosting
settings were not inspected. The approved prerequisite merge triggered that
existing automation; no workflow was manually dispatched. TASK 004 must remain
unmerged, automatic merge disabled, pending independent QA and owner review.

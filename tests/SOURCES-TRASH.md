# Sources Library and Trash — Task 013

READY FOR INDEPENDENT QA — NOT MERGED.

Verified main baseline: `2172c21d7031e93242e725f45facd449907ecaa0`.
Delivered implementation HEAD: `ba94a3efe11b35647fcd77e257986b3cf26acda7`.
A subsequent report-only commit adds this document; its exact delivery SHA is recorded in the PR and sibling evidence/delivered-head.txt to avoid a self-referential commit hash.

## Changes

Source author/year/title and Trash name/type are encoded at render time with escapeCoreText. Original library records remain unchanged; existing fallback and empty messages remain. Trash uses native buttons with fixed coreAction/bindCoreActions dispatch. Narrow layouts wrap trash names/actions without truncation.

Trash action arguments include a transient render generation. Before mutation, the action validates the library object, trash array, index, record reference, type, key, data reference and object ID captured for the displayed row. It rejects stale targets with a reopen message. Permanent deletion revalidates after confirmation. Invalid indices, missing generation, changed generations, replaced/reordered arrays, replaced library/records and changed identity fields cannot delete or restore unrelated records. No persistent identifiers were added.

Object restoration checks the immutable ID on the restored data against live object IDs. Property/category restoration checks own destination keys (including false-valued occupied keys). Occupied identities leave all live and trash records intact, display a collision message, and do not persist. Successful restoration retains all original fields. Own-key insertion safely supports keys such as __proto__ without changing prototypes. Unknown or malformed record types cannot be restored; permanent deletion remains available after confirmation.

Changed files:

- index.html
- tests/fixtures/sources-trash-library.cjs
- tests/sources-trash.test.cjs
- tests/browser-sources-trash.cjs
- tests/SOURCES-TRASH.md

## Validation

- node --test tests/*.test.cjs: **164 PASS**, zero failures/skips. All 129 existing tests/assertions preserved; 35 added.
- All nine existing Chromium suites PASS: core-rendering, filter-search, formula-rendering, glossary-rendering, import-smoke, property-rendering, study-routing, system-rendering, herb-assignment.
- New browser-sources-trash.cjs: PASS. Chromium 155.0.8059.84, zero payload executions, page errors or external requests.
- git diff --check: PASS. git status -sb clean after delivery commits.

Node tests execute extracted production functions. Browser tests execute the actual application with synthetic libraries and separate persist/Storage.setItem counters. Complete expected snapshots cover successful object/property/category restoration, occupied destinations, confirmed/cancelled deletion, unknown types, invalid/stale targets, false-valued occupied keys, reserved keys, nested metadata and preserved sources/tags. Successful mutations use exactly one persist call and one storage write. Rendering, rejected actions and cancellation use zero. During permanent-delete confirmation a changed list is also rejected by Node regression.

Source text includes Herbal <Research>, O'Brien & Sons, real Unicode, quotes, markup/event-handler payloads, numeric years and long titles. Trash names and types include the same hostile text. Neither renderer creates executable elements or dynamic event-handler attributes. Native Enter/Space and mouse activation pass. Empty-library/trash messages remain. Both pages fit at 1280px and 320px; screenshots visually inspected.

The browser harness removes production Firebase scripts/configuration/initialization before startup. Disposable profiles, synthetic snapshots, loopback routing, blocked external requests/proxy and service-worker blocking isolate tests. CSP deliberately allows inline execution, so injection is not masked by a script-blocking policy. No production libraries, secrets or live services were accessed.

Workspace: C:\dev\Franks projekt\Ort-Wikin\task-013\development.
Evidence: C:\dev\Franks projekt\Ort-Wikin\task-013\evidence. Includes node.txt, ten browser-*.txt logs, sources-1280.png, sources-320.png, trash-1280.png, trash-320.png. TEMP/TMP point to evidence\tmp. Playwright is an external dependency; no Digital GM or StudyWiki files were changed.

## Inherited limitations

Existing deleteTagWithWarning semantics are unchanged. Deleting a property removes herb assignments, and restoring the definition does not reconstruct those lost values. Deleting a category leaves property/system references; restoring it does not rebuild system lists. Object restore preserves the original props and metadata but does not invent missing referenced definitions. Legacy object deletion may persist even when no matching object is found. These behaviors are characterized rather than redesigned.

Restore is limited to the existing object/property/category record shapes. No schema migration, relationship repair, replacement-ID generation, source-management controls or language-completion work is included. New stale/collision messages are English; existing Swedish labels remain. Browser validation covers local persistence in Chromium, not live-cloud or screen-reader behavior. The guards establish intended record identity; they do not merge concurrent data or introduce synchronization. No merge, deployment or auto-merge was performed.

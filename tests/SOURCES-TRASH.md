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


## Malformed-restoration correction (2026-10-17)

Independent QA starting HEAD: `00bd545a459ef7ea1b47165d04bceda52f9adfd2`.
Unchanged main baseline: `2172c21d7031e93242e725f45facd449907ecaa0`.
Delivery status: READY FOR INDEPENDENT RE-QA - NOT MERGED. This developer validation does not replace independent re-QA.

The previous truthiness guard accepted numeric/string/array data as property/category definitions, removed the Trash item and persisted it. Restoration now calls the existing unmodified validateImportLibrary against a fresh minimal wrapper containing only the candidate property/category record. It does not inspect, validate or rewrite the live database. Non-null, non-array record shape and all existing optional text/string-array rules are reused exactly. Missing optional fields, optional nulls accepted by import, empty records and unknown nested metadata remain supported. Invalid format displays a clear message before mutation; the full live database and original Trash entry remain unchanged, with zero persistence/storage writes. Explicitly confirmed permanent deletion remains available.

Valid sparse category restoration exposed an inherited side effect: persist normally calls ensureDbStructure and inserts subcategories into sparse categories. Successful restoration now explicitly opts out of that initializer for its save, preserving candidate and unrelated sparse fields exactly. All other callers, including the beforeunload event listener, retain initialization behavior; only the literal boolean true opts out. The storage/cloud write lifecycle is otherwise unchanged. Browser instrumentation forwards arguments so it measures the real save path.

Correction files: index.html, tests/sources-trash.test.cjs, tests/browser-sources-trash.cjs, tests/SOURCES-TRASH.md. No existing assertions were removed. No import-validation rules were changed. No schema or relation-reconstruction changes.

Validation: **197 Node tests PASS**, zero failures/skips (all 164 previous tests plus 33 added). All ten existing Chromium suites PASS, including sources-trash, herb-assignment and import-smoke. Chromium 155.0.8059.84. git diff --check PASS after preserving original unchanged line endings. git status -sb clean after correction delivery commit.

Node and Chromium cover 22 invalid cases across property/category types: 42, string, array, null, false, every known optional text field with invalid numeric content, non-array list fields, numeric list members and mixed string/null list members. Each browser rejection compares the complete database and independently observes zero persist calls and zero Storage.setItem calls. Each original invalid entry is retained and can then be explicitly permanently deleted with one save. Eight valid sparse/metadata cases cover {}, unknown nested metadata, optional null text/list fields and valid text/string lists: full expected snapshots match, exactly one logical save/storage write, no defaults inserted into restored or unrelated sparse categories. Three tests verify default/event persistence initialization versus restoration opt-in.

Existing collision, stale-action, reserved __proto__, source/trash encoding, mouse/keyboard and mobile assertions remain and pass. Real-Chromium negative controls against old HEAD 00bd545 show property/category data:42 violate preservation and write once; corrected source preserves the entire snapshot with zero calls/writes for both. No payload execution, browser errors or external requests.

Evidence remains in C:\dev\Franks projekt\Ort-Wikin\task-013\evidence: correction-node.txt, ten correction-browser-*.txt logs, correction-new-control.json, correction-old-control.json and scratch correction-negative-control.cjs. TEMP/TMP stay under evidence\tmp. Firebase initialization/config/scripts are stripped before browser startup, synthetic disposable profiles/libraries only, external traffic blocked. No live services, production records, Digital GM or StudyWiki changes. No merge, deployment or auto-merge.

Inherited limitations above remain. On later normal startup/save, the existing global initializer may still add optional defaults; this correction preserves exact sparse shape during restoration/persistence without redesigning reload normalization. Independent re-QA must review the new immutable PR HEAD.

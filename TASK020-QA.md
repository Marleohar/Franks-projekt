# TASK 020 — Flat Formula Component Editing

**READY FOR INDEPENDENT RE-QA — NOT MERGED.**

Corrected implementation/test commit: `873764da1a56ce46b4f00453adee19f508767fd1`.
Rejected HEAD: `5ae92a32b61ecee78236cba71b168be904bbb0f3`.
Verified unchanged main: `acccfa35cd613e521c864fbf3fe3865222763bfa`.
Existing PR: https://github.com/Marleohar/Franks-projekt/pull/19.

The following report-only commit records this validation. Final immutable PR HEAD is recorded in the PR body, delivery and `task-020/correction/qa-preparation/README.md`, avoiding a self-referential tracked hash. The corrected exact HEAD requires new independent QA approval.

## Q20-1 — Complete array preflight and prepared in-place mutations

Read the complete independent QA report and its Node/Chromium/minimal-reproduction graphs, descriptors and payloads. Before changing production code, freshly reproduced all four variants on a new pristine checkout of exact rejected HEAD, preserving the original QA checkout and evidence. **All 130 artifact hashes from the original independent manifest still match.**

Root cause: Object.keys omitted hidden own numeric properties. Splice overwrote earlier slots, then threw on a protected assignment/deletion. It could leave `[A,B,C]` as `[B,C,C]` even with zero persistence calls. Consuming the draft before that splice also left the dialog stuck. Normal beforeunload could subsequently persist the damaged graph. Replacing enumeration alone would not address holes, inherited indexed behavior, iteration/species hooks, all moved slots or protected row fields.

The correction defines and validates supported ordinary array layouts before row reads or mutation controls are exposed. It inspects **all own descriptors** with Reflect.ownKeys, rejects sparse/undefined/hidden/accessor index layouts and executable array hooks, and rejects custom prototypes or inherited numeric slots. Unsafe layouts remain unchanged with the existing localized non-destructive unsupported-format state. No arrays are rebuilt or repaired.

For Add/Remove, every ordinary own numeric slot must be a writable/configurable data property, length writable and the array extensible. For Edit, every changed row field must be safely definable before any field is written. A read-only dense array may still contain a safely editable mutable row. All modes reject unsupported layouts; non-index data metadata is retained, including readonly named array metadata.

A complete slot plan is prepared before consuming the action. Application uses own data-property definitions, a known-deletable tail and a prevalidated length change, synchronously. It invokes no push/splice override, inherited setter, species constructor or custom iterator. The original array, moved row references, descriptor attributes and unrelated metadata are preserved. Edit/Remove require integer in-range component indices; named array metadata cannot be targeted. Add never reads an unused row/index.

Session/route/full-graph/row-order guards remain. Old Save/Cancel callbacks cannot consume a later component or description editor. Supported normal Add/Edit/Remove still save **once through persist(true)**. Unsupported/stale/cancelled/no-op/readonly operations make **zero graph mutations and zero operation persist/local/cloud writes**. The shared serializer and beforeunload policy are unchanged.

## Fresh before/after evidence

Separate correction workspace: `C:\dev\Franks projekt\Ort-Wiki\task-020\correction`.

| Original variant | Rejected result | Corrected result |
|---|---|---|
| Hidden non-configurable tail, remove first | Earlier shifts, then delete TypeError | Original graph/descriptors intact; 0/0/0 |
| Hidden non-writable middle, remove first | Earlier overwrite, then assignment TypeError | Same |
| Hidden protected tail, remove middle | Earlier shift, then delete TypeError | Same |
| Sparse array with hidden protected tail | Earlier deletion/shifts, then TypeError | Same |

Before: nine Node probes (four known failures/five safe controls), eleven native Chromium comparisons (four known failures, four reloads persisting damaged data, three safe controls). Every original case includes complete before/after descriptors and graph snapshots. These were collected before production edits.

After: original starting graphs match before reproductions exactly. Immediate rejection and pre-reload graphs/descriptors are unchanged. Ordinary reload uses the established **1 persist / 1 local / 0 deferred cloud** path and its payload contains the original uncorrupted graph. Export and actual reimport also retain the original values. Descriptor attributes/holes are not JSON fields: exact runtime descriptors are compared before reload, then original serialized graph equality after reload. No migration or silent normalization was added.

Evidence relative to correction/evidence:

- `before/node-reproduction.txt`, `before/independent-array-node.json`: fresh original failures and full descriptor comparisons.
- `before/browser-reproduction.txt`, `before/independent-array-browser.json`, `before/independent-graphs.json`: all four native failures and each damaged-graph reload.
- `final/component-atomicity-snapshots.json`: complete corrected graph/descriptor/counter/payload records, including inherited numeric descriptor values and flags.
- `four-case-before-after.json`: exact four-case correspondence and original-data reload payloads.
- `original-qa-preservation.json`: 130 unchanged original evidence hashes.
- `validation-manifest.json`: final suite results, tested source fingerprint and immutable revisions.
- `final/atomic-*.json`: actual downloaded JSON backups for every rejected array case.

## Actual correction validation

**705 Node tests PASS, zero failures/skips**: all 593 prior tests plus 112 focused correction cases.

**All 19 Chromium suites PASS**: all 18 existing suites plus `browser-component-atomicity.cjs`. Raw final logs are `correction/evidence/final/browser-*.txt`; Node output is `final/node.txt`.

The new atomicity suite passes **218 complete comparisons over 25 layouts**:

| persist / local / mocked cloud | Comparisons |
|---|---:|
| 0 / 0 / 0 | 159 |
| 1 / 1 / 1 | 9 approved operations/imports |
| 1 / 1 / 0 | 50 diagnostic reloads saving original graphs |

All **68 serialized local/mock-cloud payloads** match the complete expected graphs. It tests original four failures, protected indices before/at/after selection, holes, undefined slots, frozen/sealed/nonextensible arrays, length restrictions, inherited data/accessor indices, custom iteration/species hooks, safe ordinary mutations, array/row/metadata identity, protected row slots, repeated/expired callbacks, export/import and immediate/pre-reload/post-reload preservation. No page errors or external requests occur.

Prior TASK015/016/018/019/020 protections remain: 123 original component checks/89 matching payloads; 163 description-session checks; 119 direct-link checks/24 stale cases; 101 special-key checks; 76 rename checks; 57 formula-profile checks. Swedish/English, keyboard/focus/Escape, mouse/touch and 1280/375/320 layouts remain covered by the unchanged existing suites. Their screenshots are regenerated in final evidence.

No previous assertions were weakened. Node formula-rendering/component harnesses only add actual production-helper dependencies. Tests remain synthetic with Firebase SDK/configuration/initialization removed before startup, external requests blocked, disposable profiles and task-local TEMP/TMP. Digital GM is an external Playwright dependency only; StudyWiki and production services are untouched.

## Correction changed files and remaining limits

Correction-specific: index.html; tests/formula-components.test.cjs; tests/formula-rendering.test.cjs; tests/browser-component-atomicity.cjs (new); tests/fixtures/component-atomicity-library.cjs (new); TASK020-QA.md.

The full PR also retains tests/browser-formula-components.cjs and tests/ui-localization-inventory.json from the original feature (eight changed files total). No unrelated functionality, schema or serializer was changed. Final diff checks pass, tracked screenshots are unchanged and the feature branch is clean after commits.

The contract covers JSON-compatible libraries and ordinary arrays/records with the tested descriptor variations; arbitrary executable proxies or tampered native intrinsics are outside that persisted-data contract and were not tested. Unsupported layouts are rejected, not migrated. Legacy writers outside these component operations retain existing serialization behavior. Headless/touch emulation is not physical-device testing, and mocked cloud calls do not establish live durability. This is developer validation, not independent approval.

## Original feature and historical validation

The following original implementation notes/results describe the initial feature and rejected delivery. The corrected validation above supersedes its 593-test/18-suite totals.

Verified base: `acccfa35cd613e521c864fbf3fe3865222763bfa`.
Branch: `task-020-formula-components`.
Original feature implementation/test commit: `fcf4b2ec27bf554eea1dae36a53d675942e83033`.
The final immutable HEAD and PR URL will be recorded in the delivery, PR body and task-local QA handoff after validation. No merge, deployment or auto-merge is authorized.

## Historical comparison

Read TASK017-AUDIT.md and the TASK019 developer and independent QA reports before implementation. Inspected the working formula editor at `7184273ccc46e300bed0c557c39f4fa55e299bd5` directly from Git; the excerpt is preserved at `../evidence/historical-formula-editor.txt`.

Its creator appends `{ objId: herbs[idx].id, role, qty: 1, unit: "g" }`. Role is free text (the old prompt suggested the literal Swedish phrase Aktiv komponent). Historical controls edit role/quantity/unit and splice one indexed row. They also contain unsafe interpolated handlers, immediate writes, unconfirmed removal, a unit-conversion list, percentage calculations and `(c.qty || 1)` zero substitution. Those behaviors were not copied.

This restoration keeps the established flat record representation and verified quantity/unit defaults **1 / g**, with a blank free-text role. The creator selects existing herb/object records only; it never creates a herb. Stored roles and units are not translated, constrained to a taxonomy or converted. Nested formula interpretation and calculations remain outside scope.

## Implementation and preservation

Formula profiles provide **Lägg till komponent / Add component** and per-supported-row **Edit component / Remove component** actions. The chooser searches display names and literal immutable IDs, showing both to distinguish duplicate names. Selecting a result changes only the pending draft. Add and Edit require native confirmation through Save. Remove opens a separate confirmation state for that exact row; only Confirm removal mutates it.

New rows append once. Edit updates only changed role/qty/unit slots on the original row. Remove splices only the selected index after validating the original row sequence. Other row order, duplicate object references, object IDs, unknown row/formula fields and unrelated graph data are preserved. No persistent row IDs, migration, implicit object creation or whole-library normalization is introduced. Successful mutations call **persist(true) once**.

Quantity input accepts a finite number for a new or explicitly changed quantity. Zero is accepted. Unchanged quantities retain their exact stored type/content, including string 0.00 and unusual legacy values. Role/unit are free text on explicit edits; untouched fields retain exact original values, including missing/null/structured legacy fields. Merely opening or accepting an unchanged editor does not normalize them. Numeric spelling changes that equal the existing numeric value are no-ops.

A record with a literal string objId can be edited/removed even when its object reference is missing; the unavailable reference is not repaired. Primitive, array, missing-ID and nested-formula-shaped rows remain visible with a clear unsupported-format message and no mutation controls. Non-array/absent component collections retain Task019's unsupported state and are not replaced by an empty array. Unknown nested metadata is preserved. These are deliberate non-destructive compatibility boundaries, not a migration or a promise of nested editing.

## Operation authority and atomic rejection

Each Add/Edit/Remove dialog captures an exact operation object. Its Save, Cancel, chooser/search and backdrop closures validate that object before touching UI or data. Completion/cancellation invalidates it. Profile actions capture library/map/formula/array/row identity, route and a complete snapshot before opening; detached/stale controls reject, and retained background component controls cannot displace an active editor.

Confirmation checks the same library, formula map/record, array and ordered row identities, route and full graph snapshot. Reordering, replacing or removing rows, changing values/metadata or replacing the library/formula rejects before mutation. A selected Add object must still be the exact live object and have an unambiguous immutable ID. An unrelated identical-value herb identity replacement does not invalidate an Edit/Remove target; changed data does. Add rejects replacement of its selected object even when values are identical.

All changed property descriptors or array slots are preflighted before mutation, preventing partial writes on frozen/non-writable targets. The existing TASK019 description session guards remain; opening another editor invalidates the component operation, and captured old callbacks cannot consume a later component or description session. Invalid, cancelled, no-op, consumed and stale actions produce **0 persist / 0 localStorage / 0 mocked-cloud writes**.

The full-graph snapshot guard is intentionally conservative about concurrent value changes: reopen the profile/editor to use newer data. Invalid input leaves the current operation open with a localized message and no mutation.

## Validation evidence

All logs and artifacts are under `C:\dev\Franks projekt\Ort-Wiki\task-020\evidence`, separate from development and `qa-preparation`. All validation below was freshly executed on the implementation above.

- `node.txt`: complete Node regression output, including all 523 previous tests.
- `browser-*.txt`: separately executed existing browser suites and the new `browser-formula-components.cjs`.
- `formula-components-snapshots.json`: full before/expected/actual graph comparisons, actual serialized local/mock-cloud payloads, operation counts, and editor/focus state for retained callbacks.
- `formula-component-{sv,en}-{1280,375,320}.png`: six responsive component-dialog screenshots. English 320 px was visually inspected.
- `formula-components-backup.json`: actual downloaded JSON export, then imported and reloaded.
- Existing Task015/016/018/019 suites retain their original assertions, including the 163 description-session checks, 119 direct-link checks / 24 stale cases, 101 property-key checks, 76 rename checks and 57 formula-profile checks.

New Node tests cover defaults, repeated additions, duplicate names/IDs, exact row edit/removal, missing references, zero/string quantities, missing/unknown/structured fields, no-ops, invalid quantities, cancellation, unsupported structures, all stale mutation kinds in all three modes, repeated/retained/forged callbacks, and readonly atomic preflight.

The new Chromium suite imports a real synthetic JSON library; tests actual native controls in Swedish/English at 1280/375/320; exercises keyboard result selection, Enter activation, Tab/Shift+Tab containment, background focus rejection, Escape, mouse and emulated touch; and verifies no horizontal overflow. Six responsive sequences each add two rows, edit one and remove exactly one with cancellation coverage. Additional probes cover 30 stale cases, all five description modes in both callback directions, same/different row/formula reopenings, unused replaced operations, retained Cancel/backdrop/connected/detached controls, missing/unsupported references, readonly multi-field preflight, duplicate object references, legacy values and consumed Save callbacks. Current native Save is tested after rejected old callbacks.

Actual export/import/reload compares complete graphs and payloads. Counters live in Node outside the page, so document replacement cannot hide beforeunload writes. Ordinary formula-route reload retains the existing **1 persist / 1 local / 0 deferred cloud** behavior; it is reported separately from the exactly-once user mutation.

## Reproduction and isolation

Set TEMP/TMP to task-local `evidence\tmp`, TASK_EVIDENCE to an independent evidence directory, and PLAYWRIGHT_MODULE to the installed external tooling. From a fresh checkout of final PR HEAD:

```powershell
node --test tests/*.test.cjs
Get-ChildItem tests/browser-*.cjs | ForEach-Object { node $_.FullName }
git diff --check
git status -sb
```

Independent QA should use a new isolated checkout and evidence directory. Screenshot-writing suites must not run in the development checkout during independent QA. All 18 browser scripts are committed and reproducible; no assertions were weakened in prior suites.

Synthetic libraries/disposable Chromium contexts only. Production Firebase SDK scripts, configuration and initialization are removed before browser startup. External page requests are blocked, service workers disabled and browser traffic outside the intercepted loopback origin uses a dead proxy. TEMP/TMP, profiles, screenshots, logs and backups remain under the Frank workspace. Digital GM supplies only an external Playwright module; neither Digital GM nor StudyWiki files were modified.

Limitations: headless Chromium viewport/touch emulation, not physical devices; mocked cloud calls do not establish live cloud durability. JSON-compatible library records are the preservation contract. Unsupported component collections/rows are retained rather than made editable. No unresolved product question blocks this flat-component scope. This is developer evidence; independent QA must approve the exact final HEAD before merge.

## Changed files

- index.html
- tests/formula-components.test.cjs
- tests/browser-formula-components.cjs
- tests/ui-localization-inventory.json
- TASK020-QA.md

## Actual final results

**593 Node tests PASS, 0 failures, 0 skipped**: all 523 previous tests plus 70 new focused cases. **All 18 Chromium suites PASS**: the 17 existing suites and the new formula-components suite. Existing assertions were not weakened or edited.

Component browser evidence contains **123 complete graph/counter comparisons**:

| persist / local / mocked cloud | Comparisons |
|---|---:|
| 0 / 0 / 0 | 78 |
| 1 / 1 / 1 | 44 approved operations |
| 1 / 1 / 0 | 1 actual reload |

All **89 serialized local/cloud payload observations** equal the complete expected graphs. The focused suite has 30 stale cases, native keyboard result activation, mobile touch, expired search/selection handlers, and safe own __proto__ formula-key coverage. Every comparison checks for executed hostile handlers and injected images. Zero page errors and zero external requests were reported. Chromium: **155.0.8059.84**.

All existing suites retain their reported results: 163 description-session checks, 119 direct-link checks / 24 stale cases, 101 special-key checks, 76 rename checks and 57 formula-profile checks. The remaining suites are category-links, core-rendering, filter-search, formula-rendering, glossary-rendering, herb-assignment, import-smoke, localization, property-rendering, sources-trash, study-routing and system-rendering. Raw outputs are the matching browser-*.txt logs; validation-manifest.json summarizes every suite.

`git diff --check` PASS. No tracked screenshot changed. Main remains the verified baseline. The implementation and this report are delivered as separate commits; final immutable PR HEAD is recorded in the PR body and task-local qa-preparation/README.md rather than a self-referential tracked hash.

**READY FOR INDEPENDENT RE-QA — NOT MERGED.**

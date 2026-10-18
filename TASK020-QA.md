# TASK 020 — Flat Formula Component Editing

**READY FOR INDEPENDENT QA — NOT MERGED.**

Verified base: `acccfa35cd613e521c864fbf3fe3865222763bfa`.
Branch: `task-020-formula-components`.
Implementation/test commit: `fcf4b2ec27bf554eea1dae36a53d675942e83033`.
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

**READY FOR INDEPENDENT QA — NOT MERGED.**

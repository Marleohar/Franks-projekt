# TASK 019 — Formula component display and description editing

**READY FOR INDEPENDENT RE-QA — NOT MERGED.**

Verified unchanged main: `6e3e70bab9d7a3149a97d1d0f1a1d428d4236587`.
Current correction implementation/test commit: `be621660b6fc1fd69d85e4d6a8fd5a81a2b36edd`.
Rejected HEAD: `3f81401d00111cccd19a2f2e3f0f4c99399f3560`.
Existing PR: https://github.com/Marleohar/Franks-projekt/pull/18.
Initial component-display implementation: `7c4f0d2cc379edcd6c27998ee6ab278194ebda52`.
Branch: `task-019-formula-display`.
The following report-only commit supplies this document. The exact final PR HEAD is recorded in the PR body and delivery, avoiding a self-referential document hash. Independent QA must pin that final HEAD.

## Q19-1 blocking correction — shared Save session authority

The independent QA report at `task-019/QA/TASK019-INDEPENDENT-QA.md` and its full reproduction/evidence were reviewed. That checkout, report and evidence remain untouched at the rejected HEAD.

**Root cause:** non-formula Save handlers called saveDescription() through mutable global editorMode/editorTargetId. A callback from a canceled herb/property/category/system editor could therefore approve a later formula draft. Guarding only formula-origin callbacks left the cross-editor path open.

Before production changes, all four variants were freshly reproduced in Chromium against a pristine disposable checkout of exact rejected HEAD. Each old callback changed the current formula description, closed its unconfirmed editor, and produced **1 persist / 1 localStorage / 1 mocked-cloud write**. The current starting database graphs are identical between those before reproductions and their corrected counterparts.

**Correction:** every valid openEditor call creates a unique session object capturing editor type, exact target/collection/record, library, route and a record snapshot. Every Save button callback closes over that object and passes it explicitly. The static argument-free Save handler was removed. saveDescription first verifies that exact active, unused session and matching editor identity. Old, canceled, consumed, replaced and unscoped callbacks return before reading/changing the newer editor. Closing invalidates the current session; an accepted Save consumes it before mutation/persistence. Live target/library/collection/route/value changes reject safely. Normal non-formula trim/persist/render branches remain; their writes are preflighted against read-only or nonextensible description slots. Formula full-library/component identity/snapshot checks remain intact.

A rejected retained callback does not close the current modal, consume its token, clear its formula draft, change text, refocus controls, render another profile or persist. A new valid session receives a new object even for the same record, so mode/ID equality alone never grants authority. Three replacement-without-Cancel cases also prove identity fencing when the old session is still unused.

### Fresh before/after evidence

Separate correction workspace: `C:\dev\Franks projekt\Ort-Wiki\task-019\correction`.

| Canceled callback origin → current formula | Rejected HEAD writes | Corrected writes | Corrected current editor |
|---|---|---|---|
| Herb | 1 / 1 / 1 | 0 / 0 / 0 | Open; same text, focus, session and formula draft |
| Property | 1 / 1 / 1 | 0 / 0 / 0 | Same |
| Category | 1 / 1 / 1 | 0 / 0 / 0 | Same |
| System | 1 / 1 / 1 | 0 / 0 / 0 | Same |

Write triplets are persist/localStorage/mocked-cloud counts. Evidence paths below are relative to `correction/evidence`:

- `before/description-session-snapshots.json` and `before/reproduction.txt`: four independently rerun original failures, complete graphs, payloads and before/after active editor state; status REPRODUCED.
- `after/description-session-snapshots.json`: **163** complete graph/counter checks with active editor/draft/focus snapshots.
- `q19-1-before-after.json`: four-case comparison, verifying identical starting graphs, correction zero writes and unchanged active UI.
- `after/browser-description-sessions.txt`: PASS; **30** ordered session/record pairs, **3** replacements without cancellation, **35** stale cases, zero page errors/external requests.
- `node.txt`, seventeen `after/browser-*.txt` logs and `validation-manifest.json`: actual complete regression results.

The new 163-check suite has **129 at 0/0/0** and **34 approved real changes at 1/1/1**. Its **68 serialized local/cloud payload observations** equal the complete expected graphs. Thirty ordered pairs cover every editor type against every type, including the four original failures, inverse formula-origin paths, adjacent non-formula editors, same-record reopening and different-record same-type reuse. Every rejected callback preserves the active editor exactly; its actual current Save remains functional, saves only the intended description once, and repeated callbacks/cancellation write nothing. Invalid/unscoped calls cannot consume a valid session. Library/container/record replacement, deletion, changed values/nested metadata and route changes are tested for all five modes.

Permanent Node regressions include the four named Q19-1 variants, all ordered transitions, same/different records, still-unused replaced sessions, stale identities/values, invalid invocation/opening and readonly targets. The existing formula harness now invokes Save with the authorized session where it represents a valid Save; prior graph/security/identity/persistence assertions remain unchanged. Separate negative cases require unscoped Save to be a harmless no-op.

To reproduce the original failures using the permanent browser driver, point DESCRIPTION_SESSION_SOURCE at `correction/rejected-checkout/index.html`, set DESCRIPTION_SESSION_BASELINE=1 and use a separate TASK_EVIDENCE directory. To run corrected coverage, unset those two overrides and run `node tests/browser-description-sessions.cjs`. Always set task-local TEMP/TMP first. The rejected checkout is pristine at the exact rejected SHA; no production code was edited before collecting the before evidence.

Correction-specific changed files: index.html; tests/formula-rendering.test.cjs; tests/browser-description-sessions.cjs (new); tests/ui-localization-inventory.json; TASK019-QA.md. No component renderer/data-model or unrelated editor feature was redesigned.

## Historical comparison and baseline evidence

TASK017-AUDIT.md was read before implementation. The working formula profile at `7184273ccc46e300bed0c557c39f4fa55e299bd5` was inspected directly from Git: component rows resolve c.objId against object IDs and show role, quantity/unit and a formula description editor. That historical implementation also includes unsafe interpolated handlers, editing/removal controls and calculations using `(c.qty || 1)`. Those parts were not copied. The audit identifies `414aef2630801f00428e7c6aa19069bc7ec2b298` as the persistent simplification that removed the display/editor entry.

A fresh isolated Chromium reproduction against exact current main confirms nine stored component rows remain in the graph while the formula detail view renders neither their contents nor a visible description action. Reading that profile leaves the full graph identical with **0 persist / 0 localStorage / 0 mocked-cloud writes**.

Evidence under `C:\dev\Franks projekt\Ort-Wiki\task-019\evidence`:

- `formula-baseline.json`: immutable baseline, complete before/after graphs, zero counters and missing-feature findings.
- `formula-baseline.txt`: REPRODUCED, zero page errors/external requests.
- `formula-baseline-missing-ui.png`: original hidden-component profile.
- Reproduction driver: sibling `qa-preparation/reproduce-baseline.cjs`, which reads main from Git objects and disables Firebase before startup.

## Restored behavior

Formula profiles now display an escaped, read-only component list: exact object-ID-resolved profile link/name, role, quantity and unit. Duplicate visible names remain distinct by ID; literal percent IDs are encoded exactly once. Number 0 and string `0.00` retain their displayed values. Role/unit text is not mapped, calculated or converted.

Missing references display an unavailable label without a link or graph repair. Missing IDs and primitive/array/incomplete rows display safe missing-reference/field placeholders. Empty arrays have an empty-state message; absent/non-array legacy component collections have an unsupported-data message. No records/fields are discarded or rewritten. Objects with nested-formula-looking metadata remain uninterpreted; no nested formula traversal occurs. Unencodable legacy object IDs remain unavailable rather than breaking rendering.

The visible **Redigera beskrivning / Edit description** button opens the existing textarea for the exact own formula key. Formula-only drafts capture the library/map/record, route, component array/row identities and a full structured snapshot. Before any mutation, Save checks these against current state and preflights the description slot. Changed/replaced/deleted/stale contexts and non-writable slots reject without a save. This is deliberately conservative: another in-place library change also invalidates an open formula draft.

A real approved change updates only desc and calls **persist(true) once**, bypassing unrelated initialization/normalization. The formula record, component array/rows and unknown metadata remain intact. Missing desc is added only on explicit real change. Unchanged input preserves original whitespace, missing fields and even unsupported legacy non-text description values rather than silently converting them. Changed text retains the existing trim-on-save convention.

Cancel, backdrop cancellation, Escape, unchanged Save, repeated Save and retained callbacks write nothing. Every Save callback is bound to one exact editor session; an old callback cannot consume a later session. Detached/stale profile actions reject. The existing modal focus framework is reused, adding textarea to its focusable selector. Focus enters the textarea, stays inside the modal, and returns to the initiating/newly rendered button. Other profile editors retain their existing save branches; an actual herb edit after closing the formula editor is tested.

No component creation, role/quantity/unit editing, removal, calculations, conversions, nested interpretation, general source/study editing or category/relationship change was added. No schema migration is required.

## Explicit existing-test change

The old browser-formula-rendering assertion intentionally characterized the missing UI by requiring no editor action, then invoking openEditor programmatically. It now requires one visible formulaEditor button and clicks it. Its exact key, existing text, Save, graph, creation/deletion, security and write-count assertions remain intact. Its persist spy now forwards arguments so it observes the real preserveStructure flag.

The Node harness adds dependencies for the actual display, snapshot and modal helpers, mutable db for stale-library probes and minimal DOM fixtures. Existing assertions remain. The initial feature adds nine paired Swedish/English keys; the correction adds one paired shared stale-context message.

## Actual validation

**523 Node tests PASS, 0 failures, 0 skipped**: all 451 previously passing tests plus 72 new session regressions. `node --test tests/*.test.cjs`; raw output `evidence/node.txt`.

**All 17 Chromium suites PASS**: category-links, core-rendering, description-sessions (new correction suite), direct-link, filter-search, formula-profile (new), formula-rendering, glossary-rendering, herb-assignment, import-smoke, localization, property-keys, property-rename, property-rendering, sources-trash, study-routing and system-rendering. Each was executed separately; raw logs are `evidence/browser-*.txt`.

TASK016 direct linking retains **119 checks / 24 stale cases**; property-key coverage retains **101 checks**. TASK018 non-destructive rename retains **76 checks**. TASK015 explicit empty-category membership and protected missing-category routes pass. Existing formula creation/deletion and exact routing/security assertions pass.

### Formula-profile graph and counter regressions (still passing)

`formula-profile-snapshots.json` contains **57 complete before/expected/actual comparisons**, independently counted from its records:

| persist / localStorage / mocked cloud | Checks |
|---|---:|
| 0 / 0 / 0 | 45 |
| 1 / 1 / 1 | 11 |
| 1 / 1 / 0 | 1 real reload |

The eleven successful operations comprise eight ordinary description edits, one sparse-description creation, one shared herb-editor regression and one real JSON import. These are logical saves, not eleven distinct formulas. **23 serialized local/cloud payload observations** also match the complete expected graphs.

Coverage includes zero/one/many rows; exact duplicate-name IDs; hostile names/roles/units; 0/string quantities; missing references; malformed/legacy rows and collections; unknown nested metadata; absent and legacy description data; Cancel/Escape/backdrop/unchanged input; stale library/map/formula/deletion/description/nested metadata/component identities/route; frozen and nonextensible record rejection; retained controls and old Save callbacks; real backup download, import and reload. Stale snapshots are taken after the concurrent synthetic change, ensuring that newer data is preserved rather than reverted.

Reload counters live in Node outside the browser page. The established beforeunload save is observed as 1 persist, 1 local write and 0 deferred cloud writes after document destruction. It is not a second description save. Export/import/reload preserves all component shapes, unknown fields and literal own __proto__ formula identity; no prototype mutation occurs.

Swedish and English were exercised at **1280, 375 and 320 px**, with mouse, native keyboard activation and emulated touch. Tab remains inside the modal; background focus attempts are redirected; Escape cancels; useful focus is restored after rerender. No horizontal overflow or stored-handler execution occurs. Six screenshots are `formula-profile-{sv,en}-{1280,375,320}.png`; narrow English was visually inspected. Long hostile formula titles still squeeze the inherited Delete label into a narrow column; the restored editor/list remain usable and no unrelated header redesign was included.

Final focused browser results report zero page errors and zero external requests. Full graph comparisons preserve TASK015 categoryLinks, herb/study property values, source/Trash records, taxonomies, IDs, record order and unknown metadata.

`git diff --check` PASS. Screenshot-writing suites did not leave tracked screenshot changes. `correction/evidence/validation-manifest.json` records current parsed suite results, counters and the exact implementation/final revision.

## Changed files

- index.html
- tests/formula-rendering.test.cjs
- tests/browser-formula-rendering.cjs
- tests/browser-formula-profile.cjs
- tests/browser-description-sessions.cjs
- tests/fixtures/formula-profile-library.cjs
- tests/ui-localization-inventory.json
- TASK019-QA.md

## Isolation, reproduction and independent review

Development: `C:\dev\Franks projekt\Ort-Wiki\task-019\development`.
Current correction evidence: sibling `correction/evidence`, with TEMP/TMP set to `correction/evidence/tmp`. Original feature evidence and independent QA artifacts remain untouched.
Current QA preparation: sibling `correction/qa-preparation`; independent QA should create its own disposable checkout and evidence directory, pinning final PR HEAD.

```powershell
$env:TEMP='C:\dev\Franks projekt\Ort-Wiki\task-019\correction\evidence\tmp'
$env:TMP=$env:TEMP
$env:TASK_EVIDENCE='C:\dev\Franks projekt\Ort-Wiki\task-019\correction\evidence\after'
$env:PLAYWRIGHT_MODULE='C:\dev\Digital GM\node_modules\playwright'
node --test tests/*.test.cjs
Get-ChildItem tests/browser-*.cjs | ForEach-Object { node $_.FullName }
git diff --check
git status -sb
```

Independent QA must substitute its own evidence/temp destinations to preserve developer evidence. Digital GM is only an external module dependency; it was never the cwd/output directory. StudyWiki and unrelated repositories were not altered. Browsers use disposable contexts with blocked external requests, disabled service workers and production Firebase SDK/configuration/initialization removed before startup. No production libraries or services were used.

Limitations: this correction does not change legacy unchanged-save/normalization policy for non-formula modes; formula unchanged saves remain zero-write. Headless Chromium with simulated touch/viewports, not physical-device testing; mocked cloud calls do not establish live cloud durability or distributed transaction behavior. Preservation targets JSON-compatible library records; no new serializer policy was introduced. This is developer validation, not independent approval. Broader formula editing and unrelated recovery tasks remain deferred.

**READY FOR INDEPENDENT RE-QA — NOT MERGED.**

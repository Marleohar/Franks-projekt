# TASK 018 — Non-destructive property renaming

**READY FOR INDEPENDENT QA — NOT MERGED.**

PR: https://github.com/Marleohar/Franks-projekt/pull/17

- Verified unchanged main baseline: `619c707bb74ad4c6c5f616a405af3300e73b4e0c`.
- Immutable tested implementation/test commit: `18ac667688f358e7ce73b5bb08d5869bd6ebe641`.
- Branch: `task-018-non-destructive-property-rename`.
- The following report-only commit records that tested revision. Its final delivery SHA is recorded in the PR body and delivery response; production/test content is unchanged, avoiding a self-referential document hash. Independent QA must test the final PR HEAD.

## Original defect reproduced before production changes

TASK017-AUDIT.md and its full risk graphs were reviewed first. On the unchanged baseline, a real Chromium property-profile rename changed a stored **0** and a structured `{dose:99,metadata:{keep:[0,false]}}` into **true**, left study.props.P under the old name, and left the source property tag under P. The old operation called persist once, wrote localStorage once and invoked the mocked cloud setter once.

Evidence workspace: `C:\dev\Franks projekt\Ort-Wiki\task-018\evidence`.

- `baseline-reproduction.json` — complete original before/after graphs, original SHA and 1/1/1 counters.
- `baseline-reproduction.txt` — status REPRODUCED, both value loss and orphan references confirmed.
- `baseline-check/focused-negative-control.txt` and its `property-rename-snapshots.json` — the new actual-JSON browser regression run against the exact old source exits **1**, failing the original TASK017 full-graph assertion after a successful import. This is an expected negative control, not a corrected-suite failure.
- Exact synthetic input is committed as `tests/fixtures/property-rename-reproduction.json`; the positive Node and Chromium tests use it directly.

Separate QA preparation: `C:\dev\Franks projekt\Ort-Wiki\task-018\qa-preparation`. The reproduction driver now reads the immutable baseline source there, not the updated development file.

## Correction

The existing rename prompt remains the user interface. No formula/study/source editing or relationship interface was introduced.

The rename creates a single-use draft containing the original library, original definition, route, typed record/container identities and a structured snapshot. Before applying anything it checks the current context, original own definition, destination and every relevant identity/value. Concurrent changes cause conservative rejection, including unrelated in-place library changes during the prompt; the user must reopen the current property.

Successful renaming constructs ordered replacement key maps using property descriptors, retains the original values and definition record by reference, maps only schema-defined references, preflights every write, then applies them synchronously and calls **persist(true) once**. This bypasses ensureDbStructure normalization for this save. Record arrays, source tags, IDs and unknown metadata remain intact. Unrelated key order is preserved; ordinary string-key replacements retain the original slot, subject to JavaScript's standard integer-key enumeration rules.

The old hasProp/setProp Boolean transfer is not used. No global string replacement, deduplication, migration or relationship cleanup runs.

### Typed reference inventory

| Stored location | Rename behavior |
|---|---|
| db.properties own key A | Re-key to B, preserving original definition object and unknown fields |
| objects[].props own key A | Transfer exact own value, regardless of assigned/Boolean state |
| studyObjects[].props own key A | Same exact-value transfer; no optional fields manufactured |
| properties[*].related | Replace exact A strings with B, preserving duplicates/order/asymmetry; no inverse links invented |
| sources[].tags with own type="property" and own id=A | Update id only; keep source ID, pages, other tags and metadata |
| Trash type object data.props | Transfer the typed assignment, preserving its value and record identity |
| Historical Trash type study_object data.props | Same explicitly typed legacy assignment; restoration support is unchanged |
| Trash type property data.related | Retarget outgoing related-property references; keep Trash entry id/name and definition identity unchanged |
| Active filter key list | Retarget exact A criteria only, retaining order; not a persisted schema change |

Categories/system category lists, categoryLinks, nativeSystems, formula component objId/role/unknown props, taxonomy values, source tags of other types, arbitrary metadata strings and unknown Trash payloads are **not** property-name references in the current schema and are not rewritten.

### Collision and stale rules

- Cancel, invalid/blank input and unchanged names produce no mutation/save. Invalid UTF-16 names that cannot be URL-encoded reject before any writes. Accepting an unchanged imported name does not normalize it.
- Existing own destination definitions reject, including special literal keys. Inherited Object prototype members do not count as stored definitions.
- Any own destination assignment key reserves B, including false/null/undefined and keys on study/Trash records. Destination names already used by typed related references, property citation tags or independently trashed property definitions also reject rather than silently merging unrelated graphs.
- Invalid/missing original definitions, changed/replaced libraries/maps/records, changed nested values, moved categories, route changes and read-only write slots reject atomically.
- UI actions capture their original library/map/definition/route. Consumed or detached/stale nodes reject; cancel leaves the current action reusable. The draft is single-use and reentrant prompt calls are inactive.
- Own checks and safe Object.defineProperty creation support `__proto__`, `constructor`, `toString`, `valueOf`, `hasOwnProperty`, Unicode, percent signs, quotes and markup-like names without prototype mutation.

## Actual validation results

**414 Node tests PASS, 0 failures, 0 skipped**: all **339** prior tests plus **75** new cases. `node --test tests/*.test.cjs` was run against the final production/test content. Node tests execute actual application helpers and persist; successful local/cloud payloads and complete graphs are checked, including unknown metadata, exact value/record identity, key order, own presence and late read-only-slot rejection.

**All 15 Chromium suites PASS**: all fourteen existing scripts plus `tests/browser-property-rename.cjs`. Individually executed suites: category-links, core-rendering, direct-link, filter-search, formula-rendering, glossary-rendering, herb-assignment, import-smoke, localization, property-keys, property-rename, property-rendering, sources-trash, study-routing and system-rendering.

Existing TASK 016 direct-link evidence remains **119 checks / 24 stale cases PASS**; existing property-key suite **101 checks PASS**. TASK 015 explicit empty links, legacy membership and protected missing-category routes pass their existing regressions. Existing assertions were not removed or weakened. The isolated dispatcher unit harness received only db/window dependency fixtures required by the new captured-context guard; its exact argument/payload assertions are unchanged.

### New Chromium suite: 76 complete graph/counter checks PASS

| persist / localStorage / mocked cloud calls | Checks | Interpretation |
|---|---:|---|
| **0 / 0 / 0** | **42** | Cancel, unchanged/invalid names, destination conflicts, stale context/values, retained actions, read-only-slot rejection and export |
| **1 / 1 / 1** | **33** | Actual imports, successful renames, retry after cancellation, reentrancy guard and roundtrip setup |
| **1 / 1 / 0** | **1** | Established real-reload beforeunload save; deferred cloud timer cannot execute after document destruction |

`property-rename-snapshots.json` contains before/expected/actual graphs and counters for every focused operation. `validation-manifest.json` records the suite list and independently counted distribution. `node.txt` and fifteen browser-*.txt files contain raw output. `property-rename-backup.json` is the actual downloaded renamed library, including a literal __proto__ key, reimported/reloaded without graph loss.

Actual native prompts test cancellation and successful UI actions. Native prompts block page JavaScript; during-prompt concurrency cases therefore use a pre-injected synchronous prompt hook while the real action, draft validation and alerts execute. The initial test-only hook attempted runtime eval blocked by CSP; function construction was moved into setup, without relaxing CSP or assertions, and the entire final suite was rerun.

Swedish/English at **1280, 375 and 320 px** pass, including hostile literal names, prototype checks and document overflow bounds. Six screenshots are `property-rename-{sv,en}-{1280,375,320}.png`; English 320 px was visually inspected. Very long names still wrap heavily in the inherited narrow header layout; no unrelated CSS redesign was included. Stored names/data are not translated. Two paired error strings extend the controlled inventory from 237 to **239** keys per language.

All focused runs report **0 page errors and 0 external requests**. Firebase SDK scripts/config/initialization are removed before startup, requests blocked and service workers disabled. Browser counters use a Node-side binding outside the document so unload writes survive reload observation. Node persistence mocks validate serialized payloads; no live cloud acknowledgment is claimed.

`git diff --check`: PASS. Existing tracked screenshot generation did not change tracked bytes. Working tree is clean after the implementation and report commits.

## Changed files

- `index.html`
- `tests/property-rename.test.cjs`
- `tests/browser-property-rename.cjs`
- `tests/fixtures/property-rename-library.cjs`
- `tests/fixtures/property-rename-reproduction.json`
- `tests/property-rendering.test.cjs` (dependency fixture only; existing assertions retained)
- `tests/ui-localization-inventory.json`
- `TASK018-QA.md`

## Reproduction commands and isolation

From the development checkout, configure environment before running any browser tool:

```powershell
$env:TEMP='C:\dev\Franks projekt\Ort-Wiki\task-018\evidence\tmp'
$env:TMP=$env:TEMP
$env:TASK_EVIDENCE='C:\dev\Franks projekt\Ort-Wiki\task-018\evidence'
$env:PLAYWRIGHT_MODULE='C:\dev\Digital GM\node_modules\playwright'
node --test tests/*.test.cjs
Get-ChildItem tests/browser-*.cjs | ForEach-Object { node $_.FullName }
git diff --check
git status -sb
```

For independent QA use a **new separate checkout**, separate evidence subfolder and the exact final PR HEAD; do not modify the development checkout. Original evidence/scratch directories should not be overwritten by independent QA. Digital GM supplies external tooling only; all cwd/output/temp paths remain under Frank's task workspace. No production data, real Firebase services, Digital GM files or StudyWiki files were accessed or modified.

## Remaining limits and follow-ups

- This is developer validation, not independent approval. The final exact PR HEAD requires independent QA before merge.
- **Category renaming still leaves source category citation IDs unchanged** as identified by TASK017. That separate issue was not fixed. Formula, study-profile, source-creation and other recovery features remain separate assignments. Their functions, import validation and persistence implementation were verified unchanged.
- JSON-compatible values preserve their full content through rename/export/import/reload. An own undefined value remains own undefined **in memory** after rename; the existing global serializers still omit undefined in local JSON and map it to an empty string for cloud output. Tests explicitly distinguish that established serialization policy from rename behavior; no encoding/migration was introduced. Undefined cannot originate in imported JSON.
- Pre-existing orphan/ambiguous data is not repaired. Unsupported Trash payloads remain untouched; property Trash identity records are not renamed as live references.
- Client-side validation is atomic for the application's ordinary data records; it is not a distributed Firebase transaction. Actual cloud durability/concurrent server writes and physical mobile devices are outside synthetic headless validation.
- No merge, deployment or auto-merge was performed or enabled.

**READY FOR INDEPENDENT QA — NOT MERGED.**

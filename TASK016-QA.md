# TASK 016 — Direct herb–property linking

**READY FOR INDEPENDENT QA — NOT MERGED.**

Verified main baseline: `ba7e66f260c4c9511162d7da86d8a9cb85b76bf5`.
Immutable implementation/test/evidence HEAD: `7e18d1a1ba3322027c65e9f3aee5b3d99bb51a7d`.
The following report-only commit records this tested immutable HEAD. The final PR delivery HEAD is recorded in the PR body and delivery response; production/test content is identical, avoiding a self-referential document hash.
Branch: `task-016-direct-herb-property-linking`.

## Before and after, by entry point

| Entry point | Before | After |
| --- | --- | --- |
| Property → Add herb | Numbered prompt, array-index selection | Search by current visible name, choose a radio option showing exact immutable ID, explicitly confirm; alternatively choose Create a new herb, enter a name and confirm |
| Category → each property | Property link and existing herb links only | A native Add herb button on each subcategory/ungrouped property row opens the same property-specific dialog; grouping and links remain |
| Herb → property | Category-first assignment only | Additional Search and link a property button searches properties directly, showing category and system; existing category workflow and [+] remain |

All three entry points use one dialog and one confirmation engine. Suggestions and draft fields are presentation state only. Clicking a result never saves. Native controls support mouse, keyboard Space/Enter, touch, Escape and backdrop cancellation. The existing assignment focus trap is reused; focus returns to the source control after confirmation/cancel, and stale navigation has a header fallback. Property actions describe their property via aria-describedby; searches, result groups, creation fields and dialog headers have localized accessible descriptions.

## Data model and TASK015 compatibility

No new library fields, dummy properties, category identity changes or migrations. An existing herb receives only an own obj.props[propertyName] = true when explicitly assigning an unassigned property. Category definitions must already exist. Missing property/category destinations are never created by the direct-link engine; unavailable property destinations are disabled in results.

The direct operation never adds, sorts or rewrites categoryLinks. An explicitly empty category remains explicit before/after assigning and removing its final property. A legacy herb without categoryLinks gains category display through property membership, and removing the final property leaves no invented explicit link. Full graph checks cover both cases and retain explicit link order.

Already-assigned values (true, 0, strings, arrays and structured metadata objects) are unchanged and save zero times. False/null values are preserved unless they are the property expressly targeted by the operation, in which case explicit assignment may set true. Descriptions, taxonomies, unknown fields, category/system records, Trash, sources and record order remain untouched. New herbs append one standard record with id/name/desc/props/taxonomies and no categoryLinks field.

Duplicate visible names are allowed and displayed with immutable IDs for disambiguation. Existing duplicate-name records are neither deduplicated nor renamed; explicitly creating another same-name herb remains permitted. New IDs use a UUID base, checking current live herb IDs plus both Trash object identity fields; suffixes resolve even forced UUID collisions. Tests force collisions with live and trashed IDs and verify the appended record uses a free ID.

## Confirmation and stale safety

The draft captures the library reference, exact route, herb/property record references and names, category record/category-system context, visible herb names, ordered explicit links and targeted value presence/content. Candidate snapshots are captured on opening, not refreshed into a different record when selecting or filtering. The final mutation uses the exact ID plus original object reference, never a current array index or visible title. Reordering an array does not retarget a selection.

Replacement/removal/rename/reassignment of the relevant library/herb/property/category, route changes (including away and back), or in-place targeted value changes reject before mutation. A changed categoryLinks list also rejects conservatively. The entire confirmation is synchronous through validation and mutation. A successful/unchanged draft is consumed before persistence, preventing retained/repeated confirmations from saving twice or affecting a newly opened draft. Retained result callbacks are similarly tied to their original draft.

Incomplete selection, blank/new invalid name, duplicate assignment, cancellation and stale context produce zero writes. Existing herbs with missing, empty, non-string or ambiguous duplicate immutable IDs are unavailable in this chooser; the task does not invent IDs or repair those records. Stored property/category names are matched exactly. Empty unusable destination keys are rejected without rewriting legacy data or changing the import contract.

## Persistence and complete evidence

Successful explicit assignment or new-herb-plus-link invokes the existing persist(true) once, preserving sparse unrelated records without global normalization. The normal storage/cloud scheduling path remains. Chromium independently counts calls to production persist(), Storage.setItem and a local synthetic Firestore set spy, with a settle interval around the existing debounce. Firebase startup is stripped before execution and external requests are blocked.

| Operation | persist calls | local storage writes | synthetic cloud writes |
| --- | ---: | ---: | ---: |
| Explicit existing-herb/property link | 1 | 1 | 1 |
| Create herb plus link, including forced ID collisions | 1 | 1 | 1 |
| Already linked 0/structured value, cancel, invalid or stale | 0 | 0 | 0 |
| Retained/repeated confirmation and old result callback | 0 additional | 0 additional | 0 additional |
| Selection, filtering, opening dialog and export | 0 | 0 | 0 |
| Explicit approved import | 1 | 1 | 1 |
| Normal actual reload (inherited unload behavior) | 1 | 1 | 0 |

The reload row is not an extra direct-link save: the pre-existing beforeunload handler writes locally, while document destruction cancels its delayed cloud callback. TASK015 blocked-orphan unload behavior remains unchanged. There was no live-cloud durability test.

Committed [direct-link-evidence.json](tests/fixtures/direct-link-evidence.json) contains eight complete production-engine before/after graphs with independent counters: all three entry points, both creation contexts, duplicate structured-value preservation, stale reassignment rejection and cancellation. It includes IDs/order, false/null/0 and nested metadata, explicit links, categories/systems, Trash and sources.

Example relationship deltas (all other graph fields equal):

```text
Property/category existing selection: objects[id=two].props.Blomma absent → true
Herb direct property: objects[id=one].props.Blomma absent → true
    categoryLinks stays ["Empty", "Växtdelar"] in the same order
New herb: one appended record; occupied herb_fixed/herb_fixed_1/herb_fixed_2 → herb_fixed_3
Duplicate/stale/cancel: before graph == after graph, all counters 0
```

The focused browser log contains **119 complete expected/actual graph comparisons**, including **24 stale cases** across both selection directions. Full browser graphs/counters are retained at `../evidence/direct-link-snapshots.json`. Actual downloaded JSON is `../evidence/direct-link-backup.json`, parsed and compared to the complete library, then imported and reloaded. Legacy and mixed records retain exact values and order.

## Actual final validation

- `node --test tests/*.test.cjs`: **299 PASS**, 0 fail/skip/cancel/todo. All prior 245 remain, 54 targeted cases added.
- All **twelve existing Chromium suites PASS**: category-links, core-rendering, filter-search, formula-rendering, glossary-rendering, herb-assignment, import-smoke, localization, property-rendering, sources-trash, study-routing, system-rendering.
- New `node tests/browser-direct-link.cjs`: **PASS**, Chromium 155.0.8059.84; three entry points in Swedish/English at **1280, 375, 320 px**, duplicate-name ID selection, atomic creation, explicit/legacy category semantics, 0/structured preservation, cancel/invalid/repeated/stale controls, JSON round-trip, keyboard/mouse/touch, focus containment/restoration, safe Unicode/quotes/markup/dollar/placeholder strings.
- **119** snapshot/counter assertions; **24** live stale probes; **zero page errors/external requests** in the focused suite; no injected payload execution.
- Additional isolated category screenshot capture verifies all five per-property actions and no horizontal overflow for both languages at all three widths.
- git diff --check: PASS. Working tree clean after implementation commit. tests/herb-assignment.png intentionally regenerated to show the new direct-search button; no unrelated screenshot output is staged.

All previous assertions are retained. The property browser test changes only interaction setup: Escape cancels the new chooser, and a displayed record is selected by its immutable ID before confirmation instead of answering a numbered prompt. Exact graph/security/save assertions remain. The isolated formula harness declares the newly used dialog state so existing editor open/close assertions continue exercising production closePopup(). Initial exploratory runs exposed that missing harness dependency; the final complete run passes. Canonical final logs are node.txt and thirteen browser-*.txt under ../evidence; earlier exploratory logs are superseded.

The translation inventory adds fourteen paired keys (237 per language). Existing localization parity, placeholders, static markers and native-message tests pass. User/library names and values remain literal, never translated.

## Screenshots

Representative committed synthetic screenshots, visually reviewed; the remaining combinations are retained under ../evidence:

| Surface | 1280 px | 375 px | 320 px |
| --- | --- | --- | --- |
| Herb chooser | [Swedish](tests/task016-screenshots/herb-chooser-sv-1280.png) | [English](tests/task016-screenshots/herb-chooser-en-375.png) | [English](tests/task016-screenshots/herb-chooser-en-320.png) |
| Direct property search | [English](tests/task016-screenshots/property-chooser-en-1280.png) | [Swedish](tests/task016-screenshots/property-chooser-sv-375.png) | [Swedish](tests/task016-screenshots/property-chooser-sv-320.png) |
| Category property actions | [Swedish](tests/task016-screenshots/category-actions-sv-1280.png) | [Swedish](tests/task016-screenshots/category-actions-sv-375.png) | [English](tests/task016-screenshots/category-actions-en-320.png) |

[Herb profile with direct search](tests/task016-screenshots/direct-profile-en-320.png). Names containing markup remain visible literal text. Tested profiles/dialogs and category pages have no measured horizontal overflow; long names/buttons wrap within the existing visual layout.

## Exact changed files

- index.html
- tests/browser-direct-link.cjs
- tests/browser-property-rendering.cjs
- tests/direct-link.test.cjs
- tests/fixtures/direct-link-evidence.json
- tests/formula-rendering.test.cjs
- tests/herb-assignment.png
- tests/task016-screenshots/category-actions-en-320.png
- tests/task016-screenshots/category-actions-sv-1280.png
- tests/task016-screenshots/category-actions-sv-375.png
- tests/task016-screenshots/direct-profile-en-320.png
- tests/task016-screenshots/herb-chooser-en-320.png
- tests/task016-screenshots/herb-chooser-en-375.png
- tests/task016-screenshots/herb-chooser-sv-1280.png
- tests/task016-screenshots/property-chooser-en-1280.png
- tests/task016-screenshots/property-chooser-sv-320.png
- tests/task016-screenshots/property-chooser-sv-375.png
- tests/ui-localization-inventory.json
- TASK016-QA.md

## Workspace, safety and limits

Development: `C:\dev\Franks projekt\Ort-Wiki\task-016\development`.
Evidence and disposable TEMP/TMP: `C:\dev\Franks projekt\Ort-Wiki\task-016\evidence` and evidence/tmp. Repository/main and local AGENTS.md verified before development; no repository-specific AGENTS.md exists. Main was rechecked unchanged before delivery.

Synthetic libraries and isolated Chromium contexts only. Firebase scripts/config/init removed before execution, external requests/proxy egress and service workers blocked. Inline execution remains enabled so escaping tests cannot pass solely because injection was disabled by CSP. Digital GM supplied existing external Playwright tooling only; neither Digital GM nor StudyWiki was modified. No credentials, production data, paid services or live cloud calls used.

No unresolved product decision. This is development validation; independent QA must rerun the final immutable PR HEAD. Browser-native chrome follows browser/OS language; screen-reader and live-cloud behavior were not tested. Existing import/normalization/unload semantics and category lifecycle restrictions remain. Malformed/ambiguous existing IDs are disabled rather than silently repaired. No merge, deployment or auto-merge.

**READY FOR INDEPENDENT QA — NOT MERGED.**

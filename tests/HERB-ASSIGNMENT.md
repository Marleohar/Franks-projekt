# Herb assignment — Task 012

READY FOR INDEPENDENT QA — NOT MERGED.

Baseline: `8912a461746d68dbe1bd0a438e4e84cdbc8270d4`, verified equal to origin/main at checkout.
Resulting implementation HEAD: `1349a0f94a3b598fb4df32e2066db337a97536bb`.
The subsequent report-only commit records this implementation; the PR head identifies the final delivery commit.

The herb renderer skipped categories without assigned properties, hiding their [+] editor. A persistent profile button now opens a searchable chooser over existing category keys, including unused and empty categories, with their system names. It opens the existing property checklist. Names are text nodes or encoded text; no definitions or identities are copied. The existing [+] is now a keyboard-operable button.

Saving compares initial and pending selections. Unchanged values (including zero, strings, arrays and objects) survive exactly; unchecked false values remain untouched. New assignments use true; explicit removals delete only that key. No-op and cancel do not persist. A changed draft persists once. Library, herb, category and changed property identities are checked before mutation; replaced libraries and removed/moved properties invalidate the draft. Renaming the same herb preserves its identity.

Changed files:

- `index.html`: chooser and differential assignment lifecycle.
- `tests/herb-assignment.test.cjs`: five Node regression cases against the real save function.
- `tests/browser-herb-assignment.cjs`: dedicated isolated browser suite.
- `tests/herb-assignment.png`: synthetic result evidence.
- `tests/HERB-ASSIGNMENT.md`: this report.

Validation:

- `node --test tests/*.test.cjs`: 120 passed, zero failures/skips (115 inherited assertions/tests preserved, five added).
- Chromium 155.0.8059.84: all nine suites PASS: core-rendering, filter-search, formula-rendering, glossary-rendering, import-smoke, property-rendering, study-routing, system-rendering, herb-assignment.
- `git diff --check`: PASS after preserving the original file line endings. An initial line-ending conversion caused whitespace failures and was corrected.
- New browser suite: zero uncaught errors and zero external requests. Firebase SDK/config/initialization removed before startup; external traffic blocked, disposable context and synthetic library only. Existing suites use their established isolation harnesses.

The new suite starts with zero assigned properties, searches/selects an unused category, checks two properties, and compares the entire resulting library to an independently modified expected snapshot. It independently counts persist calls and Storage.setItem writes: exactly one each. Cancel, reopen and unchanged save produce zero each. Existing non-Boolean values and false entries survive assignment of another property. Explicit unchecking removes only the intended key. Definitions, system records and unrelated metadata retain exact equality. Reload reads the saved assignments and the existing [+] reopens checked selections. Empty category discovery/save, renamed herb, deleted herb/category/property, moved property and replaced library are exercised. Unicode and markup-like category names render literally. Existing eight suites retain coverage for language/view choices, search, canonical routing, imports and backups.

![Initially empty synthetic herb after adding two existing properties](herb-assignment.png)

For Frank: selecting an empty category does not establish a persistent herb/category relationship. The schema derives membership from properties. Empty membership would require a separate product decision; no membership field or artificial property was added.

Inherited limitations: existing modal cancellation/overlay behavior and cloud persistence implementation remain in place. Browser QA validates local persistence only, with no production records or services. This is not a manual mobile/accessibility audit. Property names and category names remain the existing identities; this does not migrate the schema or redesign synchronization. Invalidated drafts close without writing; users reopen to work with current data.


## Corrections after independent QA (2026-10-17)

Reviewed starting HEAD: `87972ea6d11346868d62bbd4b83a09a705e69cb0`.
Verified unchanged origin/main: `8912a461746d68dbe1bd0a438e4e84cdbc8270d4`.
Status: READY FOR INDEPENDENT RE-QA - NOT MERGED. This developer validation does not replace independent approval.

Independent QA found that an older unchecked selection deleted a newer in-place string-to-object value, and an older checked selection overwrote a false-to-null update. Identity checks alone did not protect these values. It also found that Tab escaped the modal and Escape did not cancel.

The dialog now captures detached complete property-value snapshots with explicit own-key presence. Before any mutation, every pending changed property is checked against its original presence, nested values, definition identity and category reference. The existing library/herb/category identity checks remain. A conflict rejects the entire draft, closes it, and explains that data changed and assignment must be reopened. Unchanged selections are untouched, preserving newer unrelated values and metadata. Snapshots and deep comparisons target the existing JSON library data model; no schema migration or global props normalization occurs.

Both assignment dialogs now have dialog semantics, initial search focus, Tab/Shift+Tab wrapping and a focus guard against background controls. Escape cancels without persistence. Cancel/backdrop cancellation restore the available invoking control; category-to-property transitions retain the original profile invoker. Successful profile rerender restores focus to the equivalent action with matching arguments. Other modal features remain unchanged.

Correction files: `index.html`, `tests/herb-assignment.test.cjs`, `tests/browser-herb-assignment.cjs`, `tests/formula-rendering.test.cjs`, and this report. The formula harness now loads the real releaseAssignmentDialog dependency with an inactive modal; all its assertions remain intact. No existing assertions were removed.

Validation: 129 Node tests PASS (all 120 prior tests plus nine snapshot/conflict tests), zero failures/skips. All nine Chromium suites PASS: core-rendering, filter-search, formula-rendering, glossary-rendering, import-smoke, property-rendering, study-routing, system-rendering, herb-assignment. Chromium 155.0.8059.84. git diff --check PASS after retaining original unchanged line endings and fixing added-line CR whitespace. Initial runs exposed extracted-harness dependency omissions and a test assumption that the property input was the first control (the close button is first); these were corrected without removing assertions.

Both reported stale-value reproductions, nested object/array changes, missing-to-null and present-to-missing changes preserve the entire live database snapshot with zero persist calls and zero Storage.setItem writes. A draft containing a second valid edit is also rejected atomically. Valid assignment writes once; no-op/cancel/Escape write zero. Existing non-Boolean and false values survive ordinary assignments. Node tests additionally cover missing-to-false distinctions. Desktop (1280px) and mobile (320px) browser tests verify initial focus, Tab/Shift+Tab containment, forced-background-focus rejection, keyboard category selection, checkbox toggling, Escape, cancellation/backdrop restoration, existing [+] restoration, and no horizontal overflow.

Workspace: `C:\dev\Franks projekt\Ort-Wikin\task-012-corrections\development`.
Logs and desktop/mobile screenshots: sibling `evidence` folder, including `node-results.txt`, nine `browser-*.txt` logs, and `assignment-keyboard-1280.png` / `assignment-keyboard-320.png`. TEMP/TMP point to `evidence\tmp`, so disposable HTML/browser artifacts remain under the Frank workspace. Playwright is referenced only as an external dependency. Browser startup strips production Firebase scripts/config/init, blocks external requests, and uses disposable synthetic libraries/profiles. New suite reports zero page errors and zero external requests. No production data/services were used. Evidence screenshots were visually inspected.

Persistent empty-category membership remains outside this schema. No merge, deployment, auto-merge, StudyWiki or Digital GM change was performed. Independent re-QA of the corrected immutable PR HEAD is still required.

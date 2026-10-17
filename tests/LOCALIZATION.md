# Task 014 — Swedish and English UI localization

READY FOR INDEPENDENT QA — NOT MERGED.

Verified main baseline: `ce5cb02dddc39316c197e5a3685326e5703c1c5c`.
Immutable implementation HEAD: `c1bb1a21245266d8264f6c266a94c9999624883d`.
The following report-only commit adds this file. The exact final delivery SHA is recorded in the PR body and `evidence/delivered-head.txt`, avoiding a self-referential commit hash.

## Implementation and ownership

The existing `currentLang`, `i18n`, `t()`, `toggleLanguage()`, `wiki_lang` and herb-name presentation architecture remain. The single dictionary now has **217 keys in each language**. Original keys remain; new keys generally use their original UI phrase, making their ownership visible at the call site. `t(key, params)` uses callback-based literal substitution for named/numeric placeholders, preserving quotes, Unicode, dollar signs and placeholder-looking text in supplied values. HTML/attribute output remains encoded at its render boundary; static element translations use textContent/setAttribute.

Only application-owned labels/messages are localized. Library names, descriptions, IDs, taxonomy keys/values, source tags, formula content, study metadata and unknown fields are not translated or rewritten. Known taxonomy field captions are translated for display, while their actual keys and values remain unchanged. Native System remains the established domain term. Stored system names, default record values and user data can legitimately remain Swedish or English in either UI language.

## Coverage by screen

| Surface | Coverage |
| --- | --- |
| Header/menu/footer | Brand/document title, menu routes, language label, search tooltip/placeholder, cloud-status tooltip, import/export links |
| Global search | Type badges, empty state, current query refreshed after language switch, user results remain literal |
| Index | View and six name-display choices, intro, creation, property singular/plural counts, alphabet prompt; Swedish A–Ö and English A–Z retained |
| Herb | Properties/synonyms sections, existing-category action, creation/edit/delete labels, empty states, known taxonomy captions |
| Category | Subcategory/other sections, linked-herb empties, new-property action and prompts, rename/duplicate warning |
| Property | Summary/related/study/source headings and empty states, source/page editor, author/year fallbacks and page units, association and rename prompts |
| System | Category/property and related sections, empty states, study/source selectors, creation forms, input hints and buttons |
| Glossary | Swedish ordlista/English glossary heading, introduction, filters, column captions, input hint, empty state and create prompts |
| Filter search | Input, add/reset controls, active tags, match label/count, no-results and initial instructions |
| Study | Type/property/system captions, missing-address message and return link |
| Formulas | Index/intro/empty/detail labels, singular/plural component units, creation and deletion messages |
| Sources Library | Page heading, empty state and author/year fallbacks; all actual source fields remain literal |
| Trash | Heading, empty state, native Restore/Delete buttons, stale/collision/unsupported/invalid-format messages and confirmation |
| Assignment | Category/property dialogs, search hints, no-results/empty-category explanation, save/cancel and conflict rejection |
| Other modals | Description editor, system association forms, source-page editor, placeholders, close/edit accessible labels |
| Import/export | Read/abort/JSON/validation/export/import failures, backup offer, replacement preview with filename/counts/warnings, completion status; identifiers in diagnostic paths remain identifiers |

`tests/ui-localization-inventory.json` is the controlled key/screen inventory. Node tests check exact inventory/dictionary parity, every literal t() call and static marker, placeholder parity and native-message coverage. The final source audit leaves only locale-neutral System/domain text, alphabet letters, syntax/route/element IDs, backup filename prefix and diagnostic field paths outside translation calls. There is no runtime blanket translation of matching user text.

## Switching and preservation

Switching updates static labels/attributes, document language/title, the active route and visible header-search results immediately. It closes all open dialogs through the existing closePopup path; pending text/assignment drafts are not submitted. Reopening an assignment starts from current library data. A round trip stores only `wiki_lang` and makes zero library persistence calls/writes. The selected preference is restored after reload. All existing name modes retain their explicit Swedish/English/botanical selection behavior.

Whole synthetic database snapshots remain equal throughout both-language presentation/navigation/cancellation/rejection checks. Stored names deliberately equal UI words (Spara, Källor, Återställ, Papperskorg, Radera, Svenska), proving they remain unchanged when the surrounding UI translates. Quotes, Swedish characters, hostile markup, dollar signs and placeholder-looking data retain literal content. Successful approved import still invokes library persistence/storage exactly once; rejected/cancelled import/export and modal drafts invoke neither. The existing beforeunload save on reload is separate from preference-only switching and remains unchanged.

## Validation

- `node --test tests/*.test.cjs`: **205 PASS**, zero failures/skips. All 197 previous cases remain; eight localization tests added.
- All ten existing Chromium suites PASS: core-rendering, filter-search, formula-rendering, glossary-rendering, import-smoke, property-rendering, study-routing, system-rendering, herb-assignment, sources-trash.
- New `browser-localization.cjs`: PASS on Chromium **155.0.8059.84**. Twelve routes in both languages, every route and auxiliary dialog at 1280px/320px, no horizontal overflow in tested fixtures.
- New browser checks include static/menu/index controls; global/filtered search; system/editor/source/assignment dialogs; conflict/collision/stale/invalid-data errors; duplicate warnings; safe dynamic prompts; export failure, backup download/cancellation and import success; six name modes; repeated language round trips and reload preference.
- Zero payload executions, page errors or external requests in the dedicated suite. Exported synthetic backup equals the complete original fixture. Presentation round trips make zero library writes; explicitly approved import saves once.
- `git diff --check`: PASS. Working tree clean after delivery commits. Existing tracked screenshot generation produced no unexpected change.

Existing isolated renderer/import harnesses keep their original source-label stubs, now with parameter substitution and newly required dependencies. Dedicated tests execute the production dictionary and actual Chromium DOM. Existing numerical counts, complete snapshots, identity, confirmation and security assertions are retained. Browser expectations now assert the selected Swedish warnings/search wording; formula count extraction recognizes the correct singular/plural component noun while retaining the same exact expected counts.

Initial development runs exposed missing localization harness dependencies and an overly broad CSS `none` replacement. The CSS state values were restored and guarded by regression coverage; final complete runs pass. Only canonical final `node.txt` and `browser-*.txt` evidence logs describe delivery results; exploratory `initial-*` logs are superseded.

## Changed files

- `index.html`
- `tests/localization.test.cjs`
- `tests/browser-localization.cjs`
- `tests/ui-localization-inventory.json`
- `tests/LOCALIZATION.md`
- `tests/support/import-harness.cjs`
- `tests/support/rendering-harness.cjs`
- `tests/filter-search.test.cjs`
- `tests/formula-rendering.test.cjs`
- `tests/glossary-rendering.test.cjs`
- `tests/sources-trash.test.cjs`
- `tests/study-routing.test.cjs`
- `tests/system-rendering.test.cjs`
- `tests/browser-filter-search.cjs`
- `tests/browser-formula-rendering.cjs`
- `tests/browser-herb-assignment.cjs`
- `tests/browser-sources-trash.cjs`

## Workspace, evidence and limits

Development: `C:\dev\Franks projekt\Ort-Wikin\task-014\development`.
Evidence: `C:\dev\Franks projekt\Ort-Wikin\task-014\evidence`.
Canonical logs: node.txt and eleven browser-*.txt files. Representative screenshots: index-sv-1280.png, index-sv-320.png, index-en-1280.png, index-en-320.png, assignment-sv-1280.png, assignment-sv-320.png, assignment-en-1280.png, assignment-en-320.png. These were visually inspected. Synthetic backup-sv.json/backup-en.json and controlled source-audit artifacts are retained there too. TEMP/TMP point to evidence/tmp for disposable profiles/HTML.

Browser isolation strips Firebase scripts/config/init before startup, permits inline execution so CSP cannot hide injection defects, blocks external requests/proxy egress and service workers, and uses synthetic disposable contexts only. Playwright/Acorn are external tooling dependencies; Digital GM and StudyWiki were not modified. No production libraries, credentials or live services were used.

Remaining inherited limits: native browser/file-picker chrome uses the browser/OS language; data and identifier text remains original; normal reload/beforeunload normalization/persistence remains; glossary blur edits and system checkboxes keep their existing immediate-save semantics. No library schema, import decision rules, relationship recovery, storage or synchronization redesign was performed. This is Chromium/local persistence QA, not live-cloud or screen-reader validation. Independent review is still required. No merge, deployment or auto-merge was performed.

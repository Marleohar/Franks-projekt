# TASK 007B: deterministic system checklist associations

Baseline main: `cca0ec87cefcbfc4311455770dfe58daf7b83dcf`.
This report supersedes the checklist-state limitations recorded in TASK 007's
historical SYSTEM-RENDERING.md report.

## Root cause and correction

Checklists always created unchecked inputs. toggleSysStudyLink used an else branch
that removed a link whenever the add condition was false, including checked=true
for an already linked study. Ordinary selection could therefore show a checked
box while persisting removal of its association. Source checklists also displayed
incorrect state and persisted no-op events.

Inputs now reflect actual associations. Study links use the same union of singular
study.system and plural study.systems as renderSystemPage. Source links use matching
system tags. Both mutators are idempotent: checked means ensure present; unchecked
means ensure absent. An existing desired state returns before touching fields or
calling persist. Each genuine change calls persist once. Rendering and filtering
never initialize/normalize association fields. ID-safe listeners, captured-system
stale guards, modal targeting and all XSS protections remain unchanged.

## Legacy behavior

- Either representation linking the selected system makes the study checked.
- Checking a singular-only link leaves it singular; no new plural array is created.
- Explicit unchecking removes the singular field only if it equals the selected
  system, and removes that system from the plural array if present. Both must be
  removed when both represent the same link, or the page would still show it linked.
- An unrelated singular value, other plural systems, unknown fields and all other
  records are preserved. No-op removal preserves missing/null plural arrays.
- Adding a genuinely absent link uses the existing systems array representation.
  Re-adding an explicitly removed singular link therefore uses systems; it does
  not restore the original representation or array ordering.
- Existing duplicate unrelated entries are not cleaned up. Unchecking removes all
  occurrences of the selected association; checking never introduces a duplicate.
- Sources preserve all nonmatching tags, including property tags and their pages.

There is no migration, schema redesign, ID rewrite, import/export, authentication,
Firebase or synchronization change. Application changes are limited to the four
requested checklist rendering/mutation functions.

## Node validation

Node.js **v24.12.0**, both commands exit 0:

```sh
node --test tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs
```

**65 passed, 0 failed, 0 TODO, 0 skipped/cancelled** per command: 56 existing
regressions plus 9 focused tests. Actual functions are extracted into the existing
restricted VM/minimal DOM harness. Five legacy cases cover singular only, plural
only, both targeting A, unrelated singular B plus plural A/C, and singular A plus
plural B. Every step compares the entire synthetic library and write count.
Additional cases cover missing/null arrays, missing IDs, missing source tags,
source filtering/reopening/idempotence, and both stale callbacks with complete
library equality. Existing source no-op write expectation changes from three
calls to one actual removal; its data-preservation assertions remain.

## Real browser validation

Environment-provided Playwright; Chrome **155.0.8059.84**. All exit 0 / PASS:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\Digital GM\node_modules\playwright'
node tests/browser-system-rendering.cjs
node tests/browser-property-rendering.cjs
node tests/browser-core-rendering.cjs
node tests/browser-import-smoke.cjs
```

The system script now uses ordinary Playwright click/check/uncheck interactions
for all checkbox mutations; it no longer dispatches synthetic change events.
A study linked to both selected system A and unrelated B starts checked. Opening
and checking an already selected input preserve the full library with zero writes.
An ordinary click on that checked input explicitly unchecks it: only A is removed,
B remains, one write. Another click restores A exactly once, second write. No-op
uncheck/check operations add no writes. Filtering and closing/reopening show the
correct checked state without changing data. The same linked-source scenario
preserves unrelated system and property tags. Mixed singular/plural legacy data
is additionally unchecked/rechecked using real controls and full-library assertions.

All previous category navigation, special-character IDs, filtering, association
changes, creation and system-switch tests continue. Each mutation is checked
against an exact full expected library. Per reset scenario expected local writes:
2 study add/remove; 1 special-ID study removal; 3 source changes; 1 second-system
study removal; 2 creations; 2 linked-study clicks; 2 linked-source clicks; 2 mixed
legacy clicks. Rendering/open/filter/close/no-op operations add zero writes.
These counts verify persist entry and disposable localStorage, not cloud writes.

Results: **0 payload executions, 0 injected elements, 0 uncaught page errors,
0 external requests, 0 unexpected writes**. Final reset is unchanged with 0 writes.

## Isolation, evidence and limits

Firebase SDK/configuration/initialization are removed and asserted absent before
startup. HTML is served through intercepted loopback requests; all external
requests abort. Dead egress proxy, CSP connect-src none, blocked service workers,
and disposable browser context/profile/storage remain in place. CSP permits inline
scripts/events during XSS testing. All library records are synthetic; no production
website/database or real user data is accessed. No dependencies added.

Successful local evidence directories (not committed):

- System: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-TjLYq9`
- Property: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-Fl0SCt`
- Core: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-gQxnN0`
- Import: `C:\Users\veija\AppData\Local\Temp\franks-import-browser-KEcL06`

This is developer validation pending independent QA. Asynchronous persistence,
conflicts and server authorization remain unverified. Existing unsafe filter-search,
glossary, formula, general source and trash pages remain outside scope. The whole
application is not XSS-safe. No claim is made about recovery from old lost links;
this correction prevents the identified future interaction loss.

Merging main automatically deploys GitHub Pages. Do not merge, enable auto-merge,
deploy or begin TASK 008.

**READY FOR INDEPENDENT QA — NOT MERGED.**

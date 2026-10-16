# TASK 007: system rendering security

Baseline: `a1b49c4b63bfb35608c7694bb36d8e38d310ca1e`.

System detail encodes library text at rendering time using the existing utilities.
Category headings and modal openers use fixed DOM action dispatch; category links
stop propagation without cancelling native navigation. Expansion symbols and
property/category routes remain unchanged. Checklist captions use textContent,
and checkbox listeners close over original IDs rather than constructing JavaScript.
No stored records are sanitized, normalized or migrated.

Modal openers explicitly set the supplied system target. System rendering closes
its two stale selection modals before changing the shared target; checkbox listeners
also ignore a change if their captured system no longer matches the active target.
Underlying association and creation functions, record shapes, persistence, import,
Firebase configuration and routing are unchanged. No dependencies were added.

## Validation

Node.js v24.12.0. Both commands exited 0: **56 passed, 0 failed, 0 TODO,
0 skipped/cancelled** (47 previous tests plus 9 system tests).

```sh
node --test tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs
```

New Node tests extract actual functions from index.html into a restricted VM with a
minimal DOM. They cover encoding, long text, numeric years, category symbols,
fixed dispatcher arguments, filtering, exact IDs, unrelated associations, stale
handlers, creation shapes, and write counts. These are not full browser tests.

Environment-provided Playwright, Chrome **155.0.8059.84**:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\Digital GM\node_modules\playwright'
node tests/browser-system-rendering.cjs
node tests/browser-property-rendering.cjs
node tests/browser-core-rendering.cjs
node tests/browser-import-smoke.cjs
```

All four exited 0 / PASS. The system script exercises real DOM handlers,
category expansion/collapse, independent category sections, category navigation
without expansion, property navigation, both filters and rerendered checkboxes,
special-character IDs, unrelated association preservation, modal close/overlay,
creation, and switching systems. Record comparisons check complete expected
libraries, including unknown fields. Node additionally exercises stale callbacks
and repeated source selection without duplicate tags.

Expected writes in separate reset scenarios: study add/remove 2; special-ID study
removal 1; source add/remove plus special-ID source removal 3; second-system study
removal 1; creation of study plus source 2. Each intentional mutation performs one
persist call and one disposable localStorage write. Opening/rendering/filtering/
closing and final reset perform zero writes. Cloud persistence is not tested.

System browser results: zero payload executions, injected elements, uncaught page
errors, external requests, and unexpected persistence calls. Inline scripts/events
are allowed by CSP so injection tests cannot pass solely through script blocking.
The first test attempt clicked the category link at the heading's center; the test
now explicitly clicks heading padding to distinguish expansion from navigation.
No application change was made to accommodate that test mistake.

## Isolation and evidence

All scripts strip Firebase SDK tags, configuration and initialization before
startup, assert removal, and serve a disposable copy through loopback request
interception. Every external request is aborted. A dead outbound proxy, blocked
service workers and CSP connect-src none supplement isolation. Each launch uses a
disposable browser profile/context and synthetic library data only. No production
website, database, paid service or real library is used.

Latest successful evidence directories (temporary, not committed):

- System: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-wnOcWW`
- Property: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-uVEbvm`
- Core: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-UKd3ls`
- Import: `C:\Users\veija\AppData\Local\Temp\franks-import-browser-EKsNue`

## Preserved limitations

Existing checklists do not initialize checkbox state from associations, including
after filtering. Existing toggleSysStudyLink removes an already present system
when given another checked event. Legacy singular study.system is displayed but
not removed by the plural-systems mutator. These inherited behaviors are documented,
not redesigned; source additions still avoid duplicate system tags. Selection
security changes neither infer nor rewrite existing checkbox state.

Still unsafe/out of scope: filter search, glossary, formulas, general source
library and trash rendering. The application is not globally XSS-safe. Server-side
authorization and asynchronous synchronization/conflict behavior remain unverified;
local browser writes do not establish cloud success. Native prompts are automated.

Merging main automatically publishes GitHub Pages. Stop for independent QA; do not
merge, deploy, enable auto-merge or begin TASK 008.

**READY FOR INDEPENDENT QA — NOT MERGED.**

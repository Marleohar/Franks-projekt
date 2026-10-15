# TASK 002: offline legacy preservation characterization

Baseline: `main` at `feb4469c65ffd2f6c87b7ce2b3b2f63ea47a323b`.
Application blob: `9305bf3b976bfc47f780f73825ed8ea41f98ee79`.

## Run

No installation or dependencies. From the repository root, using Node.js 24:

```sh
node --test tests/legacy-preservation.test.cjs
```

For filesystem permission restrictions and no test-runner child process:

```sh
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs
```

These commands do not invoke package scripts, load SDKs, or start a browser.
No production credentials are copied into the test infrastructure.

## How the harness works

`support/legacy-harness.cjs` reads `index.html` as text. It extracts the actual
`MASTER_STORAGE_KEY`, initial `db`, and the three existing functions
`deduplicateAndSanitizeDB`, `loadAndRecoverAllData`, and `ensureDbStructure`.
It does not maintain a rewritten implementation. Each test gets a fresh VM.

Only those declarations execute. HTML, Firebase configuration, external script
tags, synchronization, persistence, and startup handlers do not execute. An
in-context, read-only `localStorage.getItem` stub serves synthetic JSON and records
the key requested. No real browser storage is available or modified.

No host callbacks or objects enter the VM. Network APIs, Firebase, browser globals,
`require`, `process`, and timers are unavailable; dynamic string/Wasm compilation
is disabled and execution has a timeout. The host harness imports only Node core
test/assert/filesystem/path/VM modules. It contains no network request code.
An isolation test checks unavailable capabilities, storage methods, and blocked
dynamic compilation. The reviewed extracted legacy code cannot contact services.

The VM is not a security boundary for arbitrary hostile future source. The
extractor assumes the reviewed top-level formatting (unindented closing braces),
requires exactly one match per declaration, and must be reviewed after structural
source changes. It is intentionally not a general JavaScript parser.

## Validation report

Executed on Node.js `v24.12.0` against the baseline above:

| Exact command | Result |
| --- | --- |
| `node --test tests/legacy-preservation.test.cjs` | Exit 0: 11 tests, 7 pass, 0 fail, 4 TODO, 0 skipped/cancelled |
| `node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs` | Exit 0: 11 tests, 7 pass, 0 fail, 4 TODO, 0 skipped/cancelled |
| `git diff --exit-code feb4469c65ffd2f6c87b7ce2b3b2f63ea47a323b -- index.html` | Exit 0, no application changes |

Reproduced defects:

1. Two normalized-name duplicates become one record; the second ID disappears.
2. The second long description, native-system list, conflicting metadata, and
   unique metadata disappear. Conflicting taxonomy retains the first value;
   additional taxonomy keys survive. A top-level unknown field survives merging.
3. Both a shared false property and a duplicate-only false property become true.
4. Actual nonempty local recovery invokes the same destructive deduplication.
5. A zero-object library ignores populated categories, properties, systems,
   system order, study objects, sources, formulas, trash, and an unknown field.
   Recovery does not itself overwrite the supplied storage value; later saving
   is outside this harness.

A control verifies that distinct names retain both long descriptions and unknown
object/library fields through recovery. All fixtures are newly invented data.

## Future preservation acceptance cases

The four `test.todo` entries are pending requirements, not passing preservation
tests. Passing characterization demonstrates reproducible defects, not acceptable
application behavior. Later fixes must update the affected characterization and
replace TODO entries with executable preservation assertions:

- Keep distinct records and IDs even when names normalize identically; cleanup
  and object deletion must remain manual.
- Retain every description, metadata field, and unknown field without truncation.
  Existing long text must remain editable under grandfathered limits.
- Preserve false property values exactly; do not infer active relationships.
- Recover all valid populated collections even when there are zero objects.

## Limits and review boundary

No Firestore, snapshots, concurrent edits, import UI, save/unload, browser rendering,
authentication/rules, deletion/restoration, or migration is exercised. Empty-object
recovery demonstrates loss from in-memory recovered state, not a proven cloud
overwrite. No claims are made about production data or historical data loss.

No application behavior or schema changes. No automatic categorization, cleanup,
or migration. This test-only PR requires independent QA and review; do not merge
without owner approval. TASK 003 is not started.

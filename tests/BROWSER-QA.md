# TASK 004 corrections: isolated browser smoke evidence

Executed using Node.js `v24.12.0`, existing environment-provided Playwright and
headless Google Chrome `155.0.8059.40`:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\Digital GM\node_modules\playwright'
node tests/browser-import-smoke.cjs
```

Result: **exit 0, PASS**. No packages were installed and no repository production
dependencies were added. `QA_BROWSER` optionally overrides the executable path;
default was `C:/Program Files/Google/Chrome/Application/chrome.exe`.

## Isolation before startup

- The script reads source as text and creates a disposable local HTML copy.
- All external script tags, Firebase configuration values, and the Firebase
  initialization block are removed from that copy, with assertions.
- Playwright launches a fresh disposable browser profile/context; no user profile
  or production cookies/storage are used. Service workers are blocked.
- The local test URL `http://127.0.0.1:8765` is fulfilled by Playwright interception,
  without a server connection. Every other page request is aborted.
- CSP blocks connections and external resources. A dead loopback proxy also blocks
  browser egress; background networking/component updates are disabled.
- The page verifies `typeof firebase === 'undefined'`, `firestoreDb === null` and
  `isCloudReady === false`. No SDK initialization occurs.

## Observed scenarios

1. Numeric-name JSON is rejected with `objects[0].name`, zero save calls and zero
   storage writes, and unchanged current synthetic data.
2. Choosing export runs the existing browser download path. Downloaded synthetic
   JSON matches the pre-import objects. Final cancellation leaves data unchanged
   with zero save calls/writes. Backup text explicitly says completion cannot be
   verified. This test observes the automated browser download artifact; the UI
   does not claim a human saved it.
3. Selecting the same filename again triggers the flow again. After final approval,
   duplicate records/IDs survive, the index renders, and an object link opens the
   imported object page with its long description.
4. All confirmation-time snapshots show zero save calls/writes. Exactly one save
   call and one isolated localStorage write occur after final approval.
5. A synthetic previous library already contains category C; the current route
   is `#category/C`. Importing the failing `constructor` subcategory fixture
   produces only the failure message, restores exact previous library data and
   category UI, and adds zero persistence calls or storage writes. Both fixtures
   contain C, avoiding the unrelated missing-category auto-save path.
6. Dispatching a real `HashChangeEvent` against the same failing fixture retains
   normal index fallback without uncaught errors or extra writes. The Node suite
   independently verifies explicit strict routing propagates the actual error.
7. **Zero uncaught page errors. Zero external page requests.** The original local
   persistence pathway executes only in the disposable origin; cloud is disabled.

Evidence output directory for the final run:
`C:\Users\veija\AppData\Local\Temp\franks-import-browser-hPapbG`.
It contains the sanitized disposable HTML and `synthetic-import-result.png`.
The final screenshot records the normal fallback index after the category-error
scenario; successful object rendering and restored category UI are asserted
earlier in the same run.
Artifacts are local and disposable, contain no real library data, and are not
committed. Re-running creates a new directory. An initial direct loopback attempt
was blocked by the dead proxy; the final script fulfills HTML in interception and
requires no listening server or network connection.

## Limits

Headless automation accepts/dismisses native dialogs and supplies file selection;
it does not verify a human OS file-picker or Save As interaction. Node tests cover
synthetic file-read, export-startup, rendering and persistence failures separately.
No production Firebase, GitHub Pages, authentication or cloud persistence was
tested. Existing route side effects and asynchronous synchronization races remain
documented in `IMPORT.md`. Merge still automatically deploys Pages, so independent
re-review and explicit owner approval remain required. Do not merge this PR.

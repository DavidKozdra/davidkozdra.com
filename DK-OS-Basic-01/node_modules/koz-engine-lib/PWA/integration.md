# PWA Integration

This guide describes a mobile-first game that installs reliably, starts without a network after its first successful installation, and updates without mixing two builds.

“Offline” has a boundary: static gameplay, local saves, and queued actions can work offline. Live multiplayer, leaderboards, authentication, cloud saves, purchases, and newly requested remote content still require a network unless the host supplies an offline substitute.

## Architecture

Use three layers:

1. The build scans host assets and calls `cacheManifest.createCacheManifest()`.
2. The generated classic service worker imports `serviceWorkerRuntime.js` and passes host configuration.
3. The page creates a client with `clientRegistration.createPwaClient()`.

Keep authored asset paths and API routes in the host. Keep cache mechanics and update lifecycle in the engine.

## 1. Generate a content-versioned manifest

```js
const {
  createCacheManifest,
} = require("./Koz_Engine_Lib/PWA/cacheManifest");

const manifest = createCacheManifest({
  rootDir: __dirname,
  urls: ["/", "/index.html", "/js/main.js", "/assets/hero.png", "/assets/music.ogg"],
  optionalUrls: ["/assets/music.ogg"],
  aliases: { "/": "index.html" },
});
```

For a game under the repository's `games/` directory, retain the engine's relative
URLs and explicitly allow the repository root while hashing:

```js
const manifest = createCacheManifest({
  rootDir: gameDirectory,
  allowedRootDirs: [repositoryRoot],
  urls: ["/index.html", "../../Koz_Engine_Lib/PWA/serviceWorkerRuntime.js"],
});
```

The generated worker should resolve each manifest URL against its registration
scope (for example, with `new URL(relativePath, self.registration.scope)`) so the
shared file resolves to its real sibling URL instead of a nonexistent copy beneath
the game directory.

Use `manifest.version` in the worker configuration. It is derived from every URL, file revision, and cache tier. A change to `main.js` therefore changes the version even if the filename remains `main.js`.

Run generation as part of both CI validation and the production build. Never rely on a developer remembering to bump a cache number.

Every runtime-loaded file must be discoverable. Include:

- static and dynamic JavaScript modules
- worker and worklet scripts
- sprite atlases and standalone images
- fonts and locale files
- level/content JSON loaded after boot
- WebAssembly modules
- the engine modules loaded through a classic/global bridge

Add a test that walks each runtime source directory and reports files missing from the generated list.

## 2. Separate critical and optional assets

Critical assets must be sufficient to boot, load a save, enter gameplay, render required UI, and show a usable offline error for network-only features.

Typical critical files:

- application shell and navigation fallback
- JavaScript, CSS, fonts, and required localization
- required character/environment art
- required level and item definitions
- save migrations

Typical optional files:

- music and voice acting
- cinematics
- high-resolution cosmetic art
- credits media
- downloadable content packs

The worker installs critical files atomically. If any critical request fails, installation fails and the previous active version remains intact. Optional files use bounded concurrency and may fail independently.

Do not precache hundreds of files with an unbounded `Promise.all()`. Mobile browsers have tighter memory, storage, radio, and background-execution limits than desktop browsers.

## 3. Generate the service worker

The host-generated file should be small:

```js
const KOZ_PWA_CONFIG = {
  cachePrefix: "my-game",
  version: "CONTENT_HASH_FROM_BUILD",
  critical: ["/", "/index.html", "/js/main.js"],
  optional: ["/assets/music.ogg"],
  navigationFallback: "/index.html",
  networkOnly: ["/api/", "/multiplayer/"],
  concurrency: 4,
  optionalConcurrency: 2,
  warmOptionalOnInstall: true,
};

importScripts("/Koz_Engine_Lib/PWA/serviceWorkerRuntime.js");
self.KozPwaServiceWorker.install(self, KOZ_PWA_CONFIG);
```

Use a unique `cachePrefix` for every game sharing an origin. Put API and session routes in `networkOnly`; never cache authentication, matchmaking, telemetry writes, or mutable multiplayer responses as game assets.

The runtime uses cache-first reads for content-versioned files. This keeps HTML, scripts, data, and art on one coherent build. A new worker waits until the host approves activation.

## 4. Register from the page

When using the Koz browser bridge:

```js
const api = window.KozEngine.PWA.clientRegistration;
const pwa = api.createPwaClient({
  scriptUrl: "/sw.js",
  updateIntervalMs: 60 * 60 * 1000,
  onUpdateAvailable({ applyUpdate }) {
    showUpdateButton(() => applyUpdate({ reload: true }));
  },
});

await pwa.register();
```

Do not automatically call `skipWaiting()` during worker installation. Replacing a worker while an existing page is running can combine old in-memory code with newly cached lazy modules. Offer “Update and reload,” activate at a safe menu/save boundary, or allow the update to activate after every old client closes.

Call `requestPersistentStorage()` from a user gesture such as an “Install offline” button. Browsers may reject persistence requests made without user interaction. Use `getStorageEstimate()` to show whether a large optional download fits before starting it.

If `warmOptionalOnInstall` is disabled, call `warmOptionalCache()` after the user accepts an offline-media download.

Call `getOfflineStatus()` to report `criticalReady`, critical counts, and optional counts in an “Offline data” settings panel. “Ready offline” should mean `criticalReady === true`; present optional media progress separately.

## 5. Mobile application shell

The host page and web manifest should include:

- a responsive viewport with `viewport-fit=cover`
- safe-area padding using `env(safe-area-inset-*)`
- touch targets sized for fingers, not a mouse cursor
- portrait/landscape behavior that matches gameplay
- 192px and 512px install icons plus a maskable icon
- theme and background colors matching the boot screen
- an explicit manifest `id`, `start_url`, and `scope`
- a visible loading state while code, saves, and audio initialize

Handle mobile lifecycle events:

- clear held inputs on `visibilitychange`, `pagehide`, and blur
- persist important local state before suspension
- resume audio only after a user gesture when required
- pause expensive rendering when hidden
- tolerate viewport resizing from browser chrome and the virtual keyboard
- avoid depending on hover, right click, or a hardware keyboard

Test installed mode—not only a mobile-sized desktop window.

## 6. Saves and network features

Local gameplay saves should use a versioned schema and transactional writes. Treat Cache Storage as downloadable application data, not as the save database.

For network-backed actions:

- clearly label unavailable live features while offline
- queue only idempotent actions with stable client-generated IDs
- preserve ordering and retry with backoff
- show pending/failed state to the player
- resolve server conflicts explicitly
- never claim a leaderboard submission or purchase succeeded before server confirmation

Multiplayer should fail into a defined offline mode rather than leaving a partially connected simulation.

## 7. Deployment requirements

- Serve the app and worker over HTTPS, except localhost development.
- Serve `/sw.js` from the scope root.
- Avoid long-lived intermediary caching for `/sw.js`.
- Keep engine worker runtime and generated worker on the same origin.
- Generate the worker before copying production files.
- Deploy the worker and every referenced asset as one release.
- Do not delete old deployment assets before existing clients have had time to update if URLs are revisioned externally.

## 8. Verification matrix

Automate:

- content edits change the generated version
- all runtime modules appear in the cache manifest
- a failed critical request leaves the old cache intact
- activation removes only old caches belonging to this game
- query strings resolve to the content-versioned cached path
- offline navigation reaches the application fallback
- runtime writes use `event.waitUntil()`
- API routes bypass game caches

Test manually on at least one current iOS/iPadOS device and one current Android device:

1. Install online, close fully, enable airplane mode, then launch.
2. Interrupt the first install and verify the previous version still launches.
3. Fill storage or deny optional media and verify gameplay still boots.
4. Deploy an update while a run is active and verify it waits for approval.
5. Apply the update and verify one reload moves all code/assets to the new version.
6. Background and resume during loading, saving, combat, and audio.
7. Verify touch controls around notches, rounded corners, and browser chrome.

## NeoNyke reference

NeoNyke’s host adapter is `scripts/generate-precache.js`. It treats code, localization, icons, sprites, and engine modules as critical; large sound and credits media are optional. The page emits:

- `neonyke:pwa-state`
- `neonyke:pwa-update-ready`

The second event’s `detail.applyUpdate({ reload: true })` function can be connected to a main-menu update button.

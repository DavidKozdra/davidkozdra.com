/**
 * Browser loader for koz-engine-lib.
 *
 * The engine ships CommonJS modules, and the bundled global bridge
 * (Core/koz-engine.global.js) can't be used here: it hardcodes `Koz_Engine_Lib/`
 * paths and uses synchronous XHR. So we evaluate the modules ourselves.
 *
 * Unlike a naive eval, this supplies a real `require` so engine modules that
 * depend on each other resolve properly — UI/uiManager pulls in
 * Core/uiScreenController, Events/notificationCenter pulls in
 * notificationManager. Both fall back to inline copies when require() fails,
 * so without this they would silently run degraded.
 *
 * Modules are fetched in parallel per dependency level and cached, so a module
 * required by several others is only ever evaluated once.
 */
const BASE = new URL("../node_modules/koz-engine-lib/", import.meta.url).href;

/** Evaluated module exports, keyed by normalised path ("Core/gameStateManager"). */
const cache = new Map();
/** Raw sources, prefetched so `require` can stay synchronous. */
const sources = new Map();

/** Strips "./", "../" and any ".js" so every spelling maps to one cache key. */
function normalize(path, fromDir = "") {
  const joined = path.startsWith(".") ? `${fromDir}/${path}` : path;
  const parts = [];
  for (const part of joined.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/").replace(/\.js$/, "");
}

async function fetchSource(path) {
  if (sources.has(path)) return sources.get(path);
  const res = await fetch(`${BASE}${path}.js`);
  if (!res.ok) throw new Error(`Failed to load engine module: ${path} (${res.status})`);
  const text = await res.text();
  sources.set(path, text);
  return text;
}

/** Finds `require("...")` targets so dependencies can be prefetched. */
function findDeps(source, dir) {
  const deps = [];
  const pattern = /require\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    deps.push(normalize(match[1], dir));
  }
  return deps;
}

/** Recursively fetches a module and everything it requires. */
async function prefetch(path, seen = new Set()) {
  if (seen.has(path)) return;
  seen.add(path);
  const source = await fetchSource(path);
  const dir = path.split("/").slice(0, -1).join("/");
  await Promise.all(findDeps(source, dir).map((dep) => prefetch(dep, seen)));
}

/**
 * Evaluates a prefetched module. Synchronous, so it can serve as the `require`
 * the engine's own modules call during evaluation.
 */
function evaluate(path) {
  if (cache.has(path)) return cache.get(path);

  const source = sources.get(path);
  if (source === undefined) throw new Error(`Engine module not prefetched: ${path}`);

  const dir = path.split("/").slice(0, -1).join("/");
  const module = { exports: {} };
  // Seed the cache before evaluating so a dependency cycle resolves to the
  // partial exports rather than recursing forever, exactly as Node does.
  cache.set(path, module.exports);

  const require = (request) => evaluate(normalize(request, dir));

  new Function("module", "exports", "require", `${source}\n//# sourceURL=koz/${path}.js`)(
    module,
    module.exports,
    require,
  );

  // The factory may have replaced module.exports wholesale.
  cache.set(path, module.exports);
  return module.exports;
}

/** Loads engine modules by path, e.g. load("Core/gameStateManager"). */
export async function load(...paths) {
  const normalized = paths.map((path) => normalize(path));
  await Promise.all(normalized.map((path) => prefetch(path)));
  return normalized.map((path) => evaluate(path));
}

const [core, ui, events] = await load(
  "Core/gameStateManager",
  "UI/uiManager",
  "Events/eventBus",
);

export const { GameStateManager } = core;
export const { UIManager } = ui;
export const { createEventBus } = events;

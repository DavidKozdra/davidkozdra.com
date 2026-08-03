(function initKozPwaServiceWorker(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else if (root) {
    root.KozPwaServiceWorker = api;
  }
})(typeof self !== "undefined" ? self : globalThis, function createKozPwaServiceWorkerApi() {
  function normalizePath(value) {
    const text = String(value || "").trim();
    if (!text) throw new TypeError("PWA cache path must be a non-empty string");
    const path = text.split(/[?#]/, 1)[0];
    return path === "/" ? "/" : `/${path.replace(/^\/+/, "")}`;
  }

  function decodePathname(pathname) {
    try {
      return decodeURIComponent(pathname);
    } catch {
      return pathname;
    }
  }

  function normalizeEntries(entries) {
    return normalizeManifestEntries(entries).map(function entryPath(entry) {
      return entry.url;
    });
  }

  function normalizeManifestEntries(entries) {
    const normalized = new Map();
    for (const rawEntry of entries || []) {
      const entry = typeof rawEntry === "string" ? { url: rawEntry } : rawEntry;
      const url = normalizePath(entry?.url);
      normalized.set(url, {
        url,
        revision: entry?.revision ? String(entry.revision) : "",
      });
    }
    return Array.from(normalized.values());
  }

  function createCacheNames(options) {
    const prefix = String(options?.cachePrefix || "koz-game").replace(/[^a-z0-9_-]+/gi, "-");
    const version = String(options?.version || "dev").replace(/[^a-z0-9_-]+/gi, "-");
    return {
      prefix: `${prefix}-`,
      precache: `${prefix}-precache-${version}`,
      runtime: `${prefix}-runtime-${version}`,
    };
  }

  function createPool(items, concurrency, worker) {
    const queue = items.slice();
    const count = Math.max(1, Math.min(queue.length || 1, Number(concurrency) || 4));
    const runners = Array.from({ length: count }, async function runQueue() {
      const results = [];
      while (queue.length) {
        const item = queue.shift();
        try {
          results.push({ item, ok: true, value: await worker(item) });
        } catch (error) {
          results.push({ item, ok: false, error });
        }
      }
      return results;
    });
    return Promise.all(runners).then(function flatten(groups) {
      return groups.flat();
    });
  }

  function isSuccessfulResponse(response) {
    return !!response && response.status >= 200 && response.status < 300 && response.type !== "opaque";
  }

  function makeNavigationSafe(response) {
    if (!response?.redirected) return response;
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  function install(scope, rawOptions) {
    if (!scope?.addEventListener || !scope?.caches || !scope?.fetch) {
      throw new TypeError("Koz PWA service worker requires a service-worker-like scope");
    }

    const options = rawOptions || {};
    const cacheNames = createCacheNames(options);
    const criticalEntries = normalizeManifestEntries(options.critical);
    const optionalEntries = normalizeManifestEntries(options.optional);
    const critical = criticalEntries.map(function entryPath(entry) { return entry.url; });
    const optional = optionalEntries.map(function entryPath(entry) { return entry.url; });
    const entriesByPath = new Map(
      criticalEntries.concat(optionalEntries).map(function pair(entry) {
        return [entry.url, entry];
      }),
    );
    const knownPaths = new Set(critical.concat(optional));
    const navigationFallback = normalizePath(options.navigationFallback || "/index.html");
    const networkOnly = (options.networkOnly || ["/api/"]).map(normalizePath);
    const fetchImpl = scope.fetch.bind(scope);
    const warmOptionalOnInstall = options.warmOptionalOnInstall !== false;

    function requestFor(pathname) {
      return new Request(new URL(pathname, scope.location.origin).toString(), {
        cache: "reload",
        credentials: "same-origin",
      });
    }

    function cacheKeyFor(entry) {
      const url = new URL(entry.url, scope.location.origin);
      if (entry.revision) url.searchParams.set("__koz_pwa_revision", entry.revision);
      return new Request(url.toString(), { credentials: "same-origin" });
    }

    async function fetchIntoCache(cache, entry) {
      const cacheKey = cacheKeyFor(entry);
      const reusable = await scope.caches.match(cacheKey);
      if (reusable) {
        await cache.put(cacheKey, reusable);
        return entry.url;
      }

      const response = await fetchImpl(requestFor(entry.url));
      if (!isSuccessfulResponse(response)) {
        throw new Error(
          `Unable to precache ${entry.url}: HTTP ${response?.status || "unknown"}`,
        );
      }
      await cache.put(cacheKey, response);
      return entry.url;
    }

    async function fillCache(entries, concurrency) {
      const cache = await scope.caches.open(cacheNames.precache);
      return createPool(entries, concurrency, function cacheEntry(entry) {
        return fetchIntoCache(cache, entry);
      });
    }

    async function cacheCritical() {
      const results = await fillCache(criticalEntries, options.concurrency || 4);
      const failures = results.filter(function failed(result) { return !result.ok; });
      if (failures.length) {
        await scope.caches.delete(cacheNames.precache);
        const failedPaths = failures.map(function failedPath(result) {
          return result.item.url;
        });
        throw new Error(`Critical PWA precache failed: ${failedPaths.join(", ")}`);
      }
      return results;
    }

    async function warmOptional() {
      const results = await fillCache(optionalEntries, options.optionalConcurrency || 2);
      return {
        cached: results.filter(function passed(result) { return result.ok; }).length,
        failed: results.filter(function failed(result) { return !result.ok; })
          .map(function failedPath(result) { return result.item.url; }),
      };
    }

    async function cleanupOldCaches() {
      const keep = new Set([cacheNames.precache, cacheNames.runtime]);
      const keys = await scope.caches.keys();
      await Promise.all(keys.filter(function staleCache(key) {
        return key.startsWith(cacheNames.prefix) && !keep.has(key);
      }).map(function removeCache(key) {
        return scope.caches.delete(key);
      }));
    }

    async function matchPrecache(path) {
      const entry = entriesByPath.get(path);
      if (!entry) return null;
      const cache = await scope.caches.open(cacheNames.precache);
      return cache.match(cacheKeyFor(entry));
    }

    async function putRuntime(request, response) {
      if (!isSuccessfulResponse(response)) return;
      const cache = await scope.caches.open(cacheNames.runtime);
      await cache.put(request, response);
    }

    function isNetworkOnly(pathname) {
      return networkOnly.some(function matches(prefix) {
        return pathname === prefix || pathname.startsWith(prefix);
      });
    }

    async function handleNavigation(request, url, event) {
      const pathname = decodePathname(url.pathname);
      const directoryIndex = pathname.endsWith("/")
        ? `${pathname}index.html`
        : `${pathname}/index.html`;
      const directPath = knownPaths.has(pathname)
        ? pathname
        : knownPaths.has(directoryIndex) ? directoryIndex : null;
      const cached = directPath ? await matchPrecache(directPath) : null;
      if (cached) return makeNavigationSafe(cached);

      try {
        const response = await fetchImpl(request);
        if (isSuccessfulResponse(response)) {
          const copy = response.clone();
          const write = putRuntime(request, copy);
          event.waitUntil?.(write.catch(function ignoreRuntimeWrite() {}));
        }
        return response;
      } catch {
        const runtime = await (await scope.caches.open(cacheNames.runtime)).match(request);
        const fallback = runtime || await matchPrecache(navigationFallback);
        return makeNavigationSafe(fallback)
          || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    }

    async function handleFetch(event) {
      const request = event.request;
      if (!request || request.method !== "GET") return fetchImpl(request);
      const url = new URL(request.url);
      const pathname = decodePathname(url.pathname);
      if (url.origin !== scope.location.origin || isNetworkOnly(pathname)) {
        return fetchImpl(request);
      }

      const isNavigation = request.mode === "navigate" || request.destination === "document";
      if (isNavigation) return handleNavigation(request, url, event);

      if (knownPaths.has(pathname)) {
        const cached = await matchPrecache(pathname);
        if (cached) return cached;
        const response = await fetchImpl(request);
        if (isSuccessfulResponse(response)) {
          const entry = entriesByPath.get(pathname);
          const copy = response.clone();
          const write = scope.caches.open(cacheNames.precache)
            .then(function openPrecache(cache) {
              return cache.put(cacheKeyFor(entry), copy);
            });
          event.waitUntil?.(write.catch(function ignorePrecacheWrite() {}));
        }
        return response;
      }

      const runtimeCache = await scope.caches.open(cacheNames.runtime);
      const runtime = await runtimeCache.match(request);
      try {
        const response = await fetchImpl(request);
        if (isSuccessfulResponse(response)) {
          const copy = response.clone();
          const write = runtimeCache.put(request, copy);
          event.waitUntil?.(write.catch(function ignoreRuntimeWrite() {}));
        }
        return response;
      } catch {
        return runtime || new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    async function getStatus() {
      const cache = await scope.caches.open(cacheNames.precache);
      async function isCached(entry) {
        return !!(await cache.match(cacheKeyFor(entry)));
      }
      const criticalStates = await Promise.all(criticalEntries.map(isCached));
      const optionalStates = await Promise.all(optionalEntries.map(isCached));
      const criticalCached = criticalStates.filter(Boolean).length;
      const optionalCached = optionalStates.filter(Boolean).length;
      return {
        version: String(options.version || "dev"),
        criticalReady: criticalCached === criticalEntries.length,
        criticalCached,
        criticalTotal: critical.length,
        optionalCached,
        optionalTotal: optional.length,
      };
    }

    scope.addEventListener("install", function onInstall(event) {
      event.waitUntil((async function installApp() {
        await cacheCritical();
        if (warmOptionalOnInstall) {
          try {
            await warmOptional();
          } catch {
            // Optional media must never invalidate an otherwise playable shell.
          }
        }
      })());
    });

    scope.addEventListener("activate", function onActivate(event) {
      event.waitUntil((async function activateApp() {
        await cleanupOldCaches();
        await scope.clients?.claim?.();
      })());
    });

    scope.addEventListener("fetch", function onFetch(event) {
      if (event.request?.method !== "GET") return;
      const url = new URL(event.request.url);
      if (url.origin !== scope.location.origin) return;
      event.respondWith(handleFetch(event));
    });

    scope.addEventListener("message", function onMessage(event) {
      const type = event.data?.type;
      if (type === "KOZ_PWA_SKIP_WAITING") {
        event.waitUntil?.(scope.skipWaiting());
      } else if (type === "KOZ_PWA_WARM_OPTIONAL") {
        event.waitUntil?.(warmOptional());
      } else if (type === "KOZ_PWA_STATUS") {
        event.waitUntil?.(getStatus().then(function reply(status) {
          event.ports?.[0]?.postMessage(status);
        }));
      }
    });

    return {
      cacheNames,
      critical,
      optional,
      criticalEntries,
      optionalEntries,
      cacheCritical,
      warmOptional,
      cleanupOldCaches,
      handleFetch,
      getStatus,
    };
  }

  return {
    normalizePath,
    decodePathname,
    normalizeEntries,
    normalizeManifestEntries,
    createCacheNames,
    createPool,
    isSuccessfulResponse,
    install,
  };
});

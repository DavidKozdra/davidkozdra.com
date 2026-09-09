"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function normalizeUrl(url) {
  const value = String(url || "").trim();
  if (!value) throw new TypeError("PWA cache URL must be a non-empty string");
  if (/^[a-z]+:/i.test(value) || value.startsWith("//")) {
    throw new TypeError(`PWA cache URL must be same-origin: ${value}`);
  }
  const pathname = value.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  return pathname === "/" ? "/" : `/${pathname.replace(/^\/+/, "")}`;
}

function resolveUrlFile(rootDir, url, aliases, allowedRootDirs) {
  const normalized = normalizeUrl(url);
  const aliasMap = aliases && typeof aliases === "object" ? aliases : {};
  const relative = aliasMap[normalized] || (normalized === "/" ? "index.html" : normalized.slice(1));
  const root = path.resolve(rootDir);
  const filePath = path.resolve(root, relative);
  const allowedRoots = [root].concat((allowedRootDirs || []).map(function resolveAllowedRoot(directory) {
    return path.resolve(directory);
  }));
  const isInsideAllowedRoot = allowedRoots.some(function isInsideRoot(allowedRoot) {
    return filePath === allowedRoot || filePath.startsWith(`${allowedRoot}${path.sep}`);
  });
  if (!isInsideAllowedRoot) throw new Error(`PWA cache URL escapes its allowed roots: ${normalized}`);
  return filePath;
}

function hashBuffer(buffer, algorithm) {
  return crypto.createHash(algorithm || "sha256").update(buffer).digest("hex");
}

function createVersionToken(value, options) {
  const opts = options || {};
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return hashBuffer(Buffer.from(serialized), opts.algorithm)
    .slice(0, Math.max(8, Number(opts.length) || 16));
}

function createCacheManifest(options) {
  const opts = options || {};
  const rootDir = path.resolve(opts.rootDir || process.cwd());
  const algorithm = opts.algorithm || "sha256";
  const optional = new Set((opts.optionalUrls || []).map(normalizeUrl));
  const urls = [];
  const seen = new Set();

  for (const rawUrl of opts.urls || []) {
    const url = normalizeUrl(rawUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  const entries = urls.map(function toManifestEntry(url) {
    const filePath = resolveUrlFile(rootDir, url, opts.aliases, opts.allowedRootDirs);
    let bytes;
    try {
      bytes = fs.readFileSync(filePath);
    } catch (error) {
      throw new Error(`PWA cache URL references a missing file: ${url} (${filePath})`, { cause: error });
    }
    return {
      url,
      revision: hashBuffer(bytes, algorithm),
      bytes: bytes.length,
      optional: optional.has(url),
    };
  }).sort(function byUrl(a, b) {
    return a.url.localeCompare(b.url);
  });

  const buildHash = crypto.createHash(algorithm);
  for (const entry of entries) {
    buildHash.update(entry.url);
    buildHash.update("\0");
    buildHash.update(entry.revision);
    buildHash.update("\0");
    buildHash.update(entry.optional ? "optional" : "critical");
    buildHash.update("\n");
  }

  const critical = entries.filter(function isCritical(entry) {
    return !entry.optional;
  });
  const optionalEntries = entries.filter(function isOptional(entry) {
    return entry.optional;
  });

  return {
    version: buildHash.digest("hex").slice(0, Math.max(8, Number(opts.versionLength) || 16)),
    algorithm,
    entries,
    critical,
    optional: optionalEntries,
    totals: {
      entries: entries.length,
      bytes: entries.reduce(function sum(total, entry) { return total + entry.bytes; }, 0),
      criticalEntries: critical.length,
      criticalBytes: critical.reduce(function sum(total, entry) { return total + entry.bytes; }, 0),
      optionalEntries: optionalEntries.length,
      optionalBytes: optionalEntries.reduce(function sum(total, entry) { return total + entry.bytes; }, 0),
    },
  };
}

function collectFiles(rootDir, options) {
  const opts = options || {};
  const absoluteRoot = path.resolve(rootDir);
  const include = typeof opts.include === "function" ? opts.include : function includeAll() { return true; };
  const out = [];
  const queue = [absoluteRoot];

  while (queue.length) {
    const directory = queue.shift();
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort(function byName(a, b) { return a.name.localeCompare(b.name); });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolute);
      } else if (entry.isFile() && include(absolute, entry)) {
        out.push(absolute);
      }
    }
  }
  return out;
}

module.exports = {
  normalizeUrl,
  resolveUrlFile,
  hashBuffer,
  createVersionToken,
  createCacheManifest,
  collectFiles,
};

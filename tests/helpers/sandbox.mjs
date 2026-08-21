/**
 * Loading helpers for code that was never written to be imported.
 *
 * Most of this repo is plain <script> files that declare things in global
 * scope — there is no build step and nothing exports. Rather than refactor
 * ten working apps to make them testable, the tests run those files inside a
 * `vm` context and read the globals back out.
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export function repoPath(...parts) {
  return path.join(repoRoot, ...parts);
}

export function readRepoFile(relative) {
  return fs.readFileSync(repoPath(relative), "utf8");
}

/**
 * Same idea as loadGlobals, but for logic living in an inline <script> inside
 * an HTML page. Several apps here are a single index.html with no separate JS
 * file, so this is the only way to reach their functions without first
 * splitting the file apart.
 *
 * @param {string} relative  repo-relative path to the .html file
 * @param {string[]} names   identifiers to pull out
 * @param {object} extraCtx  stubs the page needs at parse time (document, etc.)
 * @param {number} index     which inline <script> to run, when there are several
 */
export function loadInlineScript(relative, names, extraCtx = {}, index = 0) {
  const html = readRepoFile(relative);
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];

  if (!blocks[index]) {
    throw new Error(`${relative} has no inline <script> at index ${index}`);
  }

  const context = { console, ...extraCtx };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);

  const harvest = `;({ ${names.join(", ")} });`;
  vm.runInContext(blocks[index][1] + harvest, context, { filename: relative });

  return vm.runInContext(`({ ${names.join(", ")} })`, context);
}

/**
 * Run a global-scope script and hand back the names asked for.
 *
 * `var` and `function` declarations attach to the context object, but `const`,
 * `let`, and `class` do not — they live in the script's lexical scope and are
 * invisible from outside. Appending an expression that mentions them is what
 * makes those reachable, so the trailing `({...})` below is load-bearing.
 *
 * @param {string} relative  repo-relative path to the script
 * @param {string[]} names   identifiers to pull out
 * @param {object} extraCtx  extra globals the script needs to not throw
 */
export function loadGlobals(relative, names, extraCtx = {}) {
  const context = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...extraCtx,
  };
  // Scripts routinely reach for `window`; point it at the sandbox itself so
  // `window.foo = 1` and a bare `foo = 1` end up in the same place.
  context.window = context;
  context.globalThis = context;

  vm.createContext(context);

  const source = readRepoFile(relative);
  const harvest = `;({ ${names.join(", ")} });`;
  vm.runInContext(source + harvest, context, { filename: relative });

  return vm.runInContext(`({ ${names.join(", ")} })`, context);
}

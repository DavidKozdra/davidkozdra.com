import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const modules = {
  particles: 'koz-engine-lib/VisualFX/particleSystemCore',
  events: 'koz-engine-lib/Events/eventBus',
};
const pkg = require('koz-engine-lib/package.json');
let output = `/* Generated from koz-engine-lib@${pkg.version}. Run npm run build to refresh. */\n(function () {\n'use strict';\nconst engine = {};\n`;
for (const [name, specifier] of Object.entries(modules)) {
  const source = await readFile(require.resolve(specifier), 'utf8');
  if (/\brequire\s*\(/.test(source)) throw new Error(`${specifier} needs dependency bundling`);
  output += `engine.${name} = (function () { const module = { exports: {} };\n${source}\nreturn module.exports; })();\n`;
}
output += `globalThis.CardKingEngine = Object.freeze({ version: '${pkg.version}', ParticleSystemCore: engine.particles.ParticleSystemCore, EventBus: engine.events.EventBus });\n})();\n`;
const directory = new URL('../vendor/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('koz-engine.js', directory), output);
console.log(`Bundled koz-engine-lib@${pkg.version} (${Buffer.byteLength(output)} bytes)`);

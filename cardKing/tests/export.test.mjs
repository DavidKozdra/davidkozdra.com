import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createTemplate, createElement, normalizeProject, normalizeLayout, parseProject, eventTimestamp, safeUrl } from '../project.mjs';
import { generateHTML } from '../render.mjs';

const assets = {
  css: await readFile(new URL('../page.css', import.meta.url), 'utf8'),
  engine: await readFile(new URL('../vendor/koz-engine.js', import.meta.url), 'utf8'),
};

test('every template exports and reopens without losing its data', () => {
  for (const name of ['birthday', 'party', 'note', 'dino']) {
    const project = createTemplate(name);
    const html = generateHTML(project, assets);
    assert.deepEqual(parseProject(html), project);
    assert.match(html, /ParticleSystemCore/);
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel="stylesheet"/);
  }
});
test('content cannot break out of markup, attributes, or embedded project JSON', () => {
  const project = createTemplate();
  project.heading = '</script><script>alert(1)</script><img src=x onerror=alert(2)>';
  project.message = '" onmouseover="alert(3)';
  project.name = '<title>oops</title>';
  const html = generateHTML(project, assets);
  assert.doesNotMatch(html, /<script>alert|<img src=x/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.deepEqual(parseProject(html), project);
  for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new vm.Script(script[1]));
});
test('unsafe links, arbitrary palettes, SVG uploads, and unknown blocks are removed on import', () => {
  const p = normalizeProject({ ...createTemplate(), buttonUrl: 'javascript:alert(1)', image: 'data:image/svg+xml;base64,PHN2Zz4=', accent: 'red;}body{display:none}', palette: '__proto__', blocks: [{ type: 'message', enabled: true }, { type: 'message', enabled: true }, { type: 'script', enabled: true }, null] });
  assert.equal(p.buttonUrl, ''); assert.equal(p.image, ''); assert.equal(p.palette, 'confetti'); assert.equal(p.accent, '#e56b52');
  assert.equal(p.blocks.length, 4);
  assert.equal(p.blocks.filter(b => b.type === 'message').length, 1);
  assert.equal(safeUrl('data:text/html,hello'), '');
  assert.equal(safeUrl('https://example.com/rsvp'), 'https://example.com/rsvp');
});
test('event timestamps use the host’s chosen time zone, including daylight saving', () => {
  const project = createTemplate();
  assert.equal(new Date(eventTimestamp(project)).toISOString(), '2026-11-16T00:00:00.000Z');
  project.date = '2026-07-15';
  assert.equal(new Date(eventTimestamp(project)).toISOString(), '2026-07-15T23:00:00.000Z');
  project.timezone = 'Asia/Kolkata';
  assert.equal(new Date(eventTimestamp(project)).toISOString(), '2026-07-15T13:30:00.000Z');
  project.date = '';
  assert.equal(eventTimestamp(project), null);
});
test('an embedded raster photo travels with the HTML and survives reopening', () => {
  const p = createTemplate();
  p.image = 'data:image/png;base64,iVBORw0KGgo='; p.imageAlt = 'A happy memory';
  p.blocks.find(b => b.type === 'image').enabled = true;
  const html = generateHTML(p, assets);
  assert.match(html, /<img src="data:image\/png;base64,/);
  assert.equal(parseProject(html).image, p.image);
});
test('disabled and reordered blocks are reflected in the page, and RSVP is explicit', () => {
  const p = createTemplate();
  let html = generateHTML(p, assets);
  assert.doesNotMatch(html, /class="rsvp-button"/);
  p.rsvpEmail = 'party@example.com';
  p.blocks = [{ type: 'action', enabled: true }, { type: 'message', enabled: false }, { type: 'details', enabled: true }, { type: 'image', enabled: false }];
  html = generateHTML(p, assets);
  assert.match(html, /href="mailto:party@example.com\?subject=/);
  assert.doesNotMatch(html, /<section class="message-block"/);
  assert.ok(html.match(/<section\b[^>]*class="action-block"/).index < html.match(/<section\b[^>]*class="details-block"/).index);
});
test('invalid imports fail clearly and cannot be mistaken for another format', () => {
  assert.throws(() => parseProject('{bad json'), /valid project data/);
  assert.throws(() => parseProject('{"version":2}'), /supported Card King/);
  assert.throws(() => parseProject('<html><script>alert(1)</script></html>'), /wasn’t exported/);
});
test('the committed browser bundle exposes the real npm engine without a global module shim', () => {
  const context = vm.createContext({});
  vm.runInContext(assets.engine, context);
  assert.equal(context.module, undefined);
  assert.equal(context.CardKingEngine.version, '0.1.0');
  const bus = new context.CardKingEngine.EventBus();
  let value; bus.on('edit', payload => value = payload); bus.emit('edit', 'hello'); assert.equal(value, 'hello');
  const system = new context.CardKingEngine.ParticleSystemCore({ poolSize: 4 });
  system.spawn(0, 0, { life: 100 }); assert.equal(system.activeCount(), 1);
  system.update(110); assert.equal(system.activeCount(), 0);
});
test('canvas positions, element styles, custom elements, and CSS survive HTML reopening', () => {
  const p = createTemplate();
  p.elements = [createElement('text', 'el-test-text'), createElement('button', 'el-test-button'), createElement('html', 'el-test-html')];
  p.layouts = { heading: { x: 8, y: 12, rotation: -8, fontSize: 70, color: '#abcdef' }, 'el-test-text': { x: 15, y: 140, width: 60, animation: 'float' } };
  p.customCSS = '.invitation { border-radius: 20px; }';
  p.elements[1].action = 'reveal';
  const html = generateHTML(p, assets);
  assert.deepEqual(parseProject(html), p);
  assert.match(html, /translate:8cqw 12cqw/);
  assert.match(html, /rotate:-8deg/);
  assert.match(html, /data-ck-action="reveal"/);
  assert.match(html, /sandbox="allow-popups"/);
  assert.doesNotMatch(html, /id="ck-selection"|function canvasRuntime/);
  assert.match(generateHTML(p, assets, { preview: true, editing: true }), /function canvasRuntime/);
});
test('style inputs are bounded and custom CSS cannot break out of a style tag', () => {
  assert.deepEqual(normalizeLayout({ x: Infinity, width: -500, rotation: 999, background: 'url(javascript:bad)', font: '__proto__', animation: 'evil;}' }), { width: 3, rotation: 360 });
  const p = createTemplate();
  p.customCSS = '</style><script>alert("oops")</script>';
  const html = generateHTML(p, assets);
  assert.doesNotMatch(html, /<script>alert\("oops"\)/);
  assert.deepEqual(parseProject(html), p);
});

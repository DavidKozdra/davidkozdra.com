import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTemplate, createElement, normalizeProject, readingOrder } from '../project.mjs';
import { generateHTML } from '../render.mjs';
import { contrastRatio } from '../accessibility.mjs';
const assets = { css: await readFile(new URL('../page.css', import.meta.url), 'utf8'), engine: await readFile(new URL('../vendor/koz-engine.js', import.meta.url), 'utf8') };

test('older projects migrate without changing existing geometry or content', () => {
  const p = createTemplate(); delete p.readingOrder; delete p.imageDecorative;
  p.layouts.heading = { x: 12, y: -7, rotation: 15 };
  const next = normalizeProject(p);
  assert.deepEqual(next.layouts, p.layouts); assert.equal(next.heading, p.heading);
  assert.deepEqual(next.readingOrder, []); assert.equal(next.imageDecorative, false);
});
test('reading order changes DOM order while visual grid rows and z order stay fixed', () => {
  const p = createTemplate(); p.elements.push(createElement('text', 'el-note'));
  p.layouts.heading = { z: 10 }; p.readingOrder = ['heading', 'el-note', 'eyebrow', 'heading', 'unknown'];
  const next = normalizeProject(p);
  assert.deepEqual(next.readingOrder, ['heading', 'el-note', 'eyebrow']);
  const html = generateHTML(next, assets);
  const content = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
  assert.ok(content.indexOf('data-ck-id="heading"') < content.indexOf('data-ck-id="el-note"'));
  assert.ok(content.indexOf('data-ck-id="el-note"') < content.indexOf('data-ck-id="eyebrow"'));
  assert.match(content, /<h1 style="grid-row:3"/);
  assert.match(content, /<p style="grid-row:1"/);
  assert.equal(next.layouts.heading.z, 10);
  assert.ok(readingOrder(next).includes('message'));
});
test('decorative photos export empty alternatives; meaningful photos retain descriptions', () => {
  const p = createTemplate(); p.image = 'data:image/png;base64,iVBORw0KGgo='; p.imageAlt = 'Friends celebrating';
  p.blocks.find(b => b.type === 'image').enabled = true;
  p.elements.push({ ...createElement('image', 'el-photo'), image: p.image, alt: 'Flowers', decorative: true });
  assert.match(generateHTML(p, assets), /alt="Friends celebrating"/);
  p.imageDecorative = true;
  const html = generateHTML(p, assets);
  assert.equal([...html.matchAll(/<img[^>]*alt=""/g)].length, 2);
  assert.doesNotMatch(html, /<figcaption>/);
});
test('contrast calculation distinguishes readable colors and low contrast', () => {
  assert.equal(contrastRatio([0,0,0], [255,255,255]), 21);
  assert.ok(contrastRatio([32,58,50], [255,255,255]) > 7);
  assert.ok(contrastRatio([160,170,150], [255,255,255]) < 4.5);
});
test('exports keep seconds quiet and provide recipient pause controls', () => {
  const html = generateHTML(createTemplate(), assets);
  assert.match(html, /data-countdown role="timer" aria-live="off"/);
  assert.match(html, /id="pause-motion"/); assert.match(html, /id="pause-countdown"/);
  assert.match(html, /data-count-unit="seconds"/);
  assert.doesNotMatch(html, /cardking:report/);
});

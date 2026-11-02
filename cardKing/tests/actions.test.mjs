import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTemplate, createElement, normalizeProject, parseProject } from '../project.mjs';
import { generateHTML } from '../render.mjs';
import { actionURL } from '../actions.mjs';
const assets={css:await readFile(new URL('../page.css',import.meta.url),'utf8'),engine:await readFile(new URL('../vendor/koz-engine.js',import.meta.url),'utf8')};
test('birthday preset includes the existing card actions and event configuration',()=>{
 const p=createTemplate('birthday-site');assert.equal(p.rsvpMode,'relay');assert.equal(p.eventDuration,150);assert.equal(p.openingStyle,'fold');assert.equal(p.photoRain,true);
 assert.deepEqual(p.elements.map(e=>e.action),['calendar','map','menu','games','close-card']);assert.equal(p.confettiSprites.length,9);
 const url=new URL(actionURL('calendar',p));assert.equal(url.searchParams.get('dates'),'20261116T000000Z/20261116T023000Z');assert.equal(url.searchParams.get('ctz'),'America/New_York');
 assert.equal(actionURL('menu',p),'https://davidkozdra.com/cards/brithday/menu.html');
});
test('all button actions, card panels, and custom cover/footer text survive export',()=>{
 const p=createTemplate('birthday-site');p.coverHeading='Private celebration';p.footerText='Contact the host';p.backMessage='Back text';p.elements.push({...createElement('text','el-cover-text'),surface:'cover',text:'Cover annotation'});
 const html=generateHTML(p,assets);assert.deepEqual(parseProject(html),p);assert.match(html,/Private celebration/);assert.match(html,/data-ck-action="rsvp"/);assert.match(html,/id="rsvp-dialog"/);assert.match(html,/aria-haspopup="dialog"/);assert.match(html,/Cover annotation/);
 const cover=generateHTML(p,assets,{preview:true,editing:true,surface:'cover'});assert.match(cover,/data-ck-id="cover-heading"/);assert.doesNotMatch(cover,/<h1 /);
 const back=generateHTML(p,assets,{preview:true,editing:true,surface:'back'});assert.match(back,/data-ck-id="back-message"/);
});
test('unsafe actions, external image markup, and invalid relay endpoints cannot enter the renderer',()=>{
 const p=createTemplate();p.elements=[{...createElement('button','el-bad'),action:'javascript:alert(1)',url:'javascript:alert(1)',surface:'evil'}];p.rsvpEndpoint='javascript:alert(1)';p.coverImage='<svg onload="alert(1)">';
 const clean=normalizeProject(p);assert.equal(clean.elements[0].action,'celebrate');assert.equal(clean.elements[0].url,'');assert.equal(clean.elements[0].surface,'content');assert.equal(clean.rsvpEndpoint,'');assert.equal(clean.coverImage,'');
});
test('calendar and map URLs use edited event details and per-button overrides',()=>{
 const p=createTemplate();p.location='123 Main St, Boston';p.eventDuration=60;
 assert.match(actionURL('map',p),/123%20Main%20St/);assert.equal(actionURL('games',p,'https://example.com/play'),'https://example.com/play');
 assert.equal(new URL(actionURL('calendar',p)).searchParams.get('dates'),'20261116T000000Z/20261116T010000Z');
});

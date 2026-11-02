import { initCardSettings, cardProperties } from './card-settings.mjs';
import { replaceContent } from './dom.mjs';
import { initAccessibleStudio } from './studio-accessibility.mjs';
import { BUILTIN_ELEMENTS, ELEMENT_FONTS, PALETTES, STICKERS, BUTTON_ACTIONS, createElement, normalizeLayout, escapeHtml as e } from './project.mjs';
import { projectLayoutCSS } from './layout.mjs';

export function initCanvasEditor(api) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  let selectedId = '';
  let mode = 'edit';
  let surface = 'content';
  let cardSettings;
  let scrollY = 0;
  let metrics = null;
  let codeTab = 'page';
  let pendingPhoto = '';
  let studio;
  const textFields = { heading: 'heading', eyebrow: 'eyebrow', message: 'message', sender: 'sender', action: 'buttonLabel', footer: 'footerText', sticker: 'graphic', 'cover-eyebrow': 'coverEyebrow', 'cover-heading': 'coverHeading', 'cover-hint': 'coverHint', 'cover-graphic': 'coverGraphic', 'back-heading': 'backHeading', 'back-message': 'backMessage', 'back-note': 'backNote' };
  const name = id => BUILTIN_ELEMENTS[id] || (() => { const item = api.getProject().elements.find(el => el.id === id); return item ? `${item.type}${item.text ? ': ' + item.text.replace(/\s+/g, ' ').slice(0, 28) : ''}` : 'Element'; })();
  const element = () => api.getProject().elements.find(el => el.id === selectedId);
  const style = () => api.getProject().layouts[selectedId] || {};
  const send = payload => $('#preview').contentWindow?.postMessage({ type: 'cardking:editor', ...payload }, '*');
  const uniqueId = () => `el-${crypto.randomUUID()}`;
  const knownId = id => Object.hasOwn(BUILTIN_ELEMENTS, id) || api.getProject().elements.some(el => el.id === id);
  $('.canvas-toolbar').insertAdjacentHTML('afterend', `
    <div class="creation-toolbar"><div class="add-elements" role="group" aria-label="Add elements">
      <button data-add="text" title="Add text"><b>T</b><span>Text</span></button><button data-add="sticker" title="Add sticker"><b>✦</b><span>Sticker</span></button><button data-add="image" title="Add photo"><b>▧</b><span>Photo</span></button><button data-add="shape" title="Add shape"><b>◯</b><span>Shape</span></button><button data-add="button" title="Add interactive button"><b>↗</b><span>Button</span></button><button data-add="countdown" title="Add countdown"><b>◷</b><span>Timer</span></button><button data-add="html" title="Add HTML block"><b>⟨/⟩</b><span>HTML</span></button>
    </div><button class="code-button" id="open-code" title="Edit HTML and CSS">⟨/⟩ <span>Code</span></button></div>
    <div class="canvas-options"><div class="canvas-mode" role="group" aria-label="Canvas mode"><button data-canvas-mode="edit" aria-pressed="true">↖ Edit canvas</button><button data-canvas-mode="interact" aria-pressed="false">▶ Test interactions</button></div><label class="canvas-option"><input id="snap-toggle" type="checkbox" checked> Snap</label><label class="canvas-option"><input id="grid-toggle" type="checkbox"> Grid</label><span class="canvas-options-spacer"></span><label class="zoom-control">Zoom <select id="canvas-zoom" aria-label="Canvas zoom"><option value=".65">65%</option><option value=".8">80%</option><option value="1" selected>100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label></div>
  `);
  $('.canvas-intro .handwritten').textContent = 'Click to select. Drag to move. Double-click to write.';
  $('.canvas-caption').innerHTML = 'HTML preview <span>✦</span>';
  $('.live-label').lastChild.textContent = ' EDIT CANVAS';
  $('.outline-panel').insertAdjacentHTML('afterbegin', `
    <section class="element-inspector" id="element-inspector"><div class="section-heading"><h2>Element properties</h2><span class="inspector-badge">LIVE</span></div><div id="inspector-content"></div></section>
    <section class="layers-section"><div class="section-heading"><h2>Layers</h2><span id="layer-count"></span></div><div id="element-layers"></div></section>
  `);
  $('.outline-header').hidden = true;
  $('.outline-description').textContent = 'Your page structure. Every element can also move freely on the canvas.';
  $('.outline-tip').innerHTML = 'Drag on the canvas to move freely.<br>Use these arrows to reorder sections.';
  document.body.insertAdjacentHTML('beforeend', `
    <input id="element-photo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
    <dialog id="code-dialog" class="code-dialog"><button class="dialog-close icon-button" data-close="code-dialog" aria-label="Close code editor">×</button><span class="eyebrow-label">SOURCE EDITOR</span><h2>HTML and CSS</h2><div class="code-tabs" role="tablist" aria-label="Code editor"><button data-code-tab="page" role="tab" aria-selected="true">Page CSS</button><button data-code-tab="html" role="tab" aria-selected="false">Block HTML</button><button data-code-tab="block" role="tab" aria-selected="false">Block CSS</button><button data-code-tab="export" role="tab" aria-selected="false">Full HTML</button></div><div id="code-panel" role="tabpanel" aria-labelledby="code-tab-page"><p id="code-description"></p><label class="sr-only" for="code-source">Source code</label><textarea id="code-source" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div><div class="code-footer"><span id="code-status">Changes appear live in your canvas.</span><button class="button button-outline" id="reset-page-css">Reset page CSS</button><button class="button button-primary" data-close="code-dialog">Back to creating ↗</button></div></dialog>
  `);

  function patchLayout(patch, group = '') {
    if (!selectedId || !knownId(selectedId)) return;
    const p = api.getProject();
    api.update({ ...p, layouts: { ...p.layouts, [selectedId]: normalizeLayout({ ...style(), ...patch }) } }, group, { skipPreview: mode === 'edit' });
  }
  function patchElement(patch, group = '') {
    const p = api.getProject();
    api.update({ ...p, elements: p.elements.map(el => el.id === selectedId ? { ...el, ...patch } : el) }, group);
  }
  function setSurface(next) {
    if (!['content','cover','back'].includes(next)) return;
    surface = next; selectedId = next === 'cover' ? 'cover-heading' : next === 'back' ? 'back-heading' : 'heading'; metrics = null; scrollY = 0;
    document.querySelectorAll('[data-surface-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.surfaceView === surface)));
    const options=$('#surface-options'); if(options)options.hidden=surface==='content';
    renderInspector(); renderLayers(); api.renderPreview();
  }
  function select(id, fromCanvas = false) {
    if (id && !knownId(id)) return;
    const targetSurface = id.startsWith('cover-') ? 'cover' : id.startsWith('back-') ? 'back' : api.getProject().elements.find(el => el.id === id)?.surface || 'content';
    if (id && targetSurface !== surface) setSurface(targetSurface);
    selectedId = id; if (!fromCanvas) metrics = null;
    renderInspector(); renderLayers();
    if (id) studio?.announce(`${name(id)} selected`);
    if (!fromCanvas && mode === 'edit') send({ action: 'select', id });
  }
  function renderInspector() {
    const root = $('#inspector-content');
    if (!selectedId) {
      replaceContent(root, '<div class="inspector-empty"><span>↖</span><strong>No element selected</strong><p>Select an element on the card or in Layers to edit its content, appearance, and behavior.</p><small>Drag · Resize · Rotate · Double-click to write</small></div>');
      return;
    }
    const p = api.getProject(); const item = element(); const s = style(); const isText = !!textFields[selectedId] || ['text', 'sticker', 'button'].includes(item?.type);
    const field = (label, key, value, min, max, step = 1) => `<label>${label}<input type="number" data-layout="${key}" value="${Math.round(value * 100) / 100}" min="${min}" max="${max}" step="${step}"></label>`;
    replaceContent(root, `
      <div class="selected-element-heading"><span>${e(name(selectedId))}</span><div><button data-element-command="duplicate" title="Duplicate" aria-label="Duplicate selected element">⧉</button><button data-element-command="delete" title="Delete" aria-label="Delete selected element">×</button></div></div>
      <details data-group="content" open><summary>Content</summary>${isText ? `<button type="button" id="focus-element-text" class="button button-outline">Edit text</button><label class="field">${item?.type === 'sticker' ? 'Emoji / symbol' : 'Text'}<textarea id="element-content" rows="${item?.type === 'sticker' ? 1 : 3}" maxlength="6000">${e(item ? item.text : (selectedId === 'sticker' ? p.graphic ?? STICKERS[p.sticker] : selectedId === 'cover-graphic' ? p.coverGraphic ?? p.graphic ?? STICKERS[p.sticker] : p[textFields[selectedId]]))}</textarea></label>` : ''}
      ${cardProperties(selectedId,p)}
      ${item?.type === 'image' ? '<label class="field">Photo description<input id="element-alt" maxlength="500"></label><label class="check-field"><input id="element-decorative" type="checkbox">Decorative photo</label><button class="button button-outline full-width" id="replace-element-photo">Choose a photo ↗</button>' : ''}
      ${item?.type === 'html' ? '<button class="button button-outline full-width" id="edit-element-code">Edit this HTML & CSS ⟨/⟩</button>' : ''}
      </details><details data-group="position" open><summary>Position and size</summary><div class="nudge-controls" role="group" aria-label="Move selected element"><button type="button" data-nudge="left">← Left</button><button type="button" data-nudge="up">↑ Up</button><button type="button" data-nudge="down">↓ Down</button><button type="button" data-nudge="right">→ Right</button></div><p class="field-hint">Move 8 px per click, or enter exact values below.</p><div class="inspector-grid three">${field('X', 'x', (s.x || 0) * 6, -3000, 3000)}${field('Y', 'y', (s.y || 0) * 6, -3000, 9000)}${field('Rotate °', 'rotation', s.rotation || 0, -360, 360)}</div><div class="inspector-grid">${field('Width', 'width', (s.width || metrics?.width || 70) * 6, 18, 1500)}${field('Height', 'height', (s.height || metrics?.height || 20) * 6, 12, 3000)}</div>
      </details><details data-group="appearance"><summary>Appearance</summary><div class="inspector-grid">${field('Font size', 'fontSize', s.fontSize || (metrics ? metrics.fontSize * 6 / metrics.unit : 24), 8, 240)}${field('Line height', 'lineHeight', s.lineHeight || 1.4, .6, 4, .1)}</div>
      <label class="field inspector-font">Typeface<select data-layout="font">${Object.entries(ELEMENT_FONTS).map(([key, value]) => `<option value="${key}"${(s.font || 'inherit') === key ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
      <div class="element-text-tools" role="group" aria-label="Text formatting"><button data-format="bold" aria-pressed="${s.bold === true}"><span aria-hidden="true"><b>B</b></span><span class="sr-only">Bold</span></button><button data-format="italic" aria-pressed="${s.italic === true}"><span aria-hidden="true"><i>I</i></span><span class="sr-only">Italic</span></button>${['left', 'center', 'right'].map((align, i) => `<button data-align="${align}" aria-label="Align ${align}" aria-pressed="${(s.align || 'center') === align}">${['☰', '≡', '☰'][i]}</button>`).join('')}</div>
      <div class="inspector-colors"><label>Text<input type="color" data-layout="color" value="${s.color || PALETTES[p.palette].ink}"></label><label>Fill<input type="color" data-layout="background" value="${s.background || PALETTES[p.palette].paper}"></label><button class="text-button" id="clear-element-fill">Clear fill</button></div>
      <div class="inspector-grid">${field('Corner radius', 'radius', s.radius || 0, 0, 500)}${field('Opacity %', 'opacity', s.opacity ?? 100, 0, 100)}${field('Letter space', 'letterSpacing', s.letterSpacing || 0, -10, 40, .5)}${field('Padding', 'padding', s.padding || 0, 0, 100)}</div>
      <label class="field">Motion<select data-layout="animation">${[['none', 'None'], ['float', 'Float gently'], ['pulse', 'Heartbeat'], ['wiggle', 'Rotate gently'], ['reveal', 'Fade & rise']].map(([key, value]) => `<option value="${key}"${(s.animation || 'none') === key ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
      </details>${item ? `<label class="check-field"><input id="element-flow" type="checkbox"${item.flow?' checked':''}>Use automatic layout</label>` : ''}
      ${item?.type === 'button' ? `<details data-group="interaction"><summary>Interaction</summary><div class="button-behavior"><span class="inspector-section-label">ON CLICK</span><label class="field">Interaction<select id="element-action">${Object.entries(BUTTON_ACTIONS).map(([key,label]) => `<option value="${key}"${item.action === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label>${['link','menu','games','map'].includes(item.action) ? `<label class="field">Link URL<input id="element-url" type="url" value="${e(item.url)}" placeholder="https://…"><span class="field-hint">Optional override for this button. Configure shared event URLs in Interactions.</span></label>` : item.action === 'reveal' ? `<label class="field">The surprise<textarea id="element-reveal" rows="3">${e(item.revealText)}</textarea></label>` : ''}</div></details>` : ''}
      <div class="inspector-bottom-tools"><button class="button button-outline" data-element-command="back">Send back ↓</button><button class="button button-outline" data-element-command="front">Bring front ↑</button></div><div class="inspector-bottom-tools"><button class="text-button" data-element-command="lock">${s.locked ? 'Unlock element' : 'Lock position'}</button><button class="text-button" data-element-command="reset">Reset style</button><button class="text-button" data-element-command="position">Reset position</button><button class="text-button" data-element-command="hide">${s.hidden ? 'Show' : 'Hide'}</button></div>
    `);
    if ($('#element-alt')) $('#element-alt').value = item?.alt || '';
    if ($('#element-decorative')) $('#element-decorative').checked = item?.decorative === true;
  }
  function renderLayers() {
    const p = api.getProject();
    const ids = [...Object.keys(BUILTIN_ELEMENTS).filter(id => {
      if (surface !== 'content') return id.startsWith(`${surface}-`);
      if (id.startsWith('cover-') || id.startsWith('back-')) return false;
      if (id === 'photo') return p.image && p.blocks.some(b => b.type === 'image' && b.enabled);
      if (id === 'countdown') return p.countdown;
      if (id === 'action') return p.buttonUrl || p.rsvpEmail || p.rsvpMode === 'relay';
      if (['message', 'sender'].includes(id)) return p.blocks.some(b => b.type === 'message' && b.enabled);
      if (id === 'details') return p.blocks.some(b => b.type === 'details' && b.enabled);
      if (id === 'sticker') return true;
      return true;
    }), ...p.elements.filter(el => el.surface === surface).map(el => el.id)].reverse();
    $('#layer-count').textContent = `${ids.length} elements`;
    replaceContent($('#element-layers'), ids.map(id => `<div class="element-layer${id === selectedId ? ' is-selected' : ''}${p.layouts[id]?.hidden ? ' is-hidden' : ''}"><button data-select-element="${id}"><span>${id.startsWith('el-') ? '◇' : '◈'}</span>${e(name(id))}${p.layouts[id]?.locked ? ' ⌑' : ''}</button><button data-layer-eye="${id}" aria-label="${p.layouts[id]?.hidden ? 'Show' : 'Hide'} ${e(name(id))}" title="Toggle visibility">${p.layouts[id]?.hidden ? '○' : '◉'}</button></div>`).join(''));
  }
  function add(type, source = null) {
    if (mode !== 'edit') setMode('edit');
    const p = api.getProject(); if (p.elements.length >= 100) return api.toast('This page has 100 custom elements. Duplicate the project to start a new page.', true);
    const id = uniqueId(); const item = source ? { ...structuredClone(source), id } : createElement(type, id); item.surface = surface;
    const y = Math.max(45, scrollY / (metrics?.unit || 4) + 45);
    const layout = { x: 15, y, width: 70, z: Math.max(3, ...Object.values(p.layouts).map(s => s.z || 0)) + 1 };
    if (type === 'text') Object.assign(layout, { fontSize: 36, align: 'center' });
    if (type === 'sticker') Object.assign(layout, { width: 22, fontSize: 80 });
    if (type === 'shape') Object.assign(layout, { width: 35, height: 25, background: p.accent, radius: 16, opacity: 85 });
    if (type === 'button') Object.assign(layout, { x: 25, width: 50, fontSize: 18 });
    if (type === 'html') Object.assign(layout, { x: 5, width: 90, height: 50 });
    if (type === 'image') Object.assign(layout, { width: 60, height: 55, radius: 8 });
    if (item.flow) { delete layout.x; delete layout.y; delete layout.width; }
    selectedId = id; metrics = null;
    api.update({ ...p, elements: [...p.elements, item], layouts: { ...p.layouts, [id]: layout } });
    if (type === 'image' && !source) { pendingPhoto = id; $('#element-photo-upload').click(); }
    if (type === 'html' && !source) openCode('html');
  }
  function command(command, id = selectedId) {
    if (command === 'undo' || command === 'redo' || command === 'save') { api[command](); return; }
    if (!id || !knownId(id)) return;
    selectedId = id;
    const p = api.getProject(); const s = style(); const item = element();
    if (command === 'delete') {
      if (item) {
        const layouts = { ...p.layouts }; delete layouts[id]; selectedId = surface === 'cover' ? 'cover-heading' : surface === 'back' ? 'back-heading' : 'heading';
        api.update({ ...p, elements: p.elements.filter(el => el.id !== id), layouts });
      } else patchLayout({ hidden: true });
    }
    if (command === 'duplicate') {
      let copy = item;
      if (!copy) {
        const type = id === 'countdown' ? 'countdown' : id === 'photo' ? 'image' : id === 'action' ? 'button' : id === 'sticker' ? 'sticker' : 'text';
        copy = createElement(type, ''); copy.text = p[textFields[id]] || (id === 'details' ? `${p.date}\n${p.location}` : id === 'sticker' ? '✨' : '✦');
        if (type === 'image') { copy.image = p.image; copy.alt = p.imageAlt; }
        if (type === 'button') { copy.url = p.buttonUrl; copy.action = copy.url ? 'link' : 'celebrate'; }
      }
      copy = { ...copy, surface };
      const nextId = uniqueId(); const layout = { ...s, x: (s.x || 0) + 5, y: (s.y || 0) + 5, hidden: false, locked: false, z: (s.z || 3) + 1 };
      if (!item) { layout.x = 15; layout.y = Math.max(50, scrollY / (metrics?.unit || 4) + 50); layout.width = s.width || 70; }
      selectedId = nextId;
      api.update({ ...p, elements: [...p.elements, { ...structuredClone(copy), id: nextId }], layouts: { ...p.layouts, [nextId]: layout } });
    }
    if (command === 'front') patchLayout({ z: Math.max(0, ...Object.values(p.layouts).map(l => l.z || 0)) + 1 });
    if (command === 'back') patchLayout({ z: Math.max(-5, Math.min(3, ...Object.values(p.layouts).map(l => l.z ?? 3)) - 1) });
    if (command === 'lock') patchLayout({ locked: !s.locked });
    if (command === 'hide') patchLayout({ hidden: !s.hidden });
    if (command === 'reset') {
      const keep = Object.fromEntries(Object.entries(s).filter(([key]) => ['x','y','width','height','rotation','z'].includes(key)));
      api.update({ ...p, layouts: { ...p.layouts, [id]: keep } });
    }
    if (command === 'position') { const next = {...s}; for (const key of ['x','y','width','height','rotation']) delete next[key]; if (item && !item.flow) Object.assign(next,{x:15,y:45,width:70}); api.update({...p,layouts:{...p.layouts,[id]:next}}); }
    renderInspector(); renderLayers();
    if (command === 'delete') queueMicrotask(() => $(`[data-select-element="${selectedId}"]`)?.focus({ preventScroll: true }));
    studio?.refresh();
  }
  function sync() { if (mode === 'edit') send({ action: 'sync', project: api.getProject(), css: projectLayoutCSS(api.getProject()) }); }
  function refresh() {
    if (selectedId && !knownId(selectedId)) selectedId = '';
    if (!$('#element-inspector').contains(document.activeElement) || !document.activeElement.matches('input,textarea,select')) renderInspector();
    renderLayers();
    $('#snap-toggle').checked = api.getProject().canvas.snap;
    $('#grid-toggle').checked = api.getProject().canvas.grid;
    studio?.refresh(); cardSettings?.refresh();
    for (const [selector, value] of [['#page-width', api.getProject().canvas.width], ['#page-height', api.getProject().canvas.minHeight], ['#page-background', api.getProject().canvas.background || PALETTES[api.getProject().palette].paper]]) if ($(selector) && document.activeElement !== $(selector)) $(selector).value = value;
  }
  addEventListener('message', event => {
    if (event.source !== $('#preview').contentWindow || event.data?.type !== 'cardking:canvas') return;
    const data = event.data;
    if (data.action === 'select') {
      if (data.metrics && typeof data.metrics.unit === 'number' && data.metrics.unit > 0) metrics = data.metrics;
      if (data.id && data.id === selectedId) {
        // Canvas measurements arrive asynchronously after a layer selection.
        // Update just those values instead of rebuilding the active inspector.
        for (const [key, value] of [['width', metrics?.width * 6], ['height', metrics?.height * 6], ['fontSize', metrics?.fontSize * 6 / metrics?.unit]]) {
          const input = $(`[data-layout="${key}"]`);
          if (input && document.activeElement !== input && style()[key] === undefined && Number.isFinite(value)) input.value = Math.round(value * 100) / 100;
        }
      } else select(data.id || '', true);
      if (data.id) studio?.showProperties();
    }
    if (data.action === 'layout' && knownId(data.id)) { selectedId = data.id; patchLayout(normalizeLayout(data.patch)); }
    if (data.action === 'text' && knownId(data.id) && typeof data.text === 'string') {
      const p = api.getProject();
      if (data.field && ['heading', 'eyebrow', 'message', 'sender', 'location', 'buttonLabel', 'graphic', 'coverGraphic', 'coverEyebrow', 'coverHeading', 'coverHint', 'backHeading', 'backMessage', 'backNote', 'footerText'].includes(data.field)) {
        api.update({ ...p, [data.field]: data.text.slice(0, data.field === 'message' ? 6000 : 500) }, `inline-${data.field}`, { skipPreview: true }); api.fillControls();
      } else if (p.elements.some(el => el.id === data.id)) {
        api.update({ ...p, elements: p.elements.map(el => el.id === data.id ? { ...el, text: data.text.slice(0, 6000) } : el) }, `inline-${data.id}`, { skipPreview: true });
      }
      // The canvas is authoritative for an inline commit, even if focus has
      // just returned to the inspector (whose active field is kept stable).
      if (selectedId === data.id && $('#element-content')) $('#element-content').value = data.text;
    }
    if (data.action === 'command' && ['undo', 'redo', 'save', 'delete', 'duplicate'].includes(data.command)) command(data.command, data.id);
    if (data.action === 'scroll' && Number.isFinite(data.y)) scrollY = data.y;
    if (data.action === 'ready') sync();
  });
  document.addEventListener('click', event => {
    const b = event.target.closest('button'); if (!b) return;
    if (b.dataset.surfaceView) setSurface(b.dataset.surfaceView);
    if (b.id === 'reset-template-layout') { const p=api.getProject(); const layouts=structuredClone(p.layouts); for(const [id,style] of Object.entries(layouts)) if(!id.startsWith('el-')) for(const key of ['x','y','width','height','rotation']) delete style[key]; api.update({...p,layouts}); api.toast('Template positions reset. Text and button settings are unchanged.'); }
    if (b.dataset.add) add(b.dataset.add);
    if (b.dataset.selectElement) {
      if (mode !== 'edit') setMode('edit');
      select(b.dataset.selectElement);
    }
    if (b.dataset.layerEye) { selectedId = b.dataset.layerEye; patchLayout({ hidden: !style().hidden }); }
    if (b.dataset.elementCommand) command(b.dataset.elementCommand);
    if (b.dataset.canvasMode) setMode(b.dataset.canvasMode);
    if (b.id === 'focus-element-text') $('#element-content')?.focus();
    if (b.dataset.nudge) { const d = b.dataset.nudge; patchLayout({ x: (style().x || 0) + (d === 'left' ? -8/6 : d === 'right' ? 8/6 : 0), y: (style().y || 0) + (d === 'up' ? -8/6 : d === 'down' ? 8/6 : 0) }); }
    if (b.dataset.format) patchLayout({ [b.dataset.format]: !style()[b.dataset.format] });
    if (b.dataset.align) patchLayout({ align: b.dataset.align });
    if (b.id === 'clear-element-fill') { const p = api.getProject(); const layout = { ...style() }; delete layout.background; api.update({ ...p, layouts: { ...p.layouts, [selectedId]: layout } }, '', { skipPreview: true }); }
    if (b.id === 'replace-element-photo') { pendingPhoto = selectedId; $('#element-photo-upload').click(); }
    if (b.id === 'open-code') openCode('page');
    if (b.id === 'edit-element-code') openCode('html');
    if (b.dataset.codeTab) openCode(b.dataset.codeTab);
    if (b.id === 'reset-page-css') { api.update({ ...api.getProject(), customCSS: '' }); openCode('page'); }
  });
  function setMode(next) {
    mode = next;
    $$('[data-canvas-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.canvasMode === mode)));
    $('.live-label').lastChild.textContent = mode === 'edit' ? ' EDIT CANVAS' : ' LIVE PREVIEW';
    $('.canvas-intro .handwritten').textContent = mode === 'edit' ? 'Click to select. Drag to move. Double-click to write.' : 'Test buttons, card opening, and forms. Preview forms do not send messages.';
    api.renderPreview();
  }
  $('#element-inspector').addEventListener('input', event => {
    const input = event.target;
    if (input.dataset.layout) {
      const key = input.dataset.layout;
      let value = input.type === 'number' ? input.valueAsNumber : input.value;
      if (input.type === 'number' && !Number.isFinite(value)) return;
      if (['x', 'y', 'width', 'height'].includes(key)) value /= 6;
      patchLayout({ [key]: value }, `layout-${selectedId}-${key}`);
    }
    if (input.id === 'element-content') {
      if (element()) patchElement({ text: input.value }, `text-${selectedId}`);
      else { api.update({ ...api.getProject(), [textFields[selectedId]]: input.value }, `text-${selectedId}`); api.fillControls(); }
    }
    if (input.id === 'element-alt') patchElement({ alt: input.value }, `alt-${selectedId}`);
    if (input.id === 'element-decorative') patchElement({ decorative: input.checked });
    if (input.id === 'element-flow') { const p=api.getProject(),layout={...style()}; if(input.checked)for(const key of ['x','y','width','height'])delete layout[key];else Object.assign(layout,{x:15,y:45,width:70}); api.update({...p,layouts:{...p.layouts,[selectedId]:layout},elements:p.elements.map(el=>el.id===selectedId?{...el,flow:input.checked}:el)}); }
    if (input.id === 'element-url') patchElement({ url: input.value }, `url-${selectedId}`);
    if (input.id === 'element-reveal') patchElement({ revealText: input.value }, `reveal-${selectedId}`);
    if (input.id === 'element-action') { patchElement({ action: input.value, url: '' }); input.blur(); renderInspector(); }
  });
  for (const [selector, key] of [['#snap-toggle', 'snap'], ['#grid-toggle', 'grid']]) $(selector).addEventListener('change', event => {
    const p = api.getProject(); api.update({ ...p, canvas: { ...p.canvas, [key]: event.target.checked } }, '', { skipPreview: true });
  });
  $('#canvas-zoom').addEventListener('change', event => { $('#preview-shell').style.zoom = event.target.value; });
  function openCode(tab) {
    codeTab = tab;
    const item = element(); const needsBlock = ['html', 'block'].includes(tab);
    $$('[data-code-tab]').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.codeTab === tab)); b.tabIndex = b.dataset.codeTab === tab ? 0 : -1; b.id = `code-tab-${b.dataset.codeTab}`; b.setAttribute('aria-controls', 'code-panel'); });
    $('#code-panel').setAttribute('aria-labelledby', `code-tab-${tab}`);
    const descriptions = { page: 'Style anything on your page. Use .invitation, h1, .message, .countdown, or your own selectors.', html: 'Build an HTML element. Native interactions like details/summary and links work in Interact mode.', block: 'CSS for the selected HTML element. It stays with that element when you move or export it.', export: 'Your complete, self-contained page. Download HTML to take it with you.' };
    $('#code-description').textContent = needsBlock && item?.type !== 'html' ? 'Add or select an HTML element on the canvas to edit its source.' : descriptions[tab];
    $('#code-source').value = tab === 'page' ? api.getProject().customCSS : tab === 'export' ? api.getHTML() : item?.type === 'html' ? item[tab === 'html' ? 'html' : 'css'] : '';
    $('#code-source').readOnly = tab === 'export' || (needsBlock && item?.type !== 'html');
    $('#reset-page-css').hidden = tab !== 'page';
    $('#code-status').textContent = tab === 'export' ? 'This is the HTML your guests will see.' : 'Changes appear live in your canvas.';
    if (!$('#code-dialog').open) $('#code-dialog').showModal();
  }
  $('#code-source').addEventListener('input', event => {
    if (codeTab === 'page') api.update({ ...api.getProject(), customCSS: event.target.value.slice(0, 50000) }, 'page-css');
    else if (['html', 'block'].includes(codeTab) && element()?.type === 'html') patchElement({ [codeTab === 'html' ? 'html' : 'css']: event.target.value.slice(0, codeTab === 'html' ? 50000 : 30000) }, `code-${selectedId}-${codeTab}`);
  });
  $('#code-source').addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === ']' && !event.target.readOnly) { event.preventDefault(); const input = event.target; const start = input.selectionStart; input.setRangeText('  ', start, input.selectionEnd, 'end'); input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  $('#element-photo-upload').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = ''; const id = pendingPhoto;
    if (!file || !id) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 4 * 1024 * 1024) return api.toast('Choose a JPG, PNG, WebP, or GIF smaller than 4 MB.', true);
    try {
      const image = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
      await new Promise((resolve, reject) => { const img = new Image(); img.onload = resolve; img.onerror = reject; img.src = image; });
      const p = api.getProject(); api.update({ ...p, elements: p.elements.map(el => el.id === id ? { ...el, image, alt: '' } : el) });
    } catch { api.toast('This photo couldn’t be opened. Try another image.', true); }
  });
  // Page dimensions are independent of the selected element.
  $('#panel-style').insertAdjacentHTML('beforeend', '<div class="field-group"><h3 class="inspector-section-label">YOUR ARTBOARD</h3><div class="field-pair"><label class="field">Page width<input id="page-width" type="number" min="320" max="1200" step="10"></label><label class="field">Min. height<input id="page-height" type="number" min="0" max="4000" step="20"></label></div><label class="field">Paper color<input id="page-background" type="color"></label><button class="text-button" id="page-background-reset" type="button">Use palette color</button></div>');
  $('#page-width').value = api.getProject().canvas.width; $('#page-height').value = api.getProject().canvas.minHeight;
  $('#page-background').value = api.getProject().canvas.background || PALETTES[api.getProject().palette].paper;
  for (const [selector, key] of [['#page-width', 'width'], ['#page-height', 'minHeight'], ['#page-background', 'background']]) $(selector).addEventListener('input', event => {
    const value = event.target.type === 'number' ? event.target.valueAsNumber : event.target.value;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    const p = api.getProject(); api.update({ ...p, canvas: { ...p.canvas, [key]: value } }, `canvas-${key}`);
  });
  $('#page-background-reset').addEventListener('click', () => { const p = api.getProject(); api.update({ ...p, canvas: { ...p.canvas, background: '' } }); $('#page-background').value = PALETTES[p.palette].paper; });
  $('.canvas-toolbar').insertAdjacentHTML('afterend', '<div class="surface-toolbar"><div role="group" aria-label="Card panel"><button type="button" data-surface-view="cover" aria-pressed="false">Cover</button><button type="button" data-surface-view="content" aria-pressed="true">Inside</button><button type="button" data-surface-view="back" aria-pressed="false">Back panel</button></div><div id="surface-options" hidden><label class="check-field"><input type="checkbox" data-project-field="opening">Include opening cover</label><label class="field">Opening style<select data-project-field="openingStyle"><option value="reveal">Reveal</option><option value="fold">Fold-out with back panel</option></select></label></div><button type="button" id="reset-template-layout" title="Reset template positions without changing text or actions">Reset template layout</button></div>');
  $('.creation-toolbar').insertAdjacentHTML('beforeend', `<label class="quick-actions">Add event button<select id="add-event-button"><option value="">Choose action…</option>${Object.entries(BUTTON_ACTIONS).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>`);
  $('#add-event-button').addEventListener('change',event=>{const action=event.target.value;if(!action)return; const labels={rsvp:'RSVP',calendar:'Add to calendar',map:'Open map',menu:'View menu',games:'Play games','close-card':'Close card','toggle-rain':'Toggle photo rain','calendar-download':'Download event'};add('button',{...createElement('button',''),action,text:labels[action]||BUTTON_ACTIONS[action],flow:true});event.target.value='';});
  cardSettings = initCardSettings({ ...api, setSurface, getSurface:()=>surface });
  studio = initAccessibleStudio({ ...api, select, getSelectedId: () => selectedId, name, showContent: () => document.querySelector('[data-tab=write]').click() });
  $('.code-tabs').addEventListener('keydown', event => {
    const tabs = $$('[data-code-tab]');
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); let i = tabs.indexOf(document.activeElement);
    i = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
    openCode(tabs[i].dataset.codeTab); tabs[i].focus();
  });
  openCodeSetup();
  function openCodeSetup() { $$('[data-code-tab]').forEach((b, i) => { b.tabIndex = i ? -1 : 0; b.id = `code-tab-${b.dataset.codeTab}`; b.setAttribute('aria-controls', 'code-panel'); }); }
  refresh();
  return { refresh, sync, setSurface, previewOptions: () => ({ editing: mode === 'edit', selectedId, scrollY, surface }) };
}

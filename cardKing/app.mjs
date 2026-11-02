import { replaceContent } from './dom.mjs';
import { STORAGE_KEY, PALETTES, STICKERS, BLOCKS, TEMPLATE_INFO, createTemplate, normalizeProject, parseProject, fileSlug } from './project.mjs';
import { generateHTML } from './render.mjs';
import { initCanvasEditor } from './editor-controls.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const bus = new globalThis.CardKingEngine.EventBus();
let project = createTemplate();
let assets;
let history = [];
let future = [];
let lastGroup = '';
let lastInput = 0;
let renderTimer;
let saveTimer;
let toastTimer;
let pendingTemplate;
let storageWarning = false;
let previewBlob;
let canvasEditor;

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').dataset.error = String(error);
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => $('#toast').hidden = true, error ? 6500 : 4000);
}
function setSaveStatus(message, error = false) {
  const indicator = document.createElement('span');
  indicator.style.background = error ? '#b56e52' : '';
  $('#save-status').replaceChildren(indicator, document.createTextNode(message));
}
function persist() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    setSaveStatus('Saved in this browser');
    storageWarning = false;
  } catch {
    setSaveStatus('Use Save project for a backup', true);
    if (!storageWarning) toast('This browser couldn’t save the draft. Use Save project to keep a copy.', true);
    storageWarning = true;
  }
}
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) project = parseProject(saved);
} catch {
  toast('Your saved draft couldn’t be opened. A fresh page is ready; you can open a project backup.', true);
}

function update(next, group = '', options = {}) {
  if (JSON.stringify(next) === JSON.stringify(project)) return;
  const now = Date.now();
  if (!group || group !== lastGroup || now - lastInput > 800) {
    history.push(structuredClone(project));
    if (history.length > 35) history.shift();
  }
  lastGroup = group; lastInput = now;
  future = [];
  project = next;
  bus.emit('project:changed', project, options);
}
function renderPreview() {
  if (!assets) return;
  $('#preview').srcdoc = generateHTML(project, assets, { preview: true, ...canvasEditor?.previewOptions() });
  $('#preview-address').textContent = `${fileSlug(project.name)}.html`;
}
function renderTemplates() {
  replaceContent($('#templates'), TEMPLATE_INFO.map(t => {
    const palette = PALETTES[t.color];
    return `<button type="button" class="template-choice" data-template="${t.id}" aria-pressed="${project.template === t.id}" aria-label="${t.name} template"><span class="template-thumb" style="--thumb-paper:${palette.paper};--thumb-ink:${palette.ink};--thumb-accent:${palette.accent}"><strong aria-hidden="true">${STICKERS[t.sticker]}</strong><span>${t.label}</span><i aria-hidden="true">✦</i></span><span class="template-name">${t.name}</span></button>`;
  }).join(''));
}
function renderPalettes() {
  replaceContent($('#palettes'), Object.entries(PALETTES).map(([key, palette]) => `<button type="button" class="palette-choice" data-palette="${key}" aria-pressed="${project.palette === key}"><span class="palette-colors" aria-hidden="true">${[palette.paper, palette.ink, palette.accent, palette.soft].map(color => `<i style="--swatch:${color}"></i>`).join('')}</span><span>${palette.name}</span><span class="palette-check" aria-hidden="true">${project.palette === key ? '✓' : ''}</span></button>`).join(''));
}
function renderBlocks() {
  const icons = { message: '≋', image: '▧', details: '☷', action: '↗' };
  replaceContent($('#block-list'), project.blocks.map((block, index) => `<div class="block-row${!block.enabled ? ' is-disabled' : ''}" data-block="${block.type}"><span class="block-icon" aria-hidden="true">${icons[block.type]}</span><span class="block-name">${BLOCKS[block.type]}</span><span class="block-move"><button type="button" data-move="-1" aria-label="Move ${BLOCKS[block.type]} up" ${index === 0 ? 'disabled' : ''}>⌃</button><button type="button" data-move="1" aria-label="Move ${BLOCKS[block.type]} down" ${index === project.blocks.length - 1 ? 'disabled' : ''}>⌄</button></span><input type="checkbox" role="switch" data-toggle-block="${block.type}" aria-label="Show ${BLOCKS[block.type]}" ${block.enabled ? 'checked' : ''}></div>`).join(''));
  const count = project.blocks.filter(b => b.enabled).length;
  $('#outline-count').textContent = `${count} block${count === 1 ? '' : 's'}`;
}
function renderSelections() {
  $$('[data-template]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.template === project.template)));
  renderPalettes();
  $$('[data-font]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.font === project.font)));
  $$('[data-sticker]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sticker === project.sticker)));
  $('#accent-label').textContent = project.accent;
  $('#photo-label').textContent = project.image ? 'Replace your photo' : 'Pick a photo to remember';
  $('#remove-photo').hidden = !project.image;
  $('#undo').disabled = !history.length;
  $('#redo').disabled = !future.length;
}
function fillControls() {
  $$('[data-field]').forEach(control => {
    const value = project[control.dataset.field];
    if (control.type === 'checkbox') control.checked = value;
    else {
      if (control.dataset.field === 'timezone' && ![...control.options].some(option => option.value === value)) control.add(new Option(value, value));
      control.value = value ?? '';
    }
  });
}
function restore(next) {
  project = structuredClone(next);
  lastGroup = '';
  fillControls();
  bus.emit('project:changed', project);
}
bus.on('project:changed', (_, envelope) => {
  setSaveStatus('Saving…');
  renderSelections();
  renderBlocks();
  canvasEditor?.refresh();
  clearTimeout(renderTimer);
  if (envelope.metadata.skipPreview) canvasEditor?.sync();
  else renderTimer = setTimeout(renderPreview, 240);
  clearTimeout(saveTimer); saveTimer = setTimeout(persist, 500);
});

renderTemplates();
$('#stickers').innerHTML = Object.entries(STICKERS).map(([key, sticker]) => `<button class="sticker-choice" type="button" data-sticker="${key}" aria-label="${key === 'none' ? 'No sticker' : `${key} sticker`}" aria-pressed="false">${sticker || 'None'}</button>`).join('');
fillControls(); renderSelections(); renderBlocks();
canvasEditor = initCanvasEditor({ getProject: () => project, update, fillControls, renderPreview, toast, getHTML: () => assets ? generateHTML(project, assets) : '', undo: () => $('#undo').click(), redo: () => $('#redo').click(), save: saveProject });

document.addEventListener('input', event => {
  const control = event.target.closest('[data-field]');
  if (!control) return;
  const key = control.dataset.field;
  if (control.checkValidity()) { control.removeAttribute('aria-invalid'); control.removeAttribute('aria-describedby'); control.parentElement.querySelector('.field-error')?.remove(); }
  const value = control.type === 'checkbox' ? control.checked : control.type === 'number' ? control.valueAsNumber : control.value;
  if (typeof value === 'number' && !Number.isFinite(value)) return;
  update({ ...project, [key]: value }, key);
});
$('#editor-form').addEventListener('submit', event => event.preventDefault());
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.template) {
    if (button.dataset.template === project.template) return;
    pendingTemplate = button.dataset.template;
    $('#template-dialog').showModal();
  }
  if (button.dataset.palette) {
    update({ ...project, palette: button.dataset.palette, accent: PALETTES[button.dataset.palette].accent });
    fillControls();
  }
  if (button.dataset.font) update({ ...project, font: button.dataset.font });
  if (button.dataset.sticker) update({ ...project, sticker: button.dataset.sticker, graphic: null });
  if (button.dataset.tab) selectTab(button.dataset.tab);
  if (button.dataset.device) {
    $$('[data-device]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('#preview-shell').classList.toggle('is-mobile', button.dataset.device === 'mobile');
  }
  if (button.dataset.close) document.getElementById(button.dataset.close).close();
  if (button.dataset.move) {
    const row = button.closest('[data-block]');
    const index = project.blocks.findIndex(block => block.type === row.dataset.block);
    const destination = index + Number(button.dataset.move);
    if (destination < 0 || destination >= project.blocks.length) return;
    const blocks = structuredClone(project.blocks);
    [blocks[index], blocks[destination]] = [blocks[destination], blocks[index]];
    update({ ...project, blocks });
    $(`[data-block="${row.dataset.block}"] [data-move="${button.dataset.move}"]`)?.focus();
  }
});
$('#block-list').addEventListener('change', event => {
  const type = event.target.dataset.toggleBlock;
  if (!type) return;
  const checked = event.target.checked;
  update({ ...project, blocks: project.blocks.map(block => block.type === type ? { ...block, enabled: checked } : block) });
  $(`[data-toggle-block="${type}"]`)?.focus();
  if (type === 'image' && checked && !project.image) toast('Add a photo in Write → Add a photo to fill this block.');
  if (type === 'action' && checked && !project.buttonUrl && !project.rsvpEmail) toast('Add a website link or RSVP email in Write to show the button.');
});
$('#confirm-template').addEventListener('click', async () => {
  const next = createTemplate(pendingTemplate);
  $('#confirm-template').disabled = true;
  try {
    if (pendingTemplate === 'birthday-site') {
      await Promise.all([['coverImage','tuxedo-trex.png'],['rainImage','david-rain.png'],['confettiImage','drinks-sprite-sheet.png']].map(async ([key,file]) => {
        const response = await fetch(new URL(`../cards/brithday/${file}`, import.meta.url));
        if (!response.ok) throw new Error('Birthday image unavailable');
        const blob = await response.blob(), url = URL.createObjectURL(blob);
        try {
          const image = await new Promise((resolve,reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url; });
          // Keep sprite coordinates intact; resize only the cover and rain image.
          const scale = key === 'confettiImage' ? 1 : Math.min(1, (key === 'rainImage' ? 640 : 1024) / Math.max(image.naturalWidth,image.naturalHeight));
          const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth*scale); canvas.height = Math.round(image.naturalHeight*scale);
          canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
          next[key] = canvas.toDataURL('image/webp',.9);
        } finally { URL.revokeObjectURL(url); }
      }));
    }
    update(next); fillControls(); canvasEditor?.setSurface(next.opening ? 'cover' : 'content');
    $('.template-picker').open = false; $('#tab-write').click();
    $('#template-dialog').close(); $('#tab-write').focus({ preventScroll: true }); toast('Template applied. Use Undo to restore the previous card.');
  } catch { toast('The birthday assets could not be loaded. Keep the cards/brithday folder available and try again.', true); }
  finally { $('#confirm-template').disabled = false; }
});
function selectTab(tab) {
  $$('[data-tab]').forEach(button => {
    const selected = button.dataset.tab === tab;
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    $(`#panel-${button.dataset.tab}`).hidden = !selected;
  });
}
$('.editor-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = $$('[data-tab]'); const current = tabs.indexOf(document.activeElement);
  let next = (current + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  selectTab(tabs[next].dataset.tab); tabs[next].focus();
});
$('#undo').addEventListener('click', () => {
  if (!history.length) return;
  future.push(structuredClone(project)); restore(history.pop());
});
$('#redo').addEventListener('click', () => {
  if (!future.length) return;
  history.push(structuredClone(project)); restore(future.pop());
});
document.addEventListener('keydown', event => {
  if (!event.ctrlKey && !event.metaKey) return;
  if (event.key.toLowerCase() === 's') { event.preventDefault(); saveProject(); }
  if (event.key.toLowerCase() === 'z' && !event.target.closest('input,textarea,select,[contenteditable]')) {
    event.preventDefault(); $(event.shiftKey ? '#redo' : '#undo').click();
  }
});

function download(contents, mime, filename) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function saveProject() {
  download(JSON.stringify(normalizeProject(project), null, 2), 'application/json', `${fileSlug(project.name)}.cardking.json`);
  toast('Project backup downloaded.');
}
function validate() {
  for (const key of ['rsvpEmail', 'buttonUrl', 'date', 'time']) {
    const control = $(`[data-field="${key}"]`);
    if (!control.checkValidity()) {
      selectTab('write'); control.closest('details')?.setAttribute('open', ''); control.setAttribute('aria-invalid', 'true');
      let error = control.parentElement.querySelector('.field-error');
      if (!error) { error = document.createElement('span'); error.className = 'field-error'; error.id = `error-${key}`; control.parentElement.append(error); }
      error.textContent = control.validationMessage; control.setAttribute('aria-describedby', error.id);
      control.reportValidity(); return false;
    }
  }
  if (project.buttonUrl && !normalizeProject(project).buttonUrl) {
    toast('Use a full http, https, mailto, or tel link for your button.', true); return false;
  }
  return true;
}
$('#save-project').addEventListener('click', saveProject);
$('#download-html').addEventListener('click', () => {
  if (!assets || !validate()) return;
  download(generateHTML(project, assets), 'text/html;charset=utf-8', `${fileSlug(project.name)}.html`);
  toast('Your page is ready. Host the HTML file, then share its link.');
  persist();
});
$('#open-preview').addEventListener('click', () => {
  if (!assets || !validate()) return;
  if (previewBlob) URL.revokeObjectURL(previewBlob);
  previewBlob = URL.createObjectURL(new Blob([generateHTML(project, assets, { preview: true })], { type: 'text/html' }));
  window.open(previewBlob, '_blank', 'noopener,noreferrer');
});
$('#test-confetti').addEventListener('click', () => {
  if (project.effect === 'none') { toast('Pick confetti or stardust first.'); return; }
  $('#preview').contentWindow.postMessage({ type: 'cardking:celebrate' }, '*');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) toast('Celebrations are paused by your reduced motion setting.');
});
$('#open-help').addEventListener('click', () => $('#help-dialog').showModal());
$('#export-guide')?.addEventListener('click', () => $('#help-dialog').showModal());
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));

$('#photo-upload').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return toast('Choose a JPG, PNG, WebP, or GIF photo.', true);
  if (file.size > 4 * 1024 * 1024) return toast('Choose a photo smaller than 4 MB.', true);
  try {
    const image = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
    });
    // Verify that the browser can decode the photo before adding it to the project.
    await new Promise((resolve, reject) => { const img = new Image(); img.onload = resolve; img.onerror = reject; img.src = image; });
    update({ ...project, image, imageAlt: project.imageAlt || '', blocks: project.blocks.map(block => block.type === 'image' ? { ...block, enabled: true } : block) });
    fillControls(); toast('Photo added.');
  } catch { toast('This photo couldn’t be opened. Try another image.', true); }
});
$('#remove-photo').addEventListener('click', () => {
  update({ ...project, image: '', imageAlt: '', blocks: project.blocks.map(block => block.type === 'image' ? { ...block, enabled: false } : block) }); fillControls();
});
$('#import-project').addEventListener('click', () => $('#project-upload').click());
$('#project-upload').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  if (file.size > 32 * 1024 * 1024) return toast('This file is too large. Choose a Card King file smaller than 32 MB.', true);
  try {
    const imported = parseProject(await file.text());
    update(imported); fillControls();
    toast('Project opened.');
  } catch (error) { toast(error.message, true); }
});
$('#preview').addEventListener('load', () => { if (assets) $('#loading-preview').hidden = true; });
addEventListener('pagehide', () => { persist(); if (previewBlob) URL.revokeObjectURL(previewBlob); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });

try {
  const [css, engine] = await Promise.all(['page.css', 'vendor/koz-engine.js'].map(async path => {
    const response = await fetch(new URL(path, import.meta.url));
    if (!response.ok) throw new Error(`Couldn’t load ${path}`);
    return response.text();
  }));
  assets = { css, engine };
  renderPreview(); persist();
  $('#download-html').disabled = false;
} catch (error) {
  $('#loading-preview').textContent = 'The editor couldn’t load its page assets. Reload to try again.';
  setSaveStatus('Preview unavailable', true);
  toast(`${error.message}. Serve this folder over HTTP and reload.`, true);
}

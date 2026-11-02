// Runs only inside the editing canvas. Exported pages do not include this code.
export function canvasRuntime(settings) {
  'use strict';
  let project = JSON.parse(document.getElementById('cardking-project').textContent);
  let selected = null;
  let drag = null;
  let editingText = null;
  const card = document.querySelector('#page-content');
  const send = (action, payload = {}) => parent.postMessage({ type: 'cardking:canvas', action, ...payload }, '*');
  const css = document.createElement('style');
  css.textContent = `
    .ck-editing [data-ck-id]{position:relative;cursor:move;touch-action:none;user-select:none}
    .ck-editing [data-ck-id]:hover{outline:1px dashed #839fff;outline-offset:4px}
    .ck-editing [contenteditable="plaintext-only"]{cursor:text!important;user-select:text!important;outline:2px solid #1d4ed8!important;outline-offset:4px;min-height:1em}
    .ck-editing .element-html iframe,.ck-editing [data-ck-id] img{pointer-events:none}
    .ck-editing .page-decoration{overflow:visible}
    .ck-editing .page-decoration [data-ck-id]{position:absolute;pointer-events:auto}
    .ck-editing [data-ck-id]{animation-play-state:paused!important}
    .ck-editing .custom-element{position:absolute}
    .ck-editing .flow-element{position:relative}
    .ck-grid #page-content{background-image:linear-gradient(#668cff12 1px,transparent 1px),linear-gradient(90deg,#668cff12 1px,transparent 1px);background-size:16px 16px}
    #ck-selection{position:fixed;z-index:2147483645;pointer-events:none;border:1.5px solid #1d4ed8;box-sizing:border-box;display:none;color:#fff;font:14px Arial;text-align:left;rotate:0deg}
    #ck-selection button{font:14px Arial;pointer-events:auto;cursor:pointer;box-sizing:border-box}
    .ck-handle{position:absolute;width:24px;height:24px;min-width:24px;min-height:24px;padding:0;border:1.5px solid #1d4ed8;background:white;border-radius:1px}
    [data-handle=nw]{left:-12px;top:-12px;cursor:nwse-resize!important}[data-handle=ne]{right:-12px;top:-12px;cursor:nesw-resize!important}
    [data-handle=sw]{left:-12px;bottom:-12px;cursor:nesw-resize!important}[data-handle=se]{right:-12px;bottom:-12px;cursor:nwse-resize!important}
    [data-handle=rotate]{left:calc(50% - 12px);top:-40px;border-radius:50%;width:24px;height:24px;background:#1d4ed8;border:2px solid white;box-shadow:0 0 0 1px #1d4ed8;cursor:grab!important}
    .ck-selection-label{position:absolute;left:-1px;top:-56px;display:flex;gap:1px;align-items:center;white-space:nowrap;pointer-events:auto;background:#1d4ed8;border-radius:4px 4px 0 0;padding:3px 5px;max-width:300px}
    .ck-selection-label span{padding:1px 5px;max-width:170px;overflow:hidden;text-overflow:ellipsis}
    .ck-selection-label button{background:transparent;color:white;border:0;padding:1px 5px;font-size:20px;min-width:44px;min-height:44px}
    #ck-selection.ck-locked .ck-handle{display:none}
    .ck-guide{position:fixed;display:none;pointer-events:none;z-index:2147483644;background:#e668bb}
    #ck-guide-v{top:0;bottom:0;width:1px}#ck-guide-h{left:0;right:0;height:1px}
    .ck-editing .invitation-header{z-index:auto}
  `;
  document.head.append(css);
  const liveStyles = document.createElement('style'); document.head.append(liveStyles);
  const overlay = document.createElement('div'); overlay.id = 'ck-selection'; overlay.setAttribute('aria-label', 'Selected element controls');
  overlay.innerHTML = '<div class="ck-selection-label"><span id="ck-selection-name"></span><button data-command="duplicate" aria-label="Duplicate selected element" title="Duplicate">⧉</button><button data-command="delete" aria-label="Delete selected element" title="Delete">×</button></div><button class="ck-handle" data-handle="nw" aria-label="Resize top left"></button><button class="ck-handle" data-handle="ne" aria-label="Resize top right"></button><button class="ck-handle" data-handle="sw" aria-label="Resize bottom left"></button><button class="ck-handle" data-handle="se" aria-label="Resize bottom right"></button><button class="ck-handle" data-handle="rotate" aria-label="Rotate element"></button>';
  document.body.append(overlay);
  const guideV = document.createElement('div'); guideV.className = 'ck-guide'; guideV.id = 'ck-guide-v';
  const guideH = document.createElement('div'); guideH.className = 'ck-guide'; guideH.id = 'ck-guide-h';
  document.body.append(guideV, guideH);
  const unit = () => {
    const style = getComputedStyle(card);
    return (card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) / 100;
  };
  const name = id => settings.names?.[id] || ({ heading: 'Headline', eyebrow: 'Introduction', sticker: 'Hero sticker', message: 'Message', sender: 'Signature', countdown: 'Countdown', details: 'Event details', photo: 'Photo', action: 'RSVP button', divider: 'Divider', footer: 'Footer', 'decor-star': 'Big star', 'decor-sparkle': 'Small star', 'decor-dot-one': 'Gold dot', 'decor-dot-two': 'Accent dot', 'decor-squiggle': 'Squiggle' }[id] || project.elements.find(el => el.id === id)?.type || 'Element');
  const currentLayout = () => project.layouts[selected?.dataset.ckId] || {};
  function positionOverlay() {
    if (!selected || !selected.isConnected || getComputedStyle(selected).display === 'none') { overlay.style.display = 'none'; return; }
    const rect = selected.getBoundingClientRect();
    Object.assign(overlay.style, { display: 'block', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    overlay.classList.toggle('ck-locked', currentLayout().locked === true);
  }
  function select(id, notify = true, scroll = false) {
    selected = id ? document.querySelector(`[data-ck-id="${id}"]`) : null;
    if (selected && scroll) selected.scrollIntoView({ block: 'center', behavior: 'instant' });
    document.querySelector('#ck-selection-name').textContent = selected ? `${name(id)}${currentLayout().locked ? ' · locked' : ''}` : '';
    positionOverlay();
    if (notify) send('select', { id: selected?.dataset.ckId || '', metrics: selected ? { width: selected.offsetWidth / unit(), height: selected.offsetHeight / unit(), fontSize: parseFloat(getComputedStyle(selected).fontSize), unit: unit() } : null });
  }
  function commitStyle(patch) {
    if (!selected) return;
    const id = selected.dataset.ckId;
    project.layouts[id] = { ...currentLayout(), ...patch };
    send('layout', { id, patch });
  }
  function begin(event, handle = 'move') {
    if (!selected || currentLayout().locked || event.button !== 0) return;
    event.preventDefault();
    selected.tabIndex = -1; selected.focus({ preventScroll: true });
    const rect = selected.getBoundingClientRect();
    drag = { handle, clientX: event.clientX, clientY: event.clientY, scrollY, layout: { ...currentLayout() }, width: selected.offsetWidth / unit(), height: selected.offsetHeight / unit(), fontSize: parseFloat(getComputedStyle(selected).fontSize) * 6 / unit(), centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, unit: unit(), changed: false };
    drag.angle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX) * 180 / Math.PI;
    selected.setPointerCapture(event.pointerId);
  }
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('#ck-selection')) return;
    if (event.target.closest('[contenteditable]')) return;
    const element = event.target.closest('[data-ck-id]');
    select(element?.dataset.ckId || '');
    if (element) begin(event);
  });
  overlay.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-handle]');
    if (handle) { event.stopPropagation(); begin(event, handle.dataset.handle); }
  });
  overlay.addEventListener('click', event => {
    const command = event.target.closest('[data-command]')?.dataset.command;
    if (command && selected) send('command', { command, id: selected.dataset.ckId });
  });
  document.addEventListener('pointermove', event => {
    if (!drag || !selected) return;
    let dx = (event.clientX - drag.clientX) / drag.unit;
    let dy = (event.clientY - drag.clientY + scrollY - drag.scrollY) / drag.unit;
    if (Math.abs(dx) + Math.abs(dy) < .7 && !drag.changed) return;
    drag.changed = true;
    const snap = value => project.canvas.snap && !event.altKey ? Math.round(value / (8 / drag.unit)) * (8 / drag.unit) : value;
    const patch = {};
    if (drag.handle === 'move') {
      if (event.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      patch.x = snap((drag.layout.x || 0) + dx); patch.y = snap((drag.layout.y || 0) + dy);
      const cardRect = card.getBoundingClientRect();
      if (Math.abs(drag.centerX + dx * drag.unit - (cardRect.left + cardRect.width / 2)) < 5) {
        patch.x = (drag.layout.x || 0) + (cardRect.left + cardRect.width / 2 - drag.centerX) / drag.unit;
        guideV.style.left = `${cardRect.left + cardRect.width / 2}px`; guideV.style.display = 'block';
      } else guideV.style.display = 'none';
      if (Math.abs(drag.centerY + dy * drag.unit - (cardRect.top + cardRect.height / 2)) < 5) {
        guideH.style.top = `${cardRect.top + cardRect.height / 2}px`; guideH.style.display = 'block';
      } else guideH.style.display = 'none';
    } else if (drag.handle === 'rotate') {
      const angle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX) * 180 / Math.PI;
      patch.rotation = (drag.layout.rotation || 0) + angle - drag.angle;
      if (event.shiftKey) patch.rotation = Math.round(patch.rotation / 15) * 15;
    } else {
      const west = drag.handle.includes('w'); const north = drag.handle.includes('n');
      patch.width = Math.max(4, Math.min(240, snap(drag.width + (west ? -dx : dx))));
      if (west) patch.x = (drag.layout.x || 0) + drag.width - patch.width;
      const type = project.elements.find(el => el.id === selected.dataset.ckId)?.type;
      if (['shape', 'image', 'html'].includes(type) || selected.dataset.ckId === 'photo') {
        patch.height = Math.max(4, snap(drag.height + (north ? -dy : dy)));
        if (north) patch.y = (drag.layout.y || 0) + drag.height - patch.height;
      }
      if (event.shiftKey) patch.fontSize = Math.max(8, Math.min(240, (drag.layout.fontSize || drag.fontSize) * patch.width / drag.width));
    }
    drag.patch = patch;
    const style = { ...drag.layout, ...patch };
    selected.style.translate = `${style.x || 0}cqw ${style.y || 0}cqw`;
    if (patch.width !== undefined) { selected.style.width = `${patch.width}cqw`; selected.style.maxWidth = 'none'; }
    if (patch.height !== undefined) selected.style.height = `${patch.height}cqw`;
    if (patch.rotation !== undefined) selected.style.rotate = `${patch.rotation}deg`;
    if (patch.fontSize !== undefined) selected.style.fontSize = `clamp(8px,${patch.fontSize / 6}cqw,${patch.fontSize}px)`;
    positionOverlay();
  });
  function endDrag() {
    if (!drag) return;
    const patch = drag.patch;
    drag = null; guideV.style.display = guideH.style.display = 'none';
    if (patch) commitStyle(patch);
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('click', event => { if (event.target.closest('[data-ck-id]')) event.preventDefault(); }, true);
  document.addEventListener('dblclick', event => {
    const target = event.target.closest('[data-ck-field], [data-ck-element-text]') || document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-ck-field], [data-ck-element-text]');
    if (!target || currentLayout().locked) return;
    event.preventDefault(); editingText = { target, original: target.innerText };
    target.setAttribute('contenteditable', 'plaintext-only'); target.focus();
    const range = document.createRange(); range.selectNodeContents(target); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
  });
  document.addEventListener('focusout', event => {
    if (!editingText || event.target !== editingText.target) return;
    const { target } = editingText; editingText = null;
    target.removeAttribute('contenteditable');
    send('text', { id: target.closest('[data-ck-id]')?.dataset.ckId, field: target.dataset.ckField || '', text: target.innerText.slice(0, 6000) });
    positionOverlay();
  });
  document.addEventListener('keydown', event => {
    if (editingText) {
      if (event.key === 'Escape') { editingText.target.innerText = editingText.original; editingText.target.blur(); }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && ['z', 's', 'd'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      const command = event.key.toLowerCase() === 'z' ? event.shiftKey ? 'redo' : 'undo' : event.key.toLowerCase() === 'd' ? 'duplicate' : 'save';
      send('command', { command, id: selected?.dataset.ckId || '' }); return;
    }
    if (event.key === 'Escape') { select(''); return; }
    if (!selected) return;
    if (['Delete', 'Backspace'].includes(event.key)) { event.preventDefault(); send('command', { command: 'delete', id: selected.dataset.ckId }); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && !currentLayout().locked) {
      event.preventDefault();
      const amount = (event.shiftKey ? 10 : 1) / unit();
      commitStyle({ x: (currentLayout().x || 0) + (event.key === 'ArrowRight' ? amount : event.key === 'ArrowLeft' ? -amount : 0), y: (currentLayout().y || 0) + (event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0) });
    }
  });
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'cardking:editor') return;
    const message = event.data;
    if (message.action === 'select') select(message.id, true, true);
    if (message.action === 'sync') {
      project = message.project;
      liveStyles.textContent = message.css;
      document.body.classList.toggle('ck-grid', project.canvas.grid);
      if (!drag) document.querySelectorAll('[data-ck-id]').forEach(el => { for (const property of ['translate', 'width', 'height', 'max-width', 'rotate', 'font-size']) el.style.removeProperty(property); });
      document.querySelector('#ck-selection-name').textContent = selected ? `${name(selected.dataset.ckId)}${currentLayout().locked ? ' · locked' : ''}` : '';
      requestAnimationFrame(positionOverlay);
    }
  });
  let scrollFrame;
  addEventListener('scroll', () => {
    positionOverlay();
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { send('scroll', { y: scrollY }); scrollFrame = 0; });
  }, { passive: true });
  addEventListener('resize', positionOverlay);
  new ResizeObserver(positionOverlay).observe(card);
  document.body.classList.toggle('ck-grid', project.canvas.grid);
  requestAnimationFrame(() => { scrollTo(0, settings.scrollY || 0); select(settings.selectedId, false); send('ready'); });
}

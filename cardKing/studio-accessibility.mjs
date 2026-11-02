import { readingOrder, escapeHtml as e } from './project.mjs';
import { replaceContent } from './dom.mjs';

export function initAccessibleStudio(api) {
  const $ = s => document.querySelector(s);
  let issues = [];
  let timer;
  let view = innerWidth < 768 ? 'canvas' : 'content';
  let opener;
  $('.add-elements').id = 'add-elements-options';
  $('.creation-toolbar').dataset.expanded = 'false';
  $('.creation-toolbar').insertAdjacentHTML('afterbegin', '<button type="button" id="toggle-elements" aria-expanded="false" aria-controls="add-elements-options">＋ Add an element</button>');
  document.body.insertAdjacentHTML('afterbegin', '<nav class="skip-links" aria-label="Skip links"><a href="#studio-tools" data-workspace-link="content">Skip to content tools</a><a href="#studio-canvas" data-workspace-link="canvas">Skip to canvas</a><a href="#studio-properties" data-workspace-link="properties">Skip to properties</a></nav>');
  const main = $('.workspace');
  main.insertAdjacentHTML('beforebegin', '<nav class="workspace-navigation" aria-label="Workspace views"><button data-workspace-view="canvas" aria-pressed="true">Canvas</button><button data-workspace-view="content" aria-pressed="false">Content</button><button data-workspace-view="properties" aria-pressed="false">Properties</button></nav>');
  for (const [selector, id] of [['.editor-panel', 'studio-tools'], ['.canvas-panel', 'studio-canvas'], ['.outline-panel', 'studio-properties']]) { $(selector).id = id; $(selector).tabIndex = -1; }
  $('.header-actions').insertAdjacentHTML('afterbegin', '<button class="button button-outline" id="check-accessibility" type="button" aria-expanded="false" aria-controls="accessibility-review">Check accessibility</button>');
  $('.outline-panel').insertAdjacentHTML('afterbegin', '<section id="accessibility-review" hidden aria-labelledby="review-title"><div class="section-heading"><h2 id="review-title" tabindex="-1">Accessibility review</h2><button class="text-button" id="close-review">Close</button></div><p class="field-hint">Suggestions only. You can always keep creating and export your page.</p><div id="review-issues"></div></section>');
  $('.layers-section').insertAdjacentHTML('afterend', '<details class="reading-order" data-group="reading-order"><summary>Reading order</summary><p class="field-hint">Change the order read by assistive technology without moving your design.</p><div id="reading-order-list"></div></details>');
  document.body.insertAdjacentHTML('beforeend', '<div id="studio-announcement" class="sr-only" role="status" aria-atomic="true"></div>');
  document.querySelector('[data-field="imageAlt"]').parentElement.insertAdjacentHTML('afterend', '<label class="check-field"><input data-field="imageDecorative" type="checkbox">This photo is decorative</label>');
  document.querySelector('[data-field="imageDecorative"]').checked = api.getProject().imageDecorative;
  document.querySelectorAll('dialog').forEach((dialog, i) => {
    const heading = dialog.querySelector('h2'); heading.id ||= `dialog-title-${i}`; dialog.setAttribute('aria-labelledby', heading.id);
    dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  });
  function setView(next, focus = false) {
    view = next; main.dataset.view = next;
    document.querySelectorAll('[data-workspace-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.workspaceView === next)));
    if (focus) $(next === 'content' ? '#studio-tools' : next === 'properties' ? '#studio-properties' : '#studio-canvas').focus({ preventScroll: true });
  }
  function announce(text) { $('#studio-announcement').textContent = text; }
  function requestAudit() { $('#preview').contentWindow?.postMessage({ type: 'cardking:check' }, '*'); }
  function renderReview() {
    replaceContent($('#review-issues'), issues.length ? issues.map((issue, i) => `<article class="review-issue"><h3>${e(issue.title)}</h3><p>${e(issue.detail)}</p>${issue.id ? `<button type="button" data-review-element="${e(issue.id)}" data-issue="${i}">Select ${e(api.name(issue.id))}</button>` : ''}</article>`).join('') : '<p class="review-clear">No issues found by the supported checks. Review reading order and your final design manually as well.</p>');
    $('#check-accessibility').textContent = issues.length ? `Accessibility (${issues.length})` : 'Check accessibility';
  }
  function renderReadingOrder() {
    const order = readingOrder(api.getProject());
    replaceContent($('#reading-order-list'), order.map((id, i) => `<div class="reading-row"><button type="button" data-reading-select="${id}">${i + 1}. ${e(api.name(id))}</button><button type="button" data-reading-id="${id}" data-reading-move="-1" aria-label="Read ${e(api.name(id))} earlier"${i === 0 ? ' disabled' : ''}>↑</button><button type="button" data-reading-id="${id}" data-reading-move="1" aria-label="Read ${e(api.name(id))} later"${i === order.length - 1 ? ' disabled' : ''}>↓</button></div>`).join(''));
  }
  function refresh() { renderReadingOrder(); clearTimeout(timer); timer = setTimeout(requestAudit, 650); }
  document.addEventListener('click', event => {
    const b = event.target.closest('button,a'); if (!b) return;
    if (!b.closest('dialog')) opener = b;
    if (b.id === 'toggle-elements') {
      const expanded = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(expanded)); $('.creation-toolbar').dataset.expanded = String(expanded);
    }
    if (b.dataset.workspaceView) setView(b.dataset.workspaceView);
    if (b.dataset.workspaceLink) setView(b.dataset.workspaceLink);
    if (b.id === 'check-accessibility') {
      $('#accessibility-review').hidden = false; b.setAttribute('aria-expanded', 'true');
      setView('properties'); renderReview(); requestAudit(); $('#review-title').focus();
    }
    if (b.id === 'close-review') { $('#accessibility-review').hidden = true; $('#check-accessibility').setAttribute('aria-expanded', 'false'); $('#check-accessibility').focus(); }
    if (b.dataset.reviewElement || b.dataset.readingSelect) {
      const id = b.dataset.reviewElement || b.dataset.readingSelect;
      api.select(id); setView('properties');
      const issue = issues[Number(b.dataset.issue)];
      if (issue?.kind === 'image-alt' && id === 'photo') { setView('content'); api.showContent(); const input = $('[data-field="imageAlt"]'); input.closest('details').open = true; input.focus(); }
      else $('#studio-properties').focus({ preventScroll: true });
    }
    if (b.dataset.readingMove) {
      const p = api.getProject(), order = readingOrder(p), index = order.indexOf(b.dataset.readingId), next = index + Number(b.dataset.readingMove);
      if (next < 0 || next >= order.length) return;
      [order[index], order[next]] = [order[next], order[index]];
      api.update({ ...p, readingOrder: order });
      const restored = document.querySelector(`[data-reading-id="${b.dataset.readingId}"][data-reading-move="${b.dataset.readingMove}"]`);
      if (restored?.disabled) document.querySelector(`[data-reading-select="${b.dataset.readingId}"]`)?.focus({ preventScroll: true });
      announce(`${api.name(b.dataset.readingId)} is now item ${next + 1} in reading order.`);
    }
  }, true);
  addEventListener('message', event => {
    if (event.source !== $('#preview').contentWindow || event.data?.type !== 'cardking:report' || !Array.isArray(event.data.issues)) return;
    issues = event.data.issues.filter(i => typeof i.title === 'string' && typeof i.detail === 'string').slice(0, 300);
    renderReview();
  });
  $('#preview').addEventListener('load', () => setTimeout(requestAudit, 100));
  setView(view); refresh();
  return { refresh, announce, showProperties: () => { if (innerWidth < 768) setView('properties'); } };
}

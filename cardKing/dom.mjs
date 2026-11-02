export function replaceContent(root, html) {
  if (root.dataset.lastMarkup === html) return;
  const active = document.activeElement;
  const inside = root.contains(active);
  const key = inside ? active.id ? `#${CSS.escape(active.id)}` : [...active.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}="${CSS.escape(a.value)}"]`).join('') : '';
  const selection = inside && ['INPUT', 'TEXTAREA'].includes(active.tagName) ? [active.selectionStart, active.selectionEnd] : null;
  const scroll = [];
  for (let node = root; node; node = node.parentElement) scroll.push([node, node.scrollTop, node.scrollLeft]);
  const expanded = new Map([...root.querySelectorAll('details[data-group]')].map(el => [el.dataset.group, el.open]));
  root.innerHTML = html;
  root.dataset.lastMarkup = html;
  root.querySelectorAll('details[data-group]').forEach(el => { if (expanded.has(el.dataset.group)) el.open = expanded.get(el.dataset.group); });
  const target = key && root.querySelector(key);
  if (target) {
    target.focus({ preventScroll: true });
    if (selection && selection[0] !== null) try { target.setSelectionRange(...selection); } catch { /* Numeric fields have no caret API. */ }
  }
  scroll.forEach(([node, top, left]) => { node.scrollTop = top; node.scrollLeft = left; });
}

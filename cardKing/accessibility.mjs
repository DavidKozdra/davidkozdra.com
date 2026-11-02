export function contrastRatio(foreground, background) {
  const luminance = rgb => rgb.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
// Runs in the preview, using rendered styles rather than assuming palette colors.
export function auditDocument(ratio) {
  const issues = [];
  const p = JSON.parse(document.getElementById('cardking-project').textContent);
  const rgba = value => value.match(/[\d.]+/g)?.map(Number);
  for (const element of document.querySelectorAll('[data-ck-id]')) {
    const id = element.dataset.ckId;
    if (element.closest('[aria-hidden="true"]') || getComputedStyle(element).display === 'none') continue;
    const item = p.elements.find(item => item.id === id);
    if (item?.type === 'html') { issues.push({ id, title: 'Review custom HTML', detail: 'Check this block’s text alternatives, headings, reading order, keyboard access, and colors manually.', kind: 'manual' }); continue; }
    for (const img of element.matches('img') ? [element] : element.querySelectorAll('img')) {
      const decorative = id === 'photo' ? p.imageDecorative : id === 'cover-graphic' ? true : item?.decorative;
      if (!decorative && !img.getAttribute('alt')?.trim()) issues.push({ id, title: 'Describe this photo', detail: 'Add a description of the meaningful content, or mark the photo as decorative.', kind: 'image-alt' });
    }
    const candidates = [element, ...element.querySelectorAll('p,a,button,strong,small,figcaption,.detail-label')].filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !el.closest('[hidden],[aria-hidden="true"]'));
    let small = false, contrast = false, uncertain = false;
    for (const el of candidates) {
      const style = getComputedStyle(el);
      if (getComputedStyle(el).display === 'none') continue;
      const size = parseFloat(style.fontSize);
      if (size < 14) small = true;
      let bg = [0, 0, 0, 0], opacity = 1, complex = false;
      for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) {
        const computed = getComputedStyle(ancestor);
        opacity *= Number(computed.opacity);
        complex ||= computed.backgroundImage !== 'none';
        const c = rgba(computed.backgroundColor);
        if (!c) continue;
        const alpha = c[3] ?? 1;
        const nextAlpha = bg[3] + alpha * (1 - bg[3]);
        if (nextAlpha) bg = [0, 1, 2].map(i => (bg[i] * bg[3] + c[i] * alpha * (1 - bg[3])) / nextAlpha).concat(nextAlpha);
        if (bg[3] >= .999) break;
      }
      const fg = rgba(style.color);
      if (complex || opacity < .999 || bg[3] < .999 || !fg || (fg[3] ?? 1) < .999) { uncertain = true; continue; }
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      if (ratio(fg, bg) < (large ? 3 : 4.5)) contrast = true;
      if ((el.matches('a,button')) && /^(click here|here|link|go)$/i.test(el.textContent.trim())) issues.push({ id, title: 'Use a descriptive button or link label', detail: 'Describe the destination or action, such as “RSVP by email”.', kind: 'label' });
    }
    if (small) issues.push({ id, title: 'Text may be hard to read', detail: 'Consider increasing this text to at least 14 px; use 16 px for longer messages.', kind: 'text-size' });
    if (contrast) issues.push({ id, title: 'Increase text contrast', detail: 'Choose a darker text color or a lighter background (reverse this for dark cards). Aim for 4.5:1 for ordinary text.', kind: 'contrast' });
    if (uncertain) issues.push({ id, title: 'Review this text’s background', detail: 'Transparency or a complex background needs a manual contrast check.', kind: 'manual' });
  }
  if (p.customCSS.trim()) issues.push({ id: '', title: 'Review custom page CSS', detail: 'Check reading order, zoom, focus indicators, and contrast after your custom styles. Automated checks cannot certify the finished design.', kind: 'manual' });
  return issues;
}

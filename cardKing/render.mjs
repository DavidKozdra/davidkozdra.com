import { PALETTES, STICKERS, normalizeProject, escapeHtml as e, jsonForScript, eventTimestamp, fileSlug } from './project.mjs';
import { pageRuntime } from './page-runtime.mjs';

export function generateHTML(input, assets, { preview = false } = {}) {
  const p = normalizeProject(input);
  const colors = PALETTES[p.palette];
  const timestamp = eventTimestamp(p);
  const detailsEnabled = p.blocks.some(block => block.type === 'details' && block.enabled);
  const dateLabel = timestamp ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: p.timezone }).format(timestamp) : 'A date to look forward to';
  const timeLabel = timestamp ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: p.timezone }).format(timestamp) : '';
  const href = p.buttonUrl || (p.rsvpEmail ? `mailto:${p.rsvpEmail}?subject=${encodeURIComponent(`RSVP: ${p.heading.replace(/\n/g, ' ')}`)}&body=${encodeURIComponent('Hi! I’d love to join.\n\nMy name: \nNumber of guests: ')}` : '');
  const blocks = p.blocks.filter(block => block.enabled).map(block => {
    switch (block.type) {
      case 'message': return `<section class="message-block"><p class="message">${e(p.message)}</p>${p.sender ? `<p class="signature">${e(p.sender)}</p>` : ''}</section>`;
      case 'image': return p.image ? `<figure class="photo-block"><img src="${e(p.image)}" alt="${e(p.imageAlt)}">${p.imageAlt ? `<figcaption>${e(p.imageAlt)}</figcaption>` : ''}</figure>` : '';
      case 'details': return `<section class="details-block" aria-label="Event details"><div class="detail"><span class="detail-label">WHEN</span><p>${e(dateLabel)}${timeLabel ? `<small>${e(timeLabel)}</small>` : ''}</p></div><div class="detail"><span class="detail-label">WHERE</span><p>${e(p.location)}</p></div>${timestamp ? '<button id="add-calendar" class="calendar-link" type="button">＋ Add to my calendar</button>' : ''}</section>`;
      case 'action': return href ? `<section class="action-block"><a class="rsvp-button" href="${e(href)}" target="_blank" rel="noopener noreferrer">${e(p.buttonLabel || 'Count me in')} <span aria-hidden="true">↗</span></a>${!p.buttonUrl && p.rsvpEmail ? '<p class="action-hint">RSVP by email · Opens your mail app</p>' : ''}</section>` : '';
      default: return '';
    }
  }).join('\n');
  const sticker = STICKERS[p.sticker];
  const opening = p.opening ? `<button class="card-cover" id="card-cover" type="button" aria-label="Open your card"><span class="cover-border"><span class="cover-eyebrow">SOMETHING LOVELY, JUST FOR YOU</span><span class="cover-sticker" aria-hidden="true">${sticker || '✦'}</span><span class="cover-title">A little moment<br>of happy.</span><span class="cover-hint">Tap to open your card <span aria-hidden="true">↗</span></span></span></button>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="${colors.paper}"><meta name="description" content="${e(p.message.replace(/\n/g, ' ').slice(0, 180))}"><meta property="og:title" content="${e(p.heading.replace(/\n/g, ' '))}"><meta property="og:description" content="${e(p.message.slice(0, 180))}"><meta property="og:type" content="website"><title>${e(p.name || p.heading)}</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ctext y='.9em' font-size='56'%3E${encodeURIComponent(sticker || '✦')}%3C/text%3E%3C/svg%3E"><style>${assets.css}
:root{--paper:${colors.paper};--ink:${colors.ink};--accent:${p.accent};--soft:${colors.soft}}</style></head>
<body class="font-${p.font} theme-${p.palette}"><canvas id="confetti" aria-hidden="true"></canvas><main class="page-stage">${opening}<article class="invitation" id="page-content"${p.opening ? ' inert aria-hidden="true"' : ''}><div class="page-decoration" aria-hidden="true"><span class="decoration-star star-one">✷</span><span class="decoration-star star-two">✦</span><span class="decoration-dot dot-one"></span><span class="decoration-dot dot-two"></span><span class="decoration-squiggle">〰</span></div><header class="invitation-header"><p class="eyebrow">${e(p.eyebrow)}</p>${sticker ? `<div class="hero-sticker" aria-hidden="true">${sticker}</div>` : ''}<h1 tabindex="-1">${e(p.heading)}</h1><div class="little-divider" aria-hidden="true"><span></span>✦<span></span></div></header>${blocks}${p.countdown && timestamp && detailsEnabled ? '<p id="countdown" class="countdown" role="timer"></p>' : ''}<footer class="page-footer">${p.effect !== 'none' ? '<button id="celebrate" type="button">A little more happy <span aria-hidden="true">✧</span></button>' : '<span>Made for a moment worth sharing</span>'}<a href="https://davidkozdra.com/cardKing/" target="_blank" rel="noopener noreferrer" class="made-with">MADE WITH CARD KING ♛</a></footer></article></main>
<script type="application/json" id="cardking-project">${jsonForScript(p)}</script><script>${assets.engine.replace(/<\/script/gi, '<\\/script')}</script><script>(${pageRuntime.toString()})(${jsonForScript({ timestamp, slug: fileSlug(p.name), preview })});</script></body></html>`;
}

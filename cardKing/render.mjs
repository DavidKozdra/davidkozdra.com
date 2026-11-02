import { PALETTES, STICKERS, normalizeProject, escapeHtml as e, jsonForScript, eventTimestamp, fileSlug, readingOrder, BUILTIN_ELEMENTS } from './project.mjs';
import { pageRuntime } from './page-runtime.mjs';
import { canvasRuntime } from './canvas-runtime.mjs';
import { projectLayoutCSS } from './layout.mjs';
import { auditDocument, contrastRatio } from './accessibility.mjs';
import { actionURL, rsvpMarkup } from './actions.mjs';
const cssText = value => String(value).replace(/</g, '\\3c ');
const tagged = (id, field = '') => `data-ck-id="${id}"${field ? ` data-ck-field="${field}"` : ''}`;
export const countdownMarkup = (id = '') => `<div ${id ? `id="${id}" ${tagged(id)}` : ''} class="countdown" data-countdown role="timer" aria-live="off" aria-label="Time until the event">${['days','hours','minutes','seconds'].map(unit=>`<span class="countdown-unit"><strong data-count-unit="${unit}">00</strong><small>${unit}</small></span>`).join('')}</div>`;
function customElement(element, project) {
  const attrs=`${tagged(element.id)} class="custom-element element-${element.type}${element.flow?' flow-element':''}"`;
  switch(element.type){
    case 'text': case 'sticker':return `<div ${attrs} data-ck-element-text>${e(element.text)}</div>`;
    case 'shape':return `<div ${attrs} aria-hidden="true"></div>`;
    case 'image':return `<figure ${attrs}>${element.image?`<img src="${e(element.image)}" alt="${e(element.decorative?'':element.alt)}">`:'<span class="empty-photo">Choose a photo</span>'}</figure>`;
    case 'html':return `<div ${attrs}><iframe title="Custom HTML" sandbox="allow-popups" srcdoc="${e(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}*{box-sizing:border-box}${cssText(element.css)}</style></head><body>${element.html}</body></html>`)}"></iframe></div>`;
    case 'countdown':return `<div ${attrs}>${countdownMarkup()}</div>`;
    case 'button':{
      const label=e(element.text||'Button');
      const href=element.action==='link'?element.url:actionURL(element.action,project,element.url);
      const isLink=['link','calendar','map','menu','games'].includes(element.action);
      const content=isLink&&href?`<a class="custom-button" href="${e(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`:`<button class="custom-button" type="button" data-ck-action="${element.action}"${element.action==='reveal'?' aria-expanded="false"':''}${element.action==='rsvp'?' aria-haspopup="dialog"':''}${isLink?' disabled title="Configure this button’s URL or event date"':''}>${label}</button>`;
      return `<div ${attrs}>${content}${element.action==='reveal'?`<div class="reveal-content" hidden>${e(element.revealText)}</div>`:''}</div>`;
    }
    default:return '';
  }
}
export function generateHTML(input,assets,{preview=false,editing=false,selectedId='',scrollY=0,surface='content'}={}){
  const p=normalizeProject(input),colors=PALETTES[p.palette],timestamp=eventTimestamp(p);
  const graphic=p.graphic??STICKERS[p.sticker],coverGraphic=p.coverGraphic??graphic;
  const dateLabel=timestamp?new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:p.timezone}).format(timestamp):'Date to be confirmed';
  const timeLabel=timestamp?new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZoneName:'short',timeZone:p.timezone}).format(timestamp):'';
  const href=p.buttonUrl||(p.rsvpEmail?`mailto:${p.rsvpEmail}?subject=${encodeURIComponent(`RSVP: ${p.heading.replace(/\n/g,' ')}`)}&body=${encodeURIComponent('Name: \nNumber of guests: ')}`:'');
  const fragments=[];
  function add(id,html){fragments.push({id,html:html.replace(/^<([a-z0-9]+)/,`<$1 style="grid-row:${fragments.length+1}"`)});}
  add('eyebrow',`<p ${tagged('eyebrow','eyebrow')} class="eyebrow">${e(p.eyebrow)}</p>`);
  if(graphic)add('sticker',`<div ${tagged('sticker','graphic')} class="hero-sticker" role="img" aria-label="Header graphic">${e(graphic)}</div>`);
  add('heading',`<h1 ${tagged('heading','heading')} tabindex="-1">${e(p.heading)}</h1>`);
  add('divider',`<div ${tagged('divider')} class="little-divider" aria-hidden="true"><span></span>✦<span></span></div>`);
  for(const block of p.blocks.filter(b=>b.enabled)){
    if(block.type==='message'){
      add('message',`<p ${tagged('message','message')} class="message message-block">${e(p.message)}</p>`);
      if(p.sender)add('sender',`<p ${tagged('sender','sender')} class="signature">${e(p.sender)}</p>`);
    }
    if(block.type==='image'&&p.image)add('photo',`<figure ${tagged('photo')} class="photo-block"><img src="${e(p.image)}" alt="${e(p.imageDecorative?'':p.imageAlt)}">${p.imageAlt&&!p.imageDecorative?`<figcaption>${e(p.imageAlt)}</figcaption>`:''}</figure>`);
    if(block.type==='details')add('details',`<section ${tagged('details')} class="details-block" aria-label="Event details"><div class="detail"><span class="detail-label">${e(p.detailsWhen)}</span><p>${e(dateLabel)}${timeLabel?`<small>${e(timeLabel)}</small>`:''}</p></div><div class="detail"><span class="detail-label">${e(p.detailsWhere)}</span><p data-ck-field="location">${e(p.location)}</p></div>${timestamp?`<button id="add-calendar" class="calendar-link" type="button">${e(p.calendarLabel)}</button>`:''}</section>`);
    if(block.type==='action'&&(href||p.rsvpMode==='relay'))add('action',`<section ${tagged('action')} class="action-block">${p.rsvpMode==='relay'&&!p.buttonUrl?`<button class="rsvp-button" data-ck-action="rsvp" aria-haspopup="dialog" type="button"><span data-ck-field="buttonLabel">${e(p.buttonLabel)}</span></button>`:`<a class="rsvp-button" href="${e(href)}" target="_blank" rel="noopener noreferrer"><span data-ck-field="buttonLabel">${e(p.buttonLabel)}</span> <span aria-hidden="true">↗</span></a>`}</section>`);
  }
  if(p.countdown&&timestamp&&p.blocks.some(b=>b.type==='details'&&b.enabled))add('countdown',countdownMarkup('countdown'));
  add('footer',`<footer ${tagged('footer')} class="page-footer">${p.effect!=='none'&&p.celebrateLabel?`<button id="celebrate" type="button">${e(p.celebrateLabel)}</button>`:''}${p.footerText?p.footerUrl?`<a data-ck-field="footerText" href="${e(p.footerUrl)}" target="_blank" rel="noopener noreferrer" class="made-with">${e(p.footerText)}</a>`:`<p data-ck-field="footerText">${e(p.footerText)}</p>`:''}</footer>`);
  p.elements.filter(el=>el.surface==='content').forEach(el=>add(el.id,customElement(el,p)));
  const order=readingOrder(p);
  const orderedContent=fragments.sort((a,b)=>(order.indexOf(a.id)<0?999:order.indexOf(a.id))-(order.indexOf(b.id)<0?999:order.indexOf(b.id))).map(f=>f.html).join('\n');
  const coverContent=`<p ${tagged('cover-eyebrow','coverEyebrow')} class="cover-eyebrow">${e(p.coverEyebrow)}</p><h2 ${tagged('cover-heading','coverHeading')} class="cover-title">${e(p.coverHeading)}</h2><div ${tagged('cover-graphic','coverGraphic')} class="cover-sticker">${p.coverImage?`<img src="${e(p.coverImage)}" alt="">`:e(coverGraphic)}</div><button id="open-card" ${tagged('cover-hint','coverHint')} type="button" class="cover-hint" aria-expanded="false" aria-controls="page-content">${e(p.coverHint)}</button>${p.elements.filter(el=>el.surface==='cover').map(el=>customElement(el,p)).join('')}`;
  const backContent=`<h2 ${tagged('back-heading','backHeading')} class="cover-title">${e(p.backHeading)}</h2><p ${tagged('back-message','backMessage')} class="message">${e(p.backMessage)}</p><p ${tagged('back-note','backNote')} class="message">${e(p.backNote)}</p>${p.elements.filter(el=>el.surface==='back').map(el=>customElement(el,p)).join('')}`;
  const currentSurface=editing?surface:'content';
  const opening=p.opening&&!editing?`<section class="invitation card-cover" id="card-cover" aria-label="Card cover">${coverContent}</section>`:'';
  const back=p.opening&&p.openingStyle==='fold'&&!editing?`<aside class="invitation card-back-panel" id="back-content" aria-label="Back panel" aria-hidden="true" inert>${backContent}</aside>`:'';
  const decoration=currentSurface==='content'?`<div class="page-decoration" aria-hidden="true"><span ${tagged('decor-star')} class="decoration-star star-one">✷</span><span ${tagged('decor-sparkle')} class="decoration-star star-two">✦</span><span ${tagged('decor-dot-one')} class="decoration-dot dot-one"></span><span ${tagged('decor-dot-two')} class="decoration-dot dot-two"></span><span ${tagged('decor-squiggle')} class="decoration-squiggle">〰</span></div>`:'';
  const recipientControls=`<div class="recipient-controls" role="group" aria-label="Page preferences"><button id="pause-motion" type="button" aria-pressed="false">Pause animations</button>${p.countdown||p.elements.some(el=>el.type==='countdown')?'<button id="pause-countdown" type="button" aria-pressed="false">Pause countdown</button>':''}</div><p id="recipient-status" class="sr-only" role="status"></p>`;
  const editorRuntime=preview&&editing?`<script>(${canvasRuntime.toString()})(${jsonForScript({selectedId,scrollY,names:BUILTIN_ELEMENTS})});</script>`:'';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${p.canvas.background||colors.paper}"><meta name="description" content="${e(p.message.slice(0,180))}"><meta property="og:title" content="${e(p.heading.replace(/\n/g,' '))}"><meta property="og:description" content="${e(p.message.slice(0,180))}"><title>${e(p.name||p.heading)}</title><style>${assets.css}
:root{--paper:${p.canvas.background||colors.paper};--ink:${colors.ink};--accent:${p.accent};--soft:${colors.soft}}.page-stage{max-width:${p.canvas.width}px}${p.canvas.minHeight?`.invitation{min-height:${p.canvas.minHeight}px}`:''}
${projectLayoutCSS(p)}</style><style id="custom-page-css">${cssText(p.customCSS)}</style></head><body class="font-${p.font} theme-${p.palette}${editing?' ck-editing':''}" data-surface="${currentSurface}" data-opening-style="${p.openingStyle}"><canvas id="confetti" aria-hidden="true"></canvas><main class="page-stage">${opening}<article class="invitation${currentSurface!=='content'?' panel-editor':''}" id="page-content"${opening?' inert aria-hidden="true"':''}>${decoration}${currentSurface==='cover'?coverContent:currentSurface==='back'?backContent:orderedContent}</article>${back}${recipientControls}</main>${rsvpMarkup(p,e)}<script type="application/json" id="cardking-project">${jsonForScript(p)}</script><script>${assets.engine.replace(/<\/script/gi,'<\\/script')}</script><script>(${pageRuntime.toString()})(${jsonForScript({timestamp,slug:fileSlug(p.name),preview,editing})});</script>${editorRuntime}${preview?`<script>addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='cardking:check')parent.postMessage({type:'cardking:report',issues:(${auditDocument.toString()})(${contrastRatio.toString()})},'*');});</script>`:''}</body></html>`;
}

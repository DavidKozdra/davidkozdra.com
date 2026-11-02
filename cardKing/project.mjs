export const STORAGE_KEY = 'cardking.draft.v1';
export const PALETTES = {
  confetti: { name: 'Birthday cake', paper: '#fff9ed', ink: '#214b40', accent: '#e56b52', soft: '#f3d891' },
  midnight: { name: 'After hours', paper: '#24243d', ink: '#f8eedc', accent: '#ceb0ef', soft: '#e7b75b' },
  rose: { name: 'Love letter', paper: '#fff1f1', ink: '#793d4c', accent: '#c25a72', soft: '#f4c78c' },
  forest: { name: 'Evergreen', paper: '#f3f1e4', ink: '#214438', accent: '#9a7024', soft: '#cbd5a5' },
  blue: { name: 'Blue skies', paper: '#eff5fb', ink: '#234a75', accent: '#526ed3', soft: '#f3cf7c' },
};
export const STICKERS = { cake: '🎂', disco: '🪩', flower: '🌼', heart: '💌', dino: '🦖', star: '✦', none: '' };
export const BLOCKS = { message: 'Message', image: 'Photo', details: 'Event details', action: 'Primary button' };
export const BUILTIN_ELEMENTS = { eyebrow: 'Subtitle', sticker: 'Header graphic', heading: 'Headline', divider: 'Divider', message: 'Message', sender: 'Signature', photo: 'Photo', details: 'Event details', action: 'RSVP button', countdown: 'Countdown', footer: 'Footer', 'decor-star': 'Big star', 'decor-sparkle': 'Small star', 'decor-dot-one': 'Gold dot', 'decor-dot-two': 'Accent dot', 'decor-squiggle': 'Wave decoration', 'cover-eyebrow': 'Cover subtitle', 'cover-heading': 'Cover title', 'cover-graphic': 'Cover graphic', 'cover-hint': 'Open button', 'back-heading': 'Back title', 'back-message': 'Back message', 'back-note': 'Back note' };
export const BUTTON_ACTIONS = { celebrate: 'Launch confetti', reveal: 'Reveal message', link: 'Open URL', rsvp: 'Open RSVP form', calendar: 'Google Calendar', 'calendar-download': 'Download calendar file', map: 'Open map', menu: 'Open menu page', games: 'Open games page', 'close-card': 'Close card', 'toggle-rain': 'Toggle photo rain' };
export const ELEMENT_TYPES = ['text', 'sticker', 'shape', 'button', 'countdown', 'html', 'image'];
export const ELEMENT_FONTS = { inherit: 'Page font', serif: 'Georgia', sans: 'Arial', rounded: 'Trebuchet MS', mono: 'Courier New', cursive: 'cursive' };
export const TEMPLATE_INFO = [
  { id: 'birthday', name: 'Birthday bash', label: 'Make a wish', color: 'confetti', sticker: 'cake' },
  { id: 'party', name: 'After hours', label: 'Meet me at midnight', color: 'midnight', sticker: 'disco' },
  { id: 'note', name: 'Love note', label: 'A little love, for you', color: 'rose', sticker: 'heart' },
  { id: 'dino', name: 'Dinos & drinks', label: 'A roaring good time', color: 'forest', sticker: 'dino' },
  { id: 'birthday-site', name: 'Birthday invitation', label: 'RSVP, calendar, map, menu & games', color: 'forest', sticker: 'dino' },
];

const base = {
  format: 'cardking', version: 1, template: 'birthday', name: 'My birthday invitation',
  eyebrow: 'GOOD TIMES AHEAD', heading: 'A little older.\nA lot more fun.',
  message: 'Another trip around the sun calls for a celebration. Come for the cake, stay for the good company. It wouldn’t be the same without you.',
  sender: 'Made with love, by me', date: '2026-11-15', time: '19:00', timezone: 'America/New_York',
  location: 'Your favorite place\nAdd an address so everyone can find you.',
  buttonLabel: 'Count me in', buttonUrl: '', rsvpEmail: '',
  image: '', imageAlt: '', palette: 'confetti', accent: '#e56b52', font: 'editorial',
  sticker: 'cake', effect: 'confetti', opening: false, countdown: true,
  blocks: Object.keys(BLOCKS).map(type => ({ type, enabled: type !== 'image' })),
  layouts: {}, elements: [], customCSS: '', readingOrder: [], imageDecorative: false,
  graphic: null, coverGraphic: null, coverEyebrow: 'Invitation', coverHeading: 'You’re invited', coverHint: 'Open invitation', coverImage: '',
  backHeading: 'Join the celebration', backMessage: '', backNote: '', openingStyle: 'reveal',
  footerText: 'Made with Card King', footerUrl: 'https://davidkozdra.com/cardKing/', celebrateLabel: 'Celebrate again',
  detailsWhen: 'When', detailsWhere: 'Location', calendarLabel: 'Add to calendar', eventDuration: 180,
  rsvpMode: 'email', rsvpEndpoint: '', maxGuests: 10, collectPhone: true, rsvpTitle: 'RSVP', rsvpSubmitLabel: 'Send RSVP', rsvpSuccess: 'Your RSVP was sent.',
  mapUrl: '', menuUrl: '', gamesUrl: '', photoRain: false, rainImage: '', confettiImage: '', confettiSprites: [], particleCount: 110,
  canvas: { snap: true, grid: false, width: 720, minHeight: 0, background: '' },
};

export function createTemplate(id = 'birthday') {
  const result = structuredClone(base);
  if (id === 'party') Object.assign(result, {
    template: id, name: 'A night to remember', eyebrow: 'CLEAR YOUR CALENDAR',
    heading: 'Good people.\nGreat excuse.', message: 'A little music, something to sip, and all our favorite people in one place. Let’s make a night of it.',
    palette: 'midnight', accent: PALETTES.midnight.accent, sticker: 'disco', sender: 'See you on the dance floor',
  });
  if (id === 'note') Object.assign(result, {
    template: id, name: 'A little note for you', eyebrow: 'JUST BECAUSE',
    heading: 'You make life\na little sweeter.', message: 'Here’s a small reminder of a very big thing: you mean the world to me. Thank you for being exactly who you are.',
    sender: 'With all my love', palette: 'rose', accent: PALETTES.rose.accent, sticker: 'heart',
    effect: 'sparkles', opening: true, countdown: false, coverHeading: 'A message for you', coverEyebrow: 'Personal card', coverHint: 'Open card',
    blocks: result.blocks.map(block => ({ ...block, enabled: block.type === 'message' })),
  });
  if (id === 'dino') Object.assign(result, {
    template: id, name: 'Dinos & drinks', eyebrow: 'A PREHISTORIC PARTY',
    heading: 'Let’s have a\nroaring good time.', message: 'You’re invited to a birthday of prehistoric proportions. Bring your favorite people and your best dinosaur energy. Drinks, snacks, and good times await.',
    sender: 'Your party dinosaur', palette: 'forest', accent: PALETTES.forest.accent, sticker: 'dino',
  });
  if (id === 'birthday-site') Object.assign(result, {
    template: id, name: "David’s 26th Birthday — Dinos & Drinks", heading: "Let’s get prehistoric!", eyebrow: 'Dinos & Drinks',
    coverEyebrow: 'You’re invited', coverHeading: "David Kozdra’s\n26th Birthday", coverHint: 'Open the card',
    backHeading: 'Good friends never go extinct.', backMessage: 'Come raise a glass, make some memories, and help make twenty-six one for the fossil record.', backNote: 'Formal dress optional but appreciated, same as gifts',
    opening: true, openingStyle: 'fold', palette: 'forest', accent: PALETTES.forest.accent, sticker: 'dino',
    location: '3000 National Parks Dr\nOrlando, FL 32837', eventDuration: 150,
    rsvpMode: 'relay', rsvpEndpoint: 'https://hooks.davidkozdra.com/', buttonLabel: 'RSVP',
    menuUrl: 'https://davidkozdra.com/cards/brithday/menu.html', gamesUrl: 'https://davidkozdra.com/cards/brithday/games.html',
    photoRain: true, footerText: '', celebrateLabel: 'Celebrate',
    elements: [['calendar','Add to calendar'], ['map','Open map'], ['menu','View menu'], ['games','Play games'], ['close-card','Close the card']].map(([action,text],i) => ({ ...createElement('button', `el-birthday-${i}`), action, text, flow: true })),
    layouts: Object.fromEntries([['calendar',0], ['map',1], ['menu',2], ['games',3], ['close-card',4]].map(([action,i]) => [`el-birthday-${i}`, { fontSize: 18, z: 3 }])),
    canvas: { ...result.canvas, minHeight: 1200 },
    confettiSprites: [{x:170,y:70,width:330,height:330},{x:570,y:20,width:310,height:420},{x:870,y:50,width:330,height:410},{x:1140,y:170,width:290,height:330},{x:320,y:390,width:330,height:360},{x:115,y:540,width:280,height:400},{x:610,y:470,width:260,height:440},{x:910,y:460,width:330,height:420},{x:1170,y:660,width:270,height:290}],
  });
  return result;
}

const string = (value, fallback, length = 2000) => typeof value === 'string' ? value.slice(0, length) : fallback;
const enumValue = (value, options, fallback) => options.includes(value) ? value : fallback;
const number = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const color = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '';
export function normalizeLayout(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  const result = {};
  const ranges = { x: [-500, 500], y: [-500, 1500], width: [3, 250], height: [2, 500], rotation: [-360, 360], fontSize: [8, 240], lineHeight: [.6, 4], letterSpacing: [-10, 40], radius: [0, 500], opacity: [0, 100], z: [-5, 999], padding: [0, 100] };
  for (const [key, [min, max]] of Object.entries(ranges)) if (typeof input[key] === 'number' && Number.isFinite(input[key])) result[key] = number(input[key], min, max, 0);
  for (const key of ['color', 'background']) if (color(input[key])) result[key] = input[key];
  for (const key of ['bold', 'italic', 'hidden', 'locked', 'shadow']) if (typeof input[key] === 'boolean') result[key] = input[key];
  if (['left', 'center', 'right'].includes(input.align)) result.align = input.align;
  if (Object.hasOwn(ELEMENT_FONTS, input.font)) result.font = input.font;
  if (['none', 'float', 'pulse', 'wiggle', 'reveal'].includes(input.animation)) result.animation = input.animation;
  return result;
}
export function createElement(type, id) {
  if (!ELEMENT_TYPES.includes(type)) throw new Error('Unknown element type');
  return { id, type, text: type === 'sticker' ? '✨' : type === 'button' ? 'Button' : 'New text', html: '<details open>\n  <summary>Details</summary>\n  <p>Add content here.</p>\n</details>', css: 'body { font: 16px Georgia; color: #264c40; padding: 20px; }\nsummary { cursor: pointer; font-weight: bold; }', url: '', action: 'celebrate', revealText: 'Enter the message to reveal.', image: '', alt: '', decorative: false, surface: 'content', flow: false };
}
export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function normalizeProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose a Card King project file.');
  if (input.format !== 'cardking' || input.version !== 1) throw new Error('This file isn’t a supported Card King project (version 1).');
  const project = createTemplate(enumValue(input.template, TEMPLATE_INFO.map(t => t.id), 'birthday'));
  for (const key of ['name', 'eyebrow', 'heading', 'message', 'sender', 'location', 'buttonLabel', 'imageAlt', 'coverEyebrow', 'coverHeading', 'coverHint', 'backHeading', 'backMessage', 'backNote', 'footerText', 'celebrateLabel', 'detailsWhen', 'detailsWhere', 'calendarLabel', 'rsvpTitle', 'rsvpSubmitLabel', 'rsvpSuccess']) {
    project[key] = string(input[key], project[key], key === 'message' ? 6000 : 500);
  }
  project.date = input.date === '' || validDate(input.date) ? input.date : project.date;
  project.time = /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ? input.time : project.time;
  try { new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format(); project.timezone = input.timezone || base.timezone; } catch { /* Keep the default zone. */ }
  project.buttonUrl = safeUrl(string(input.buttonUrl, '', 2000));
  const email = string(input.rsvpEmail, '', 254).trim();
  project.rsvpEmail = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email) ? email : '';
  project.palette = enumValue(input.palette, Object.keys(PALETTES), project.palette);
  project.accent = /^#[0-9a-f]{6}$/i.test(input.accent) ? input.accent : PALETTES[project.palette].accent;
  project.font = enumValue(input.font, ['editorial', 'modern', 'playful'], 'editorial');
  project.sticker = enumValue(input.sticker, Object.keys(STICKERS), 'cake');
  project.effect = enumValue(input.effect, ['confetti', 'sparkles', 'none'], 'confetti');
  for (const key of ['opening', 'countdown']) project[key] = typeof input[key] === 'boolean' ? input[key] : project[key];
  // Only embedded raster images are accepted. Imported markup and remote URLs never execute.
  project.image = typeof input.image === 'string' && input.image.length <= 6000000 && /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(input.image) ? input.image : '';
  if (Array.isArray(input.blocks)) {
    const seen = new Set();
    project.blocks = input.blocks.filter(block => {
      if (!block || !Object.hasOwn(BLOCKS, block.type) || seen.has(block.type)) return false;
      seen.add(block.type); return true;
    }).map(block => ({ type: block.type, enabled: block.enabled === true }));
    for (const type of Object.keys(BLOCKS)) if (!seen.has(type)) project.blocks.push({ type, enabled: false });
  }
  const ids = new Set(Object.keys(BUILTIN_ELEMENTS));
  project.elements = (Array.isArray(input.elements) ? input.elements : []).slice(0, 100).filter(element => {
    if (!element || !ELEMENT_TYPES.includes(element.type) || !/^el-[a-z0-9-]{1,70}$/.test(element.id) || ids.has(element.id)) return false;
    ids.add(element.id); return true;
  }).map(element => ({
    ...createElement(element.type, element.id),
    text: string(element.text, '', 6000), html: string(element.html, '', 50000), css: string(element.css, '', 30000),
    url: safeUrl(element.url), action: enumValue(element.action, Object.keys(BUTTON_ACTIONS), 'celebrate'),
    revealText: string(element.revealText, '', 6000), alt: string(element.alt, '', 500), decorative: element.decorative === true, surface: enumValue(element.surface, ['content', 'cover', 'back'], 'content'), flow: element.flow === true,
    image: typeof element.image === 'string' && element.image.length <= 6000000 && /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(element.image) ? element.image : '',
  }));
  project.layouts = {};
  if (input.layouts && typeof input.layouts === 'object') for (const id of ids) if (Object.hasOwn(input.layouts, id)) project.layouts[id] = normalizeLayout(input.layouts[id]);
  project.customCSS = string(input.customCSS, '', 50000);
  for (const key of ['graphic', 'coverGraphic']) project[key] = typeof input[key] === 'string' ? input[key].slice(0,500) : null;
  for (const key of ['coverImage','rainImage','confettiImage']) project[key] = typeof input[key] === 'string' && input[key].length <= 6000000 && /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(input[key]) ? input[key] : '';
  for (const key of ['footerUrl','mapUrl','menuUrl','gamesUrl']) project[key] = safeUrl(input[key] ?? project[key]);
  const endpoint = safeUrl(input.rsvpEndpoint ?? project.rsvpEndpoint);
  project.rsvpEndpoint = /^https?:/.test(endpoint) ? endpoint : '';
  project.rsvpMode = enumValue(input.rsvpMode, ['email','relay'], project.rsvpMode);
  project.openingStyle = enumValue(input.openingStyle, ['reveal','fold'], 'reveal');
  project.eventDuration = number(input.eventDuration, 15, 1440, project.eventDuration);
  project.maxGuests = Math.round(number(input.maxGuests, 0, 30, 10));
  project.particleCount = Math.round(number(input.particleCount, 10, 300, 110));
  for (const key of ['collectPhone','photoRain']) project[key] = typeof input[key] === 'boolean' ? input[key] : project[key];
  project.confettiSprites = (Array.isArray(input.confettiSprites) ? input.confettiSprites : []).slice(0,30).filter(r => r && ['x','y','width','height'].every(k => typeof r[k] === 'number' && Number.isFinite(r[k]) && r[k] >= (k === 'x' || k === 'y' ? 0 : 1))).map(r => ({x:Math.min(r.x,10000),y:Math.min(r.y,10000),width:Math.min(r.width,10000),height:Math.min(r.height,10000)}));
  project.imageDecorative = input.imageDecorative === true;
  project.readingOrder = [...new Set(Array.isArray(input.readingOrder) ? input.readingOrder.filter(id => ids.has(id)) : [])];
  const canvas = input.canvas || {};
  project.canvas = { snap: canvas.snap !== false, grid: canvas.grid === true, width: number(canvas.width, 320, 1200, 720), minHeight: number(canvas.minHeight, 0, 4000, 0), background: color(canvas.background) };
  return project;
}

export function parseProject(source) {
  let json = source;
  if (source.trimStart().startsWith('<')) {
    const match = source.match(/<script\b[^>]*\bid=["']cardking-project["'][^>]*>([\s\S]*?)<\/script\s*>/i);
    if (!match) throw new Error('This HTML wasn’t exported by Card King. Import a project JSON or a Card King HTML file.');
    json = match[1];
  }
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error('This file doesn’t contain valid project data.'); }
  return normalizeProject(parsed);
}

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const jsonForScript = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export const fileSlug = name => name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'my-card';

export function eventTimestamp(project) {
  if (!validDate(project.date)) return null;
  const wallTime = Date.parse(`${project.date}T${project.time || '19:00'}:00Z`);
  let result = wallTime;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: project.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(result)).map(p => [p.type, p.value]));
    const inZone = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    result += wallTime - inZone;
  }
  return result;
}

export function defaultReadingOrder(p) {
  const ids = ['eyebrow', ...((p.graphic ?? STICKERS[p.sticker]) ? ['sticker'] : []), 'heading', 'divider'];
  for (const block of p.blocks) if (block.enabled) {
    if (block.type === 'message') ids.push('message', ...(p.sender ? ['sender'] : []));
    if (block.type === 'image' && p.image) ids.push('photo');
    if (block.type === 'details') ids.push('details');
    if (block.type === 'action' && (p.buttonUrl || p.rsvpEmail || p.rsvpMode === 'relay')) ids.push('action');
  }
  if (p.countdown && p.date && p.blocks.some(b => b.type === 'details' && b.enabled)) ids.push('countdown');
  ids.push('footer', ...p.elements.filter(el => el.surface !== 'cover' && el.surface !== 'back').map(el => el.id));
  return ids.filter(id => !p.layouts[id]?.hidden);
}
export function readingOrder(p) {
  const available = defaultReadingOrder(p);
  return [...new Set([...(p.readingOrder || []).filter(id => available.includes(id)), ...available])];
}

export const STORAGE_KEY = 'cardking.draft.v1';
export const PALETTES = {
  confetti: { name: 'Birthday cake', paper: '#fff9ed', ink: '#214b40', accent: '#e56b52', soft: '#f3d891' },
  midnight: { name: 'After hours', paper: '#24243d', ink: '#f8eedc', accent: '#ceb0ef', soft: '#e7b75b' },
  rose: { name: 'Love letter', paper: '#fff1f1', ink: '#793d4c', accent: '#c25a72', soft: '#f4c78c' },
  forest: { name: 'Evergreen', paper: '#f3f1e4', ink: '#214438', accent: '#9a7024', soft: '#cbd5a5' },
  blue: { name: 'Blue skies', paper: '#eff5fb', ink: '#234a75', accent: '#526ed3', soft: '#f3cf7c' },
};
export const STICKERS = { cake: '🎂', disco: '🪩', flower: '🌼', heart: '💌', dino: '🦖', star: '✦', none: '' };
export const BLOCKS = { message: 'A little message', image: 'Photo moment', details: 'The details', action: 'Your invitation link' };
export const TEMPLATE_INFO = [
  { id: 'birthday', name: 'Birthday bash', label: 'Make a wish', color: 'confetti', sticker: 'cake' },
  { id: 'party', name: 'After hours', label: 'Meet me at midnight', color: 'midnight', sticker: 'disco' },
  { id: 'note', name: 'Love note', label: 'A little love, for you', color: 'rose', sticker: 'heart' },
  { id: 'dino', name: 'Dinos & drinks', label: 'A roaring good time', color: 'forest', sticker: 'dino' },
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
    effect: 'sparkles', opening: true, countdown: false,
    blocks: result.blocks.map(block => ({ ...block, enabled: block.type === 'message' })),
  });
  if (id === 'dino') Object.assign(result, {
    template: id, name: 'Dinos & drinks', eyebrow: 'A PREHISTORIC PARTY',
    heading: 'Let’s have a\nroaring good time.', message: 'You’re invited to a birthday of prehistoric proportions. Bring your favorite people and your best dinosaur energy. Drinks, snacks, and good times await.',
    sender: 'Your party dinosaur', palette: 'forest', accent: PALETTES.forest.accent, sticker: 'dino',
  });
  return result;
}

const string = (value, fallback, length = 2000) => typeof value === 'string' ? value.slice(0, length) : fallback;
const enumValue = (value, options, fallback) => options.includes(value) ? value : fallback;
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
  for (const key of ['name', 'eyebrow', 'heading', 'message', 'sender', 'location', 'buttonLabel', 'imageAlt']) {
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

import { eventTimestamp, safeUrl } from './project.mjs';
export function actionURL(action, project, override = '') {
  if (override) return safeUrl(override);
  if (action === 'map') return project.mapUrl || (project.location.trim() ? `https://www.google.com/maps?q=${encodeURIComponent(project.location)}` : '');
  if (action === 'menu') return project.menuUrl;
  if (action === 'games') return project.gamesUrl;
  if (action === 'calendar') {
    const timestamp = eventTimestamp(project);
    if (timestamp === null) return '';
    const date = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
    const params = new URLSearchParams({ action: 'TEMPLATE', text: project.heading.replace(/\n/g,' '), dates: `${date(timestamp)}/${date(timestamp + project.eventDuration*60000)}`, ctz: project.timezone, details: project.message, location: project.location });
    return `https://calendar.google.com/calendar/render?${params}`;
  }
  return '';
}
export function rsvpMarkup(project, escape) {
  const e = escape;
  return `<dialog id="rsvp-dialog" class="recipient-dialog" aria-labelledby="rsvp-title"><button type="button" id="rsvp-close" class="dialog-dismiss" aria-label="Close RSVP">×</button><h2 id="rsvp-title">${e(project.rsvpTitle)}</h2><form id="rsvp-form"><label>Your name<input name="name" type="text" autocomplete="name" maxlength="80" required></label>${project.collectPhone ? '<label>Phone number (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>' : ''}<fieldset><legend>Additional guests (optional)</legend><div id="rsvp-guests"></div><button id="rsvp-add-guest" type="button"${project.maxGuests === 0 ? ' hidden' : ''}>Add guest</button></fieldset><p id="rsvp-status" role="status"></p><button type="submit" id="rsvp-submit">${e(project.rsvpSubmitLabel)}</button></form></dialog>`;
}

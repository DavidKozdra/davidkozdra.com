# Card King

A browser editor for party invitations, greeting cards, and small personal pages. Open `/cardKing/` on the existing site. It is static: no server application, account, API key, or database is required.

## Use it

1. Pick Birthday bash, After hours, Love note, or Dinos & drinks.
2. Edit the words and event details. Add an RSVP email or a form URL to display the invitation button. Upload a photo, pick a palette and type style, and choose your effects.
3. Design directly on the canvas: click to select, drag to move, pull corner handles to resize, use the round handle to rotate, and double-click text to edit. The Element studio controls exact position, size, typography, color, fill, spacing, opacity, rounded corners, and animation.
4. Add text, stickers, photos, shapes, interactive buttons, countdowns, and HTML blocks from the toolbar. Layers support selecting, hiding, locking, duplicating, and changing stacking order. The section outline still reorders the document’s natural reading order. Countdown tiles include seconds and update every second.
5. Switch between **Edit** and **Interact** to design or test your page. Buttons can launch confetti/sparkles, reveal a surprise message, or open a link. Use **Code** to edit custom page CSS, an HTML block’s markup and CSS, or inspect the exported HTML. HTML blocks support native HTML interactions, such as `details`/`summary`; custom scripts stay disabled in their isolated frames. Desktop/mobile previews, canvas zoom, an optional grid, and snapping help with layout.
6. **Save project** downloads an editable JSON backup. **Open project** accepts a backup or HTML previously exported by this editor. A draft also saves in this browser; local storage can be cleared or fill up, so keep backups.
7. **Download HTML** creates a complete page containing its layout, styles, uploaded photos, Koz Engine particles, and editable project data. Rename it `index.html`, put it in `cards/your-party/`, deploy the site as usual, and share `/cards/your-party/`.

The editor does not write to your hosted site or change existing cards. Downloading creates a local file; uploading that file to the site is the publishing step. RSVP links use the guest’s email app or your external form. The page itself does not store responses. Calendar downloads use the configured event time zone and a three-hour event duration.

## Develop

From the repository root:

```sh
python3 -m http.server 4186 --bind 127.0.0.1
```

Open `http://127.0.0.1:4186/cardKing/` (or choose another free port). The editor uses ES modules and fetches its local export assets, so serve it over HTTP rather than opening its source `index.html` directly. Exported HTML files can be opened directly and work offline. Both the editor and its exports use built-in fonts and make no external asset requests. The folder’s `.htaccess` declares the module MIME type for Apache/LiteSpeed and keeps script updates fresh; it retains the site’s existing security policy.

## Koz Engine integration

`package.json` pins the npm dependency `koz-engine-lib@0.1.0`. `app.mjs` uses its `EventBus` for project updates; exported pages use its `ParticleSystemCore` for confetti and sparkles. The small build script wraps these two dependency-free CommonJS modules in an isolated browser bundle without mutating `window.module`. This uses the npm package, not the repository’s older `Koz_Engine_Lib` folder.

`vendor/koz-engine.js` is committed so the existing static host needs no build or CDN. To refresh it:

```sh
cd cardKing
npm ci --ignore-scripts
npm run build
npm test
```

`project.mjs` owns the versioned project format and import validation. Existing version-1 projects migrate with default canvas settings. `render.mjs`, `layout.mjs`, `page.css`, and `page-runtime.mjs` produce the same document for preview and export. `editor-controls.mjs` owns the inspector and layer controls; `canvas-runtime.mjs` provides pointer editing in the sandboxed preview and is omitted from exports. Geometry is stored relative to the card’s content width, so positions scale with the card. Text is escaped, style values are bounded, and photos use embedded raster formats. Custom HTML renders in a separate frame without script execution; custom page CSS is intentionally editable.

Keyboard shortcuts: Ctrl/⌘ S saves a project; Ctrl/⌘ Z and Ctrl/⌘ Shift Z undo/redo when focus is outside a text field. Text fields keep the browser’s native undo behavior. On the canvas, arrows nudge the selection (Shift for 10 px), Delete removes it, Ctrl/⌘ D duplicates, and Escape deselects. Hold Alt while dragging to bypass snapping; Shift constrains movement or snaps rotation to 15 degrees. The toolbar undo buttons apply to the whole project.

## Accessibility and usability

The studio uses a 16 px base size, 14 px labels, high-contrast green-and-cream controls, visible focus indicators, and large primary targets. At desktop widths of 1440 px and above, content tools, canvas, and properties appear together. Smaller screens expose labeled workspace views; phones show one view at a time. Inspector sections group content, positioning, appearance, and interaction controls.

Every drag operation has a control-based alternative: select through Layers, edit text in the inspector, use movement buttons, enter dimensions or rotation, and reorder sections with buttons. Code editor Tab navigates normally; Ctrl/Command + ] indents. Dialogs return focus to their opener. Generated controls preserve focus and caret position as the project updates.

**Reading order** changes the generated DOM sequence independently of visual stacking. Existing template content uses explicit CSS grid rows, so changing its reading order does not move the artwork. Photos can have meaningful descriptions or be marked decorative. These optional fields are backward compatible with version-1 projects.

**Check accessibility** inspects rendered text for low contrast and small sizes, missing photo descriptions, and unclear link labels. Findings select the relevant element; a missing template-photo description links directly to its field. Complex backgrounds, transparency, custom HTML, and custom CSS need manual review. The report is advisory: it never blocks export, changes artwork automatically, or certifies an arbitrary design as compliant.

Exported cards retain their ticking seconds without automatic live announcements on every tick. Recipients can pause/resume the countdown and animations. Reduced motion is respected by default. The editor-only audit and canvas tooling are omitted from exports; the card still works offline.

Run the automated export and metadata checks with `npm test` from `cardKing`. For browser checks, install Python Playwright and its Chromium browser in your development environment, run `npm ci --ignore-scripts` to install the development-only axe-core dependency, then run:

```sh
# From the repository root; the test starts and stops its own local HTTP server.
python3 cardKing/tests/browser-a11y.py
```

The browser suite checks axe WCAG A/AA rules, keyboard workflows, focus retention, reading order versus visual position, pointer editing, all four template exports, pause controls, reduced motion, narrow layouts, enlarged text, and offline round trips. Browser accessibility-tree inspection supplements these checks. A hands-on test with a screen reader such as NVDA or VoiceOver remains necessary before claiming full assistive-technology compatibility; automated checks do not prove WCAG conformance.

## Complete card editing and birthday actions

The Content tab edits the title, subtitle, message, event details, primary button, cover, back panel, and footer. Design controls include custom header graphics and cover images. Select an element to edit its content directly in Element properties; event details and the primary RSVP button expose their actual settings there. The Cover / Inside / Back panel selector changes the editing surface. New elements belong to the selected panel. The back panel is included with the fold-out opening style. Reset template layout restores template geometry without changing text or button settings; all changes support Undo.

Open **Choose a template → Birthday invitation** to load a preset based on `cards/brithday`. It embeds optimized copies of that card’s cover art, rain image, and drink sprite sheet, preserving the sprite crop coordinates. The original birthday files remain independent of the editor. The preset includes the event details, fold-out back panel, RSVP form, calendar, map, menu, games, and close-card buttons.

**Add event button** creates configurable actions: RSVP form, Google Calendar, calendar-file download, map, menu page, games page, close card, photo-rain toggle, confetti, reveal message, or a URL. Use automatic layout for buttons that should follow the page content, or turn it off for free positioning. Event duration controls both Google Calendar and downloaded calendar files. Map buttons use the edited event location unless a URL override is supplied. Menu and games buttons navigate to configured hosted pages; they do not bundle the games or menu page inside the HTML file.

In Interactions, configure RSVP delivery through an email application or a public submission endpoint. The relay request uses `{source,title,fields:[{name,value,inline}]}`, matching `workers/david-webhook`. The birthday preset uses the existing public relay URL. The endpoint must permit the hosted page’s origin; no private Discord webhook or other secret belongs in the editor. Forms support an optional phone number, named additional guests, retry after errors, and an editable confirmation message. **Both inline and full-page previews validate RSVP forms without sending requests.** Downloaded pages submit only when a visitor chooses Send RSVP. Live delivery requires network access and a configured relay/email client.

Photo rain runs behind the closed cover. Opening disperses the photos and launches confetti, optionally using an uploaded image or sprite sheet. Closing restarts the configured rain. Motion respects the recipient’s reduced-motion setting and pause controls. Cover art, rain images, confetti images, sprite rectangles, panel contents, and all action settings survive project backups and HTML reimport.

The additional regression suite starts its own HTTP server and mocks all relay requests, so it never sends real messages:

```sh
python3 cardKing/tests/browser-birthday.py
```

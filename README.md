

# David Kozdra Portfolio - DK OS

Welcome to **[David Kozdra's Portfolio](https://davidkozdra.com)**, an interactive front-end experience designed to emulate the look and feel of a desktop environment (DE). This portfolio serves as a showcase of my skills as a front-end developer, blending modern web technologies with my interest in classic operating systems and graphical user interfaces (GUIs) from past computing eras.

## Project Overview

This portfolio is designed to resemble a desktop environment, complete with:
- **Interactive windows**: Visitors can navigate between sections of the site using windowed applications, just like a desktop.
- **Icon-based desktop**: Projects and tools can be launched from desktop icons, similar to old operating systems.
- **Taskbar and System Tray**: Mimicking a fully functional operating system, the portfolio includes a taskbar, system tray, and status indicators like time, Wi-Fi, and notifications.

## Purpose

This project is a personal exploration of two things:
1. **Front-End Web Development**: Demonstrating my expertise in HTML, CSS, and JavaScript, with a focus on building intuitive and responsive UIs.
2. **Nostalgia for Classic Desktop Environments**: Inspired by older operating systems such as Windows 98, classic Mac OS, and Linux desktop environments, the site pays homage to the simplicity and usability of these vintage systems.

## Features

- **Desktop Simulation**: A simulated desktop environment where visitors can open "apps" (pages) like **About Me**, **Projects**, and **Resume**.
- **Calculator & Notes**: Small utility applications you would typically find on a traditional desktop.
- **System Settings**: A settings panel for customizing the experience, mirroring a control panel from classic operating systems.
- **Taskbar with System Information**: A fully functional taskbar showing the current time and providing quick access to key sections of the site.
  
## Technologies Used

- **HTML5 & CSS3**: The layout and styling of the entire site are built using clean and accessible markup.
- **JavaScript**: Functionality like opening windows, switching between sections, and handling the taskbar interactions are powered by vanilla JavaScript.
- **Responsive Design**: The site is fully responsive, ensuring that it works smoothly across different devices and screen sizes.
  
## Why Desktop Environments?

My fascination with old desktop environments stems from their simplicity, functionality, and aesthetic appeal. I believe that many of these concepts can still serve as a basis for clean, user-friendly web design today. By blending the nostalgic feel of these operating systems with modern web technology, I aimed to create an engaging and interactive user experience.

## Git hooks

Enable the repository's version-controlled hooks once after cloning:

```sh
git config core.hooksPath .githooks
```

Before each commit, the pre-commit hook updates every `sitemap.xml` `<lastmod>`
value to the current date and stages the sitemap if it changed.

## SEO checks behind Cloudflare

The origin `robots.txt` uses standard directives. Cloudflare currently prepends
a managed block containing `Content-Signal`, which some SEO tools flag as an
unknown directive. Editing the origin file cannot remove that injected line.
To serve only the origin file, open the domain's Cloudflare **Security > Settings >
Bot traffic > AI Crawler and Agent access policies**, turn off **Enable Bot
Preference Sync** (called managed `robots.txt` in older dashboard versions), and
save. Preserve any desired crawler exclusions in `robots.txt` when replacing the
managed block. See [Cloudflare's managed robots.txt documentation](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/).

The four public email links use Cloudflare's `email_off` comments to preserve
their `mailto:` destinations. Without these comments, Cloudflare rewrites them
to `/cdn-cgi/l/email-protection`, which returns 404 when requested directly.
`robots.txt` also excludes `/cdn-cgi/`, as
[Cloudflare recommends](https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/),
so crawlers skip injected infrastructure links such as `/cdn-cgi/content`.
Configure the SEO audit to honor `robots.txt` or explicitly exclude `/cdn-cgi/`.

After deploying the HTML and `robots.txt` changes, verify the live responses and
run a fresh audit. The Cloudflare dashboard change is separate from deployment.


## Minified assets

Run `npm ci` after cloning and `npm run build` after changing files in
`assets/css/` or `assets/js/`. The build writes adjacent `.min.css` and `.min.js`
files, which the main portfolio pages serve. Commit the generated files with
source edits so static deployments also work without running a build. CSS assets
stay in the same directory so relative image URLs continue to resolve.

The desktop runtime and project explorer now have separate script and stylesheet
sources. Their classic script order and global handlers are preserved. The
service worker precaches the minified desktop assets with a new cache version.

## Canonical hostname and HSTS

The audit export identifies `https://www.davidkozdra.com/` as the second 404 URL.
The live apex and `www` responses also lack `Strict-Transport-Security`, even
though the Apache configuration in this repository sets that header.

For Apache, `.htaccess` redirects `www` to the apex before serving content.
For Cloudflare static hosting, `_redirects` contains the equivalent permanent
redirect and `_headers` sets the existing HSTS policy. Both hostnames must be
attached to the same hosting project for file-based rules to apply.

If the host does not use these files, configure a Cloudflare Redirect Rule:
match `http.host eq "www.davidkozdra.com"`, redirect permanently (301) to
`concat("https://davidkozdra.com", http.request.uri.path)`, and preserve the query
string. Make sure the `www` DNS record is proxied and routes to the site. See
[Cloudflare's WWW redirect example](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).
Enable HSTS under **SSL/TLS > Edge Certificates > HTTP Strict Transport Security**
to send it on both hostnames, including redirects and edge responses; see
[Cloudflare's HSTS instructions](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).

After deploying, verify a nested URL such as
`https://www.davidkozdra.com/work/?source=check` redirects to the matching apex
URL with its query string, and inspect HTTPS headers on both hostnames. These
repository changes do not apply Cloudflare account settings automatically.

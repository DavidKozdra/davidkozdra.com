#!/usr/bin/env node
// Script to replace <img> tags with <picture> elements for WebP support

const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'pages/about/index.html',
  'archive/intro.html',
  'archive/old-site.html',
  'archive/old-site-post.html',
  'legal/wintest-privacy-policy/index.html',
  'gitPulsePrivacyPolicy.html'
];

const repoRoot = path.resolve(__dirname, '..');

files.forEach(file => {
  const filePath = path.join(repoRoot, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace img tags with picture elements
  content = content.replace(
    /<img\s+([^>]*src=["'](?:\.{0,2}\/)?(?:assets\/)?images\/(brand|profile|projects|company-logos|ui-icons)\/([^"']+)\.(png|jpg|jpeg|ico)["'][^>]*)>/gi,
    (match, attrs, folder, filename, ext) => {
      if (attrs.includes('</picture>') || attrs.includes('<picture>')) {
        return match; // Already wrapped
      }
      modified = true;
      const webpPath = `/assets/images/${folder}/${filename}.webp`;
      const fallbackPath = `/assets/images/${folder}/${filename}.${ext}`;
      
      // Extract other attributes
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      const widthMatch = attrs.match(/width=["']?(\d+)["']?/i);
      const heightMatch = attrs.match(/height=["']?(\d+)["']?/i);
      const classMatch = attrs.match(/class=["']([^"']*)["']/i);
      const idMatch = attrs.match(/id=["']([^"']*)["']/i);
      const styleMatch = attrs.match(/style=["']([^"']*)["']/i);
      const roleMatch = attrs.match(/role=["']([^"']*)["']/i);
      const fetchpriorityMatch = attrs.match(/fetchpriority=["']([^"']*)["']/i);
      
      let imgAttrs = '';
      if (altMatch) imgAttrs += ` alt="${altMatch[1]}"`;
      if (widthMatch) imgAttrs += ` width="${widthMatch[1]}"`;
      if (heightMatch) imgAttrs += ` height="${heightMatch[1]}"`;
      if (classMatch) imgAttrs += ` class="${classMatch[1]}"`;
      if (idMatch) imgAttrs += ` id="${idMatch[1]}"`;
      if (styleMatch) imgAttrs += ` style="${styleMatch[1]}"`;
      if (roleMatch) imgAttrs += ` role="${roleMatch[1]}"`;
      if (fetchpriorityMatch) imgAttrs += ` fetchpriority="${fetchpriorityMatch[1]}"`;
      
      return `<picture>
        <source srcset="${webpPath}" type="image/webp">
        <img src="${fallbackPath}"${imgAttrs}>
      </picture>`;
    }
  );
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${file}`);
  } else {
    console.log(`○ No changes needed for ${file}`);
  }
});

console.log('Done!');

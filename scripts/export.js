// Builds a static copy of the site into docs/ for GitHub Pages.
// Usage: npm run export   (then commit and push docs/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from '../lib/store.js';
import { renderPage } from '../lib/render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'uploads'), { recursive: true });

// GitHub Pages serves project sites from /<repo>/, so root-absolute paths must become relative.
const html = renderPage(store.getContent(), { staticSite: true }).replace(/(["(])\/(assets|uploads)\//g, '$1$2/');
fs.writeFileSync(path.join(OUT, 'index.html'), html);

fs.cpSync(path.join(ROOT, 'public/assets'), path.join(OUT, 'assets'), { recursive: true });

// Only copy the uploaded images the page actually uses.
const used = [...new Set([...html.matchAll(/uploads\/([\w.-]+)/g)].map((m) => m[1]))];
for (const file of used) {
  const src = path.join(store.UPLOAD_DIR, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, 'uploads', file));
  else console.warn(`  Advarsel: fant ikke bildet ${file}`);
}

fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Statisk side eksportert til docs/ (${used.length} opplastede bilder).`);

// Builds the static site + GitHub-mode admin into _site/ (deployed by .github/workflows/pages.yml).
// Reads only content/ — never data/, so passwords and leads can't end up on GitHub Pages.
// Usage: npm run export
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from '../lib/render.js';
import { sanitizeContent } from '../lib/schema.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const OUT = path.join(ROOT, process.env.OUT_DIR || '_site');

// GITHUB_REPOSITORY / GITHUB_REF_NAME are set by GitHub Actions.
const repo = process.env.GITHUB_REPOSITORY || 'Ferro-ui/ferrobygget-nettside';
const branch = process.env.GITHUB_REF_NAME || 'main';

const content = sanitizeContent(JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'content.json'), 'utf8')));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'uploads'), { recursive: true });

// Pages serves project sites from /<repo>/, so root-absolute paths become relative.
const html = renderPage(content, { staticSite: true }).replace(/(["(])\/(assets|uploads)\//g, '$1$2/');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.cpSync(path.join(ROOT, 'public/assets'), path.join(OUT, 'assets'), { recursive: true });

const used = [...new Set([...html.matchAll(/uploads\/([\w.-]+)/g)].map((m) => m[1]))];
for (const file of used) {
  const src = path.join(CONTENT_DIR, 'uploads', file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, 'uploads', file));
  else console.warn(`  Advarsel: fant ikke bildet ${file}`);
}

// Admin in "GitHub mode": edits content/ through the GitHub API.
fs.cpSync(path.join(ROOT, 'public/admin'), path.join(OUT, 'admin'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'lib/render.js'), path.join(OUT, 'admin/render.js'));
fs.writeFileSync(
  path.join(OUT, 'admin/config.js'),
  `window.FB_CONFIG = ${JSON.stringify({ mode: 'github', repo, branch, contentPath: 'content/content.json', uploadsPath: 'content/uploads' })};\n`,
);

fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Statisk side bygget i ${path.relative(ROOT, OUT)}/ (${used.length} bilder, admin i GitHub-modus for ${repo}).`);

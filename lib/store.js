// File-based storage.
// CONTENT_DIR (content/, in Git): the public site content and uploaded images — also what
//   GitHub Pages builds from and what the GitHub-mode admin edits.
// DATA_DIR (data/, NOT in Git): password, e-mail settings, leads and content backups.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import defaultContent from './default-content.js';
import { hashPassword } from './password.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
export const CONTENT_DIR = process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(ROOT, 'content');
export const UPLOAD_DIR = path.join(CONTENT_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

function read(name, fallback, dir = DATA_DIR) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function write(name, data, mode, dir = DATA_DIR) {
  const file = path.join(dir, name);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, mode ? { mode } : undefined);
  fs.renameSync(tmp, file);
}

// ---- Public content -------------------------------------------------------

let content = read('content.json', null, CONTENT_DIR);
if (!content) {
  content = structuredClone(defaultContent);
  write('content.json', content, undefined, CONTENT_DIR);
}

// Re-read when the file changed on disk (e.g. after `git pull` of edits made on GitHub Pages).
const CONTENT_FILE = path.join(CONTENT_DIR, 'content.json');
let contentMtime = fs.statSync(CONTENT_FILE).mtimeMs;

export function getContent() {
  const mtime = fs.statSync(CONTENT_FILE).mtimeMs;
  if (mtime !== contentMtime) {
    content = read('content.json', content, CONTENT_DIR);
    contentMtime = mtime;
  }
  return content;
}

export function saveContent(next) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  write(path.join('backups', `content-${stamp}.json`), content);
  const backups = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('content-')).sort();
  for (const old of backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS))) {
    fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
  }
  content = next;
  write('content.json', content, undefined, CONTENT_DIR);
  contentMtime = fs.statSync(CONTENT_FILE).mtimeMs;
}

// ---- Private settings (password, session secret, e-mail) -------------------

let priv = read('private.json', null);
if (!priv) {
  const initial = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  priv = {
    secret: crypto.randomBytes(32).toString('hex'),
    passwordHash: hashPassword(initial),
    email: {
      enabled: false,
      recipients: [],
      smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '' },
    },
  };
  write('private.json', priv, 0o600);
  if (!process.env.ADMIN_PASSWORD) {
    fs.writeFileSync(path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt'), `${initial}\n`, { mode: 0o600 });
    console.log(`\n  Admin-passord opprettet: ${initial}\n  (lagret i ${path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt')})\n`);
  }
}

export const getPrivate = () => priv;

export function updatePrivate(patch) {
  priv = { ...priv, ...patch };
  write('private.json', priv, 0o600);
}

// ---- Leads ------------------------------------------------------------------

let leads = read('leads.json', []);

export const getLeads = () => leads;

export function addLead(lead) {
  const saved = { id: crypto.randomBytes(6).toString('hex'), createdAt: new Date().toISOString(), ...lead };
  leads = [saved, ...leads];
  write('leads.json', leads);
  return saved;
}

export function deleteLead(id) {
  const before = leads.length;
  leads = leads.filter((l) => l.id !== id);
  if (leads.length !== before) write('leads.json', leads);
  return leads.length !== before;
}

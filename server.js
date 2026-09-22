import express from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as store from './lib/store.js';
import * as auth from './lib/auth.js';
import { renderPage } from './lib/render.js';
import { sanitizeContent } from './lib/schema.js';
import { hashPassword, verifyPassword } from './lib/password.js';
import { sendLeadEmail, sendTestEmail } from './lib/mail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(store.UPLOAD_DIR, { maxAge: '30d' }));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache').type('html').send(renderPage(store.getContent()));
});

// ---- Public: lead form ------------------------------------------------------

const oneLine = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

app.post('/api/lead', auth.rateLimiter({ windowMs: 10 * 60e3, max: 5 }), (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot: pretend success for bots
  const lead = {
    name: oneLine(b.name, 200),
    email: oneLine(b.email, 200),
    company: oneLine(b.company, 200),
    employees: oneLine(b.employees, 40),
    message: String(b.message ?? '').trim().slice(0, 2000),
  };
  if (!lead.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return res.status(400).json({ error: 'Vennligst fyll inn navn og en gyldig e-postadresse.' });
  }
  const saved = store.addLead(lead);
  res.json({ ok: true });
  sendLeadEmail(saved).catch((err) => console.error('[e-post] Kunne ikke sende varsel:', err.message));
});

// ---- Admin -------------------------------------------------------------------

const admin = express.Router();

admin.post('/login', auth.rateLimiter({ windowMs: 15 * 60e3, max: 10 }), (req, res) => {
  if (!verifyPassword(req.body?.password ?? '', store.getPrivate().passwordHash)) {
    return res.status(401).json({ error: 'Feil passord' });
  }
  auth.startSession(res);
  res.json({ ok: true });
});

admin.post('/logout', (req, res) => {
  auth.endSession(res);
  res.json({ ok: true });
});

admin.use(auth.requireAuth);

admin.get('/me', (req, res) => res.json({ ok: true, leads: store.getLeads().length }));

admin.get('/content', (req, res) => res.json(store.getContent()));

admin.put('/content', (req, res) => {
  const clean = sanitizeContent(req.body);
  store.saveContent(clean);
  res.json(clean);
});

const upload = multer({
  storage: multer.diskStorage({
    destination: store.UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'image/gif': '.gif' }[file.mimetype];
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)),
});

admin.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Kun bilder (JPG, PNG, WebP, AVIF, GIF) er tillatt.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

admin.get('/leads', (req, res) => res.json(store.getLeads()));

admin.delete('/leads/:id', (req, res) => {
  if (!store.deleteLead(req.params.id)) return res.status(404).json({ error: 'Fant ikke henvendelsen' });
  res.json({ ok: true });
});

admin.get('/leads.csv', (req, res) => {
  const cols = ['createdAt', 'name', 'email', 'company', 'employees', 'message'];
  const header = ['Dato', 'Navn', 'E-post', 'Bedrift', 'Antall ansatte', 'Hva driver dere med'];
  // Prefix formula-like values so spreadsheets don't execute them.
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = store.getLeads().map((l) => cols.map((c) => cell(c === 'createdAt' ? new Date(l[c]).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' }) : l[c])).join(';'));
  res
    .set('Content-Disposition', `attachment; filename="henvendelser-${new Date().toISOString().slice(0, 10)}.csv"`)
    .type('text/csv; charset=utf-8')
    .send(`﻿${[header.map(cell).join(';'), ...rows].join('\r\n')}`);
});

// The SMTP password is never sent back to the browser.
const publicEmailSettings = () => {
  const { smtp, ...rest } = store.getPrivate().email;
  const { pass, ...smtpRest } = smtp;
  return { ...rest, smtp: { ...smtpRest, hasPass: Boolean(pass) } };
};

admin.get('/email', (req, res) => res.json(publicEmailSettings()));

admin.put('/email', (req, res) => {
  const b = req.body || {};
  const current = store.getPrivate().email;
  const recipients = (Array.isArray(b.recipients) ? b.recipients : String(b.recipients ?? '').split(/[,;\s]+/))
    .map((r) => oneLine(r, 200))
    .filter(Boolean);
  const bad = recipients.find((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
  if (bad) return res.status(400).json({ error: `Ugyldig e-postadresse: ${bad}` });
  const s = b.smtp || {};
  store.updatePrivate({
    email: {
      enabled: Boolean(b.enabled),
      recipients: recipients.slice(0, 10),
      smtp: {
        host: oneLine(s.host, 200),
        port: Number(s.port) || 587,
        secure: Boolean(s.secure),
        user: oneLine(s.user, 200),
        // Empty field means "keep the saved password".
        pass: s.pass ? String(s.pass).slice(0, 500) : current.smtp.pass,
        from: oneLine(s.from, 200),
      },
    },
  });
  res.json(publicEmailSettings());
});

admin.post('/email/test', async (req, res) => {
  try {
    await sendTestEmail();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

admin.post('/password', (req, res) => {
  const { current, next } = req.body || {};
  if (!verifyPassword(current ?? '', store.getPrivate().passwordHash)) {
    return res.status(400).json({ error: 'Nåværende passord er feil' });
  }
  if (String(next ?? '').length < 10) return res.status(400).json({ error: 'Nytt passord må ha minst 10 tegn' });
  store.updatePrivate({ passwordHash: hashPassword(next) });
  auth.startSession(res);
  res.json({ ok: true });
});

app.use('/api/admin', admin);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Bildet er for stort (maks 15 MB).' : err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Serverfeil' });
});

app.listen(PORT, () => {
  console.log(`Ferrobygget kjører på http://localhost:${PORT}  (admin: http://localhost:${PORT}/admin)`);
});

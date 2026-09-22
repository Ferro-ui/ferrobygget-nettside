import nodemailer from 'nodemailer';
import * as store from './store.js';

const isConfigured = (e) => e.enabled && e.recipients.length > 0 && e.smtp.host;

function transport(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port) || 587,
    secure: Boolean(smtp.secure),
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
}

// Fire-and-forget from the lead endpoint: returns false when notifications are off.
export async function sendLeadEmail(lead) {
  const e = store.getPrivate().email;
  if (!isConfigured(e)) return false;
  const lines = [
    `Navn: ${lead.name}`,
    `E-post: ${lead.email}`,
    `Bedrift: ${lead.company || '–'}`,
    `Antall ansatte: ${lead.employees || '–'}`,
    `Hva driver dere med: ${lead.message || '–'}`,
    '',
    `Mottatt: ${new Date(lead.createdAt).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}`,
  ];
  await transport(e.smtp).sendMail({
    from: e.smtp.from || e.smtp.user,
    to: e.recipients.join(', '),
    replyTo: lead.email,
    subject: `Ny interesse fra nettsiden: ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
    text: lines.join('\n'),
  });
  return true;
}

export async function sendTestEmail() {
  const e = store.getPrivate().email;
  if (!e.recipients.length || !e.smtp.host) throw new Error('Fyll inn SMTP-server og minst én mottaker først.');
  await transport(e.smtp).sendMail({
    from: e.smtp.from || e.smtp.user,
    to: e.recipients.join(', '),
    subject: 'Testmelding fra Ferrobygget-nettsiden',
    text: 'E-postvarsling fungerer. Nye henvendelser fra skjemaet sendes til denne adressen.',
  });
}

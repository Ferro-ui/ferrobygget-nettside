// Coerces admin-submitted content into the known shape, so the renderer can trust it.
import crypto from 'node:crypto';

export const SECTION_TYPES = ['split', 'icons', 'cards', 'text'];
export const THEMES = ['light', 'white', 'dark'];
export const SPACINGS = ['compact', 'normal', 'airy'];

const str = (v, max = 2000) => String(v ?? '').slice(0, max);
const line = (v, max = 200) => str(v, max).replace(/[\r\n]+/g, ' ');
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

// Only same-page anchors, site-relative paths, http(s), mailto and tel — never javascript: etc.
export function safeLink(v) {
  const s = line(v, 1000).trim();
  return /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(s) ? s : '';
}

export function safeImage(v) {
  const s = line(v, 1000).trim();
  return /^(https?:\/\/|\/uploads\/)/i.test(s) ? s : '';
}

export const safeIcon = (v) => line(v, 80).replace(/[^a-z0-9\- ]/gi, '').trim();
const anchor = (v) => line(v, 40).toLowerCase().replace(/[^a-z0-9-]/g, '');
const button = (b) => ({ text: line(b?.text, 80), link: safeLink(b?.link) });
const items = (v) => arr(v, 24).map((i) => ({ icon: safeIcon(i?.icon), text: line(i?.text, 120) }));

export function sanitizeContent(c = {}) {
  const s = c.settings || {};
  const hero = c.hero || {};
  const contact = c.contact || {};

  const usedIds = new Set();
  const sections = arr(c.sections, 30).map((sec = {}) => {
    let id = line(sec.id, 20).replace(/[^a-z0-9]/gi, '');
    if (!id || usedIds.has(id)) id = crypto.randomBytes(4).toString('hex');
    usedIds.add(id);
    return {
      id,
      type: oneOf(sec.type, SECTION_TYPES, 'text'),
      enabled: sec.enabled !== false,
      navLabel: line(sec.navLabel, 40),
      anchor: anchor(sec.anchor) || id,
      theme: oneOf(sec.theme, THEMES, 'light'),
      title: line(sec.title, 200),
      text: str(sec.text, 3000),
      button: button(sec.button),
      image: safeImage(sec.image),
      imageAlt: line(sec.imageAlt, 200),
      imagePosition: oneOf(sec.imagePosition, ['left', 'right'], 'right'),
      items: items(sec.items),
      cards: arr(sec.cards, 6).map((k) => ({
        title: line(k?.title, 120),
        text: str(k?.text, 600),
        linkText: line(k?.linkText, 60),
        link: safeLink(k?.link),
      })),
    };
  });

  return {
    settings: {
      metaTitle: line(s.metaTitle, 200),
      metaDescription: line(s.metaDescription, 400),
      logoBold: line(s.logoBold, 30),
      logoItalic: line(s.logoItalic, 30),
      navCta: button(s.navCta),
      spacing: oneOf(s.spacing, SPACINGS, 'normal'),
      address: line(s.address, 200),
      email: line(s.email, 200),
      phone: line(s.phone, 50),
      social: {
        linkedin: safeLink(s.social?.linkedin),
        facebook: safeLink(s.social?.facebook),
        instagram: safeLink(s.social?.instagram),
      },
    },
    hero: {
      navLabel: line(hero.navLabel, 40),
      titleLine1: line(hero.titleLine1, 120),
      titleLine2: line(hero.titleLine2, 120),
      subtitle: str(hero.subtitle, 600),
      button: button(hero.button),
      secondaryLinkText: line(hero.secondaryLinkText, 60),
      image: safeImage(hero.image),
      stats: items(hero.stats).slice(0, 6),
    },
    sections,
    contact: {
      anchor: anchor(contact.anchor) || 'kontakt',
      title: line(contact.title, 120),
      text: str(contact.text, 1000),
      buttonText: line(contact.buttonText, 60),
      successText: line(contact.successText, 300),
      messagePlaceholder: line(contact.messagePlaceholder, 120),
      employeeOptions: arr(contact.employeeOptions, 12).map((o) => line(o, 40)).filter(Boolean),
    },
  };
}

// Ferrobygget admin panel — vanilla JS, no build step.

// ---- Helpers ------------------------------------------------------------------

async function api(method, url, body, { form = false } = {}) {
  const opts = { method, headers: { 'X-Admin': '1' }, credentials: 'same-origin' };
  if (body !== undefined) {
    if (form) opts.body = body;
    else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(url, opts);
  const data = (res.headers.get('content-type') || '').includes('json') ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error(data?.error || `Feil (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// FontAwesome swaps <i> for <svg>, so icons are (re)created via a fresh wrapper.
const iconSafe = (cls) => String(cls || '').replace(/[^a-z0-9\- ]/gi, '');
function icon(cls) {
  const span = h('span');
  span.innerHTML = `<i class="${iconSafe(cls)}"></i>`;
  return span;
}

let toastTimer;
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show${isError ? ' err' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 3200);
}

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
};
const uid = () => Math.random().toString(36).slice(2, 10);

// ---- State ----------------------------------------------------------------------

const state = {
  content: null,
  tab: 'hero',
  dirty: false,
  openSection: null,
  leadsCount: 0,
  showPreview: window.matchMedia('(min-width: 1281px)').matches,
  device: (() => { try { return localStorage.getItem('fb-preview-device') || 'desktop'; } catch { return 'desktop'; } })(),
};

function markDirty() {
  if (!state.dirty) {
    state.dirty = true;
    renderTopbar();
  }
}

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ---- Field components ------------------------------------------------------------

function field(label, input, hint) {
  // Only wrap single form controls in <label>; a label around buttons would "click" them.
  const simple = input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement;
  return h(simple ? 'label' : 'div', { class: 'field' }, h('span', null, label), input, hint && h('small', null, hint));
}

function text(obj, key, { multiline = false, rows = 4, placeholder = '', onInput } = {}) {
  const el = multiline
    ? h('textarea', { class: 'inp', rows, placeholder })
    : h('input', { class: 'inp', type: 'text', placeholder });
  el.value = obj[key] ?? '';
  el.addEventListener('input', () => {
    obj[key] = el.value;
    markDirty();
    onInput?.(el.value);
  });
  return el;
}

function select(obj, key, options, { onChange } = {}) {
  const el = h('select', { class: 'inp' }, options.map(([v, label]) => h('option', { value: v }, label)));
  el.value = obj[key];
  el.addEventListener('change', () => {
    obj[key] = el.value;
    markDirty();
    onChange?.(el.value);
  });
  return el;
}

function linkFields(obj, key, labels = ['Knappetekst', 'Lenke']) {
  obj[key] ||= { text: '', link: '' };
  return h(
    'div',
    { class: 'grid2' },
    field(labels[0], text(obj[key], 'text'), 'La stå tom for å skjule knappen.'),
    field(labels[1], text(obj[key], 'link', { placeholder: '#kontakt' }), 'F.eks. #kontakt, https://… eller mailto:…'),
  );
}

function imageField(obj, key) {
  const thumb = h('div', { class: 'img-thumb' });
  const url = text(obj, key, { placeholder: 'https://… eller last opp', onInput: () => paint() });
  const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif,image/gif', hidden: true });
  const uploadBtn = h('button', { type: 'button', class: 'btn sm dark', onclick: () => file.click() }, icon('fa-solid fa-upload'), 'Last opp bilde');
  const removeBtn = h('button', { type: 'button', class: 'btn sm danger', onclick: () => { obj[key] = ''; url.value = ''; markDirty(); paint(); } }, 'Fjern');

  function paint() {
    const src = obj[key];
    thumb.style.backgroundImage = src ? `url("${src.replace(/"/g, '%22')}")` : '';
    thumb.replaceChildren(src ? '' : icon('fa-regular fa-image'));
    removeBtn.hidden = !src;
  }

  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    uploadBtn.disabled = true;
    uploadBtn.lastChild.textContent = 'Laster opp …';
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { url: uploaded } = await api('POST', '/api/admin/upload', fd, { form: true });
      obj[key] = uploaded;
      url.value = uploaded;
      markDirty();
      paint();
      toast('Bildet er lastet opp – husk å lagre');
    } catch (err) {
      toast(err.message, true);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.lastChild.textContent = 'Last opp bilde';
      file.value = '';
    }
  });

  paint();
  return h('div', { class: 'img-field' }, thumb, h('div', { class: 'col' }, h('div', { class: 'row' }, uploadBtn, removeBtn), url, file));
}

const ICON_SUGGESTIONS = [
  'fa-regular fa-building', 'fa-solid fa-building', 'fa-solid fa-user-group', 'fa-solid fa-people-group', 'fa-solid fa-users-line',
  'fa-solid fa-location-dot', 'fa-solid fa-seedling', 'fa-solid fa-expand', 'fa-solid fa-couch', 'fa-solid fa-lock',
  'fa-regular fa-clock', 'fa-solid fa-wifi', 'fa-solid fa-mug-hot', 'fa-solid fa-print', 'fa-solid fa-broom',
  'fa-solid fa-square-parking', 'fa-solid fa-bolt', 'fa-solid fa-shirt', 'fa-regular fa-lightbulb', 'fa-solid fa-network-wired',
  'fa-regular fa-heart', 'fa-solid fa-mountain', 'fa-regular fa-calendar-check', 'fa-solid fa-utensils', 'fa-solid fa-dumbbell',
  'fa-solid fa-bicycle', 'fa-solid fa-shower', 'fa-solid fa-key', 'fa-solid fa-shield-halved', 'fa-solid fa-leaf',
  'fa-solid fa-sun', 'fa-solid fa-tree', 'fa-solid fa-train', 'fa-solid fa-car', 'fa-solid fa-phone', 'fa-regular fa-envelope',
  'fa-solid fa-chalkboard-user', 'fa-solid fa-display', 'fa-solid fa-handshake', 'fa-solid fa-star', 'fa-solid fa-check',
  'fa-solid fa-industry', 'fa-solid fa-hammer', 'fa-solid fa-helmet-safety', 'fa-solid fa-truck', 'fa-solid fa-gem',
];
document.body.append(h('datalist', { id: 'fa-icons' }, ICON_SUGGESTIONS.map((v) => h('option', { value: v }))));

// Rows of { icon, text } with add / reorder / remove.
function iconList(arr, { max = 24, addLabel = 'Legg til punkt' } = {}) {
  const wrap = h('div');
  const paint = () => {
    wrap.replaceChildren(
      ...arr.map((item, i) => {
        const prev = h('div', { class: 'icon-prev' }, icon(item.icon));
        const iconInp = text(item, 'icon', { placeholder: 'fa-solid fa-check', onInput: (v) => prev.replaceChildren(icon(v)) });
        iconInp.classList.add('icon-inp');
        iconInp.setAttribute('list', 'fa-icons');
        iconInp.setAttribute('title', 'Ikon (Font Awesome-klasse)');
        const txt = text(item, 'text', { placeholder: 'Tekst' });
        txt.classList.add('grow');
        return h(
          'div',
          { class: 'list-row' },
          prev,
          iconInp,
          txt,
          h('button', { type: 'button', class: 'icon-btn', title: 'Flytt opp', disabled: i === 0, onclick: () => { move(arr, i, -1); markDirty(); paint(); } }, icon('fa-solid fa-arrow-up')),
          h('button', { type: 'button', class: 'icon-btn', title: 'Flytt ned', disabled: i === arr.length - 1, onclick: () => { move(arr, i, 1); markDirty(); paint(); } }, icon('fa-solid fa-arrow-down')),
          h('button', { type: 'button', class: 'icon-btn danger', title: 'Fjern', onclick: () => { arr.splice(i, 1); markDirty(); paint(); } }, icon('fa-solid fa-xmark')),
        );
      }),
      arr.length < max
        ? h('button', { type: 'button', class: 'btn sm', onclick: () => { arr.push({ icon: 'fa-solid fa-check', text: '' }); markDirty(); paint(); } }, icon('fa-solid fa-plus'), addLabel)
        : null,
    );
  };
  paint();
  return h('div', null, wrap, h('small', { style: 'display:block;color:#8b8d84;margin-top:8px;font-size:12px' }, 'Ikoner: skriv/velg en Font Awesome-klasse. Flere finnes på fontawesome.com/icons (gratis-ikoner).'));
}

function cardList(arr) {
  const wrap = h('div');
  const paint = () => {
    wrap.replaceChildren(
      ...arr.map((card, i) =>
        h(
          'div',
          { class: 'list-card' },
          h(
            'div',
            { class: 'tools' },
            h('button', { type: 'button', class: 'icon-btn', title: 'Flytt opp', disabled: i === 0, onclick: () => { move(arr, i, -1); markDirty(); paint(); } }, icon('fa-solid fa-arrow-up')),
            h('button', { type: 'button', class: 'icon-btn', title: 'Flytt ned', disabled: i === arr.length - 1, onclick: () => { move(arr, i, 1); markDirty(); paint(); } }, icon('fa-solid fa-arrow-down')),
            h('button', { type: 'button', class: 'icon-btn danger', title: 'Fjern', onclick: () => { arr.splice(i, 1); markDirty(); paint(); } }, icon('fa-solid fa-xmark')),
          ),
          field('Overskrift', text(card, 'title')),
          field('Tekst', text(card, 'text', { multiline: true, rows: 2 })),
          h('div', { class: 'grid2' }, field('Lenketekst (valgfritt)', text(card, 'linkText')), field('Lenke', text(card, 'link', { placeholder: 'https://…' }))),
        ),
      ),
      arr.length < 6
        ? h('button', { type: 'button', class: 'btn sm', onclick: () => { arr.push({ title: '', text: '', linkText: '', link: '' }); markDirty(); paint(); } }, icon('fa-solid fa-plus'), 'Legg til kort')
        : null,
    );
  };
  paint();
  return wrap;
}

// ---- Views ---------------------------------------------------------------------

const SECTION_TYPES = {
  split: { label: 'Tekst + bilde + punkter', desc: 'Som «Ditt eget kontor»: tekst, et stort bilde og en liste med ikoner.' },
  icons: { label: 'Ikon-rutenett', desc: 'Som «Uten alt styret»: tekst og et rutenett med ikoner (fasiliteter).' },
  cards: { label: 'Tekst + bilde + kort', desc: 'Som «Ulefoss»: tekst, bilde og små tekstkort med lenker.' },
  text: { label: 'Kun tekst', desc: 'Enkel seksjon med overskrift, tekst og knapp.' },
};
const THEMES = [['light', 'Lys (offwhite)'], ['white', 'Hvit'], ['dark', 'Mørk']];

function viewHero() {
  const hero = state.content.hero;
  return [
    h('h2', null, 'Forside (toppbilde)'),
    h('p', { class: 'lead' }, 'Det første besøkende ser: stor overskrift, kort tekst, knapp og bakgrunnsbilde.'),
    h('div', { class: 'card' }, h('h3', null, 'Bakgrunnsbilde'), imageField(hero, 'image'), h('small', { style: 'display:block;color:#8b8d84;margin-top:10px;font-size:12px' }, 'Bruk et liggende bilde, minst 2000 px bredt. Bildet dempes automatisk slik at teksten blir lesbar.')),
    h(
      'div',
      { class: 'card' },
      h('h3', null, 'Tekst'),
      field('Overskrift – linje 1', text(hero, 'titleLine1')),
      field('Overskrift – linje 2 (kursiv)', text(hero, 'titleLine2')),
      field('Undertekst', text(hero, 'subtitle', { multiline: true, rows: 3 })),
      linkFields(hero, 'button'),
      h('div', { class: 'grid2' }, field('Tekst på «se mer»-lenken', text(hero, 'secondaryLinkText')), field('Menytekst for forsiden', text(hero, 'navLabel'), 'Vises i menyen. Tom = skjult.')),
    ),
    h('div', { class: 'card' }, h('h3', null, 'Nøkkelinformasjon (stripe nederst)'), iconList(hero.stats, { max: 6 })),
  ];
}

function sectionBody(sec) {
  const typeInfo = SECTION_TYPES[sec.type];
  return h(
    'div',
    { class: 'section-body' },
    h('div', { class: 'grid2' },
      field('Seksjonstype', select(sec, 'type', Object.entries(SECTION_TYPES).map(([k, v]) => [k, v.label]), { onChange: () => renderMain() }), typeInfo.desc),
      field('Bakgrunn', select(sec, 'theme', THEMES, { onChange: () => renderMain() })),
    ),
    field('Overskrift', text(sec, 'title', { onInput: (v) => { const t = document.querySelector(`[data-sec-title="${sec.id}"]`); if (t) t.textContent = v || '(uten overskrift)'; } })),
    field('Tekst', text(sec, 'text', { multiline: true, rows: 4 })),
    linkFields(sec, 'button'),
    sec.type === 'split' || sec.type === 'cards'
      ? h('div', null,
          field('Bilde', imageField(sec, 'image')),
          h('div', { class: 'grid2' },
            field('Bildets plassering', select(sec, 'imagePosition', [['right', 'Til høyre for teksten'], ['left', 'Til venstre for teksten']])),
            field('Bildebeskrivelse (alt-tekst)', text(sec, 'imageAlt'), 'For skjermlesere og Google.'),
          ),
        )
      : null,
    sec.type === 'split' || sec.type === 'icons' ? field(sec.type === 'icons' ? 'Ikoner' : 'Punkter', iconList(sec.items)) : null,
    sec.type === 'cards' ? field('Kort', cardList(sec.cards)) : null,
    h('div', { class: 'grid2' },
      field('Menytekst', text(sec, 'navLabel'), 'Tom = vises ikke i menyen.'),
      field('Anker (adresse)', text(sec, 'anchor', { placeholder: 'f.eks. kontor' }), 'Brukes i lenker: #anker. Kun små bokstaver, tall og bindestrek.'),
    ),
  );
}

function newSection(type) {
  return {
    id: uid(),
    type,
    enabled: true,
    navLabel: '',
    anchor: `seksjon-${uid().slice(0, 4)}`,
    theme: 'light',
    title: 'Ny seksjon',
    text: '',
    button: { text: '', link: '#kontakt' },
    image: '',
    imageAlt: '',
    imagePosition: 'right',
    items: type === 'split' || type === 'icons' ? [{ icon: 'fa-solid fa-check', text: 'Punkt' }] : [],
    cards: type === 'cards' ? [{ title: 'Kort', text: '', linkText: '', link: '' }] : [],
  };
}

function viewSections() {
  const secs = state.content.sections;
  let n = 0;
  const cards = secs.map((sec, i) => {
    const open = state.openSection === sec.id;
    const number = sec.enabled ? String(++n).padStart(2, '0') : '–';
    const head = h(
      'div',
      { class: 'section-head', onclick: () => { state.openSection = open ? null : sec.id; renderMain(); } },
      h('span', { class: 'num' }, number),
      icon(open ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'),
      h('span', { class: 'title', 'data-sec-title': sec.id }, sec.title || '(uten overskrift)'),
      h('span', { class: `pill ${sec.theme === 'dark' ? 'dark' : ''}` }, SECTION_TYPES[sec.type].label),
      !sec.enabled && h('span', { class: 'pill off' }, 'Skjult'),
      h('span', { onclick: (e) => e.stopPropagation(), style: 'display:flex;gap:2px' },
        h('button', { type: 'button', class: 'icon-btn', title: 'Vis i forhåndsvisning', onclick: () => scrollPreview(sec.anchor) }, icon('fa-regular fa-eye')),
        h('button', { type: 'button', class: 'icon-btn', title: sec.enabled ? 'Skjul på nettsiden' : 'Vis på nettsiden', onclick: () => { sec.enabled = !sec.enabled; markDirty(); renderMain(); } }, icon(sec.enabled ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off')),
        h('button', { type: 'button', class: 'icon-btn', title: 'Flytt opp', disabled: i === 0, onclick: () => { move(secs, i, -1); markDirty(); renderMain(); } }, icon('fa-solid fa-arrow-up')),
        h('button', { type: 'button', class: 'icon-btn', title: 'Flytt ned', disabled: i === secs.length - 1, onclick: () => { move(secs, i, 1); markDirty(); renderMain(); } }, icon('fa-solid fa-arrow-down')),
        h('button', { type: 'button', class: 'icon-btn', title: 'Dupliser', onclick: () => { const copy = { ...structuredClone(sec), id: uid(), anchor: `${sec.anchor}-kopi`, title: `${sec.title} (kopi)` }; secs.splice(i + 1, 0, copy); state.openSection = copy.id; markDirty(); renderMain(); } }, icon('fa-regular fa-copy')),
        h('button', { type: 'button', class: 'icon-btn danger', title: 'Slett', onclick: () => { if (confirm(`Slette seksjonen «${sec.title || 'uten overskrift'}»?`)) { secs.splice(i, 1); markDirty(); renderMain(); } } }, icon('fa-regular fa-trash-can')),
      ),
    );
    return h('div', { class: `section-card${sec.enabled ? '' : ' disabled'}` }, head, open && sectionBody(sec));
  });

  return [
    h('h2', null, 'Seksjoner'),
    h('p', { class: 'lead' }, 'Innholdet mellom toppbildet og kontaktskjemaet. Klikk på en seksjon for å redigere. Nummereringen (01, 02 …) settes automatisk.'),
    ...cards,
    h('div', { class: 'add-section' },
      h('strong', { style: 'width:100%' }, 'Legg til ny seksjon'),
      h('div', { class: 'type-choices' },
        Object.entries(SECTION_TYPES).map(([type, info]) =>
          h('button', { type: 'button', class: 'type-choice', onclick: () => { const s = newSection(type); secs.push(s); state.openSection = s.id; markDirty(); renderMain(); } }, h('b', null, info.label), h('small', null, info.desc)),
        ),
      ),
    ),
  ];
}

function viewContact() {
  const c = state.content.contact;
  const optsInp = h('textarea', { class: 'inp', rows: 5 });
  optsInp.value = c.employeeOptions.join('\n');
  optsInp.addEventListener('input', () => {
    c.employeeOptions = optsInp.value.split('\n').map((s) => s.trim()).filter(Boolean);
    markDirty();
  });
  return [
    h('h2', null, 'Kontaktskjema'),
    h('p', { class: 'lead' }, 'Skjemaet «Interessert?» nederst på siden. Innsendte skjema finner du under Henvendelser.'),
    h('div', { class: 'card' },
      field('Overskrift', text(c, 'title')),
      field('Tekst', text(c, 'text', { multiline: true, rows: 3 })),
      h('div', { class: 'grid2' }, field('Knappetekst', text(c, 'buttonText')), field('Anker', text(c, 'anchor'), 'Knapper som lenker til #kontakt havner her.')),
      field('Takkemelding etter innsending', text(c, 'successText')),
      field('Plassholder i siste felt', text(c, 'messagePlaceholder')),
      field('Valg for «Antall ansatte»', optsInp, 'Ett valg per linje.'),
    ),
  ];
}

function viewGeneral() {
  const s = state.content.settings;
  return [
    h('h2', null, 'Generelt'),
    h('p', { class: 'lead' }, 'Logo, meny, luft mellom seksjonene, kontaktinfo i bunnen og informasjon til Google.'),
    h('div', { class: 'card' },
      h('h3', null, 'Utseende'),
      field('Luft rundt seksjonene', select(s, 'spacing', [['compact', 'Kompakt'], ['normal', 'Normal'], ['airy', 'Luftig']])),
      h('div', { class: 'grid2' }, field('Logo – fet del', text(s, 'logoBold')), field('Logo – kursiv del', text(s, 'logoItalic'))),
      linkFields(s, 'navCta', ['Knapp i menyen', 'Lenke']),
    ),
    h('div', { class: 'card' },
      h('h3', null, 'Kontaktinfo (bunnen av siden)'),
      field('Adresse', text(s, 'address')),
      h('div', { class: 'grid2' }, field('E-post', text(s, 'email')), field('Telefon', text(s, 'phone'))),
      h('div', { class: 'grid2' },
        field('LinkedIn', text(s.social, 'linkedin', { placeholder: 'https://linkedin.com/company/…' })),
        field('Facebook', text(s.social, 'facebook', { placeholder: 'https://facebook.com/…' })),
      ),
      field('Instagram', text(s.social, 'instagram', { placeholder: 'https://instagram.com/…' }), 'Tomt felt = ikonet skjules.'),
    ),
    h('div', { class: 'card' },
      h('h3', null, 'Google og deling'),
      field('Sidetittel', text(s, 'metaTitle'), 'Vises i nettleserfanen og i Google-treff.'),
      field('Beskrivelse', text(s, 'metaDescription', { multiline: true, rows: 3 }), 'Ca. 150 tegn. Vises under tittelen i Google.'),
    ),
  ];
}

function viewEmail() {
  const root = h('div', null, h('p', null, 'Laster …'));
  api('GET', '/api/admin/email').then((e) => {
    const form = { enabled: e.enabled, recipients: e.recipients.join(', '), smtp: { ...e.smtp, pass: '' } };
    const err = h('p', { class: 'error' });
    const save = async () => {
      err.textContent = '';
      try {
        await api('PUT', '/api/admin/email', form);
        toast('E-postinnstillinger lagret');
        renderMain();
      } catch (ex) {
        err.textContent = ex.message;
      }
    };
    const test = async (btn) => {
      err.textContent = '';
      btn.disabled = true;
      try {
        await api('PUT', '/api/admin/email', form);
        await api('POST', '/api/admin/email/test');
        toast('Testmelding sendt');
      } catch (ex) {
        err.textContent = ex.message;
      } finally {
        btn.disabled = false;
      }
    };
    root.replaceChildren(
      e.enabled && e.smtp.host
        ? h('div', { class: 'notice ok' }, 'E-postvarsling er på. Nye henvendelser sendes til ', h('b', null, e.recipients.join(', ') || '–'), '.')
        : h('div', { class: 'notice' }, 'E-postvarsling er av. Henvendelser lagres og vises under «Henvendelser», men det sendes ingen e-post.'),
      h('div', { class: 'card' },
        h('h3', null, 'Varsling'),
        checkboxPlain(form, 'enabled', 'Send e-post når noen fyller ut skjemaet'),
        field('Mottakere', plainText(form, 'recipients', 'post@ferrobygget.no, navn@firma.no'), 'Én eller flere adresser, skilt med komma.'),
      ),
      h('div', { class: 'card' },
        h('h3', null, 'Utgående e-post (SMTP)'),
        h('div', { class: 'grid2' }, field('SMTP-server', plainText(form.smtp, 'host', 'smtp.office365.com')), field('Port', plainText(form.smtp, 'port', '587'))),
        checkboxPlain(form.smtp, 'secure', 'Bruk SSL/TLS direkte (vanligvis kun for port 465)'),
        h('div', { class: 'grid2' },
          field('Brukernavn', plainText(form.smtp, 'user', 'post@ferrobygget.no')),
          field('Passord', plainText(form.smtp, 'pass', e.smtp.hasPass ? '•••••••• (lagret – la stå tomt for å beholde)' : '', 'password')),
        ),
        field('Avsender', plainText(form.smtp, 'from', 'Ferrobygget <post@ferrobygget.no>'), 'Tomt = samme som brukernavn.'),
        h('div', { style: 'display:flex;gap:10px' },
          h('button', { type: 'button', class: 'btn primary', onclick: save }, 'Lagre e-postinnstillinger'),
          h('button', { type: 'button', class: 'btn', onclick: (ev) => test(ev.currentTarget) }, 'Lagre og send testmelding'),
        ),
        err,
      ),
    );
  }).catch((ex) => root.replaceChildren(h('p', { class: 'error' }, ex.message)));
  return [h('h2', null, 'E-postvarsling'), h('p', { class: 'lead' }, 'Få beskjed på e-post når noen melder interesse. Dette lagres separat med egen knapp.'), root];
}

// Inputs for forms that are saved on their own (don't flag content as dirty).
function plainText(obj, key, placeholder = '', type = 'text') {
  const el = h('input', { class: 'inp', type, placeholder, autocomplete: type === 'password' ? 'new-password' : 'off' });
  el.value = obj[key] ?? '';
  el.addEventListener('input', () => (obj[key] = el.value));
  return el;
}
function checkboxPlain(obj, key, label) {
  const input = h('input', { type: 'checkbox' });
  input.checked = Boolean(obj[key]);
  input.addEventListener('change', () => (obj[key] = input.checked));
  return h('label', { class: 'check' }, input, label);
}

function viewLeads() {
  const root = h('div', null, h('p', null, 'Laster …'));
  const load = () =>
    api('GET', '/api/admin/leads').then((leads) => {
      state.leadsCount = leads.length;
      renderSidebar();
      if (!leads.length) return root.replaceChildren(h('div', { class: 'table-wrap' }, h('div', { class: 'empty' }, 'Ingen henvendelser ennå.')));
      const fmt = (iso) => new Date(iso).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' });
      root.replaceChildren(
        h('div', { style: 'margin-bottom:12px' }, h('a', { class: 'btn', href: '/api/admin/leads.csv' }, icon('fa-solid fa-file-arrow-down'), 'Last ned som CSV (Excel)')),
        h('div', { class: 'table-wrap' },
          h('table', null,
            h('thead', null, h('tr', null, ['Dato', 'Navn', 'E-post', 'Bedrift', 'Ansatte', 'Hva driver dere med', ''].map((t) => h('th', null, t)))),
            h('tbody', null,
              leads.map((l) =>
                h('tr', null,
                  h('td', { style: 'white-space:nowrap' }, fmt(l.createdAt)),
                  h('td', null, l.name),
                  h('td', null, h('a', { href: `mailto:${l.email}` }, l.email)),
                  h('td', null, l.company || '–'),
                  h('td', null, l.employees || '–'),
                  h('td', { class: 'msg' }, l.message || '–'),
                  h('td', null, h('button', { type: 'button', class: 'icon-btn danger', title: 'Slett', onclick: async () => {
                    if (!confirm(`Slette henvendelsen fra ${l.name}?`)) return;
                    try { await api('DELETE', `/api/admin/leads/${l.id}`); toast('Slettet'); load(); } catch (ex) { toast(ex.message, true); }
                  } }, icon('fa-regular fa-trash-can'))),
                ),
              ),
            ),
          ),
        ),
      );
    }).catch((ex) => root.replaceChildren(h('p', { class: 'error' }, ex.message)));
  load();
  return [h('h2', null, 'Henvendelser'), h('p', { class: 'lead' }, 'Alle som har fylt ut «Meld interesse»-skjemaet, nyeste først.'), root];
}

function viewPassword() {
  const form = { current: '', next: '', repeat: '' };
  const err = h('p', { class: 'error' });
  const submit = async () => {
    err.textContent = '';
    if (form.next !== form.repeat) return (err.textContent = 'De nye passordene er ikke like.');
    try {
      await api('POST', '/api/admin/password', { current: form.current, next: form.next });
      toast('Passordet er endret');
      renderMain();
    } catch (ex) {
      err.textContent = ex.message;
    }
  };
  return [
    h('h2', null, 'Passord'),
    h('p', { class: 'lead' }, 'Når passordet endres, logges alle andre enheter ut.'),
    h('div', { class: 'card', style: 'max-width:440px' },
      field('Nåværende passord', plainText(form, 'current', '', 'password')),
      field('Nytt passord', plainText(form, 'next', 'Minst 10 tegn', 'password')),
      field('Gjenta nytt passord', plainText(form, 'repeat', '', 'password')),
      h('button', { type: 'button', class: 'btn primary', onclick: submit }, 'Endre passord'),
      err,
    ),
  ];
}

const TABS = [
  { group: 'Innhold' },
  { id: 'hero', label: 'Forside', icon: 'fa-solid fa-house', view: viewHero },
  { id: 'sections', label: 'Seksjoner', icon: 'fa-solid fa-layer-group', view: viewSections },
  { id: 'contact', label: 'Kontaktskjema', icon: 'fa-regular fa-pen-to-square', view: viewContact },
  { id: 'general', label: 'Generelt', icon: 'fa-solid fa-sliders', view: viewGeneral },
  { group: 'Innboks' },
  { id: 'leads', label: 'Henvendelser', icon: 'fa-regular fa-envelope-open', view: viewLeads, badge: () => state.leadsCount },
  { group: 'Innstillinger' },
  { id: 'email', label: 'E-postvarsling', icon: 'fa-solid fa-bell', view: viewEmail },
  { id: 'password', label: 'Passord', icon: 'fa-solid fa-key', view: viewPassword },
];

// ---- Shell ---------------------------------------------------------------------

let els = {};

function renderTopbar() {
  els.topbar.replaceChildren(
    ...[
    h('span', { class: 'logo' }, h('b', null, state.content.settings.logoBold || 'FERRO'), h('i', null, state.content.settings.logoItalic || 'bygget')),
    h('span', { class: 'lbl', style: 'opacity:.6;font-size:12px' }, 'Administrasjon'),
    h('span', { class: 'spacer' }),
    state.dirty && h('span', { class: 'dirty', title: 'Ulagrede endringer' }, icon('fa-solid fa-circle-exclamation'), h('span', { class: 'lbl' }, ' Ulagrede endringer')),
    h('a', { class: 'btn ghost sm', href: '/', target: '_blank', rel: 'noopener', title: 'Åpne nettsiden' }, icon('fa-solid fa-arrow-up-right-from-square'), h('span', { class: 'lbl' }, 'Åpne nettsiden')),
    h('button', { type: 'button', class: `btn ghost sm${state.showPreview ? ' on' : ''}`, title: 'Forhåndsvisning', onclick: () => { state.showPreview = !state.showPreview; renderBodyLayout(); } }, icon('fa-regular fa-eye'), h('span', { class: 'lbl' }, 'Forhåndsvisning')),
    h('button', { type: 'button', class: 'btn primary', disabled: !state.dirty, onclick: save }, icon('fa-solid fa-floppy-disk'), h('span', { class: 'lbl-sm' }, 'Lagre og publiser'), h('span', { class: 'lbl-xs' }, 'Lagre')),
    h('button', { type: 'button', class: 'btn ghost sm', title: 'Logg ut', onclick: logout }, icon('fa-solid fa-right-from-bracket')),
    ].filter(Boolean),
  );
}

function renderSidebar() {
  els.sidebar.replaceChildren(
    ...TABS.map((t) =>
      t.group
        ? h('h6', null, t.group)
        : h('button', { type: 'button', class: `tab${state.tab === t.id ? ' active' : ''}`, onclick: () => { state.tab = t.id; renderSidebar(); renderMain(); els.main.scrollTop = 0; } },
            icon(t.icon), t.label, t.badge && t.badge() ? h('span', { class: 'badge' }, t.badge()) : null),
    ),
  );
}

function renderMain() {
  const tab = TABS.find((t) => t.id === state.tab);
  const scroll = els.main.scrollTop;
  els.main.replaceChildren(...tab.view());
  els.main.scrollTop = scroll;
}

function renderBodyLayout() {
  els.body.classList.toggle('no-preview', !state.showPreview);
  els.preview.hidden = !state.showPreview;
  document.body.classList.toggle('preview-overlay-open', state.showPreview);
  renderTopbar();
  fitPreview();
}

// ---- Device preview --------------------------------------------------------------
// The site is rendered at the real device width inside the iframe and scaled down to
// fit the panel, so "Desktop" really shows the desktop layout, and iPad/Mobil the
// responsive layouts.

const DEVICES = {
  desktop: { label: 'Desktop', icon: 'fa-solid fa-desktop', w: 1440, h: 900 },
  tablet: { label: 'iPad', icon: 'fa-solid fa-tablet-screen-button', w: 820, h: 1180 },
  mobile: { label: 'Mobil', icon: 'fa-solid fa-mobile-screen-button', w: 390, h: 844 },
};

function fitPreview() {
  if (!els.stage || els.preview.hidden) return;
  const d = DEVICES[state.device] || DEVICES.desktop;
  const framed = state.device !== 'desktop' && els.stage.clientWidth >= d.w * 0.6 + 48;
  const pad = framed ? 24 : 0;
  const availW = els.stage.clientWidth - pad * 2;
  const availH = els.stage.clientHeight - pad * 2;
  if (availW <= 0 || availH <= 0) return;
  let scale, height;
  if (state.device === 'desktop') {
    scale = Math.min(1, availW / d.w);
    height = availH / scale; // desktop fills the whole panel height
  } else {
    scale = Math.min(1, availW / d.w, availH / d.h);
    height = d.h;
  }
  els.iframe.style.width = `${d.w}px`;
  els.iframe.style.height = `${height}px`;
  els.iframe.style.transform = `scale(${scale})`;
  els.device.style.width = `${d.w * scale}px`;
  els.device.style.height = `${height * scale}px`;
  els.device.className = `device${framed ? ` device-${state.device}` : ''}`;
  hidePreviewScrollbar();
  els.sizeLabel.textContent = `${d.w} × ${state.device === 'desktop' ? Math.round(height) : d.h} · ${Math.round(scale * 100)} %`;
}

// Phones and iPads use overlay scrollbars, so the desktop scrollbar is hidden in those previews.
function hidePreviewScrollbar() {
  const doc = els.iframe.contentDocument;
  if (!doc?.head) return;
  let style = doc.getElementById('fb-preview-style');
  if (!style) {
    style = doc.createElement('style');
    style.id = 'fb-preview-style';
    doc.head.append(style);
  }
  style.textContent = state.device === 'desktop' ? '' : 'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}';
}

function renderDeviceSwitch() {
  els.devices.replaceChildren(
    ...Object.entries(DEVICES).map(([key, d]) =>
      h('button', { type: 'button', class: `seg${state.device === key ? ' active' : ''}`, title: d.label, onclick: () => {
        state.device = key;
        try { localStorage.setItem('fb-preview-device', key); } catch {}
        renderDeviceSwitch();
        fitPreview();
      } }, icon(d.icon), h('span', null, d.label)),
    ),
  );
}

function scrollPreview(anchor) {
  const go = () => {
    const target = els.iframe.contentDocument?.getElementById(anchor);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
    else toast('Seksjonen vises ikke (skjult eller ikke lagret ennå)');
  };
  if (!state.showPreview) {
    state.showPreview = true;
    renderBodyLayout();
    setTimeout(go, 150);
  } else go();
}

function reloadPreview() {
  const win = els.iframe.contentWindow;
  const y = win?.scrollY || 0;
  els.iframe.addEventListener('load', () => els.iframe.contentWindow.scrollTo(0, y), { once: true });
  win?.location.reload();
}

async function save() {
  try {
    state.content = await api('PUT', '/api/admin/content', state.content);
    state.dirty = false;
    renderTopbar();
    renderMain();
    reloadPreview();
    toast('Lagret og publisert');
  } catch (err) {
    if (err.status === 401) return renderLogin('Du er logget ut. Logg inn igjen – endringene dine er ikke lagret ennå.');
    toast(err.message, true);
  }
}

async function logout() {
  if (state.dirty && !confirm('Du har ulagrede endringer. Logge ut likevel?')) return;
  await api('POST', '/api/admin/logout');
  state.dirty = false;
  renderLogin();
}

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's' && els.topbar) {
    e.preventDefault();
    if (state.dirty) save();
  }
});

function renderApp() {
  const app = document.getElementById('app');
  els.topbar = h('header', { class: 'topbar' });
  els.sidebar = h('nav', { class: 'sidebar' });
  els.main = h('main', { class: 'main' });
  els.iframe = h('iframe', { src: '/', title: 'Forhåndsvisning' });
  els.device = h('div', { class: 'device' }, els.iframe);
  els.stage = h('div', { class: 'preview-stage' }, els.device);
  els.devices = h('div', { class: 'segmented' });
  els.sizeLabel = h('span', { class: 'size-label' });
  els.preview = h('aside', { class: 'preview' },
    h('div', { class: 'preview-bar' },
      els.devices,
      els.sizeLabel,
      h('span', { class: 'spacer' }),
      h('button', { type: 'button', class: 'icon-btn', title: 'Last inn på nytt', onclick: reloadPreview }, icon('fa-solid fa-rotate-right')),
      h('button', { type: 'button', class: 'icon-btn preview-close', title: 'Lukk forhåndsvisning', onclick: () => { state.showPreview = false; renderBodyLayout(); } }, icon('fa-solid fa-xmark'))),
    els.stage,
    h('div', { class: 'preview-note' }, 'Viser lagret versjon – trykk «Lagre» for å se endringene.'));
  new ResizeObserver(fitPreview).observe(els.stage);
  els.iframe.addEventListener('load', hidePreviewScrollbar);
  renderDeviceSwitch();
  els.body = h('div', { class: 'body' }, els.sidebar, els.main, els.preview);
  app.replaceChildren(h('div', { class: 'shell' }, els.topbar, els.body));
  renderBodyLayout();
  renderSidebar();
  renderMain();
}

function renderLogin(message = '') {
  els = {};
  const pw = h('input', { class: 'inp', type: 'password', autocomplete: 'current-password', autofocus: true, placeholder: 'Passord' });
  const err = h('p', { class: 'error' }, message);
  const form = h('form', { onsubmit: async (e) => {
    e.preventDefault();
    err.textContent = '';
    try {
      await api('POST', '/api/admin/login', { password: pw.value });
      await boot();
    } catch (ex) {
      err.textContent = ex.message;
    }
  } },
    h('h1', null, h('span', { class: 'logo' }, h('b', null, 'FERRO'), h('i', null, 'bygget'))),
    h('p', null, 'Administrasjon av nettsiden'),
    field('Passord', pw),
    h('button', { type: 'submit', class: 'btn dark', style: 'width:100%' }, 'Logg inn'),
    err,
  );
  document.getElementById('app').replaceChildren(h('div', { class: 'login' }, form));
  pw.focus();
}

async function boot() {
  try {
    const me = await api('GET', '/api/admin/me');
    const unsaved = state.dirty ? state.content : null;
    state.content = unsaved || (await api('GET', '/api/admin/content'));
    state.leadsCount = me.leads;
    renderApp();
  } catch (err) {
    if (err.status === 401) renderLogin();
    else document.getElementById('app').replaceChildren(h('p', { class: 'error', style: 'padding:40px' }, err.message));
  }
}

boot();

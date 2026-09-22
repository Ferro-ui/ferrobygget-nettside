// Server-side renderer: turns content.json into the landing page.
// Markup and classes follow the original design; every text value is escaped.

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const multiline = (s) => esc(s).replace(/\r?\n/g, '<br>');

const SPACING = {
  compact: 'py-14 md:py-20 lg:py-28',
  normal: 'py-20 md:py-28 lg:py-48',
  airy: 'py-24 md:py-36 lg:py-64',
};

const THEME = {
  light: {
    bg: 'bg-brand-light',
    title: 'text-brand-dark',
    body: 'text-brand-mutetext',
    number: 'text-brand-mutetext',
    numberLine: 'bg-brand-mutetext/30',
    divider: 'bg-brand-dark/5',
    item: 'text-brand-dark',
    icon: 'opacity-50 group-hover:opacity-100 group-hover:text-brand-accent',
    border: 'border-brand-dark/10',
    btn: 'bg-brand-dark text-white border border-brand-dark',
    btnHover: '#B68B5D',
  },
  dark: {
    bg: 'bg-brand-dark text-white',
    title: 'text-white',
    body: 'text-white/70',
    number: 'text-white/50',
    numberLine: 'bg-white/20',
    divider: 'bg-white/10',
    item: 'text-white',
    icon: 'text-white/40 group-hover:text-brand-accent',
    border: 'border-white/10',
    btn: 'bg-brand-accent text-white btn-to-light',
    btnHover: '#F9F9F7',
  },
};
THEME.white = { ...THEME.light, bg: 'bg-white' };

function button(b, t, extra = '') {
  if (!b?.text) return '';
  return `<a href="${esc(b.link || '#')}" class="btn-magnetic ${t.btn} px-8 py-4 rounded-full text-sm font-medium tracking-wide ${extra}" style="--hover-bg: ${t.btnHover};">${esc(b.text)}</a>`;
}

function intro(sec, number, t) {
  return `
                <div class="flex items-center space-x-4 mb-8 ${t.number}">
                    <span class="text-xs font-semibold tracking-widest">${number}</span>
                    <div class="h-px w-16 ${t.numberLine}"></div>
                </div>
                ${sec.title ? `<h2 class="font-serif text-[2.1rem] md:text-4xl lg:text-5xl mb-6 md:mb-8 ${t.title} tracking-tighter leading-tight">${esc(sec.title)}</h2>` : ''}
                ${sec.text ? `<p class="${t.body} mb-10 lg:mb-12 text-base md:text-lg leading-relaxed md:leading-loose font-light">${multiline(sec.text)}</p>` : ''}
                ${button(sec.button, t)}`;
}

function image(sec, heightCls) {
  if (!sec.image) return '';
  return `
            <div class="img-reveal-host ${heightCls} w-full">
                <div class="image-reveal-wrap w-full h-full rounded-sm shadow-xl">
                    <img src="${esc(sec.image)}" alt="${esc(sec.imageAlt || sec.title)}" loading="lazy" class="w-full h-full object-cover">
                </div>
            </div>`;
}

function featureList(items, t) {
  if (!items.length) return '';
  const rows = items.map(
    (i) => `
                    <div class="stagger-child flex items-start space-x-4 lg:space-x-6 group">
                        <div class="mt-1 w-6 text-center ${t.icon} transition-all duration-300 transform group-hover:scale-110">
                            <i class="${esc(i.icon || 'fa-solid fa-check')} text-xl"></i>
                        </div>
                        <div><h4 class="font-medium ${t.item} tracking-wide leading-relaxed">${esc(i.text)}</h4></div>
                    </div>`,
  );
  return `<div class="grid grid-cols-2 gap-x-6 gap-y-8 lg:block lg:space-y-12">${rows.join(`\n                    <div class="hidden lg:block h-px w-full ${t.divider} stagger-child"></div>`)}</div>`;
}

// Column spans depend on which parts the section actually has.
function renderSplit(sec, number, t) {
  const hasImg = Boolean(sec.image);
  const hasItems = sec.items.length > 0;
  const [textSpan, imgSpan, listSpan] =
    hasImg && hasItems ? [5, 4, 3] : hasImg ? [6, 6, 0] : hasItems ? [7, 5, 0] : [8, 0, 0];
  const imgLeft = sec.imagePosition === 'left';
  return `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 lg:gap-24 items-center">
            <div class="lg:col-span-${textSpan} ${imgLeft ? 'lg:order-2' : 'lg:order-1'} reveal-up">${intro(sec, number, t)}
            </div>
            ${hasImg ? `<div class="lg:col-span-${imgSpan} ${imgLeft ? 'lg:order-1' : 'lg:order-2'}">${image(sec, 'h-[340px] sm:h-[440px] md:h-[520px] lg:h-[650px]')}</div>` : ''}
            ${hasItems ? `<div class="lg:col-span-${listSpan || 5} lg:order-3 ${hasImg ? 'lg:pl-10' : ''} stagger-parent">${featureList(sec.items, t)}</div>` : ''}
        </div>`;
}

function renderIcons(sec, number, t) {
  const tiles = sec.items.map(
    (i) => `
                    <div class="stagger-child flex flex-col items-start group border-t ${t.border} pt-6 cursor-default">
                        <i class="${esc(i.icon || 'fa-solid fa-check')} text-2xl mb-5 ${t.icon.replace('opacity-50 ', '')} group-hover:-translate-y-1 transition-all duration-300"></i>
                        <span class="text-sm font-light tracking-wide">${esc(i.text)}</span>
                    </div>`,
  );
  return `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 lg:gap-24 items-start">
            <div class="lg:col-span-5 reveal-up lg:sticky lg:top-32">${intro(sec, number, t)}
            </div>
            <div class="lg:col-span-7 lg:pl-12 grid grid-cols-2 md:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-10 md:gap-y-16 stagger-parent lg:mt-0">${tiles.join('')}
            </div>
        </div>`;
}

function renderCards(sec, number, t) {
  const cards = sec.cards.map(
    (k) => `
                <div class="stagger-child group">
                    ${k.title ? `<h3 class="font-serif text-2xl mb-4 ${t.title} tracking-tight">${esc(k.title)}</h3>` : ''}
                    ${k.text ? `<p class="${t.body} leading-relaxed font-light ${k.linkText ? 'mb-6' : ''}">${multiline(k.text)}</p>` : ''}
                    ${
                      k.linkText
                        ? `<a href="${esc(k.link || '#')}" class="inline-flex items-center space-x-2 text-brand-accent hover:${t.title} transition-colors duration-300">
                        <span class="text-sm font-medium uppercase tracking-widest">${esc(k.linkText)}</span>
                        <i class="fa-solid fa-arrow-right text-xs transform group-hover:translate-x-2 transition-transform duration-300"></i>
                    </a>`
                        : ''
                    }
                </div>`,
  );
  const hasImg = Boolean(sec.image);
  const imgLeft = sec.imagePosition === 'left';
  return `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 lg:gap-24 items-center">
            <div class="lg:col-span-${hasImg ? 4 : 6} ${imgLeft ? 'lg:order-2' : 'lg:order-1'} reveal-up">${intro(sec, number, t)}
            </div>
            ${hasImg ? `<div class="lg:col-span-5 ${imgLeft ? 'lg:order-1' : 'lg:order-2'}">${image(sec, 'h-[300px] sm:h-[380px] md:h-[440px] lg:h-[450px]')}</div>` : ''}
            ${cards.length ? `<div class="lg:col-span-${hasImg ? 3 : 6} lg:order-3 ${hasImg ? 'lg:pl-10' : ''} grid sm:grid-cols-2 gap-10 lg:block lg:space-y-16 stagger-parent">${cards.join(`\n                <div class="hidden lg:block h-px w-full ${t.divider} stagger-child"></div>`)}</div>` : ''}
        </div>`;
}

function renderText(sec, number, t) {
  return `
        <div class="max-w-3xl reveal-up">${intro(sec, number, t)}
        </div>`;
}

const RENDERERS = { split: renderSplit, icons: renderIcons, cards: renderCards, text: renderText };

function renderSection(sec, index, spacing) {
  const t = THEME[sec.theme] || THEME.light;
  const number = String(index + 1).padStart(2, '0');
  const glow =
    sec.theme === 'dark'
      ? '<div class="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>'
      : '';
  return `
    <section id="${esc(sec.anchor)}" class="${t.bg} ${spacing} relative overflow-hidden" data-section="${esc(sec.id)}">
        ${glow}
        <div class="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">${RENDERERS[sec.type](sec, number, t)}
        </div>
    </section>`;
}

function logo(settings, dark) {
  return `
            <div class="flex items-baseline relative">
                <span class="font-sans text-2xl md:text-[1.6rem] font-black uppercase tracking-[0.15em] ${dark ? 'text-brand-dark' : 'drop-shadow-md'}">${esc(settings.logoBold)}</span>
                <span class="font-serif text-3xl md:text-4xl font-light italic ${dark ? 'text-brand-mutetext' : 'text-white/90 drop-shadow-md'} -ml-1">${esc(settings.logoItalic)}</span>
                <span class="w-2 h-2 bg-brand-accent rounded-full absolute -right-3 bottom-2 transform group-hover:scale-[2] transition-transform duration-500 shadow-sm"></span>
            </div>`;
}

// staticSite: page for a plain file host (GitHub Pages) — no API, the form opens an e-mail instead.
export function renderPage(content, { staticSite = false } = {}) {
  const { settings, hero, contact } = content;
  const spacing = SPACING[settings.spacing] || SPACING.normal;
  const sections = content.sections.filter((s) => s.enabled);

  const navItems = [
    hero.navLabel && { label: hero.navLabel, href: '#top' },
    ...sections.filter((s) => s.navLabel).map((s) => ({ label: s.navLabel, href: `#${s.anchor}` })),
  ].filter(Boolean);
  const navLinks = navItems
    .map((n) => `<a href="${esc(n.href)}" class="link-underline hover:text-white/80 transition-colors">${esc(n.label)}</a>`)
    .join('\n            ');
  const mobileLinks = navItems
    .map((n) => `<a href="${esc(n.href)}" class="block font-serif text-3xl py-3 hover:text-brand-accent transition-colors">${esc(n.label)}</a>`)
    .join('\n        ');

  const stats = hero.stats
    .map(
      (s) =>
        `<div class="stagger-child flex items-center space-x-2.5 md:space-x-3 min-w-0"><i class="${esc(s.icon)} text-brand-accent w-4 shrink-0"></i> <span class="truncate md:whitespace-normal">${esc(s.text)}</span></div>`,
    )
    .join('\n                ');

  const social = [
    ['linkedin', 'fa-linkedin-in', 'LinkedIn'],
    ['facebook', 'fa-facebook-f', 'Facebook'],
    ['instagram', 'fa-instagram', 'Instagram'],
  ]
    .filter(([key]) => settings.social[key])
    .map(
      ([key, icon, label]) =>
        `<a href="${esc(settings.social[key])}" aria-label="${label}" class="hover:text-brand-accent transition-transform hover:-translate-y-1 duration-300"><i class="fa-brands ${icon}"></i></a>`,
    )
    .join('\n                ');

  const phoneHref = settings.phone.replace(/[^\d+]/g, '');
  const contactInfo = [
    settings.address && `<span>${esc(settings.address)}</span>`,
    settings.email && `<a href="mailto:${esc(settings.email)}" class="link-underline hover:text-brand-dark">${esc(settings.email)}</a>`,
    settings.phone && `<a href="tel:${esc(phoneHref)}" class="link-underline hover:text-brand-dark">${esc(settings.phone)}</a>`,
  ]
    .filter(Boolean)
    .join('\n                <span class="hidden md:inline text-brand-dark/20">|</span>\n                ');

  const firstAnchor = sections[0] ? `#${sections[0].anchor}` : `#${contact.anchor}`;
  const t = THEME.light;

  return `<!DOCTYPE html>
<html lang="no" class="scroll-smooth bg-[#F9F9F7]">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(settings.metaTitle)}</title>
    <meta name="description" content="${esc(settings.metaDescription)}">
    <meta property="og:title" content="${esc(settings.metaTitle)}">
    <meta property="og:description" content="${esc(settings.metaDescription)}">
    ${hero.image ? `<meta property="og:image" content="${esc(hero.image)}">` : ''}
    <script>document.documentElement.classList.add('js')</script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="/assets/tailwind-config.js"></script>
    <link rel="stylesheet" href="/assets/site.css">
</head>
<body class="font-sans text-brand-text bg-brand-light antialiased overflow-x-hidden">

    <nav id="navbar" class="fixed top-0 w-full z-50 transition-all duration-700 py-6 px-6 lg:px-12 flex justify-between items-center text-white">
        <a href="#top" class="group flex items-center z-50" aria-label="${esc(settings.logoBold + settings.logoItalic)}">${logo(settings, false)}
        </a>

        <div class="hidden lg:flex space-x-10 text-sm font-medium tracking-wide drop-shadow-md z-50">
            ${navLinks}
        </div>

        <div class="flex items-center gap-4 z-50">
            ${settings.navCta.text ? `<a href="${esc(settings.navCta.link || '#')}" class="btn-magnetic border border-white/40 bg-black/20 backdrop-blur-sm shadow-lg px-8 py-3 rounded-full text-xs uppercase tracking-widest hover:border-transparent hidden md:inline-flex" style="--hover-bg: #B68B5D;">${esc(settings.navCta.text)}</a>` : ''}
            <button id="menu-toggle" type="button" class="lg:hidden w-11 h-11 rounded-full border border-white/40 bg-black/20 backdrop-blur-sm flex items-center justify-center" aria-label="Meny" aria-expanded="false" aria-controls="mobile-menu">
                <span class="menu-icon"><span></span><span></span></span>
            </button>
        </div>
    </nav>

    <div id="mobile-menu" class="mobile-menu lg:hidden fixed inset-0 z-40 bg-brand-dark text-white px-6 pt-32 pb-12 flex flex-col" aria-hidden="true">
        ${mobileLinks}
        ${settings.navCta.text ? `<a href="${esc(settings.navCta.link || '#')}" class="mt-auto btn-magnetic bg-brand-accent text-white px-8 py-4 rounded-full text-sm tracking-wide font-medium" style="--hover-bg: #9b744a;">${esc(settings.navCta.text)}</a>` : ''}
    </div>

    <header id="top" class="relative h-[100svh] min-h-[620px] w-full overflow-hidden flex flex-col justify-end ${hero.stats.length ? 'pb-40' : 'pb-16'} md:pb-24 lg:pb-32">
        <div class="absolute inset-0 z-0 bg-brand-dark">
            ${hero.image ? `<img id="hero-img" src="${esc(hero.image)}" alt="" fetchpriority="high" class="w-full h-full object-cover opacity-80 transform scale-105 will-change-transform">` : ''}
            <div class="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-brand-dark/95"></div>
        </div>

        <div class="relative z-10 max-w-[1400px] w-full mx-auto px-6 lg:px-12 text-white">
            <div class="max-w-3xl">
                <h1 class="font-serif text-[2.6rem] sm:text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.08] md:leading-[1.05] tracking-tight mb-6 md:mb-8 drop-shadow-lg">
                    ${esc(hero.titleLine1)}${hero.titleLine2 ? `<br>
                    <span class="italic text-brand-light opacity-90 font-light">${esc(hero.titleLine2)}</span>` : ''}
                </h1>
                ${hero.subtitle ? `<p class="text-base sm:text-lg md:text-xl font-light mb-8 md:mb-10 leading-relaxed opacity-90 max-w-xl drop-shadow-md">${multiline(hero.subtitle)}</p>` : ''}
                <div class="flex items-center space-x-6">
                    ${hero.button.text ? `<a href="${esc(hero.button.link || '#')}" class="btn-magnetic bg-brand-accent text-white px-8 py-4 rounded-full text-sm tracking-wide font-medium shadow-lg" style="--hover-bg: #9b744a;">${esc(hero.button.text)}</a>` : ''}
                    ${hero.secondaryLinkText ? `<a href="${esc(firstAnchor)}" class="group flex items-center space-x-3 text-sm tracking-wide font-light opacity-80 hover:opacity-100 transition-opacity">
                        <span>${esc(hero.secondaryLinkText)}</span>
                        <i class="fa-solid fa-arrow-down transform group-hover:translate-y-1 transition-transform duration-300"></i>
                    </a>` : ''}
                </div>
            </div>
        </div>

        ${stats ? `<div class="absolute bottom-0 left-0 w-full border-t border-white/10 bg-brand-dark/40 backdrop-blur-md z-10">
            <div class="max-w-[1400px] mx-auto px-6 lg:px-12 py-4 md:py-5 grid grid-cols-2 gap-x-4 gap-y-2.5 md:flex md:justify-between md:items-center md:gap-6 text-white/70 text-xs md:text-sm font-light stagger-parent is-visible">
                ${stats}
            </div>
        </div>` : ''}
    </header>
${sections.map((s, i) => renderSection(s, i, spacing)).join('\n')}

    <section id="${esc(contact.anchor)}" class="${spacing} bg-brand-light">
        <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12">
            <div class="bg-white p-6 sm:p-10 md:p-12 lg:p-24 rounded-sm shadow-[0_30px_60px_rgba(0,0,0,0.03)] grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-16 lg:gap-24 reveal-up">
                <div>
                    <h2 class="font-serif text-[2.1rem] md:text-4xl lg:text-5xl mb-6 md:mb-8 text-brand-dark tracking-tight leading-tight">${esc(contact.title)}</h2>
                    <p class="text-brand-mutetext text-base md:text-lg leading-relaxed md:leading-loose font-light lg:mb-12">${multiline(contact.text)}</p>
                </div>

                <form id="lead-form" class="space-y-8" novalidate data-success="${esc(contact.successText)}"${staticSite && settings.email ? ` data-mailto="${esc(settings.email)}"` : ''}>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <input type="text" name="name" placeholder="Navn" autocomplete="name" required maxlength="200" class="input-premium" aria-label="Navn">
                        <input type="email" name="email" placeholder="E-post" autocomplete="email" required maxlength="200" class="input-premium" aria-label="E-post">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <input type="text" name="company" placeholder="Bedrift" autocomplete="organization" maxlength="200" class="input-premium" aria-label="Bedrift">
                        <div class="relative">
                            <select name="employees" class="input-premium text-brand-mutetext appearance-none bg-transparent relative z-10 cursor-pointer" aria-label="Antall ansatte">
                                <option value="" selected>Antall ansatte: Velg</option>
                                ${contact.employeeOptions.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-brand-mutetext/50 z-0 text-xs"></i>
                        </div>
                    </div>
                    <input type="text" name="message" placeholder="${esc(contact.messagePlaceholder)}" maxlength="2000" class="input-premium" aria-label="${esc(contact.messagePlaceholder)}">
                    <div class="hp-field" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>
                    <div class="pt-6">
                        <button type="submit" class="btn-magnetic w-full ${t.btn} py-5 rounded-full font-medium tracking-widest uppercase text-sm" style="--hover-bg: #B68B5D;">${esc(contact.buttonText)}</button>
                        <p id="lead-status" class="mt-5 text-sm text-center min-h-[1.25rem]" role="status" aria-live="polite"></p>
                    </div>
                </form>
            </div>
        </div>
    </section>

    <footer class="bg-white border-t border-brand-dark/10 py-16">
        <div class="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center text-sm text-brand-mutetext font-light space-y-8 md:space-y-0 text-center md:text-left">
            <a href="#top" class="group flex items-center">${logo(settings, true)}
            </a>
            <div class="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-8">
                ${contactInfo}
            </div>
            <div class="flex space-x-8 text-lg">
                ${social}
            </div>
        </div>
    </footer>

    <script src="/assets/site.js"></script>
</body>
</html>`;
}

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Navbar background + hero parallax, batched into one rAF per frame.
  const navbar = document.getElementById('navbar');
  const heroImg = document.getElementById('hero-img');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const solid = y > 100 || document.body.classList.contains('menu-open');
    navbar.classList.toggle('bg-brand-dark/95', solid);
    navbar.classList.toggle('backdrop-blur-md', solid);
    navbar.classList.toggle('shadow-sm', solid);
    navbar.classList.toggle('py-4', solid);
    navbar.classList.toggle('py-6', !solid);
    if (heroImg && !reduceMotion && y < window.innerHeight) {
      heroImg.style.transform = `scale(1.05) translateY(${y * 0.3}px)`;
    }
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  onScroll();

  // Reveal on scroll.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target.classList.contains('img-reveal-host')
          ? entry.target.querySelector('.image-reveal-wrap')
          : entry.target;
        target?.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  );
  document.querySelectorAll('.reveal-up, .stagger-parent, .img-reveal-host').forEach((el) => observer.observe(el));

  // Mobile menu.
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    onScroll();
  };
  toggle?.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  // Lead form.
  const form = document.getElementById('lead-form');
  const status = document.getElementById('lead-status');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const invalid = [];
    if (!data.name.trim()) invalid.push(form.elements.name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) invalid.push(form.elements.email);
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    if (invalid.length) {
      invalid.forEach((el) => el.classList.add('is-invalid'));
      invalid[0].focus();
      status.className = 'mt-5 text-sm text-center min-h-[1.25rem] text-[#b4432f]';
      status.textContent = 'Vennligst fyll inn navn og en gyldig e-postadresse.';
      return;
    }
    // Static hosting (GitHub Pages): no server, so hand the lead over as an e-mail.
    if (form.dataset.mailto) {
      const body = [
        `Navn: ${data.name}`,
        `E-post: ${data.email}`,
        `Bedrift: ${data.company || '–'}`,
        `Antall ansatte: ${data.employees || '–'}`,
        `Hva driver dere med: ${data.message || '–'}`,
      ].join('\n');
      const subject = `Interesse for Ferrobygget: ${data.name}${data.company ? ` (${data.company})` : ''}`;
      window.location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.className = 'mt-5 text-sm text-center min-h-[1.25rem] text-brand-mutetext';
      status.textContent = `E-postprogrammet ditt åpnes. Send e-posten for å melde interesse – eller skriv til ${form.dataset.mailto}.`;
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.className = 'mt-5 text-sm text-center min-h-[1.25rem] text-brand-mutetext';
    status.textContent = 'Sender …';
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Noe gikk galt. Prøv igjen.');
      form.reset();
      status.className = 'mt-5 text-sm text-center min-h-[1.25rem] text-brand-accent';
      status.textContent = form.dataset.success || 'Takk!';
    } catch (err) {
      status.className = 'mt-5 text-sm text-center min-h-[1.25rem] text-[#b4432f]';
      status.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });
})();

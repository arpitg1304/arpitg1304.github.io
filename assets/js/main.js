/* Arpit Gupta: site interactions. No dependencies. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- Theme ---------- */
  const themeBtn = $('#themeToggle');
  themeBtn?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    store.set('theme', next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#fafaf8' : '#0b0d10');
    document.dispatchEvent(new Event('themechange'));
  });

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const menuBtn = $('#menuToggle');
  menuBtn?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('.nav__links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }));

  // Active tab is set per page in the HTML (aria-current="page").

  /* ---------- Contact popup (built once, opened from any "Get in touch") ---------- */
  const EMAIL = 'arpit.wpi@gmail.com';
  const ICONS = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 5.5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0zM3.3 8.6h3.4V20H3.3zM9.2 8.6h3.26v1.56h.05c.45-.86 1.56-1.77 3.22-1.77 3.44 0 4.07 2.27 4.07 5.21V20h-3.4v-5.73c0-1.37-.02-3.13-1.9-3.13-1.91 0-2.2 1.49-2.2 3.03V20H9.2z"/></svg>',
    github: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
  };
  const LINKS = [
    { key: 'mail', cls: 'ci--mail', label: 'Email', sub: EMAIL, href: `mailto:${EMAIL}`, copy: EMAIL },
    { key: 'linkedin', cls: 'ci--linkedin', label: 'LinkedIn', sub: 'linkedin.com/in/arpitgupta', href: 'https://www.linkedin.com/in/arpitgupta/' },
    { key: 'github', cls: 'ci--github', label: 'GitHub', sub: 'github.com/arpitg1304', href: 'https://github.com/arpitg1304' },
  ];
  let dlg = null;
  function buildDialog() {
    dlg = document.createElement('dialog');
    dlg.className = 'cdlg';
    dlg.setAttribute('aria-labelledby', 'cdlgTitle');
    dlg.innerHTML = `
      <div class="cdlg__head">
        <div><p class="cdlg__k mono">Get in touch</p><h2 id="cdlgTitle" tabindex="-1" autofocus>Let's talk robots.</h2></div>
        <button class="icon-btn cdlg__x" type="button" aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <p class="cdlg__sub">Robot software, perception, robot learning or the platform underneath.</p>
      <ul class="cdlg__list">${LINKS.map(l => `
        <li class="crow">
          <a class="crow__link" href="${l.href}"${l.key === 'mail' ? '' : ' target="_blank" rel="noopener"'}>
            <span class="ci ${l.cls}" aria-hidden="true">${ICONS[l.key]}</span>
            <span class="crow__txt"><b>${l.label}</b><span>${l.sub}</span></span>
            <span class="crow__go" aria-hidden="true">${l.key === 'mail' ? '→' : '↗'}</span>
          </a>
          ${l.copy ? `<button class="crow__copy mono" type="button" data-copy="${l.copy}">Copy</button>` : ''}
        </li>`).join('')}
      </ul>
      <p class="cdlg__foot mono">Boston, MA</p>`;
    document.body.appendChild(dlg);
    dlg.querySelector('.cdlg__x').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // backdrop
    dlg.querySelector('.crow__copy')?.addEventListener('click', async e => {
      const b = e.currentTarget;
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied ✓'; }
      catch (err) { b.textContent = 'Select & copy'; }
      setTimeout(() => (b.textContent = 'Copy'), 1600);
    });
  }
  function openContact(e) {
    if (typeof HTMLDialogElement !== 'function') return;   // no <dialog>: follow the link
    e.preventDefault();
    if (!dlg) buildDialog();
    nav.classList.remove('is-open');
    dlg.showModal();
  }
  $$('a[href$="#contact"]').forEach(a => a.addEventListener('click', openContact));

  /* ---------- Reveal on scroll ---------- */
  const revealer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealer.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  $$('.reveal').forEach((el, i) => {
    // Stagger siblings slightly
    const sibs = el.parentElement ? $$(':scope > .reveal', el.parentElement) : [];
    const idx = sibs.indexOf(el);
    if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 6) * 60}ms`;
    revealer.observe(el);
  });

  /* ---------- Project filters ---------- */
  const filterBtns = $$('.filters .chip');
  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.toggle('is-on', b === btn));
    const f = btn.dataset.filter;
    $$('#projects [data-tags]').forEach(el => {
      const show = f === 'all' || el.dataset.tags.split(' ').includes(f);
      el.classList.toggle('is-hidden', !show);
      if (show) el.classList.add('is-in');
    });
  }));

  /* ---------- Live GitHub stars (graceful fallback to static numbers) ---------- */
  (async () => {
    const KEY = 'gh-stars-v1';
    let data = null;
    try {
      const cached = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (cached && Date.now() - cached.t < 30 * 60 * 1000) data = cached.d;
    } catch (e) {}
    if (!data) {
      try {
        const res = await fetch('https://api.github.com/users/arpitg1304/repos?per_page=100', { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) return;
        const repos = await res.json();
        data = {};
        repos.filter(r => !r.fork).forEach(r => { data[r.name] = r.stargazers_count; });
        try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: data })); } catch (e) {}
      } catch (e) { return; }
    }
    $$('.stars[data-repo]').forEach(el => {
      const n = data[el.dataset.repo];
      if (typeof n === 'number') el.textContent = `★ ${n.toLocaleString()}`;
    });
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const totalEl = $('#starTotal');
    if (totalEl && total > 0) totalEl.textContent = (Math.floor(total / 10) * 10).toLocaleString();
  })();

  /* ---------- Amdahl calculator (log-scale r slider) ---------- */
  const rIn = $('#rIn'), kIn = $('#kIn');
  if (rIn && kIn) {
    const R_MIN = 0.1, R_MAX = 500; // percent
    const toR = v => R_MIN * Math.pow(R_MAX / R_MIN, v / 1000);
    const fromR = r => Math.round(1000 * Math.log(r / R_MIN) / Math.log(R_MAX / R_MIN));
    rIn.min = 0; rIn.max = 1000; rIn.step = 1;
    const fmtR = r => (r >= 100 ? r.toFixed(0) : r >= 10 ? r.toFixed(1) : r.toFixed(2).replace(/0$/, '')) + '%';
    const fmtS = s => (s >= 10 ? s.toFixed(1) : s >= 2 ? s.toFixed(2) : s.toFixed(3)) + '×';
    let rPct = 3.5;
    const update = () => {
      const r = rPct / 100, k = +kIn.value;
      const S = (1 + r) / (1 + r / k);
      $('#rOut').textContent = fmtR(rPct);
      $('#kOut').textContent = `${k}×`;
      $('#sOut').textContent = fmtS(S);
      $('#cOut').textContent = fmtS(1 + r);
      const share = r / (1 + r);
      $('#sBar').style.width = `${Math.max(0.6, share * 100)}%`;
      $('#shareOut').textContent = `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;
      rIn.setAttribute('aria-valuetext', fmtR(rPct));
    };
    rIn.value = fromR(rPct);
    rIn.addEventListener('input', () => { rPct = toR(+rIn.value); update(); });
    kIn.addEventListener('input', update);
    $$('.amdahl__presets .chip').forEach(b => b.addEventListener('click', () => {
      rPct = parseFloat(b.dataset.r); rIn.value = fromR(rPct); update();
    }));
    update();
  }

  /* ---------- BibTeX ---------- */
  const bibBtn = $('#bibBtn'), bib = $('#bib');
  bibBtn?.addEventListener('click', () => {
    bib.hidden = !bib.hidden;
    bibBtn.setAttribute('aria-expanded', String(!bib.hidden));
  });
  $$('.copy').forEach(btn => btn.addEventListener('click', async () => {
    const code = $('code', btn.parentElement)?.innerText || '';
    try { await navigator.clipboard.writeText(code); btn.textContent = 'copied ✓'; }
    catch (e) { btn.textContent = 'select & copy'; }
    setTimeout(() => { btn.textContent = 'copy'; }, 1600);
  }));

  /* ---------- Experience accordion ---------- */
  $$('.job__head').forEach(head => head.addEventListener('click', () => {
    const job = head.closest('.job');
    const open = job.classList.toggle('is-open');
    head.setAttribute('aria-expanded', String(open));
  }));

  /* ---------- Archive: play clips on hover (or when in view on touch) ---------- */
  const vids = $$('.arc__vid');
  const playV = v => { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); v.classList.add('is-playing'); };
  const stopV = v => { v.pause(); v.classList.remove('is-playing'); };
  if (window.matchMedia('(hover: hover)').matches) {
    vids.forEach(v => {
      const card = v.closest('.arc');
      card.addEventListener('mouseenter', () => playV(v));
      card.addEventListener('mouseleave', () => stopV(v));
    });
  } else if (!reduceMotion) {
    const vio = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? playV(e.target) : stopV(e.target))), { threshold: 0.6 });
    vids.forEach(v => vio.observe(v));
  }

  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

})();

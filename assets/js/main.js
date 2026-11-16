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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f5f6f8' : '#07090d');
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

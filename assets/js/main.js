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
    arm?.refreshColors();
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

  // Active section highlighting
  const links = new Map($$('.nav__links a').map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('is-active'));
      links.get(e.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

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

  /* =========================================================
     Hero: interactive pick-and-place arm.
     Analytic 2-link IK for shoulder/elbow, wrist kept vertical
     so the gripper always points down. Auto mode runs a
     pick-and-place loop; moving the pointer teleoperates.
     ========================================================= */
  const canvas = $('#armCanvas');
  var arm = null;
  if (canvas) arm = createArm(canvas);

  function createArm(cv) {
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let C = {};
    const refreshColors = () => {
      const cs = getComputedStyle(root);
      const v = n => cs.getPropertyValue(n).trim();
      C = { text: v('--text'), muted: v('--muted'), faint: v('--faint'), line: v('--line-strong'), grid: v('--grid'),
            accent: v('--accent'), cyan: v('--cyan'), green: v('--green'), surface: v('--surface'), bg: v('--surface-2') };
    };
    refreshColors();

    // Geometry (set on resize)
    let base, L1, L2, L3, tableY, blockS, slots;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tableY = H * 0.80;
      base = { x: W * 0.5, y: tableY };
      L1 = H * 0.36; L2 = H * 0.31; L3 = H * 0.09;
      blockS = Math.max(14, H * 0.055);
      slots = [ { x: W * 0.2, y: tableY }, { x: W * 0.8, y: tableY } ];
      if (!block.init) { block.x = slots[0].x; block.y = tableY - blockS / 2; block.init = true; }
      else if (!block.held) { block.x = slots[block.slot].x; block.y = tableY - blockS / 2; }
    };

    const block = { x: 0, y: 0, held: false, slot: 0, init: false };
    const ee = { x: 0, y: 0 };
    let grip = 1; // 1 open, 0 closed
    let mode = 'auto';
    let lastPointer = 0;
    const pointer = { x: 0, y: 0 };
    const trail = [];
    const toasts = [];
    let episodes = 4;

    // Auto pick & place script, rebuilt every cycle (alternates direction)
    let script = [], step = 0, stepT = 0;
    const buildScript = () => {
      const from = slots[block.slot], to = slots[1 - block.slot];
      const hover = H * 0.24, pickY = tableY - blockS * 0.55;
      script = [
        { x: from.x, y: tableY - hover, d: 1.1, g: 1 },
        { x: from.x, y: pickY, d: 0.7, g: 1 },
        { x: from.x, y: pickY, d: 0.35, g: 0, grab: true },
        { x: from.x, y: tableY - hover, d: 0.7, g: 0 },
        { x: to.x, y: tableY - hover * 1.25, d: 1.4, g: 0 },
        { x: to.x, y: pickY, d: 0.8, g: 0 },
        { x: to.x, y: pickY, d: 0.35, g: 1, release: true },
        { x: to.x, y: tableY - hover, d: 0.7, g: 1 },
        { x: W * 0.5, y: tableY - H * 0.5, d: 1.2, g: 1 },
      ];
      step = 0; stepT = 0;
    };
    let goal = { x: 0, y: 0 }, from = { x: 0, y: 0 };

    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const ik = (tx, ty) => {
      // wrist sits L3 above the target so the last link points straight down
      const wx = tx, wy = ty - L3;
      let dx = wx - base.x, dy = wy - base.y;
      let d = Math.hypot(dx, dy);
      const maxD = L1 + L2 - 0.5, minD = Math.abs(L1 - L2) + 0.5;
      if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
      if (d < minD) { dx *= minD / d; dy *= minD / d; d = minD; }
      const a = Math.atan2(dy, dx);
      const alpha = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      // two candidates: pick the elbow-up one (smaller y on canvas)
      const s1 = a - alpha, s2 = a + alpha;
      const e1 = { x: base.x + L1 * Math.cos(s1), y: base.y + L1 * Math.sin(s1) };
      const e2 = { x: base.x + L1 * Math.cos(s2), y: base.y + L1 * Math.sin(s2) };
      const useFirst = e1.y < e2.y;
      const sh = useFirst ? s1 : s2, elbow = useFirst ? e1 : e2;
      const wrist = { x: base.x + dx, y: base.y + dy };
      const elAng = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
      const tip = { x: wrist.x, y: wrist.y + L3 };
      const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
      return { elbow, wrist, tip, q1: wrap(-sh), q2: wrap(-(elAng - sh)), q3: wrap(-(Math.PI / 2 - elAng)) };
    };

    const onPointer = e => {
      const r = cv.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
      lastPointer = performance.now();
      if (mode !== 'teleop') {
        mode = 'teleop';
        if (block.held) { block.held = false; block.slot = Math.abs(block.x - slots[0].x) < Math.abs(block.x - slots[1].x) ? 0 : 1; }
      }
    };
    cv.addEventListener('pointermove', onPointer);
    cv.addEventListener('pointerdown', e => {
      onPointer(e);
      episodes += 1;
      toasts.push({ t: performance.now(), x: pointer.x, y: pointer.y, label: `episode_${String(episodes).padStart(4, '0')} saved` });
      const buf = $('#bufSec'); if (buf) { buf.textContent = '+5.0'; setTimeout(() => (buf.textContent = '15.0'), 900); }
    });

    let last = performance.now(), frame = 0, running = true;
    const hud = { q1: $('#q1'), q2: $('#q2'), q3: $('#q3'), ee: $('#ee'), mode: $('#mode') };

    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;

      // Desired target
      let tx, ty;
      if (mode === 'teleop' && now - lastPointer > 2600) {
        mode = 'auto';
        // resume: block drops back to the nearest slot, restart script from current pose
        block.held = false; block.x = slots[block.slot].x; block.y = tableY - blockS / 2;
        buildScript(); from = { x: ee.x, y: ee.y };
      }
      if (mode === 'teleop') {
        tx = pointer.x; ty = Math.min(pointer.y, tableY - 6);
        ee.x += (tx - ee.x) * Math.min(1, dt * 9);
        ee.y += (ty - ee.y) * Math.min(1, dt * 9);
        grip += (1 - grip) * Math.min(1, dt * 8);
      } else {
        if (!script.length) { buildScript(); from = { x: ee.x, y: ee.y }; }
        const s = script[step];
        stepT += dt / s.d;
        const k = ease(Math.min(1, stepT));
        ee.x = from.x + (s.x - from.x) * k;
        ee.y = from.y + (s.y - from.y) * k;
        grip += (s.g - grip) * Math.min(1, dt * 10);
        if (stepT >= 1) {
          if (s.grab) block.held = true;
          if (s.release) { block.held = false; block.slot = 1 - block.slot; block.x = slots[block.slot].x; block.y = tableY - blockS / 2; }
          from = { x: s.x, y: s.y }; step++; stepT = 0;
          if (step >= script.length) buildScript();
        }
      }
      const P = ik(ee.x, ee.y);
      if (block.held) { block.x = P.tip.x; block.y = P.tip.y + blockS * 0.05; }

      trail.push({ x: P.tip.x, y: P.tip.y });
      if (trail.length > 70) trail.shift();

      draw(P, now);

      if (++frame % 4 === 0) {
        hud.q1.textContent = P.q1.toFixed(2);
        hud.q2.textContent = P.q2.toFixed(2);
        hud.q3.textContent = P.q3.toFixed(2);
        const nx = ((P.tip.x - base.x) / (L1 + L2)).toFixed(2), ny = ((base.y - P.tip.y) / (L1 + L2)).toFixed(2);
        hud.ee.textContent = `${nx}, ${ny}`;
        hud.mode.textContent = mode;
      }
      if (running && !reduceMotion) requestAnimationFrame(tick);
    };

    const draw = (P, now) => {
      ctx.clearRect(0, 0, W, H);

      // grid
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      const g = 24;
      ctx.beginPath();
      for (let x = (W / 2) % g; x < W; x += g) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = tableY % g; y < H; y += g) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();

      // reach envelope
      ctx.setLineDash([3, 6]); ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(base.x, base.y, L1 + L2, Math.PI, 2 * Math.PI); ctx.stroke();
      ctx.setLineDash([]);

      // table
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(W * 0.04, tableY); ctx.lineTo(W * 0.96, tableY); ctx.stroke();
      // hatch under table
      ctx.save(); ctx.beginPath(); ctx.rect(W * 0.04, tableY, W * 0.92, 10); ctx.clip();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (let x = W * 0.04 - 20; x < W; x += 8) { ctx.beginPath(); ctx.moveTo(x, tableY + 10); ctx.lineTo(x + 10, tableY); ctx.stroke(); }
      ctx.restore();

      // slots
      slots.forEach((s, i) => {
        ctx.strokeStyle = C.faint; ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
        const w = blockS * 1.7;
        ctx.strokeRect(s.x - w / 2, tableY - 4, w, 4);
        ctx.setLineDash([]);
        ctx.fillStyle = C.faint; ctx.font = `500 ${Math.max(10, H * 0.026)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(i === 0 ? 'bin_A' : 'bin_B', s.x, tableY + Math.max(22, H * 0.06));
      });

      // trail
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        ctx.strokeStyle = hexA(C.cyan, a * 0.55);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
      }

      // block
      ctx.fillStyle = C.accent;
      roundRect(block.x - blockS / 2, block.y - blockS / 2, blockS, blockS, 3); ctx.fill();
      ctx.strokeStyle = hexA('#000000', 0.25); ctx.lineWidth = 1; ctx.stroke();

      // base
      ctx.fillStyle = C.bg; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
      roundRect(base.x - H * 0.07, tableY - H * 0.035, H * 0.14, H * 0.035, 4); ctx.fill(); ctx.stroke();

      // links
      const link = (a, b, w) => {
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.line; ctx.lineWidth = w + 3;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = C.bg; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      };
      const lw = Math.max(9, H * 0.034);
      link(base, P.elbow, lw);
      link(P.elbow, P.wrist, lw * 0.82);
      link(P.wrist, { x: P.wrist.x, y: P.tip.y - L3 * 0.25 }, lw * 0.6);

      // joints
      const joint = (p, r) => {
        ctx.fillStyle = C.surface; ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.32, 0, Math.PI * 2); ctx.fill();
      };
      joint(base, lw * 0.75); joint(P.elbow, lw * 0.62); joint(P.wrist, lw * 0.5);

      // gripper (fingers open/close)
      const open = blockS * 0.62 + grip * blockS * 0.45;
      const fy0 = P.tip.y - L3 * 0.25, fy1 = P.tip.y + blockS * 0.45;
      ctx.strokeStyle = C.text; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(P.tip.x - open / 2, fy0); ctx.lineTo(P.tip.x + open / 2, fy0);
      ctx.moveTo(P.tip.x - open / 2, fy0); ctx.lineTo(P.tip.x - open / 2, fy1);
      ctx.moveTo(P.tip.x + open / 2, fy0); ctx.lineTo(P.tip.x + open / 2, fy1);
      ctx.stroke();

      // teleop crosshair
      if (mode === 'teleop') {
        ctx.strokeStyle = C.cyan; ctx.lineWidth = 1;
        const cx = pointer.x, cy = Math.min(pointer.y, tableY - 6);
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.moveTo(cx - 16, cy); ctx.lineTo(cx - 6, cy); ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 16, cy);
        ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy - 6); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 16);
        ctx.stroke();
      }

      // toasts
      for (let i = toasts.length - 1; i >= 0; i--) {
        const tt = (now - toasts[i].t) / 1600;
        if (tt > 1) { toasts.splice(i, 1); continue; }
        const a = 1 - tt;
        ctx.strokeStyle = hexA(C.green, a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(toasts[i].x, toasts[i].y, 8 + tt * 30, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = hexA(C.green, a);
        ctx.font = `500 ${Math.max(11, H * 0.028)}px "JetBrains Mono", monospace`; ctx.textAlign = 'center';
        ctx.fillText(`✓ ${toasts[i].label}`, Math.min(Math.max(toasts[i].x, 90), W - 90), toasts[i].y - 22 - tt * 18);
      }
    };

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function hexA(color, a) {
      const c = color.replace('#', '');
      if (c.length !== 6) return color;
      const n = parseInt(c, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
    }

    resize();
    ee.x = W * 0.5; ee.y = tableY - H * 0.5;
    window.addEventListener('resize', () => { resize(); if (reduceMotion) tick(performance.now()); });

    // Pause when off-screen
    new IntersectionObserver(([e]) => {
      const was = running; running = e.isIntersecting;
      if (running && !was && !reduceMotion) { last = performance.now(); requestAnimationFrame(tick); }
    }).observe(cv);

    requestAnimationFrame(tick);
    return { refreshColors: () => { refreshColors(); if (reduceMotion) tick(performance.now()); } };
  }
})();

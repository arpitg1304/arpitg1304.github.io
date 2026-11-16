/* Landing background: a quiet blueprint robot arm drawn into the page.
   Slow pick-and-place loop; leans gently toward the cursor. No UI. */
(() => {
  'use strict';
  const cv = document.getElementById('bgArm');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let C = {};
  function readColors() {
    const cs = getComputedStyle(root), v = n => cs.getPropertyValue(n).trim();
    C = { line: v('--line-strong'), faint: v('--faint'), accent: v('--accent'), cyan: v('--cyan'), bg: v('--bg') };
  }
  function rgba(color, a) {
    const c = (color || '').replace('#', '');
    if (c.length !== 6) return color;
    const n = parseInt(c, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* ---------- Layout: place the cell in the free space right of the copy ---------- */
  let W, H, base, L1, L2, L3, tableY, S, P1, P2, HOME, alpha = 1;
  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const tabs = document.querySelector('.tabs');
    const copy = document.querySelector('.landing__copy');
    tableY = tabs ? tabs.getBoundingClientRect().top - Math.max(28, H * 0.04) : H * 0.75;
    const copyRight = copy ? copy.getBoundingClientRect().right : W * 0.5;
    const free = W - copyRight - 40;
    const wide = free > 300;
    alpha = wide ? 1 : 0.35;

    const top = 90;
    const span = Math.max(160, tableY - top);
    L1 = span * 0.44; L2 = span * 0.38; L3 = span * 0.08;
    S = clamp(span * 0.06, 12, 22);
    base = { x: wide ? copyRight + 40 + free * 0.5 : W * 0.72, y: tableY };
    const reach = (L1 + L2) * 0.82;
    P1 = { x: base.x - reach * 0.8, y: tableY - S / 2 };
    P2 = { x: Math.min(W - 48, base.x + reach * 0.75), y: tableY - S / 2 };
    HOME = { x: base.x + reach * 0.1, y: tableY - span * 0.62 };
  }

  /* ---------- IK (wrist kept vertical) ---------- */
  function ik(tx, ty) {
    const wx = tx, wy = ty - L3;
    let dx = wx - base.x, dy = wy - base.y, d = Math.hypot(dx, dy);
    const mx = L1 + L2 - 0.5;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    const a = Math.atan2(dy, dx);
    const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const c = [a - al, a + al].map(s => ({ x: base.x + L1 * Math.cos(s), y: base.y + L1 * Math.sin(s) }));
    const el = c[0].y < c[1].y ? c[0] : c[1];
    const w = { x: base.x + dx, y: base.y + dy };
    return { el, w, tip: { x: w.x, y: w.y + L3 } };
  }

  /* ---------- Slow pick-and-place script ---------- */
  let from = 'A';
  function script() {
    const a = from === 'A' ? P1 : P2, b = from === 'A' ? P2 : P1;
    const hov = S * 4.5;
    return [
      { p: { x: a.x, y: a.y - hov }, d: 1.6, g: 0 },
      { p: a, d: 0.9, g: 0 },
      { p: a, d: 0.5, g: 1, grab: true },
      { p: { x: a.x, y: a.y - hov }, d: 0.9, g: 1 },
      { p: { x: b.x, y: b.y - hov * 1.2 }, d: 2.2, g: 1 },
      { p: b, d: 0.9, g: 1 },
      { p: b, d: 0.5, g: 0, release: true },
      { p: { x: b.x, y: b.y - hov }, d: 0.9, g: 0 },
      { p: HOME, d: 1.8, g: 0 },
      { p: HOME, d: 1.2, g: 0 },
    ];
  }
  let steps, i = 0, t = 0, start, grip = 0, held = false;
  const block = { x: 0, y: 0 };
  const tip = { x: 0, y: 0 };
  const trail = [];

  // cursor attention
  const ptr = { x: 0, y: 0, k: 0 };
  let lastMove = -1e9;
  window.addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; lastMove = performance.now(); }, { passive: true });

  function reset() {
    layout();
    steps = script(); i = 0; t = 0;
    start = { ...HOME }; tip.x = HOME.x; tip.y = HOME.y;
    const a = from === 'A' ? P1 : P2;
    block.x = a.x; block.y = a.y; held = false; grip = 0;
    trail.length = 0;
  }

  function update(dt, now) {
    const s = steps[i];
    t += dt / s.d;
    const k = ease(Math.min(1, t));
    let x = start.x + (s.p.x - start.x) * k, y = start.y + (s.p.y - start.y) * k;
    grip += (s.g - grip) * Math.min(1, dt * 8);
    if (t >= 1) {
      if (s.grab) held = true;
      if (s.release) { held = false; from = from === 'A' ? 'B' : 'A'; }
      start = { ...s.p }; i++; t = 0;
      if (i >= steps.length) { steps = script(); i = 0; }
    }
    // lean toward the cursor (only when not carrying, and only near the cell)
    const active = now - lastMove < 2500 && ptr.x > base.x - (L1 + L2) * 1.2;
    ptr.k += ((active && !held ? 0.35 : 0) - ptr.k) * Math.min(1, dt * 3);
    if (ptr.k > 0.001) {
      x += (ptr.x - x) * ptr.k;
      y += (Math.min(ptr.y, tableY - S) - y) * ptr.k;
    }
    tip.x = x; tip.y = y;
    if (held) { block.x = tip.x; block.y = tip.y; }
    trail.push({ x: tip.x, y: tip.y });
    if (trail.length > 90) trail.shift();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = alpha;
    const lineC = C.line;

    // reach envelope + table
    ctx.strokeStyle = lineC; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.max(0, P1.x - S * 4), tableY); ctx.lineTo(Math.min(W, P2.x + S * 4), tableY); ctx.stroke();
    [P1, P2].forEach(p => {
      ctx.strokeStyle = lineC; ctx.beginPath();
      ctx.moveTo(p.x - S * 1.2, tableY + 6); ctx.lineTo(p.x + S * 1.2, tableY + 6); ctx.stroke();
    });

    // trail
    for (let j = 1; j < trail.length; j++) {
      ctx.strokeStyle = rgba(C.cyan, (j / trail.length) * 0.35); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(trail[j - 1].x, trail[j - 1].y); ctx.lineTo(trail[j].x, trail[j].y); ctx.stroke();
    }

    // block
    ctx.fillStyle = rgba(C.accent, 0.9);
    ctx.fillRect(block.x - S / 2, block.y - S / 2, S, S);

    // arm: outlined capsules (blueprint style)
    const P = ik(tip.x, tip.y);
    const lw = clamp(S * 0.9, 10, 18);
    const capsule = (a, b, w) => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = lineC; ctx.lineWidth = w + 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = C.bg; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    };
    capsule(base, P.el, lw);
    capsule(P.el, P.w, lw * 0.8);
    capsule(P.w, { x: P.w.x, y: P.tip.y - L3 * 0.3 }, lw * 0.55);
    // base plate
    ctx.strokeStyle = lineC; ctx.lineWidth = 1.2;
    ctx.strokeRect(base.x - lw * 2, tableY - lw * 0.7, lw * 4, lw * 0.7);
    // joints
    [[base, lw * 0.6], [P.el, lw * 0.5], [P.w, lw * 0.4]].forEach(([p, r]) => {
      ctx.fillStyle = C.bg; ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.28, 0, Math.PI * 2); ctx.fill();
    });
    // gripper
    const open = S * 0.65 + (1 - grip) * S * 0.5;
    const y0 = P.tip.y - L3 * 0.3, y1 = P.tip.y + S * 0.5;
    ctx.strokeStyle = C.faint; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(P.tip.x - open / 2, y0); ctx.lineTo(P.tip.x + open / 2, y0);
    ctx.moveTo(P.tip.x - open / 2, y0); ctx.lineTo(P.tip.x - open / 2, y1);
    ctx.moveTo(P.tip.x + open / 2, y0); ctx.lineTo(P.tip.x + open / 2, y1);
    ctx.stroke();
    ctx.restore();
  }

  let last = 0, running = false;
  const shown = () => getComputedStyle(cv).display !== 'none';
  function frame(now) {
    if (!shown()) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    update(dt, now); draw();
    if (!document.hidden && !reduce) requestAnimationFrame(frame); else running = false;
  }
  function run() { if (running || reduce || !shown()) return; running = true; last = performance.now(); requestAnimationFrame(frame); }

  readColors(); reset(); draw();
  document.addEventListener('themechange', () => { readColors(); if (reduce) draw(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { reset(); draw(); run(); }, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { reset(); draw(); });
  run();
})();

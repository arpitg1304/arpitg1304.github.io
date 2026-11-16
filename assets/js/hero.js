/* Hero: a tiny interactive data-collection cell.
   - Autonomous sorting policy (analytic 2-link IK, wrist kept vertical)
   - Occasional grasp slips that get flagged and retried
   - Teleop by pointer or keyboard; click / Space toggles the gripper
   - Spawn blocks, replay the last 8 s as a ghost arm, live episode log */
(() => {
  'use strict';
  const cv = document.getElementById('armCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- Theme colors ---------- */
  let C = {};
  function readColors() {
    const cs = getComputedStyle(root), v = n => cs.getPropertyValue(n).trim();
    C = { text: v('--text'), muted: v('--muted'), faint: v('--faint'), line: v('--line-strong'), grid: v('--grid'),
          accent: v('--accent'), cyan: v('--cyan'), green: v('--green'), violet: v('--violet'),
          surface: v('--surface'), bg: v('--surface-2'), red: '#f43f5e' };
  }
  readColors();
  document.addEventListener('themechange', () => { readColors(); if (!running) draw(); });

  function rgba(color, a) {
    const c = (color || '').replace('#', '');
    if (c.length !== 6) return color;
    const n = parseInt(c, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
  }

  /* ---------- Geometry ---------- */
  let W = 0, H = 0, dpr = 1, base, L1, L2, L3, tableY, S, bins = [];
  function layout() {
    const r = cv.getBoundingClientRect();
    const oldW = W || r.width, oldH = H || r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tableY = H * 0.8;
    base = { x: W * 0.5, y: tableY };
    L1 = H * 0.36; L2 = H * 0.31; L3 = H * 0.09;
    S = Math.max(13, H * 0.05);
    bins = [
      { x: W * 0.12, w: S * 2.3, key: 'accent', name: 'bin_A' },
      { x: W * 0.88, w: S * 2.3, key: 'cyan', name: 'bin_B' },
    ];
    const sx = W / oldW, sy = H / oldH;
    blocks.forEach(b => { b.x *= sx; b.y *= sy; });
    tip.x *= sx; tip.y *= sy; target.x *= sx; target.y *= sy;
  }

  /* ---------- World state ---------- */
  const blocks = [];
  let nextBlockId = 1;
  const tip = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  let grip = 0;              // 0 open … 1 closed (rendered)
  let gripCmd = 0;           // commanded
  let held = null;
  let mode = 'auto';
  let lastInput = -1e9;
  let pendingGrip = false, pendingT = 0;

  const keys = new Set();
  const trail = [];
  const toasts = [];
  const log = [];
  let epCount = 0, epOk = 0, episode = null;

  // Replay ring buffer (≈30 Hz, 8 s)
  const BUF_S = 8, rec = [];
  let recAcc = 0, replay = null;

  function spawnBlock(key) {
    const live = blocks.filter(b => b.state !== 'binned');
    if (live.length >= 6) { toast('table full', C.faint); return null; }
    const zones = [[0.24, 0.40], [0.60, 0.76]];
    for (let tries = 0; tries < 30; tries++) {
      const z = zones[Math.floor(Math.random() * 2)];
      const x = W * (z[0] + Math.random() * (z[1] - z[0]));
      if (live.every(b => Math.abs(b.x - x) > S * 1.7)) {
        const b = { id: nextBlockId++, x, y: tableY - S / 2, vy: 0, key: key || (Math.random() < 0.5 ? 'accent' : 'cyan'), state: 'table', fade: 1 };
        blocks.push(b);
        return b;
      }
    }
    return null;
  }

  function toast(text, color, x, y) {
    toasts.push({ text, color: color || C.text, x: x ?? W / 2, y: y ?? H * 0.18, t: 0 });
  }

  function startEpisode(kind) {
    epCount += 1;
    episode = { id: `ep_${String(epCount).padStart(4, '0')}`, kind, t0: now };
  }
  function endEpisode(ok, note) {
    if (!episode) return;
    if (ok) epOk += 1;
    const dur = ((now - episode.t0) / 1000).toFixed(1);
    log.unshift({ id: episode.id, kind: episode.kind, ok, note: note || `${dur}s` });
    if (log.length > 4) log.pop();
    episode = null;
    const buf = $('bufSec');
    if (buf && !ok) { buf.textContent = '+clip'; setTimeout(() => { if (!replay) buf.textContent = `${BUF_S.toFixed(1)}s buffer`; }, 1200); }
  }

  /* ---------- IK ---------- */
  function ik(tx, ty) {
    const wx = tx, wy = ty - L3;
    let dx = wx - base.x, dy = wy - base.y, d = Math.hypot(dx, dy);
    const maxD = L1 + L2 - 0.5, minD = Math.abs(L1 - L2) + 0.5;
    if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
    if (d < minD) { dx *= minD / d; dy *= minD / d; d = minD; }
    const a = Math.atan2(dy, dx);
    const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const s1 = a - al, s2 = a + al;
    const e1 = { x: base.x + L1 * Math.cos(s1), y: base.y + L1 * Math.sin(s1) };
    const e2 = { x: base.x + L1 * Math.cos(s2), y: base.y + L1 * Math.sin(s2) };
    const up = e1.y < e2.y, sh = up ? s1 : s2, el = up ? e1 : e2;
    const w = { x: base.x + dx, y: base.y + dy };
    const elA = Math.atan2(w.y - el.y, w.x - el.x);
    const wrap = q => Math.atan2(Math.sin(q), Math.cos(q));
    return { el, w, tip: { x: w.x, y: w.y + L3 }, q1: wrap(-sh), q2: wrap(-(elA - sh)) };
  }

  /* ---------- Autonomous sorting policy ---------- */
  let plan = [], step = null, waitUntil = 0;
  function planTask() {
    const table = blocks.filter(b => b.state === 'table');
    if (!table.length) {
      if (!blocks.some(b => b.state !== 'binned')) {
        if (now > waitUntil) { for (let i = 0; i < 3; i++) spawnBlock(); waitUntil = now + 400; }
      }
      plan = [{ x: W * 0.5, y: tableY - H * 0.5, g: 0 }];
      return;
    }
    table.sort((a, b) => Math.abs(a.x - tip.x) - Math.abs(b.x - tip.x));
    const b = table[0];
    const bin = bins.find(k => k.key === b.key);
    const hover = tableY - H * 0.24, carry = tableY - H * 0.3;
    const slip = Math.random() < 0.13 ? 0.25 + Math.random() * 0.45 : -1;
    plan = [
      { x: b.x, y: hover, g: 0, start: b },
      { x: b.x, y: b.y, g: 0 },
      { x: b.x, y: b.y, g: 1, d: 0.3, act: 'grab', block: b },
      { x: b.x, y: hover, g: 1 },
      { x: bin.x, y: carry, g: 1, slip },
      { x: bin.x, y: tableY - S * 0.9, g: 1 },
      { x: bin.x, y: tableY - S * 0.9, g: 0, d: 0.3, act: 'release' },
      { x: bin.x, y: hover, g: 0 },
    ];
  }

  function runAuto(dt) {
    if (!step) {
      if (!plan.length) planTask();
      const wp = plan.shift();
      if (!wp) return;
      if (wp.start && !episode) startEpisode('auto');
      const dist = Math.hypot(wp.x - tip.x, wp.y - tip.y);
      step = { wp, fx: tip.x, fy: tip.y, t: 0, d: wp.d || clamp(dist / (H * 1.15), 0.3, 1.25) };
    }
    const s = step, wp = s.wp;
    s.t += dt / s.d;
    const k = ease(Math.min(1, s.t));
    target.x = s.fx + (wp.x - s.fx) * k;
    target.y = s.fy + (wp.y - s.fy) * k;
    tip.x = target.x; tip.y = target.y;
    gripCmd = wp.g;

    if (wp.slip > 0 && held && s.t >= wp.slip) {
      // the grasp slips mid-carry: flag it, save the clip, retry later
      const b = held; drop();
      toast('✗ slip · clip saved', C.red, b.x, b.y - S * 1.6);
      endEpisode(false, 'slip');
      plan = []; step = null;
      plan.push({ x: tip.x, y: tableY - H * 0.3, g: 0 });
      return;
    }
    if (s.t >= 1) {
      if (wp.act === 'grab') {
        const b = wp.block;
        if (b && b.state === 'table' && Math.abs(b.x - tip.x) < S) attach(b);
        else { plan = []; endEpisode(false, 'missed'); }
      }
      if (wp.act === 'release' && held) drop();
      step = null;
    }
  }

  /* ---------- Grasping & physics ---------- */
  function attach(b) { held = b; b.state = 'held'; b.vy = 0; }
  function drop() { if (!held) return; held.state = 'falling'; held.vy = 0; held = null; }
  function tryToggleGrip() {
    if (held) { gripCmd = 0; drop(); return; }
    gripCmd = 1;
    const b = blocks.find(k => (k.state === 'table' || k.state === 'falling') && Math.abs(k.x - tip.x) < S * 0.85 && Math.abs(k.y - tip.y) < S * 0.9);
    if (b) { attach(b); if (!episode) startEpisode('demo'); }
  }

  function physics(dt) {
    const g = H * 3.4;
    blocks.forEach(b => {
      if (b.state === 'held') { b.x = tip.x; b.y = tip.y + S * 0.05; return; }
      if (b.state === 'binned') { b.fade -= dt / 1.4; return; }
      if (b.state !== 'falling') return;
      b.vy += g * dt; b.y += b.vy * dt;
      const floor = tableY - S / 2;
      if (b.y >= floor) {
        b.y = floor; b.vy = 0;
        const bin = bins.find(k => Math.abs(b.x - k.x) < k.w / 2);
        if (bin) {
          b.state = 'binned';
          const ok = bin.key === b.key;
          if (episode) endEpisode(ok, ok ? undefined : 'wrong bin');
          toast(ok ? '✓ sorted' : '✗ wrong bin', ok ? C.green : C.red, b.x, tableY - S * 2.2);
        } else {
          // keep blocks off the robot base
          if (Math.abs(b.x - base.x) < H * 0.1) b.x = base.x + Math.sign(b.x - base.x || 1) * H * 0.11;
          b.state = 'table';
          if (episode && episode.kind === 'demo') endEpisode(false, 'dropped');
        }
      }
    });
    for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].state === 'binned' && blocks[i].fade <= 0) blocks.splice(i, 1);
  }

  /* ---------- Input ---------- */
  function toTeleop() {
    lastInput = now;
    if (mode !== 'teleop') {
      mode = 'teleop';
      plan = []; step = null;
      if (episode && episode.kind === 'auto') { if (held) drop(); episode = null; epCount -= 1; }
    }
    kick();
  }
  function pointerPos(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  cv.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const p = pointerPos(e); target.x = p.x; target.y = p.y; toTeleop();
  });
  cv.addEventListener('pointerdown', e => {
    const p = pointerPos(e); target.x = p.x; target.y = p.y; toTeleop();
    pendingGrip = true; pendingT = now;
  });
  cv.addEventListener('keydown', e => {
    const k = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(k)) {
      keys.add(k); e.preventDefault();
      if (mode !== 'teleop') { target.x = tip.x; target.y = tip.y; }
      toTeleop();
    } else if (k === ' ' || k === 'Enter') { e.preventDefault(); toTeleop(); tryToggleGrip(); }
    else if (k === 'r' || k === 'R') startReplay();
    else if (k === 'b' || k === 'B') addBlock();
  });
  cv.addEventListener('keyup', e => keys.delete(e.key));
  cv.addEventListener('blur', () => keys.clear());

  function addBlock() { const b = spawnBlock(); if (b) toast('+ block', C.muted, b.x, b.y - S * 1.4); kick(); }
  $('armAdd')?.addEventListener('click', addBlock);
  $('armReplay')?.addEventListener('click', startReplay);

  function startReplay() {
    if (rec.length < 20) return;
    replay = { frames: rec.slice(), t: 0 };
    kick();
  }

  /* ---------- Main loop ---------- */
  let now = 0, last = 0, running = false, visible = true, frame = 0;
  const hud = { q1: $('q1'), q2: $('q2'), ee: $('ee'), eps: $('eps'), sr: $('sr'), mode: $('mode') };

  function update(dt) {
    now += dt * 1000;
    // keyboard teleop
    if (keys.size) {
      const v = H * 0.9 * dt;
      if (keys.has('ArrowLeft') || keys.has('a')) target.x -= v;
      if (keys.has('ArrowRight') || keys.has('d')) target.x += v;
      if (keys.has('ArrowUp') || keys.has('w')) target.y -= v;
      if (keys.has('ArrowDown') || keys.has('s')) target.y += v;
      lastInput = now;
    }
    target.x = clamp(target.x, W * 0.03, W * 0.97);
    target.y = clamp(target.y, H * 0.08, tableY - S * 0.5);

    if (mode === 'teleop') {
      tip.x += (target.x - tip.x) * Math.min(1, dt * 9);
      tip.y += (target.y - tip.y) * Math.min(1, dt * 9);
      if (pendingGrip && (Math.hypot(target.x - tip.x, target.y - tip.y) < S * 0.35 || now - pendingT > 700)) {
        pendingGrip = false; tryToggleGrip();
      }
      if (!reduce && now - lastInput > 3200) {
        mode = 'auto';
        if (held) { drop(); }
        plan = []; step = null;
      }
    } else if (!reduce) {
      runAuto(dt);
    }
    grip += (gripCmd - grip) * Math.min(1, dt * 12);
    physics(dt);

    // ring buffer for replay
    recAcc += dt;
    if (recAcc >= 1 / 30) {
      recAcc = 0;
      rec.push({ x: tip.x, y: tip.y, g: grip, hk: held ? held.key : null });
      if (rec.length > BUF_S * 30) rec.shift();
    }
    if (replay) {
      replay.t += dt;
      if (replay.t >= replay.frames.length / 30) replay = null;
    }

    trail.push({ x: tip.x, y: tip.y });
    if (trail.length > 60) trail.shift();
    toasts.forEach(t => (t.t += dt));
    for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].t > 1.6) toasts.splice(i, 1);
  }

  function drawArm(P, g, alpha, ghost) {
    const lw = Math.max(9, H * 0.034);
    const link = (a, b, w) => {
      ctx.lineCap = 'round';
      if (ghost) {
        ctx.setLineDash([4, 5]); ctx.strokeStyle = rgba(C.violet, 0.75 * alpha); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
        return;
      }
      ctx.strokeStyle = C.line; ctx.lineWidth = w + 3;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = C.bg; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    };
    link(base, P.el, lw);
    link(P.el, P.w, lw * 0.82);
    link(P.w, { x: P.w.x, y: P.tip.y - L3 * 0.25 }, lw * 0.6);
    if (!ghost) {
      const joint = (p, r) => {
        ctx.fillStyle = C.surface; ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.32, 0, Math.PI * 2); ctx.fill();
      };
      joint(base, lw * 0.75); joint(P.el, lw * 0.62); joint(P.w, lw * 0.5);
    }
    const open = S * 0.62 + (1 - g) * S * 0.5;
    const fy0 = P.tip.y - L3 * 0.25, fy1 = P.tip.y + S * 0.45;
    ctx.strokeStyle = ghost ? rgba(C.violet, 0.8 * alpha) : C.text; ctx.lineWidth = ghost ? 1.6 : 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(P.tip.x - open / 2, fy0); ctx.lineTo(P.tip.x + open / 2, fy0);
    ctx.moveTo(P.tip.x - open / 2, fy0); ctx.lineTo(P.tip.x - open / 2, fy1);
    ctx.moveTo(P.tip.x + open / 2, fy0); ctx.lineTo(P.tip.x + open / 2, fy1);
    ctx.stroke();
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const mono = px => `500 ${px}px "JetBrains Mono", ui-monospace, monospace`;

    // grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = (W / 2) % 24; x < W; x += 24) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = tableY % 24; y < H; y += 24) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();

    // reach envelope
    ctx.setLineDash([3, 6]); ctx.strokeStyle = C.line;
    ctx.beginPath(); ctx.arc(base.x, base.y, L1 + L2, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);

    // table + hatch
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W * 0.03, tableY); ctx.lineTo(W * 0.97, tableY); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(W * 0.03, tableY, W * 0.94, 10); ctx.clip();
    ctx.strokeStyle = C.grid;
    for (let x = W * 0.03 - 20; x < W; x += 8) { ctx.beginPath(); ctx.moveTo(x, tableY + 10); ctx.lineTo(x + 10, tableY); ctx.stroke(); }
    ctx.restore();

    // bins
    bins.forEach(b => {
      const col = C[b.key], h = S * 1.25;
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.x - b.w / 2, tableY - h); ctx.lineTo(b.x - b.w / 2, tableY); ctx.lineTo(b.x + b.w / 2, tableY); ctx.lineTo(b.x + b.w / 2, tableY - h); ctx.stroke();
      ctx.fillStyle = rgba(col, 0.08); ctx.fillRect(b.x - b.w / 2, tableY - h, b.w, h);
      ctx.fillStyle = C.faint; ctx.font = mono(Math.max(10, H * 0.026)); ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x, tableY + Math.max(20, H * 0.055));
    });

    // trail
    for (let i = 1; i < trail.length; i++) {
      ctx.strokeStyle = rgba(C.cyan, (i / trail.length) * 0.5); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
    }

    // blocks
    blocks.forEach(b => {
      const a = b.state === 'binned' ? Math.max(0, b.fade) : 1;
      ctx.fillStyle = rgba(C[b.key], a);
      rr(b.x - S / 2, b.y - S / 2, S, S, 3); ctx.fill();
      ctx.strokeStyle = rgba('#000000', 0.22 * a); ctx.lineWidth = 1; ctx.stroke();
    });

    // base
    ctx.fillStyle = C.bg; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    rr(base.x - H * 0.07, tableY - H * 0.035, H * 0.14, H * 0.035, 4); ctx.fill(); ctx.stroke();

    // replay ghost
    if (replay) {
      const i = Math.min(replay.frames.length - 1, Math.floor(replay.t * 30));
      const f = replay.frames[i];
      const P = ik(f.x, f.y);
      drawArm(P, f.g, 1, true);
      if (f.hk) { ctx.strokeStyle = rgba(C[f.hk], 0.9); ctx.setLineDash([3, 3]); rr(P.tip.x - S / 2, P.tip.y - S / 2, S, S, 3); ctx.stroke(); ctx.setLineDash([]); }
      const left = (replay.frames.length - i) / 30;
      ctx.fillStyle = C.violet; ctx.font = mono(Math.max(10, H * 0.028)); ctx.textAlign = 'right';
      ctx.fillText(`▶ replay  −${left.toFixed(1)}s`, W - 12, 20);
    }

    // live arm
    const P = ik(tip.x, tip.y);
    drawArm(P, grip, 1, false);

    // teleop crosshair
    if (mode === 'teleop') {
      ctx.strokeStyle = C.cyan; ctx.lineWidth = 1;
      const cx = target.x, cy = target.y;
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.moveTo(cx - 16, cy); ctx.lineTo(cx - 6, cy); ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 16, cy);
      ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy - 6); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 16);
      ctx.stroke();
    }

    // episode log
    ctx.textAlign = 'left';
    ctx.font = mono(Math.max(9.5, H * 0.024));
    ctx.fillStyle = C.faint;
    ctx.fillText('episodes', 12, 20);
    log.forEach((e, i) => {
      const y = 20 + (i + 1) * Math.max(14, H * 0.036);
      const a = 1 - i * 0.2;
      ctx.fillStyle = rgba(C.muted, a); ctx.fillText(`${e.id} ${e.kind.padEnd(4)}`, 12, y);
      const w = ctx.measureText(`${e.id} ${e.kind.padEnd(4)} `).width;
      ctx.fillStyle = rgba(e.ok ? C.green : C.red, a); ctx.fillText(`${e.ok ? '✓' : '✗'} ${e.note}`, 12 + w, y);
    });

    // toasts
    toasts.forEach(t => {
      const k = t.t / 1.6, a = 1 - k;
      ctx.fillStyle = rgba(t.color, a); ctx.font = mono(Math.max(11, H * 0.03)); ctx.textAlign = 'center';
      ctx.fillText(t.text, clamp(t.x, 70, W - 70), t.y - k * 16);
    });

    return P;
  }

  function updateHud(P) {
    if (++frame % 4) return;
    hud.q1.textContent = P.q1.toFixed(2);
    hud.q2.textContent = P.q2.toFixed(2);
    hud.ee.textContent = `${((P.tip.x - base.x) / (L1 + L2)).toFixed(2)}, ${((base.y - P.tip.y) / (L1 + L2)).toFixed(2)}`;
    hud.eps.textContent = String(epCount - (episode ? 1 : 0));
    const done = epCount - (episode ? 1 : 0);
    hud.sr.textContent = done ? `${Math.round((100 * epOk) / done)}%` : '—';
    hud.mode.textContent = replay ? 'replay' : mode;
    const buf = $('bufSec');
    if (buf && !buf.textContent.startsWith('+')) buf.textContent = `${Math.min(BUF_S, rec.length / 30).toFixed(1)}s buffer`;
  }

  function tick(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    update(dt);
    updateHud(draw());
    if (visible && (!reduce || now - lastInput < 3500 || replay)) requestAnimationFrame(tick);
    else running = false;
  }
  function kick() { if (!running && visible) { running = true; last = performance.now(); requestAnimationFrame(tick); } }

  /* ---------- Boot ---------- */
  layout();
  tip.x = target.x = W * 0.5; tip.y = target.y = tableY - H * 0.5;
  spawnBlock('accent'); spawnBlock('cyan'); spawnBlock();
  if (reduce) mode = 'teleop';
  updateHud(draw());
  window.addEventListener('resize', () => { layout(); if (!running) draw(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !reduce) kick(); }).observe(cv);

  // Inspection hook: advance the simulation deterministically.
  window.__hero = {
    step(ms) { for (let i = 0; i < ms / 16; i++) update(0.016); updateHud(draw()); },
    teleop(x, y) { target.x = x * W; target.y = y * H; toTeleop(); },
    grip() { tryToggleGrip(); }, add: addBlock, replay: startReplay,
  };
})();

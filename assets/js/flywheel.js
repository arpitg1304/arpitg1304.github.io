/* Robot-learning flywheel: deterministic timeline driving an inline SVG.
   Every stage renders from a progress value p ∈ [0,1], so jumping is exact. */
(() => {
  'use strict';
  const svg = document.getElementById('fwSvg');
  if (!svg) return;
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const op = (el, v) => { if (el) el.style.opacity = v; };

  /* ---------- Story ---------- */
  const STAGES = [
    { name: 'Deploy', dur: 4800, text: 'Policy {v} runs on the fleet. Most picks succeed, but the failures it hits in the field are exactly the data the next policy needs.', links: [] },
    { name: 'Capture', dur: 4300, text: 'ROS Time Machine keeps a rolling 15 s buffer of every topic. A VLM watching a 1 fps feed names the slip in plain English, and the clip around it is saved: real deployment-distribution data, not lab demos.', links: [['ROS Time Machine', 'projects.html#p-rtm']] },
    { name: 'Curate', dur: 4600, text: 'Forge converts and scores every episode and dedupes it against the corpus. Anvil drops sessions whose scene drifted from the pinned setup, so bad conditions never reach training.', links: [['Forge', 'projects.html#p-forge'], ['Anvil', 'projects.html#p-anvil']] },
    { name: 'Train', dur: 3600, text: 'Fine-tune on the base corpus plus the new field failures, with data loading that is measured, not guessed. The output is a candidate, not a release.', links: [['CoRL 2026 paper', 'research.html'], ['frameforge', 'projects.html#p-frameforge']] },
    { name: 'Evaluate', dur: 4200, text: 'Armature replays the task as seeded stress trials in a browser sim. The candidate has to beat the current policy before it gets near a real robot.', links: [['Armature', 'projects.html#p-armature']] },
    { name: 'Ship', dur: 4300, text: 'Anvil confirms the real cell still matches its pin, and a coding agent with Robotics Agent Skills generates the ROS 2 bringup, lifecycle nodes and QoS. The new policy rolls out and the loop starts again, with a better fleet.', links: [['Anvil', 'projects.html#p-anvil'], ['Robotics Agent Skills', 'projects.html#p-skills']] },
  ];
  const TRAVEL = 1000;
  const SUCCESS = [72, 80, 86, 90, 93, 95];
  const EVAL = [44, 46, 47, 48, 49, 49];
  const BAD_DOTS = [7, 23, 36, 44, 12, 29];

  // Timeline: play0, travel→1, play1, …, play5, travel→0
  const segs = [];
  let acc = 0;
  STAGES.forEach((s, i) => {
    segs.push({ type: 'play', i, start: acc, dur: s.dur }); acc += s.dur;
    segs.push({ type: 'travel', i: (i + 1) % 6, from: i, start: acc, dur: TRAVEL }); acc += TRAVEL;
  });
  const CYCLE = acc;

  /* ---------- Elements ---------- */
  const track = $('fwTrack'), prog = $('fwProg');
  const TOTAL = track.getTotalLength();
  const ARC = Math.PI * 100;
  const ANCH = [0, 375, 750, 750 + ARC, 1125 + ARC, 1500 + ARC];
  const stations = Array.from(svg.querySelectorAll('.fw-st'));
  const anchors = Array.from(svg.querySelectorAll('.fw-anchors circle'));
  const packet = $('fwPacket'), halo = $('fwHalo');
  const ORIG = [[60, 40], [435, 40], [810, 40], [810, 500], [435, 500], [60, 500]];

  /* ---------- Build generated pieces ---------- */
  // Capture: scrolling topic ticks (period divides the 300px scroll)
  const ticks = $('fwTicks');
  for (let x = 16; x < 916; x += 15) mk('rect', { x, y: 99, width: 6, height: 6, rx: 1, class: 'fw-tick-c' }, ticks);
  for (let x = 16; x < 916; x += 5) mk('line', { x1: x, x2: x, y1: 113, y2: 121, class: 'fw-tick-j' }, ticks);
  for (let x = 16; x < 916; x += 10) mk('circle', { cx: x + (x % 20 ? 0 : 3), cy: 132 + ((x / 10) % 3) - 1, r: 1.6, class: 'fw-tick-l' }, ticks);

  // Curate rows
  const ROWS = [
    { id: 'ep_0412', field: true, score: 8.7, mark: '✓' },
    { id: 'ep_0388', score: 9.1, mark: '✓' },
    { id: 'ep_0391', score: 6.2, mark: '✗ drift', bad: 'drift' },
    { id: 'ep_0397', score: 8.9, mark: 'dup', bad: 'dup' },
  ];
  const rowsG = $('fwRows');
  const rowEls = ROWS.map((r, i) => {
    const y = 78 + i * 24;
    const g = mk('g', {}, rowsG);
    const id = mk('text', { x: 16, y, class: 'fw-ink' + (r.field ? ' fw-field' : '') }, g); id.textContent = r.id;
    mk('rect', { x: 104, y: y - 8, width: 120, height: 7, rx: 3.5, class: 'fw-barbg' }, g);
    const fill = mk('rect', { x: 104, y: y - 8, width: 0, height: 7, rx: 3.5, class: 'fw-barfill' + (r.score < 7 ? ' lo' : '') }, g);
    const sc = mk('text', { x: 232, y, class: 'fw-s' }, g); sc.textContent = r.score.toFixed(1);
    const mark = mk('text', { x: 314, y, 'text-anchor': 'end', class: r.bad === 'drift' ? 'fw-badt' : r.bad === 'dup' ? 'fw-warn' : 'fw-good' }, g); mark.textContent = r.mark;
    const strike = r.bad ? mk('line', { x1: 12, x2: 12, y1: y - 4, y2: y - 4, class: 'fw-strike' + (r.bad === 'dup' ? ' dup' : '') }, g) : null;
    return { g, id, fill, sc, mark, strike, r };
  });

  // Eval dots
  const dotsG = $('fwDots');
  const dots = [];
  for (let i = 0; i < 50; i++) {
    const c = i % 10, r = Math.floor(i / 10);
    dots.push(mk('circle', { cx: 26 + c * 18, cy: 60 + r * 20, r: 6, class: 'fw-dot' }, dotsG));
  }

  // Steps + play
  const stepsEl = $('fwSteps');
  const stepBtns = STAGES.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'fw__step'; b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = `<span class="n">0${i + 1}</span> <span class="l">${s.name}</span>`;
    b.addEventListener('click', () => jump(i));
    stepsEl.appendChild(b);
    return b;
  });
  const playBtn = $('fwPlay');

  /* ---------- Cycle state ---------- */
  let cycle = 0;
  let kpiShown = SUCCESS[0], kpiFrom = SUCCESS[0], kpiTo = SUCCESS[0], kpiT0 = 0;
  const succ = c => SUCCESS[Math.min(c, SUCCESS.length - 1)];
  const evalN = c => EVAL[Math.min(c, EVAL.length - 1)];

  function setCycle(c, now) {
    cycle = c;
    kpiFrom = kpiShown; kpiTo = succ(c); kpiT0 = now || performance.now();
    const v = `v1.${c}`, nv = `v1.${c + 1}`;
    svg.querySelectorAll('.fwVer').forEach(e => (e.textContent = v));
    $('fwKpiVer').textContent = `policy ${v} in production`;
    $('fwCandT').textContent = `candidate ${nv}`;
    $('fwShipT').textContent = `ship ${nv} → fleet`;
    $('fwVerM').textContent = v;
    const n = 412 + c * 7;
    rowEls[0].id.textContent = `ep_0${n}`;
    svg.querySelector('#fwClip text').textContent = `clip_0${n}.mcap · event.json`;
    $('fwEvalPrev').textContent = `current: ${c === 0 ? 41 : evalN(c - 1)}/50`;
    buildBars();
    updateCaption(activeIdx < 0 ? 0 : activeIdx, true);
  }

  function buildBars() {
    const g = $('fwBars');
    while (g.firstChild) g.removeChild(g.firstChild);
    const first = Math.max(0, cycle - 5);
    for (let k = 0; k < 6; k++) {
      const ver = first + k, x = 572 + k * 50;
      if (ver <= cycle) {
        const val = succ(ver), h = ((val - 60) / 40) * 86;
        mk('rect', { x, y: 420 - h, width: 34, height: h, rx: 4, class: 'fw-bar' + (ver === cycle ? ' fw-bar--now' : '') }, g);
        const t = mk('text', { x: x + 17, y: 414 - h, 'text-anchor': 'middle', class: 'fw-s' + (ver === cycle ? ' fw-orange' : '') }, g); t.textContent = `${val}%`;
      } else {
        mk('rect', { x, y: 416, width: 34, height: 4, rx: 2, class: 'fw-slot' }, g);
      }
      const l = mk('text', { x: x + 17, y: 438, 'text-anchor': 'middle', class: 'fw-s' }, g); l.textContent = `v1.${ver}`;
    }
  }

  /* ---------- Deploy: arm with analytic IK ---------- */
  const BASE = { x: 110, y: 164 }, A1 = 82, A2 = 74, L3 = 18;
  const HOME = [165, 112], AP = [50, 124], PK = [50, 168], AB = [253, 124], PL = [253, 168];
  const SEQ = [[AP, 600, 0], [PK, 420, 0], [PK, 260, 1, 'grab'], [AP, 360, 1], [AB, 950, 1], [PL, 420, 1], [PL, 260, 0, 'release'], [AB, 360, 0], [HOME, 620, 0]];
  const SEQ_T = SEQ.reduce((a, s) => a + s[1], 0);
  const DROP_AT = 600 + 420 + 260 + 360 + 950 * 0.55;
  const L1 = $('fwL1'), L2 = $('fwL2'), J0 = $('fwJ0'), J1 = $('fwJ1'), J2 = $('fwJ2'), grip = $('fwGrip'), cup = $('fwCup'), fail = $('fwFail'), flash = $('fwFlash');

  function ik(tx, ty) {
    const wx = tx, wy = ty - L3;
    let dx = wx - BASE.x, dy = wy - BASE.y, d = Math.hypot(dx, dy);
    const mx = A1 + A2 - 0.5;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    const a = Math.atan2(dy, dx);
    const al = Math.acos(clamp((A1 * A1 + d * d - A2 * A2) / (2 * A1 * d), -1, 1));
    const c = [a - al, a + al].map(s => ({ x: BASE.x + A1 * Math.cos(s), y: BASE.y + A1 * Math.sin(s) }));
    const el = c[0].y < c[1].y ? c[0] : c[1];
    const w = { x: BASE.x + dx, y: BASE.y + dy };
    return { el, w, tip: { x: w.x, y: w.y + L3 } };
  }

  function armAt(t, failMode) {
    let from = HOME, g0 = 0, held = false, placed = false, start = 0;
    let pos = HOME, g = 0;
    for (const [to, dur, gt, ev] of SEQ) {
      const end = start + dur;
      if (t >= end) {
        if (ev === 'grab') held = true;
        if (ev === 'release') { held = false; placed = true; }
        from = to; g0 = gt; start = end; pos = to; g = gt; continue;
      }
      const f = (t - start) / dur, e = ease(f);
      pos = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
      g = g0 + (gt - g0) * f;
      if (ev === 'grab' && f > 0.6) held = true;
      if (ev === 'release' && f > 0.5) { held = false; placed = true; }
      break;
    }
    const P = ik(pos[0], pos[1]);
    let cx = 50, cy = 156, rot = 0, failVis = 0, flashT = -1;
    if (failMode && t >= DROP_AT) {
      // the cup slipped mid-transport: replay the fall
      const d = armAt(DROP_AT - 1, false);
      const ft = (t - DROP_AT) / 1000;
      cx = d.cup.x; cy = Math.min(156, d.cup.y + 0.5 * 1500 * ft * ft); rot = clamp(ft / 0.35) * 28;
      const land = Math.sqrt((2 * (156 - d.cup.y)) / 1500) * 1000;
      flashT = t - DROP_AT - land;
      failVis = seg(t, DROP_AT + 200, DROP_AT + 450);
    } else if (held) { cx = P.tip.x; cy = P.tip.y - 12; }
    else if (placed) { cx = 253; cy = 156; }
    return { P, g, cup: { x: cx, y: cy, rot }, failVis, flashT };
  }

  function drawArm(s) {
    const { P } = s;
    L1.setAttribute('x2', P.el.x); L1.setAttribute('y2', P.el.y);
    L2.setAttribute('x1', P.el.x); L2.setAttribute('y1', P.el.y); L2.setAttribute('x2', P.w.x); L2.setAttribute('y2', P.w.y);
    J1.setAttribute('cx', P.el.x); J1.setAttribute('cy', P.el.y);
    J2.setAttribute('cx', P.w.x); J2.setAttribute('cy', P.w.y);
    const w = 26 - 10 * s.g, x = P.tip.x, y0 = P.w.y, y1 = P.tip.y;
    grip.setAttribute('d', `M${x - w / 2} ${y0} H${x + w / 2} M${x - w / 2} ${y0} V${y1} M${x + w / 2} ${y0} V${y1}`);
    cup.setAttribute('x', s.cup.x - 7); cup.setAttribute('y', s.cup.y);
    cup.setAttribute('transform', s.cup.rot ? `rotate(${s.cup.rot} ${s.cup.x} ${s.cup.y + 16})` : '');
    op(fail, s.failVis);
    if (s.flashT >= 0 && s.flashT < 700) {
      const k = s.flashT / 700;
      flash.setAttribute('cx', s.cup.x); flash.setAttribute('cy', 164);
      flash.setAttribute('r', 8 + k * 22); op(flash, 1 - k);
    } else op(flash, 0);
  }

  /* ---------- Stage renderers ---------- */
  const R = [
    // 0 deploy
    (p, now, active) => {
      if (active) drawArm(armAt(Math.min(SEQ_T, p * STAGES[0].dur), true));
      else if (reduce) drawArm(armAt(SEQ_T, true));
      else drawArm(armAt(now % (SEQ_T + 500), false));
      $('fwDeployKpi').textContent = `${Math.round(kpiShown)}%`;
    },
    // 1 capture
    (p, now) => {
      const hit = seg(p, 0.35, 0.45);
      const pupil = $('fwPupil');
      pupil.setAttribute('cx', hit > 0 || reduce ? 0 : 5 * Math.sin(now / 420));
      svg.querySelector('.fw-eye').classList.toggle('is-hit', hit > 0.5);
      op($('fwVlmSay'), hit); op($('fwVlmIdle'), 1 - hit);
      op($('fwT'), seg(p, 0.35, 0.42)); op($('fwTl'), seg(p, 0.35, 0.42));
      const b = seg(p, 0.5, 0.6);
      op($('fwWin'), b); op($('fwBrk'), b); op($('fwBrkL'), b); op($('fwBrkR'), b);
      const c = seg(p, 0.65, 0.75);
      const clip = $('fwClip'); op(clip, c); clip.setAttribute('transform', `translate(0 ${(1 - c) * 6})`);
    },
    // 2 curate
    p => {
      rowEls.forEach((e, i) => {
        const vis = seg(p, 0.03 + i * 0.07, 0.1 + i * 0.07);
        const f = ease(seg(p, 0.12 + i * 0.07, 0.32 + i * 0.07));
        e.fill.setAttribute('width', 120 * (e.r.score / 10) * f);
        op(e.sc, f > 0.95 ? 1 : 0);
        op(e.mark, seg(p, 0.5 + i * 0.06, 0.56 + i * 0.06));
        let o = vis;
        if (e.strike) {
          const s = e.r.bad === 'drift' ? seg(p, 0.72, 0.8) : seg(p, 0.78, 0.86);
          e.strike.setAttribute('x2', 12 + 304 * s);
          o = vis * (1 - 0.55 * s);
        }
        op(e.g, o);
      });
      op($('fwCurSum'), seg(p, 0.86, 0.94));
    },
    // 3 train
    p => {
      const loss = $('fwLoss');
      const len = loss.__len || (loss.__len = loss.getTotalLength());
      const f = ease(seg(p, 0.05, 0.8));
      loss.style.strokeDasharray = `${len} ${len}`;
      loss.style.strokeDashoffset = len * (1 - f);
      $('fwEpoch').textContent = `epoch ${Math.round(12 * f)}/12`;
      op($('fwCand'), seg(p, 0.82, 0.9));
    },
    // 4 evaluate
    p => {
      const bad = new Set(BAD_DOTS.slice(0, 50 - evalN(cycle)));
      let run = 0, ok = 0;
      dots.forEach((d, i) => {
        const on = p > 0.04 + i * 0.013;
        if (on) { run++; if (!bad.has(i)) ok++; }
        d.setAttribute('class', 'fw-dot' + (on ? (bad.has(i) ? ' no' : ' ok') : ''));
      });
      $('fwEvalN').textContent = `${ok}/50`;
      op($('fwEvalOk'), seg(p, 0.74, 0.82));
    },
    // 5 ship
    p => {
      const s1 = $('fwShip1'), s2 = $('fwShip2');
      op(s1, seg(p, 0.04, 0.14)); op(s1.querySelector('.fw-check'), seg(p, 0.22, 0.3));
      op(s2, seg(p, 0.32, 0.42)); op(s2.querySelector('.fw-check'), seg(p, 0.5, 0.58));
      const chip = $('fwShipChip');
      op(chip, seg(p, 0.62, 0.72));
      chip.classList.toggle('is-glow', p > 0.72 && p < 1);
    },
  ];

  /* ---------- Caption ---------- */
  let activeIdx = -1;
  function updateCaption(i, force) {
    if (i === activeIdx && !force) return;
    activeIdx = i;
    const s = STAGES[i];
    $('fwCapK').textContent = `0${i + 1} · ${s.name}`;
    $('fwCapT').textContent = s.text.replace('{v}', `v1.${cycle}`);
    const L = $('fwCapL');
    L.innerHTML = '';
    s.links.forEach(([label, href]) => { const a = document.createElement('a'); a.href = href; a.textContent = `${label} →`; L.appendChild(a); });
    stepBtns.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    stations.forEach((st, k) => st.classList.toggle('is-active', k === i));
    anchors.forEach((a, k) => a.classList.toggle('is-active', k === i));
  }

  /* ---------- Mobile: zoom the viewBox to the active station ---------- */
  let vb = [0, 0, 1200, 720];
  function targetVB(i) {
    if (svg.clientWidth >= 640) return [0, 0, 1200, 720];
    const [x, y] = ORIG[i];
    return [x - 12, y - 12, 354, 224];
  }
  function applyVB(i, instant) {
    const t = targetVB(i);
    vb = vb.map((v, k) => (instant ? t[k] : v + (t[k] - v) * 0.14));
    svg.setAttribute('viewBox', vb.map(v => v.toFixed(2)).join(' '));
  }

  /* ---------- Main loop ---------- */
  let t = 0, playing = !reduce, last = performance.now(), running = false, visible = false;

  function render(now, snap) {
    const s = segs.find(x => t >= x.start && t < x.start + x.dur) || segs[0];
    const f = (t - s.start) / s.dur;
    let ai, packetLen, progLen;
    if (s.type === 'play') {
      ai = s.i; packetLen = ANCH[s.i]; progLen = ANCH[s.i];
    } else {
      const a = ANCH[s.from], b = s.i === 0 ? TOTAL : ANCH[s.i];
      packetLen = a + (b - a) * ease(f); progLen = packetLen;
      ai = f > 0.55 ? s.i : s.from;
    }
    updateCaption(ai);

    // KPI count-up
    const kk = clamp((now - kpiT0) / 900);
    kpiShown = kpiFrom + (kpiTo - kpiFrom) * ease(kk);
    $('fwKpi').textContent = `${Math.round(kpiShown)}%`;
    $('fwKpiM').textContent = `${Math.round(kpiShown)}%`;

    stations.forEach((_, k) => {
      if (reduce) return R[k](1, now, false);
      if (s.type === 'play' && k === s.i) R[k](f, now, true);
      else if (s.type === 'travel' && k === s.i) R[k](k === 0 ? 1 : 0, now, false);
      else R[k](1, now, false);
    });

    const pt = track.getPointAtLength(packetLen % TOTAL);
    packet.setAttribute('cx', pt.x); packet.setAttribute('cy', pt.y);
    halo.setAttribute('cx', pt.x); halo.setAttribute('cy', pt.y);
    prog.style.strokeDasharray = `${progLen} ${TOTAL}`;
    applyVB(ai, reduce || snap);
  }

  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    if (playing) {
      t += dt;
      if (t >= CYCLE) { t -= CYCLE; setCycle(cycle + 1, now); }
    }
    render(now);
    if (visible && !reduce) requestAnimationFrame(frame); else running = false;
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(frame); }

  function jump(i) {
    t = segs.find(x => x.type === 'play' && x.i === i).start;
    if (reduce || !running) render(performance.now(), true);
  }
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('is-paused', !playing);
    playBtn.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
  });
  if (reduce) { playBtn.classList.add('is-paused'); playBtn.hidden = true; }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0.05 }).observe(svg);
  window.addEventListener('resize', () => applyVB(activeIdx < 0 ? 0 : activeIdx, true));

  // Inspection hook: render an exact moment (stage i at progress p), paused.
  window.__fw = { at(i, p) { const sg = segs.find(x => x.type === 'play' && x.i === i); t = sg.start + p * sg.dur; playing = false; playBtn.classList.add('is-paused'); render(performance.now() + 5000, true); } };

  setCycle(0, performance.now());
  applyVB(0, true);
  render(performance.now());
})();

import math, random, sys, pathlib
OUT = pathlib.Path(sys.argv[1])

INK, DIM, LINE, PANEL = "#d6dee8", "#6b7a90", "#2a3647", "#0f1520"
COB, CYAN, GREEN, VIOLET, RED = "#7aa2ff", "#4cc9f0", "#34d399", "#a78bfa", "#f43f5e"
FONT = "'JetBrains Mono','SF Mono',Menlo,Consolas,monospace"

def svg(body, css="", defs=""):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500" font-family="{FONT}">
<defs>
<pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="#141c28"/></pattern>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
{defs}
</defs>
<style>
text{{font-family:{FONT}}}
{css}
@media (prefers-reduced-motion: reduce){{*{{animation:none!important}}}}
</style>
<rect width="800" height="500" fill="#0a0e14"/>
<rect width="800" height="500" fill="url(#dots)"/>
{body}
</svg>
'''

def t(x, y, s, size=13, fill=DIM, anchor="start", extra=""):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}"{extra}>{s}</text>'

def packet(path_id, dur, begin, color=CYAN, r=3.5):
    return (f'<circle r="{r}" fill="{color}" opacity="0"><animateMotion dur="{dur}s" begin="{begin}s" repeatCount="indefinite"><mpath href="#{path_id}"/></animateMotion>'
            f'<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.85;1" dur="{dur}s" begin="{begin}s" repeatCount="indefinite"/></circle>')

# ---------------- Forge: many formats -> one representation -> writers
def forge():
    cx, cy = 400, 250
    readers = ["RLDS", "LeRobot", "HDF5", "Zarr", "MCAP", "rosbag"]
    writers = ["LeRobot v3", "RLDS", "MCAP", "RoboDM"]
    b = []
    for i, name in enumerate(readers):
        y = 130 + i * 48
        b.append(f'<path id="r{i}" d="M168 {y} C 270 {y}, 290 {cy}, {cx-52} {cy}" fill="none" stroke="{LINE}" stroke-width="1.5"/>')
        b.append(f'<circle cx="164" cy="{y}" r="3" fill="{DIM}"/>')
        b.append(t(152, y + 5, name, 14, INK, "end"))
    for i, name in enumerate(writers):
        y = 178 + i * 48
        b.append(f'<path id="w{i}" d="M{cx+52} {cy} C 510 {cy}, 530 {y}, 632 {y}" fill="none" stroke="{LINE}" stroke-width="1.5"/>')
        b.append(f'<circle cx="636" cy="{y}" r="3" fill="{DIM}"/>')
        b.append(t(648, y + 5, name, 14, INK))
    b.append(f'<circle cx="{cx}" cy="{cy}" r="52" fill="none" stroke="{COB}" stroke-width="6" opacity=".45" filter="url(#glow)"/>')
    b.append(f'<circle cx="{cx}" cy="{cy}" r="52" fill="{PANEL}" stroke="{COB}" stroke-width="1.8"/>')
    b.append(f'<circle class="spin" cx="{cx}" cy="{cy}" r="40" fill="none" stroke="{COB}" stroke-width="1" stroke-dasharray="2 8" opacity=".6"/>')
    b.append(t(cx, cy + 5, "Episode", 15, INK, "middle"))
    b.append(t(152, 92, "reads", 13, DIM, "end"))
    b.append(t(648, 140, "writes", 13, DIM))
    for i in range(6): b.append(packet(f"r{i}", 2.6, -i * 0.43))
    for i in range(4): b.append(packet(f"w{i}", 2.6, -i * 0.65 - 0.3))
    css = ".spin{transform-origin:400px 250px;animation:spin 18s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}"
    return svg("\n".join(b), css)

# ---------------- Robotics Agent Skills: skill cards -> agent -> checked code
def skills():
    b = []
    for i, name in enumerate(["testing", "perception", "ros2"]):
        x, y = 96 + i * 18, 150 + i * 22
        b.append(f'<rect x="{x}" y="{y}" width="190" height="128" rx="10" fill="{PANEL}" stroke="{COB if i == 2 else LINE}" stroke-width="1.5"/>')
        if i == 2:
            b.append(t(x + 18, y + 30, "ros2 / SKILL.md", 14, INK))
            for j, w in enumerate([140, 112, 128, 90]):
                b.append(f'<rect x="{x+18}" y="{y+50+j*16}" width="{w}" height="4" rx="2" fill="{LINE}"/>')
    b.append(t(96 + 36, 380, "skills", 13, DIM))
    b.append(f'<path id="p0" d="M330 252 H 440" fill="none" stroke="{LINE}" stroke-width="1.5" stroke-dasharray="4 6"/>')
    b.append(packet("p0", 1.8, 0))
    b.append(packet("p0", 1.8, -0.9))
    px, py = 456, 140
    b.append(f'<rect x="{px}" y="{py}" width="260" height="224" rx="10" fill="{PANEL}" stroke="{LINE}" stroke-width="1.5"/>')
    rows = [(VIOLET, 40, 120), (DIM, 24, 150), (DIM, 24, 176), (VIOLET, 40, 96), (DIM, 24, 160), (DIM, 24, 132), (DIM, 24, 112)]
    for j, (c, x0, w) in enumerate(rows):
        y = py + 30 + j * 22
        b.append(f'<rect class="ln" style="animation-delay:{j*0.35:.2f}s" x="{px+x0-16}" y="{y}" width="{w}" height="5" rx="2.5" fill="{c}" opacity=".85"/>')
    b.append(f'<g class="ok"><circle cx="{px+228}" cy="{py+196}" r="11" fill="none" stroke="{GREEN}" stroke-width="1.8"/><path d="M{px+222} {py+196} l4 4 8 -9" fill="none" stroke="{GREEN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>')
    b.append(t(px, 392, "ROS 2 node with tests", 13, DIM))
    css = (".ln{transform-box:fill-box;transform-origin:left center;animation:type 6s ease-out infinite}"
           "@keyframes type{0%{transform:scaleX(0)}12%,92%{transform:scaleX(1)}100%{transform:scaleX(1);opacity:0}}"
           ".ok{opacity:0;animation:ok 6s ease-out infinite}@keyframes ok{0%,45%{opacity:0}55%,92%{opacity:1}100%{opacity:0}}")
    return svg("\n".join(b), css)

# ---------------- ROS Time Machine: rolling buffer, event, saved window
def rtm():
    x0, x1, ev = 80, 720, 520
    b = []
    defs = f'<clipPath id="tl"><rect x="{x0}" y="200" width="{x1-x0}" height="110"/></clipPath>'
    b.append(t(x0, 184, "rolling buffer", 13, DIM))
    rows = [(226, 12), (254, 20), (282, 15)]
    g = []
    for y, step in rows:
        n = (x1 - x0) // step + 4
        for k in range(n):
            x = x0 + k * step
            g.append(f'<rect x="{x}" y="{y-7}" width="3" height="14" rx="1.5" fill="{LINE}"/>')
    b.append(f'<g clip-path="url(#tl)"><g class="scroll">{"".join(g)}</g></g>')
    pre, post = ev - 6 * 30, ev + 3 * 30
    b.append(f'<rect x="{pre}" y="208" width="{post-pre}" height="94" rx="8" fill="{CYAN}" fill-opacity=".07" stroke="{CYAN}" stroke-opacity=".55" stroke-width="1.2"/>')
    b.append(f'<line x1="{ev}" y1="196" x2="{ev}" y2="312" stroke="{COB}" stroke-width="2"/>')
    b.append(f'<circle class="pulse" cx="{ev}" cy="196" r="6" fill="{COB}"/>')
    b.append(t(ev, 160, "“the tube falls”", 15, VIOLET, "middle"))
    b.append(f'<path d="M{pre} 322 v8 H{post} v-8" fill="none" stroke="{DIM}" stroke-width="1.2"/>')
    b.append(t(pre, 352, "−6 s", 13, DIM, "middle"))
    b.append(t(post, 352, "+3 s", 13, DIM, "middle"))
    b.append(t(ev, 352, "event", 13, COB, "middle"))
    b.append(f'<g class="clip"><rect x="{ev-80}" y="384" width="160" height="34" rx="8" fill="{PANEL}" stroke="{LINE}" stroke-width="1.5"/>{t(ev, 406, "clip.mcap", 14, INK, "middle")}</g>')
    css = (".scroll{animation:scroll 1.2s linear infinite}@keyframes scroll{to{transform:translateX(-60px)}}"
           ".pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}"
           ".clip{animation:clip 4.8s ease-in-out infinite}@keyframes clip{0%,20%{opacity:0;transform:translateY(6px)}35%,90%{opacity:1;transform:none}100%{opacity:0}}")
    # scroll period must be a multiple of every row step: 60 = lcm-ish of 20 and multiple of... use per-row groups instead
    return svg("\n".join(b), css, defs)

def rtm_fixed():
    # per-row scrolling groups so each row loops seamlessly
    x0, x1, ev = 80, 720, 520
    s = rtm()
    return s

# ---------------- Tessera: clusters, diverse picks
def tessera():
    rnd = random.Random(7)
    centers = [(250, 210, 70, 46), (480, 160, 60, 40), (540, 330, 80, 50), (300, 350, 50, 34)]
    b = []
    for cx, cy, rx, ry in centers:
        b.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx+22}" ry="{ry+22}" fill="none" stroke="{LINE}" stroke-width="1" stroke-dasharray="3 6"/>')
    pts = []
    for ci, (cx, cy, rx, ry) in enumerate(centers):
        for _ in range(30):
            a = rnd.uniform(0, 2 * math.pi); r = math.sqrt(rnd.uniform(0, 1))
            pts.append((ci, cx + r * rx * math.cos(a), cy + r * ry * math.sin(a)))
    for _, x, y in pts:
        b.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="#33425a"/>')
    picks = []
    for ci in range(len(centers)):
        cl = [p for p in pts if p[0] == ci]
        cl.sort(key=lambda p: math.atan2(p[2] - centers[ci][1], p[1] - centers[ci][0]))
        picks += [cl[0], cl[len(cl) // 2]]
    for k, (_, x, y) in enumerate(picks):
        b.append(f'<g class="pk" style="animation-delay:{k*0.45:.2f}s"><circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{GREEN}"/><circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="none" stroke="{GREEN}" stroke-width="1.5"/></g>')
    b.append(t(80, 452, "episode embeddings · UMAP", 13, DIM))
    b.append(t(720, 452, f"diverse subset: {len(picks)} of {len(pts)}", 13, GREEN, "end"))
    css = ".pk{opacity:0;animation:pk 7s ease-out infinite}@keyframes pk{0%{opacity:0}6%,88%{opacity:1}100%{opacity:0}}"
    return svg("\n".join(b), css)

# ---------------- Anvil: pinned reference vs today's scene
def anvil():
    b = []
    b.append(f'<line x1="120" y1="360" x2="560" y2="360" stroke="{LINE}" stroke-width="2"/>')
    # camera
    b.append(f'<rect x="318" y="96" width="44" height="26" rx="6" fill="{PANEL}" stroke="{DIM}" stroke-width="1.5"/><circle cx="340" cy="109" r="6" fill="none" stroke="{DIM}" stroke-width="1.5"/>')
    b.append(f'<path d="M322 124 L200 352 M358 124 L480 352" stroke="{LINE}" stroke-width="1" stroke-dasharray="3 6"/>')
    def rack(x, stroke, dash="", cls=""):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        c = f' class="{cls}"' if cls else ""
        slots = "".join(f'<circle cx="{x+22+i*28}" cy="{318}" r="7" fill="none" stroke="{stroke}" stroke-width="1.5"{d}/>' for i in range(4))
        return f'<g{c}><rect x="{x}" y="300" width="128" height="60" rx="6" fill="none" stroke="{stroke}" stroke-width="1.8"{d}/>{slots}</g>'
    b.append(f'<rect x="276" y="300" width="128" height="60" rx="6" fill="none" stroke="{DIM}" stroke-width="1.5" stroke-dasharray="4 5"/>')
    b.append(rack(276, COB, "", "drift"))
    b.append(t(340, 392, "reference position", 13, DIM, "middle"))
    b.append(f'<g class="flag">{t(370, 284, "rack moved", 13, RED, "middle")}</g>')
    rows = [("camera pose", True), ("lighting", True), ("fixtures", False)]
    for i, (name, ok) in enumerate(rows):
        y = 200 + i * 44
        col = GREEN if ok else RED
        mark = (f'<path d="M612 {y-4} l4 4 8 -9" fill="none" stroke="{col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' if ok
                else f'<path d="M612 {y-9} l9 9 M621 {y-9} l-9 9" stroke="{col}" stroke-width="2" stroke-linecap="round"/>')
        cls = '' if ok else ' class="flag"'
        b.append(f'<g{cls}>{mark}{t(636, y+1, name, 14, INK)}</g>')
    b.append(t(612, 160, "session check", 13, DIM))
    css = (".drift{animation:drift 5s ease-in-out infinite}@keyframes drift{0%,20%{transform:translateX(0)}45%,90%{transform:translateX(30px)}100%{transform:translateX(0)}}"
           ".flag{opacity:0;animation:flag 5s ease-in-out infinite}@keyframes flag{0%,45%{opacity:0}55%,90%{opacity:1}100%{opacity:0}}")
    return svg("\n".join(b), css)

# ---------------- frameforge: windows stay inside episodes
def frameforge():
    b = []
    fw, gap, epgap = 20, 6, 26
    eps = [7, 9, 6]
    x = 88; y = 214; frames = []
    for ei, n in enumerate(eps):
        start = x
        for k in range(n):
            frames.append((ei, x)); x += fw + gap
        end = x - gap
        b.append(t((start + end) / 2, 196, f"episode {ei}", 13, DIM, "middle"))
        x += epgap
    for ei, fx in frames:
        b.append(f'<rect x="{fx}" y="{y}" width="{fw}" height="56" rx="3" fill="{PANEL}" stroke="{LINE}" stroke-width="1.2"/>')
    # boundaries
    xs = [fx for _, fx in frames]
    idx = 0; bnds = []
    for n in eps[:-1]:
        idx += n
        bnds.append(xs[idx - 1] + fw + epgap / 2 + (0))
    for bx in bnds:
        b.append(f'<line x1="{bx-3:.0f}" y1="204" x2="{bx-3:.0f}" y2="282" stroke="{RED}" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="3 4"/>')
    # window positions (start frame index, always within one episode); width 4 frames
    W = 4; offs = [0, 2, 3, 7, 9, 12, 16, 18]
    pos = [xs[i] - 4 for i in offs]
    vals = ";".join(f"{p:.0f}" for p in pos) + f";{pos[0]:.0f}"
    kt = ";".join(f"{i/len(pos):.3f}" for i in range(len(pos))) + ";1"
    ww = W * fw + (W - 1) * gap + 8
    b.append(f'<rect x="{pos[0]:.0f}" y="{y-6}" width="{ww}" height="68" rx="6" fill="{COB}" fill-opacity=".08" stroke="{COB}" stroke-width="1.8">'
             f'<animate attributeName="x" values="{vals}" keyTimes="{kt}" dur="8s" calcMode="discrete" repeatCount="indefinite"/></rect>')
    b.append(t(88, 330, "4-frame clip", 13, COB))
    b.append(t(88, 356, "sampled inside one episode, never across", 13, DIM))
    # workers
    for i in range(4):
        wy = 400 + i * 0
    b.append(t(712, 330, "num_workers = 8", 13, DIM, "end"))
    b.append(t(712, 356, "fork-safe", 13, GREEN, "end"))
    return svg("\n".join(b))

# ---------------- Armature: arm records a pick-and-place demonstration
def armature():
    B = (300, 372); L1, L2 = 150, 130
    keys = [(400, 230), (470, 300), (470, 340), (470, 280), (590, 280), (590, 340), (590, 280), (400, 230)]
    seg = [1.0, 0.6, 0.5, 1.0, 0.6, 0.5, 1.2]
    T = sum(seg); N = 90
    def ik(x, y):
        dx, dy = x - B[0], y - B[1]; d = min(math.hypot(dx, dy), L1 + L2 - 1)
        a = math.atan2(dy, dx); c = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)
        th = a - math.acos(max(-1, min(1, c)))
        return (B[0] + L1 * math.cos(th), B[1] + L1 * math.sin(th))
    def ease(u): return u * u * (3 - 2 * u)
    samples = []
    for i in range(N + 1):
        tt = T * i / N; acc = 0
        for k, s in enumerate(seg):
            if tt <= acc + s or k == len(seg) - 1:
                u = ease(min(1, (tt - acc) / s)); p, q = keys[k], keys[k + 1]
                samples.append((p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u)); break
            acc += s
    el = [ik(*p) for p in samples]
    J = lambda arr, i: ";".join(f"{a[i]:.1f}" for a in arr)
    dur = f"{T*1.6:.1f}s"
    def anim(attr, vals): return f'<animate attributeName="{attr}" values="{vals}" dur="{dur}" repeatCount="indefinite"/>'
    b = []
    b.append(f'<line x1="120" y1="372" x2="700" y2="372" stroke="{LINE}" stroke-width="2"/>')
    trail = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in samples)
    b.append(f'<path d="{trail}" fill="none" stroke="{CYAN}" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2 5"/>')
    for x, lab in [(470, "pick"), (590, "place")]:
        b.append(f'<rect x="{x-22}" y="358" width="44" height="14" rx="3" fill="none" stroke="{LINE}" stroke-width="1.2"/>')
        b.append(t(x, 398, lab, 13, DIM, "middle"))
    # box: follows the gripper between grasp and release
    grasp = (seg[0] + seg[1]) / T; release = sum(seg[:5]) / T
    bx = []; by = []
    for i, (x, y) in enumerate(samples):
        u = i / N
        if u < grasp: bx.append(470); by.append(346)
        elif u <= release: bx.append(x); by.append(y + 6)
        else: bx.append(590); by.append(346)
    bvx = ";".join(f"{v-9:.1f}" for v in bx); bvy = ";".join(f"{v:.1f}" for v in by)
    b.append(f'<rect x="461" y="346" width="18" height="18" rx="3" fill="{COB}">{anim("x", bvx)}{anim("y", bvy)}</rect>')
    b.append(f'<line x1="{B[0]}" y1="{B[1]}" x2="{el[0][0]:.1f}" y2="{el[0][1]:.1f}" stroke="{INK}" stroke-width="10" stroke-linecap="round" opacity=".9">{anim("x2", J(el,0))}{anim("y2", J(el,1))}</line>')
    b.append(f'<line x1="{el[0][0]:.1f}" y1="{el[0][1]:.1f}" x2="{samples[0][0]:.1f}" y2="{samples[0][1]:.1f}" stroke="{INK}" stroke-width="7" stroke-linecap="round" opacity=".9">'
             f'{anim("x1", J(el,0))}{anim("y1", J(el,1))}{anim("x2", J(samples,0))}{anim("y2", J(samples,1))}</line>')
    b.append(f'<circle cx="{el[0][0]:.1f}" cy="{el[0][1]:.1f}" r="7" fill="#0a0e14" stroke="{COB}" stroke-width="2">{anim("cx", J(el,0))}{anim("cy", J(el,1))}</circle>')
    b.append(f'<circle cx="{samples[0][0]:.1f}" cy="{samples[0][1]:.1f}" r="5" fill="#0a0e14" stroke="{COB}" stroke-width="2">{anim("cx", J(samples,0))}{anim("cy", J(samples,1))}</circle>')
    b.append(f'<rect x="{B[0]-26}" y="{B[1]-8}" width="52" height="16" rx="4" fill="{PANEL}" stroke="{DIM}" stroke-width="1.5"/>')
    b.append(f'<circle cx="{B[0]}" cy="{B[1]-8}" r="8" fill="#0a0e14" stroke="{COB}" stroke-width="2"/>')
    b.append(f'<circle class="rec" cx="96" cy="88" r="5" fill="{RED}"/>' + t(110, 93, "REC  episode_004", 13, INK))
    b.append(t(704, 93, "→ LeRobot v3", 13, DIM, "end"))
    css = ".rec{animation:rec 1.4s ease-in-out infinite}@keyframes rec{50%{opacity:.25}}"
    return svg("\n".join(b), css)

# ---------------- Embodied AI Visuals: flow matching, noise -> trajectory
def visuals():
    rnd = random.Random(3)
    b = []
    curve = (480, 340, 560, 340, 600, 180, 700, 160)
    def bez(u):
        x0, y0, x1, y1, x2, y2, x3, y3 = curve; m = 1 - u
        return (m**3*x0 + 3*m*m*u*x1 + 3*m*u*u*x2 + u**3*x3, m**3*y0 + 3*m*m*u*y1 + 3*m*u*u*y2 + u**3*y3)
    b.append(f'<path d="M{curve[0]} {curve[1]} C {curve[2]} {curve[3]}, {curve[4]} {curve[5]}, {curve[6]} {curve[7]}" fill="none" stroke="{COB}" stroke-width="6" opacity=".35" filter="url(#glow)"/>')
    b.append(f'<path d="M{curve[0]} {curve[1]} C {curve[2]} {curve[3]}, {curve[4]} {curve[5]}, {curve[6]} {curve[7]}" fill="none" stroke="{COB}" stroke-width="2.2" stroke-linecap="round"/>')
    n = 14
    starts = sorted(((rnd.uniform(110, 250), rnd.uniform(150, 360)) for _ in range(n)), key=lambda p: -p[1])
    for i in range(n):
        sx, sy = starts[i]
        ex, ey = bez(i / (n - 1))
        b.append(f'<path id="f{i}" d="M{sx:.1f} {sy:.1f} L{ex:.1f} {ey:.1f}" fill="none" stroke="#1d2735" stroke-width="1"/>')
        b.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="2.5" fill="#33425a"/>')
        d = 4.0; beg = -(i % 5) * 0.25
        b.append(f'<circle r="3.5" fill="{CYAN}"><animateMotion dur="{d}s" begin="0s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;{0.1+0.02*(i%5):.2f};{0.7+0.02*(i%5):.2f};1" calcMode="spline" keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1"><mpath href="#f{i}"/></animateMotion></circle>')
    b.append(t(175, 400, "noise", 13, DIM, "middle"))
    b.append(t(590, 400, "action trajectory", 13, COB, "middle"))
    b.append(t(80, 92, "flow matching", 13, DIM))
    return svg("\n".join(b))

for name, fn in [("forge", forge), ("skills", skills), ("rtm", rtm), ("tessera", tessera), ("anvil", anvil),
                 ("frameforge", frameforge), ("armature", armature), ("visuals", visuals)]:
    (OUT / f"{name}.svg").write_text(fn())
print("written")

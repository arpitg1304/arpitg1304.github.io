# Concept illustration style spec

Every project gets one hand-authored, self-contained, animated SVG that shows *what the repo does*:
a conceptual diagram/scene, not a screenshot. They must look like one family.

## Canvas
- `viewBox="0 0 800 500"` (16:10), `width="800" height="500"`, no external refs, no <image>, no fonts loaded.
- Background: `#0a0e14`, with a blueprint grid: minor lines every 20px `#101722`, major every 100px `#151e2b` (use a <pattern>).
  Add a soft radial vignette (center transparent → edges #05070a at ~60% opacity).
- Signature: top-left mono tag at (24, 34), 12px, `#6b7a90`, e.g. `forge://hub`. A tiny orange dot (r=3, #ff7a1a) before it.
  Optional bottom-right micro caption in the same style.

## Palette (use semantically)
- ink `#d6dee8` (primary labels) · dim `#6b7a90` (secondary) · line `#2a3647` (strokes) · panel fill `#0f1520`
- orange `#ff7a1a` = the hero / active element / events (the site's accent; use it on 1 focal thing)
- cyan `#4cc9f0` = data flowing · green `#34d399` = pass / ok / selected · violet `#a78bfa` = models / AI / VLM
- red `#f43f5e` = failure / drift · amber `#fbbf24` = warnings (sparingly)

## Type
- `font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace"` for everything.
- Card images display at ~380–620px wide, so: minimum font-size 13, main labels 15–18, at most one 22–26 display label.
- Keep text sparse (≤ ~14 labels). The picture should explain itself; labels just anchor it.

## Shapes
- Panels/nodes: `rx="10"`, fill `#0f1520`, stroke `#2a3647` 1.5. Focal node stroke = orange, with a soft glow (feGaussianBlur ~6, 0.5 opacity).
- Lines 1.5–2px, round caps/joins. Flow paths dashed `4 6` in `#2a3647`, with moving packets (small circles r=3–4, cyan) via SMIL `<animateMotion>` along the path.
- Generous negative space; composition reads left→right or center-out.

## Motion
- CSS `@keyframes` in an inline `<style>` and/or SMIL. Loops 3–8 s, calm, never flashy.
- Include `@media (prefers-reduced-motion: reduce){ *{animation:none!important} }` (SMIL can't be disabled that way; that's OK, keep SMIL subtle).
- First frame must look complete (the static thumbnail is the first frame).

## Size / QA
- < 30 KB each. Validate with `xmllint --noout file.svg`.
- Render & inspect: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=800,500 --screenshot=/path/out.png file:///abs/path.svg` then Read the PNG. Iterate until it looks excellent: balanced, legible, no overlaps/clipping.

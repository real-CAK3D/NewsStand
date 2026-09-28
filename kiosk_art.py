"""Hand-drawn SVG props for The Corner Chronicle's kiosk: the counter radio, the ashtray with a burning joint, the cash register,
the tip-line payphone, the stash box, the pocket knife, mason jars and seed packets. Plain SVG + CSS classes so kiosk.js/kiosk.css
can animate them (knobs turn, smoke curls, the lid lifts, blades flick open)."""

RADIO = '''<svg class="rd-svg" viewBox="0 0 240 158" aria-hidden="true">
<defs>
 <linearGradient id="rdBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0584c"/><stop offset=".55" stop-color="#b8352c"/><stop offset="1" stop-color="#7d1f19"/></linearGradient>
 <linearGradient id="rdCream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf1da"/><stop offset="1" stop-color="#e2cfa6"/></linearGradient>
 <radialGradient id="rdKnob" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff8e6"/><stop offset=".6" stop-color="#d9c79e"/><stop offset="1" stop-color="#8e7a52"/></radialGradient>
 <radialGradient id="rdGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient>
</defs>
<path d="M78 22 Q120 -4 162 22" fill="none" stroke="#4a2d17" stroke-width="7" stroke-linecap="round"/>
<rect x="8" y="20" width="224" height="124" rx="26" fill="url(#rdBody)" stroke="#5a1611" stroke-width="3"/>
<path d="M24 30 H216" stroke="#ff9d8f" stroke-width="3" stroke-linecap="round" opacity=".6"/>
<rect x="24" y="40" width="96" height="88" rx="14" fill="url(#rdCream)" stroke="#6d4c2a" stroke-width="2"/>
<g stroke="#a88b5d" stroke-width="3.2" stroke-linecap="round">
 <path d="M36 54H108"/><path d="M36 64H108"/><path d="M36 74H108"/><path d="M36 84H108"/><path d="M36 94H108"/><path d="M36 104H108"/><path d="M36 114H108"/></g>
<rect x="130" y="40" width="90" height="42" rx="7" fill="#f8efd6" stroke="#6d4c2a" stroke-width="2"/>
<rect class="rd-dialglow" x="132" y="42" width="86" height="38" rx="6" fill="#ffcf6b" opacity="0"/>
<g font-family="Oswald, sans-serif" font-size="7.5" fill="#5a3b1c" text-anchor="middle">
 <text x="140" y="54">88</text><text x="157" y="54">92</text><text x="174" y="54">96</text><text x="191" y="54">100</text><text x="208" y="54">104</text></g>
<g stroke="#5a3b1c" stroke-width="1"><path d="M138 60V64M146 61V63M155 60V64M163 61V63M172 60V64M180 61V63M189 60V64M197 61V63M206 60V64M214 61V63"/></g>
<text class="rd-station" x="175" y="76" font-family="Oswald, sans-serif" font-size="8" font-weight="700" fill="#7d1f19" text-anchor="middle" letter-spacing=".5">OFF</text>
<line class="rd-needle" x1="140" y1="44" x2="140" y2="80" stroke="#c0271d" stroke-width="2.2"/>
<g class="rd-knob rd-vol" data-k="vol"><circle cx="152" cy="110" r="17" fill="url(#rdKnob)" stroke="#6d4c2a" stroke-width="2"/>
 <path d="M152 95V104" stroke="#6d4c2a" stroke-width="3" stroke-linecap="round"/></g>
<g class="rd-knob rd-tune" data-k="tune"><circle cx="200" cy="110" r="17" fill="url(#rdKnob)" stroke="#6d4c2a" stroke-width="2"/>
 <path d="M200 95V104" stroke="#6d4c2a" stroke-width="3" stroke-linecap="round"/></g>
<g font-family="Oswald, sans-serif" font-size="6.5" fill="#fbe0c6" text-anchor="middle" letter-spacing=".6"><text x="152" y="138">VOLUME</text><text x="200" y="138">TUNING</text></g>
<circle class="rd-lamp" cx="176" cy="111" r="5" fill="#5b1b16" stroke="#3a0f0c" stroke-width="1.5"/>
<circle class="rd-lampglow" cx="176" cy="111" r="11" fill="url(#rdGlow)" opacity="0"/>
<rect x="30" y="144" width="22" height="8" rx="3" fill="#3a1d10"/><rect x="188" y="144" width="22" height="8" rx="3" fill="#3a1d10"/>
<text x="72" y="36" font-family="Rye, serif" font-size="9" fill="#fbe0c6" text-anchor="middle" letter-spacing="1">GARDEN-TONE</text>
</svg>'''

ASHTRAY = '''<svg class="ash-svg" viewBox="0 0 170 130" aria-hidden="true">
<defs>
 <radialGradient id="ashGlass" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#e9f3f1" stop-opacity=".95"/><stop offset=".7" stop-color="#9fb8b3" stop-opacity=".85"/><stop offset="1" stop-color="#5f7c77" stop-opacity=".9"/></radialGradient>
 <radialGradient id="ember" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#ffb13b"/><stop offset=".75" stop-color="#e2461b"/><stop offset="1" stop-color="#7a1d0a" stop-opacity="0"/></radialGradient>
 <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#ddd3bd"/></linearGradient>
 <filter id="smokeBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>
<ellipse cx="80" cy="104" rx="70" ry="18" fill="#000" opacity=".25"/>
<ellipse cx="80" cy="96" rx="66" ry="22" fill="url(#ashGlass)" stroke="#4c6a65" stroke-width="2"/>
<ellipse cx="80" cy="92" rx="48" ry="14" fill="#5d706c" opacity=".55"/>
<ellipse cx="78" cy="92" rx="30" ry="8" fill="#8d8d88"/><ellipse cx="70" cy="90" rx="14" ry="4" fill="#b8b6ae"/>
<path d="M20 90 q4 -6 10 -3 M140 90 q-4 -6 -10 -3" stroke="#4c6a65" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M28 80 Q40 74 52 76" stroke="#fff" stroke-width="2" opacity=".6" fill="none" stroke-linecap="round"/>
<g class="joint">
 <path d="M44 88 L118 70 L121 80 L46 94 Z" fill="url(#paper)" stroke="#b9ad93" stroke-width="1"/>
 <path d="M44 88 L50 86.6 L52 92.6 L46 94 Z" fill="#c9a36b" stroke="#8d6a38" stroke-width=".8"/>
 <path d="M64 84 L66 89 M80 80 L82 86 M96 76 L98 82" stroke="#cfc3a6" stroke-width=".8"/>
 <path d="M118 70 L126 69 L128 77 L121 80 Z" fill="#6b6b66"/>
 <circle class="ember" cx="127" cy="73" r="7" fill="url(#ember)"/>
</g>
<g class="smoke" fill="none" stroke="#e8e6df" stroke-linecap="round" filter="url(#smokeBlur)">
 <path class="s1" d="M128 66 C120 54 138 46 128 34 C120 24 136 16 128 4" stroke-width="5"/>
 <path class="s2" d="M129 64 C140 52 124 42 134 30 C142 20 128 12 136 2" stroke-width="4"/>
 <path class="s3" d="M127 66 C116 58 130 48 122 38 C114 28 126 20 120 8" stroke-width="3.5"/>
</g>
</svg>'''

REGISTER = '''<svg class="rg-svg" viewBox="0 0 200 150" aria-hidden="true">
<defs><linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d58a"/><stop offset=".5" stop-color="#c9973f"/><stop offset="1" stop-color="#8a5f1f"/></linearGradient></defs>
<path d="M30 58 L170 58 L186 126 L14 126 Z" fill="url(#brass)" stroke="#5e3d10" stroke-width="2.5"/>
<rect x="56" y="14" width="88" height="44" rx="6" fill="url(#brass)" stroke="#5e3d10" stroke-width="2.5"/>
<rect x="64" y="21" width="72" height="28" rx="3" fill="#10230f" stroke="#5e3d10" stroke-width="1.5"/>
<g fill="#fff6dc" stroke="#5e3d10" stroke-width="1.2">
 <circle cx="44" cy="76" r="6"/><circle cx="62" cy="76" r="6"/><circle cx="80" cy="76" r="6"/><circle cx="98" cy="76" r="6"/><circle cx="116" cy="76" r="6"/><circle cx="134" cy="76" r="6"/><circle cx="152" cy="76" r="6"/>
 <circle cx="40" cy="94" r="6"/><circle cx="59" cy="94" r="6"/><circle cx="78" cy="94" r="6"/><circle cx="97" cy="94" r="6"/><circle cx="116" cy="94" r="6"/><circle cx="135" cy="94" r="6"/><circle cx="154" cy="94" r="6"/></g>
<rect x="18" y="108" width="164" height="18" rx="3" fill="#8a5f1f" stroke="#5e3d10" stroke-width="2"/>
<circle cx="100" cy="117" r="3.5" fill="#f3d58a"/>
<rect x="160" y="36" width="10" height="24" rx="3" fill="#5e3d10"/><circle cx="165" cy="32" r="7" fill="#e7e2d4" stroke="#5e3d10" stroke-width="2"/>
<rect x="14" y="126" width="172" height="10" rx="3" fill="#4a3212"/>
</svg>'''

PAYPHONE = '''<svg class="ph-svg" viewBox="0 0 96 170" aria-hidden="true">
<defs><linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d949a"/><stop offset=".35" stop-color="#eef1f3"/><stop offset=".7" stop-color="#a9b0b6"/><stop offset="1" stop-color="#6e757b"/></linearGradient></defs>
<rect x="10" y="6" width="76" height="158" rx="10" fill="url(#chrome)" stroke="#3c4247" stroke-width="2.5"/>
<rect x="20" y="16" width="56" height="16" rx="3" fill="#1f4d3a"/><text x="48" y="28" font-family="Oswald, sans-serif" font-size="9" font-weight="700" fill="#f3d58a" text-anchor="middle" letter-spacing="1">TIP LINE</text>
<g class="ph-handset"><path d="M14 44 q-8 0 -8 10 v44 q0 10 8 10 h8 v-12 h-6 v-40 h6 v-12 z" fill="#1b1b1b" stroke="#000" stroke-width="1.5"/></g>
<path class="ph-cord" d="M10 100 q-6 8 0 14 q6 6 0 12 q-6 6 0 12 q6 6 2 14" fill="none" stroke="#1b1b1b" stroke-width="2.5"/>
<g fill="#dfe3e6" stroke="#3c4247" stroke-width="1"><rect x="34" y="46" width="12" height="10" rx="2"/><rect x="50" y="46" width="12" height="10" rx="2"/><rect x="66" y="46" width="12" height="10" rx="2"/>
 <rect x="34" y="60" width="12" height="10" rx="2"/><rect x="50" y="60" width="12" height="10" rx="2"/><rect x="66" y="60" width="12" height="10" rx="2"/>
 <rect x="34" y="74" width="12" height="10" rx="2"/><rect x="50" y="74" width="12" height="10" rx="2"/><rect x="66" y="74" width="12" height="10" rx="2"/>
 <rect x="50" y="88" width="12" height="10" rx="2"/></g>
<rect x="44" y="110" width="28" height="6" rx="3" fill="#2d3236"/><rect x="34" y="128" width="46" height="22" rx="4" fill="#5a6167" stroke="#3c4247"/>
<text x="57" y="142" font-family="Oswald, sans-serif" font-size="6.5" fill="#dfe3e6" text-anchor="middle">FREE CALLS</text>
</svg>'''

STASHBOX = '''<svg class="sb-svg" viewBox="0 0 200 140" aria-hidden="true">
<defs>
 <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a4a22"/><stop offset=".5" stop-color="#a0662f"/><stop offset="1" stop-color="#6b3f1b"/></linearGradient>
 <linearGradient id="woodTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b87a3c"/><stop offset="1" stop-color="#8d5a28"/></linearGradient>
 <linearGradient id="velvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5a2a"/><stop offset="1" stop-color="#173816"/></linearGradient>
</defs>
<ellipse cx="100" cy="132" rx="92" ry="7" fill="#000" opacity=".3"/>
<path d="M14 60 L186 60 L186 128 L14 128 Z" fill="url(#wood)" stroke="#3d220c" stroke-width="2.5"/>
<g stroke="#5e3614" stroke-width="1" opacity=".55" fill="none"><path d="M16 74 q40 -6 84 0 t84 0"/><path d="M16 92 q50 6 90 -2 t78 2"/><path d="M16 110 q40 -4 86 2 t82 -2"/></g>
<path class="sb-inside" d="M20 60 L180 60 L172 50 L28 50 Z" fill="url(#velvet)"/>
<g class="sb-lid">
 <path d="M14 60 L28 30 L172 30 L186 60 Z" fill="url(#woodTop)" stroke="#3d220c" stroke-width="2.5"/>
 <g stroke="#6b3f1b" stroke-width="1" opacity=".5" fill="none"><path d="M34 38 H166"/><path d="M26 48 q70 -4 148 0"/></g>
 <text x="100" y="52" font-family="Rye, serif" font-size="17" fill="#2a1606" text-anchor="middle" letter-spacing="3" opacity=".8">STASH</text>
</g>
<rect x="92" y="56" width="16" height="16" rx="3" fill="#e8c46a" stroke="#6b4a12" stroke-width="1.5"/><circle cx="100" cy="66" r="2.4" fill="#6b4a12"/>
<path d="M150 104 c6 -10 16 -12 20 -8 c-4 -8 -2 -18 6 -22 c0 10 -2 18 -6 22 c8 -2 16 2 18 8 c-8 2 -18 0 -22 -4 c2 6 0 12 -4 16 c-2 -6 -2 -10 0 -14 c-4 4 -8 4 -12 2" fill="#4a8a3a" opacity=".85" transform="translate(-6 0) scale(.9)"/>
</svg>'''

# the pocket knife: blades are <g class="kn-blade"> pivoting at the handle's right end (rotate open with CSS)
KNIFE = '''<svg class="kn-svg" viewBox="0 0 420 300" aria-hidden="true">
<defs>
 <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".5" stop-color="#b9c1c8"/><stop offset="1" stop-color="#7d868e"/></linearGradient>
 <linearGradient id="handle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6423a"/><stop offset=".6" stop-color="#b3221c"/><stop offset="1" stop-color="#7e1510"/></linearGradient>
</defs>
<g class="kn-blades">
 <g class="kn-blade" data-tool="hermes" style="--open:172deg;--d:0ms"><path d="M300 176 L120 176 Q86 178 78 190 L300 192 Z" fill="url(#steel)" stroke="#59616a" stroke-width="1.5"/>
  <text x="200" y="187" font-family="Oswald, sans-serif" font-size="11" font-weight="700" fill="#2d333a" text-anchor="middle" letter-spacing="2">HERMES</text></g>
 <g class="kn-blade" data-tool="claude" style="--open:140deg;--d:90ms"><path d="M300 180 L170 180 Q150 181 146 190 L300 190 Z" fill="url(#steel)" stroke="#59616a" stroke-width="1.5"/>
  <text x="228" y="188.5" font-family="Oswald, sans-serif" font-size="9" font-weight="700" fill="#2d333a" text-anchor="middle" letter-spacing="1.5">CLAUDE CODE</text></g>
 <g class="kn-blade" data-tool="codex" style="--open:108deg;--d:180ms"><path d="M300 181 L176 181 L168 184 L168 187 L176 190 L300 190 Z" fill="url(#steel)" stroke="#59616a" stroke-width="1.5"/>
  <path d="M168 184 h-8 v3 h8" fill="#9aa3ab"/><text x="236" y="188.5" font-family="Oswald, sans-serif" font-size="9" font-weight="700" fill="#2d333a" text-anchor="middle" letter-spacing="1.5">CODEX</text></g>
 <g class="kn-blade" data-tool="ollama" style="--open:76deg;--d:270ms"><path d="M300 183 L230 183 L230 188 L300 188 Z" fill="url(#steel)" stroke="#59616a" stroke-width="1.2"/>
  <path d="M230 185.5 q-6 -8 -12 0 t-12 0 t-12 0 t-12 0 t-12 0" fill="none" stroke="#9aa3ab" stroke-width="3"/>
  <text x="262" y="181" font-family="Oswald, sans-serif" font-size="9" font-weight="700" fill="#2d333a" text-anchor="middle" letter-spacing="1.5">OLLAMA</text></g>
 <g class="kn-blade" data-tool="tips" style="--open:44deg;--d:360ms"><path d="M300 182 L200 178 L196 184 L300 189 Z" fill="url(#steel)" stroke="#59616a" stroke-width="1.2"/>
  <path d="M300 186 L204 190 L200 186 Z" fill="#d3d9de" stroke="#59616a" stroke-width="1"/>
  <text x="250" y="178" font-family="Oswald, sans-serif" font-size="9" font-weight="700" fill="#2d333a" text-anchor="middle" letter-spacing="1.5">TIPS &amp; TRICKS</text></g>
 <g class="kn-blade" data-tool="fresh" style="--open:14deg;--d:450ms"><path d="M300 184 L214 184 L210 186 L214 188 L300 188 Z" fill="#e9d9b0" stroke="#8a7440" stroke-width="1"/>
  <text x="256" y="182" font-family="Oswald, sans-serif" font-size="8" font-weight="700" fill="#5a4a20" text-anchor="middle" letter-spacing="1">FRESH FINDS</text></g>
</g>
<rect x="120" y="170" width="200" height="30" rx="15" fill="url(#handle)" stroke="#5e0f0b" stroke-width="2.5"/>
<path d="M134 176 H306" stroke="#ff8a80" stroke-width="2" opacity=".5" stroke-linecap="round"/>
<circle cx="136" cy="185" r="4" fill="#d9dde0" stroke="#59616a"/><circle cx="304" cy="185" r="4" fill="#d9dde0" stroke="#59616a"/>
<g transform="translate(206 176) scale(.15)" color="#f7e9c8">@@SEAL@@</g>
<circle cx="312" cy="185" r="6" fill="none" stroke="#b9c1c8" stroke-width="2.5"/>
</svg>'''


def jar(color, bud, label, idx):
    """A mason jar full of buds; `color` tints the buds, `bud` the highlights."""
    return ('<svg class="jar-svg" viewBox="0 0 80 110" aria-hidden="true"><defs><linearGradient id="jg%d" x1="0" y1="0" x2="1" y2="0">'
            '<stop offset="0" stop-color="#dff0ef" stop-opacity=".55"/><stop offset=".25" stop-color="#ffffff" stop-opacity=".25"/>'
            '<stop offset=".75" stop-color="#cfe4e2" stop-opacity=".2"/><stop offset="1" stop-color="#a7c7c3" stop-opacity=".55"/></linearGradient></defs>'
            '<rect x="16" y="2" width="48" height="10" rx="3" fill="#caa648" stroke="#7b6220" stroke-width="1.5"/>'
            '<rect x="14" y="11" width="52" height="9" rx="3" fill="#e0bf5c" stroke="#7b6220" stroke-width="1.5"/>'
            '<path d="M14 22 Q8 28 8 40 V96 Q8 106 20 106 H60 Q72 106 72 96 V40 Q72 28 66 22 Z" fill="#e9f3f2" fill-opacity=".25" stroke="#8fb0ac" stroke-width="1.5"/>'
            '<g>%s</g><path d="M14 22 Q8 28 8 40 V96 Q8 106 20 106 H60 Q72 106 72 96 V40 Q72 28 66 22 Z" fill="url(#jg%d)"/>'
            '<path d="M16 34 V92" stroke="#fff" stroke-width="3" opacity=".55" stroke-linecap="round"/>'
            '<rect x="18" y="56" width="44" height="26" rx="3" fill="#f7efd9" stroke="#8a7440" stroke-width="1"/></svg>'
            % (idx, "".join('<circle cx="%d" cy="%d" r="%d" fill="%s"/><circle cx="%d" cy="%d" r="%d" fill="%s" opacity=".8"/>'
                            % (x, y, r, color, x - 2, y - 2, max(2, r // 2), bud)
                            for x, y, r in ((22, 96, 9), (38, 98, 10), (56, 96, 9), (28, 82, 9), (48, 84, 10), (62, 80, 7), (20, 66, 8), (36, 64, 9),
                                            (54, 66, 9), (26, 48, 8), (44, 46, 9), (60, 50, 7), (34, 34, 7), (52, 34, 6))), idx))


NEWSROLL = '''<svg viewBox="0 0 120 40" aria-hidden="true"><defs><linearGradient id="roll" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf6e8"/><stop offset=".5" stop-color="#e3d9c0"/><stop offset="1" stop-color="#b9ac8c"/></linearGradient></defs>
<rect x="4" y="6" width="112" height="28" rx="14" fill="url(#roll)" stroke="#6d5a36" stroke-width="1.5"/>
<g stroke="#8d7c58" stroke-width="1" opacity=".7"><path d="M20 12 H100"/><path d="M16 18 H104"/><path d="M16 24 H96"/><path d="M22 30 H92"/></g>
<rect x="54" y="5" width="7" height="30" fill="#c0271d"/><ellipse cx="112" cy="20" rx="4" ry="13" fill="#d8ccad" stroke="#6d5a36"/></svg>'''

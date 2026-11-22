'use strict';
/* =========================================================
   ART — arte original em SVG (estilo "plástico/argila" semi-3D):
   medalhas de rank, figuras dos exercícios e mapa do corpo.
   API: Art.init(), Art.TIERS, Art.badge(), Art.figure(), Art.body(),
        Art.FIGURE_KEYS, Art.MUSCLES
   ========================================================= */
const Art = (() => {

  /* ---------- cores ---------- */
  const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const dark = (c, t) => mix(c, '#000000', t), light = (c, t) => mix(c, '#ffffff', t);
  const f1 = n => (Math.round(n * 100) / 100);

  const TIERS = [
    { id: 'ferro', name: 'Iron', c1: '#b8bfcc', c2: '#7d8596', c3: '#4a5062' },
    { id: 'bronze', name: 'Bronze', c1: '#f0a46b', c2: '#c9733a', c3: '#7d4018' },
    { id: 'prata', name: 'Silver', c1: '#f4f7fb', c2: '#bcc6d6', c3: '#7b879c' },
    { id: 'ouro', name: 'Gold', c1: '#ffe27a', c2: '#f2b01e', c3: '#b87a05' },
    { id: 'platina', name: 'Platinum', c1: '#8ff5da', c2: '#2fc6a8', c3: '#14806f' },
    { id: 'diamante', name: 'Diamond', c1: '#b6c4ff', c2: '#6f84f5', c3: '#3a45b8' },
    { id: 'mestre', name: 'Master', c1: '#f3a6ff', c2: '#c44bf0', c3: '#7b1fa8' },
    { id: 'elite', name: 'Elite', c1: '#ff8a8a', c2: '#e23a3a', c3: '#8a1220' },
    { id: 'lenda', name: 'Legend', c1: '#c9f6ff', c2: '#46c9ff', c3: '#1e7fd1', gold: '#ffd24a' },
  ];
  const GOLD = '#ffd24a';

  /* ---------- sprite com <defs> compartilhados ---------- */
  function defsMarkup() {
    let d = '';
    TIERS.forEach((t, i) => {
      d += `<linearGradient id="art-t${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset=".5" stop-color="${t.c2}"/><stop offset="1" stop-color="${t.c3}"/></linearGradient>`;
      d += `<linearGradient id="art-tr${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light(t.c1, .35)}"/><stop offset=".45" stop-color="${t.c2}"/><stop offset="1" stop-color="${dark(t.c3, .25)}"/></linearGradient>`;
      d += `<linearGradient id="art-tf${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(t.c2, t.c3, .45)}"/><stop offset="1" stop-color="${mix(t.c1, t.c2, .35)}"/></linearGradient>`;
      d += `<linearGradient id="art-tw${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.c3}"/><stop offset=".6" stop-color="${t.c2}"/><stop offset="1" stop-color="${t.c1}"/></linearGradient>`;
      d += `<radialGradient id="art-au${i}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${t.c1}" stop-opacity=".75"/><stop offset=".55" stop-color="${t.c2}" stop-opacity=".25"/><stop offset="1" stop-color="${t.c2}" stop-opacity="0"/></radialGradient>`;
    });
    d += `<linearGradient id="art-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="${GOLD}"/><stop offset="1" stop-color="#c58a0a"/></linearGradient>`;
    d += `<linearGradient id="art-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
    d += `<linearGradient id="art-lock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5578"/><stop offset="1" stop-color="#2a2742"/></linearGradient>`;
    d += `<linearGradient id="art-mute" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4568"/><stop offset="1" stop-color="#302c4a"/></linearGradient>`;
    d += `<linearGradient id="art-sil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34304f"/><stop offset="1" stop-color="#211e38"/></linearGradient>`;
    d += `<radialGradient id="art-head" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffe2c8"/><stop offset=".6" stop-color="#f0b996"/><stop offset="1" stop-color="#c98f6c"/></radialGradient>`;
    d += `<filter id="art-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>`;
    d += `<filter id="art-blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>`;
    d += `<filter id="art-blur3" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
    return d;
  }
  function init() {
    if (typeof document === 'undefined' || document.getElementById('art-sprite')) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('id', 'art-sprite'); s.setAttribute('width', '0'); s.setAttribute('height', '0');
    s.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = `<defs>${defsMarkup()}</defs>`;
    (document.body || document.documentElement).prepend(s);
  }

  /* =========================================================
     MEDALHAS
     ========================================================= */
  const CX = 60, CY = 55;
  const hexPts = (r, cx = CX, cy = CY, rot = -90) => [0, 1, 2, 3, 4, 5].map(i => {
    const a = (rot + i * 60) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const poly = pts => pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');

  function feather(L, W) {
    return `M0,0 C${f1(L * .28)},${f1(-W)} ${f1(L * .78)},${f1(-W * .95)} ${f1(L)},${f1(-W * .05)} C${f1(L * .72)},${f1(W * .38)} ${f1(L * .3)},${f1(W * .45)} 0,0 Z`;
  }
  function wings(t, n, L) {
    const T = TIERS[t], gold = t === 8;
    const fill = gold ? 'url(#art-gold)' : `url(#art-tw${t})`;
    let g = '';
    for (let i = 0; i < n; i++) {
      const ang = -74 + i * (92 / Math.max(1, n - 1)), len = L * (1 - i * .085), w = len * .34;
      g += `<g transform="translate(${CX + 30},${CY - 8}) rotate(${f1(ang)})"><path d="${feather(len, w)}" fill="${fill}" stroke="${dark(T.c3, .4)}" stroke-width="1"/><path d="M${f1(len * .12)},0 Q${f1(len * .55)},${f1(-w * .45)} ${f1(len * .9)},${f1(-w * .1)}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1" stroke-linecap="round"/></g>`;
    }
    return `<g>${g}</g><g transform="translate(${CX * 2},0) scale(-1,1)">${g}</g>`;
  }
  function gem(cx, cy, r, t, goldy) {
    const T = TIERS[t], a = goldy ? '#fff3b0' : light(T.c1, .55), b = T.c1, c = T.c2, d = T.c3, e = dark(T.c3, .25);
    const tw = r * .5, ty = cy - r * .55, gy = cy - r * .08;
    return `<g stroke="${dark(T.c3, .55)}" stroke-width=".7" stroke-linejoin="round">
      <polygon points="${poly([[cx - tw, ty], [cx + tw, ty], [cx + r * .22, gy - r * .25], [cx - r * .22, gy - r * .25]])}" fill="${a}"/>
      <polygon points="${poly([[cx - tw, ty], [cx - r * .22, gy - r * .25], [cx - r, gy], [cx - r * .62, gy - r * .35]])}" fill="${b}"/>
      <polygon points="${poly([[cx + tw, ty], [cx + r * .22, gy - r * .25], [cx + r, gy], [cx + r * .62, gy - r * .35]])}" fill="${c}"/>
      <polygon points="${poly([[cx - r, gy], [cx - r * .22, gy - r * .25], [cx, cy + r]])}" fill="${c}"/>
      <polygon points="${poly([[cx - r * .22, gy - r * .25], [cx + r * .22, gy - r * .25], [cx, cy + r]])}" fill="${b}"/>
      <polygon points="${poly([[cx + r * .22, gy - r * .25], [cx + r, gy], [cx, cy + r]])}" fill="${d}"/>
      <polygon points="${poly([[cx - r, gy], [cx - r * .62, gy - r * .35], [cx - r * .22, gy - r * .25]])}" fill="${e}" opacity=".35"/></g>`;
  }
  function emblem(t) {
    const T = TIERS[t];
    if (t === 0) return `<circle cx="${CX}" cy="${CY}" r="10" fill="url(#art-t0)" stroke="${dark(T.c3, .5)}" stroke-width="1.2"/><circle cx="${CX}" cy="${CY}" r="5" fill="${dark(T.c3, .25)}"/><circle cx="${CX - 1.5}" cy="${CY - 1.8}" r="2" fill="#fff" opacity=".5"/>`;
    if (t === 1) return `<g stroke="${dark(T.c3, .55)}" stroke-width=".9" stroke-linejoin="round"><polygon points="${poly([[CX - 13, CY + 1], [CX, CY - 10], [CX + 13, CY + 1], [CX + 13, CY + 8], [CX, CY - 3], [CX - 13, CY + 8]])}" fill="url(#art-t1)"/><polygon points="${poly([[CX - 13, CY + 10], [CX, CY - 1], [CX + 13, CY + 10], [CX + 13, CY + 17], [CX, CY + 6], [CX - 13, CY + 17]])}" fill="url(#art-t1)"/></g>`;
    if (t === 2) return `<polygon points="${poly([[CX, CY - 15], [CX + 11, CY], [CX, CY + 15], [CX - 11, CY]])}" fill="url(#art-t2)" stroke="${dark(T.c3, .5)}" stroke-width="1" stroke-linejoin="round"/><polygon points="${poly([[CX, CY - 15], [CX + 11, CY], [CX, CY]])}" fill="#fff" opacity=".35"/><polygon points="${poly([[CX, CY + 15], [CX - 11, CY], [CX, CY]])}" fill="#000" opacity=".16"/>`;
    const r = 14 + (t - 3) * 1.2;
    let s = '';
    if (t >= 5) { const y = CY - r * .55 - 1; s += `<g fill="url(#art-t${t})" stroke="${dark(T.c3, .55)}" stroke-width=".7" stroke-linejoin="round">${[-1, 0, 1].map(k => `<polygon points="${poly([[CX + k * 7 - 3, y + 1.5], [CX + k * 7, y - (k === 0 ? 8 : 5)], [CX + k * 7 + 3, y + 1.5]])}"/>`).join('')}</g>`; }
    if (t === 8) s += `<circle cx="${CX}" cy="${CY + 1}" r="${r + 5}" fill="none" stroke="url(#art-gold)" stroke-width="2.2"/>`;
    return s + gem(CX, CY + (t >= 5 ? 2 : 0), r, t, t === 8);
  }
  function stars(n) {
    let s = '';
    const pos = [[CX - 42, CY - 44, 4], [CX + 42, CY - 44, 4], [CX - 56, CY + 4, 3], [CX + 56, CY + 4, 3], [CX, CY - 60, 3.4]];
    for (let i = 0; i < Math.min(n, pos.length); i++) {
      const [x, y, r] = pos[i];
      s += `<polygon points="${poly([[x, y - r * 2], [x + r * .6, y - r * .6], [x + r * 2, y], [x + r * .6, y + r * .6], [x, y + r * 2], [x - r * .6, y + r * .6], [x - r * 2, y], [x - r * .6, y - r * .6]])}" fill="#fff6c8" stroke="${GOLD}" stroke-width=".6"/>`;
    }
    return s;
  }
  function pips(n, t, y = 103) {
    if (n == null || n < 0) return '';
    const T = TIERS[t], k = n + 1, gap = 11, x0 = CX - (k - 1) * gap / 2;
    let s = '';
    for (let i = 0; i < k; i++) {
      const x = x0 + i * gap;
      s += `<polygon points="${poly([[x - 5, y - 3], [x, y + 3.2], [x + 5, y - 3], [x + 5, y - .2], [x, y + 6], [x - 5, y - .2]])}" fill="url(#art-t${t})" stroke="${dark(T.c3, .6)}" stroke-width=".8" stroke-linejoin="round"/>`;
    }
    return s;
  }
  function lockedBadge(px) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 132 132" width="${px}" height="${px}" class="art-badge art-locked" role="img" aria-label="Sem rank">
      <ellipse cx="${CX}" cy="108" rx="26" ry="4.5" fill="#000" opacity=".4" filter="url(#art-blur)"/>
      <polygon points="${poly(hexPts(38))}" fill="url(#art-lock)" stroke="#1a1730" stroke-width="2" stroke-linejoin="round"/>
      <polygon points="${poly(hexPts(31))}" fill="#201d36" stroke="#3a3656" stroke-width="1.2" stroke-linejoin="round" stroke-dasharray="3 3"/>
      <rect x="${CX - 8}" y="${CY - 2}" width="16" height="13" rx="3" fill="#5a5578"/><path d="M${CX - 5},${CY - 2} v-4 a5,5 0 0 1 10,0 v4" fill="none" stroke="#5a5578" stroke-width="3"/>
      <circle cx="${CX}" cy="${CY + 4.5}" r="2" fill="#201d36"/>
      <polyline points="${poly(hexPts(38).slice(4).concat([hexPts(38)[0]]))}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  function badge(tier, sub, px) {
    px = px || 64;
    if (tier == null || tier < 0) return lockedBadge(px);
    tier = Math.min(8, tier | 0);
    const T = TIERS[tier], hx = hexPts(38), hi = hexPts(33), hf = hexPts(28);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 132 132" width="${px}" height="${px}" class="art-badge" role="img" aria-label="${T.name}">`;
    if (tier >= 4) s += `<circle cx="${CX}" cy="${CY}" r="${tier === 8 ? 58 : 50}" fill="url(#art-au${tier})" ${tier === 8 ? '' : 'opacity=".7"'}/>`;
    s += `<ellipse cx="${CX}" cy="112" rx="${26 + tier}" ry="4.5" fill="#000" opacity=".45" filter="url(#art-blur)"/>`;
    if (tier >= 6) {   // chifres
      const hg = tier === 8 ? 'url(#art-gold)' : `url(#art-t${tier})`;
      s += `<g fill="${hg}" stroke="${dark(T.c3, .5)}" stroke-width=".9" stroke-linejoin="round"><path d="M${CX - 10},${CY - 34} C${CX - 16},${CY - 44} ${CX - 27},${CY - 44} ${CX - 31},${CY - 56} C${CX - 28},${CY - 40} ${CX - 22},${CY - 31} ${CX - 15},${CY - 27} Z"/><path d="M${CX + 10},${CY - 34} C${CX + 16},${CY - 44} ${CX + 27},${CY - 44} ${CX + 31},${CY - 56} C${CX + 28},${CY - 40} ${CX + 22},${CY - 31} ${CX + 15},${CY - 27} Z"/></g>`;
    }
    if (tier >= 3) s += wings(tier, [0, 0, 0, 3, 4, 4, 5, 5, 6][tier], [0, 0, 0, 17, 19, 21, 24, 26, 29][tier]);
    /* corpo da medalha */
    s += `<polygon points="${poly(hexPts(38, CX, CY + 3))}" fill="${dark(T.c3, .55)}" opacity=".9"/>`;            // espessura
    s += `<polygon points="${poly(hx)}" fill="url(#art-tr${tier})" stroke="${dark(T.c3, .55)}" stroke-width="1.2" stroke-linejoin="round"/>`;
    s += `<polygon points="${poly(hi)}" fill="${dark(T.c3, .12)}" stroke="${light(T.c1, .25)}" stroke-width=".8" stroke-linejoin="round" stroke-opacity=".7"/>`;
    s += `<polygon points="${poly(hf)}" fill="url(#art-tf${tier})" stroke="${dark(T.c3, .4)}" stroke-width="1" stroke-linejoin="round"/>`;
    for (let i = 0; i < 6; i++) {   // facetas
      const a = hf[i], b = hf[(i + 1) % 6];
      s += `<polygon points="${poly([[CX, CY], a, b])}" fill="${i % 2 ? '#000' : '#fff'}" opacity="${i % 2 ? .1 : .09}"/>`;
    }
    s += emblem(tier);
    /* brilho */
    s += `<polyline points="${poly([hx[4], hx[5], hx[0]])}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.2,1.6) scale(.96) translate(2.4,2.2)"/>`;
    s += `<path d="M${CX - 22},${CY - 11} Q${CX},${CY - 30} ${CX + 20},${CY - 15} Q${CX},${CY - 16} ${CX - 22},${CY - 11} Z" fill="url(#art-gloss)" opacity=".7"/>`;
    if (tier === 8) s += stars(5);
    if (sub != null && tier < 8) s += pips(sub, tier);
    return s + '</svg>';
  }

  /* =========================================================
     FIGURAS (manequim feito de cápsulas)
     ========================================================= */
  const SK = '#f0b996', SKF = '#c08760', SH = '#4f8cff', SHF = '#3562c0', SHO = '#252a45', SHOF = '#171a30', HAIR = '#3b2a22', SHOE = '#eef1f8', SHOEF = '#aab0c4';
  const LEN = { T: 20, H: 12, U: 12, F: 11.5, Th: 17.5, Sh: 17.5 };
  const W = { torso: 14, neck: 4.4, ua: 6.6, fa: 5.6, th: 9.4, sh: 7.2, shorts: 11, foot: 4.8 };

  function cap(x1, y1, x2, y2, w, col, o) {
    o = o || {};
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 0.01;
    if (L < .05) { x2 = x1 + .05; }
    let nx = -dy / L, ny = dx / L; if (nx + ny > 0) { nx = -nx; ny = -ny; }
    const off = w * .2, e = Math.min(.14, 3 / L);          // encurta o brilho nas pontas
    const ax = x1 + dx * e, ay = y1 + dy * e, bx = x2 - dx * e, by = y2 - dy * e;
    const ln = (a, b, c, d, col2, wd, op) => `<line x1="${f1(a)}" y1="${f1(b)}" x2="${f1(c)}" y2="${f1(d)}" stroke="${col2}" stroke-width="${f1(wd)}"${op ? ` opacity="${op}"` : ''}/>`;
    return `<g stroke-linecap="round" fill="none">${ln(x1, y1, x2, y2, dark(col, .5), w + 1.3)}${ln(x1, y1, x2, y2, col, w)}${o.flat ? '' : ln(ax - nx * off, ay - ny * off, bx - nx * off, by - ny * off, dark(col, .3), w * .3, .4)}${o.flat ? '' : ln(ax + nx * off, ay + ny * off, bx + nx * off, by + ny * off, light(col, .55), w * .32, .6)}</g>`;
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function solve(p) {
    const V = (a, l) => [Math.cos(a * Math.PI / 180) * l, Math.sin(a * Math.PI / 180) * l], add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const J = { hip: [0, 0] };
    J.sh = add(J.hip, V(p.T, LEN.T)); J.head = add(J.sh, V(p.H, LEN.H));
    J.elN = add(J.sh, V(p.U, LEN.U)); J.wN = add(J.elN, V(p.F, LEN.F));
    const fo = p.fo || [1.6 * (p.face || 1), -.8];
    J.elF = add(add(J.sh, V(p.u != null ? p.u : p.U, LEN.U)), fo); J.wF = add(J.elF, V(p.f != null ? p.f : p.F, LEN.F));
    J.knN = add(J.hip, V(p.A, LEN.Th)); J.anN = add(J.knN, V(p.B, LEN.Sh));
    J.knF = add(add(J.hip, V(p.a != null ? p.a : p.A, LEN.Th)), fo); J.anF = add(J.knF, V(p.b != null ? p.b : p.B, LEN.Sh));
    const [jn, ax, ay] = p.at, d = [ax - J[jn][0], ay - J[jn][1]];
    for (const k in J) J[k] = [J[k][0] + d[0], J[k][1] + d[1]];
    return J;
  }
  function foot(an, kn, face, col, tip) {
    let dx = an[0] - kn[0], dy = an[1] - kn[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const t = tip || [face * dy, -face * dx];
    const ex = an[0] + t[0] * 6.4, ey = an[1] + t[1] * 6.4;
    return cap(an[0] - t[0] * 1.2, an[1] - t[1] * 1.2, ex, ey, W.foot, col);
  }
  function figSVG(pose, px) {
    const p = pose, J = solve(p), face = p.face || 1, far = SKF;
    const vb = p.vb || [0, 0, 100];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb[0]} ${vb[1]} ${vb[2]} ${vb[2]}" width="${px}" height="${px}" class="art-figure" role="img">`;
    if (p.shadow) s += `<ellipse cx="${p.shadow[0]}" cy="${p.shadow[1]}" rx="${p.shadow[2]}" ry="${p.shadow[3] || 2.6}" fill="#000" opacity=".42" filter="url(#art-blur)"/>`;
    if (p.eqBack) s += p.eqBack(J);
    const arm = (el, w, c, c2, dc) => cap(J.sh[0], J.sh[1], el[0], el[1], W.ua, c) + cap(el[0], el[1], w[0], w[1], W.fa, c) + `<circle cx="${f1(w[0])}" cy="${f1(w[1])}" r="2.9" fill="${dc}" stroke="${dark(dc, .45)}" stroke-width=".7"/>`;
    const leg = (kn, an, c, sc, shoe) => {
      const sp = lerp(J.hip, kn, .52);
      return cap(J.hip[0], J.hip[1], kn[0], kn[1], W.th, c) + cap(kn[0], kn[1], an[0], an[1], W.sh, c) +
        foot(an, kn, face, shoe, p.tipN && c === SK ? p.tipN : (p.tipF && c !== SK ? p.tipF : null)) + cap(J.hip[0], J.hip[1], sp[0], sp[1], W.shorts, sc);
    };
    /* far */
    s += arm(J.elF, J.wF, SKF, SHF, SKF);
    s += leg(J.knF, J.anF, SKF, SHOF, SHOEF);
    /* tronco */
    const u = [J.sh[0] - J.hip[0], J.sh[1] - J.hip[1]], ul = Math.hypot(u[0], u[1]); u[0] /= ul; u[1] /= ul;
    const top = [J.sh[0] - u[0] * 3.4, J.sh[1] - u[1] * 3.4], bot = [J.hip[0] + u[0] * 1.2, J.hip[1] + u[1] * 1.2];
    s += cap(J.sh[0], J.sh[1], J.head[0], J.head[1], W.neck, SK, { flat: true });
    s += cap(top[0], top[1], bot[0], bot[1], W.torso, SH);
    const hipS = cap(J.hip[0], J.hip[1], J.hip[0] + u[0] * -.01, J.hip[1] + u[1] * -.01, 11.6, SHO);
    const headS = () => {
      const [cx, cy] = J.head, r = 7.2, a1 = face === 1 ? 135 : 45, sw = face === 1 ? 0 : 1;
      const ex = cx + Math.cos(a1 * Math.PI / 180) * r, ey = cy + Math.sin(a1 * Math.PI / 180) * r;
      return `<g transform="rotate(${p.hr || 0} ${f1(cx)} ${f1(cy)})"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" fill="url(#art-head)" stroke="${dark(SK, .5)}" stroke-width=".9"/>
        <circle cx="${f1(cx + face * 7)}" cy="${f1(cy + .8)}" r="1.2" fill="${SK}" stroke="${dark(SK, .4)}" stroke-width=".5"/>
        <path d="M${f1(cx)},${f1(cy - r)} A${r},${r} 0 1 ${sw} ${f1(ex)},${f1(ey)} Z" fill="${HAIR}" stroke="${dark(HAIR, .4)}" stroke-width=".6"/>
        <path d="M${f1(cx - face * 3.2)},${f1(cy - 4.6)} Q${f1(cx)},${f1(cy - 7)} ${f1(cx + face * 3)},${f1(cy - 5)}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.1" stroke-linecap="round"/>
        <circle cx="${f1(cx + face * 3)}" cy="${f1(cy - .4)}" r="1.05" fill="#2a1d1a"/></g>`;
    };
    if (p.headBack) s += headS();
    /* perto */
    s += leg(J.knN, J.anN, SK, SHO, SHOE);
    s += hipS;
    if (!p.headBack && !p.headTop) s += headS();
    s += arm(J.elN, J.wN, SK, SH, SK);
    if (p.headTop) s += headS();
    if (p.eqFront) s += p.eqFront(J);
    return s + '</svg>';
  }

  /* equipamentos */
  const MET = '#b4bdd2', MET2 = '#6f7892';
  const bar = (x1, y, x2, w = 3) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#8089a6" stroke-width="${f1(w * .75)}" stroke-linecap="round"/>`;
  const post = (x, y1, y2, w = 2.6) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#5d6483" stroke-width="${f1(w * .7)}" stroke-linecap="round"/>`;
  const shadow = () => '';
  const floorLine = (y, x1 = 8, x2 = 92) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#3a3656" stroke-width="1" stroke-linecap="round"/>`;

  const chev = () => '';
  const POSES = {
    pullup: { T: -88, H: -74, U: 118, F: -62, u: 120, f: -60, A: 92, B: 98, a: 88, b: 94, face: 1, at: ['wN', 52, 27], hr: -8, fo: [2.6, -.6], vb: [2, 0, 100],
      eqBack: () => bar(16, 27, 84) + post(16, 27, 6) + post(84, 27, 6) + chev(50, 8) },
    pushup: { T: -22, H: -14, U: 90, F: 90, u: 92, f: 90, A: 158, B: 158, a: 158, b: 158, face: 1, at: ['wN', 76, 82], hr: 8, vb: [2, 34, 96],
      eqBack: () => shadow(48, 86, 40) + floorLine(86) },
    dips: { T: -94, H: -70, U: 92, F: 88, u: 92, f: 90, A: 100, B: 138, a: 104, b: 134, face: 1, at: ['wN', 50, 52], hr: 0, vb: [6, 6, 92],
      eqBack: () => shadow(50, 93, 30) + floorLine(93) + post(30, 52, 92, 2.8) + post(70, 52, 92, 2.8) + bar(22, 52, 78, 3.4) },
    muscleup: { T: -82, H: -70, U: 18, F: 90, u: 22, f: 90, A: 96, B: 102, a: 92, b: 98, face: 1, at: ['wN', 56, 46], hr: -4, vb: [4, 6, 92],
      eqBack: () => bar(18, 46, 88, 3.2) + post(18, 46, 8) + post(88, 46, 8) + chev(30, 24) },
    kneeraise: { T: -92, H: -52, U: -97, F: -83, u: -94, f: -86, A: 10, B: 100, a: 20, b: 96, face: 1, at: ['wN', 42, 12], hr: -12, vb: [0, 0, 100],
      eqBack: () => bar(12, 12, 76) + post(12, 12, 3) + post(76, 12, 3) },
    legraise: { T: -92, H: -52, U: -97, F: -83, u: -94, f: -86, A: -2, B: -2, a: 3, b: 3, face: 1, at: ['wN', 28, 12], hr: -12, vb: [0, 0, 100],
      eqBack: () => bar(12, 12, 62) + post(12, 12, 3) + post(62, 12, 3) },
    flraise: { T: -146, H: -160, U: -102, F: -98, u: -100, f: -96, A: 34, B: 34, a: 34, b: 34, face: -1, at: ['wN', 28, 12], hr: -12, vb: [0, 0, 100],
      eqBack: () => bar(12, 12, 46) + post(12, 12, 3) + post(46, 12, 3) },
    frontlever: { T: 180, H: -172, U: -90, F: -90, u: -90, f: -90, A: 0, B: 0, a: 0, b: 0, face: -1, at: ['wN', 30, 18], hr: 4, fo: [2.4, -1.2], vb: [0, 2, 100],
      eqBack: () => shadow(54, 93, 40) + post(18, 18, 92, 3) + post(42, 18, 92, 3) + bar(14, 18, 46, 3.2) },
    backlever: { T: 0, H: -10, U: -112, F: -112, u: -108, f: -108, A: 180, B: 180, a: 180, b: 180, face: 1, at: ['wN', 64, 18], hr: 12, fo: [-2, -1], vb: [0, 2, 100],
      eqBack: () => shadow(50, 93, 40) + post(52, 18, 92, 3) + post(78, 18, 92, 3) + bar(46, 18, 82, 3.2) },
    planche: { T: 0, H: -12, U: 104, F: 104, u: 106, f: 106, A: 180, B: 180, a: 180, b: 180, face: 1, at: ['wN', 72, 82], hr: 6, fo: [-2, -1], vb: [0, 30, 100],
      eqBack: () => shadow(50, 86, 44) + floorLine(86) },
    handstand: { T: 90, H: 98, U: 90, F: 90, u: 92, f: 90, A: -92, B: -90, a: -88, b: -90, face: 1, at: ['wN', 50, 86], hr: 180, headTop: true,
      tipN: [-1, 0], tipF: [-1, 0], vb: [0, 0, 100],
      eqBack: () => shadow(50, 89, 22) + floorLine(89, 20, 80) },
    hspu: { T: 90, H: 76, U: 40, F: 90, u: 44, f: 90, A: -96, B: -92, a: -88, b: -90, face: 1, at: ['wN', 54, 86], hr: 172, headTop: true,
      tipN: [-1, 0], tipF: [-1, 0], vb: [0, 0, 100],
      eqBack: () => shadow(50, 89, 24) + floorLine(89, 20, 80) },
    lsit: { T: -90, H: -80, U: 90, F: 90, u: 90, f: 90, A: -2, B: -2, a: 2, b: 2, face: 1, at: ['wN', 36, 77], hr: -6, vb: [4, 22, 82],
      eqBack: () => shadow(52, 92, 36) + floorLine(92) + post(28, 82, 91, 2.4) + post(44, 82, 91, 2.4) + bar(26, 82, 46, 3.4) },
    humanflag: { T: 180, H: 176, U: -128, F: -128, u: 132, f: 132, A: -2, B: -2, a: 2, b: 2, face: 1, at: ['sh', 36, 40], hr: -8, vb: [4, 4, 94],
      eqBack: () => shadow(52, 94, 36) + floorLine(94, 8, 92) + post(15, 4, 92, 4.2) },
    nordic: { T: -70, H: -62, U: 62, F: 76, u: 66, f: 78, A: 110, B: 180, a: 110, b: 180, face: 1, at: ['knN', 44, 82], hr: 8, vb: [0, 30, 100],
      eqBack: () => floorLine(86) },
    calfraise: { T: -90, H: -90, U: 92, F: 90, u: 94, f: 90, A: 90, B: 90, a: 90, b: 90, face: 1, at: ['anN', 50, 80], hr: 0, tipN: [.55, .85], tipF: [.55, .85], vb: [0, 8, 100],
      eqBack: () => floorLine(87, 22, 78) },
    pistol: { T: -68, H: -78, U: 8, F: 2, u: 14, f: 6, A: 14, B: 122, a: -8, b: -6, face: 1, at: ['anN', 40, 87], hr: 4, fo: [1, -.5], vb: [0, 20, 100],
      eqBack: () => shadow(48, 91, 30) + floorLine(91) },
  };


  /* ---------- silhueta sólida (estilo "pose" branca) ---------- */
  const WH = '#f4f6fc', WHF = '#a9b0c6', EDGE = '#0c0a16';
  function limb(a, b, r1, r2, col, edge) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const e = edge ? .95 : 0; r1 += e; r2 += e;
    const pts = [[a[0] + nx * r1, a[1] + ny * r1], [b[0] + nx * r2, b[1] + ny * r2], [b[0] - nx * r2, b[1] - ny * r2], [a[0] - nx * r1, a[1] - ny * r1]];
    return `<g fill="${col}"><polygon points="${pts.map(q => f1(q[0]) + ',' + f1(q[1])).join(' ')}"/><circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(r1)}"/><circle cx="${f1(b[0])}" cy="${f1(b[1])}" r="${f1(r2)}"/></g>`;
  }
  function silSVG(p, px) {
    const J = solve(p), face = p.face || 1, vb = p.vb || [0, 0, 100];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb[0]} ${vb[1]} ${vb[2]} ${vb[2]}" width="${px}" height="${px}" class="art-figure" role="img">`;
    if (p.eqBack) s += p.eqBack(J);
    const K = 1.2, part = (a, b, r1, r2, col) => limb(a, b, r1 * K, r2 * K, EDGE, true) + limb(a, b, r1 * K, r2 * K, col);
    const arm = (el, w, col) => part(J.sh, el, 3.9, 3.2, col) + part(el, w, 3.2, 2.3, col) + `<circle cx="${f1(w[0])}" cy="${f1(w[1])}" r="2.7" fill="${col}"/>`;
    const foot = (an, kn, col, tip) => {
      let dx = an[0] - kn[0], dy = an[1] - kn[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const t = tip || [face * dy, -face * dx]; return part([an[0] - t[0] * 1, an[1] - t[1] * 1], [an[0] + t[0] * 6.6, an[1] + t[1] * 6.6], 2.5, 1.8, col);
    };
    const leg = (kn, an, col, tip) => part(J.hip, kn, 5.4, 3.9, col) + part(kn, an, 4.1, 2.4, col) + foot(an, kn, col, tip);
    s += arm(J.elF, J.wF, WHF) + leg(J.knF, J.anF, WHF, p.tipF);
    s += part(J.sh, J.head, 2.8, 2.6, WH);
    s += part(J.hip, J.sh, 5.6, 6.9, WH);
    if (p.headBack) s += `<circle cx="${f1(J.head[0])}" cy="${f1(J.head[1])}" r="7.3" fill="${WH}" stroke="${EDGE}" stroke-width=".9"/>`;
    s += leg(J.knN, J.anN, WH, p.tipN);
    if (!p.headBack) s += `<circle cx="${f1(J.head[0])}" cy="${f1(J.head[1])}" r="7.3" fill="${WH}" stroke="${EDGE}" stroke-width=".9"/>`;
    s += arm(J.elN, J.wN, WH);
    if (p.eqFront) s += p.eqFront(J);
    return s + '</svg>';
  }

  function figure(key, px) {
    const p = POSES[key]; if (!p) return '';
    return silSVG(p, px || 96);
  }

  /* =========================================================
     MAPA DO CORPO
     ========================================================= */
  const MUSCLES = [
    { id: 'chest', name: 'Chest', views: ['front'] },
    { id: 'shoulders', name: 'Shoulders', views: ['front', 'back'] },
    { id: 'biceps', name: 'Biceps', views: ['front'] },
    { id: 'triceps', name: 'Triceps', views: ['back'] },
    { id: 'forearms', name: 'Forearms', views: ['front', 'back'] },
    { id: 'abs', name: 'Abs', views: ['front'] },
    { id: 'traps', name: 'Traps', views: ['back'] },
    { id: 'lats', name: 'Lats', views: ['back'] },
    { id: 'lowerback', name: 'Lower back', views: ['back'] },
    { id: 'glutes', name: 'Glutes', views: ['back'] },
    { id: 'quads', name: 'Quads', views: ['front'] },
    { id: 'hamstrings', name: 'Hamstrings', views: ['back'] },
    { id: 'calves', name: 'Calves', views: ['front', 'back'] },
  ];

  /* silhueta base (metade direita; a esquerda é espelhada) */
  const PARTS = [
    'M100,60 L134,66 C148,71 150,86 148,102 L142,132 C139,152 139,172 141,192 C143,206 141,218 138,228 L100,232 Z',      // tronco
    'M146,84 C160,78 174,90 174,108 L173,150 C172,162 162,166 155,160 L143,124 Z',                                     // braço
    'M152,154 C162,152 174,158 175,172 L173,226 C172,238 166,242 160,240 C154,234 150,200 149,176 Z',                  // antebraço
    'M158,236 C166,234 174,240 174,252 C173,262 168,266 163,264 C157,258 155,246 158,236 Z',                           // mão
    'M100,224 L142,224 C148,252 144,290 138,314 L112,314 C104,288 100,252 100,224 Z',                                  // coxa
    'M112,310 L138,310 C140,336 136,358 131,376 L118,376 C113,358 110,336 112,310 Z',                                  // canela
    'M116,372 L132,372 C138,382 142,390 140,396 C134,400 120,400 116,398 C112,392 112,380 116,372 Z',                  // pé
  ];
  const FRONT = {
    chest: ['M101,85 C112,79 131,79 144,89 C146,102 142,115 131,122 C119,127 106,123 101,115 Z'],
    shoulders: ['M147,82 C160,79 172,91 172,106 C172,115 168,123 161,129 C155,122 150,111 148,100 C147,93 146,88 147,82 Z'],
    biceps: ['M152,132 C161,129 170,134 171,148 C172,158 168,166 162,172 C156,169 152,160 151,150 C150,142 150,137 152,132 Z'],
    forearms: ['M154,178 C162,176 171,180 172,192 L171,214 C170,226 166,234 161,238 C157,232 154,216 154,202 Z'],
    abs: ['M100,129 L113,129 L111,202 C110,209 105,214 100,214 Z', 'M117,133 C129,133 137,146 137,166 C137,184 133,200 125,210 L115,206 Z'],
    quads: ['M103,232 C116,225 137,227 143,243 C148,268 145,292 139,308 C131,313 119,313 113,308 C106,286 102,260 103,232 Z'],
    calves: ['M114,326 C124,320 135,324 136,339 C137,354 133,367 129,376 C124,380 119,378 117,373 C112,358 110,338 114,326 Z'],
  };
  const BACK = {
    traps: ['M100,58 C112,60 126,66 144,76 C142,94 126,112 110,126 L100,138 Z'],
    shoulders: ['M147,82 C160,79 172,91 172,106 C172,115 168,123 161,129 C155,122 150,111 148,100 C147,93 146,88 147,82 Z'],
    lats: ['M145,104 C147,126 141,150 130,170 L113,182 L105,146 C124,140 140,126 145,104 Z'],
    lowerback: ['M100,152 C111,152 121,162 123,182 L121,208 L100,208 Z'],
    triceps: ['M152,128 C161,126 170,132 171,146 C172,158 168,168 162,174 C156,171 152,162 151,150 C150,141 150,134 152,128 Z'],
    forearms: ['M154,180 C162,178 171,182 172,194 L171,214 C170,226 166,234 161,238 C157,232 154,218 154,204 Z'],
    glutes: ['M101,210 C114,204 138,208 144,224 C146,242 136,254 120,254 C108,254 101,248 101,236 Z'],
    hamstrings: ['M103,260 C117,254 139,258 144,272 C148,290 144,306 138,316 C130,320 119,320 113,314 C106,298 102,278 103,260 Z'],
    calves: ['M114,330 C126,324 140,328 140,344 C140,358 134,368 129,376 C123,380 119,378 117,372 C111,358 110,342 114,330 Z'],
  };

  function body(view, colors, px) {
    colors = colors || {}; px = px || 320;
    const set = view === 'back' ? BACK : FRONT, mirror = 'translate(200,0) scale(-1,1)';
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" width="${f1(px / 2)}" height="${px}" class="art-body" data-view="${view}" role="img">`;
    s += `<ellipse cx="100" cy="397" rx="58" ry="5" fill="#000" opacity=".4" filter="url(#art-blur3)"/>`;
    /* silhueta: 1º passe = contorno, 2º passe = preenchimento (une as peças) */
    const sil = (tr, pass) => `<g${tr ? ` transform="${tr}"` : ''}>${PARTS.map(d => pass === 0 ? `<path d="${d}" fill="#4a4568" stroke="#4a4568" stroke-width="3" stroke-linejoin="round"/>` : `<path d="${d}" fill="url(#art-sil)"/>`).join('')}</g>`;
    const head = pass => pass === 0
      ? `<rect x="89" y="44" width="22" height="22" rx="8" fill="#4a4568" stroke="#4a4568" stroke-width="3"/><ellipse cx="100" cy="28" rx="16" ry="19.5" fill="#4a4568" stroke="#4a4568" stroke-width="3"/>`
      : `<rect x="89" y="44" width="22" height="22" rx="8" fill="url(#art-sil)"/><ellipse cx="100" cy="28" rx="16" ry="19.5" fill="url(#art-sil)"/><path d="M86,22 Q100,5 114,22" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="3" stroke-linecap="round"/>`;
    s += sil(null, 0) + sil(mirror, 0) + head(0) + sil(null, 1) + sil(mirror, 1) + head(1);
    /* músculos */
    Object.keys(set).forEach(id => {
      const t = colors[id], has = t != null && t >= 0, ti = has ? Math.min(8, t | 0) : -1;
      const fill = has ? `url(#art-t${ti})` : 'url(#art-mute)', stroke = has ? dark(TIERS[ti].c3, .55) : '#1b1830';
      const one = tr => set[id].map(d =>
        `<g${tr ? ` transform="${tr}"` : ''}><path data-muscle="${id}" d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1.3" stroke-linejoin="round"${has ? ` data-tier="${ti}"` : ''}/><path d="${d}" fill="url(#art-gloss)" opacity="${has ? .7 : .28}" pointer-events="none"/></g>`).join('');
      s += `<g class="art-muscle" data-muscle-group="${id}">${one()}${one(mirror)}</g>`;
    });
    /* detalhes */
    const ln = (y, a, b) => `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" stroke="#000" stroke-opacity=".28" stroke-width="1.3" stroke-linecap="round" pointer-events="none"/>`;
    if (view === 'front') s += ln(150, 89, 111) + ln(170, 89, 111) + ln(190, 90, 110) + `<line x1="100" y1="131" x2="100" y2="212" stroke="#000" stroke-opacity=".3" stroke-width="1.3" pointer-events="none"/>`;
    else s += `<line x1="100" y1="64" x2="100" y2="206" stroke="#000" stroke-opacity=".25" stroke-width="1.3" pointer-events="none"/>`;
    return s + '</svg>';
  }

  return { init, TIERS, badge, figure, body, FIGURE_KEYS: Object.keys(POSES), MUSCLES, _poses: POSES, _solve: solve, _f1: f1 };
})();
if (typeof window !== 'undefined') window.Art = Art;

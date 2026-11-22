/* ============================================================
   Avatar — characters cut from the user's own AI-generated sheets
   (img/av/cNN.png = original art, bNN.png = same art with eyes/brows/
   nose/mouth erased, mNN.png = region mask: 1 skin, 2 hair, 3 beard,
   4 outfit). Everything is recoloured / re-expressed on a <canvas>,
   so it stays offline and one consistent style.
   Needs avmeta.js (AVC) loaded first.
   ============================================================ */
const AV = {
  skin: ['#ffe0c8', '#fdbc98', '#f0a878', '#dc9060', '#c07848', '#a05c34', '#80441f', '#5e2f18', '#40200f', '#9ad56e', '#79b8f2', '#b69af0'],
  hair: ['#1d1a20', '#3b2a22', '#5b3a26', '#8a5a34', '#b8793c', '#d9a24a', '#f0d68a', '#e8e4dc', '#9a9aa4', '#d9552a', '#c43a3a', '#e664b4', '#8a5cf0', '#3f7cf0', '#27b58f'],
  out: ['#2b2a30', '#f4f1ea', '#c43a3a', '#e8892e', '#f0c23a', '#6a9a3a', '#2a9a7a', '#3f7cf0', '#6a4cc8', '#e664b4', '#8a6a4a', '#7a8088'],
  bg: ['#2a2650', '#4a3f9a', '#3f7cf0', '#27b58f', '#6a9a3a', '#e8892e', '#c43a3a', '#e664b4', '#7a8088', '#f0d68a'],
};
AV.beard = AV.hair;
const AV_MOODS = [
  ['default', 'Original'], ['happy', 'Happy'], ['laugh', 'Laugh'], ['calm', 'Calm'], ['sad', 'Sad'], ['cry', 'Crying'], ['worried', 'Worried'],
  ['thinking', 'Thinking'], ['angry', 'Angry'], ['psycho', 'Psycho'], ['surprised', 'Shocked'], ['sleepy', 'Sleepy'], ['cool', 'Cool'],
  ['smug', 'Smug'], ['playful', 'Playful'], ['serious', 'Serious'],
];
// mood -> [left eye, right eye, brows, mouth]
const AV_MOOD_DEF = {
  happy: ['dot', 'dot', 'raised', 'grin'], laugh: ['happy', 'happy', 'raised', 'grin'], calm: ['dot', 'dot', 'normal', 'smile'],
  sad: ['dot', 'dot', 'sad', 'frown'], cry: ['tear', 'tear', 'sad', 'wail'], worried: ['big', 'big', 'worried', 'wavy'],
  thinking: ['side', 'side', 'skeptic', 'smirk'], angry: ['dot', 'dot', 'angry', 'frown'], psycho: ['psycho', 'psycho', 'angryThick', 'psycho'],
  surprised: ['wide', 'wide', 'raised', 'oh'], sleepy: ['sleepy', 'sleepy', 'flat', 'neutral'], cool: ['narrow', 'narrow', 'flat', 'smirk'],
  smug: ['narrow', 'narrow', 'skeptic', 'smirk'], playful: ['dot', 'wink', 'raised', 'tongue'], serious: ['dot', 'dot', 'thick', 'neutral'],
};
const AV_NOSE = [['classic', 'Classic'], ['round', 'Round'], ['button', 'Button'], ['wide', 'Wide'], ['pointy', 'Pointy'], ['none', 'None']];
const AV_CHIN = [['full', 'Full beard'], ['stubble', 'Stubble'], ['shaved', 'Clean']];
const AV_GLASSES = [['none', 'None'], ['round', 'Round'], ['square', 'Square'], ['shades', 'Shades']];
const AV_EAR = [['none', 'None'], ['stud', 'Stud'], ['hoop', 'Hoop']];
const AV_FACE = [['none', 'None'], ['freckles', 'Freckles'], ['blush', 'Blush'], ['scar', 'Scar'], ['patch', 'Eye patch']];
const AV_W = 328, AV_H = 280, AV_CROP = [52, 10, 224, 224], AV_FACECROP = [92, 80, 144, 144];
const AV_INK = '#2b2530';

const avPad = i => String(i).padStart(2, '0');
function normAv(a) {
  const base = { c: AVC[0].id, skin: null, hair: null, beard: null, out: null, bg: AV.bg[0], mood: 'default', chin: 'full', nose: 'classic', glasses: 'none', ear: 'none', face: 'none' };
  if (!a || typeof a !== 'object') {
    const i = (typeof a === 'number' ? a : (typeof S !== 'undefined' && S.settings && S.settings.char) || 0) % AVC.length;
    return Object.assign(base, { c: AVC[Math.abs(i)].id });
  }
  const o = Object.assign(base, a);
  if (!AVC.some(c => c.id === o.c)) o.c = AVC[0].id; // avatars saved by older versions
  if (!AV_MOOD_DEF[o.mood] && o.mood !== 'default') o.mood = 'default';
  if (!AV_CHIN.some(c => c[0] === o.chin)) o.chin = 'full';
  return o;
}
function avatarOf() { return normAv(typeof S !== 'undefined' && S.settings ? S.settings.avatar : null); }
function avatarRandom() {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)], chance = p => Math.random() < p;
  const moods = Object.keys(AV_MOOD_DEF);
  return normAv({
    c: pick(AVC).id, skin: chance(.45) ? pick(AV.skin.slice(0, 9)) : null, hair: chance(.5) ? pick(AV.hair) : null,
    beard: chance(.35) ? pick(AV.hair) : null, out: chance(.8) ? pick(AV.out) : null, bg: pick(AV.bg),
    chin: pick(AV_CHIN)[0], mood: chance(.7) ? pick(moods) : 'default', nose: pick(AV_NOSE)[0], glasses: chance(.25) ? pick(AV_GLASSES.slice(1))[0] : 'none',
    ear: chance(.2) ? pick(AV_EAR.slice(1))[0] : 'none', face: chance(.25) ? pick(AV_FACE.slice(1))[0] : 'none',
  });
}

/* ---------- asset loading ---------- */
const _avAssets = {}, _avRender = new Map();
function _avImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function avLoad(id) {
  if (_avAssets[id]) return _avAssets[id];
  return _avAssets[id] = Promise.all([_avImg(`img/av/c${id}.png`), _avImg(`img/av/b${id}.png`), _avImg(`img/av/m${id}.png`), _avImg(`img/av/s${id}.png`)]).then(([c, b, m, sh]) => {
    const cv = document.createElement('canvas'); cv.width = AV_W; cv.height = AV_H; const x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(m, 0, 0); const d = x.getImageData(0, 0, AV_W, AV_H).data, mask = new Uint8Array(AV_W * AV_H);
    for (let i = 0; i < mask.length; i++) mask[i] = d[i * 4];
    return { c, b, sh, mask };
  });
}
const _hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const _hx = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/* ---------- drawing helpers (std frame: eyes at 138/190, y 126) ---------- */
const EX = [138, 190], EY = 126, MX = 164;
function _eye(x, kind, sgn, g) {
  const ink = AV_INK; g.lineCap = 'round'; g.lineJoin = 'round';
  const dot = (rx, ry, ox = 0, oy = 0) => {
    g.fillStyle = ink; g.beginPath(); g.ellipse(x + ox, EY + oy, rx, ry, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x + ox - rx * .3, EY + oy - ry * .35, rx * .3, ry * .27, 0, 0, 7); g.fill();
  };
  const arc = (dy, bend) => { g.strokeStyle = ink; g.lineWidth = 3.8; g.beginPath(); g.moveTo(x - 8.5, EY + dy); g.quadraticCurveTo(x, EY + dy + bend, x + 8.5, EY + dy); g.stroke(); };
  const white = (rx, ry) => { g.fillStyle = '#fff'; g.strokeStyle = ink; g.lineWidth = 2.4; g.beginPath(); g.ellipse(x, EY, rx, ry, 0, 0, 7); g.fill(); g.stroke(); };
  if (kind === 'dot') dot(7, 9);
  else if (kind === 'big') dot(8.6, 11);
  else if (kind === 'happy') arc(4, -13);
  else if (kind === 'sleepy') arc(-1, 8);
  else if (kind === 'wink') arc(4, -13);
  else if (kind === 'wide') { white(10.5, 12.5); g.fillStyle = ink; g.beginPath(); g.arc(x, EY, 3.8, 0, 7); g.fill(); }
  else if (kind === 'psycho') { white(11, 12.5); g.fillStyle = '#d8434a'; g.globalAlpha = .35; g.beginPath(); g.ellipse(x, EY, 11, 12.5, 0, 0, 7); g.fill(); g.globalAlpha = 1; g.fillStyle = ink; g.beginPath(); g.arc(x, EY, 2.6, 0, 7); g.fill(); }
  else if (kind === 'side') { white(9.8, 11); g.fillStyle = ink; g.beginPath(); g.ellipse(x + 4.4, EY - 1.6, 4.6, 5.6, 0, 0, 7); g.fill(); }
  else if (kind === 'narrow') { g.fillStyle = ink; g.beginPath(); g.ellipse(x, EY + 2, 7.4, 3.8, 0, 0, 7); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 9, EY - 1.5); g.lineTo(x + 9, EY - 1.5); g.stroke(); }
  else if (kind === 'tear') {
    dot(7, 9);
    g.fillStyle = '#8fd0ff'; g.strokeStyle = '#4a9fe0'; g.lineWidth = 1.4; g.beginPath(); const tx = x + sgn * 3, ty = EY + 13;
    g.moveTo(tx, ty); g.quadraticCurveTo(tx - 6, ty + 10, tx, ty + 14); g.quadraticCurveTo(tx + 6, ty + 10, tx, ty); g.fill(); g.stroke();
  }
}
function _brows(kind, col, g) {
  if (kind === 'none') return;
  g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = 5.4;
  const P = { // [outerDy, innerDy, bend, width]
    normal: [0, -1, -4], raised: [-9, -10, -5], flat: [0, 0, 0], sad: [3, -8, -2], worried: [2, -10, -3], angry: [-4, 6, 1], angryThick: [-6, 8, 1, 7.2], thick: [0, 0, -2, 7.4],
  };
  [0, 1].forEach(i => {
    let k = kind; if (kind === 'skeptic') k = i ? 'angry' : 'raised';
    const [o, n, b, w] = P[k] || P.normal; const sgn = i ? 1 : -1, x = EX[i], y = EY - 21;
    g.lineWidth = w || 5.4; g.beginPath();
    g.moveTo(x + sgn * 14, y + o); g.quadraticCurveTo(x, y + (o + n) / 2 + b, x - sgn * 14, y + n); g.stroke();
  });
}
function _mouth(kind, mode, skinC, g, a) {
  const beard = mode === 'beard', my = beard ? 181 : 184, dark = '#4b1c28';
  const line = beard ? skinC : '#c4574f';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const stroke = (w, fn) => { g.strokeStyle = line; g.lineWidth = beard ? w + 2.6 : w; g.beginPath(); fn(); g.stroke(); };
  const open = (fn, teeth, tongue) => {
    g.beginPath(); fn(); g.closePath();
    g.save(); g.fillStyle = dark; g.fill();
    g.clip();
    if (teeth) { g.fillStyle = '#fff'; g.fillRect(MX - 30, my - 12, 60, teeth); }
    if (tongue) { g.fillStyle = '#e0707a'; g.beginPath(); g.ellipse(MX, my + tongue[0], tongue[1], tongue[2], 0, 0, 7); g.fill(); }
    g.restore();
    g.strokeStyle = beard ? skinC : '#a83f45'; g.lineWidth = beard ? 3.4 : 2.2; g.beginPath(); fn(); g.closePath(); g.stroke();
  };
  switch (kind) {
    case 'smile': stroke(3.6, () => { g.moveTo(MX - 14, my - 2); g.quadraticCurveTo(MX, my + 10, MX + 14, my - 2); }); break;
    case 'grin': open(() => { g.moveTo(MX - 17, my - 3); g.quadraticCurveTo(MX, my + 3, MX + 17, my - 3); g.quadraticCurveTo(MX, my + 21, MX - 17, my - 3); }, 6, [11, 8, 4]); break;
    case 'neutral': stroke(3.6, () => { g.moveTo(MX - 10, my); g.lineTo(MX + 10, my); }); break;
    case 'smirk': stroke(3.6, () => { g.moveTo(MX - 11, my + 2); g.quadraticCurveTo(MX + 3, my + 3, MX + 14, my - 5); }); break;
    case 'frown': stroke(3.6, () => { g.moveTo(MX - 13, my + 5); g.quadraticCurveTo(MX, my - 6, MX + 13, my + 5); }); break;
    case 'wavy': stroke(3.4, () => { g.moveTo(MX - 15, my); g.quadraticCurveTo(MX - 8, my - 6, MX, my); g.quadraticCurveTo(MX + 8, my + 6, MX + 15, my); }); break;
    case 'cat': stroke(3.4, () => { g.moveTo(MX - 15, my - 1); g.quadraticCurveTo(MX - 7, my + 9, MX, my - 1); g.quadraticCurveTo(MX + 7, my + 9, MX + 15, my - 1); }); break;
    case 'oh': open(() => { g.ellipse(MX, my + 3, 7, 9, 0, 0, 7); }, 0, [8, 5, 3]); break;
    case 'wail': open(() => { g.moveTo(MX - 15, my + 8); g.quadraticCurveTo(MX, my - 9, MX + 15, my + 8); g.quadraticCurveTo(MX, my + 2, MX - 15, my + 8); }, 0, null); break;
    case 'tongue':
      open(() => { g.moveTo(MX - 15, my - 2); g.quadraticCurveTo(MX, my + 3, MX + 15, my - 2); g.quadraticCurveTo(MX, my + 13, MX - 15, my - 2); }, 0, null);
      g.fillStyle = '#e0707a'; g.strokeStyle = '#b24a58'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(MX - 6, my + 4); g.lineTo(MX - 6, my + 12); g.quadraticCurveTo(MX, my + 20, MX + 6, my + 12); g.lineTo(MX + 6, my + 4); g.fill(); g.stroke();
      g.strokeStyle = '#b24a58'; g.beginPath(); g.moveTo(MX, my + 6); g.lineTo(MX, my + 13); g.stroke(); break;
    case 'psycho':
      open(() => { g.moveTo(MX - 24, my - 5); g.quadraticCurveTo(MX, my + 5, MX + 24, my - 5); g.quadraticCurveTo(MX, my + 30, MX - 24, my - 5); }, 0, null);
      g.save(); g.beginPath(); g.moveTo(MX - 24, my - 5); g.quadraticCurveTo(MX, my + 5, MX + 24, my - 5); g.quadraticCurveTo(MX, my + 30, MX - 24, my - 5); g.clip();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(MX - 26, my - 8);
      for (let i = 0; i <= 8; i++) g.lineTo(MX - 26 + i * 6.5, my + (i % 2 ? 9 : 3));
      g.lineTo(MX + 26, my - 8); g.fill(); g.restore(); break;
  }
}
function _nose(kind, skin, g) {
  if (kind === 'none') return;
  const c = _hx([skin[0] * .94, skin[1] * .8, skin[2] * .78]); g.fillStyle = c; g.beginPath();
  if (kind === 'round') g.ellipse(MX, 152, 11.5, 12.5, 0, 0, 7);
  else if (kind === 'button') g.ellipse(MX, 156, 9.5, 8, 0, 0, 7);
  else if (kind === 'wide') { g.moveTo(MX - 6, 138); g.quadraticCurveTo(MX - 10, 152, MX - 18, 158); g.quadraticCurveTo(MX, 169, MX + 18, 158); g.quadraticCurveTo(MX + 10, 152, MX + 6, 138); g.quadraticCurveTo(MX, 134, MX - 6, 138); }
  else if (kind === 'pointy') { g.moveTo(MX, 124); g.quadraticCurveTo(MX - 5, 146, MX - 13, 158); g.quadraticCurveTo(MX, 165, MX + 13, 158); g.quadraticCurveTo(MX + 5, 146, MX, 124); }
  else { g.moveTo(MX - 7, 128); g.quadraticCurveTo(MX - 8, 148, MX - 14, 156); g.quadraticCurveTo(MX, 165, MX + 14, 156); g.quadraticCurveTo(MX + 8, 148, MX + 7, 128); g.quadraticCurveTo(MX, 124, MX - 7, 128); }
  g.fill();
}
function _glasses(kind, g) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  const lens = (x) => { g.beginPath(); if (kind === 'round') g.ellipse(x, EY + 1, 19, 19, 0, 0, 7); else g.roundRect(x - 20, EY - 13, 40, 28, kind === 'shades' ? 9 : 7); };
  if (kind === 'shades') {
    g.fillStyle = '#1d1a24'; [0, 1].forEach(i => { lens(EX[i]); g.fill(); });
    g.fillStyle = 'rgba(255,255,255,.18)'; [0, 1].forEach(i => { g.beginPath(); g.roundRect(EX[i] - 16, EY - 9, 14, 5, 2.5); g.fill(); });
  } else { g.fillStyle = 'rgba(180,220,255,.16)'; [0, 1].forEach(i => { lens(EX[i]); g.fill(); }); }
  g.strokeStyle = AV_INK; g.lineWidth = 3.8;
  [0, 1].forEach(i => { lens(EX[i]); g.stroke(); });
  g.beginPath(); g.moveTo(EX[0] + 19, EY - 3); g.quadraticCurveTo(MX, EY - 10, EX[1] - 19, EY - 3); g.stroke();
  g.lineWidth = 3.2; g.beginPath(); g.moveTo(EX[0] - 19, EY - 2); g.lineTo(100, EY - 4); g.moveTo(EX[1] + 19, EY - 2); g.lineTo(228, EY - 4); g.stroke();
}
function _ear(kind, g) {
  [[91, 158], [237, 158]].forEach(([x, y]) => {
    if (kind === 'stud') { g.fillStyle = '#f2b632'; g.strokeStyle = AV_INK; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, 4.6, 0, 7); g.fill(); g.stroke(); }
    else if (kind === 'hoop') { g.strokeStyle = '#f2b632'; g.lineWidth = 3.4; g.beginPath(); g.arc(x, y + 6, 7.4, 0, 7); g.stroke(); g.strokeStyle = AV_INK; g.lineWidth = 1; g.stroke(); }
  });
}
function _face(kind, skin, g) {
  if (kind === 'freckles') {
    const c = _hx(skin.map(v => v * .7)); g.fillStyle = c; g.globalAlpha = .85;
    [[118, 152], [128, 158], [122, 164], [136, 156], [200, 156], [210, 150], [206, 163], [192, 160], [150, 150], [178, 150]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2.1, 0, 7); g.fill(); }); g.globalAlpha = 1;
  } else if (kind === 'blush') {
    [[116, 156], [212, 156]].forEach(([x, y]) => { const r = g.createRadialGradient(x, y, 1, x, y, 16); r.addColorStop(0, 'rgba(235,90,110,.55)'); r.addColorStop(1, 'rgba(235,90,110,0)'); g.fillStyle = r; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); });
  } else if (kind === 'scar') {
    g.strokeStyle = '#c4574f'; g.lineWidth = 3.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(199, 96); g.lineTo(186, 150); g.stroke();
    g.lineWidth = 2; g.beginPath(); [108, 121, 134].forEach(y => { const x = 199 - (y - 96) * .24; g.moveTo(x - 5, y - 2); g.lineTo(x + 5, y + 2); }); g.stroke();
  } else if (kind === 'patch') {
    g.strokeStyle = '#1d1a24'; g.lineWidth = 3; g.beginPath(); g.moveTo(228, 112); g.lineTo(EX[1] + 14, EY - 12); g.moveTo(EX[1] - 14, EY + 12); g.lineTo(100, 100); g.stroke();
    g.fillStyle = '#1d1a24'; g.beginPath(); g.ellipse(EX[1], EY + 1, 16, 15, -0.2, 0, 7); g.fill();
  }
}

/* ---------- full render in std frame (cached) ---------- */
async function avRender(av) {
  const key = JSON.stringify(av); if (_avRender.has(key)) return _avRender.get(key);
  const meta = AVC.find(c => c.id === av.c), A = await avLoad(av.c);
  const cv = document.createElement('canvas'); cv.width = AV_W; cv.height = AV_H; const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = av.bg || AV.bg[0]; g.fillRect(0, 0, AV_W, AV_H);
  const t = document.createElement('canvas'); t.width = AV_W; t.height = AV_H; const tg = t.getContext('2d', { willReadFrequently: true });
  const shaved = av.chin !== 'full', mood = shaved && av.mood === 'default' ? 'calm' : av.mood;
  tg.drawImage(shaved ? A.sh : mood === 'default' ? A.c : A.b, 0, 0);
  const skin0 = av.skin ? _hex(av.skin) : meta.skin;
  const browT = av.hair ? _hex(av.hair).map(v => v * .85) : av.skin ? skin0.map(v => v * .42) : null;
  const tgt = { 1: av.skin, 2: av.hair, 3: av.beard, 4: av.out, 5: browT && _hx(browT) };
  if (tgt[1] || tgt[2] || tgt[3] || tgt[4] || tgt[5] || av.chin === 'stubble') {
    const im = tg.getImageData(0, 0, AV_W, AV_H), d = im.data, ref = { 1: meta.skin, 2: meta.hair, 3: meta.beard, 4: meta.out, 5: meta.brow };
    const T = {}; for (const k in tgt) if (tgt[k]) T[k] = _hex(tgt[k]);
    const skinT = T[1] || meta.skin, beardT = T[3] || meta.beard;
    for (let i = 0, n = AV_W * AV_H; i < n; i++) {
      let c = A.mask[i]; if (!c) continue; const o = i * 4;
      let stub = false;
      if (shaved && c === 3) { // removed-beard area now holds skin / neck / shirt colour
        const p0 = d[o], p1 = d[o + 1], p2 = d[o + 2];
        const ds = Math.abs(p0 - meta.skin[0]) + Math.abs(p1 - meta.skin[1]) + Math.abs(p2 - meta.skin[2]);
        const dO = Math.abs(p0 - meta.out[0]) + Math.abs(p1 - meta.out[1]) + Math.abs(p2 - meta.out[2]);
        c = ds <= dO ? 1 : 4; stub = av.chin === 'stubble' && c === 1 && (i / AV_W | 0) < 236;
      }
      if (T[c]) {
        const r = ref[c], t2 = T[c];
        if (c === 1) { // skin: keep the art's shading by scaling the new tone (multiplicative = no hue shift on ears / neck shadow)
          const lp = .299 * d[o] + .587 * d[o + 1] + .114 * d[o + 2], lr = .299 * r[0] + .587 * r[1] + .114 * r[2];
          let f = 1 + (lp / lr - 1) * .85; f = f < .4 ? .4 : f > 1.25 ? 1.25 : f;
          for (let j = 0; j < 3; j++) { const v = t2[j] * f; d[o + j] = v > 255 ? 255 : v; }
        } else {
          const cl = c === 5 ? 28 : 36;
          for (let j = 0; j < 3; j++) { const dl = d[o + j] - r[j], v = t2[j] + (dl < -cl ? -cl : dl > cl ? cl : dl) * .9; d[o + j] = v < 0 ? 0 : v > 255 ? 255 : v; }
        }
      }
      if (stub) {
        const hsh = (Math.imul(i, 2654435761) >>> 0) % 100, k = hsh < 30 ? .55 : .13;
        for (let j = 0; j < 3; j++) d[o + j] += (beardT[j] - d[o + j]) * k;
      }
    }
    tg.putImageData(im, 0, 0);
  }
  g.drawImage(t, 0, 0);
  const skin = av.skin ? _hex(av.skin) : meta.skin, skinC = _hx(skin);
  if (mood !== 'default') {
    const [le, re, br, mo] = AV_MOOD_DEF[mood];
    _nose(av.nose, skin, g); _brows(br, browT ? _hx(browT) : _hx(skin.map(v => v * .4)), g); _eye(EX[0], le, -1, g); _eye(EX[1], re, 1, g); _mouth(mo, shaved ? 'skin' : meta.mouth, skinC, g);
  }
  _face(av.face, skin, g);
  if (av.glasses !== 'none') _glasses(av.glasses, g);
  _ear(av.ear, g);
  if (_avRender.size > 80) _avRender.delete(_avRender.keys().next().value);
  _avRender.set(key, cv); return cv;
}
async function avDraw(canvas) {
  let av; try { av = normAv(JSON.parse(canvas.dataset.av)); } catch (e) { av = avatarOf(); }
  const crop = canvas.dataset.crop ? canvas.dataset.crop.split(',').map(Number) : [0, 0, AV_W, AV_H];
  const src = await avRender(av), g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, canvas.width, canvas.height);
  g.drawImage(src, crop[0], crop[1], crop[2], crop[3], 0, 0, canvas.width, canvas.height);
}
/* a = avatar object | index | null (current); crop = [x,y,w,h] in the 328x280 frame or null */
function charSVG(a, px, crop) {
  const av = a == null ? avatarOf() : normAv(a), cr = crop || [0, 0, AV_W, AV_H];
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(px * dpr), hh = Math.round(px * cr[3] / cr[2] * dpr);
  return `<canvas class="avc" width="${w}" height="${hh}" style="width:${px}px;height:${Math.round(px * cr[3] / cr[2])}px" data-crop="${cr.join(',')}" data-av='${JSON.stringify(av).replace(/'/g, '&#39;')}'></canvas>`;
}
function avHydrate(root) { (root || document).querySelectorAll('canvas.avc:not([data-done])').forEach(c => { c.dataset.done = '1'; avDraw(c).catch(() => { }); }); }
if (typeof document !== 'undefined') {
  const start = () => { avHydrate(); new MutationObserver(() => avHydrate()).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}

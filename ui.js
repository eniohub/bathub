'use strict';
/* =========================================================
   UI — helpers de interface: elementos, ícones, janelas (sheets),
   formulários e gráficos simples em SVG.
   ========================================================= */

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.slice(0, 2) === '--') el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') value = v;
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = true;
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(String(c))); });
  if (value !== undefined) el.value = value;
  return el;
}

const ICONS = {
  check: 'M5 12l5 5L20 7', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', down: 'M5 9l7 7 7-7', up: 'M5 15l7-7 7 7',
  play: 'M7 4l13 8-13 8z',
  home: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6',
  dumbbell: 'M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  food: 'M4 11h16a8 8 0 0 1-16 0zM9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 13v4M8 20h8M10 17h4',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  drop: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14', upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l5 5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  swap: 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',
  scale: 'M5 4h14l2 16H3zM9 9a3 3 0 0 1 6 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3M12 15v2',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01',
};
function icon(name, size = 20, sw = 2) {
  const fill = name === 'play' ? 'currentColor' : 'none';
  return h('span', { class: 'ic', html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]}"/></svg>` });
}

/* ---------- aviso rápido ---------- */
let toastTimer;
function toast(msg, ms = 2200) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
window.toast = toast;

/* ---------- janelas deslizantes (sheets) ---------- */
const sheetStack = [];
function openSheet({ title, body, footer, onClose, tall }) {
  const root = document.getElementById('sheet-root'), overlay = document.getElementById('overlay');
  const el = h('div', { class: 'sheet' + (tall ? ' tall' : ''), role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'sheet-grab' }),
    h('div', { class: 'sheet-head' }, h('h2', null, title || ''), h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: () => closeSheet() }, icon('x'))),
    h('div', { class: 'sheet-body' }, body),
    footer ? h('div', { class: 'sheet-foot' }, footer) : null);
  const rec = { el, onClose };
  sheetStack.push(rec); root.append(el); overlay.classList.add('show'); document.body.classList.add('noscroll');
  requestAnimationFrame(() => el.classList.add('in'));
  return rec;
}
function closeSheet(rec) {
  rec = rec || sheetStack[sheetStack.length - 1]; if (!rec) return;
  const i = sheetStack.indexOf(rec); if (i < 0) return;
  sheetStack.splice(i, 1);
  rec.el.classList.remove('in'); setTimeout(() => rec.el.remove(), 220);
  if (!sheetStack.length) { document.getElementById('overlay').classList.remove('show'); document.body.classList.remove('noscroll'); }
  if (rec.onClose) rec.onClose();
}
function closeAllSheets() { while (sheetStack.length) closeSheet(); }
document.addEventListener('DOMContentLoaded', () => {
  const ov = document.getElementById('overlay'); if (ov) ov.addEventListener('click', () => closeSheet());
});

function confirmSheet({ title, text, ok = 'Confirm', danger, onOk }) {
  const rec = openSheet({
    title: title || 'Are you sure?',
    body: h('p', { class: 'muted' }, text),
    footer: [
      h('button', { class: 'btn ghost', onclick: () => closeSheet(rec) }, 'Cancel'),
      h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => { closeSheet(rec); onOk && onOk(); } }, ok),
    ],
  });
}

/* ---------- formulários ---------- */
function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'field-l' }, label), input, hint ? h('span', { class: 'hint' }, hint) : null);
}
function textInput(value, onInput, opts = {}) {
  return h('input', Object.assign({ type: 'text', class: 'input', value: value == null ? '' : value, autocomplete: 'off', autocapitalize: 'sentences', oninput: e => onInput(e.target.value) }, opts));
}
function numInput(value, onInput, opts = {}) {
  return h('input', Object.assign({ type: 'text', inputmode: 'decimal', class: 'input', value: numStr(value), autocomplete: 'off', oninput: e => onInput(parseNum(e.target.value)) }, opts));
}
function selectInput(value, options, onChange) {
  return h('select', { class: 'input', value, onchange: e => onChange(e.target.value) },
    options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v }, l); }));
}
function chips(options, selected, onPick, multi) {
  const wrap = h('div', { class: 'chips' });
  const draw = () => {
    wrap.innerHTML = '';
    options.forEach(o => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      const on = multi ? selected.includes(v) : selected === v;
      wrap.append(h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), onclick: () => {
        if (multi) { const i = selected.indexOf(v); if (i >= 0) selected.splice(i, 1); else selected.push(v); onPick(selected); }
        else { selected = v; onPick(v); }
        draw();
      } }, l));
    });
  };
  draw(); return wrap;
}
function segmented(options, value, onPick) {
  const wrap = h('div', { class: 'seg' });
  options.forEach(([v, l]) => wrap.append(h('button', { class: v === value ? 'on' : '', onclick: () => onPick(v) }, l)));
  return wrap;
}
function toggle(value, onChange) {
  const b = h('button', { type: 'button', class: 'switch' + (value ? ' on' : ''), role: 'switch', 'aria-checked': String(!!value), onclick: () => { value = !value; b.classList.toggle('on', value); b.setAttribute('aria-checked', String(value)); onChange(value); } }, h('i'));
  return b;
}
function colorDots(colors, value, onPick) {
  const wrap = h('div', { class: 'dots' });
  const draw = () => { wrap.innerHTML = ''; colors.forEach(c => wrap.append(h('button', { type: 'button', class: 'dot' + (c === value ? ' on' : ''), style: { background: c }, 'aria-label': c, onclick: () => { value = c; onPick(c); draw(); } }))); };
  draw(); return wrap;
}

/* ---------- gráficos SVG ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
  kids.flat().forEach(c => c && el.append(c.nodeType ? c : document.createTextNode(c)));
  return el;
}
/* gráfico de linha: pts = [{x: número, y: número, label}] */
function lineChart(pts, { height = 150, color = 'var(--acc)', fmtY = v => fmtNum(v, 1), labels } = {}) {
  const W = 320, H = height, pl = 34, pr = 10, pt = 12, pb = 22;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
  if (!pts.length) return root;
  let ys = pts.map(p => p.y), lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const padY = (hi - lo) * 0.15; lo -= padY; hi += padY;
  const xs = pts.map(p => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = x => pts.length === 1 || x1 === x0 ? (pl + (W - pl - pr) / 2) : pl + (x - x0) / (x1 - x0) * (W - pl - pr);
  const Y = y => pt + (1 - (y - lo) / (hi - lo)) * (H - pt - pb);
  for (let i = 0; i < 3; i++) {
    const v = lo + (hi - lo) * (i / 2), y = Y(v);
    root.append(svg('line', { x1: pl, x2: W - pr, y1: y, y2: y, class: 'grid' }), svg('text', { x: pl - 5, y: y + 3, class: 'axis', 'text-anchor': 'end' }, fmtY(v)));
  }
  if (pts.length > 1) {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    root.append(svg('path', { d: `${d}L${X(pts[pts.length - 1].x).toFixed(1)},${H - pb}L${X(pts[0].x).toFixed(1)},${H - pb}Z`, fill: color, opacity: '.12' }),
      svg('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  }
  pts.forEach(p => root.append(svg('circle', { cx: X(p.x), cy: Y(p.y), r: 3.5, fill: color })));
  const first = pts[0], last = pts[pts.length - 1];
  if (labels) {
    root.append(svg('text', { x: X(first.x), y: H - 6, class: 'axis', 'text-anchor': pts.length === 1 ? 'middle' : 'start' }, labels(first)));
    if (pts.length > 1) root.append(svg('text', { x: X(last.x), y: H - 6, class: 'axis', 'text-anchor': 'end' }, labels(last)));
  }
  return root;
}
/* gráfico de barras: bars = [{label, value, hi?}], goal opcional (linha tracejada) */
function barChart(bars, { height = 140, goal, fmtV = v => fmtNum(v, 0), color = 'var(--acc)' } = {}) {
  const W = 320, H = height, pl = 6, pr = 6, pt = 16, pb = 20;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
  if (!bars.length) return root;
  const max = Math.max(1, goal || 0, ...bars.map(b => b.value)) * 1.1;
  const bw = (W - pl - pr) / bars.length, gap = Math.min(6, bw * 0.25);
  const Y = v => pt + (1 - v / max) * (H - pt - pb);
  bars.forEach((b, i) => {
    const x = pl + i * bw + gap / 2, w = bw - gap, y = Y(b.value);
    root.append(svg('rect', { x, y: b.value ? y : H - pb - 2, width: w, height: b.value ? H - pb - y : 2, rx: 3, fill: b.value ? (b.color || color) : 'var(--line)', opacity: b.dim ? '.45' : '1' }));
    if (b.label != null) root.append(svg('text', { x: x + w / 2, y: H - 6, class: 'axis', 'text-anchor': 'middle' }, b.label));
    if (b.value && bars.length <= 8) root.append(svg('text', { x: x + w / 2, y: y - 4, class: 'axis val', 'text-anchor': 'middle' }, fmtV(b.value)));
  });
  if (goal) root.append(svg('line', { x1: pl, x2: W - pr, y1: Y(goal), y2: Y(goal), class: 'goal' }));
  return root;
}
/* barra de progresso horizontal */
function meter(value, max, color) {
  const pct = max > 0 ? clamp(value / max * 100, 0, 100) : 0;
  return h('div', { class: 'meter' }, h('i', { style: { width: pct + '%', background: color || 'var(--acc)' } }));
}

/* som curto ao fim do descanso (WebAudio, sem arquivos) */
let audioCtx;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = i === 2 ? 1040 : 780; o.connect(g); g.connect(audioCtx.destination);
      const n = audioCtx.currentTime + t; g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(0.25, n + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.18);
      o.start(n); o.stop(n + 0.2);
    });
  } catch (e) { /* sem som, tudo bem */ }
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { }
}

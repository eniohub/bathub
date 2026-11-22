'use strict';
/* =========================================================
   SHEETS — pop-up editors and detail views.
   ========================================================= */

const clone = o => JSON.parse(JSON.stringify(o));
const badgeEl = (info, px = 64) => h('span', { class: 'badge', html: Art.badge(info.tier, info.sub, px) });
const figureEl = (key, px = 96) => h('span', { class: 'fig', html: Art.figure(key, px) });
const unitLabel = ex => ex.kind === 'hold' ? 's' : 'reps';

/* "21 reps" / "12 s" / "+10 kg × 8" */
function fmtSet(exId, st) {
  const ex = CAT[exId]; if (!ex) return '';
  const v = variantsOf(exId).find(x => x.id === st.v), vn = v && variantsOf(exId).length > 1 ? v.name + ' · ' : '';
  const val = ex.kind === 'hold' ? `${st.r}s` : `${st.r} reps`;
  return vn + (st.w > 0 ? `+${numStr(st.w)}kg × ${st.r}` : val);
}
/* inverse of interp: smallest value that reaches a target score */
function valueFor(anchors, target) {
  if (target <= (anchors[0][1] || 0)) return anchors[0][0] || 1;
  for (let i = 1; i < anchors.length; i++) if (anchors[i][1] >= target) { const [x0, y0] = anchors[i - 1], [x1, y1] = anchors[i]; return y1 === y0 ? x1 : x0 + (x1 - x0) * (target - y0) / (y1 - y0); }
  return null;
}

/* ---------------- edit the rank scale of an exercise ---------------- */
function rulesSheet(exId) {
  const ex = CAT[exId], draft = {};
  ex.variants.forEach(v => draft[v.id] = clone(anchorsOf(exId, v.id)));
  const body = h('div', { class: 'form' });
  const draw = () => {
    body.innerHTML = '';
    body.append(h('p', { class: 'muted sm' }, `Each row says: "doing this many ${ex.kind === 'hold' ? 'seconds' : 'reps'} earns this many points". 100 points = one tier (0 Iron, 100 Bronze, 200 Silver, 300 Gold, 400 Platinum, 500 Diamond, 600 Master, 700 Elite, 800+ Legend). Points between rows are interpolated.`));
    ex.variants.forEach(v => {
      const rows = h('div', { class: 'list' });
      const a = draft[v.id];
      a.forEach((pt, i) => {
        const lab = h('small', { class: 'tierlab' }, rankInfo(pt[1]).label);
        rows.append(h('div', { class: 'anchor' },
          h('input', { class: 'input sm', type: 'text', inputmode: 'decimal', value: numStr(pt[0]), 'aria-label': 'Value', oninput: e => { pt[0] = parseNum(e.target.value) || 0; } }),
          h('span', { class: 'muted' }, ex.kind === 'hold' ? 's →' : 'reps →'),
          h('input', { class: 'input sm', type: 'text', inputmode: 'decimal', value: numStr(pt[1]), 'aria-label': 'Points', oninput: e => { pt[1] = parseNum(e.target.value) || 0; lab.textContent = rankInfo(pt[1]).label; } }),
          lab,
          h('button', { class: 'icon-btn sm', 'aria-label': 'Remove row', onclick: () => { if (a.length > 2) { a.splice(i, 1); draw(); } else toast('Keep at least two rows'); } }, icon('trash', 16))));
      });
      body.append(h('div', { class: 'card' }, h('b', null, v.name), rows,
        h('button', { class: 'btn ghost sm', onclick: () => { const l = a[a.length - 1]; a.push([l[0] + 5, Math.min(1000, l[1] + 50)]); draw(); } }, icon('plus', 14), ' Add row')));
    });
  };
  const sh = openSheet({
    title: `${ex.name} · scale`, tall: true, body,
    footer: [h('button', { class: 'btn ghost', onclick: () => confirmSheet({ title: 'Reset scale?', text: 'Back to the starting numbers.', ok: 'Reset', onOk: () => { delete S.rules[exId]; save(); closeSheet(sh); render(); toast('Scale reset'); } }) }, 'Reset'),
      h('button', { class: 'btn primary grow', onclick: () => {
        S.rules[exId] = S.rules[exId] || {};
        for (const vid in draft) { const a = draft[vid].filter(p => isFinite(p[0]) && isFinite(p[1])).sort((x, y) => x[0] - y[0]); if (a.length > 1) S.rules[exId][vid] = a; }
        save(); closeSheet(sh); render(); toast('Scale saved');
      } }, 'Save')],
  });
  draw();
}

/* ---------------- exercise detail: rank, records, ladder, history ---------------- */
function exerciseDetail(exId) {
  const ex = CAT[exId], best = exerciseBest(exId), info = rankInfo(best.score);
  const body = h('div', null,
    h('div', { class: 'detail-top' }, figureEl(ex.pose, 110), h('div', { class: 'center' }, badgeEl(info, 96), h('b', { class: 'tier-' + info.tier }, info.label), h('small', null, best.score ? `${Math.round(best.score)} points` : 'Not ranked yet'))));
  if (best.score) {
    body.append(h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('small', null, 'Best set'), h('b', null, fmtSet(exId, best.set))),
      h('div', { class: 'stat' }, h('small', null, 'Achieved'), h('b', null, relDay(best.date)))));
    if (info.tier < 8) {
      const next = (info.tier * 3 + (info.sub || 0) + 1), target = Math.min(900, Math.floor(next / 3) * 100 + (next % 3) * (100 / 3)) + .01;
      const nr = rankInfo(target), v = variantsOf(exId).find(x => x.id === best.set.v) || ex.variants[0], need = valueFor(anchorsOf(exId, v.id), target);
      if (need) body.append(h('div', { class: 'next' }, badgeEl(nr, 40), h('div', null, h('small', null, 'Next rank'), h('b', null, nr.label), h('small', null, `${v.name}: ${Math.ceil(need)}${ex.kind === 'hold' ? ' s' : ' reps'}`))));
    }
  }
  /* variations ladder */
  body.append(h('h3', { class: 'sec' }, 'Variations'));
  ex.variants.forEach(v => {
    const raw = bestRaw(exId, v.id), a = anchorsOf(exId, v.id), top = a[a.length - 1][1], bot = a[0][1];
    body.append(h('div', { class: 'row static' }, h('div', { class: 'row-main' }, h('b', null, v.name), h('small', null, raw ? `Best: ${raw.w > 0 ? '+' + numStr(raw.w) + 'kg × ' : ''}${raw.r}${ex.kind === 'hold' ? ' s' : ' reps'}` : `Scale: ${rankInfo(bot).label} → ${rankInfo(top).label}`))));
  });
  /* progress chart: best score per day */
  const byDay = {};
  sessionsForRank(false).forEach(s => s.items.forEach(it => { if (it.ex !== exId) return; it.sets.forEach(st => { const sc = setScore(exId, st); if (sc > (byDay[s.date] || 0)) byDay[s.date] = sc; }); }));
  const days = Object.keys(byDay).sort();
  if (days.length > 1) body.append(h('h3', { class: 'sec' }, 'Progress'), h('div', { class: 'chartbox' }, lineChart(days.map((d, i) => ({ x: i, y: byDay[d], date: d })), { labels: p => fmtDateShort(p.date), fmtY: v => fmtNum(v, 0) })));
  /* history */
  const hist = [];
  sessionsDesc().forEach(s => s.items.forEach(it => { if (it.ex === exId) hist.push({ s, sets: it.sets }); }));
  if (hist.length) body.append(h('h3', { class: 'sec' }, 'History'), h('div', { class: 'list' }, hist.slice(0, 20).map(x => h('div', { class: 'row static' }, h('div', { class: 'row-main' }, h('b', null, fmtDateLong(x.s.date)), h('small', null, x.sets.map(st => fmtSet(exId, st)).join('  ·  ')))))));
  const sh = openSheet({ title: ex.name, body, tall: true, footer: h('button', { class: 'btn ghost block', onclick: () => rulesSheet(exId) }, icon('sliders', 18), ' Edit scale') });
}

/* ---------------- muscle detail ---------------- */
function muscleDetail(mid) {
  const scores = allScores(), ms = muscleScores(scores), meta = Art.MUSCLES.find(m => m.id === mid), info = rankInfo(ms[mid] || 0);
  const list = CATALOG.filter(e => e.muscles[mid]).sort((a, b) => b.muscles[mid] - a.muscles[mid]);
  openSheet({ title: meta.name, tall: true, body: h('div', null,
    h('div', { class: 'center' }, badgeEl(info, 96), h('b', { class: 'tier-' + info.tier }, info.label), h('small', null, ms[mid] ? `${Math.round(ms[mid])} points` : 'Log an exercise below to rank this muscle')),
    h('h3', { class: 'sec' }, 'Exercises that train it'),
    h('div', { class: 'list' }, list.map(e => { const b = scores[e.id], r = rankInfo(b ? b.score : 0);
      return h('button', { class: 'row', onclick: () => exerciseDetail(e.id) }, figureEl(e.pose, 44), h('div', { class: 'row-main' }, h('b', null, e.name), h('small', null, `${Math.round(e.muscles[mid] * 100)}% of this muscle's score · ${r.label}`)), badgeEl(r, 34)); }))) });
}

/* ---------------- edit a finished session ---------------- */
function sessionEditor(sess) {
  const d = clone(sess), body = h('div', { class: 'form' });
  const draw = () => {
    body.innerHTML = '';
    const st = sessionStats(d);
    body.append(h('div', { class: 'stats three' }, h('div', { class: 'stat' }, h('small', null, 'Sets'), h('b', null, st.sets)), h('div', { class: 'stat' }, h('small', null, 'Exercises'), h('b', null, st.exercises)), h('div', { class: 'stat' }, h('small', null, 'Duration'), h('b', null, fmtMin(st.minutes)))),
      h('div', { class: 'two' }, field('Date', h('input', { type: 'date', class: 'input', value: d.date, onchange: e => { if (e.target.value) d.date = e.target.value; } })), field('Duration (min)', numInput(st.minutes, v => { d.end = d.start + Math.max(1, v || 1) * 60000; }))),
      field('Notes', textInput(d.notes || '', v => d.notes = v, { placeholder: 'How did it go?' })));
    d.items.forEach((it, ii) => {
      const ex = CAT[it.ex]; if (!ex) return;
      body.append(h('div', { class: 'ritem' }, h('div', { class: 'ritem-top' }, h('b', null, ex.name), h('button', { class: 'icon-btn sm', 'aria-label': 'Remove exercise', onclick: () => { d.items.splice(ii, 1); draw(); } }, icon('trash', 16))),
        it.sets.map((s, si) => h('div', { class: 'seted' }, h('span', { class: 'sn' }, si + 1),
          ex.variants.length > 1 ? selectInput(s.v, ex.variants.map(v => [v.id, v.name]), v => s.v = v) : null,
          h('input', { class: 'input sm', type: 'text', inputmode: 'numeric', value: numStr(s.r), placeholder: ex.kind === 'hold' ? 'sec' : 'reps', oninput: e => s.r = parseNum(e.target.value) }),
          ex.weighted ? h('input', { class: 'input sm', type: 'text', inputmode: 'decimal', value: numStr(s.w), placeholder: '+kg', oninput: e => s.w = parseNum(e.target.value) }) : null,
          h('button', { class: 'icon-btn sm', 'aria-label': 'Remove set', onclick: () => { it.sets.splice(si, 1); draw(); } }, icon('minus', 16))))));
    });
  };
  const sh = openSheet({ title: fmtDateLong(sess.date), tall: true, body,
    footer: [h('button', { class: 'btn danger-ghost', 'aria-label': 'Delete workout', onclick: () => confirmSheet({ title: 'Delete this workout?', danger: true, ok: 'Delete', text: 'It will also be removed from your streak and ranks.', onOk: () => { S.sessions = S.sessions.filter(s => s.id !== sess.id); save(); closeAllSheets(); render(); toast('Workout deleted'); } }) }, icon('trash', 18)),
      h('button', { class: 'btn primary grow', onclick: () => {
        d.items.forEach(it => it.sets = it.sets.filter(s => s.r > 0)); d.items = d.items.filter(it => it.sets.length);
        if (d.date !== sess.date) { const sh2 = diffDays(sess.date, d.date) * 86400000; d.start += sh2; d.end = (d.end || d.start) + sh2; }
        Object.assign(sess, d); save(); closeSheet(sh); render(); toast('Saved');
      } }, 'Save')] });
  draw();
}

/* ---------------- meal ---------------- */
function guessMealType(now) { const t = S.settings.mealTypes, hr = now.getHours(); return t[Math.min(hr < 10 ? 0 : hr < 14 ? 1 : hr < 18 ? 2 : 3, t.length - 1)]; }
function mealEditor(meal, date, type) {
  const now = new Date();
  const d = meal ? clone(meal) : { id: uid(), date, time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, type: type || guessMealType(now), name: '', kcal: null, p: null, c: null, f: null };
  let saveFav = false; const inputs = {}, favBox = h('div', { class: 'chips scroll' });
  const fill = f => { d.name = f.name; d.kcal = f.kcal; d.p = f.p; d.c = f.c; d.f = f.f; inputs.name.value = f.name; inputs.kcal.value = numStr(f.kcal); inputs.p.value = numStr(f.p); inputs.c.value = numStr(f.c); inputs.f.value = numStr(f.f); };
  const drawFavs = () => { favBox.innerHTML = ''; S.foods.forEach(f => favBox.append(h('span', { class: 'chip fav' },
    h('button', { class: 'chip-main', onclick: () => fill(f) }, f.name, h('small', null, ' ' + (f.kcal || 0) + ' kcal')),
    h('button', { class: 'chip-x', 'aria-label': 'Remove favorite', onclick: () => { S.foods = S.foods.filter(x => x.id !== f.id); save(); drawFavs(); } }, '×')))); };
  inputs.name = textInput(d.name, v => d.name = v, { placeholder: 'e.g. Rice, beans and chicken' });
  inputs.kcal = numInput(d.kcal, v => d.kcal = v, { placeholder: '0' }); inputs.p = numInput(d.p, v => d.p = v, { placeholder: '0' });
  inputs.c = numInput(d.c, v => d.c = v, { placeholder: '0' }); inputs.f = numInput(d.f, v => d.f = v, { placeholder: '0' });
  const sh = openSheet({ title: meal ? 'Edit meal' : 'Add food', tall: true,
    body: h('div', { class: 'form' },
      S.foods.length ? h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Favorites (tap to fill)'), favBox) : null,
      field('Meal', selectInput(d.type, [...new Set([d.type, ...S.settings.mealTypes])], v => d.type = v)),
      field('What did you eat', inputs.name), field('Calories (kcal)', inputs.kcal),
      h('div', { class: 'three' }, field('Protein (g)', inputs.p), field('Carbs (g)', inputs.c), field('Fat (g)', inputs.f)),
      h('div', { class: 'two' }, field('Time', h('input', { type: 'time', class: 'input', value: d.time, onchange: e => d.time = e.target.value })), field('Date', h('input', { type: 'date', class: 'input', value: d.date, onchange: e => { if (e.target.value) d.date = e.target.value; } }))),
      h('div', { class: 'switchrow' }, h('span', null, 'Save to favorites'), toggle(false, v => saveFav = v))),
    footer: [meal ? h('button', { class: 'btn danger-ghost', 'aria-label': 'Delete', onclick: () => { S.meals = S.meals.filter(m => m.id !== meal.id); save(); closeSheet(sh); render(); toast('Removed'); } }, icon('trash', 18)) : null,
      h('button', { class: 'btn primary grow', onclick: () => {
        d.name = (d.name || '').trim(); if (!d.name && !(d.kcal > 0)) return toast('Enter the food or the calories'); if (!d.name) d.name = d.type;
        if (meal) Object.assign(meal, d); else S.meals.push(d);
        if (saveFav && !S.foods.some(f => f.name.toLowerCase() === d.name.toLowerCase())) S.foods.push({ id: uid(), name: d.name, kcal: d.kcal, p: d.p, c: d.c, f: d.f });
        save(); closeSheet(sh); render();
      } }, 'Save')] });
  drawFavs();
}

/* ---------------- body weight ---------------- */
function weightSheet() {
  const d = { date: today(), kg: S.settings.bodyweight };
  const last = S.weights.slice().sort((a, b) => a.date.localeCompare(b.date)).pop(); if (last) d.kg = last.kg;
  const sh = openSheet({ title: 'Body weight', body: h('div', { class: 'form two' }, field('Weight (kg)', numInput(d.kg, v => d.kg = v)), field('Date', h('input', { type: 'date', class: 'input', value: d.date, onchange: e => { if (e.target.value) d.date = e.target.value; } }))),
    footer: h('button', { class: 'btn primary grow', onclick: () => {
      if (!(d.kg > 0)) return toast('Enter your weight');
      const ex = S.weights.find(w => w.date === d.date); if (ex) ex.kg = d.kg; else S.weights.push({ date: d.date, kg: d.kg });
      if (d.date === today()) S.settings.bodyweight = d.kg;
      save(); closeSheet(sh); render(); toast('Weight saved');
    } }, 'Save') });
}

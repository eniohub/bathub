'use strict';
/* =========================================================
   MAIN — screens: Home, Train (log), Ranks, Food, Profile.
   ========================================================= */

const ui = { tab: 'home', log: null, ranksTab: 'overall', foodDate: null, calMonth: null, draft: {} };
const tierColor = t => t < 0 ? '#6b7280' : Art.TIERS[t].c2;
const $app = () => document.getElementById('app');
const tierChip = info => h('span', { class: 'tchip', style: { '--tc': tierColor(info.tier) } }, badgeEl(info, 22), info.label);

function goTab(t) { ui.tab = t; ui.log = null; stopWatch(); render(); window.scrollTo(0, 0); }
function openLog(exId) { ui.log = exId; ui.tab = 'train'; render(); window.scrollTo(0, 0); }

/* ---------- logging ---------- */
function startSession() { if (!S.active) S.active = { id: uid(), date: today(), start: Date.now(), end: null, notes: '', items: [] }; return S.active; }
function lastSetOf(exId) {
  const all = S.active ? [S.active, ...sessionsDesc()] : sessionsDesc();
  for (const s of all) { const it = s.items.find(i => i.ex === exId); if (it && it.sets.length) return it.sets[it.sets.length - 1]; }
  return null;
}
function draftOf(exId) {
  if (!ui.draft[exId]) { const l = lastSetOf(exId), ex = CAT[exId]; ui.draft[exId] = l ? { v: l.v, r: l.r, w: l.w || 0 } : { v: ex.variants[0].id, r: ex.kind === 'hold' ? 10 : 5, w: 0 }; }
  return ui.draft[exId];
}
function logSet(exId, d) {
  if (!(d.r > 0)) return toast('Enter reps or seconds first');
  const before = exerciseBest(exId), b = rankInfo(before.score);
  const s = startSession(); let it = s.items.find(i => i.ex === exId); if (!it) { it = { ex: exId, sets: [] }; s.items.push(it); }
  it.sets.push({ v: d.v, r: d.r, w: CAT[exId].weighted ? (d.w || 0) : 0, ts: Date.now() });
  save();
  const after = exerciseBest(exId), a = rankInfo(after.score);
  if (stepKey(a) > stepKey(b)) toast(before.score ? `Rank up! ${a.label}` : `Ranked: ${a.label}`, 3200);
  else if (after.score > before.score) toast(`New best! ${Math.round(after.score)} pts`);
  else toast('Set logged');
  startRest(); render();
}
function removeSet(sess, exId, idx) {
  const it = sess.items.find(i => i.ex === exId); if (!it) return; it.sets.splice(idx, 1);
  if (!it.sets.length) sess.items = sess.items.filter(i => i !== it);
  save(); render();
}
function finishSession() {
  const a = S.active; if (!a) return;
  if (!a.items.length) { S.active = null; save(); render(); return toast('Empty workout discarded'); }
  const before = allScores(false);
  a.end = Date.now(); S.sessions.push(a); S.active = null; save(); stopRest();
  const after = allScores(false), ups = [];
  a.items.forEach(it => { const b = rankInfo(before[it.ex] ? before[it.ex].score : 0), n = rankInfo(after[it.ex] ? after[it.ex].score : 0); if (stepKey(n) > stepKey(b)) ups.push({ ex: it.ex, info: n }); });
  const st = sessionStats(a), xp = 50 + st.sets * 10, lv = levelInfo(), streak = streakInfo();
  const body = h('div', { class: 'summary' },
    h('div', { class: 'stats three' }, h('div', { class: 'stat' }, h('small', null, 'Time'), h('b', null, fmtMin(st.minutes))), h('div', { class: 'stat' }, h('small', null, 'Sets'), h('b', null, st.sets)), h('div', { class: 'stat' }, h('small', null, 'XP'), h('b', null, '+' + xp))),
    ups.length ? h('div', null, h('h3', { class: 'sec' }, 'Rank ups'), ups.map(u => h('div', { class: 'row static up' }, badgeEl(u.info, 48), h('div', { class: 'row-main' }, h('b', null, CAT[u.ex].name), h('small', { class: 'tier-' + u.info.tier }, u.info.label))))) : null,
    h('h3', { class: 'sec' }, 'This workout'), h('div', { class: 'list' }, a.items.map(it => h('div', { class: 'row static' }, figureEl(CAT[it.ex].pose, 40), h('div', { class: 'row-main' }, h('b', null, CAT[it.ex].name), h('small', null, it.sets.map(s => fmtSet(it.ex, s)).join('  ·  ')))))),
    h('div', { class: 'streakline' }, icon('flame', 20), h('b', null, plural(streak.current, 'day', 'days')), ' streak · level ', h('b', null, lv.level)));
  const sh = openSheet({ title: 'Workout complete', body, tall: true, footer: h('button', { class: 'btn primary grow', onclick: () => { closeSheet(sh); goTab('home'); } }, 'Done') });
  render();
}
function discardSession() { confirmSheet({ title: 'Discard this workout?', text: 'All sets logged in it will be lost.', ok: 'Discard', danger: true, onOk: () => { S.active = null; save(); stopRest(); render(); } }); }

/* ---------- rest timer ---------- */
let rest = null;
function startRest() {
  stopRest(); const sec = S.settings.restSeconds; if (!(sec > 0)) return;
  rest = { end: Date.now() + sec * 1000, el: h('div', { class: 'rest' }, h('span', { class: 'rest-t' }), h('button', { class: 'rest-b', onclick: () => stopRest() }, 'Skip')) };
  document.body.append(rest.el);
  const tick = () => { if (!rest) return; const left = Math.ceil((rest.end - Date.now()) / 1000); if (left <= 0) { beep(); stopRest(); return; } rest.el.querySelector('.rest-t').textContent = 'Rest ' + fmtDur(left); };
  tick(); rest.iv = setInterval(tick, 250);
}
function stopRest() { if (rest) { clearInterval(rest.iv); rest.el.remove(); rest = null; } }

/* ---------- hold stopwatch ---------- */
let watch = null;
function stopWatch() { if (watch) { clearInterval(watch.iv); watch = null; } }


/* ---------- top bar: avatar + level, streak, overall rank, settings ---------- */
function topBar() {
  const lv = levelInfo(), st = streakInfo(), lit = trainedOn(today()).length > 0, ov = overallScore(allScores()), oi = rankInfo(ov.placed ? ov.score : 0);
  return h('header', { class: 'topbar' },
    h('button', { class: 'tb-user', onclick: () => goTab('me'), 'aria-label': 'Profile' }, h('span', { class: 'tb-av', html: charSVG(null, 44, AV_CROP) }), h('span', { class: 'tb-lv' }, h('b', null, 'Lv.' + lv.level), h('i', null, h('u', { style: { width: Math.max(4, lv.progress * 100) + '%' } })))),
    h('div', { class: 'tb-stat' + (lit ? ' lit' : ''), 'aria-label': 'Streak' }, icon('flame', 26), h('b', null, st.current)),
    h('button', { class: 'tb-stat tb-rank', onclick: () => { ui.ranksTab = 'overall'; goTab('ranks'); }, 'aria-label': 'Overall rank' }, badgeEl(oi, 30), h('b', { class: 'tier-' + oi.tier }, ov.placed ? oi.label : '–')),
    h('button', { class: 'tb-gear', onclick: () => { goTab('me'); setTimeout(() => { const t = document.getElementById('settings'); t && t.scrollIntoView({ behavior: 'smooth' }); }, 50); }, 'aria-label': 'Settings' }, icon('sliders', 22)));
}

/* ---------- shell ---------- */
function render() {
  const y = window.scrollY, app = $app(); app.innerHTML = '';
  const screens = { home: homeScreen, train: ui.log ? logScreen : trainScreen, ranks: ranksScreen, food: foodScreen, me: profileScreen };
  app.append(topBar(), h('main', { class: 'screen' }, screens[ui.tab]()), tabbar());
  window.scrollTo(0, y);
}
function tabbar() {
  const T = [['home', 'Home', 'home'], ['train', 'Train', 'dumbbell'], ['ranks', 'Ranks', 'trophy'], ['food', 'Food', 'food'], ['me', 'Profile', 'user']];
  return h('nav', { class: 'tabbar' }, T.map(([id, label, ic]) => h('button', { class: ui.tab === id ? 'on' : '', onclick: () => goTab(id) }, icon(ic, 22), h('span', null, label)))
    .map((b, i) => { if (i === 1 && S.active) b.append(h('i', { class: 'dotlive' })); return b; }));
}
const pageHead = (title, right) => h('header', { class: 'pagehead' }, h('h1', null, title), right || null);


/* ---------- Locked In: confirms today's workout and the streak (no exercise screen) ---------- */
function lockIn() {
  if (trainedOn(today()).length) return;
  const now = Date.now(); S.sessions.push({ id: uid(), date: today(), start: now, end: now, notes: '', items: [], locked: true }); save();
  const st = streakInfo(); render(); toast(`Locked in! ${plural(st.current, 'day', 'days')} streak`, 3200);
}
function undoLock() {
  const s = trainedOn(today()).find(x => x.locked && !x.items.length); if (!s) return;
  confirmSheet({ title: 'Undo Locked In?', text: 'Today will no longer count for your streak.', ok: 'Undo', danger: true, onOk: () => { S.sessions = S.sessions.filter(x => x !== s); save(); render(); } });
}
function lockButton() {
  const done = trainedOn(today()).length > 0, st = streakInfo();
  if (!done) return h('button', { class: 'lockin', onclick: lockIn }, icon('lock', 24), h('span', null, 'Locked In'), h('small', null, 'Tap to confirm today\'s workout'));
  return h('button', { class: 'lockin done', onclick: undoLock }, icon('check', 24, 3), h('span', null, 'Locked in today'), h('small', null, `${plural(st.current, 'day', 'days')} streak`));
}

/* ================= HOME ================= */
function homeScreen() {
  const lv = levelInfo(), st = streakInfo(), wk = weekStreak(), scores = allScores(), ov = overallScore(scores), oinfo = rankInfo(ov.placed ? ov.score : 0), ms = muscleScores(scores);
  const colors = {}; for (const m in ms) colors[m] = rankInfo(ms[m]).tier;
  const wsk = weekStartKey(today()), days = Array.from({ length: 7 }, (_, i) => addDays(wsk, i)), trained = new Set(trainedDays());
  const top = Object.keys(scores).sort((a, b) => scores[b].score - scores[a].score).slice(0, 3);
  const nm = (S.settings.name || '').trim();
  const el = h('div', null,
    pageHead(nm ? `Hey, ${nm}` : 'Ready to train?'),
    h('section', { class: 'card hero' },
      h('div', { class: 'hero-l' }, h('small', { class: 'muted' }, 'Overall rank'), ov.placed ? h('div', { class: 'hero-b' }, badgeEl(oinfo, 92), h('div', null, h('b', { class: 'big tier-' + oinfo.tier }, oinfo.label), h('small', null, Math.round(ov.score) + ' pts'))) : h('div', { class: 'hero-b' }, badgeEl(rankInfo(0), 92), h('div', null, h('b', { class: 'big' }, 'Placements'), h('small', null, `${ov.count}/${PLACEMENTS} exercises ranked`))),
        ov.placed && oinfo.tier < 8 ? h('div', { class: 'mini-prog' }, meter(oinfo.progress, 1, tierColor(oinfo.tier)), h('small', null, `${Math.ceil((1 - oinfo.progress) * 100 / 3)} pts to next step`)) : null),
      h('div', { class: 'hero-r', html: Art.body('front', colors, 190) })),
    h('section', { class: 'card' },
      h('div', { class: 'streakrow' }, h('div', { class: 'flame' + (st.alive ? ' lit' : '') }, icon('flame', 30)), h('div', null, h('b', { class: 'big' }, plural(st.current, 'day', 'days')), h('small', null, st.alive ? `streak · best ${st.best}` : (st.total ? 'Streak ended — train today to restart' : 'Log a workout to start your streak'))), h('div', { class: 'wk' }, h('b', null, `${wk.thisWeek}/${wk.goal}`), h('small', null, 'this week'))),
      h('div', { class: 'weekstrip' }, days.map(d => h('div', { class: 'wd' + (trained.has(d) ? ' on' : '') + (d === today() ? ' today' : '') }, h('small', null, DOW_INITIAL[parseKey(d).getDay()]), h('i', null, trained.has(d) ? icon('check', 14, 3) : null))))),
    h('section', { class: 'card xp' }, h('div', { class: 'between' }, h('b', null, 'Level ' + lv.level), h('small', null, `${lv.xp} XP · ${lv.toNext} to next`)), meter(lv.progress, 1, 'var(--acc)')));
  if (S.active) {
    const n = sessionStats(S.active);
    el.append(h('button', { class: 'activebar', onclick: () => goTab('train') }, h('span', { class: 'pulse' }), h('div', null, h('b', null, 'Workout in progress'), h('small', null, `${plural(n.sets, 'set', 'sets')} · ${fmtMin(n.minutes)}`)), icon('right', 20)));
  }
  el.append(lockButton());
  if (top.length) el.append(h('h3', { class: 'sec' }, 'Your best lifts'), h('div', { class: 'list' }, top.map(id => { const b = scores[id], r = rankInfo(b.score); return h('button', { class: 'row', onclick: () => exerciseDetail(id) }, figureEl(CAT[id].pose, 46), h('div', { class: 'row-main' }, h('b', null, CAT[id].name), h('small', null, fmtSet(id, b.set))), tierChip(r)); })));
  else el.append(h('div', { class: 'empty' }, h('b', null, 'No ranks yet'), h('small', null, 'Log a set of any exercise and your rank appears here. Log 3 different exercises to unlock your overall rank.')));
  return el;
}

/* ================= TRAIN ================= */
function trainScreen() {
  const scores = allScores(), done = {};
  if (S.active) S.active.items.forEach(it => done[it.ex] = it.sets.length);
  const el = h('div', null, pageHead('Train'));
  if (S.active) { const n = sessionStats(S.active);
    el.append(h('div', { class: 'card active' }, h('div', { class: 'between' }, h('div', null, h('b', null, 'Workout in progress'), h('small', null, `${plural(n.sets, 'set', 'sets')} · ${plural(n.exercises, 'exercise', 'exercises')} · ${fmtMin(n.minutes)}`)), h('span', { class: 'pulse' })),
      h('div', { class: 'two' }, h('button', { class: 'btn ghost', onclick: discardSession }, 'Discard'), h('button', { class: 'btn primary', onclick: finishSession }, icon('check', 18), ' Finish')))); }
  else el.append(h('p', { class: 'muted sm hint-top' }, 'Pick an exercise and log your sets. The workout starts with your first set.'));
  el.append(h('div', { class: 'grid' }, CATALOG.map(e => { const b = scores[e.id], r = rankInfo(b ? b.score : 0);
    return h('button', { class: 'xcard' + (done[e.id] ? ' did' : ''), style: { '--tc': tierColor(r.tier) }, onclick: () => openLog(e.id) },
      h('span', { class: 'xfig' }, figureEl(e.pose, 124)), h('b', null, e.name), h('span', { class: 'xrow' }, badgeEl(r, 28), h('small', null, b ? r.label : 'Unranked')), done[e.id] ? h('span', { class: 'xdone' }, done[e.id]) : null); })));
  return el;
}

function logScreen() {
  const exId = ui.log, ex = CAT[exId], d = draftOf(exId), idx = CATALOG.findIndex(e => e.id === exId);
  if (!ex.variants.some(v => v.id === d.v)) d.v = ex.variants[0].id;
  const best = exerciseBest(exId), binfo = rankInfo(best.score), refs = {};
  const step = ex.kind === 'hold' ? 1 : 1, unit = ex.kind === 'hold' ? 'seconds' : (ex.perSide ? 'reps per side' : 'reps');
  const upd = () => {
    refs.big.value = numStr(d.r) || '';
    refs.wv && (refs.wv.value = numStr(d.w) || '0');
    const sc = setScore(exId, d), info = rankInfo(sc), isBest = sc > best.score;
    refs.prev.innerHTML = ''; refs.prev.append(h('div', { class: 'pv' }, badgeEl(info, 40), h('div', null, h('b', { class: 'tier-' + info.tier }, sc > 0 ? info.label : 'Unranked'), h('small', null, sc > 0 ? `≈ ${Math.round(sc)} pts${d.w > 0 && ex.kind === 'reps' ? ` · ${fmtNum(eqValue(ex, d.r, d.w), 0)} bodyweight reps` : ''}` : 'Enter a value'))), ...(isBest ? [h('span', { class: 'newbest' }, best.score ? 'New best' : 'First rank')] : []));
  };
  const set = v => { d.r = Math.max(0, Math.round(v)); upd(); };
  const watchBtn = ex.kind === 'hold' ? h('button', { class: 'btn ghost sm', onclick: e => {
    if (watch) { stopWatch(); e.currentTarget.textContent = 'Start timer'; return; }
    const t0 = Date.now(); e.currentTarget.textContent = 'Stop timer';
    watch = { iv: setInterval(() => { d.r = Math.floor((Date.now() - t0) / 1000); refs.big.value = d.r; upd(); }, 200) };
  } }, watch ? 'Stop timer' : 'Start timer') : null;

  const sets = []; const todaySets = (S.active && S.active.items.find(i => i.ex === exId)) || null;
  if (todaySets) todaySets.sets.forEach((s, i) => sets.push(h('div', { class: 'row static' }, h('span', { class: 'sn' }, i + 1), h('div', { class: 'row-main' }, h('b', null, fmtSet(exId, s)), h('small', { class: 'tier-' + rankInfo(setScore(exId, s)).tier }, rankInfo(setScore(exId, s)).label)), h('button', { class: 'icon-btn sm', 'aria-label': 'Remove set', onclick: () => removeSet(S.active, exId, i) }, icon('trash', 16)))));

  const nav = dir => { const n = CATALOG[(idx + dir + CATALOG.length) % CATALOG.length].id; stopWatch(); openLog(n); };
  const el = h('div', { class: 'logscr' },
    h('header', { class: 'pagehead log' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: () => { ui.log = null; stopWatch(); render(); } }, icon('left')), h('h1', null, ex.name),
      h('div', { class: 'navs' }, h('button', { class: 'icon-btn', 'aria-label': 'Previous exercise', onclick: () => nav(-1) }, icon('left', 18)), h('button', { class: 'icon-btn', 'aria-label': 'Next exercise', onclick: () => nav(1) }, icon('right', 18)))),
    h('section', { class: 'card stage', style: { '--tc': tierColor(binfo.tier) } }, h('div', { class: 'stage-fig' }, figureEl(ex.pose, 190)),
      h('button', { class: 'stage-rank', onclick: () => exerciseDetail(exId) }, badgeEl(binfo, 56), h('div', null, h('b', { class: 'tier-' + binfo.tier }, binfo.label), h('small', null, best.score ? `Best: ${fmtSet(exId, best.set)}` : 'Log a set to get ranked')), icon('right', 18)),
      best.score && binfo.tier < 8 ? meter(binfo.progress, 1, tierColor(binfo.tier)) : null));
  if (ex.variants.length > 1) el.append(h('div', { class: 'chips scroll vchips' }, ex.variants.map(v => h('button', { class: 'chip' + (d.v === v.id ? ' on' : ''), onclick: () => { d.v = v.id; render(); } }, v.name))));
  refs.big = h('input', { class: 'bigin', type: 'text', inputmode: 'numeric', value: numStr(d.r), 'aria-label': unit, oninput: e => { d.r = parseNum(e.target.value) || 0; if (watch) stopWatch(); upd(); } });
  refs.prev = h('div', { class: 'preview' });
  el.append(h('section', { class: 'card logger' },
    h('div', { class: 'stepper' }, h('button', { class: 'sbtn', 'aria-label': 'Minus', onclick: () => set(d.r - step) }, icon('minus', 26)), h('div', { class: 'bigwrap' }, refs.big, h('small', null, unit)), h('button', { class: 'sbtn', 'aria-label': 'Plus', onclick: () => set(d.r + step) }, icon('plus', 26))),
    h('div', { class: 'quick' }, [-5, -2, 2, 5, 10].map(n => h('button', { class: 'q', onclick: () => set(d.r + n) }, (n > 0 ? '+' : '') + n)), watchBtn),
    ex.weighted ? h('div', { class: 'extra' }, h('span', null, 'Extra weight'), h('div', { class: 'mini-step' }, h('button', { onclick: () => { d.w = Math.max(0, Math.round((d.w - 2.5) * 10) / 10); upd(); } }, icon('minus', 16)), refs.wv = h('input', { type: 'text', inputmode: 'decimal', value: numStr(d.w) || '0', oninput: e => { d.w = parseNum(e.target.value) || 0; upd(); } }), h('em', null, 'kg'), h('button', { onclick: () => { d.w = Math.round((d.w + 2.5) * 10) / 10; upd(); } }, icon('plus', 16)))) : null,
    refs.prev,
    h('button', { class: 'btn primary block lg', onclick: () => { stopWatch(); logSet(exId, d); } }, icon('check', 20), ' Log set')));
  if (sets.length) el.append(h('h3', { class: 'sec' }, 'Today'), h('div', { class: 'list' }, sets));
  el.append(h('button', { class: 'btn ghost block', onclick: () => exerciseDetail(exId) }, icon('chart', 18), ' Records & progress'));
  setTimeout(upd, 0);
  return el;
}

/* ================= RANKS ================= */
function explainSheet() {
  openSheet({ title: 'How ranks work', tall: true, body: h('div', { class: 'explain' },
    h('p', null, h('b', null, '1. Every set gets points (0–1000). '), 'Each exercise variation has a scale: for example 13 strict pull-ups ≈ 400 pts. The app interpolates between the rows of the scale.'),
    h('p', null, h('b', null, '2. Tiers every 100 points. '), 'Iron → Bronze → Silver → Gold → Platinum → Diamond → Master → Elite → Legend (800+). Each tier has steps I, II and III (Legend has none).'),
    h('p', null, h('b', null, '3. Harder variations earn more. '), 'One archer pull-up is worth more than one strict pull-up, and a full front lever hold scores above a tuck.'),
    h('p', null, h('b', null, '4. Weighted sets. '), 'Extra weight is converted into equivalent bodyweight reps using the Epley formula (1RM = load × (1 + reps/30)), so a weighted set can outrank a plain one.'),
    h('p', null, h('b', null, '5. Exercise rank = your best set '), '(all time, or within the window set in Profile). '),
    h('p', null, h('b', null, '6. Muscle rank '), 'comes from the 3 main exercises that train that muscle, so one great exercise is not enough to max it out. ', h('b', null, 'Overall rank '), 'is the average of ALL your muscles (untrained ones count as zero), so the top ranks need the whole body trained with serious reps, seconds and extra weight. It unlocks after ' + PLACEMENTS + ' ranked exercises.'),
    h('p', { class: 'muted' }, 'Ranks only go up by getting stronger (more reps, longer holds, more weight, harder variations). Level and XP are a separate counter for consistency.'),
    h('p', { class: 'muted' }, 'Starting scales come from public strength standards (Strength Level, FitnessVolt progression guides) and some are estimates. Tap any exercise → Edit scale to match your own standards.')) });
}
function ranksScreen() {
  const scores = allScores(), ms = muscleScores(scores), ov = overallScore(scores), oinfo = rankInfo(ov.placed ? ov.score : 0);
  const el = h('div', null, pageHead('Ranks', h('button', { class: 'icon-btn', 'aria-label': 'How ranks work', onclick: explainSheet }, icon('info'))),
    segmented([['overall', 'Overall'], ['body', 'Bodygraph'], ['ex', 'Exercises'], ['ladder', 'Ladder']], ui.ranksTab, v => { ui.ranksTab = v; render(); }));
  if (ui.ranksTab === 'overall') {
    el.append(h('section', { class: 'card center bigrank', style: { '--tc': tierColor(oinfo.tier) } }, badgeEl(oinfo, 150), ov.placed ? h('b', { class: 'huge tier-' + oinfo.tier }, oinfo.label) : h('b', { class: 'huge' }, 'Unranked'),
      h('small', null, ov.placed ? `${Math.round(ov.score)} pts · ${plural(ov.count, 'exercise', 'exercises')} ranked` : `Rank ${PLACEMENTS - ov.count} more exercise${PLACEMENTS - ov.count === 1 ? '' : 's'} to unlock (${ov.count}/${PLACEMENTS})`),
      ov.placed && oinfo.tier < 8 ? meter(oinfo.progress, 1, tierColor(oinfo.tier)) : null,
      S.settings.rankWindow ? h('small', { class: 'muted' }, `Counting the last ${S.settings.rankWindow} days`) : null));
    const ids = Object.keys(scores).sort((a, b) => scores[b].score - scores[a].score);
    if (ids.length) el.append(h('h3', { class: 'sec' }, 'Top exercises'), h('div', { class: 'list' }, ids.slice(0, 5).map(id => h('button', { class: 'row', onclick: () => exerciseDetail(id) }, figureEl(CAT[id].pose, 44), h('div', { class: 'row-main' }, h('b', null, CAT[id].name), h('small', null, fmtSet(id, scores[id].set))), tierChip(rankInfo(scores[id].score))))));
    const mids = Object.keys(ms).sort((a, b) => ms[b] - ms[a]);
    if (mids.length) el.append(h('h3', { class: 'sec' }, 'Strongest muscles'), h('div', { class: 'list' }, mids.slice(0, 3).map(m => h('button', { class: 'row', onclick: () => muscleDetail(m) }, h('div', { class: 'row-main' }, h('b', null, Art.MUSCLES.find(x => x.id === m).name)), tierChip(rankInfo(ms[m]))))));
  } else if (ui.ranksTab === 'body') {
    const colors = {}; for (const m in ms) colors[m] = rankInfo(ms[m]).tier;
    const pick = e => { const t = e.target.closest('[data-muscle]'); if (t) muscleDetail(t.getAttribute('data-muscle')); };
    el.append(h('section', { class: 'card bodies' }, h('div', { class: 'bodyview', onclick: pick }, h('small', null, 'FRONT'), h('div', { html: Art.body('front', colors, 330) })), h('div', { class: 'bodyview', onclick: pick }, h('small', null, 'BACK'), h('div', { html: Art.body('back', colors, 330) }))),
      h('p', { class: 'muted sm center' }, 'Muscles are painted with their rank colour. Tap one to see what trains it.'),
      h('div', { class: 'legend' }, Art.TIERS.map((t, i) => h('span', null, h('i', { style: { background: t.c2 } }), t.name))));
    const mids = Art.MUSCLES.map(m => m.id);
    el.append(h('div', { class: 'list' }, mids.map(m => { const r = rankInfo(ms[m] || 0); return h('button', { class: 'row', onclick: () => muscleDetail(m) }, h('div', { class: 'row-main' }, h('b', null, Art.MUSCLES.find(x => x.id === m).name)), tierChip(r)); })));
  } else if (ui.ranksTab === 'ex') {
    el.append(h('div', { class: 'list' }, CATALOG.map(e => { const b = scores[e.id], r = rankInfo(b ? b.score : 0); return h('button', { class: 'row', onclick: () => exerciseDetail(e.id) }, figureEl(e.pose, 48), h('div', { class: 'row-main' }, h('b', null, e.name), h('small', null, b ? fmtSet(e.id, b.set) : 'Not logged yet')), tierChip(r)); })));
  } else {
    const cur = oinfo.tier;
    el.append(h('div', { class: 'ladder' }, Art.TIERS.slice().reverse().map((t, ri) => { const i = 8 - ri; return h('div', { class: 'rung' + (i === cur ? ' me' : ''), style: { '--tc': t.c2 } }, h('div', { class: 'rbadges' }, (i === 8 ? [null] : [0, 1, 2]).map(s => badgeEl({ tier: i, sub: s }, 44))), h('div', null, h('b', { class: 'tier-' + i }, t.name), h('small', null, i === 8 ? '800+ pts' : `${i * 100}–${i * 100 + 99} pts`)))})));
  }
  return el;
}

/* ================= FOOD ================= */
function foodScreen() {
  const date = ui.foodDate || today(), t = dayTotals(date), s = S.settings, meals = mealsOn(date), water = waterOn(date);
  const el = h('div', null, pageHead('Food', h('button', { class: 'btn primary sm', onclick: () => mealEditor(null, date) }, icon('plus', 16), ' Add')),
    h('div', { class: 'datenav' }, h('button', { class: 'icon-btn', 'aria-label': 'Previous day', onclick: () => { ui.foodDate = addDays(date, -1); render(); } }, icon('left')), h('b', null, relDay(date)), h('button', { class: 'icon-btn', 'aria-label': 'Next day', onclick: () => { ui.foodDate = addDays(date, 1); render(); } }, icon('right'))));
  const left = s.calorieGoal - t.kcal;
  el.append(h('section', { class: 'card' }, h('div', { class: 'between' }, h('div', null, h('b', { class: 'big' }, fmtNum(t.kcal, 0)), h('small', null, `of ${fmtNum(s.calorieGoal, 0)} kcal`)), h('div', { class: 'right' }, h('b', { class: left < 0 ? 'over' : '' }, fmtNum(Math.abs(left), 0)), h('small', null, left < 0 ? 'over goal' : 'remaining'))), meter(t.kcal, s.calorieGoal, t.kcal > s.calorieGoal ? 'var(--warn)' : 'var(--acc)'),
    h('div', { class: 'macros' }, [['Protein', t.p, s.proteinGoal, '#ff6b81'], ['Carbs', t.c, s.carbGoal, '#ffc24b'], ['Fat', t.f, s.fatGoal, '#5aa9ff']].map(([n, v, g, c]) => h('div', null, h('small', null, n), h('b', null, `${fmtNum(v, 0)}`, h('em', null, ` / ${g} g`)), meter(v, g, c))))));
  el.append(h('section', { class: 'card' }, h('div', { class: 'between' }, h('div', { class: 'wtr' }, icon('drop', 22), h('div', null, h('b', null, `${fmtNum(water / 1000, 2)} L`), h('small', null, `goal ${fmtNum(s.waterGoal / 1000, 2)} L`))), h('div', { class: 'mini-step' }, h('button', { 'aria-label': 'Less water', onclick: () => { S.water[date] = Math.max(0, water - s.waterStep); save(); render(); } }, icon('minus', 16)), h('em', null, `${s.waterStep} ml`), h('button', { 'aria-label': 'More water', onclick: () => { S.water[date] = water + s.waterStep; save(); render(); } }, icon('plus', 16)))), meter(water, s.waterGoal, '#5aa9ff')));
  const types = [...new Set([...s.mealTypes, ...meals.map(m => m.type)])];
  types.forEach(ty => { const list = meals.filter(m => m.type === ty); if (!list.length) return; const sub = list.reduce((a, m) => a + (m.kcal || 0), 0);
    el.append(h('div', { class: 'between sec-row' }, h('h3', { class: 'sec' }, ty), h('small', null, fmtNum(sub, 0) + ' kcal')), h('div', { class: 'list' }, list.map(m => h('button', { class: 'row', onclick: () => mealEditor(m, date) }, h('div', { class: 'row-main' }, h('b', null, m.name), h('small', null, `${m.time || ''} · P ${fmtNum(m.p || 0, 0)} · C ${fmtNum(m.c || 0, 0)} · F ${fmtNum(m.f || 0, 0)}`)), h('b', null, fmtNum(m.kcal || 0, 0))))));
  });
  if (!meals.length) el.append(h('div', { class: 'empty' }, h('b', null, 'Nothing logged'), h('small', null, 'Tap Add to log a meal. Favorites make repeat meals one tap.')));
  const bars = Array.from({ length: 14 }, (_, i) => { const d = addDays(today(), i - 13); return { label: i % 2 ? '' : String(parseKey(d).getDate()), value: dayTotals(d).kcal, dim: d !== date, color: dayTotals(d).kcal > s.calorieGoal ? 'var(--warn)' : undefined }; });
  el.append(h('h3', { class: 'sec' }, 'Last 14 days'), h('div', { class: 'card chartbox' }, barChart(bars, { goal: s.calorieGoal })));
  return el;
}

/* ================= PROFILE ================= */
function calendarCard() {
  const base = ui.calMonth || today().slice(0, 7), [y, m] = base.split('-').map(Number), first = new Date(y, m - 1, 1), lead = (first.getDay() - S.settings.weekStart + 7) % 7, dim = new Date(y, m, 0).getDate();
  const trained = new Set(trainedDays()), cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('i', { class: 'cal-e' }));
  for (let d = 1; d <= dim; d++) { const k = `${y}-${pad(m)}-${pad(d)}`, n = trained.has(k);
    cells.push(h('button', { class: 'cal-d' + (n ? ' on' : '') + (k === today() ? ' today' : ''), onclick: () => n && daySheet(k) }, d)); }
  const heads = Array.from({ length: 7 }, (_, i) => h('small', null, DOW_INITIAL[(i + S.settings.weekStart) % 7]));
  const shift = n => { const d = new Date(y, m - 1 + n, 1); ui.calMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); };
  return h('section', { class: 'card' }, h('div', { class: 'between' }, h('button', { class: 'icon-btn', 'aria-label': 'Previous month', onclick: () => shift(-1) }, icon('left')), h('b', null, `${MONTHS[m - 1]} ${y}`), h('button', { class: 'icon-btn', 'aria-label': 'Next month', onclick: () => shift(1) }, icon('right'))), h('div', { class: 'cal' }, heads, cells));
}
function daySheet(k) {
  const list = trainedOn(k);
  const sh = openSheet({ title: fmtDateLong(k), body: h('div', { class: 'list' }, list.map(s => { const n = sessionStats(s); return h('button', { class: 'row', onclick: () => { closeSheet(sh); sessionEditor(s); } }, h('div', { class: 'row-main' }, h('b', null, s.items.map(i => exName(i.ex)).join(', ') || (s.locked ? 'Locked in' : 'Workout')), h('small', null, `${plural(n.sets, 'set', 'sets')} · ${fmtMin(n.minutes)}`)), icon('right', 18)); })) });
}
async function shareFile(name, text, type) {
  const file = new File([text], name, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return true; } catch (e) { if (e.name === 'AbortError') return false; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.append(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 1500); return true;
}
/* ---------- avatar creator ---------- */
const AV_TABS = [
  ['char', 'Character'], ['mood', 'Mood'], ['color', 'Colors'], ['extra', 'Extras'],
];
function avatarCard(lv) {
  const s = S.settings, card = h('section', { class: 'card charcard' });
  const sync = () => document.querySelectorAll('.tb-av').forEach(e => { e.innerHTML = charSVG(null, 44, AV_CROP); });
  const draw = () => {
    const tab = ui.avTab || 'char', cur = avatarOf();
    const set = (k, v) => { s.avatar = Object.assign({}, avatarOf(), { [k]: v }); save(); draw(); sync(); };
    const lab = t => h('small', { class: 'avlab' }, t);
    const swatches = (k, list, orig, pick) => h('div', { class: 'avopts' },
      h('button', { class: 'sw orig' + (cur[k] == null ? ' on' : ''), 'aria-label': 'Original', onclick: () => (pick ? pick(null) : set(k, null)) }, 'A'),
      list.map(v => h('button', { class: 'sw' + (cur[k] === v ? ' on' : ''), style: { background: v }, 'aria-label': v, onclick: () => (pick ? pick(v) : set(k, v)) })));
    const styles = (k, list) => h('div', { class: 'avopts' }, list.map(([v, name]) =>
      h('button', { class: 'opt' + (cur[k] === v ? ' on' : ''), onclick: () => set(k, v) },
        h('span', { html: charSVG(Object.assign({}, cur, { [k]: v }), 62, AV_FACECROP) }), h('small', null, name))));
    let body;
    if (tab === 'char') body = [lab('Beard'), styles('chin', AV_CHIN), lab('Pick a character (all cut from your sheets)'),
      h('div', { class: 'avgrid' }, AVC.map(c => h('button', { class: 'cpick' + (cur.c === c.id ? ' on' : ''), 'aria-label': 'Character ' + c.id,
        onclick: () => set('c', c.id), html: charSVG(Object.assign({}, cur, { c: c.id, mood: 'default', glasses: 'none', ear: 'none', face: 'none' }), 64, AV_CROP) })))];
    else if (tab === 'mood') body = [lab('Facial expression'), styles('mood', AV_MOODS), lab('Nose'),
      h('div', { class: 'avopts' }, AV_NOSE.map(([v, name]) => h('button', { class: 'opt' + (cur.nose === v ? ' on' : ''), onclick: () => { s.avatar = Object.assign({}, avatarOf(), { nose: v, mood: cur.mood === 'default' ? 'calm' : cur.mood }); save(); draw(); sync(); } },
        h('span', { html: charSVG(Object.assign({}, cur, { nose: v, mood: cur.mood === 'default' ? 'calm' : cur.mood }), 62, AV_FACECROP) }), h('small', null, name))))];
    else if (tab === 'color') body = [lab('Skin tone'), swatches('skin', AV.skin), lab('Hair, hat & beard'), swatches('hair', AV.hair, null, v => { s.avatar = Object.assign({}, avatarOf(), { hair: v, beard: v }); save(); draw(); sync(); }), lab('Beard only'), swatches('beard', AV.beard),
      lab('Outfit'), swatches('out', AV.out), lab('Background'), h('div', { class: 'avopts' }, AV.bg.map(v => h('button', { class: 'sw' + (cur.bg === v ? ' on' : ''), style: { background: v }, 'aria-label': v, onclick: () => set('bg', v) })))];
    else body = [lab('Glasses'), styles('glasses', AV_GLASSES), lab('Earrings'), styles('ear', AV_EAR), lab('Face details'), styles('face', AV_FACE)];
    card.replaceChildren(
      h('div', { class: 'cbig', html: charSVG(cur, 240) }),
      h('b', { class: 'cname' }, s.name || 'Athlete'), h('small', null, `Level ${lv.level} \u00b7 ${lv.xp} XP`),
      h('div', { class: 'avtabs' }, AV_TABS.map(t => h('button', { class: 'avtab' + (t[0] === tab ? ' on' : ''), onclick: () => { ui.avTab = t[0]; draw(); } }, t[1]))),
      h('div', { class: 'avrows' }, body),
      h('div', { class: 'avact' }, h('button', { class: 'btn ghost sm', onclick: () => { s.avatar = avatarRandom(); save(); draw(); sync(); } }, icon('refresh', 14), ' Randomize')));
  };
  draw(); return card;
}
function profileScreen() {
  const s = S.settings, lv = levelInfo(), st = streakInfo(), sessions = sessionsDesc();
  let sets = 0; sessions.forEach(x => sets += sessionStats(x).sets);
  const sv = (k, def) => v => { s[k] = v == null ? def : v; save(); };
  const wc = weekCounts(), wsk = weekStartKey(today()), bars = Array.from({ length: 8 }, (_, i) => { const w = addDays(wsk, (i - 7) * 7); return { label: fmtDateShort(w).replace(/^\w+ /, ''), value: wc[w] || 0 }; });
  const wts = S.weights.slice().sort((a, b) => a.date.localeCompare(b.date));
  const el = h('div', null, pageHead('Profile'),
    avatarCard(lv),
    h('div', { class: 'stats three' }, h('div', { class: 'stat' }, h('small', null, 'Workouts'), h('b', null, sessions.length)), h('div', { class: 'stat' }, h('small', null, 'Sets'), h('b', null, sets)), h('div', { class: 'stat' }, h('small', null, 'Best streak'), h('b', null, st.best))),
    calendarCard(),
    h('h3', { class: 'sec' }, 'Workouts per week'), h('div', { class: 'card chartbox' }, barChart(bars, { goal: s.weeklyGoal })),
    h('h3', { class: 'sec' }, 'History'));
  el.append(sessions.length ? h('div', { class: 'list' }, sessions.slice(0, 30).map(x => { const n = sessionStats(x); return h('button', { class: 'row', onclick: () => sessionEditor(x) }, h('div', { class: 'row-main' }, h('b', null, fmtDateLong(x.date)), h('small', null, x.items.length ? x.items.map(i => exName(i.ex)).join(', ') : (x.locked ? 'Locked in' : plural(n.sets, 'set', 'sets')))), h('small', null, fmtMin(n.minutes))); })) : h('div', { class: 'empty' }, h('small', null, 'Finished workouts show up here.')));
  el.append(h('div', { class: 'between sec-row' }, h('h3', { class: 'sec' }, 'Body weight'), h('button', { class: 'btn ghost sm', onclick: weightSheet }, icon('plus', 14), ' Log')));
  el.append(wts.length > 1 ? h('div', { class: 'card chartbox' }, lineChart(wts.map((w, i) => ({ x: i, y: w.kg, date: w.date })), { labels: p => fmtDateShort(p.date), fmtY: v => fmtNum(v, 1) })) : h('div', { class: 'empty' }, h('small', null, wts.length ? `${wts[0].kg} kg logged. Add another to see the trend.` : 'Used to convert weighted sets into rank points.')));
  el.append(h('h3', { class: 'sec', id: 'settings' }, 'Settings'),
    h('section', { class: 'card form' }, field('Name', textInput(s.name, sv('name', ''), { placeholder: 'Your name' })), h('div', { class: 'two' }, field('Body weight (kg)', numInput(s.bodyweight, sv('bodyweight', 70))), field('Rest timer (s)', numInput(s.restSeconds, sv('restSeconds', 0)))),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Ranks count your best sets from'), segmented([[0, 'All time'], [90, '90 days'], [30, '30 days']], s.rankWindow, v => { s.rankWindow = v; save(); render(); }))),
    h('section', { class: 'card form' }, h('b', null, 'Streak rules'), h('div', { class: 'three' }, field('Weekly goal', numInput(s.weeklyGoal, sv('weeklyGoal', 3))), field('Rest days allowed', numInput(s.streakGap, sv('streakGap', 2))), field('Week starts', selectInput(s.weekStart, [[1, 'Monday'], [0, 'Sunday']], v => { s.weekStart = +v; save(); render(); })))),
    h('section', { class: 'card form' }, h('b', null, 'Calendar reminders'), h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Training days'), chips(DOW_SHORT.map((n, i) => [i, n]), s.trainDays, () => save(), true)),
      h('div', { class: 'three' }, field('Time', h('input', { type: 'time', class: 'input', value: s.trainTime, onchange: e => { s.trainTime = e.target.value; save(); } })), field('Alert (min before)', numInput(s.reminderLead, sv('reminderLead', 10))), field('Length (min)', numInput(s.reminderDuration, sv('reminderDuration', 60)))),
      field('Daily meal reminder (optional)', h('input', { type: 'time', class: 'input', value: s.mealReminder || '', onchange: e => { s.mealReminder = e.target.value; save(); } })),
      h('button', { class: 'btn ghost block', onclick: async () => { const r = buildICS(); if (!r.count) return toast('Pick training days and a time first'); await shareFile('calisthenics.ics', r.text, 'text/calendar'); } }, icon('calendar', 18), ' Add reminders to Calendar'), h('small', { class: 'muted' }, 'Creates a calendar file. Open it and tap "Add All" in the iPhone Calendar app.')),
    h('section', { class: 'card form' }, h('b', null, 'Nutrition goals'), h('div', { class: 'two' }, field('Calories', numInput(s.calorieGoal, sv('calorieGoal', 2200))), field('Water (ml)', numInput(s.waterGoal, sv('waterGoal', 2500)))), h('div', { class: 'three' }, field('Protein (g)', numInput(s.proteinGoal, sv('proteinGoal', 150))), field('Carbs (g)', numInput(s.carbGoal, sv('carbGoal', 250))), field('Fat (g)', numInput(s.fatGoal, sv('fatGoal', 70))))),
    h('section', { class: 'card form' }, h('b', null, 'Backup'), h('small', { class: 'muted' }, s.lastBackup ? `Last backup: ${fmtDateFull(s.lastBackup)}` : 'Your data lives only on this phone. Export a backup now and then.'),
      h('div', { class: 'two' }, h('button', { class: 'btn ghost', onclick: async () => { const ok = await shareFile(`calisthenics-${today()}.json`, exportData(), 'application/json'); if (ok) { s.lastBackup = today(); save(); render(); } } }, icon('download', 18), ' Export'), h('button', { class: 'btn ghost', onclick: () => document.getElementById('importFile').click() }, icon('upload', 18), ' Import')),
      h('button', { class: 'btn danger-ghost block', onclick: () => confirmSheet({ title: 'Erase everything?', text: 'All workouts, ranks, meals and settings on this device will be deleted. Export a backup first if unsure.', ok: 'Erase', danger: true, onOk: () => { try { localStorage.removeItem(KEY); } catch (e) { } S = freshState(); migrate(); saveNow(); ui.draft = {}; render(); toast('All data erased'); } }) }, 'Erase all data')),
    h('p', { class: 'muted sm center foot' }, 'Calisthenics Rank · works offline · your data never leaves this device. Muscle chart by martsan (Pixabay), reworked; exercise figures created with Leonardo AI.'));
  return el;
}

/* ================= start ================= */
function injectTierCss() {
  const st = document.createElement('style');
  st.textContent = Art.TIERS.map((t, i) => `.tier-${i}{color:${t.c2}}`).join('') + '.tier--1{color:#8b91a1}';
  document.head.append(st);
}
document.addEventListener('DOMContentLoaded', () => {
  load(); Art.init(); injectTierCss(); render();
  document.getElementById('importFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { try { importData(String(r.result)); ui.draft = {}; render(); toast('Backup imported'); } catch (err) { toast('Could not read that file'); } e.target.value = ''; }; r.readAsText(f);
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
});

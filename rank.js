'use strict';
/* =========================================================
   RANK — score per exercise, muscle and overall.

   1) Each logged set -> score 0..1000 by interpolating the variation's anchors.
      Weighted sets are converted to "equivalent bodyweight reps" with the Epley
      formula (1RM = load x (1 + reps/30)), reps capped at 30 for the conversion.
   2) Exercise score = best set in the chosen time window.
   3) Muscle score   = best 3 exercises that train it, weighted by how much each one trains it (missing ones count 0).
   4) Overall score  = average of ALL muscles (untrained muscles count 0) -> top rank needs the whole body.
   Every 100 points is a tier; each tier has 3 steps (I, II, III) except Legend.
   ========================================================= */

const TIER_NAMES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Elite', 'Legend'];
const ROMAN = ['I', 'II', 'III'];
const PLACEMENTS = 3;   // how many exercises you need ranked before the overall rank shows

function rankInfo(score) {
  if (!(score > 0)) return { score: 0, tier: -1, sub: null, label: 'Unranked', name: 'Unranked', pts: 0, progress: 0 };
  const tier = Math.min(8, Math.floor(score / 100)), pts = score - tier * 100;
  const sub = tier === 8 ? null : Math.min(2, Math.floor(pts / (100 / 3)));
  const progress = tier === 8 ? clamp((score - 800) / 200, 0, 1) : (pts - sub * (100 / 3)) / (100 / 3);
  return { score, tier, sub, name: TIER_NAMES[tier], label: TIER_NAMES[tier] + (sub != null ? ' ' + ROMAN[sub] : ''), pts: Math.round(pts), progress };
}
const stepKey = r => r.tier * 3 + (r.sub || 0);       // for detecting a rank-up

/* ---------- catalog access (built-in + user rules) ---------- */
const exDef = id => CAT[id];
function variantsOf(exId) { const e = CAT[exId]; return e ? e.variants : []; }
function anchorsOf(exId, vId) {
  const ov = S.rules && S.rules[exId] && S.rules[exId][vId]; if (ov && ov.length > 1) return ov;
  const v = variantsOf(exId).find(x => x.id === vId) || variantsOf(exId)[0]; return v ? v.anchors : [[0, 0]];
}
function interp(a, x) {
  if (!a.length) return 0;
  if (x <= a[0][0]) return a[0][0] === 0 ? a[0][1] : a[0][1] * Math.max(0, x / a[0][0]);
  for (let i = 1; i < a.length; i++) if (x <= a[i][0]) { const [x0, y0] = a[i - 1], [x1, y1] = a[i]; return x1 === x0 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  const l = a[a.length - 1], p = a[a.length - 2] || l;   // beyond the last anchor: keep climbing slowly, capped at 1100
  const slope = l[0] === p[0] ? 0 : (l[1] - p[1]) / (l[0] - p[0]);
  return Math.min(1100, l[1] + slope * 0.25 * (x - l[0]));
}
/* weighted reps -> equivalent bodyweight reps */
function eqValue(ex, reps, extra) {
  if (ex.kind !== 'reps' || !ex.weighted || !(extra > 0)) return reps;
  const bw = Math.max(20, S.settings.bodyweight || 70) * ex.bw, r = Math.min(reps, 30);
  return 30 * (((bw + extra) * (1 + r / 30)) / bw - 1);
}
function setScore(exId, set) {
  const ex = CAT[exId]; if (!ex || !(set.r > 0)) return 0;
  return interp(anchorsOf(exId, set.v), eqValue(ex, set.r, set.w));
}

/* ---------- scores ---------- */
function sessionsForRank(includeActive) {
  const win = S.settings.rankWindow | 0, list = S.sessions.slice();
  if (includeActive && S.active) list.push(S.active);
  return win > 0 ? list.filter(s => diffDays(s.date, today()) <= win) : list;
}
function exerciseBest(exId, includeActive = true) {
  let best = { score: 0, set: null, date: null };
  sessionsForRank(includeActive).forEach(s => s.items.forEach(it => {
    if (it.ex !== exId) return;
    it.sets.forEach(st => { const sc = setScore(exId, st); if (sc > best.score) best = { score: sc, set: st, date: s.date }; });
  }));
  return best;
}
function allScores(includeActive = true) {
  const out = {};
  CATALOG.forEach(e => { const b = exerciseBest(e.id, includeActive); if (b.score > 0) out[e.id] = b; });
  return out;
}
const MUSCLE_IDS = [...new Set(CATALOG.flatMap(e => Object.keys(e.muscles)))];
const TOP_N = 3;   // a muscle needs its 3 main exercises to reach its full score
function muscleScores(scores) {
  scores = scores || allScores();
  const out = {};
  MUSCLE_IDS.forEach(m => {
    const list = CATALOG.filter(e => e.muscles[m]).map(e => ({ w: e.muscles[m], c: e.muscles[m] * (scores[e.id] ? scores[e.id].score : 0) }));
    const denom = list.map(x => x.w).sort((a, b) => b - a).slice(0, TOP_N).reduce((a, b) => a + b, 0);
    const num = list.map(x => x.c).sort((a, b) => b - a).slice(0, TOP_N).reduce((a, b) => a + b, 0);
    if (num > 0) out[m] = num / denom;
  });
  return out;
}
/* overall = average of ALL muscles (muscles you never trained count as 0) -> Legend needs every muscle at Legend */
function overallScore(scores) {
  scores = scores || allScores();
  const n = Object.keys(scores).length; if (n < PLACEMENTS) return { score: 0, count: n, placed: false };
  const ms = muscleScores(scores), sum = MUSCLE_IDS.reduce((a, m) => a + (ms[m] || 0), 0);
  return { score: sum / MUSCLE_IDS.length, count: n, placed: true };
}

/* ---------- raw records (best reps / seconds), level & XP ---------- */
function bestRaw(exId, vId) {
  let best = null;
  sessionsForRank(true).forEach(s => s.items.forEach(it => { if (it.ex !== exId) return; it.sets.forEach(st => { if (st.v === vId && st.r > 0 && (!best || st.r > best.r || (st.r === best.r && (st.w || 0) > (best.w || 0)))) best = st; }); }));
  return best;
}
function xpTotal() {
  let xp = 0; S.sessions.forEach(s => { xp += 50; s.items.forEach(it => xp += it.sets.length * 10); }); return xp;
}
function levelInfo() {
  const xp = xpTotal(); let lvl = 1; while (xp >= 40 * lvl * lvl) lvl++;
  const lo = 40 * (lvl - 1) * (lvl - 1), hi = 40 * lvl * lvl;
  return { xp, level: lvl, progress: (xp - lo) / (hi - lo), toNext: hi - xp };
}

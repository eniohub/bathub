'use strict';
/* =========================================================
   CORE — storage, dates, streaks, nutrition helpers,
   calendar reminders (.ics) and backup.
   Everything is saved on this device only (localStorage).
   ========================================================= */

const KEY = 'calisthenics.v2';
const OLD_KEY = 'meutreino.v1';

/* ---------- dates & numbers ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
const today = () => dkey();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const fmtDateLong = k => { const d = parseKey(k); return `${DOW_LONG[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
const fmtDateShort = k => { const d = parseKey(k); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
const fmtDateFull = k => { const d = parseKey(k); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
function relDay(k) {
  const n = diffDays(k, today());
  if (n === 0) return 'today'; if (n === 1) return 'yesterday'; if (n < 0) return fmtDateShort(k);
  if (n < 7) return `${n} days ago`; if (n < 30) return `${Math.round(n / 7)} wk ago`;
  return fmtDateShort(k);
}
function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
const fmtMin = min => { min = Math.round(min); return min >= 60 ? `${Math.floor(min / 60)}h ${pad(min % 60)}m` : `${min} min`; };
function parseNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.'); if (s === '') return null;
  const n = parseFloat(s); return isFinite(n) ? n : null;
}
const numStr = n => (n == null || n === '' || isNaN(n)) ? '' : String(Math.round(n * 100) / 100);
const fmtNum = (n, d = 1) => (n == null || isNaN(n)) ? '–' : (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('en-US', { maximumFractionDigits: d });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/* ---------- defaults ---------- */
const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Other'];
const MEAL_MAP = { 'Café da manhã': 'Breakfast', 'Almoço': 'Lunch', 'Lanche': 'Snack', 'Jantar': 'Dinner', 'Outro': 'Other' };
const DEFAULT_SETTINGS = {
  name: '', bodyweight: 70, restSeconds: 90, weeklyGoal: 3, streakGap: 2, weekStart: 1, rankWindow: 0, char: 0, avatar: null,
  trainDays: [1, 3, 5], trainTime: '18:00', reminderLead: 10, reminderDuration: 60, mealReminder: '',
  mealTypes: DEFAULT_MEALS.slice(), calorieGoal: 2200, proteinGoal: 150, carbGoal: 250, fatGoal: 70, waterGoal: 2500, waterStep: 250,
  lastBackup: null,
};
let S = null;

function freshState() {
  return { v: 2, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), rules: {}, sessions: [], active: null, meals: [], foods: [], water: {}, weights: [] };
}
function migrate() {
  S.settings = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), S.settings || {});
  ['sessions', 'meals', 'foods', 'weights'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
  if (!S.water || typeof S.water !== 'object') S.water = {};
  if (!S.rules || typeof S.rules !== 'object') S.rules = {};
  if (S.active === undefined) S.active = null;
  if (!Array.isArray(S.settings.mealTypes) || !S.settings.mealTypes.length) S.settings.mealTypes = DEFAULT_MEALS.slice();
}
/* brings over food, water, weight and workout days from the earlier Portuguese version */
function importOld() {
  try {
    const raw = localStorage.getItem(OLD_KEY); if (!raw) return false;
    const o = JSON.parse(raw), st = freshState();
    const os = o.settings || {};
    ['weeklyGoal', 'streakGap', 'weekStart', 'calorieGoal', 'proteinGoal', 'carbGoal', 'fatGoal', 'waterGoal', 'waterStep', 'name'].forEach(k => { if (os[k] != null) st.settings[k] = os[k]; });
    st.meals = (o.meals || []).map(m => Object.assign({}, m, { type: MEAL_MAP[m.type] || m.type }));
    st.foods = o.foods || []; st.water = o.water || {}; st.weights = o.weights || [];
    st.sessions = (o.sessions || []).map(s => ({ id: s.id, date: s.date, start: s.start, end: s.end, notes: s.notes || '', items: [] }));
    S = st; return true;
  } catch (e) { return false; }
}
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }
function saveNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { console.warn(e); if (window.toast) toast('Could not save. Export a backup in Profile.'); return false; }
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); migrate(); return; } } catch (e) { console.warn('unreadable data, starting fresh', e); }
  if (!importOld()) S = freshState();
  migrate(); saveNow();
}
window.addEventListener('pagehide', () => { if (S) saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && S) saveNow(); });

/* ---------- sessions & streaks ---------- */
const sessionsAsc = () => S.sessions.slice().sort((a, b) => a.start - b.start);
const sessionsDesc = () => S.sessions.slice().sort((a, b) => b.start - a.start);
const trainedDays = () => [...new Set(S.sessions.map(s => s.date))].sort();
const trainedOn = k => S.sessions.filter(s => s.date === k);
const exName = id => (CAT[id] ? CAT[id].name : 'Unknown exercise');

function sessionStats(sess) {
  let sets = 0, reps = 0, secs = 0;
  sess.items.forEach(it => { const ex = CAT[it.ex]; it.sets.forEach(st => { sets++; if (ex && ex.kind === 'hold') secs += st.r || 0; else reps += st.r || 0; }); });
  return { sets, reps, secs, exercises: sess.items.length, minutes: Math.max(1, Math.round(((sess.end || Date.now()) - sess.start) / 60000)) };
}

function streakInfo() {
  const gap = S.settings.streakGap, days = trainedDays();
  if (!days.length) return { current: 0, best: 0, total: 0, last: null, deadline: null, alive: false };
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) { run = diffDays(days[i - 1], days[i]) <= gap + 1 ? run + 1 : 1; best = Math.max(best, run); }
  const last = days[days.length - 1], alive = diffDays(last, today()) <= gap + 1;
  let current = 0;
  if (alive) { current = 1; for (let i = days.length - 1; i > 0; i--) { if (diffDays(days[i - 1], days[i]) <= gap + 1) current++; else break; } }
  return { current, best, total: days.length, last, alive, deadline: addDays(last, gap + 1) };
}
function weekStartKey(k) { const d = parseKey(k), diff = (d.getDay() - S.settings.weekStart + 7) % 7; d.setDate(d.getDate() - diff); return dkey(d); }
function weekCounts() { const m = {}; trainedDays().forEach(d => { const w = weekStartKey(d); m[w] = (m[w] || 0) + 1; }); return m; }
function weekStreak() {
  const goal = S.settings.weeklyGoal, counts = weekCounts(), keys = Object.keys(counts).sort(), cw = weekStartKey(today());
  if (!keys.length) return { current: 0, best: 0, thisWeek: 0, goal };
  let best = 0, run = 0, w = keys[0];
  while (w <= cw) { if ((counts[w] || 0) >= goal) { run++; best = Math.max(best, run); } else if (w !== cw) run = 0; w = addDays(w, 7); }
  let cur = 0, p = (counts[cw] || 0) >= goal ? cw : addDays(cw, -7);
  while ((counts[p] || 0) >= goal) { cur++; p = addDays(p, -7); }
  return { current: cur, best, thisWeek: counts[cw] || 0, goal };
}

/* ---------- nutrition ---------- */
const mealsOn = k => S.meals.filter(m => m.date === k).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
function dayTotals(k) { const t = { kcal: 0, p: 0, c: 0, f: 0, n: 0 }; mealsOn(k).forEach(m => { t.kcal += m.kcal || 0; t.p += m.p || 0; t.c += m.c || 0; t.f += m.f || 0; t.n++; }); return t; }
const waterOn = k => S.water[k] || 0;

/* ---------- calendar reminders (.ics) ---------- */
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsStamp(k, hhmm, addMin = 0) {
  const [h, m] = (hhmm || '18:00').split(':').map(Number), d = parseKey(k); d.setHours(h, m + addMin, 0, 0);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}
function buildICS() {
  const s = S.settings, L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Calisthenics Rank//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Calisthenics'];
  const n = new Date(), stamp = `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}T${pad(n.getUTCHours())}${pad(n.getUTCMinutes())}${pad(n.getUTCSeconds())}Z`;
  let count = 0;
  if (s.trainDays.length && s.trainTime) {
    let first = today(); for (let i = 0; i < 7 && !s.trainDays.includes(parseKey(first).getDay()); i++) first = addDays(first, 1);
    L.push('BEGIN:VEVENT', 'UID:training@calisthenics', `DTSTAMP:${stamp}`, `DTSTART:${icsStamp(first, s.trainTime)}`, `DTEND:${icsStamp(first, s.trainTime, s.reminderDuration)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${s.trainDays.slice().sort().map(d => BYDAY[d]).join(',')}`, 'SUMMARY:Calisthenics training', 'DESCRIPTION:Log your sets and chase the next rank.',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Time to train', `TRIGGER:-PT${s.reminderLead}M`, 'END:VALARM', 'END:VEVENT'); count++;
  }
  if (s.mealReminder) {
    L.push('BEGIN:VEVENT', 'UID:meals@calisthenics', `DTSTAMP:${stamp}`, `DTSTART:${icsStamp(today(), s.mealReminder)}`, `DTEND:${icsStamp(today(), s.mealReminder, 15)}`, 'RRULE:FREQ=DAILY',
      'SUMMARY:Log today\'s meals', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Log today\'s meals', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'); count++;
  }
  L.push('END:VCALENDAR');
  return { text: L.join('\r\n') + '\r\n', count };
}

/* ---------- backup ---------- */
const exportData = () => JSON.stringify(S, null, 1);
function importData(text) {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.sessions)) throw new Error('Invalid file');
  S = d; migrate(); saveNow();
}

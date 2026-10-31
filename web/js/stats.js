// History (calendar + workout list) and Stats (reports & charts).
import { state, save, plan, workouts, nextSession } from './store.js';
import { sampleBanner, loadSample } from './settings.js';
import {
  esc, ICON, MON, MONTH_LONG, DOW1, dur, kg, clock, sod, sow, addDays, dkey, fromKey, daysBetween,
  timeStr, dateStr, shortDate, sheet, seg, e1rm, fmt1,
} from './util.js';

const GROUPS = {
  Back: ['Back'], Chest: ['Chest'], Core: ['Abs'], Shoulders: ['Shoulders'],
  Arms: ['Biceps', 'Triceps'], Legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
};
const AXES = ['Back', 'Chest', 'Core', 'Shoulders', 'Arms', 'Legs']; // hexagon, clockwise from top-left
const LIFTS = [['bench', 'Bench Press'], ['legpress', 'Leg Press'], ['hipthrust', 'Hip Thrust'],
  ['row', 'Barbell Row'], ['ohp', 'Overhead Press'], ['pullup', 'Pull-up (added kg)']];

const ui = { calMonth: null, selDay: null, metric: 'dur', tab: 'balance', period: 'week', weekOff: 0, barSel: null, daySel: null };
const rerender = () => window.dispatchEvent(new Event('rerender'));
const inRange = (list, from, to) => list.filter((w) => w.start >= +from && w.start < +to);
const total = (list, k) => list.reduce((a, w) => a + (w[k] || 0), 0);
const setCount = (list) => total(list, 'sets');

function muscleSets(list) {
  const out = Object.fromEntries(plan.muscles.map((m) => [m, 0]));
  for (const w of list) for (const x of w.ex) for (const [m, f] of Object.entries(x.m)) out[m] = (out[m] || 0) + f * x.sets.length;
  return out;
}
const groupSets = (ms) => Object.fromEntries(AXES.map((g) => [g, GROUPS[g].reduce((a, m) => a + (ms[m] || 0), 0)]));
const level = (v, max) => (v <= 0 || max <= 0 ? 0 : Math.max(1, Math.ceil((v / max) * 4)));

// ------------------------------------------------------------------ shared: week strip
export function weekStrip(asCard = true) {
  const start = sow(new Date());
  const list = inRange(state.workouts, start, addDays(start, 7));
  const days = new Set(list.map((w) => dkey(w.start)));
  const today = dkey(new Date());
  const inner = `
      <div class="strip-row">${DOW1.map((d, i) => {
        const date = addDays(start, i), k = dkey(date);
        return `<div class="sd ${days.has(k) ? 'on' : ''} ${k === today ? 'today' : ''}"><span>${d}</span><b>${date.getDate()}</b></div>`;
      }).join('')}</div>
      <div class="strip-foot"><b>${list.length}</b> / 3 sessions this week</div>`;
  return asCard ? `<section class="card strip">${inner}</section>` : `<div class="strip">${inner}</div>`;
}

// ------------------------------------------------------------------ History
export function renderHistory(root) {
  const list = workouts();
  const now = new Date();
  if (!ui.calMonth) ui.calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const cm = ui.calMonth;
  const byDay = {};
  list.forEach((w) => (byDay[dkey(w.start)] ||= []).push(w));

  const pad = (cm.getDay() + 6) % 7;
  const daysIn = new Date(cm.getFullYear(), cm.getMonth() + 1, 0).getDate();
  let cells = '<span></span>'.repeat(pad);
  for (let d = 1; d <= daysIn; d++) {
    const k = dkey(new Date(cm.getFullYear(), cm.getMonth(), d));
    const ws = byDay[k];
    cells += `<button class="cday ${ws ? 'has' : ''} ${k === dkey(now) ? 'today' : ''} ${k === ui.selDay ? 'sel' : ''}" data-day="${k}">
      <b>${d}</b><small>${ws ? ws.map((w) => w.day).join('') : ''}</small></button>`;
  }
  const monthList = list.filter((w) => { const d = new Date(w.start); return d.getMonth() === cm.getMonth() && d.getFullYear() === cm.getFullYear(); });
  const shown = ui.selDay ? byDay[ui.selDay] || [] : monthList;
  const monthMin = Math.round(total(monthList, 'dur') / 60);

  root.innerHTML = `
    <header class="top"><div class="grow"><div class="eyebrow">${list.length} workouts logged</div><h1>History</h1></div></header>
    ${sampleBanner()}
    <section class="card cal">
      <div class="cal-head">
        <button class="icon-btn sm" data-act="prev" aria-label="Previous month">${ICON.chevL}</button>
        <b>${MONTH_LONG[cm.getMonth()]} ${cm.getFullYear()}</b>
        <button class="icon-btn sm" data-act="next" aria-label="Next month">${ICON.chevR}</button>
      </div>
      <div class="cal-grid">${DOW1.map((d) => `<span class="cdow">${d}</span>`).join('')}${cells}</div>
      <div class="cal-foot"><span><b>${monthList.length}</b> workouts</span><span><b>${monthMin}</b> min</span><span><b>${kg(total(monthList, 'vol'))}</b> kg</span></div>
    </section>
    <div class="list-head">
      <b>${ui.selDay ? dateStr(fromKey(ui.selDay)) : MONTH_LONG[cm.getMonth()]}</b>
      ${ui.selDay ? '<button class="link" data-act="all">Show whole month</button>' : `<span class="muted">${shown.length} workout${shown.length === 1 ? '' : 's'}</span>`}
    </div>
    ${shown.length ? [...shown].reverse().map(workoutCard).join('') : `<div class="empty">No workouts ${ui.selDay ? 'on this day' : 'this month'} yet.</div>`}`;

  root.onclick = (ev) => {
    const b = ev.target.closest('[data-act],[data-day],[data-wid]');
    if (!b) return;
    if (b.dataset.act === 'prev' || b.dataset.act === 'next') {
      ui.calMonth = new Date(cm.getFullYear(), cm.getMonth() + (b.dataset.act === 'next' ? 1 : -1), 1);
      ui.selDay = null;
    } else if (b.dataset.act === 'all') ui.selDay = null;
    else if (b.dataset.day) ui.selDay = ui.selDay === b.dataset.day ? null : b.dataset.day;
    else if (b.dataset.wid) return openWorkout(b.dataset.wid);
    renderHistory(root);
  };
}

const workoutCard = (w) => `
  <button class="card wk" data-wid="${w.id}">
    <div class="wk-title"><b>${esc(w.title)}</b><span>${esc(w.dayName)}</span></div>
    <div class="wk-stats">
      <div><b>${timeStr(w.start)}</b><span>${shortDate(w.start)}</span></div>
      <div><b>${clock(w.dur)}</b><span>Duration</span></div>
      <div><b>${w.vol ? `${kg(w.vol)} kg` : '–'}</b><span>Volume</span></div>
    </div>
  </button>`;

export function openWorkout(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return;
  const sh = sheet(`
    <h3>${esc(w.title)}</h3>
    <p class="muted">${esc(w.dayName)} · ${dateStr(w.start)} · ${timeStr(w.start)}</p>
    <div class="stat-grid">
      <div class="stat"><span>Duration</span><b>${dur(w.dur)}</b></div>
      <div class="stat"><span>Sets</span><b>${w.sets}</b></div>
      <div class="stat"><span>Volume</span><b>${w.vol ? `${kg(w.vol)} kg` : '–'}</b></div>
      <div class="stat"><span>Cardio</span><b>${w.cardio ? 'Done' : '–'}</b></div>
    </div>
    <div class="detail">${w.ex.map((x) => {
      const weighed = x.sets.some((s) => s.w != null);
      const chips = weighed
        ? x.sets.map((s) => `<span>${s.w != null ? `${fmt1(s.w)} kg` : '–'}${s.r ? ` × ${s.r}` : ''}</span>`).join('')
        : `<span>${x.sets.length} × ${x.sets[0]?.r ?? 'set'}</span>`;
      return `<div class="d-ex"><b>${esc(x.n)}</b><div class="d-sets">${chips}</div></div>`;
    }).join('')}</div>
    <button class="btn danger" data-act="del">Delete workout</button>`);
  sh.el.onclick = (ev) => {
    if (!ev.target.closest('[data-act="del"]')) return;
    if (!confirm('Delete this workout?')) return;
    state.workouts = state.workouts.filter((x) => x.id !== id);
    if (!state.workouts.some((x) => x.sid === w.sid)) delete state.status[w.sid];
    save();
    sh.close();
    rerender();
  };
}

// ------------------------------------------------------------------ Stats
// Each card renders on its own, so tapping a toggle, arrow, bar or heatmap
// square only redraws that card and the page never jumps.
const CARDS = {
  totals: totalsCard,
  week: weekCard,
  activity: (list) => `<div class="card-title">Activity</div>${heatmap(list)}`,
  bars: (list) => `<div class="card-title">Last 12 weeks</div>
    ${seg('metric', [['n', 'Workouts'], ['dur', 'Duration'], ['vol', 'Volume'], ['reps', 'Reps']], ui.metric)}
    ${weekBars(list, ui.metric)}`,
  muscles: (list) => `${seg('tab', [['balance', 'Balance'], ['fatigue', 'Fatigue'], ['strength', 'Strength']], ui.tab)}
    ${ui.tab === 'balance' ? balance(list) : ui.tab === 'fatigue' ? fatigue(list) : strength(list)}`,
  planned: (list) => `<div class="card-title">Weekly muscle volume</div>${plannedVolume(list)}`,
};

export function renderStats(root) {
  const list = workouts();
  if (!list.length) {
    root.innerHTML = `
      <header class="top"><div class="grow"><div class="eyebrow">Your progress</div><h1>Stats</h1></div></header>
      <section class="card empty-card">
        <div class="empty-icon">${ICON.stats}</div>
        <h3>No workouts yet</h3>
        <p class="muted">Finish your first workout and your totals, streak, charts and muscle balance show up here.</p>
        <a class="btn primary" href="#/today">${ICON.play}<span>Go to today's workout</span></a>
        <button class="btn ghost" data-act="sample">Or explore with sample data</button>
      </section>
      <section class="card">${CARDS.planned(list)}</section>`;
    root.onclick = (ev) => { if (ev.target.closest('[data-act="sample"]')) loadSample(); };
    return;
  }

  root.innerHTML = `
    <header class="top"><div class="grow"><div class="eyebrow">Your progress</div><h1>Stats</h1></div></header>
    ${sampleBanner()}
    ${Object.entries(CARDS).map(([k, f]) => `<section class="card" data-card="${k}">${f(list)}</section>`).join('')}`;

  root.onclick = (ev) => {
    const b = ev.target.closest('[data-seg],[data-act],[data-bar],[data-day]');
    const cardEl = b && b.closest('[data-card]');
    if (!cardEl) return;
    if (b.dataset.seg) {
      ui[b.dataset.seg] = b.dataset.val;
      if (b.dataset.seg === 'period') ui.weekOff = 0;
    } else if (b.dataset.act === 'wprev') ui.weekOff -= 1;
    else if (b.dataset.act === 'wnext') ui.weekOff = Math.min(0, ui.weekOff + 1);
    else if (b.dataset.bar != null) ui.barSel = +b.dataset.bar;
    else if (b.dataset.day) ui.daySel = ui.daySel === b.dataset.day ? null : b.dataset.day;
    else return;
    // Redraw only this card and keep it exactly where it was on screen. The
    // page keeps its height so a shorter card can't yank you upward.
    root.style.minHeight = `${root.offsetHeight}px`;
    const top = cardEl.getBoundingClientRect().top;
    cardEl.innerHTML = CARDS[cardEl.dataset.card](workouts());
    const shift = cardEl.getBoundingClientRect().top - top;
    if (shift) window.scrollBy(0, shift);
  };
}

function totalsCard(list) {
  const now = new Date();
  const wk0 = sow(now);
  const weeks = new Set(list.map((w) => +sow(w.start)));
  let cur = weeks.has(+wk0) ? wk0 : addDays(wk0, -7);
  let streak = 0;
  while (weeks.has(+cur)) { streak++; cur = addDays(cur, -7); }
  const restDays = daysBetween(list.at(-1).start, now);
  const hours = total(list, 'dur') / 3600;
  return `
    <div class="card-title">Total</div>
    <div class="totals">
      <div><span>Workouts</span><b>${list.length}</b></div>
      <div><span>Time</span><b>${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h</b></div>
      <div><span>Volume</span><b>${kg(total(list, 'vol'))} kg</b></div>
    </div>
    <div class="duo">
      <div class="flame">${ICON.flame}<span><b>${streak}</b><small>week streak</small></span></div>
      <div class="moon">${ICON.moon}<span><b>${restDays}</b><small>${restDays === 0 ? 'trained today' : `rest day${restDays === 1 ? '' : 's'}`}</small></span></div>
    </div>`;
}

// Weekly average uses finished weeks only (up to the last 8), so it doesn't
// drop every Monday because the new week has barely started.
function weekCard(list) {
  const now = new Date();
  const wk0 = sow(now);
  const todayMin = Math.round(total(inRange(list, sod(now), addDays(sod(now), 1)), 'dur') / 60);
  const thisWeekMin = Math.round(total(inRange(list, wk0, addDays(wk0, 7)), 'dur') / 60);
  const doneWeeks = Math.min(8, Math.max(0, Math.round((wk0 - sow(list[0].start)) / (7 * 864e5))));
  const avgMin = doneWeeks ? Math.round(total(inRange(list, addDays(wk0, -7 * doneWeeks), wk0), 'dur') / 60 / doneWeeks) : thisWeekMin;
  return `
    <div class="card-title">This week</div>
    ${weekStrip(false)}
    <div class="totals three">
      <div><span>Today</span><b>${todayMin} min</b></div>
      <div><span>This week</span><b>${thisWeekMin} min</b></div>
      <div><span>Weekly avg</span><b>${avgMin} min</b></div>
    </div>
    <p class="sub tight">${doneWeeks ? `Average of your last ${doneWeeks} full week${doneWeeks === 1 ? '' : 's'}.` : 'Your average appears after your first full week.'}</p>`;
}

// GitHub-style grid of the last 26 weeks, coloured by minutes trained.
// Tap a square to see that day.
function heatmap(list) {
  const weeks = 26, c = 11, g = 3, step = c + g, top = 16, left = 14;
  const end = sow(new Date());
  const start = addDays(end, -7 * (weeks - 1));
  const today = sod(new Date());
  const mins = {}, byDay = {};
  list.forEach((w) => { const k = dkey(w.start); mins[k] = (mins[k] || 0) + w.dur / 60; (byDay[k] ||= []).push(w); });
  let s = `<svg viewBox="0 0 ${left + weeks * step - g} ${top + 7 * step - g}" class="heat" role="img" aria-label="Activity over the last 26 weeks">`;
  ['M', 'W', 'F'].forEach((d, i) => { s += `<text x="0" y="${top + i * 2 * step + 9}" class="h-label">${d}</text>`; });
  let lastMonth = -1, lastLabel = -9;
  for (let col = 0; col < weeks; col++) {
    const colStart = addDays(start, col * 7);
    const x = left + col * step;
    if (colStart.getMonth() !== lastMonth) {
      if (col - lastLabel >= 3 && col < weeks - 1) { s += `<text x="${x}" y="10" class="h-label">${MON[colStart.getMonth()]}</text>`; lastLabel = col; }
      lastMonth = colStart.getMonth();
    }
    for (let r = 0; r < 7; r++) {
      const d = addDays(colStart, r);
      if (d > today) continue;
      const k = dkey(d);
      const m = mins[k] || 0;
      const lv = m === 0 ? 0 : m < 45 ? 1 : m < 75 ? 2 : m < 100 ? 3 : 4;
      const cls = `lv${lv}${+d === +today ? ' h-today' : ''}${ui.daySel === k ? ' h-sel' : ''}`;
      // The invisible larger square makes the tiny cells easier to hit.
      s += `<g data-day="${k}"><rect x="${x - 1.5}" y="${top + r * step - 1.5}" width="${step}" height="${step}" class="h-hit"/>
        <rect x="${x}" y="${top + r * step}" width="${c}" height="${c}" rx="2.5" class="${cls}"/></g>`;
    }
  }
  let caption = '<span class="muted">Tap a square to see that day.</span>';
  if (ui.daySel) {
    const ws = byDay[ui.daySel] || [];
    caption = `<b>${dateStr(fromKey(ui.daySel))}</b> · ${ws.length ? ws.map((w) => `${esc(w.title)} · ${dur(w.dur)}`).join(', ') : 'rest day'}`;
  }
  return `${s}</svg>
    <div class="chart-caption">${caption}</div>
    <div class="legend"><span>Less time</span>${[0, 1, 2, 3, 4].map((l) => `<i class="lv${l}"></i>`).join('')}<span>More time</span></div>`;
}

function niceMax(v, metric) {
  if (metric === 'n') return Math.max(4, Math.ceil(v / 2) * 2);
  if (v <= 0) return metric === 'dur' ? 2 : 100;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function fmtMetric(v, metric) {
  if (metric === 'dur') return `${v < 10 ? fmt1(Math.round(v * 10) / 10) : Math.round(v)}h`;
  if (metric === 'vol') return kg(v);
  return String(Math.round(v));
}

function weekBars(list, metric) {
  const n = 12, W = 340, H = 186, L = 34, B = 30, T = 22;
  const end = sow(new Date());
  const starts = Array.from({ length: n }, (_, i) => addDays(end, -7 * (n - 1 - i)));
  const val = (w) => (metric === 'n' ? 1 : metric === 'dur' ? w.dur / 3600 : metric === 'vol' ? w.vol || 0 : w.reps || 0);
  const weekLists = starts.map((st) => inRange(list, st, addDays(st, 7)));
  const vals = weekLists.map((ws) => ws.reduce((a, w) => a + val(w), 0));
  if (metric === 'vol' && !vals.some((v) => v > 0)) {
    return '<div class="chart-empty">Volume needs weights. Log a weight on an exercise during a workout and it shows up here.</div>';
  }
  const sel = ui.barSel ?? n - 1;
  const max = niceMax(Math.max(...vals), metric);
  const ph = H - B - T, bw = (W - L) / n, barW = Math.min(16, bw * 0.5);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="bars" role="img" aria-label="Weekly chart, tap a bar for details">`;
  [0, 0.5, 1].forEach((f) => {
    const y = T + ph * (1 - f);
    s += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" class="axis">${fmtMetric(max * f, metric)}</text>`;
  });
  vals.forEach((v, i) => {
    const x = L + bw * i + (bw - barW) / 2, cx = x + barW / 2;
    const h = v > 0 ? Math.max(barW, (v / max) * ph) : 0;
    const cls = i === sel ? 'bar sel' : i === n - 1 ? 'bar cur' : 'bar';
    s += `<g data-bar="${i}"><rect x="${L + bw * i}" y="${T - 10}" width="${bw}" height="${ph + 10 + B}" class="hit"/>`;
    if (h) s += `<rect x="${x}" y="${T + ph - h}" width="${barW}" height="${h}" rx="${barW / 2}" class="${cls}"/>`;
    if (i === sel && v > 0) s += `<text x="${cx}" y="${T + ph - h - 6}" text-anchor="middle" class="val">${fmtMetric(v, metric)}</text>`;
    // Day number on every other bar, month name only where the month changes.
    const newMonth = i === 0 || starts[i].getMonth() !== starts[i - 1].getMonth();
    if (i % 2 === (n - 1) % 2 || i === sel) s += `<text x="${cx}" y="${H - 16}" text-anchor="middle" class="axis${i === sel ? ' on' : ''}">${starts[i].getDate()}</text>`;
    if (newMonth) s += `<text x="${cx}" y="${H - 4}" text-anchor="middle" class="axis sm">${MON[starts[i].getMonth()].toUpperCase()}</text>`;
    s += '</g>';
  });
  const ws = weekLists[sel];
  const label = sel === n - 1 ? 'This week' : `Week of ${shortDate(starts[sel])}`;
  const parts = [`${ws.length} workout${ws.length === 1 ? '' : 's'}`, dur(total(ws, 'dur'))];
  if (total(ws, 'vol')) parts.push(`${kg(total(ws, 'vol'))} kg`);
  return `${s}</svg><div class="chart-caption"><b>${label}</b> · ${parts.join(' · ')}</div>`;
}

function radar(curG, prevG) {
  const W = 320, H = 250, cx = 160, cy = 125, R = 84;
  const ang = [-120, -60, 0, 60, 120, 180].map((a) => (a * Math.PI) / 180);
  const max = Math.max(1, ...AXES.map((a) => Math.max(curG[a] || 0, prevG?.[a] || 0)));
  const pt = (i, r) => `${(cx + r * Math.cos(ang[i])).toFixed(1)},${(cy + r * Math.sin(ang[i])).toFixed(1)}`;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="radar" role="img" aria-label="Muscle distribution">`;
  for (let f = 1; f <= 5; f++) s += `<polygon points="${AXES.map((_, i) => pt(i, (R * f) / 5)).join(' ')}" class="r-ring"/>`;
  AXES.forEach((_, i) => { s += `<line x1="${cx}" y1="${cy}" x2="${pt(i, R).split(',')[0]}" y2="${pt(i, R).split(',')[1]}" class="r-axis"/>`; });
  const poly = (g, cls) => `<polygon points="${AXES.map((a, i) => pt(i, R * Math.max(0.04, (g[a] || 0) / max))).join(' ')}" class="${cls}"/>`;
  if (prevG) s += poly(prevG, 'r-prev');
  s += poly(curG, 'r-cur');
  AXES.forEach((a, i) => {
    const cos = Math.cos(ang[i]);
    const anchor = Math.abs(cos) < 0.1 ? 'middle' : cos > 0 ? 'start' : 'end';
    const [x, y] = pt(i, R + 16).split(',');
    s += `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" class="r-label">${a}</text>`;
  });
  return `${s}</svg>`;
}

function delta(cur, prev, f) {
  if (prev == null) return '';
  const d = cur - prev;
  if (!cur && !prev) return '';
  if (Math.abs(d) < 1e-9) return '<small class="delta">same as before</small>';
  return `<small class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '↑' : '↓'} ${f(Math.abs(d))}</small>`;
}

function balance(list) {
  const now = new Date();
  let from, to, pFrom, pTo, label = '';
  let vs = 'Previous';
  if (ui.period === 'week') {
    from = addDays(sow(now), 7 * ui.weekOff); to = addDays(from, 7);
    pFrom = addDays(from, -7); pTo = from;
    // A week in progress is compared with the same days of last week, not all of it.
    if (ui.weekOff === 0) { pTo = new Date(+now - 7 * 864e5); vs = 'Same days last week'; }
    label = `<div class="period-nav">
      <button class="icon-btn sm" data-act="wprev" aria-label="Previous week">${ICON.chevL}</button>
      <b>Week of ${shortDate(from)}</b>
      <button class="icon-btn sm" data-act="wnext" aria-label="Next week" ${ui.weekOff >= 0 ? 'disabled' : ''}>${ICON.chevR}</button></div>`;
  } else if (ui.period === 'all') {
    from = new Date(0); to = addDays(now, 1);
  } else {
    const n = +ui.period;
    to = new Date(+now + 1); from = addDays(sod(now), -n + 1); pTo = from; pFrom = addDays(from, -n);
  }
  const cur = inRange(list, from, to);
  const prev = pFrom ? inRange(list, pFrom, pTo) : null;
  const ms = muscleSets(cur);
  const maxM = Math.max(...Object.values(ms));
  const card = (name, c, p, f) => `<div class="cmp"><span>${name}</span><b>${f(c)}</b>${prev ? delta(c, p, f) : ''}</div>`;

  return `
    <div class="sub">Muscle balance · by sets worked</div>
    ${seg('period', [['week', 'Week'], ['30', '30d'], ['90', '90d'], ['all', 'All']], ui.period)}
    ${label}
    ${radar(groupSets(ms), prev ? groupSets(muscleSets(prev)) : null)}
    <div class="legend center"><i class="dot cur"></i>${ui.period === 'week' && ui.weekOff === 0 ? 'This week' : 'Current'}${prev ? `<i class="dot prev"></i>${vs}` : ''}</div>
    ${cur.length ? '' : '<p class="muted center">No workouts in this period yet.</p>'}
    <div class="cmp-grid">
      ${card('Workouts', cur.length, prev?.length, (v) => String(v))}
      ${card('Duration', total(cur, 'dur'), prev && total(prev, 'dur'), (v) => dur(v))}
      ${card('Volume', total(cur, 'vol'), prev && total(prev, 'vol'), (v) => `${kg(v)} kg`)}
      ${card('Sets', setCount(cur), prev && setCount(prev), (v) => String(v))}
    </div>
    <div class="mlist">${plan.muscles.map((m) => `
      <div class="mrow"><span class="m-name">${m}</span><div class="mbar"><i class="lv${level(ms[m], maxM)}" style="width:${maxM ? (ms[m] / maxM) * 100 : 0}%"></i></div><span class="m-val">${fmt1(ms[m])}</span></div>`).join('')}
    </div>
    <div class="legend"><span>Less</span>${[1, 2, 3, 4].map((l) => `<i class="lv${l}"></i>`).join('')}<span>More</span></div>`;
}

// Recent sets per muscle, decaying with a ~36 h time constant.
function fatigue(list) {
  const now = Date.now(), tau = 36 * 3600e3;
  const score = {}, last = {};
  plan.muscles.forEach((m) => { score[m] = 0; last[m] = null; });
  for (const w of list) {
    for (const x of w.ex) {
      for (const [m, f] of Object.entries(x.m)) {
        const sets = x.sets.length * f;
        if (!sets) continue;
        last[m] = Math.max(last[m] || 0, w.end);
        score[m] += sets * Math.exp(-(now - w.end) / tau);
      }
    }
  }
  const rows = plan.muscles
    .map((m) => ({ m, pct: Math.min(100, Math.round((score[m] / 6) * 100)), last: last[m] }))
    .sort((a, b) => b.pct - a.pct);
  const ago = (t) => { if (!t) return 'not trained yet'; const d = daysBetween(t, new Date()); return d === 0 ? 'trained today' : d === 1 ? 'trained yesterday' : `trained ${d} days ago`; };
  return `
    <div class="sub">Recovery estimate from your recent sets</div>
    <div class="mlist">${rows.map(({ m, pct, last: t }) => {
      const st = pct >= 70 ? ['fatigued', 'Fatigued'] : pct >= 30 ? ['recovering', 'Recovering'] : ['fresh', 'Fresh'];
      return `<div class="mrow tall"><span class="m-name">${m}<small>${st[1]} · ${ago(t)}</small></span>
        <div class="mbar"><i class="${st[0]}" style="width:${Math.max(pct, 2)}%"></i></div><span class="m-val">${pct}%</span></div>`;
    }).join('')}</div>
    <div class="legend"><i class="dot fresh"></i>Fresh <i class="dot recovering"></i>Recovering <i class="dot fatigued"></i>Fatigued</div>`;
}

function spark(points) {
  if (points.length < 2) return '<svg viewBox="0 0 100 32" class="spark"></svg>';
  const pts = points.slice(-20), min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const xy = pts.map((v, i) => `${((i / (pts.length - 1)) * 96 + 2).toFixed(1)},${(30 - ((v - min) / span) * 26).toFixed(1)}`);
  return `<svg viewBox="0 0 100 32" class="spark" aria-hidden="true"><polyline points="${xy.join(' ')}"/><circle cx="${xy.at(-1).split(',')[0]}" cy="${xy.at(-1).split(',')[1]}" r="2.5"/></svg>`;
}

function strength(list) {
  const rows = LIFTS.map(([key, name]) => {
    const pts = [];
    for (const w of list) {
      let best = 0;
      for (const x of w.ex) if (x.lift === key) for (const s of x.sets) if (s.w > 0 && s.r > 0 && s.r <= 12) best = Math.max(best, e1rm(s.w, s.r));
      if (best) pts.push(Math.round(best * 10) / 10);
    }
    return { name, pts };
  });
  const any = rows.some((r) => r.pts.length);
  return `
    <div class="sub">Estimated 1RM per main lift (Epley)</div>
    ${any ? '' : '<p class="muted">Log weights and reps on your main lifts to see strength trends here. Logging is optional, and only lifts you log appear.</p>'}
    <div class="slist">${rows.map(({ name, pts }) => {
      if (!pts.length) return `<div class="srow"><span class="s-name">${name}</span><span class="muted">–</span></div>`;
      const change = pts.at(-1) - pts[0];
      return `<div class="srow"><span class="s-name">${name}<small>best ${fmt1(Math.max(...pts))} kg</small></span>${spark(pts)}
        <span class="s-val"><b>${fmt1(pts.at(-1))}</b><small class="delta ${change > 0 ? 'up' : change < 0 ? 'down' : ''}">${change ? `${change > 0 ? '↑' : '↓'} ${fmt1(Math.abs(Math.round(change * 10) / 10))}` : '·'}</small></span></div>`;
    }).join('')}</div>`;
}

function plannedVolume(list) {
  const next = nextSession();
  const mN = next ? next.month : list.at(-1)?.month || 1;
  const m = plan.months[mN - 1];
  const start = sow(new Date());
  const done = muscleSets(inRange(list, start, addDays(start, 7)));
  const scale = Math.max(1, ...Object.values(m.planned), ...Object.values(done));
  return `
    <p class="sub">Planned sets per week from your plan (Month ${m.n}: ${esc(m.title)}) vs done this week.</p>
    <div class="mlist">${plan.muscles.map((k) => {
      const p = m.planned[k] || 0, d = done[k] || 0;
      return `<div class="mrow"><span class="m-name">${k}</span>
        <div class="vbar"><i class="plan" style="width:${(p / scale) * 100}%"></i><i class="done" style="width:${(Math.min(d, scale) / scale) * 100}%"></i></div>
        <span class="m-val">${fmt1(Math.round(d * 10) / 10)}<small>/${fmt1(p)}</small></span></div>`;
    }).join('')}</div>
    <div class="legend"><i class="dot planbox"></i>Planned <i class="dot cur"></i>Done</div>`;
}

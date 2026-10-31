// History (calendar + workout list) and Stats (reports & charts).
import { state, save, plan, workouts, nextSession } from './store.js';
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

const ui = { calMonth: null, selDay: null, metric: 'dur', tab: 'balance', period: 'week', weekOff: 0 };
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

function openWorkout(id) {
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
    <div class="detail">${w.ex.map((x) => `<div class="d-ex"><b>${esc(x.n)}</b><div class="d-sets">${x.sets
      .map((s) => `<span>${s.w != null ? `${fmt1(s.w)} kg × ` : ''}${s.r ?? '✓'}</span>`).join('')}</div></div>`).join('')}</div>
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
export function renderStats(root) {
  const list = workouts();
  const now = new Date();
  const wk0 = sow(now);

  const weeks = new Set(list.map((w) => +sow(w.start)));
  let cur = weeks.has(+wk0) ? wk0 : addDays(wk0, -7);
  let streak = 0;
  while (weeks.has(+cur)) { streak++; cur = addDays(cur, -7); }
  const last = list.at(-1);
  const restDays = last ? daysBetween(last.start, now) : null;

  const todayMin = Math.round(total(inRange(list, sod(now), addDays(sod(now), 1)), 'dur') / 60);
  const firstWk = list.length ? sow(list[0].start) : wk0;
  const nWeeks = Math.min(12, Math.max(1, Math.round((wk0 - firstWk) / (7 * 864e5)) + 1));
  const avgMin = Math.round(total(inRange(list, addDays(wk0, -7 * (nWeeks - 1)), addDays(wk0, 7)), 'dur') / 60 / nWeeks);
  const hours = total(list, 'dur') / 3600;

  root.innerHTML = `
    <header class="top"><div class="grow"><div class="eyebrow">Your progress</div><h1>Stats</h1></div></header>
    <section class="card">
      <div class="card-title">Total</div>
      <div class="totals">
        <div><span>Workouts</span><b>${list.length}</b></div>
        <div><span>Time</span><b>${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h</b></div>
        <div><span>Volume</span><b>${kg(total(list, 'vol'))} kg</b></div>
      </div>
      <div class="duo">
        <div class="flame">${ICON.flame}<span><b>${streak}</b> week streak</span></div>
        <div class="moon">${ICON.moon}<span><b>${restDays ?? '–'}</b> rest day${restDays === 1 ? '' : 's'}</span></div>
      </div>
    </section>
    <section class="card">
      <div class="card-title">This week</div>
      ${weekStrip(false)}
      <div class="totals two">
        <div><span>Today</span><b>${todayMin} min</b></div>
        <div><span>Weekly average</span><b>${avgMin} min</b></div>
      </div>
    </section>
    <section class="card">
      <div class="card-title">Activity</div>
      ${heatmap(list)}
    </section>
    <section class="card">
      <div class="card-title">Last 12 weeks</div>
      ${seg('metric', [['n', 'Workouts'], ['dur', 'Duration'], ['vol', 'Volume'], ['reps', 'Reps']], ui.metric)}
      ${weekBars(list, ui.metric)}
    </section>
    <section class="card">
      ${seg('tab', [['balance', 'Muscle balance'], ['fatigue', 'Fatigue'], ['strength', 'Strength']], ui.tab)}
      ${ui.tab === 'balance' ? balance(list) : ui.tab === 'fatigue' ? fatigue(list) : strength(list)}
    </section>
    <section class="card">
      <div class="card-title">Weekly muscle volume</div>
      ${plannedVolume(list)}
    </section>`;

  root.onclick = (ev) => {
    const b = ev.target.closest('[data-seg],[data-act]');
    if (!b) return;
    if (b.dataset.seg) {
      ui[b.dataset.seg] = b.dataset.val;
      if (b.dataset.seg === 'period') ui.weekOff = 0;
    }
    if (b.dataset.act === 'wprev') ui.weekOff -= 1;
    if (b.dataset.act === 'wnext' && ui.weekOff < 0) ui.weekOff += 1;
    renderStats(root);
  };
}

// GitHub-style grid of the last 26 weeks, coloured by minutes trained.
function heatmap(list) {
  const weeks = 26, c = 11, g = 3, step = c + g, top = 16;
  const end = sow(new Date());
  const start = addDays(end, -7 * (weeks - 1));
  const today = sod(new Date());
  const mins = {};
  list.forEach((w) => { const k = dkey(w.start); mins[k] = (mins[k] || 0) + w.dur / 60; });
  let s = `<svg viewBox="0 0 ${weeks * step - g} ${top + 7 * step - g}" class="heat" role="img" aria-label="Activity over the last 26 weeks">`;
  let lastMonth = -1, lastLabel = -9;
  for (let col = 0; col < weeks; col++) {
    const colStart = addDays(start, col * 7);
    if (colStart.getMonth() !== lastMonth) {
      if (col - lastLabel >= 3 && col < weeks - 1) { s += `<text x="${col * step}" y="10" class="h-label">${MON[colStart.getMonth()]}</text>`; lastLabel = col; }
      lastMonth = colStart.getMonth();
    }
    for (let r = 0; r < 7; r++) {
      const d = addDays(colStart, r);
      if (d > today) continue;
      const m = mins[dkey(d)] || 0;
      const lv = m === 0 ? 0 : m < 45 ? 1 : m < 75 ? 2 : m < 100 ? 3 : 4;
      s += `<rect x="${col * step}" y="${top + r * step}" width="${c}" height="${c}" rx="2.5" class="lv${lv}${+d === +today ? ' h-today' : ''}"/>`;
    }
  }
  return `${s}</svg>
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
  const n = 12, W = 340, H = 190, L = 34, B = 34, T = 22;
  const end = sow(new Date());
  const starts = Array.from({ length: n }, (_, i) => addDays(end, -7 * (n - 1 - i)));
  const val = (w) => (metric === 'n' ? 1 : metric === 'dur' ? w.dur / 3600 : metric === 'vol' ? w.vol || 0 : w.reps || 0);
  const vals = starts.map((st) => inRange(list, st, addDays(st, 7)).reduce((a, w) => a + val(w), 0));
  const max = niceMax(Math.max(...vals), metric);
  const ph = H - B - T, bw = (W - L) / n, barW = Math.min(16, bw * 0.5);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="bars" role="img" aria-label="Weekly chart">`;
  [0, 0.5, 1].forEach((f) => {
    const y = T + ph * (1 - f);
    s += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" class="axis">${fmtMetric(max * f, metric)}</text>`;
  });
  const hi = vals[n - 1] > 0 ? n - 1 : vals.indexOf(Math.max(...vals));
  vals.forEach((v, i) => {
    const x = L + bw * i + (bw - barW) / 2;
    const h = v > 0 ? Math.max(barW, (v / max) * ph) : 0;
    if (h) s += `<rect x="${x}" y="${T + ph - h}" width="${barW}" height="${h}" rx="${barW / 2}" class="${i === n - 1 ? 'bar cur' : 'bar'}"/>`;
    if (i === hi && v > 0) s += `<text x="${x + barW / 2}" y="${T + ph - h - 6}" text-anchor="middle" class="val">${fmtMetric(v, metric)}</text>`;
    s += `<text x="${x + barW / 2}" y="${H - 18}" text-anchor="middle" class="axis">${starts[i].getDate()}</text>
          <text x="${x + barW / 2}" y="${H - 6}" text-anchor="middle" class="axis sm">${MON[starts[i].getMonth()].toUpperCase()}</text>`;
  });
  return `${s}</svg>`;
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
  if (Math.abs(d) < 1e-9) return '<small class="delta">same as before</small>';
  return `<small class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '↑' : '↓'} ${f(Math.abs(d))}</small>`;
}

function balance(list) {
  const now = new Date();
  let from, to, pFrom, pTo, label = '';
  if (ui.period === 'week') {
    from = addDays(sow(now), 7 * ui.weekOff); to = addDays(from, 7);
    pFrom = addDays(from, -7); pTo = from;
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
    <div class="legend center"><i class="dot cur"></i>Current${prev ? '<i class="dot prev"></i>Previous' : ''}</div>
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

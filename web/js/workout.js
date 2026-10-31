// Today, the live workout, the Plan tab and session previews.
import { state, save, plan, info, nextSession, monthOf, lastSet, bestE1rm, workouts } from './store.js';
import {
  esc, ICON, clock, dur, kg, num, firstInt, isHold, roundDown, fmt1, sheet, unlockAudio,
  dateStr, sameDay, daysBetween,
} from './util.js';
import { startTimer, clearTimer } from './timer.js';
import { weekStrip, openWorkout } from './stats.js';
import { openSettings, sampleBanner } from './settings.js';

const KIND = { deload: 'Deload', test: 'Test week', final: 'Final assessment', flex: 'Flex week' };
const rerender = () => window.dispatchEvent(new Event('rerender'));
const kindBadge = (k) => (KIND[k] ? `<span class="badge ${k}">${KIND[k]}</span>` : '');
const tagCls = (x) => (x.slot === 'M' ? 'm' : x.slot === 'X' ? 'x' : '');
const restLabel = (sec) => (sec < 60 ? `${sec}s` : clock(sec));

// ------------------------------------------------------------------ Today
export function renderToday(root) {
  if (state.active && plan.byId[state.active.sid]) return renderWorkout(root);
  const now = new Date();
  const next = nextSession();
  const todays = state.workouts.filter((w) => sameDay(w.start, now));
  const last = workouts().at(-1);

  root.innerHTML = `
    <header class="top">
      <div class="grow"><div class="eyebrow">${dateStr(now)}</div><h1>Today</h1></div>
      <button class="icon-btn" data-act="settings" aria-label="Settings">${ICON.sliders}</button>
    </header>
    ${sampleBanner()}
    ${installBanner()}
    ${weekStrip()}
    ${todays.map(doneCard).join('')}
    ${next ? hero(next, todays.length > 0, last) + previewList(next) : planDoneCard()}`;

  root.onclick = (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'settings') openSettings();
    if (act === 'start') startSession(next.id);
    if (act === 'skip') skipSession(next.id);
    if (act === 'hide-install') { state.hideInstall = true; save(); rerender(); }
    if (act === 'open-workout') openWorkout(b.dataset.wid);
  };
}

function hero(s, doneToday, last) {
  const m = monthOf(s);
  let hint = '';
  if (doneToday) hint = 'You already trained today. The next session is best tomorrow or later.';
  else if (last && daysBetween(last.start, new Date()) === 1) hint = 'You trained yesterday. A rest day between sessions is ideal, but go for it if you feel fresh.';
  return `
    <section class="card hero">
      <div class="hero-top"><span class="pill">Month ${s.month} · ${esc(m.title)}</span>${kindBadge(s.kind)}</div>
      <div class="hero-title">${doneToday ? '<span class="muted">Next up · </span>' : ''}${esc(s.title)}</div>
      <div class="hero-sub">${esc(s.dayName)}</div>
      <div class="chips"><span>≈ ${dur(s.est * 60)}</span><span>${s.ex.length} exercises</span><span>30 min cardio</span></div>
      ${hint ? `<p class="hint">${hint}</p>` : ''}
      <button class="btn primary big" data-act="start">${ICON.play}<span>Start workout</span></button>
      <button class="link center" data-act="skip">Skip this session</button>
    </section>`;
}

function previewList(s) {
  return `
    <section class="card">
      <div class="card-title">What's in it</div>
      ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
      <ol class="preview">
        <li><span class="tag c">C</span><div><b>Cardio · 30 min</b><small>${esc(s.cardio)}</small></div></li>
        ${s.ex.map((x) => `<li><span class="tag ${tagCls(x)}">${x.label}</span><div><b>${esc(info(x).name)}${x.spec ? ' <span class="star">★</span>' : ''}</b><small>${esc(x.rx)} · rest ${restLabel(x.rest)}</small></div></li>`).join('')}
      </ol>
    </section>`;
}

function doneCard(w) {
  return `
    <button class="card done-card" data-act="open-workout" data-wid="${w.id}">
      <div class="done-icon">${ICON.check}</div>
      <div class="grow"><b>Done today · ${esc(w.title)}</b><small>${dur(w.dur)} · ${w.ex.length} exercises${w.vol ? ` · ${kg(w.vol)} kg` : ''}</small></div>
      ${ICON.chevR}
    </button>`;
}

function planDoneCard() {
  return `<section class="card hero"><div class="hero-title">Plan complete</div>
    <p class="hint">All 52 weeks are done. Check your stats, then start Year 2 from Month 4 with new numbers (Settings → Start at week 14).</p></section>`;
}

function installBanner() {
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (standalone || state.hideInstall || !/iPhone|iPad|iPod/.test(navigator.userAgent)) return '';
  return `<section class="card install">
      <div>${ICON.share}</div>
      <p>Install the app: tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>
      <button class="icon-btn sm" data-act="hide-install" aria-label="Dismiss">${ICON.x}</button>
    </section>`;
}

export function startSession(id) {
  const s = plan.byId[id];
  if (!s) return;
  if (state.active && state.active.sid !== id) {
    if (!confirm('Another workout is in progress. Replace it?')) return;
    state.active = null;
  }
  if (!state.active) {
    state.active = { sid: id, start: Date.now(), log: s.ex.map((x) => x.sets.map(() => ({ w: '' }))) };
    save();
  }
  unlockAudio();
  if (location.hash !== '#/today') location.hash = '#/today';
  else rerender();
  window.scrollTo(0, 0);
}

function skipSession(id) {
  const s = plan.byId[id];
  if (!confirm(`Skip ${s.title}? It won't count as a workout.`)) return;
  state.status[id] = 'skipped';
  save();
  rerender();
}

// ------------------------------------------------------------------ Live workout
// Compact list: tap an exercise to open it and (optionally) log weights,
// tap ⏱ for a rest timer, and Finish marks the whole session done.
function renderWorkout(root) {
  const a = state.active;
  const s = plan.byId[a.sid];
  const m = monthOf(s);

  let rows = cardioRow(s);
  s.ex.forEach((x, i) => {
    const first = x.group && s.ex.findIndex((y) => y.group === x.group) === i;
    const lastInGroup = x.group && s.ex.findLastIndex((y) => y.group === x.group) === i;
    if (first) rows += `<div class="ssgroup"><div class="sslabel">Superset · rest after both</div>`;
    rows += exRow(x, i);
    if (lastInGroup) rows += '</div>';
  });

  root.innerHTML = `
    <header class="top sticky">
      <div class="grow"><div class="eyebrow">${esc(s.title)} · Month ${s.month}</div><h1 class="h2 one-line">${esc(s.dayName)}</h1></div>
      <div class="elapsed" id="elapsed">${clock((Date.now() - a.start) / 1000)}</div>
    </header>
    ${s.note ? `<p class="note">${kindBadge(s.kind)} ${esc(s.note)}</p>` : ''}
    ${s.technique && !s.technique.startsWith('None') ? `<details class="note"><summary>This month: ${esc(m.title)}</summary>${esc(s.technique)}</details>` : ''}
    <p class="tip">Tap an exercise to log weights (optional). Tap ${ICON.timer} for the rest timer.</p>
    ${rows}
    <button class="btn primary big" data-act="finish">${ICON.check}<span>Finish workout</span></button>
    <button class="btn ghost" data-act="discard">Discard workout</button>`;

  root.onclick = (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const row = b.closest('.xrow');
    if (act === 'rest') {
      unlockAudio();
      startTimer(+b.dataset.sec, b.dataset.label);
    } else if (act === 'toggle') toggleRow(root, row);
    else if (act === 'collapse') collapseRow(row);
    else if (act === 'finish') finishSheet(root, s);
    else if (act === 'discard') {
      if (!confirm('Discard this workout? Nothing will be saved.')) return;
      state.active = null;
      clearTimer();
      save();
      rerender();
    }
  };

  root.oninput = (ev) => {
    const inp = ev.target.closest('.in');
    if (!inp) return;
    const i = +inp.closest('.xrow').dataset.ex, k = +inp.dataset.k;
    a.log[i][k].w = inp.value;
    save();
    // A typed weight becomes the suggestion for the sets below it.
    inp.closest('.xbody').querySelectorAll('.in').forEach((el) => {
      if (+el.dataset.k > k) el.placeholder = inp.value || el.dataset.ph;
    });
  };

  // Keyboard "next"/"done": jump to the next set, or close the exercise.
  root.onkeydown = (ev) => {
    const inp = ev.target.closest('.in');
    if (!inp || ev.key !== 'Enter') return;
    ev.preventDefault();
    const next = inp.closest('.xbody').querySelector(`.in[data-k="${+inp.dataset.k + 1}"]`);
    if (next) next.focus();
    else collapseRow(inp.closest('.xrow'));
  };
}

function cardioRow(s) {
  return `
    <div class="xrow" data-ex="cardio">
      <div class="xhead" data-act="toggle">
        <span class="tag c">C</span>
        <div class="grow"><div class="xname">Cardio · 30 min</div><div class="xrx">Before you lift · tap for details</div></div>
        <button class="tbtn" data-act="rest" data-sec="1800" data-label="Cardio" aria-label="Start 30 minute cardio timer">${ICON.timer}<span>30:00</span></button>
      </div>
      <div class="xbody" hidden>
        <p class="cue">${esc(s.cardio)}</p>
        <button class="btn sm done-btn" data-act="collapse">Done</button>
      </div>
    </div>`;
}

function exRow(x, i) {
  const inf = info(x);
  const log = state.active.log[i];
  const last = lastSet(inf.name);
  const pct = x.sets.find((t) => t.pct)?.pct;
  const best = x.slot === 'M' && inf.lift !== 'pullup' ? bestE1rm(inf.lift) : null;
  const hint = x.slot === 'M' && pct && best ? `Suggested weights come from your e1RM of ${Math.round(best)} kg.`
    : inf.lift === 'pullup' ? 'Log added weight only.' : '';

  const sets = x.sets.map((t, k) => {
    let ph = t.pct && best ? String(roundDown(t.pct * best)) : last ? fmt1(last.w) : '';
    const prevTyped = log.slice(0, k).map((e) => e.w).filter((w) => w !== '').at(-1);
    const shown = prevTyped || ph;
    return `
      <div class="wrow">
        <span class="set-n">${k + 1}</span>
        <span class="set-t"><b>${esc(t.reps)}${t.pct ? ` · ${Math.round(t.pct * 1000) / 10}%` : ''}</b><small>${esc(t.eff)}</small></span>
        <label class="kg"><input class="in" data-k="${k}" inputmode="decimal" autocomplete="off"
          enterkeyhint="${k === x.sets.length - 1 ? 'done' : 'next'}" placeholder="${esc(shown || '–')}" data-ph="${esc(ph || '–')}"
          value="${esc(log[k].w)}" aria-label="Set ${k + 1} weight in kg"><span>kg</span></label>
      </div>`;
  }).join('');

  return `
    <div class="xrow" data-ex="${i}">
      <div class="xhead" data-act="toggle">
        <span class="tag ${tagCls(x)}">${x.label}</span>
        <div class="grow">
          <div class="xname">${esc(inf.name)}${x.spec ? ' <span class="star">★</span>' : ''}</div>
          <div class="xrx">${esc(x.rx)}</div>
          <div class="xmeta">${metaHtml(log, last)}</div>
        </div>
        <button class="tbtn" data-act="rest" data-sec="${x.rest}" data-label="Rest · ${esc(inf.name)}" aria-label="Start ${x.rest} second rest timer">${ICON.timer}<span>${restLabel(x.rest)}</span></button>
      </div>
      <div class="xbody" hidden>
        ${sets}
        <p class="cue">${esc(inf.cue)}</p>
        ${hint ? `<p class="ex-hint">${esc(hint)}</p>` : ''}
        <button class="btn sm done-btn" data-act="collapse">Done</button>
      </div>
    </div>`;
}

function metaHtml(log, last) {
  const typed = log.map((e) => num(e.w)).filter((w) => w != null);
  const parts = [];
  if (typed.length) {
    const lo = Math.min(...typed), hi = Math.max(...typed);
    parts.push(`<span class="today-w">Today ${lo === hi ? fmt1(hi) : `${fmt1(lo)}-${fmt1(hi)}`} kg</span>`);
  }
  if (last) parts.push(`<span>Last ${fmt1(last.w)} kg</span>`);
  return parts.join('');
}

function toggleRow(root, row) {
  const wasOpen = row.classList.contains('open');
  root.querySelectorAll('.xrow.open').forEach(collapseRow);
  if (wasOpen) return;
  row.classList.add('open');
  row.querySelector('.xbody').hidden = false;
  const inputs = [...row.querySelectorAll('.in')];
  const target = inputs.find((el) => !el.value) || inputs[0];
  if (target) target.focus({ preventScroll: true });
  row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function collapseRow(row) {
  if (!row) return;
  row.classList.remove('open');
  row.querySelector('.xbody').hidden = true;
  if (row.contains(document.activeElement)) document.activeElement.blur();
  const i = row.dataset.ex;
  if (i !== 'cardio') {
    const x = plan.byId[state.active.sid].ex[+i];
    row.querySelector('.xmeta').innerHTML = metaHtml(state.active.log[+i], lastSet(info(x).name));
  }
}

export function updateElapsed() {
  const el = document.getElementById('elapsed');
  if (el && state.active) el.textContent = clock((Date.now() - state.active.start) / 1000);
}

// Every set counts as done. Typed weights carry down to the sets below them.
function summarize(s) {
  const a = state.active;
  let sets = 0, vol = 0, reps = 0, logged = 0;
  const ex = s.ex.map((x, i) => {
    const inf = info(x);
    let carry = null;
    const done = x.sets.map((t, k) => {
      const typed = num(a.log[i][k].w);
      if (typed != null) carry = typed;
      const w = typed ?? carry;
      const r = isHold(t.reps) ? null : firstInt(t.reps) || null;
      sets += 1;
      if (r) reps += r;
      if (w != null) logged += 1;
      if (w && r) vol += w * r;
      return { w, r };
    });
    return { n: inf.name, lift: inf.lift || null, m: inf.muscles, sets: done };
  });
  const durSec = Math.min(Math.round((Date.now() - a.start) / 1000), 4 * 3600);
  return { ex, sets, vol: Math.round(vol), reps, logged, dur: durSec };
}

const statBox = (label, value) => `<div class="stat"><span>${label}</span><b>${value}</b></div>`;

function finishSheet(root, s) {
  const sum = summarize(s);
  const sh = sheet(`
    <h3>Finish workout?</h3>
    <p class="muted">All ${s.ex.length} exercises and the 30 min cardio will be marked done.</p>
    <div class="stat-grid">
      ${statBox('Duration', dur(sum.dur))}${statBox('Exercises', s.ex.length)}
      ${statBox('Sets', sum.sets)}${statBox('Volume', sum.vol ? `${kg(sum.vol)} kg` : '–')}
    </div>
    <button class="btn primary big" data-act="save">${ICON.check}<span>Finish &amp; save</span></button>
    <button class="btn ghost" data-act="close">Keep going</button>`);
  sh.el.onclick = (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    sh.close();
    if (b.dataset.act === 'save') saveWorkout(root, s, sum);
  };
}

function saveWorkout(root, s, sum) {
  const a = state.active;
  const w = {
    id: Date.now().toString(36),
    sid: s.id, title: s.title, dayName: s.dayName, day: s.day, week: s.week, month: s.month, kind: s.kind,
    start: a.start, end: a.start + sum.dur * 1000, dur: sum.dur, cardio: true,
    ex: sum.ex, sets: sum.sets, vol: sum.vol, reps: sum.reps,
  };
  state.workouts.push(w);
  state.status[s.id] = 'done';
  state.active = null;
  save();
  clearTimer();
  const next = nextSession();
  root.innerHTML = `
    <section class="complete">
      <div class="big-check">${ICON.check}</div>
      <h1>Workout complete</h1>
      <p class="muted">${esc(s.title)} · ${esc(s.dayName)}</p>
      <div class="stat-grid">
        ${statBox('Duration', dur(w.dur))}${statBox('Exercises', s.ex.length)}
        ${statBox('Sets', w.sets)}${statBox('Volume', w.vol ? `${kg(w.vol)} kg` : '–')}
      </div>
      ${next ? `<p class="muted">Next up: <b>${esc(next.title)}</b> · ${esc(next.dayName)}</p>` : ''}
      <a class="btn primary big" href="#/stats">See your stats</a>
      <button class="btn ghost" data-act="home">Back to Today</button>
    </section>`;
  root.onclick = (ev) => { if (ev.target.closest('[data-act="home"]')) rerender(); };
  root.oninput = null;
  root.onkeydown = null;
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ Plan
const openMonths = new Set(); // remembered while the app is open

export function renderPlan(root) {
  const next = nextSession();
  const total = plan.sessions.length;
  const done = plan.sessions.filter((s) => state.status[s.id] === 'done').length;
  const handled = plan.sessions.filter((s) => state.status[s.id]).length;
  const cur = next ? next.month : 12;
  if (!openMonths.size) openMonths.add(cur);
  root.innerHTML = `
    <header class="top"><div class="grow"><div class="eyebrow">52 weeks · 3 sessions a week</div><h1>Plan</h1></div></header>
    <section class="card">
      <div class="row-between"><b>${next ? `Up next: ${esc(next.title)}` : 'Plan complete'}</b><span class="muted">${done} done</span></div>
      <div class="progress"><i style="width:${(handled / total) * 100}%"></i></div>
      <div class="legend-row"><span class="dchip mini done"></span>Done <span class="dchip mini skipped"></span>Skipped <span class="dchip mini next"></span>Next</div>
    </section>
    ${plan.months.map((m) => monthBlock(m, openMonths.has(m.n), next)).join('')}`;
  root.onclick = (ev) => {
    const b = ev.target.closest('[data-sid]');
    if (b) location.hash = `#/session/${b.dataset.sid}`;
  };
  root.querySelectorAll('details.month').forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) openMonths.add(+d.dataset.m); else openMonths.delete(+d.dataset.m);
  }));
}

function monthBlock(m, open, next) {
  const sess = plan.sessions.filter((s) => s.month === m.n);
  const weeks = [...new Set(sess.map((s) => s.week))];
  const doneN = sess.filter((s) => state.status[s.id] === 'done').length;
  return `
    <details class="card month" data-m="${m.n}" ${open ? 'open' : ''}>
      <summary>
        <div class="grow"><div class="eyebrow">Month ${m.n} · Weeks ${m.weeks[0]}-${m.weeks[1]}</div><div class="m-title">${esc(m.title)}</div></div>
        <span class="m-count">${doneN}/${sess.length}</span>${ICON.chevR}
      </summary>
      <p class="m-goal">${esc(m.goal)}</p>
      ${weeks.map((wk) => {
        const list = sess.filter((s) => s.week === wk);
        return `<div class="wk-row"><span class="wk-n">Week ${wk} ${kindBadge(list[0].kind)}</span><div class="wk-days">${list
          .map((s) => `<button class="dchip ${state.status[s.id] || ''} ${next && next.id === s.id ? 'next' : ''}" data-sid="${s.id}" aria-label="${esc(s.title)}">${s.day}</button>`)
          .join('')}</div></div>`;
      }).join('')}
    </details>`;
}

// ------------------------------------------------------------------ Session preview
export function renderSession(root, id) {
  const s = plan.byId[id];
  if (!s) { location.hash = '#/plan'; return; }
  const st = state.status[id];
  const logged = state.workouts.filter((w) => w.sid === id).at(-1);
  const isNext = nextSession()?.id === id;
  let status = '';
  if (st === 'done') status = `<div class="pill ok">${ICON.check} Done${logged ? ` · ${dateStr(logged.start)}` : ''}</div>`;
  else if (st === 'skipped') status = '<div class="pill">Skipped</div>';
  else if (isNext) status = '<div class="pill ok">Up next</div>';
  root.innerHTML = `
    <header class="top">
      <button class="icon-btn" data-act="back" aria-label="Back">${ICON.back}</button>
      <div class="grow"><div class="eyebrow">${esc(s.title)} · Month ${s.month}</div><h1 class="h2">${esc(s.dayName)}</h1></div>
    </header>
    <div class="row-wrap">${status}${kindBadge(s.kind)}<span class="pill">≈ ${dur(s.est * 60)}</span></div>
    ${previewList(s)}
    <button class="btn primary big" data-act="start">${ICON.play}<span>${st === 'done' ? 'Do it again' : 'Start this workout'}</span></button>
    ${st ? '<button class="btn ghost" data-act="reset">Mark as not done</button>' : '<button class="btn ghost" data-act="skip">Skip</button>'}`;
  root.onclick = (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'back') { if (history.length > 1) history.back(); else location.hash = '#/plan'; }
    if (act === 'start') startSession(id);
    if (act === 'skip') skipSession(id);
    if (act === 'reset') { delete state.status[id]; save(); rerender(); }
  };
}

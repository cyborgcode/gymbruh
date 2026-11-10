// Today, the live workout, the Plan tab and session previews.
import { state, save, plan, info, nextSession, monthOf, lastSet, bestE1rm, workouts } from './store.js';
import {
  esc, ICON, clock, dur, kg, num, firstInt, isHold, roundDown, fmt1, sheet, toast, unlockAudio,
  dateStr, sameDay, daysBetween,
} from './util.js';
import { startTimer, clearTimer } from './timer.js';
import { weekStrip, openWorkout } from './stats.js';
import { openSettings, sampleBanner } from './settings.js';

const KIND = { deload: 'Deload', test: 'Test week', final: 'Final assessment', flex: 'Flex week' };
const rerender = () => window.dispatchEvent(new Event('rerender'));
const kindBadge = (k) => (KIND[k] ? `<span class="badge ${k}">${KIND[k]}</span>` : '');
const tagCls = (x) => (x.slot === 'M' ? 'm' : x.slot === 'X' ? 'x' : x.light ? 'c' : '');
const restLabel = (sec) => (sec < 60 ? `${sec}s` : clock(sec));
const WARMUP = '5 min easy bike or rower, a few mobility drills, then ramp-up sets before each main lift.';

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
    ${introCard()}
    ${todays.map(doneCard).join('')}
    ${next ? hero(next, todays.length > 0, last) + previewList(next) : planDoneCard()}`;

  root.onclick = (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'settings') openSettings();
    if (act === 'intro-ok') { state.seenIntro = true; save(); rerender(); }
    if (act === 'terms') openTerms();
    if (act === 'start') startSession(next.id);
    if (act === 'skip') skipSession(next.id);
    if (act === 'hide-install') { state.hideInstall = true; save(); rerender(); }
    if (act === 'open-workout') openWorkout(b.dataset.wid);
  };
}

// What a session trains: its heavy focus and its light block.
function focusLines(s) {
  if (!s.focus) return '';
  return `<div class="focus">
      <div><span class="fl heavy">Heavy</span><span>${esc(s.focus)}</span></div>
      <div><span class="fl">Light</span><span>${esc(s.lightFocus)}</span></div>
    </div>`;
}

function hero(s, doneToday, last) {
  const m = monthOf(s);
  let hint = '';
  if (doneToday) hint = 'You already trained today. The next session is best tomorrow or later.';
  else if (last && daysBetween(last.start, new Date()) === 1) hint = 'You trained yesterday. A rest day between sessions is ideal, but go for it if you feel fresh.';
  return `
    <section class="card hero">
      <div class="hero-top"><span class="pill">Week ${s.week}</span><span class="pill">Month ${s.month} · ${esc(m.title)}</span>${kindBadge(s.kind)}</div>
      <div class="hero-title">${doneToday ? '<span class="muted">Next up · </span>' : ''}${esc(s.dayName)}</div>
      ${focusLines(s)}
      <div class="chips"><span>≈ ${dur(s.est * 60)}</span><span>${s.ex.length} exercises</span><span>10 min warm-up</span></div>
      ${hint ? `<p class="hint">${hint}</p>` : ''}
      ${doneToday
        ? `<button class="btn big" data-act="start">${ICON.play}<span>Start anyway</span></button>`
        : `<button class="btn primary big" data-act="start">${ICON.play}<span>Start workout</span></button>`}
      <button class="link center" data-act="skip">Skip this session</button>
    </section>`;
}

function introCard() {
  if (state.seenIntro || state.workouts.length) return '';
  return `
    <section class="card intro">
      <div class="card-title">How it works</div>
      <ol>
        <li><b>Start</b> today's workout. Warm up for about 10 minutes, then work down the list.</li>
        <li>Tap <b>${ICON.timer}</b> after each set: it starts your rest and ticks the set off. Tap an exercise to log a weight if you want to.</li>
        <li>Tap <b>Finish</b>. Everything is marked done and your stats update.</li>
      </ol>
      <div class="row"><button class="btn sm primary" data-act="intro-ok">Got it</button><button class="btn sm" data-act="terms">What do RIR &amp; % mean?</button></div>
    </section>`;
}

// Plain-language guide to the training terms used across the plan.
export function openTerms() {
  sheet(`
    <h3>Training terms</h3>
    <dl class="terms">
      <dt>RIR</dt><dd>Reps in reserve: how many more clean reps you could still do. <b>RIR 2</b> means stop with 2 left in the tank.</dd>
      <dt>RPE</dt><dd>Effort from 1 to 10. <b>RPE 8</b> is about 2 reps left (RPE = 10 − RIR).</dd>
      <dt>%</dt><dd>Share of your one-rep max. <b>≈ 65%</b> is only a guide: pick a weight that matches the RIR.</dd>
      <dt>e1RM</dt><dd>Your estimated one-rep max, worked out from the weights you log. It powers the suggested weights.</dd>
      <dt>Superset</dt><dd>Do one set of each exercise back to back, then rest.</dd>
      <dt>Light block</dt><dd>The last superset before abs. It works the muscles you train hard next session with a few easier sets (stop 2-3 reps early), so every muscle is trained twice a week.</dd>
      <dt>Top set · Back-off</dt><dd>One heavy set, then lighter sets for volume.</dd>
      <dt>Deload</dt><dd>A planned easy week so you recover and come back stronger.</dd>
      <dt>Ramp-up sets</dt><dd>Lighter sets before your working sets, for example 50% ×8 → 70% ×5 → 85% ×3 of today's weight.</dd>
    </dl>`);
}

// A session in blocks, in the order you do them.
const BLOCKS = {
  main: ['Main lifts', ''],
  acc: ['Accessories', ''],
  light: ['Light block', "next session's muscles, kept easy"],
  abs: ['Abs', ''],
};
const blockOf = (x) => (x.slot === 'M' ? 'main' : x.slot === 'X' ? 'abs' : x.light ? 'light' : 'acc');

function previewList(s) {
  const groups = [];
  for (const x of s.ex) {
    const key = blockOf(x);
    if (!groups.length || groups.at(-1).key !== key) groups.push({ key, ex: [] });
    groups.at(-1).ex.push(x);
  }
  const row = (x) => `<li><span class="tag ${tagCls(x)}">${x.label}</span><div><b>${esc(info(x).name)}${x.spec ? ' <span class="star">★</span>' : ''}</b><small>${esc(x.rx)} · rest ${restLabel(x.rest)}</small></div></li>`;
  return `
    <section class="card">
      <div class="card-title row-between"><span>What's in it for me</span><button class="link sm" data-act="terms">Terms</button></div>
      ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
      <div class="preview">
        <ol class="pv-list"><li><span class="tag c">W</span><div><b>Warm-up · 10 min</b><small>${WARMUP}</small></div></li></ol>
        ${groups.map((g) => `
        <div class="pv-head">${BLOCKS[g.key][0]}${BLOCKS[g.key][1] ? `<small>${BLOCKS[g.key][1]}</small>` : ''}</div>
        <ol class="pv-list">${g.ex.map(row).join('')}</ol>`).join('')}
      </div>
    </section>`;
}

function doneCard(w) {
  return `
    <button class="card done-card" data-act="open-workout" data-wid="${w.id}">
      <div class="done-icon">${ICON.check}</div>
      <div class="grow"><b>Done today · ${esc(w.dayName)}</b><small>${dur(w.dur)} · ${w.ex.length} exercises${w.vol ? ` · ${kg(w.vol)} kg` : ''}</small></div>
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
    state.active = {
      sid: id, start: Date.now(), log: s.ex.map((x) => x.sets.map(() => ({ w: '' }))), done: {},
      names: s.ex.map((x) => info(x).name),
    };
    save();
  }
  unlockAudio();
  if (location.hash !== '#/today') location.hash = '#/today';
  else rerender();
  window.scrollTo(0, 0);
}

function skipSession(id) {
  const s = plan.byId[id];
  state.status[id] = 'skipped';
  save();
  rerender();
  toast(`Skipped ${s.title}`, { undo: () => { delete state.status[id]; save(); rerender(); } });
}

// ------------------------------------------------------------------ Live workout
// Compact list: tap an exercise to open it and (optionally) log weights,
// tap ⏱ for a rest timer, and Finish marks the whole session done.
function renderWorkout(root) {
  const a = state.active;
  const s = plan.byId[a.sid];
  const m = monthOf(s);
  const changed = matchPlan(a, s);
  a.log = s.ex.map((x, i) => x.sets.map((_, k) => (a.log && a.log[i] && a.log[i][k]) || { w: '' }));
  a.done = a.done || {};
  if (changed) save();
  const hoursOpen = (Date.now() - a.start) / 3.6e6;
  // Keep the card you had open (e.g. after a look at your stats).
  const openKey = openMemo && openMemo.id === a.start ? openMemo.key : null;

  let rows = '';
  s.ex.forEach((x, i) => {
    const members = x.group ? s.ex.filter((y) => y.group === x.group) : null;
    if (members && members[0] === x) rows += supersetHead(s, members);
    rows += exRow(x, i, openKey === String(i));
    if (members && members.at(-1) === x) rows += '</div>';
  });
  const showTip = state.workouts.length < 2 && !state.hideTip;

  root.innerHTML = `
    <header class="top sticky wk-head">
      <div class="grow"><div class="eyebrow">Week ${s.week} · Month ${s.month}</div><h1 class="h2 clamp2">${esc(s.dayName)}</h1></div>
      <div class="wk-side">
        <div class="elapsed" id="elapsed">${clock((Date.now() - a.start) / 1000)}</div>
        <small class="wk-count"></small>
        <button class="btn sm primary wk-finish" data-act="finish">${ICON.check}<span>Finish</span></button>
      </div>
      <div class="wk-bar" aria-hidden="true"><i></i></div>
    </header>
    ${hoursOpen >= 5 ? `<div class="stale"><p>This workout was started ${Math.floor(hoursOpen)} hours ago. Finished it?</p>
      <div class="row"><button class="btn sm primary" data-act="finish">Finish it</button><button class="btn sm" data-act="discard">Discard</button></div></div>` : ''}
    ${s.note ? `<p class="note">${kindBadge(s.kind)} ${esc(s.note)}</p>` : ''}
    ${s.technique && !s.technique.startsWith('None') ? `<details class="note"><summary>This month: ${esc(m.title)}</summary>${esc(s.technique)}</details>` : ''}
    <details class="note warm"><summary>Warm-up · 10 min</summary>${WARMUP} <button class="link sm" data-act="terms">What are ramp-up sets?</button></details>
    ${showTip ? `<div class="tip"><p>Tap ${ICON.timer} after each set: it starts your rest and ticks the set off. Tap a card to log a weight (optional).
      <button class="link sm" data-act="terms">What do RIR &amp; % mean?</button></p>
      <button class="icon-btn sm" data-act="hide-tip" aria-label="Hide tip">${ICON.x}</button></div>` : ''}
    ${rows}
    <button class="btn primary big" data-act="finish">${ICON.check}<span>Finish workout</span></button>
    <button class="btn ghost" data-act="discard">Discard workout</button>`;
  paint(root, s);

  root.onclick = (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const row = b.closest('.xrow');
    if (act === 'rest') {
      unlockAudio();
      startTimer(+b.dataset.sec, tickOff(root, s, b.dataset.keys.split(',').map(Number)));
    } else if (act === 'sets') setDone(root, s, row, b.dataset.d);
    else if (act === 'hide-tip') { state.hideTip = true; save(); b.closest('.tip').remove(); }
    else if (act === 'toggle') toggleRow(root, row);
    else if (act === 'collapse') collapseRow(row);
    else if (act === 'step') stepWeight(s, row, b.dataset.k, +b.dataset.d);
    else if (act === 'use') writeWeight(s, row, 'all', fmtW(+b.dataset.w), null);
    else if (act === 'per' || act === 'same') switchMode(s, row, act === 'per');
    else if (act === 'finish') finishSheet(root, s);
    else if (act === 'terms') openTerms();
    else if (act === 'discard') {
      const kept = state.active;
      state.active = null;
      clearTimer();
      save();
      rerender();
      toast('Workout discarded', { undo: () => { state.active = kept; save(); rerender(); } });
    }
  };

  root.oninput = (ev) => {
    const inp = ev.target.closest('.in');
    if (!inp) return;
    // Digits and one decimal separator only, up to 999 kg.
    let v = inp.value.replace(/[^\d.,]/g, '').replace(/([.,]\d*)[.,]/g, '$1').slice(0, 5);
    if (num(v) > 999) v = '999';
    if (v !== inp.value) inp.value = v;
    writeWeight(s, inp.closest('.xrow'), inp.dataset.k, v, inp);
  };

  // Keyboard "next"/"done": jump to the next set's box, or close the keyboard.
  root.onkeydown = (ev) => {
    const inp = ev.target.closest('.in');
    if (!inp || ev.key !== 'Enter') return;
    ev.preventDefault();
    const next = inp.dataset.k === 'all' ? null : inp.closest('.xbody').querySelector(`.in[data-k="${+inp.dataset.k + 1}"]`);
    if (next) next.focus();
    else inp.blur();
  };
}

// An app update can change a session while a workout is in progress. Weights
// and ticks are stored by position, so re-pair them with their exercise by
// name. (Workouts started before names were stored: keep them only if the
// shape still fits.) Returns true when something changed.
function matchPlan(a, s) {
  const names = s.ex.map((x) => info(x).name);
  if (a.names && a.names.join('|') === names.join('|')) return false;
  if (!a.names) {
    const fits = Array.isArray(a.log) && a.log.length === s.ex.length && s.ex.every((x, i) => a.log[i]?.length === x.sets.length);
    if (!fits) { a.log = null; a.done = {}; a.per = {}; }
  } else {
    const from = names.map((n) => a.names.indexOf(n));
    const old = { log: a.log || [], done: a.done || {}, per: a.per || {} };
    a.log = from.map((j) => (j >= 0 ? old.log[j] : null));
    a.done = {};
    a.per = {};
    from.forEach((j, i) => {
      if (j < 0) return;
      if (old.done[j] != null) a.done[i] = old.done[j];
      if (old.per[j] != null) a.per[i] = old.per[j];
    });
  }
  a.names = names;
  return true;
}

// ---- exercise cards: what it trains, glanceable chips, a round timer.
// Tapping ⏱ after a set starts the rest and ticks the set off (the dots).
// Only the card that's up next gets a filled timer, so the eye goes there.
const dots = (n) => `<span class="tdots">${'<i></i>'.repeat(n)}</span>`;
const stateTags = '<span class="xnext">Up next</span><span class="xdone">✓ Done</span>';

function timerButton(sec, keys, n) {
  return `<button class="tround" data-act="rest" data-sec="${sec}" data-keys="${keys}" aria-label="Start ${restLabel(sec)} timer">
    <span class="tround-ic">${ICON.timer}</span><small>${restLabel(sec)}</small>${dots(n)}</button>`;
}

function chips(rx) {
  const [main, ...rest] = rx.split(' · ');
  return `<b class="xc main">${esc(main.replace(/×/g, ' × '))}</b>${rest.map((c) => `<span class="xc">${esc(c)}</span>`).join('')}`;
}

function supersetHead(s, members) {
  const rounds = Math.max(...members.map((y) => y.sets.length));
  const idx = members.map((y) => s.ex.indexOf(y));
  const kind = blockOf(members[0]);
  const title = kind === 'light' ? 'Light block' : kind === 'abs' ? 'Abs' : 'Superset';
  const sub = kind === 'light' ? "Next session's muscles, kept easy" : 'One set of each, then rest';
  return `
    <div class="ssgroup ${kind}" data-members="${idx.join(',')}">
      <div class="ss-head">
        <div class="grow"><div class="ss-title">${title} · ${rounds} rounds ${stateTags}</div><small>${sub}</small></div>
        ${timerButton(members[0].rest, idx.join(','), rounds)}
      </div>`;
}

// "Sets done" inside an opened card, to fix a mis-tap. Finish still marks
// everything done, so this is only for your own overview.
function setsCtl(n) {
  if (n === 1) return '<div class="sets-done"><span>Done?</span><button class="chip sd-toggle" data-act="sets" data-d="t"></button></div>';
  return `<div class="sets-done"><span>Sets done</span><div class="sd-ctl">
    <button class="stp" data-act="sets" data-d="-1" aria-label="One set fewer">−</button><b class="sd-val"></b>
    <button class="stp" data-act="sets" data-d="1" aria-label="One more set">+</button></div></div>`;
}

// ---- progress: every exercise, counted by its sets
function progress(s) {
  const a = state.active;
  const list = s.ex.map((x, i) => ({ key: String(i), n: x.sets.length }));
  list.forEach((b) => { b.d = Math.min(b.n, a.done[b.key] || 0); });
  const next = list.find((b) => b.d < b.n) || null;
  return {
    list, next,
    full: list.filter((b) => b.d >= b.n).length,
    frac: list.reduce((t, b) => t + b.d / b.n, 0) / list.length,
  };
}

const fillDots = (el, d) => el && el.querySelectorAll('i').forEach((dot, k) => dot.classList.toggle('on', k < d));

// Update ticks, "Up next", the header count and bar in place (no re-render,
// so an open card or a weight you're typing is never disturbed).
function paint(root, s) {
  const p = progress(s);
  root.querySelectorAll('.next').forEach((el) => el.classList.remove('next'));
  for (const b of p.list) {
    const row = root.querySelector(`.xrow[data-ex="${b.key}"]`);
    if (!row) continue;
    row.classList.toggle('done', b.d >= b.n);
    fillDots(row.querySelector(':scope > .xhead .tdots'), b.d);
    const val = row.querySelector('.sd-val');
    if (val) {
      val.textContent = `${b.d} of ${b.n}`;
      row.querySelector('[data-d="-1"]').disabled = b.d <= 0;
      row.querySelector('[data-d="1"]').disabled = b.d >= b.n;
    }
    const tog = row.querySelector('.sd-toggle');
    if (tog) {
      tog.classList.toggle('on', b.d >= 1);
      tog.textContent = b.d >= 1 ? '✓ Done' : 'Mark as done';
    }
  }
  root.querySelectorAll('.ssgroup').forEach((g) => {
    const members = g.dataset.members.split(',').map((k) => p.list.find((b) => b.key === k));
    g.classList.toggle('done', members.every((b) => b.d >= b.n));
    fillDots(g.querySelector('.ss-head .tdots'), Math.max(...members.map((b) => b.d)));
  });
  if (p.next) {
    const row = root.querySelector(`.xrow[data-ex="${p.next.key}"]`);
    (row.closest('.ssgroup') || row).classList.add('next');
  }
  const head = root.querySelector('.wk-head');
  head.classList.toggle('all', !p.next);
  head.querySelector('.wk-count').textContent = `${p.full} of ${p.list.length} done`;
  head.querySelector('.wk-bar i').style.width = `${(p.frac * 100).toFixed(1)}%`;
  return p;
}

// ⏱ on an exercise (or a superset: all its members) = one more set done.
// Returns the timer label, e.g. "Rest · set 2/3 · Bench Press".
function tickOff(root, s, idx) {
  const a = state.active;
  const before = progress(s).next?.key;
  idx.forEach((i) => { a.done[i] = Math.min(s.ex[i].sets.length, (a.done[i] || 0) + 1); });
  save();
  const p = paint(root, s);
  // Finished the one you were on: bring the next card into view (behind the timer).
  if (p.next && p.next.key !== before) glideTo(root, p.next.key);
  if (idx.length > 1) {
    const rounds = Math.max(...idx.map((i) => s.ex[i].sets.length));
    return `Rest · round ${Math.max(...idx.map((i) => a.done[i]))}/${rounds} · Superset ${idx.map((i) => s.ex[i].label).join(' + ')}`;
  }
  const i = idx[0];
  return `Rest · set ${a.done[i]}/${s.ex[i].sets.length} · ${info(s.ex[i]).name}`;
}

function setDone(root, s, row, d) {
  const a = state.active, key = row.dataset.ex;
  const n = s.ex[+key].sets.length;
  const cur = Math.min(n, a.done[key] || 0);
  a.done[key] = d === 't' ? (cur ? 0 : 1) : Math.max(0, Math.min(n, cur + +d));
  save();
  paint(root, s);
}

// Scroll a card just under the header, unless it's already fully in view or
// you're busy with an open card.
function glideTo(root, key) {
  if (root.querySelector('.xrow.open') || document.activeElement?.matches('input')) return;
  const row = root.querySelector(`.xrow[data-ex="${key}"]`);
  if (!row) return;
  const el = row.closest('.ssgroup') || row;
  const top = root.querySelector('.wk-head').getBoundingClientRect().bottom;
  const bottom = innerHeight - (document.getElementById('tabbar')?.offsetHeight || 0);
  const r = el.getBoundingClientRect();
  if (r.top >= top + 4 && r.bottom <= bottom - 4) return;
  window.scrollTo({ top: Math.max(0, scrollY + r.top - top - 10), behavior: 'smooth' });
}

const STEP = 2.5;
const fmtW = (v) => fmt1(Math.round(v * 10) / 10);

// Per-set mode: on when the sets have different targets (top set + back-offs)
// or different weights were logged; otherwise one weight covers all sets.
function perMode(x, i) {
  const a = state.active;
  if (a.per && a.per[i] != null) return a.per[i];
  const pcts = new Set(x.sets.map((t) => t.pct ?? 0));
  const typed = new Set(a.log[i].map((e) => e.w).filter((w) => w !== ''));
  return pcts.size > 1 || typed.size > 1;
}

function suggestions(x, inf) {
  const last = lastSet(inf.name);
  const best = x.slot === 'M' && inf.lift !== 'pullup' ? bestE1rm(inf.lift) : null;
  return { last: last ? last.w : null, best, perSet: x.sets.map((t) => (t.pct && best ? roundDown(t.pct * best) : null)) };
}

function stepper(k, value, ph, small, label) {
  return `
    <div class="stepper ${small ? 'sm' : ''}">
      <button class="stp" data-act="step" data-k="${k}" data-d="-${STEP}" aria-label="Minus ${STEP} kg">−</button>
      <label class="kgbox"><input class="in" data-k="${k}" inputmode="decimal" autocomplete="off" enterkeyhint="done"
        placeholder="${esc(ph || '–')}" value="${esc(value)}" aria-label="${esc(label)}">${small ? '' : '<span>kg</span>'}</label>
      <button class="stp" data-act="step" data-k="${k}" data-d="${STEP}" aria-label="Plus ${STEP} kg">+</button>
    </div>`;
}

// Grey numbers are suggestions only; white numbers are what gets saved.
function weightLogger(x, i, inf) {
  const log = state.active.log[i];
  const sg = suggestions(x, inf);
  const n = x.sets.length;
  const added = inf.lift === 'pullup' ? ' · added weight' : '';
  if (perMode(x, i)) {
    const rows = x.sets.map((t, k) => {
      const ph = sg.perSet[k] != null ? fmtW(sg.perSet[k]) : sg.last != null ? fmtW(sg.last) : '';
      return `
        <div class="wrow">
          <span class="set-n">${k + 1}</span>
          <span class="set-t"><b>${esc(t.reps)}${t.pct ? ` · ${Math.round(t.pct * 1000) / 10}%` : ''}</b><small>${esc(t.eff)}</small></span>
          ${stepper(k, log[k].w, ph, true, `Set ${k + 1} weight in kg`)}
        </div>`;
    }).join('');
    return `
      <div class="wlog">
        <div class="wl-head"><span>Weight per set <small>kg${added}</small></span>${n > 1 ? '<button class="link sm" data-act="same">Same for all</button>' : ''}</div>
        ${rows}
        ${sg.best ? `<p class="ex-hint">Grey numbers are suggestions from your e1RM of ${Math.round(sg.best)} kg. Tap − or + to use one.</p>` : ''}
      </div>`;
  }
  const sugg = sg.perSet.find((v) => v != null);
  const ph = sugg != null ? fmtW(sugg) : sg.last != null ? fmtW(sg.last) : '';
  const chips = [];
  if (sg.last != null) chips.push(`<button class="chip" data-act="use" data-w="${sg.last}">Last ${fmtW(sg.last)} kg</button>`);
  if (sugg != null && sugg !== sg.last) chips.push(`<button class="chip" data-act="use" data-w="${sugg}">Suggested ${fmtW(sugg)} kg</button>`);
  return `
    <div class="wlog">
      <div class="wl-head"><span>Weight <small>${n > 1 ? `same for all ${n} sets` : 'kg'}${added}</small></span></div>
      ${stepper('all', log[0].w, ph, false, 'Weight in kg for all sets')}
      ${chips.length ? `<div class="chips-row">${chips.join('')}</div>` : ''}
      ${n > 1 ? '<button class="link sm" data-act="per">Different weight per set</button>' : ''}
    </div>`;
}

function exRow(x, i, open = false) {
  const inf = info(x);
  const log = state.active.log[i];
  const primary = Object.entries(inf.muscles).find(([, f]) => f === 1)?.[0] || '';
  const eyebrow = x.slot === 'M' ? `Main lift · ${primary}` : x.slot === 'X' ? 'Abs' : primary;
  return `
    <div class="xrow ${open ? 'open' : ''}" data-ex="${i}">
      <div class="xhead" data-act="toggle">
        <div class="grow">
          <div class="xeyebrow"><span class="xtag ${tagCls(x)}">${x.label}</span>${esc(eyebrow)}${x.spec ? ' <span class="star">★ V-taper</span>' : ''}${x.group ? '' : ` ${stateTags}`}</div>
          <div class="xname">${esc(inf.name)}</div>
          <div class="xchips">${chips(x.rx)}<span class="xmeta">${metaHtml(log, lastSet(inf.name))}</span></div>
        </div>
        ${x.group ? `<span class="tround solo">${dots(x.sets.length)}</span>` : timerButton(x.rest, i, x.sets.length)}
      </div>
      <div class="xbody" ${open ? '' : 'hidden'}>
        ${inf.bw ? '<p class="bw-note">Bodyweight exercise, nothing to log.</p>' : weightLogger(x, i, inf)}
        <p class="cue">${esc(inf.cue)} <button class="link sm" data-act="terms">What do RIR &amp; % mean?</button></p>
        ${setsCtl(x.sets.length)}
        <button class="btn sm close-btn" data-act="collapse">Close</button>
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

// Save a weight. 'all' sets every set; a single set also fills the empty
// (or auto-filled) sets below it, so what you see in white is what's saved.
function writeWeight(s, row, k, v, src) {
  const i = +row.dataset.ex, log = state.active.log[i], sets = s.ex[i].sets;
  if (k === 'all') log.forEach((e) => { e.w = v; e.auto = false; });
  else {
    const kk = +k;
    log[kk].w = v;
    log[kk].auto = false;
    // Only copy down into sets with the same target (never top set -> back-offs).
    for (let j = kk + 1; j < log.length; j++) {
      if ((sets[j].pct ?? 0) !== (sets[kk].pct ?? 0)) break;
      if (log[j].w !== '' && !log[j].auto) break;
      log[j].w = v;
      log[j].auto = v !== '';
    }
  }
  save();
  row.querySelectorAll('.in').forEach((el) => {
    if (el === src) return;
    el.value = el.dataset.k === 'all' ? log[0].w : log[+el.dataset.k].w;
  });
  row.querySelector('.xmeta').innerHTML = metaHtml(log, lastSet(info(s.ex[i]).name));
}

// − / +: the first tap on an empty box takes the suggestion, then steps 2.5 kg.
function stepWeight(s, row, k, d) {
  const log = state.active.log[+row.dataset.ex];
  const inp = row.querySelector(`.in[data-k="${k}"]`);
  const cur = num(k === 'all' ? log[0].w : log[+k].w);
  const base = num(inp.placeholder);
  const v = cur == null ? (base ?? Math.max(0, d)) : Math.max(0, Math.min(999, cur + d));
  writeWeight(s, row, k, fmtW(v), null);
}

function switchMode(s, row, per) {
  const i = +row.dataset.ex, log = state.active.log[i];
  state.active.per = { ...(state.active.per || {}), [i]: per };
  if (!per) {
    const first = log.find((e) => e.w !== '')?.w || '';
    log.forEach((e) => { e.w = first; e.auto = false; });
  }
  save();
  row.outerHTML = exRow(s.ex[i], i, true);
  paint(document.getElementById('view'), s);
}

let openMemo = null; // { id: workout start, key: card } — the card you have open

function toggleRow(root, row) {
  const wasOpen = row.classList.contains('open');
  root.querySelectorAll('.xrow.open').forEach(collapseRow);
  if (wasOpen) return;
  openMemo = { id: state.active.start, key: row.dataset.ex };
  row.classList.add('open');
  row.querySelector('.xbody').hidden = false;
  // No auto-focus: − / + and the chips need no keyboard. On iPhone a
  // surprise keyboard makes the pinned header and tab bar jump around.
  row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function collapseRow(row) {
  if (!row) return;
  if (openMemo && openMemo.key === row.dataset.ex) openMemo = null;
  row.classList.remove('open');
  row.querySelector('.xbody').hidden = true;
  if (row.contains(document.activeElement)) document.activeElement.blur();
}

export function updateElapsed() {
  const el = document.getElementById('elapsed');
  if (el && state.active) el.textContent = clock((Date.now() - state.active.start) / 1000);
}

// Every set counts as done; a set's weight is exactly what its box shows.
function summarize(s) {
  const a = state.active;
  let sets = 0, vol = 0, reps = 0, logged = 0;
  const ex = s.ex.map((x, i) => {
    const inf = info(x);
    const done = x.sets.map((t, k) => {
      const w = num(a.log[i][k].w);
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
  const p = progress(s);
  const sh = sheet(`
    <h3>Finish workout?</h3>
    <p class="muted">${p.next
      ? `${p.full} of ${p.list.length} ticked off. Finishing marks all ${s.ex.length} exercises as done.`
      : 'Everything is ticked off. Nice work.'}</p>
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
  // Compare logged weights with your previous session, before saving this one.
  const changes = sum.ex.map((x) => {
    const top = Math.max(...x.sets.map((st) => st.w || 0));
    if (!top) return null;
    const prev = lastSet(x.n);
    const best = Math.max(0, ...state.workouts.flatMap((w) => w.ex.filter((e) => e.n === x.n).flatMap((e) => e.sets.map((st) => st.w || 0))));
    return { n: x.n, top, prev: prev ? prev.w : null, pr: best > 0 && top > best };
  }).filter(Boolean);
  const w = {
    id: Date.now().toString(36),
    sid: s.id, title: s.title, dayName: s.dayName, short: s.short, day: s.day, week: s.week, month: s.month, kind: s.kind,
    start: a.start, end: a.start + sum.dur * 1000, dur: sum.dur,
    ex: sum.ex, sets: sum.sets, vol: sum.vol, reps: sum.reps,
  };
  state.workouts.push(w);
  state.status[s.id] = 'done';
  state.active = null;
  save();
  clearTimer();
  document.querySelector('#tabbar [data-tab="today"]')?.classList.remove('live');
  const next = nextSession();
  root.innerHTML = `
    <section class="complete">
      <div class="big-check">${ICON.check}</div>
      <h1>Workout complete</h1>
      <p class="muted">${esc(s.dayName)} · Week ${s.week}</p>
      <div class="stat-grid">
        ${statBox('Duration', dur(w.dur))}${statBox('Exercises', s.ex.length)}
        ${statBox('Sets', w.sets)}${statBox('Volume', w.vol ? `${kg(w.vol)} kg` : '–')}
      </div>
      ${changes.length ? `<div class="changes"><div class="card-title">Weights today</div>${changes.map((c) => {
        const d = c.prev == null ? null : Math.round((c.top - c.prev) * 10) / 10;
        const tag = c.pr ? '<span class="pr">New best</span>'
          : d == null ? '<span class="muted">first time</span>'
          : d > 0 ? `<span class="up">↑ ${fmt1(d)} kg</span>` : d < 0 ? `<span class="down">↓ ${fmt1(-d)} kg</span>` : '<span class="muted">same as last</span>';
        return `<div class="chg"><span>${esc(c.n)}</span><b>${fmt1(c.top)} kg</b>${tag}</div>`;
      }).join('')}</div>` : ''}
      ${next ? `<p class="muted">Next up: <b>${esc(next.dayName)}</b> · Week ${next.week}</p>` : ''}
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
  if (!planScrolled && next && next.month > 1) {
    planScrolled = true;
    requestAnimationFrame(() => root.querySelector('button.dchip.next')?.closest('.wk-row')?.scrollIntoView({ block: 'center' }));
  }
}
let planScrolled = false;

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
          .map((s) => `<button class="dchip ${state.status[s.id] || ''} ${next && next.id === s.id ? 'next' : ''}" data-sid="${s.id}" aria-label="${esc(s.title)}">${esc(s.short || s.day)}</button>`)
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
      <div class="grow"><div class="eyebrow">Week ${s.week} · Month ${s.month}</div><h1 class="h2">${esc(s.dayName)}</h1></div>
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
    if (act === 'reset') {
      const was = state.status[id];
      delete state.status[id];
      save();
      rerender();
      toast('Marked as not done', { undo: () => { state.status[id] = was; save(); rerender(); } });
    }
    if (act === 'terms') openTerms();
  };
}

// Rest timer popup. Tap an exercise's ⏱ button: the overlay opens, counts
// down, beeps, and closes by itself. "Hide" shrinks it to a small pill (tap
// the pill to bring it back) so a 30-min cardio timer never blocks the
// workout. It stores an end timestamp, so it keeps counting if iOS
// backgrounds or closes the app, and keeps the screen awake while it runs.
import { state, save } from './store.js';
import { clock, beep, ICON } from './util.js';

const R = 52;
const CIRC = 2 * Math.PI * R;
const box = () => document.getElementById('timer');

// ---- keep the screen on while a timer runs (where the browser supports it)
let lock = null, pending = false;
async function keepAwake(on) {
  try {
    if (on && !lock && !pending && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      pending = true;
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch (e) { lock = null; } finally { pending = false; }
}

// `key` names what the timer is for (e.g. 'cardio'); when it runs out, a
// 'timer-done' event tells the workout so it can tick that block off.
export function startTimer(sec, label = 'Rest', key = null) {
  // Close the keyboard first, otherwise it can cover the timer buttons.
  if (document.activeElement && document.activeElement.matches('input, select')) document.activeElement.blur();
  state.timer = { end: Date.now() + sec * 1000, total: sec, label, key, rang: false, mini: false };
  save();
  tick();
}

export function clearTimer() {
  state.timer = null;
  save();
  keepAwake(false);
  tick();
}

function adjust(delta) {
  const t = state.timer;
  if (!t || t.rang) return;
  t.end = Math.max(Date.now(), t.end + delta * 1000);
  t.total = Math.max(5, t.total + delta);
  save();
  tick();
}

function setMini(mini) {
  if (!state.timer) return;
  state.timer.mini = mini;
  save();
  tick();
}

function build(el) {
  el.innerHTML = `
    <div class="t-card" role="timer">
      <div class="t-top"><span class="t-label"></span><button data-t="hide" class="t-hide">Hide</button></div>
      <div class="t-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="${R}" class="t-track"/>
          <circle cx="60" cy="60" r="${R}" class="t-prog" stroke-dasharray="${CIRC.toFixed(1)}"/>
        </svg>
        <div class="t-time"></div>
      </div>
      <div class="t-btns">
        <button data-t="-15" aria-label="Minus 15 seconds">−15</button>
        <button data-t="x" class="t-skip">Skip</button>
        <button data-t="15" aria-label="Plus 15 seconds">+15</button>
      </div>
    </div>
    <button class="t-mini" data-t="show" aria-label="Show timer">${ICON.timer}<span class="t-mini-label"></span><b class="t-mini-time"></b></button>`;
  el.onclick = (ev) => {
    const b = ev.target.closest('[data-t]');
    if (!b) return;
    const t = b.dataset.t;
    if (t === 'x') clearTimer();
    else if (t === 'hide') setMini(true);
    else if (t === 'show') setMini(false);
    else adjust(+t);
  };
  el.dataset.built = '1';
}

export function tick() {
  const el = box();
  if (!el) return;
  const t = state.timer;
  if (!t) {
    el.hidden = true;
    return;
  }
  const left = (t.end - Date.now()) / 1000;
  // Ended a while ago (app was in the background): just close.
  if (left < -1.6) {
    const missed = !t.rang && t.key;
    clearTimer();
    if (missed) window.dispatchEvent(new CustomEvent('timer-done', { detail: t.key }));
    return;
  }
  if (!el.dataset.built) build(el);
  el.hidden = false;
  keepAwake(true);
  const over = left <= 0;
  const time = over ? 'Go!' : clock(Math.ceil(left));
  el.classList.toggle('over', over);
  el.classList.toggle('mini', !!t.mini);
  el.querySelector('.t-label').textContent = over ? 'Rest done' : t.label;
  el.querySelector('.t-time').textContent = time;
  el.querySelector('.t-mini-label').textContent = over ? 'Done' : t.label.split(' · ')[0];
  el.querySelector('.t-mini-time').textContent = time;
  const remaining = over ? 1 : Math.max(0, Math.min(1, left / t.total)); // full ring flashes on "Go!"
  el.querySelector('.t-prog').style.strokeDashoffset = (CIRC * (1 - remaining)).toFixed(1);
  if (over && !t.rang) {
    t.rang = true;
    save();
    beep();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (t.key) window.dispatchEvent(new CustomEvent('timer-done', { detail: t.key }));
  }
}

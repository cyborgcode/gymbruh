// Rest timer popup. Tap an exercise's ⏱ button: the overlay opens, counts
// down, beeps, and closes by itself. It stores an end timestamp, so it
// keeps counting if iOS backgrounds or closes the app.
import { state, save } from './store.js';
import { clock, beep } from './util.js';

const R = 52;
const CIRC = 2 * Math.PI * R;
const box = () => document.getElementById('timer');

export function startTimer(sec, label = 'Rest') {
  state.timer = { end: Date.now() + sec * 1000, total: sec, label, rang: false };
  save();
  tick();
}

export function clearTimer() {
  state.timer = null;
  save();
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

function build(el) {
  el.innerHTML = `
    <div class="t-card" role="timer">
      <div class="t-label"></div>
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
    </div>`;
  el.onclick = (ev) => {
    const b = ev.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === 'x') clearTimer();
    else adjust(+b.dataset.t);
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
    clearTimer();
    return;
  }
  if (!el.dataset.built) build(el);
  el.hidden = false;
  const over = left <= 0;
  el.classList.toggle('over', over);
  el.querySelector('.t-label').textContent = over ? 'Rest done' : t.label;
  el.querySelector('.t-time').textContent = over ? 'Go!' : clock(Math.ceil(left));
  const remaining = over ? 1 : Math.max(0, Math.min(1, left / t.total)); // full ring flashes on "Go!"
  el.querySelector('.t-prog').style.strokeDashoffset = (CIRC * (1 - remaining)).toFixed(1);
  if (over && !t.rang) {
    t.rang = true;
    save();
    beep();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
}

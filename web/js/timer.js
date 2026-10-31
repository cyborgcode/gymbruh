// Floating rest timer. Stores an end timestamp, so it survives the app
// being backgrounded or closed by iOS.
import { state, save } from './store.js';
import { clock, beep, ICON } from './util.js';

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
  if (!t) return;
  const left = Math.max(0, t.end - Date.now()) + delta * 1000;
  t.end = Date.now() + Math.max(0, left);
  t.total = Math.max(5, t.total + delta);
  t.rang = false;
  save();
  tick();
}

function build(el) {
  el.innerHTML = `
    <div class="t-fill"></div>
    <div class="t-info"><span class="t-label"></span><span class="t-time"></span></div>
    <button data-t="-15" aria-label="Minus 15 seconds">−15</button>
    <button data-t="15" aria-label="Plus 15 seconds">+15</button>
    <button data-t="x" class="t-x" aria-label="Stop timer">${ICON.x}</button>`;
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
    document.body.classList.remove('has-timer');
    return;
  }
  if (!el.dataset.built) build(el);
  el.hidden = false;
  document.body.classList.add('has-timer');
  const left = (t.end - Date.now()) / 1000;
  const over = left <= 0;
  el.classList.toggle('over', over);
  el.querySelector('.t-label').textContent = over ? `${t.label} done` : t.label;
  el.querySelector('.t-time').textContent = over ? 'Go!' : clock(Math.ceil(left));
  el.querySelector('.t-fill').style.width = `${over ? 100 : Math.min(100, (1 - left / t.total) * 100)}%`;
  if (over && !t.rang) {
    t.rang = true;
    save();
    beep();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  if (left < -15) clearTimer(); // tidy up 15 s after it ends
}

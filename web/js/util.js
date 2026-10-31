// Small shared helpers: formatting, dates, icons, toast, bottom sheet, beep.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW1 = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DOW3 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n) => String(n).padStart(2, '0');

// ---- numbers & durations
export function clock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
export function dur(sec) {
  const m = Math.round((sec || 0) / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}
// One consistent volume format: 850 · 7.9k · 1.25M
export function kg(n) {
  n = n || 0;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}
export const num = (v) => {
  if (v === '' || v == null) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export const firstInt = (t) => { const m = String(t).match(/\d+/); return m ? +m[0] : 0; };
export const isHold = (reps) => /\d\s*s\b/.test(reps);
export const roundDown = (x, step = 2.5) => Math.floor(x / step) * step;
export const e1rm = (w, r) => w * (1 + r / 30);
export const fmt1 = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

// ---- dates (all local time)
export const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const sow = (d) => { const x = sod(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }; // Monday
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const dkey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const sameDay = (a, b) => dkey(a) === dkey(b);
export const daysBetween = (a, b) => Math.round((sod(b) - sod(a)) / 864e5);
export const timeStr = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const dateStr = (d) => { const x = new Date(d); return `${DOW3[(x.getDay() + 6) % 7]} ${x.getDate()} ${MON[x.getMonth()]}`; };
export const shortDate = (d) => { const x = new Date(d); return `${x.getDate()} ${MON[x.getMonth()]}`; };

// ---- icons (24px line icons, inherit currentColor)
const svg = (p, extra = '') =>
  `<svg viewBox="0 0 24 24" class="ic" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
export const ICON = {
  today: svg('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
  plan: svg('<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4"/>'),
  history: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5M12 7.5V12l3 2"/>'),
  stats: svg('<path d="M5 20v-7M10 20V5M15 20v-9M20 20v-4"/>'),
  sliders: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.6"'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  chevL: svg('<path d="M15 6l-6 6 6 6"/>'),
  chevR: svg('<path d="M9 6l6 6-6 6"/>'),
  timer: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  play: svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.01"/>'),
  flame: svg('<path d="M12 2.5c.6 3.6 5 5.3 5 10.2a5 5 0 0 1-10 0c0-2.2 1.1-3.8 2.2-4.8.2 1.7 1 2.8 2.1 3.2 0-3.2-1-5.8.7-8.6z" fill="currentColor" stroke="none"/>'),
  moon: svg('<path d="M20 14.5A8.2 8.2 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z" fill="currentColor" stroke="none"/>'),
  share: svg('<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M5.5 11.5v7a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-7"/>'),
};

// ---- UI bits
export function toast(msg, ms = 2200) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), ms);
}

// Bottom sheet. Close with the × button, a tap on the dimmed area, a swipe
// down, or Escape. Returns { el: content, panel: scroll container, close }.
export function sheet(html) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg"></div>
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="grab"></div>
      <button class="icon-btn sm sheet-x" aria-label="Close">${ICON.x}</button>
      <div class="sheet-body">${html}</div>
    </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const panel = wrap.querySelector('.sheet');
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    document.removeEventListener('keydown', onKey);
    wrap.classList.remove('open');
    panel.style.transform = '';
    setTimeout(() => wrap.remove(), 260);
  }
  wrap.querySelector('.sheet-bg').addEventListener('click', close);
  wrap.querySelector('.sheet-x').addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  // Swipe down (from the top of the sheet's scroll) to dismiss.
  let startY = null, dy = 0;
  panel.addEventListener('touchstart', (e) => {
    if (panel.scrollTop > 0 || e.target.closest('input, select')) return;
    startY = e.touches[0].clientY;
    dy = 0;
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    if (startY == null) return;
    dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      e.preventDefault();
      panel.style.transition = 'none';
      panel.style.transform = `translateY(${dy}px)`;
    }
  }, { passive: false });
  panel.addEventListener('touchend', () => {
    if (startY == null) return;
    panel.style.transition = '';
    if (dy > 90) close();
    else panel.style.transform = '';
    startY = null;
  });
  return { el: wrap.querySelector('.sheet-body'), panel, close };
}

export const seg = (name, opts, val) =>
  `<div class="seg" role="tablist">${opts
    .map(([v, l]) => `<button role="tab" data-seg="${name}" data-val="${v}" class="${v === val ? 'on' : ''}">${l}</button>`)
    .join('')}</div>`;

// ---- sound: iOS only plays audio after a user gesture has unlocked the context
let actx;
export function unlockAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { /* no audio */ }
}
export function beep() {
  try {
    unlockAudio();
    [0, 0.22, 0.44].forEach((t) => {
      const o = actx.createOscillator(), g = actx.createGain(), at = actx.currentTime + t;
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      o.connect(g).connect(actx.destination);
      o.start(at);
      o.stop(at + 0.2);
    });
  } catch (e) { /* no audio */ }
}

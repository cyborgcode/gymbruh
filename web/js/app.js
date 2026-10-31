// Entry point: router, tab bar, 1-second ticker, service worker.
import { state, loadPlan } from './store.js';
import { renderToday, renderPlan, renderSession, updateElapsed } from './workout.js';
import { renderHistory, renderStats } from './stats.js';
import { tick } from './timer.js';
import { ICON, dkey } from './util.js';
import { applyTheme } from './theme.js';
import { removeSample } from './settings.js';

applyTheme(state.theme);

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
const TABS = [['today', 'Today'], ['plan', 'Plan'], ['history', 'History'], ['stats', 'Stats']];
const ROUTES = { today: renderToday, plan: renderPlan, history: renderHistory, stats: renderStats };

tabbar.innerHTML = TABS.map(([k, label]) => `<a href="#/${k}" data-tab="${k}">${ICON[k]}<span>${label}</span></a>`).join('');

function route() {
  const [, name = 'today', arg] = (location.hash || '#/today').split('/');
  const tab = name === 'session' ? 'plan' : ROUTES[name] ? name : 'today';
  tabbar.querySelectorAll('a').forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  view.oninput = null;
  view.onkeydown = null;
  view.style.minHeight = '';
  if (name === 'session') renderSession(view, decodeURIComponent(arg || ''));
  else ROUTES[tab](view);
  document.body.classList.toggle('in-workout', tab === 'today' && !!state.active);
  // Dot on the Today tab while a workout is in progress.
  tabbar.querySelector('[data-tab="today"]').classList.toggle('live', !!state.active);
  renderedDay = dkey(new Date());
}
let renderedDay = '';

// Tapping the tab you're already on reloads it and scrolls to the top
// (otherwise e.g. the "Workout complete" screen could never be left via the tab).
tabbar.addEventListener('click', (ev) => {
  const a = ev.target.closest('a[data-tab]');
  if (!a || a.getAttribute('href') !== location.hash) return;
  ev.preventDefault();
  route();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// The sample-data banner's "Remove" button works on every screen.
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('[data-act="remove-sample"]')) return;
  if (confirm('Remove the sample data and bring back your own?')) removeSample();
});

window.addEventListener('hashchange', () => {
  document.querySelectorAll('.sheet-wrap').forEach((el) => el.remove());
  route();
  window.scrollTo(0, 0);
});
window.addEventListener('rerender', route);
// iOS home-screen bug: with a see-through status bar the layout viewport can
// come out shorter than the screen by exactly the top safe area, leaving a
// gap under the tab bar. Detect that and push bottom-pinned UI down by it.
function fixViewportGap() {
  let gap = 0;
  if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;height:0;padding-top:env(safe-area-inset-top);visibility:hidden';
    document.body.appendChild(probe);
    const safeTop = probe.offsetHeight;
    probe.remove();
    const portrait = matchMedia('(orientation: portrait)').matches;
    const full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    const diff = full - window.innerHeight;
    if (safeTop > 0 && diff > 20 && Math.abs(diff - safeTop) < 10) gap = diff;
  }
  document.documentElement.style.setProperty('--gap', `${gap}px`);
}
fixViewportGap();
window.addEventListener('resize', fixViewportGap);
window.addEventListener('orientationchange', () => setTimeout(fixViewportGap, 300));

// iOS only shows :active press styles when the page listens for touches.
document.addEventListener('touchstart', () => {}, { passive: true });

// While typing, hide the tab bar and unpin the header: iOS moves pinned
// elements around when the keyboard is open.
document.addEventListener('focusin', (ev) => {
  if (!ev.target.matches('input, select')) return;
  document.body.classList.add('typing');
  // Weight boxes: select the current value so typing replaces it.
  if (ev.target.matches('.in')) {
    ev.target.dataset.fresh = '1';
    setTimeout(() => selectAll(ev.target), 30);
  }
});
// iOS moves the caret to the tap point after focusing, which clears the
// selection, so select again on that first tap.
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('.in');
  if (!el || !el.dataset.fresh) return;
  delete el.dataset.fresh;
  selectAll(el);
});
function selectAll(el) {
  try { el.setSelectionRange(0, el.value.length); } catch (e) { /* ignore */ }
}
// iOS can leave the page shifted after the keyboard closes; nudge it back.
document.addEventListener('focusout', (ev) => {
  if (!ev.target.matches('input, select')) return;
  setTimeout(() => {
    if (!document.activeElement || !document.activeElement.matches('input, select')) document.body.classList.remove('typing');
    window.scrollTo(window.scrollX, window.scrollY);
    fixViewportGap();
  }, 80);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  tick();
  updateElapsed();
  // Back after midnight: refresh dates and "today" (but never mid-workout).
  if (dkey(new Date()) !== renderedDay && !(state.active && location.hash.startsWith('#/today'))) route();
});

async function boot() {
  try {
    await loadPlan();
  } catch (e) {
    view.innerHTML = '<div class="empty">Couldn\'t load the plan. Check your connection and open the app again.</div>';
    return;
  }
  route();
  tick();
  setInterval(() => { tick(); updateElapsed(); }, 500);
  if ('serviceWorker' in navigator) {
    // When a new version is deployed, the new service worker takes over and
    // we reload once so the update shows up straight away.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register('/sw.js').then((reg) => reg.update()).catch(() => {});
  }
}

boot();

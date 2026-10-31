// Entry point: router, tab bar, 1-second ticker, service worker.
import { state, loadPlan } from './store.js';
import { renderToday, renderPlan, renderSession, updateElapsed } from './workout.js';
import { renderHistory, renderStats } from './stats.js';
import { tick } from './timer.js';
import { ICON } from './util.js';
import { applyTheme } from './theme.js';

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
  if (name === 'session') renderSession(view, decodeURIComponent(arg || ''));
  else ROUTES[tab](view);
  document.body.classList.toggle('in-workout', tab === 'today' && !!state.active);
}

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

// iOS can leave the page shifted after the keyboard closes; nudge it back.
document.addEventListener('focusout', (ev) => {
  if (!ev.target.matches('input, select')) return;
  setTimeout(() => { window.scrollTo(window.scrollX, window.scrollY); fixViewportGap(); }, 80);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); updateElapsed(); } });

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

// Entry point: router, tab bar, 1-second ticker, service worker.
import { state, loadPlan } from './store.js';
import { renderToday, renderPlan, renderSession, updateElapsed } from './workout.js';
import { renderHistory, renderStats } from './stats.js';
import { tick } from './timer.js';
import { ICON } from './util.js';

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
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();

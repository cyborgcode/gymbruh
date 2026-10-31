// Settings sheet: colour theme, plan position, sample data, backup, reset.
import { state, save, plan, replaceState, BACKUP_KEY } from './store.js';
import { sheet, toast, dkey, ICON } from './util.js';
import { ACCENTS, BACKGROUNDS, applyTheme } from './theme.js';
import { makeSample } from './sample.js';

const rerender = () => window.dispatchEvent(new Event('rerender'));
const isLight = (hex) => ['#ffd60a', '#40c8e0', '#30d158', '#ff9f0a'].includes(hex);

export function openSettings() {
  const sh = sheet(body());
  wire(sh);
}

function body() {
  const t = state.theme || {};
  const nextWeek = plan.sessions.find((s) => !state.status[s.id])?.week || 1;
  return `
    <h3>Settings</h3>

    <div class="field">
      <span>Color theme</span>
      <div class="swatches">${Object.entries(ACCENTS).map(([k, [label, hex]]) => `
        <button class="swatch ${t.accent === k ? 'on' : ''} ${isLight(hex) ? 'light' : ''}" data-accent="${k}"
          style="background:${hex}" aria-label="${label}" aria-pressed="${t.accent === k}">${ICON.check}</button>`).join('')}
      </div>
      <div class="bgs">${Object.entries(BACKGROUNDS).map(([k, b]) => `
        <button class="bgopt ${t.bg === k ? 'on' : ''}" data-bg="${k}" aria-pressed="${t.bg === k}"><i style="background:${b.card}"></i>${b.label}</button>`).join('')}
      </div>
    </div>

    <div class="field">
      <span>Start the plan at week</span>
      <div class="row">
        <select id="startWeek" aria-label="Week">${Array.from({ length: 52 }, (_, i) => `<option value="${i + 1}" ${i + 1 === nextWeek ? 'selected' : ''}>Week ${i + 1}</option>`).join('')}</select>
        <button class="btn sm" data-act="jump">Apply</button>
      </div>
      <small>Unfinished sessions before that week are marked as skipped.</small>
    </div>

    <div class="field">
      <span>Sample data</span>
      ${state.sample
        ? `<div class="sample-on">${ICON.info} Sample data is loaded</div>
           <button class="btn" data-act="sample-off">Remove sample data</button>
           <small>Brings back your own data exactly as it was. Workouts you logged in the meantime are kept.</small>`
        : `<button class="btn" data-act="sample-on">Load sample data</button>
           <small>Fills the app with about 10 weeks of example workouts so you can explore the stats. Your own data is set aside and comes back when you remove it.</small>`}
    </div>

    <div class="field">
      <span>Offline</span>
      <div class="offline-status" id="offlineStatus">Checking…</div>
      <small>Workouts, timers, weight logging and stats all run on your phone with no internet. Open the app online now and then to get updates.</small>
    </div>

    <div class="field">
      <span>Backup</span>
      <div class="row">
        <button class="btn sm" data-act="export">Export</button>
        <label class="btn sm">Import<input type="file" accept="application/json,.json" id="importFile" hidden></label>
      </div>
      <small>Your workouts are stored only on this phone. Export a backup now and then.</small>
    </div>

    <button class="btn danger" data-act="reset">Reset all data</button>
    <p class="muted small center">GymBruh · 12-month strength &amp; aesthetics plan</p>`;
}

function refresh(sh) {
  const top = sh.panel.scrollTop;
  sh.el.innerHTML = body();
  sh.panel.scrollTop = top;
  wire(sh);
}

// Is a complete offline copy of this version stored on the phone?
async function showOfflineStatus(sh) {
  const el = sh.el.querySelector('#offlineStatus');
  if (!el) return;
  let ready = false, version = '';
  try {
    if ('caches' in window) {
      const keys = (await caches.keys()).filter((k) => k.startsWith('gymbruh-'));
      version = keys.sort().pop()?.replace('gymbruh-', '') || '';
      ready = !!(await caches.match('/plan.json')) && !!(await caches.match('/js/app.js')) && !!navigator.serviceWorker?.controller;
    }
  } catch (e) { /* not available */ }
  el.classList.toggle('ok', ready);
  el.innerHTML = ready
    ? `${ICON.check}<span>Ready to use offline${version ? ` · version ${version.replace('v', '')}` : ''}</span>`
    : `${ICON.info}<span>Not ready yet: keep the app open with internet for a few seconds, then check again.</span>`;
}

function wire(sh) {
  showOfflineStatus(sh);
  sh.el.onclick = async (ev) => {
    const b = ev.target.closest('[data-act],[data-accent],[data-bg]');
    if (!b) return;
    if (b.dataset.accent || b.dataset.bg) {
      state.theme = { ...state.theme, ...(b.dataset.accent ? { accent: b.dataset.accent } : { bg: b.dataset.bg }) };
      save();
      applyTheme(state.theme);
      refresh(sh);
      return;
    }
    const act = b.dataset.act;
    if (act === 'jump') {
      const wk = +sh.el.querySelector('#startWeek').value;
      for (const s of plan.sessions) {
        if (s.week < wk && !state.status[s.id]) state.status[s.id] = 'skipped';
        if (s.week >= wk && state.status[s.id] === 'skipped') delete state.status[s.id];
      }
      save();
      sh.close();
      toast(`Plan set to start at week ${wk}`);
      rerender();
    }
    if (act === 'sample-on') loadSample(sh);
    if (act === 'sample-off') removeSample(sh);
    if (act === 'export') await exportData();
    if (act === 'reset') {
      if (!confirm('Delete all workouts and progress on this phone?')) return;
      if (!confirm('Are you sure? This cannot be undone.')) return;
      localStorage.removeItem(BACKUP_KEY);
      replaceState({});
      sh.close();
      rerender();
    }
  };

  sh.el.querySelector('#importFile').onchange = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.v !== 1 || !Array.isArray(data.workouts)) throw new Error('bad file');
      if (!confirm(`Replace your data with this backup (${data.workouts.length} workouts)?`)) return;
      localStorage.removeItem(BACKUP_KEY);
      replaceState({ ...data, active: null, timer: null, sample: false });
      sh.close();
      toast('Backup restored');
      rerender();
    } catch (e) {
      toast('That file is not a GymBruh backup');
    }
  };
}

export function loadSample(sh) {
  if (state.active && !confirm('A workout is in progress. It will be set aside with your data. Continue?')) return;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(state));
  } catch (e) {
    toast('Not enough storage to set your data aside');
    return;
  }
  const { workouts, status } = makeSample();
  replaceState({ workouts, status, sample: true, hideInstall: state.hideInstall });
  if (sh) sh.close();
  toast(`Loaded ${workouts.length} sample workouts`);
  location.hash = '#/stats';
  rerender();
}

export function removeSample(sh) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); } catch (e) { /* ignore */ }
  // Keep anything you really logged while the sample was loaded.
  const real = state.workouts.filter((w) => !w.sample);
  const base = saved && saved.v === 1 ? saved : {};
  const workouts = [...(base.workouts || []), ...real];
  const status = { ...(base.status || {}) };
  real.forEach((w) => { status[w.sid] = 'done'; });
  replaceState({ ...base, workouts, status, sample: false, active: state.active || base.active || null });
  localStorage.removeItem(BACKUP_KEY);
  if (sh) sh.close();
  toast('Sample data removed');
  rerender();
}

// Slim banner shown on the main screens while sample data is loaded.
export function sampleBanner() {
  if (!state.sample) return '';
  return `<div class="sample-banner">${ICON.info}<span>You're looking at <b>sample data</b></span>
    <button class="link" data-act="remove-sample">Remove</button></div>`;
}

async function exportData() {
  const name = `gymbruh-backup-${dkey(new Date())}.json`;
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'GymBruh backup' });
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

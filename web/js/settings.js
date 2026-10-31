// Settings sheet: jump to a week, backup/restore, reset.
import { state, save, plan, replaceState } from './store.js';
import { sheet, toast, dkey } from './util.js';

const rerender = () => window.dispatchEvent(new Event('rerender'));

export function openSettings() {
  const nextWeek = plan.sessions.find((s) => !state.status[s.id])?.week || 1;
  const sh = sheet(`
    <h3>Settings</h3>
    <div class="field">
      <span>Start the plan at week</span>
      <div class="row">
        <select id="startWeek" aria-label="Week">${Array.from({ length: 52 }, (_, i) => `<option value="${i + 1}" ${i + 1 === nextWeek ? 'selected' : ''}>Week ${i + 1}</option>`).join('')}</select>
        <button class="btn sm" data-act="jump">Apply</button>
      </div>
      <small>Unfinished sessions before that week are marked as skipped.</small>
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
    <p class="muted small center">GymBruh · 12-month strength &amp; aesthetics plan</p>`);

  sh.el.onclick = async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
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
    if (act === 'export') await exportData();
    if (act === 'reset') {
      if (!confirm('Delete all workouts and progress on this phone?')) return;
      if (!confirm('Are you sure? This cannot be undone.')) return;
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
      replaceState({ ...data, active: null, timer: null });
      sh.close();
      toast('Backup restored');
      rerender();
    } catch (e) {
      toast('That file is not a GymBruh backup');
    }
  };
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

// App state (saved to localStorage on this device) and the static plan.
import { e1rm } from './util.js';

const KEY = 'gymbruh:v1';
export const BACKUP_KEY = 'gymbruh:before-sample';
const blank = () => ({
  v: 1,
  status: {},    // sessionId -> 'done' | 'skipped'
  workouts: [],  // finished workouts
  active: null,  // workout in progress
  timer: null,   // running rest timer
  hideInstall: false,
  sample: false, // true while sample data is loaded
  theme: { accent: 'blue', bg: 'dark' },
});

export const state = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.v === 1) return { ...blank(), ...s };
  } catch (e) { /* corrupted: start fresh */ }
  return blank();
})();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save', e);
  }
}

// Replace all data; the colour theme is a preference and is kept.
export function replaceState(next) {
  const theme = state.theme;
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, blank(), next, { theme });
  save();
}

export const plan = { muscles: [], months: [], exercises: {}, sessions: [], byId: {} };

export async function loadPlan() {
  const res = await fetch('/plan.json');
  if (!res.ok) throw new Error(`plan.json ${res.status}`);
  const data = await res.json();
  Object.assign(plan, data);
  data.sessions.forEach((s, i) => { s.idx = i; plan.byId[s.id] = s; });
}

export const info = (x) => plan.exercises[x.e];
export const nextSession = () => plan.sessions.find((s) => !state.status[s.id]) || null;
export const monthOf = (s) => plan.months[s.month - 1];
export const workouts = () => [...state.workouts].sort((a, b) => a.start - b.start);

// Heaviest logged set for an exercise, from the most recent workout that has one.
export function lastSet(name) {
  const list = workouts();
  for (let i = list.length - 1; i >= 0; i--) {
    const ex = list[i].ex.find((x) => x.n === name);
    const logged = ex ? ex.sets.filter((s) => s.w != null) : [];
    if (logged.length) return logged.reduce((a, b) => (b.w > a.w ? b : a));
  }
  return null;
}

// Best estimated 1RM for a main lift over the last year (Epley).
export function bestE1rm(lift) {
  const since = Date.now() - 365 * 864e5;
  let best = 0;
  for (const w of state.workouts) {
    if (w.start < since) continue;
    for (const x of w.ex) {
      if (x.lift !== lift) continue;
      for (const s of x.sets) if (s.w > 0 && s.r > 0 && s.r <= 12) best = Math.max(best, e1rm(s.w, s.r));
    }
  }
  return best || null;
}

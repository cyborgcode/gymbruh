// Realistic sample history: ~10 weeks of Mon/Wed/Fri sessions that follow
// the real plan, with progressing weights, so every report has data.
import { plan, info } from './store.js';
import { firstInt, isHold, roundDown, sod, addDays, sow } from './util.js';

// Small seeded random generator so the sample looks the same every time.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAIN_BASE = { bench: 60, legpress: 140, hipthrust: 90, row: 55, ohp: 37.5, pullup: 5 };
const BODYWEIGHT = /Pull-up \(add|Dips \(assisted|Hanging|Ab Wheel|Plank|Dragon|Hollow|L-Sit|Toes|Reverse Crunch|Carry|Step-up|Back Extension/;

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function makeSample() {
  const rand = rng(42);
  const workouts = [];
  const status = {};
  const today = sod(new Date());
  let day = addDays(sow(today), -7 * 10);
  let idx = 0;

  while (day < today && idx < plan.sessions.length) {
    const dow = (day.getDay() + 6) % 7;
    if ([0, 2, 4].includes(dow) && rand() > 0.1) {
      const s = plan.sessions[idx];
      const start = new Date(day);
      start.setHours(17 + Math.floor(rand() * 3), Math.floor(rand() * 60), 0, 0);
      const durSec = Math.round((80 + rand() * 32) * 60);
      const grow = 1 + idx * 0.007;
      let sets = 0, vol = 0, reps = 0;

      const ex = s.ex.map((x) => {
        const inf = info(x);
        let base = null;
        if (inf.lift && !(inf.lift === 'pullup' && s.month <= 3)) base = MAIN_BASE[inf.lift] * grow;
        else if (!BODYWEIGHT.test(inf.name)) base = (10 + (hash(inf.name) % 25)) * grow;
        const done = x.sets.map((t) => {
          const r = isHold(t.reps) ? null : firstInt(t.reps) || null;
          const w = base == null ? null : Math.max(2.5, roundDown(base * (t.pct ? t.pct / 0.75 : 1)));
          sets += 1;
          if (r) reps += r;
          if (w && r) vol += w * r;
          return { w, r };
        });
        return { n: inf.name, lift: inf.lift || null, m: inf.muscles, sets: done };
      });

      workouts.push({
        id: `sample-${s.id}`, sample: true,
        sid: s.id, title: s.title, dayName: s.dayName, day: s.day, week: s.week, month: s.month, kind: s.kind,
        start: +start, end: +start + durSec * 1000, dur: durSec, cardio: true,
        ex, sets, vol: Math.round(vol), reps,
      });
      status[s.id] = 'done';
      idx += 1;
    }
    day = addDays(day, 1);
  }
  return { workouts, status };
}

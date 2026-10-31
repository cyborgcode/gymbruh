# GymBruh: 12-Month Strength & Aesthetics Plan

A 52-week gym program: **3 days a week**, **30 minutes of cardio before every session**, **no squats, no deadlifts**, **abs every session**, built for **strength and aesthetics**.

| Your requirement | How the plan meets it |
|---|---|
| 30 min cardio before each session | Every session starts with 30 min of cardio, planned month by month. It's mostly Zone 2, with intervals only in the definition phase. |
| No squats | Quads are trained with the leg press, lunges, step-ups and leg extensions. |
| No deadlifts | The posterior chain is trained with hip thrusts, back extensions and leg curls. Rows are unracked from safeties, so you never pull a bar off the floor. |
| 3 days per week | Full-body A / B / C split, so every muscle is hit 2-3× a week. |
| Works your abs | 2 ab exercises every session (≈ 18 hard sets a week). They progress from knee raises and planks to dragon flags, ab wheel from the feet and L-sits. |
| Strength | Six tracked main lifts, percentage-based periodization, two test weeks and a final assessment. |
| Aesthetics | V-taper focus (upper chest, side delts, lats, arms, abs) with balanced legs, a specialization month and a definition phase. |

---

## Quick start

1. Read this page once.
2. Choose your 3 training days (see [weekly schedule](#weekly-schedule)).
3. Open **[Month 1](months/01-foundation.md)** and train.
4. Log your main lifts in [`tracker/main-lifts-tracker.csv`](tracker/main-lifts-tracker.csv). Import it into Google Sheets or Excel and the e1RM column fills itself in.

## The app

The plan also runs as a web app (in [`web/`](web/)) that you install on your iPhone's home screen.

- **Today:** opens on your next workout as a compact list. Tap **Start**, follow it, then tap **Finish**, which marks every exercise done.
- **Weights (optional):** tap an exercise to open it, tap a kg box and type (it carries down to the following sets), then tap **Done** to close it. Next time you'll see "Last 60 kg" on that exercise.
- **Rest timer:** each exercise has a ⏱ button with its suggested rest time. Tap it and a popup counts down, beeps, and closes by itself. −15 / +15 adjust it, **Hide** shrinks it to a small pill so you can keep using the workout, and Cardio has a 30:00 timer. The screen stays on while it runs (where iOS allows it).
- **Plan:** every week and session of the year, showing which are done, skipped or next.
- **History:** a calendar with your workout days marked A/B/C, plus duration and volume for each workout.
- **Stats:** totals, week streak, rest days, a 26-week activity heatmap, weekly charts (workouts, duration, volume, reps), muscle balance (radar, current vs previous period), fatigue, strength trends (e1RM of the main lifts) and planned vs done weekly sets per muscle.
- **Settings:** a color theme (9 accent colors, Dark / Black / Midnight backgrounds), **Load sample data** (about 10 weeks of example workouts for exploring the stats; your own data is set aside and comes back when you remove it), start at any week, export/import, and reset.
- **Offline-ready and private:** everything is stored on your phone. Use Settings → Export for a backup.

**Install on iPhone:** open the site in Safari → **Share** → **Add to Home Screen**.

The app has no build step, and Vercel serves the `web/` folder as-is (see [`vercel.json`](vercel.json)). To change the plan, edit [`scripts/generate.py`](scripts/generate.py), then run `python3 scripts/generate.py`. That rewrites this README, the month files, the tracker and `web/plan.json` together.

## Weekly schedule

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|
| **Day A** | Rest | **Day B** | Rest | **Day C** | Rest | Rest |

Tue/Thu/Sat or Sun/Tue/Thu work just as well. Keep at least one rest day between sessions when you can, and never train 3 days in a row. On rest days, walk 7-10k steps.

## How every session runs

| Block | Time | What you do |
|---|---|---|
| 1. Cardio | **30 min** | Exactly as written for the month (mostly Zone 2) |
| 2. Warm-up | 5-8 min | Mobility plus ramp-up sets ([details](#warm-up-after-cardio-5-8-min)) |
| 3. Main lifts | 20-30 min | 2 heavy compound lifts |
| 4. Accessories | 20-30 min | Supersets, to save time |
| 5. Abs | 8-10 min | 2 exercises, done as a superset |

**Total: about 1 h 30 to 1 h 45.**

---

## The year at a glance

Each "month" is a **4-week training block**. Every quarter ends with a **flex week**, so 12 × 4 + 4 = **52 weeks**.

{{OVERVIEW}}

| Key weeks | |
|---|---|
| Deload weeks | 8, 21, 34, 47 |
| Test weeks | 25 (end of Q2), 43 (end of Month 10) |
| Final assessment | 51 |
| Flex weeks (deload / catch-up / holiday) | 13, 26, 39, 52 |

### The four quarters

1. **Q1, Build the Base (Months 1-3):** technique, work capacity and muscle. Effort-based loading (RIR).
2. **Q2, Get Strong (Months 4-6):** percentage-based strength block. 5×5, then triples, then a max test.
3. **Q3, Build the Look (Months 7-9):** high-volume hypertrophy, V-taper specialization, then powerbuilding.
4. **Q4, Peak & Reveal (Months 10-12):** strength peak and PR test, then a definition phase and the final assessment.

## Exercise templates by quarter

The six main lifts stay the same all year so you can track your strength. Accessories rotate every quarter so you keep progressing and stay motivated.

{{TEMPLATES}}

## The six main lifts

| Lift | Day | Why it's in the plan |
|---|---|---|
| Barbell Bench Press | A | Chest size and upper-body pressing strength |
| Leg Press | A | Heavy quad and glute work with no barbell on your spine. It replaces the squat. |
| Barbell Hip Thrust | B | The strongest glute builder. It covers the posterior chain instead of deadlifts. |
| Barbell Row | B | A thick upper back. The bar is unracked from safeties at knee height, never pulled off the floor. |
| Standing Overhead Press | C | Shoulder size and pressing strength |
| Weighted Pull-up | C | Lat width, the core of the V-taper |

### Not in this plan (by request)

- **Squats, all variations:** back, front, goblet, hack, Smith, belt, box, split / Bulgarian split, pistol, sissy.
- **Deadlifts, all variations:** conventional, sumo, Romanian, stiff-leg, trap-bar, single-leg, rack pulls. Good mornings are out too.

---

## Terms

| Term | Meaning |
|---|---|
| **RIR** | Reps in reserve: how many more clean reps you could have done. RIR 2 means 2 left in the tank. |
| **RPE** | Rate of perceived exertion, where RPE = 10 − RIR. |
| **1RM / e1RM** | One-rep max / *estimated* one-rep max (from the formula below) |
| **Superset** | Exercises with the same number (3a/3b) are done back to back, then you rest. |
| **Drop set** | Finish the set, drop the weight about 25%, and keep going to RIR 0-1. |
| **Rest-pause** | Finish the set, rest 15 s, rep out again, and repeat once more. |
| **Myo-reps** | One set to RIR 1, then 3-4 mini-sets of 3-5 reps with 15 s rest between them. |
| **Deload** | A planned easy week (half the sets, lighter weights) to clear fatigue. |
| **Zone 2** | Easy steady cardio at 60-70% of max heart rate, where you can still talk in full sentences. |

## The maths

### 1. Heart-rate zones for your cardio

Estimated max heart rate (Tanaka formula):

```math
HR_{\max} \approx 208 - 0.7 \times \text{age}
```

Zone 2 is roughly 60-70% of that:

```math
0.60\,HR_{\max} \;\le\; HR_{\text{Zone 2}} \;\le\; 0.70\,HR_{\max}
```

Example, age 20: $HR_{\max} \approx 208 - 14 = 194$ bpm, so Zone 2 is about **116-136 bpm**. Zone 3 is 70-80% and the intervals are 85-90%.

No heart-rate monitor? Use the talk test: in Zone 2 you can speak in full sentences but couldn't sing.

### 2. Estimated 1-rep max (RIR-adjusted Epley)

```math
\widehat{1RM} = w \left( 1 + \frac{r + \text{RIR}}{30} \right)
```

$w$ = weight lifted, $r$ = reps completed, RIR = reps you had left. It's most accurate when $r + \text{RIR} \le 10$.

Example: 80 kg × 6 reps at RIR 1 → $80 \times \left(1 + \tfrac{7}{30}\right) \approx 98.7$ kg.

### 3. Working weight from a percentage

```math
w_{\text{work}} = 2.5 \times \left\lfloor \frac{p \cdot \widehat{1RM}}{2.5} \right\rfloor
```

In words: multiply, then round **down** to the nearest 2.5 kg. Example: $p = 0.775$ and $\widehat{1RM} = 98.7$ give $76.5$, so you load **75 kg**.

### 4. Weighted pull-ups (your bodyweight counts)

```math
\widehat{1RM}_{\text{total}} = (BW + w_{\text{added}}) \left( 1 + \frac{r + \text{RIR}}{30} \right)
\qquad\qquad
w_{\text{added}} = p \cdot \widehat{1RM}_{\text{total}} - BW
```

If $w_{\text{added}} < 0$, use that much assistance (assisted machine or band) instead.

Example: $BW = 75$ kg, +10 kg × 6 reps at RIR 0 gives $\widehat{1RM}_{\text{total}} = 85 \times 1.2 = 102$ kg. At $p = 0.80$: $81.6 - 75 = 6.6$, so add **5 kg**.

### 5. Accessory progression (double progression)

Stay inside the rep range. When **every** set reaches the top of the range at the target RIR, add weight and start again at the bottom of the range:

```math
w_{\text{next}} =
\begin{cases}
w + (1 \text{ to } 2.5)\ \text{kg} & \text{upper body} \\
w + (2.5 \text{ to } 5)\ \text{kg} & \text{lower body}
\end{cases}
```

### 6. Main-lift autoregulation

Each week, adjust the e1RM your percentages are based on:

```math
\widehat{1RM}_{\text{next}} =
\begin{cases}
1.025 \times \widehat{1RM} & \text{all sets were 2+ reps easier than the target RIR} \\
0.975 \times \widehat{1RM} & \text{you missed reps or ground out at RIR 0} \\
\widehat{1RM} & \text{otherwise}
\end{cases}
```

---

## Progression rules

- **Main lifts:** follow the month's week-by-week table. From Month 4 on, use the % of your e1RM or tested 1RM, and adjust with rule 6 above.
- **Accessories and isolation:** double progression (rule 5). Write down every set.
- **Abs:** first add reps or hold time, then add load, then move to the harder variation in the next quarter.
- **Technique always wins.** A rep with bad form doesn't count toward progression.

## Cardio rules (and why cardio before lifting works here)

- **Keep it Zone 2 most of the year.** Easy cardio barely hurts your strength and doubles as a long warm-up. Hard cardio before lifting would cost you strength, so intervals only show up on **Day C in Months 11-12**. Day C's main lifts are upper body, so that's where intervals do the least damage.
- **Choose low-impact machines:** bike, elliptical, incline walk, rower, stair climber. **Don't run before Day A or Day B**: running's impact and downhill (eccentric) loading tire out the legs you're about to train.
- **Stay in the zone as you get fitter.** You'll need more incline, speed or resistance over time to keep the same heart rate.
- **Fuel it.** Eat a meal with carbs and protein 1.5-3 h before training, and drink 500 ml+ of water during the session. 30 min of cardio plus 60 min of lifting is a long session.

## Abs strategy

Every session has **2 ab exercises done as a superset**, about **6 hard sets per session and 18 per week**. Abs recover quickly, so this frequency is fine. Every quarter covers all four jobs your core does:

| Quarter | Flexion (the "six-pack") | Anti-extension | Anti-rotation / lateral |
|---|---|---|---|
| Q1 | Hanging knee raise, cable crunch, reverse crunch | Kneeling ab wheel (partial → full range) | Pallof press, side plank |
| Q2 | Straight-leg hanging raise, weighted cable crunch, incline reverse crunch | Full-range kneeling ab wheel with a pause | Suitcase carry, weighted side plank |
| Q3 | Toes-to-bar, weighted decline crunch | Ab wheel from the feet (shortened range), dragon flag negatives, hollow hold | Cable woodchopper |
| Q4 | Weighted hanging leg raise, heavy cable crunch | Ab wheel from the feet, dragon flags, L-sit | Half-kneeling Pallof press + overhead reach |

**Visible abs = developed muscle + low body fat.** Abs usually show at about **10-14% body fat (men)** or **18-22% (women)**. The training builds the muscle, and the Month 11-12 calorie deficit brings body fat down so you can see it.

## Warm-up (after cardio, 5-8 min)

1. **General (one round):** band pull-aparts ×15, scapular push-ups ×10, cat-cow ×8, leg swings ×10/side, glute bridges ×10, wall slides ×10.
2. **Ramp-up sets, first main lift:** 40-50% ×8 → 60-70% ×5 → 80-85% ×2-3 → working sets.
3. **Ramp-up sets, second main lift:** 60% ×5 → 80% ×3 → working sets.

## Weekly volume per muscle

Hard sets per muscle in a normal (non-deload) week of each month. Secondary muscles count as half a set (for example, one bench set = 1 chest + 0.5 triceps + 0.5 shoulders). About **10-20 weekly sets** per muscle is the usual target for growth. Shoulders, back and abs sit at the top of that range on purpose, for the V-taper and the abs you asked for.

{{VOLUME}}

---

## Nutrition for aesthetics

Training builds the muscle; nutrition decides whether you can see it.

### Calories

Mifflin-St Jeor BMR ($m$ = body mass in kg, $h$ = height in cm, $a$ = age in years):

```math
BMR = 10\,m + 6.25\,h - 5\,a + s, \qquad s =
\begin{cases}
+5 & \text{male} \\
-161 & \text{female}
\end{cases}
```

Daily energy use with this plan (3 sessions including cardio, plus normal daily steps):

```math
TDEE \approx 1.5 \times BMR
```

Calorie target by phase:

```math
\text{kcal}_{\text{day}} =
\begin{cases}
TDEE + (200 \text{ to } 300) & \text{Months 1 to 9: lean gain} \\
TDEE & \text{Month 10: strength peak} \\
TDEE - (300 \text{ to } 500) & \text{Months 11 to 12: definition}
\end{cases}
```

> Starting with higher body fat (roughly above 20% for men, 30% for women)? Eat at maintenance, or even at the Month 11-12 deficit, from the beginning. The training stays exactly the same.

### Macros

```math
\text{protein (g/day)} = (1.6 \text{ to } 2.2) \times m \qquad \big(2.0 \text{ to } 2.4 \text{ in Months 11 to 12}\big)
```

```math
\text{fat (g/day)} \ge 0.8 \times m, \qquad
\text{carbs (g/day)} = \frac{\text{kcal}_{\text{day}} - 4 \cdot \text{protein} - 9 \cdot \text{fat}}{4}
```

### Rate of change (check your 7-day average body weight)

```math
\frac{\Delta m}{\text{week}} \approx
\begin{cases}
+0.25\% \text{ to } +0.5\% \ \text{of } m & \text{lean gain} \\
-0.5\% \text{ to } -1\% \ \text{of } m & \text{definition}
\end{cases}
```

Example: 75 kg, 180 cm, age 20, male. $BMR = 750 + 1125 - 100 + 5 = 1780$ kcal and $TDEE \approx 2670$ kcal, so a lean gain is about **2870-2970 kcal** with **120-165 g protein** a day.

## Recovery

- **Sleep 7-9 h.** This is where the muscle is actually built.
- **Steps:** 7-10k a day (8-10k in Months 11-12).
- **Supplements (optional, well researched):** creatine monohydrate 3-5 g a day, protein powder if it's convenient, and caffeine before training if you tolerate it.

## Tracking

- **Main lifts:** [`tracker/main-lifts-tracker.csv`](tracker/main-lifts-tracker.csv) has all 52 weeks × 6 lifts with the prescription filled in. Enter the weight, reps and RIR of your best working set and the e1RM is calculated for you. For pull-ups, enter the **total** load (bodyweight + added).
- **Weekly:** 7-day average body weight.
- **Monthly:** waist measured at the navel.
- **Quarterly:** progress photos (front, side, back, same light and time of day).

## When life happens

- **Missed 1 session:** do it on your next training day and keep the A → B → C order.
- **Missed a full week:** repeat the last week you completed.
- **Sick for 2+ weeks:** take the next flex week early, then restart from the last week you completed with loads 10% lighter.
- **Short on time:** drop the last isolation superset (5a/5b/5c). Never drop the cardio, the main lifts or the abs: those are the core of what you asked for.

## Substitutions (still no squats or deadlifts)

| If you can't do… | Use instead |
|---|---|
| Leg Press | Single-leg leg press · dumbbell reverse lunge · high-box step-up |
| Barbell Hip Thrust | Hip-thrust machine · Smith machine hip thrust · single-leg dumbbell hip thrust · glute bridge |
| Barbell Row | Chest-supported T-bar row · seal row · machine row |
| Standing Overhead Press | Seated dumbbell shoulder press · machine shoulder press |
| Pull-up | Assisted pull-up · band-assisted pull-up · lat pulldown |
| Bench Press | Dumbbell bench press · machine chest press |
| Dips | Machine dip · decline dumbbell press · close-grip push-up |
| Leg curls | Assisted Nordic curl · Swiss-ball leg curl · slider leg curl |
| 45° Back Extension | Reverse hyperextension · cable pull-through |
| Ab wheel | Barbell rollout · stability-ball rollout · TRX fallout |
| Hanging leg raise | Captain's chair leg raise · lying leg raise |
| Dragon flag | Lying leg raise with a slow negative · hollow body rocks |

## Safety

- This is a general program, not medical advice. If you have an injury, a heart condition or any other medical issue, check with a doctor or physiotherapist first.
- Effort is fine. **Sharp or joint pain is not.** Stop and swap the exercise.
- Use a spotter or safety bars on the bench press, and on every test day.
- Earn the load with technique first, especially on the hip thrust, row and overhead press.

# GymBruh: 12-Month Strength & Aesthetics Plan

A 52-week gym program: **3 days a week** (Push / Pull / Legs), **no cardio**, **no squats, no deadlifts**, **abs every session**, built for **strength and aesthetics**.

**Live app: [gymbruh-orcin.vercel.app](https://gymbruh-orcin.vercel.app)** · an offline iPhone web app that opens on today's workout, with rest timers, optional weight logging and progress stats. To install it, open the link in Safari, then tap **Share** → **Add to Home Screen**.

| Your requirement | How the plan meets it |
|---|---|
| No cardio | Sessions start with a 10-min warm-up instead of a cardio block, so you lift fresh and sessions take about 1 h to 1 h 30. Walking 7-10k steps a day covers heart health and helps with fat loss. |
| No squats | Quads are trained with the leg press, lunges, step-ups and leg extensions. |
| No deadlifts | The posterior chain is trained with hip thrusts, back extensions and leg curls. Rows are unracked from safeties, so you never pull a bar off the floor. |
| 3 days per week | **Push / Pull / Legs**: Push (chest, shoulders, triceps), Pull (back, rear delts, biceps), Legs (quads, glutes, hamstrings, calves). Side delts get work on Push and Pull days, and abs every session. |
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

- **Today:** opens on your next workout as a compact list. Tap **Start**, follow it, then tap **Finish**, which marks every exercise done. The pinned header shows how much is ticked off, and the next exercise is marked **Up next**.
- **Weights (optional):** tap an exercise to open it and set the weight with **− / +** (2.5 kg steps), or tap the number to type. One weight covers all sets, and **Last 60 kg** / **Suggested** fill it in with one tap. Use **Different weight per set** when you need it (top-set weeks open that way automatically). Bodyweight exercises have nothing to log. Tap **Close** when you're done.
- **Rest timer:** each exercise has a ⏱ button with its suggested rest time. Tap it after each set: it ticks the set off (the dots under the button) and a popup counts down, beeps, and closes by itself. −15 / +15 adjust it, and **Hide** shrinks it to a small pill so you can keep using the workout. The screen stays on while it runs (where iOS allows it).
- **Help & safety nets:** a one-time "How it works" card, a **Terms** guide (RIR, RPE, %, e1RM, supersets, deloads) one tap away, **Undo** after skipping, discarding or deleting, and a finish screen that shows which weights went up since last time.
- **Plan:** every week and session of the year, showing which are done, skipped or next.
- **History:** a calendar with your workout days marked A/B/C, plus duration and volume for each workout.
- **Stats:** totals, week streak, rest days, a 26-week activity heatmap, weekly charts (workouts, duration, volume, reps), muscle balance (radar, compared with the previous period or, for the current week, the same days of last week), fatigue, strength trends (e1RM of the main lifts) and planned vs done weekly sets per muscle. Tap a bar or a heatmap square to see that week or day.
- **Settings:** a color theme (9 accent colors, Dark / Black / Midnight backgrounds), start at any week, offline status, export/import, and reset.
- **Works offline and stays private:** after the first open with internet, everything (workouts, timers, weight logging, stats, history) runs with no connection, and Settings → Offline shows "Ready to use offline". Your data is stored only on your phone. Use Settings → Export for a backup.

**Install on iPhone:** open the site in Safari → **Share** → **Add to Home Screen**.

The app has no build step, and Vercel serves the `web/` folder as-is (see [`vercel.json`](vercel.json)). To change the plan, edit [`scripts/generate.py`](scripts/generate.py), then run `python3 scripts/generate.py`. That rewrites this README, the month files, the tracker and `web/plan.json` together.

## Weekly schedule

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|
| **Push** (A) | Rest | **Pull** (B) | Rest | **Legs** (C) | Rest | Rest |

Tue/Thu/Sat or Sun/Tue/Thu work just as well. Keep at least one rest day between sessions when you can, and never train 3 days in a row. On rest days, walk 7-10k steps.

## How every session runs

| Block | Time | What you do |
|---|---|---|
| 1. Warm-up | 10 min | Easy bike or rower, mobility, ramp-up sets ([details](#warm-up-10-min)) |
| 2. Main lifts | 20-30 min | 2 heavy compound lifts |
| 3. Accessories | 20-30 min | Supersets, to save time |
| 4. Abs | 8-10 min | 2 exercises, done as a superset |

**Total: about 1 h to 1 h 30** (leg day in the strength months is the longest).

---

## The year at a glance

Each "month" is a **4-week training block**. Every quarter ends with a **flex week**, so 12 × 4 + 4 = **52 weeks**.

| Month | Weeks | Phase | Main lifts | Accessories | Week 4 |
|---|---|---|---|---|---|
| [**1**](months/01-foundation.md) | 1-4 | Foundation | 3×10 @ RIR 4→2 | 3×12-15 | Normal |
| [**2**](months/02-hypertrophy-1.md) | 5-8 | Hypertrophy I | 4×8 @ RIR 3→1 | 3×10-15 | Deload |
| [**3**](months/03-hypertrophy-2.md) | 9-12 | Hypertrophy II | 4×8→4×6 @ RIR 2→1 | 4×8-10 / 3×10-15 + drop sets | Normal, then Flex wk 13 |
| [**4**](months/04-strength-accumulation.md) | 14-17 | Strength I: Accumulation | 5×5 @ 75→82.5% | 3×8-12 | Normal |
| [**5**](months/05-strength-intensification.md) | 18-21 | Strength II: Intensification | 5×4→4×3 @ 82.5→87.5% | 3×6-12 | Deload |
| [**6**](months/06-strength-realization-test.md) | 22-25 | Strength III: Realization & Test | Top set + back-offs, then TEST | 3×6-12 | Test, then Flex wk 26 |
| [**7**](months/07-hypertrophy-volume.md) | 27-30 | Hypertrophy III: Volume | 4×10→4×8 @ 67.5→75% | 4×10-12 / 3×12-15 | Normal |
| [**8**](months/08-aesthetic-specialization.md) | 31-34 | Aesthetic Specialization (V-Taper) | 3×6 @ 75→80% (maintain) | +1 set V-taper, myo-reps | Deload |
| [**9**](months/09-powerbuilding.md) | 35-38 | Powerbuilding | Top set + back-offs | 3×8-15 + drop sets | Normal, then Flex wk 39 |
| [**10**](months/10-strength-peak.md) | 40-43 | Strength Peak & Test | 5×3 → singles, then TEST | 3×6-8 / 2×10-12 | Test |
| [**11**](months/11-definition-1.md) | 44-47 | Definition I: Lean Out | 3×5 @ 77.5→82.5% | 3×10-15, short rest | Deload |
| [**12**](months/12-definition-2-final.md) | 48-51 | Definition II: Final Assessment | 3×6→3×4, then FINAL test | 3×12-20 + drop sets | Final, then Flex wk 52 |

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

| Quarter | Day A: Push | Day B: Pull | Day C: Legs |
|---|---|---|---|
| **Q1**<br>Build the Base: Foundation & Hypertrophy | 1. Barbell Bench Press<br>2. Standing Overhead Press<br>3. Incline Dumbbell Press (30°)<br>4a. Cable Lateral Raise<br>4b. Rope Triceps Pushdown<br>5a. Pec Deck Fly<br>5b. Overhead Cable Triceps Extension<br>6a. Hanging Knee Raise<br>6b. Cable Crunch | 1. Barbell Row<br>2. Pull-up (add weight once 3×10 is easy)<br>3. Lat Pulldown (wide grip)<br>4a. Face Pull<br>4b. Incline Dumbbell Curl<br>5a. Dumbbell Lateral Raise<br>5b. Hammer Curl<br>6a. Kneeling Ab Wheel Rollout<br>6b. Pallof Press | 1. Leg Press<br>2. Barbell Hip Thrust<br>3. Dumbbell Walking Lunge<br>4a. Leg Extension<br>4b. Lying Leg Curl<br>4c. Standing Calf Raise<br>5a. 45° Back Extension<br>5b. Seated Leg Curl<br>5c. Seated Calf Raise<br>6a. Reverse Crunch<br>6b. Side Plank |
| **Q2**<br>Get Strong: Strength | 1. Barbell Bench Press<br>2. Standing Overhead Press<br>3. Incline Barbell Press (30°)<br>4a. Cable Lateral Raise<br>4b. Straight-Bar Triceps Pushdown<br>5a. Cable Crossover<br>5b. EZ-Bar Skull Crusher<br>6a. Hanging Leg Raise (straight legs)<br>6b. Weighted Cable Crunch | 1. Barbell Row<br>2. Weighted Pull-up<br>3. Chest-Supported Row (T-bar or dumbbell)<br>4a. Reverse Pec Deck<br>4b. Hammer Curl<br>5a. Dumbbell Lateral Raise<br>5b. EZ-Bar Curl<br>6a. Ab Wheel Rollout (kneeling, full range)<br>6b. Suitcase Carry | 1. Leg Press<br>2. Barbell Hip Thrust<br>3. Dumbbell Reverse Lunge<br>4a. Leg Extension<br>4b. Seated Leg Curl<br>4c. Seated Calf Raise<br>5a. 45° Back Extension<br>5b. Lying Leg Curl<br>5c. Standing Calf Raise<br>6a. Incline Reverse Crunch<br>6b. Weighted Side Plank |
| **Q3**<br>Build the Look: Hypertrophy & Aesthetics | 1. Barbell Bench Press<br>2. Standing Overhead Press<br>3. Incline Dumbbell Press (30°)<br>4a. Cable Y-Raise<br>4b. Overhead Rope Triceps Extension<br>5a. Low-to-High Cable Fly<br>5b. Single-Arm Cable Pushdown<br>5c. Lean-Away Cable Lateral Raise<br>6a. Toes-to-Bar (or Hanging Leg Raise)<br>6b. Weighted Decline Crunch | 1. Barbell Row<br>2. Weighted Pull-up<br>3. Wide-Grip Lat Pulldown<br>4a. Straight-Arm Cable Pulldown<br>4b. Bayesian Cable Curl<br>5a. Rear-Delt Cable Fly<br>5b. Preacher Curl<br>6a. Ab Wheel Rollout (from feet, shortened range)<br>6b. Cable Woodchopper (high to low) | 1. Leg Press<br>2. Barbell Hip Thrust<br>3. High-Box Dumbbell Step-up<br>4a. Leg Extension<br>4b. Lying Leg Curl<br>4c. Seated Calf Raise<br>5a. 45° Back Extension<br>5b. Seated Leg Curl<br>5c. Standing Calf Raise<br>6a. Dragon Flag Negative<br>6b. Hollow Body Hold |
| **Q4**<br>Peak & Reveal: Strength Peak & Definition | 1. Barbell Bench Press<br>2. Standing Overhead Press<br>3. Low-Incline Barbell Press (15-30°)<br>4a. Cable Lateral Raise<br>4b. Rope Triceps Pushdown<br>5a. Weighted Dips<br>5b. EZ-Bar Skull Crusher<br>6a. Weighted Hanging Leg Raise<br>6b. Heavy Cable Crunch | 1. Barbell Row<br>2. Weighted Pull-up<br>3. Neutral-Grip Lat Pulldown<br>4a. Face Pull<br>4b. Incline Dumbbell Curl<br>5a. Machine Chest-Supported Row<br>5b. EZ-Bar Curl<br>5c. Dumbbell Lateral Raise<br>6a. Ab Wheel Rollout (from feet)<br>6b. Half-Kneeling Pallof Press + Overhead Reach | 1. Leg Press<br>2. Barbell Hip Thrust<br>3. Deficit Dumbbell Reverse Lunge<br>4a. Leg Extension<br>4b. Seated Leg Curl<br>4c. Standing Calf Raise<br>5a. 45° Back Extension<br>5b. Lying Leg Curl<br>5c. Seated Calf Raise<br>6a. Dragon Flag<br>6b. L-Sit Hold (dip bars or parallettes) |

## The six main lifts

| Lift | Day | Why it's in the plan |
|---|---|---|
| Barbell Bench Press | A · Push | Chest size and upper-body pressing strength |
| Standing Overhead Press | A · Push | Shoulder size and pressing strength |
| Barbell Row | B · Pull | A thick upper back. The bar is unracked from safeties at knee height, never pulled off the floor. |
| Weighted Pull-up | B · Pull | Lat width, the core of the V-taper |
| Leg Press | C · Legs | Heavy quad and glute work with no barbell on your spine. It replaces the squat. |
| Barbell Hip Thrust | C · Legs | The strongest glute builder. It covers the posterior chain instead of deadlifts. |

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
| **Superset** | Exercises with the same number (4a/4b) are done back to back, then you rest. |
| **Drop set** | Finish the set, drop the weight about 25%, and keep going to RIR 0-1. |
| **Rest-pause** | Finish the set, rest 15 s, rep out again, and repeat once more. |
| **Myo-reps** | One set to RIR 1, then 3-4 mini-sets of 3-5 reps with 15 s rest between them. |
| **Deload** | A planned easy week (half the sets, lighter weights) to clear fatigue. |
| **Ramp-up sets** | Lighter sets before your working sets (for example 50% ×8 → 70% ×5 → 85% ×3) so the heavy sets go smoothly. |

## The maths

### 1. Estimated 1-rep max (RIR-adjusted Epley)

```math
\widehat{1RM} = w \left( 1 + \frac{r + \text{RIR}}{30} \right)
```

$w$ = weight lifted, $r$ = reps completed, RIR = reps you had left. It's most accurate when $r + \text{RIR} \le 10$.

Example: 80 kg × 6 reps at RIR 1 → $80 \times \left(1 + \tfrac{7}{30}\right) \approx 98.7$ kg.

### 2. Working weight from a percentage

```math
w_{\text{work}} = 2.5 \times \left\lfloor \frac{p \cdot \widehat{1RM}}{2.5} \right\rfloor
```

In words: multiply, then round **down** to the nearest 2.5 kg. Example: $p = 0.775$ and $\widehat{1RM} = 98.7$ give $76.5$, so you load **75 kg**.

### 3. Weighted pull-ups (your bodyweight counts)

```math
\widehat{1RM}_{\text{total}} = (BW + w_{\text{added}}) \left( 1 + \frac{r + \text{RIR}}{30} \right)
\qquad\qquad
w_{\text{added}} = p \cdot \widehat{1RM}_{\text{total}} - BW
```

If $w_{\text{added}} < 0$, use that much assistance (assisted machine or band) instead.

Example: $BW = 75$ kg, +10 kg × 6 reps at RIR 0 gives $\widehat{1RM}_{\text{total}} = 85 \times 1.2 = 102$ kg. At $p = 0.80$: $81.6 - 75 = 6.6$, so add **5 kg**.

### 4. Accessory progression (double progression)

Stay inside the rep range. When **every** set reaches the top of the range at the target RIR, add weight and start again at the bottom of the range:

```math
w_{\text{next}} =
\begin{cases}
w + (1 \text{ to } 2.5)\ \text{kg} & \text{upper body} \\
w + (2.5 \text{ to } 5)\ \text{kg} & \text{lower body}
\end{cases}
```

### 5. Main-lift autoregulation

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

- **Main lifts:** follow the month's week-by-week table. From Month 4 on, use the % of your e1RM or tested 1RM, and adjust with rule 5 above.
- **Accessories and isolation:** double progression (rule 4). Write down every set.
- **Abs:** first add reps or hold time, then add load, then move to the harder variation in the next quarter.
- **Technique always wins.** A rep with bad form doesn't count toward progression.

## No cardio: steps instead

- **Lift fresh.** There's no cardio block, so nothing tires you out before the heavy sets. The 10-min warm-up is all you need.
- **Walk every day.** 7-10k steps a day (8-10k in Months 11-12) keeps your heart healthy and does the fat-loss work alongside the calorie deficit, without costing you strength.
- **Fuel it.** Eat a meal with carbs and protein 1.5-3 h before training, and drink 500 ml+ of water during the session.

## Abs strategy

Every session has **2 ab exercises done as a superset**, about **6 hard sets per session and 18 per week**. Abs recover quickly, so this frequency is fine. Every quarter covers all four jobs your core does:

| Quarter | Flexion (the "six-pack") | Anti-extension | Anti-rotation / lateral |
|---|---|---|---|
| Q1 | Hanging knee raise, cable crunch, reverse crunch | Kneeling ab wheel (partial → full range) | Pallof press, side plank |
| Q2 | Straight-leg hanging raise, weighted cable crunch, incline reverse crunch | Full-range kneeling ab wheel with a pause | Suitcase carry, weighted side plank |
| Q3 | Toes-to-bar, weighted decline crunch | Ab wheel from the feet (shortened range), dragon flag negatives, hollow hold | Cable woodchopper |
| Q4 | Weighted hanging leg raise, heavy cable crunch | Ab wheel from the feet, dragon flags, L-sit | Half-kneeling Pallof press + overhead reach |

**Visible abs = developed muscle + low body fat.** Abs usually show at about **10-14% body fat (men)** or **18-22% (women)**. The training builds the muscle, and the Month 11-12 calorie deficit brings body fat down so you can see it.

## Warm-up (10 min)

1. **Get warm:** 5 min easy bike, rower or incline walk. It's only to raise your body temperature, so keep it easy.
2. **Mobility (one round):** band pull-aparts ×15, scapular push-ups ×10, cat-cow ×8, leg swings ×10/side, glute bridges ×10, wall slides ×10.
3. **Ramp-up sets, first main lift:** 40-50% ×8 → 60-70% ×5 → 80-85% ×2-3 → working sets.
4. **Ramp-up sets, second main lift:** 60% ×5 → 80% ×3 → working sets.

## Weekly volume per muscle

Hard sets per muscle in a normal (non-deload) week of each month. Secondary muscles count as half a set (for example, one bench set = 1 chest + 0.5 triceps + 0.5 shoulders). About **10-20 weekly sets** per muscle is the usual target for growth. Shoulders and abs sit at the top of that range on purpose, for the V-taper and the abs you asked for. With Push / Pull / Legs, each muscle gets its week's sets in one focused session (side delts and abs are spread over several days).

| Muscle | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Chest | 9 | 10 | 11 | 11 | 11 | 10 | 11 | 11 | 10 | 10 | 9 | 9 |
| Back | 10.5 | 12.5 | 13.5 | 13 | 13 | 11 | 15 | 14 | 14 | 15 | 13.5 | 13.5 |
| Shoulders | 15 | 16.5 | 17 | 18 | 18 | 16.5 | 17 | 17.5 | 16.5 | 15 | 16.5 | 16.5 |
| Biceps | 10.5 | 11.5 | 12 | 12.5 | 12.5 | 11.5 | 12 | 11 | 11.5 | 11 | 12 | 12 |
| Triceps | 10.5 | 11.5 | 12 | 12.5 | 12.5 | 11.5 | 12 | 11 | 11.5 | 11 | 12 | 12 |
| Quads | 9 | 10 | 11 | 11 | 11 | 10 | 11 | 9 | 10 | 9 | 9 | 9 |
| Hamstrings | 9 | 9.5 | 10 | 10 | 10 | 9.5 | 10 | 9 | 9.5 | 7.5 | 9 | 9 |
| Glutes | 9 | 10.5 | 12 | 12 | 12 | 10.5 | 12 | 9 | 10.5 | 10.5 | 9 | 9 |
| Calves | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 4 | 6 | 6 |
| Abs | 18 | 18 | 19 | 18 | 19 | 20 | 18 | 18 | 19 | 19 | 18 | 18 |

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

Daily energy use with this plan (3 lifting sessions, plus 7-10k steps a day):

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

- **Missed 1 session:** do it on your next training day and keep the Push → Pull → Legs order.
- **Missed a full week:** repeat the last week you completed.
- **Sick for 2+ weeks:** take the next flex week early, then restart from the last week you completed with loads 10% lighter.
- **Short on time:** drop the last isolation superset (5a/5b/5c). Never drop the main lifts or the abs: those are the core of what you asked for.

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

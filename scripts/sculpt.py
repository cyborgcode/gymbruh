"""Girl mode: the 12-Month Sculpt plan (3 days a week: glutes, shape, posture
and strength), turned into app data for web/plan-girl.json. Same schema as
web/plan.json, so the app runs either plan. Called from generate.py.

Four 13-week phases. In every phase, weeks 1-4 are RIR 3, 5-8 RIR 2, 9-12
RIR 1 and week 13 is an easy week with a test set.
"""
import math

MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps",
           "Quads", "Hamstrings", "Glutes", "Calves", "Abs"]

# Rest: 2-3 min on big lifts, 60-90 s on small ones.
REST = {"M": 150, "C": 120, "I": 60, "X": 60}


def ex(name, slot, muscles, cue, lift=None, bw=False):
    return dict(name=name, slot=slot, muscles=muscles, cue=cue, lift=lift, bw=bw)


# ------------------------------------------------------------------ exercises
# The same name across phases keeps "Last 40 kg" working from phase to phase.
GLUTE_BRIDGE = ex("Glute Bridge", "C", {"Glutes": 1, "Hamstrings": .5},
                  "Feet flat, drive through your heels and squeeze the glutes for 1 s at the top. Rest a dumbbell on your hips once 15 reps are easy.")
HIP_THRUST = ex("Barbell Hip Thrust", "C", {"Glutes": 1, "Hamstrings": .5},
                "Upper back on the bench, chin tucked, ribs down. Shins vertical at the top, squeeze 1 s.", lift="hipthrust")
DB_RDL = ex("Dumbbell Romanian Deadlift", "C", {"Hamstrings": 1, "Glutes": .5},
            "Hips back, flat back, soft knees. Lower until you feel the hamstrings stretch.")
RDL = ex("Barbell Romanian Deadlift", "C", {"Hamstrings": 1, "Glutes": .5},
         "Bar close to your legs, hips back, flat back, soft knees. Lower until the hamstrings stretch.", lift="rdl")
LEG_PRESS_HIGH = ex("Leg Press (feet high)", "C", {"Quads": 1, "Glutes": .5},
                    "Higher feet put more work on the glutes. Lower until your hips are about to lift off the pad.")
LEG_PRESS_WIDE = ex("Leg Press (feet high and wide)", "C", {"Quads": 1, "Glutes": .5},
                    "Feet high and wide on the platform for more glutes. Don't lock the knees at the top.")
SEATED_CURL = ex("Seated Hamstring Curl", "I", {"Hamstrings": 1}, "Lean forward a little for a bigger stretch, control the way up.")
LYING_CURL = ex("Lying Hamstring Curl", "I", {"Hamstrings": 1}, "Press your hips into the pad, 2-3 s on the way down.")
HAM_CURL = ex("Hamstring Curl", "I", {"Hamstrings": 1}, "Seated or lying. Squeeze at the top, 2-3 s on the way down.")
ABDUCTION = ex("Hip Abduction Machine", "I", {"Glutes": 1}, "Lean slightly forward and push the knees out with your glutes.")
DB_SHOULDER = ex("Seated Dumbbell Shoulder Press", "C", {"Shoulders": 1, "Triceps": .5},
                 "Back against the pad, press up without arching, lower to ear level.")
OHP = ex("Overhead Press", "C", {"Shoulders": 1, "Triceps": .5},
         "Barbell or dumbbells. Squeeze glutes and abs, press straight up.")
ARNOLD = ex("Arnold Press", "C", {"Shoulders": 1, "Triceps": .5},
            "Start with palms facing you, rotate them forward as you press up.")

PULLDOWN = ex("Lat Pulldown", "C", {"Back": 1, "Biceps": .5}, "Pull your elbows down to your ribs, chest up.")
ASSIST_PULLUP = ex("Assisted Pull-up or Lat Pulldown", "C", {"Back": 1, "Biceps": .5},
                   "Assisted machine or band, or the lat pulldown. Elbows down to your ribs.")
PULLUP = ex("Pull-up", "C", {"Back": 1, "Biceps": .5}, "Assisted or bodyweight. Dead hang to chin over the bar.")
PULLUP_OR_PD = ex("Pull-up or Lat Pulldown", "C", {"Back": 1, "Biceps": .5},
                  "Pull-ups (assisted if needed) or the lat pulldown. Elbows down to your ribs.")
CLOSE_PD = ex("Close-Grip Lat Pulldown", "C", {"Back": 1, "Biceps": .5}, "Close neutral handle, pull to the upper chest.")
WIDE_PD = ex("Wide-Grip Lat Pulldown", "C", {"Back": 1, "Biceps": .5}, "Hands wide, pull the elbows down and out, squeeze the lats.")
INCLINE_DB = ex("Incline Dumbbell Press", "C", {"Chest": 1, "Shoulders": .5, "Triceps": .5},
                "Bench at about 30°, elbows at 45°, lower slowly to the upper chest.")
BENCH = ex("Bench Press", "C", {"Chest": 1, "Shoulders": .5, "Triceps": .5},
           "Barbell or dumbbells. Shoulder blades squeezed, feet planted, lower to mid-chest.", lift="bench")
CABLE_ROW = ex("Seated Cable Row", "C", {"Back": 1, "Biceps": .5}, "Sit tall, pull to your belly button, squeeze the shoulder blades.")
CS_DB_ROW = ex("Chest-Supported Dumbbell Row", "C", {"Back": 1, "Biceps": .5},
               "Chest on an incline bench, pull the elbows back, squeeze the shoulder blades.")
ROW_OR_CS = ex("Barbell or Chest-Supported Row", "C", {"Back": 1, "Biceps": .5},
               "Flat back, pull to the lower ribs, squeeze the shoulder blades.")
ONE_ARM_ROW = ex("One-Arm Dumbbell Row", "C", {"Back": 1, "Biceps": .5}, "Hand on the bench, pull the elbow toward your hip.")
LAT_RAISE = ex("Dumbbell Lateral Raise", "I", {"Shoulders": 1},
               "Wider shoulders make the waist look smaller. Lead with the elbows, stop at shoulder height.")
FACE_PULL = ex("Face Pull", "I", {"Shoulders": 1, "Back": .5}, "For posture. Pull to your forehead, thumbs back.")
REVERSE_FLY = ex("Reverse Fly", "I", {"Shoulders": 1, "Back": .5}, "Arms long, sweep wide, squeeze the rear delts.")
CURL = ex("Biceps Curl", "I", {"Biceps": 1}, "Elbows still, no swinging, 2-3 s on the way down.")
PUSHDOWN = ex("Triceps Pushdown", "I", {"Triceps": 1}, "Elbows pinned to your sides, full lockout.")
EZ_CURL = ex("EZ-Bar Curl", "I", {"Biceps": 1}, "Elbows still, no swinging, 2-3 s on the way down.")
OH_EXT = ex("Overhead Triceps Extension", "I", {"Triceps": 1}, "Deep stretch behind the head, elbows pointing up.")

GOBLET = ex("Goblet Squat", "C", {"Quads": 1, "Glutes": .5}, "Chest up, sit between your heels.")
SQUAT_OR_LP = ex("Back Squat or Leg Press", "C", {"Quads": 1, "Glutes": .5},
                 "Squat: brace, sit between your heels, knees over toes. Leg press: lower until your hips nearly lift off the pad.")
SQUAT = ex("Back Squat", "C", {"Quads": 1, "Glutes": .5}, "Brace hard, sit between your heels, knees over toes.", lift="squat")
SQUAT_OR_HACK = ex("Back Squat or Hack Squat", "C", {"Quads": 1, "Glutes": .5}, "Brace, control the way down, drive up through the whole foot.")
REV_LUNGE = ex("Dumbbell Reverse Lunge", "C", {"Quads": 1, "Glutes": .5}, "Step back, front shin close to vertical, push through the front heel.")
DEFICIT_LUNGE = ex("Deficit Reverse Lunge", "C", {"Quads": 1, "Glutes": .5}, "Stand on a 5-10 cm step and step back for a deeper stretch.")
WALK_LUNGE = ex("Walking Lunge", "C", {"Quads": 1, "Glutes": .5}, "Long stride, back knee lightly touches the floor.")
BSS = ex("Bulgarian Split Squat", "C", {"Quads": 1, "Glutes": .5}, "Back foot on a bench. Lean slightly forward for more glutes.")
STEP_UP = ex("Step-up", "C", {"Quads": 1, "Glutes": .5}, "Knee-height box. Drive through the front heel, don't push off the back foot.")
B_STANCE = ex("B-Stance Hip Thrust", "C", {"Glutes": 1, "Hamstrings": .5}, "Most of the weight on the front leg, back foot only for balance.")
BACK_EXT = ex("45° Back Extension", "I", {"Glutes": 1, "Hamstrings": .5}, "Round the upper back slightly and squeeze the glutes to rise.")
LEG_EXT = ex("Leg Extension", "I", {"Quads": 1}, "Squeeze 1 s at the top, lower slowly.")
KICKBACK = ex("Cable Glute Kickback", "I", {"Glutes": 1}, "Lean forward a little, kick back and slightly out, squeeze at the top.")

PLANK = ex("Plank", "X", {"Abs": 1}, "Elbows under shoulders, squeeze the glutes, ribs down.", bw=True)
SIDE_PLANK = ex("Side Plank", "X", {"Abs": 1}, "Straight line from ear to ankle, hips high.", bw=True)
PALLOF = ex("Pallof Press", "X", {"Abs": 1}, "Side-on to the cable, press out and hold 2 s. Don't let it twist you.")
AB_WHEEL = ex("Ab Wheel Rollout", "X", {"Abs": 1}, "Ribs down, glutes tight, roll out only as far as your lower back stays flat.", bw=True)
CABLE_CRUNCH = ex("Cable Crunch", "X", {"Abs": 1}, "Round the spine and bring the ribs to the pelvis. Hips stay still.")


def E(label, exercise, sets, reps, note=None, main=False):
    """One row of a day: label (3a/3b = superset), exercise, sets, reps, an
    optional note (added in front of the tip) and whether it's a main lift."""
    return dict(label=label, ex=exercise, sets=sets, reps=reps, note=note, main=main)


# Glute bridge in weeks 1-4, barbell hip thrust from week 5.
BRIDGE_THEN_THRUST = (GLUTE_BRIDGE, HIP_THRUST, 5)

PHASES = [
    dict(name="Foundation", focus="Learn the movements and build the habit", reps="10-15",
         technique="10-15 reps with light weights. Lower for 2-3 s and squeeze hard at the top. The glute bridge becomes a barbell hip thrust in week 5.",
         days={
             "1": ("Glutes & Hamstrings", [
                 E("1", BRIDGE_THEN_THRUST, 3, "12-15"),
                 E("2", DB_RDL, 3, "10-12"),
                 E("3", LEG_PRESS_HIGH, 3, "10-12"),
                 E("4", SEATED_CURL, 2, "12-15"),
                 E("5", ABDUCTION, 2, "15-20"),
                 E("6", DB_SHOULDER, 2, "10-12"),
             ]),
             "2": ("Upper Body & Core", [
                 E("1", PULLDOWN, 3, "10-12"),
                 E("2", INCLINE_DB, 3, "10-12"),
                 E("3", CABLE_ROW, 3, "10-12"),
                 E("4", LAT_RAISE, 3, "12-15"),
                 E("5", FACE_PULL, 2, "15"),
                 E("6a", CURL, 2, "12"), E("6b", PUSHDOWN, 2, "12"),
                 E("7", PLANK, 3, "20-40 s"),
             ]),
             "3": ("Glutes & Quads", [
                 E("1", GOBLET, 3, "10-12"),
                 E("2", REV_LUNGE, 3, "10 per leg"),
                 E("3", BACK_EXT, 3, "12-15"),
                 E("4", LEG_EXT, 2, "12-15"),
                 E("5", KICKBACK, 2, "12-15 per leg"),
                 E("6", ONE_ARM_ROW, 3, "10-12 per arm"),
                 E("7", PALLOF, 2, "10 per side"),
             ]),
         }),
    dict(name="Build", focus="Grow muscle in glutes, shoulders and back", reps="8-12",
         technique="8-12 reps, heavier weights, more sets. Lower for 2-3 s and squeeze hard at the top.",
         days={
             "1": ("Glutes & Hamstrings", [
                 E("1", HIP_THRUST, 4, "8-12"),
                 E("2", RDL, 3, "8-10"),
                 E("3", BSS, 3, "8-10 per leg"),
                 E("4", LYING_CURL, 3, "10-12"),
                 E("5", ABDUCTION, 3, "15-20"),
                 E("6", DB_SHOULDER, 3, "8-12"),
             ]),
             "2": ("Upper Body & Core", [
                 E("1", ASSIST_PULLUP, 4, "6-10"),
                 E("2", INCLINE_DB, 3, "8-12"),
                 E("3", CS_DB_ROW, 3, "10-12"),
                 E("4", LAT_RAISE, 4, "12-15"),
                 E("5", REVERSE_FLY, 3, "12-15"),
                 E("6a", EZ_CURL, 3, "10-12"), E("6b", OH_EXT, 3, "10-12"),
                 E("7", AB_WHEEL, 3, "6-10", note="From the knees"),
             ]),
             "3": ("Glutes & Quads", [
                 E("1", SQUAT_OR_LP, 4, "6-10"),
                 E("2", WALK_LUNGE, 3, "10-12 per leg"),
                 E("3", B_STANCE, 3, "10-12 per leg"),
                 E("4", LEG_EXT, 3, "12-15"),
                 E("5", KICKBACK, 3, "12-15 per leg"),
                 E("6", ONE_ARM_ROW, 3, "8-12 per arm"),
                 E("7", SIDE_PLANK, 3, "20-40 s per side"),
             ]),
         }),
    dict(name="Strength", focus="Lift heavier on the main lifts", reps="5-8",
         technique="Main lifts: rest 2-3 min and keep RIR 2 all phase. Push the other exercises harder.",
         days={
             "1": ("Heavy Glutes & Hamstrings", [
                 E("1", HIP_THRUST, 4, "6-8", main=True),
                 E("2", RDL, 4, "6-8", main=True),
                 E("3", STEP_UP, 3, "8-10 per leg"),
                 E("4", HAM_CURL, 3, "10-12"),
                 E("5", ABDUCTION, 3, "15-20", note="1 s pause at the top"),
                 E("6", OHP, 3, "6-8"),
             ]),
             "2": ("Heavy Upper Body", [
                 E("1", PULLUP, 4, "5-8", main=True),
                 E("2", BENCH, 4, "6-8", main=True),
                 E("3", ROW_OR_CS, 3, "8-10"),
                 E("4", LAT_RAISE, 4, "12-15"),
                 E("5", FACE_PULL, 3, "15"),
                 E("6a", CURL, 3, "10-12"), E("6b", PUSHDOWN, 3, "10-12"),
                 E("7", AB_WHEEL, 3, "8-10"),
             ]),
             "3": ("Heavy Quads & Glutes", [
                 E("1", SQUAT, 4, "5-6", main=True),
                 E("2", BSS, 3, "6-8 per leg", note="Heavy dumbbells", main=True),
                 E("3", BACK_EXT, 3, "10-12", note="Weighted: hold a plate or dumbbell"),
                 E("4", LEG_EXT, 3, "10-12"),
                 E("5", KICKBACK, 3, "12-15 per leg"),
                 E("6", CLOSE_PD, 3, "8-10"),
                 E("7", SIDE_PLANK, 3, "30-45 s per side"),
             ]),
         }),
    dict(name="Sculpt", focus="More volume and finishers for shape", reps="8-15",
         technique="Keep the strength and add shape. Drop set: right after your last set, cut the weight about 25% and do as many clean reps as you can. Top hold: after your last rep, hold the squeezed top position for 10 seconds.",
         days={
             "1": ("Glutes & Hamstrings", [
                 E("1", HIP_THRUST, 4, "8-10", note="Top hold on the last set"),
                 E("2", RDL, 3, "8-10"),
                 E("3", DEFICIT_LUNGE, 3, "10 per leg"),
                 E("4a", HAM_CURL, 3, "12"), E("4b", BACK_EXT, 3, "15"),
                 E("5", ABDUCTION, 3, "20", note="Drop set on the last set"),
                 E("6", ARNOLD, 3, "10-12"),
             ]),
             "2": ("Upper Body & Core", [
                 E("1", PULLUP_OR_PD, 4, "6-10"),
                 E("2", INCLINE_DB, 3, "8-12"),
                 E("3", CABLE_ROW, 3, "10-12"),
                 E("4", LAT_RAISE, 4, "12-15", note="Drop set on the last set"),
                 E("5a", REVERSE_FLY, 3, "15"), E("5b", FACE_PULL, 3, "15"),
                 E("6a", CURL, 3, "12"), E("6b", PUSHDOWN, 3, "12"),
                 E("7", CABLE_CRUNCH, 3, "12-15"),
             ]),
             "3": ("Quads & Glutes", [
                 E("1", SQUAT_OR_HACK, 4, "8-10"),
                 E("2", BSS, 3, "10 per leg"),
                 E("3", LEG_PRESS_WIDE, 3, "12-15"),
                 E("4", LEG_EXT, 3, "15", note="Drop set on the last set"),
                 E("5", KICKBACK, 3, "15 per leg"),
                 E("6", WIDE_PD, 3, "10-12"),
                 E("7", PALLOF, 3, "10 per side"),
             ]),
         }),
]

EASY_NOTE = ("Easy week: half the sets, about 20% lighter. Test: at the start of the week, do one hard set of "
             "3-8 reps on your main lifts and estimate your max: 1RM ≈ weight × (1 + reps ÷ 30). Keep the rest easy.")
NUTRITION = ("Steps: 7,000-10,000 a day. Protein: about 1.6 g per kg of bodyweight, over 3-4 meals. To lean out, lose "
             "about 0.5% of bodyweight a week; to grow your glutes, eat at maintenance or slightly above. Sleep 7-9 hours.")
BASE = "Pick a weight that leaves the target RIR. Once you hit the top of the rep range on every set, add the smallest weight jump."


def effort(pw):
    return "RIR 3" if pw <= 4 else "RIR 2" if pw <= 8 else "RIR 1"


def month_of(pw):
    return 0 if pw <= 4 else 1 if pw <= 8 else 2


def estimate_minutes(exs):
    total, seen = 10.0, set()  # 8-10 min warm-up
    for x in exs:
        if x["group"]:
            if x["group"] in seen:
                continue
            seen.add(x["group"])
            members = [y for y in exs if y["group"] == x["group"]]
            rounds = max(len(y["sets"]) for y in members)
            total += rounds * (len(members) * 50 + members[0]["rest"]) / 60
        else:
            total += len(x["sets"]) * (50 + x["rest"]) / 60
    return int(round(total / 5) * 5)


def build():
    exercises, ids = {}, {}

    def exercise_id(e, cue):
        key = (e["name"], cue)
        if key not in ids:
            ids[key] = f"g{len(ids) + 1}"
            exercises[ids[key]] = dict(name=e["name"], cue=cue, muscles=e["muscles"], lift=e["lift"], bw=e["bw"])
        return ids[key]

    def rows(phase, day, pw):
        out = []
        for r in phase["days"][day][1]:
            e = r["ex"]
            if isinstance(e, tuple):  # glute bridge -> hip thrust
                e = e[1] if pw >= e[2] else e[0]
            slot = "M" if r["main"] else e["slot"]
            out.append((r, e, slot))
        return out

    def session_ex(phase, day, pw, easy):
        exs = []
        lst = rows(phase, day, pw)
        group_rest = {}
        for r, e, slot in lst:
            if r["label"][-1].isalpha():
                g = r["label"][:-1]
                group_rest[g] = max(group_rest.get(g, 0), REST[slot])
        for r, e, slot in lst:
            group = r["label"][:-1] if r["label"][-1].isalpha() else None
            n = math.ceil(r["sets"] / 2) if easy else r["sets"]
            if slot == "X":
                eff = "Strict"
            elif easy:
                eff = "Easy, ~20% lighter"
            elif slot == "M":
                eff = "RIR 2"
            else:
                eff = effort(pw)
            cue = f"{r['note']}. {e['cue']}" if r["note"] else e["cue"]
            exs.append(dict(e=exercise_id(e, cue), label=r["label"], slot=slot, group=group,
                            rest=group_rest.get(group) or REST[slot], spec=False,
                            rx=f"{n}×{r['reps']}" + ("" if slot == "X" else f" · {eff}"),
                            sets=[dict(reps=r["reps"], eff=eff, pct=None)] * n))
        return exs

    def weekly_volume(phase, pw):
        vol = {k: 0.0 for k in MUSCLES}
        for day in "123":
            for r, e, slot in rows(phase, day, pw):
                for mus, f in e["muscles"].items():
                    vol[mus] += r["sets"] * f
        return {k: round(v, 1) for k, v in vol.items()}

    sessions, months = [], []
    for p, phase in enumerate(PHASES, start=1):
        w0 = (p - 1) * 13 + 1
        for k, (a, b) in enumerate([(1, 4), (5, 8), (9, 13)]):
            n = (p - 1) * 3 + k + 1
            eff = ["RIR 3 (3 reps left in the tank)", "RIR 2", "RIR 1, then an easy week (week 13): half the sets, about 20% lighter, plus a test set"][k]
            if p == 3:
                eff = "RIR 2 on the main lifts all phase; " + ["RIR 3", "RIR 2", "RIR 1, then an easy week"][k] + " on everything else"
            months.append(dict(
                n=n, title=phase["name"], quarter=p, weeks=[w0 + a - 1, w0 + b - 1],
                goal=f"Phase {p} of 4: {phase['focus']}. Main reps: {phase['reps']}. Effort: {eff}.",
                technique=phase["technique"], nutrition=NUTRITION, base=BASE,
                planned=weekly_volume(phase, a)))
        for pw in range(1, 14):
            wk = w0 + pw - 1
            easy = pw == 13
            for day in "123":
                exs = session_ex(phase, day, pw, easy)
                note = EASY_NOTE if easy else None
                if p == 1 and pw == 5 and day == "1":
                    note = "New this week: the glute bridge becomes a barbell hip thrust."
                sessions.append(dict(
                    id=f"w{wk:02d}-{day}", week=wk, month=(p - 1) * 3 + month_of(pw) + 1, day=day,
                    kind="easy" if easy else "normal", title=f"Week {wk} · Day {day}",
                    dayName=phase["days"][day][0], note=note,
                    technique=None if easy else phase["technique"],
                    est=estimate_minutes(exs), ex=exs))
    return dict(
        name="12-month sculpt plan",
        warmup="5 min easy cardio, glute bridge ×15, banded side steps ×10 each way, bodyweight squat ×10, "
               "then 1-2 light sets of your first exercise.",
        lifts=[["hipthrust", "Hip Thrust"], ["rdl", "Romanian Deadlift"], ["squat", "Back Squat"], ["bench", "Bench Press"]],
        terms=[["Drop set", "Right after your last set, cut the weight about 25% and do as many clean reps as you can."],
               ["Top hold", "After your last rep, hold the squeezed top position for 10 seconds."],
               ["Easy week", "Weeks 13, 26, 39 and 52: half the sets, about 20% lighter, plus one hard test set to estimate your max."]],
        doneText="All 52 weeks are done. Compare your photos and measurements with Month 1, then start a new year "
                 "from Phase 2 with heavier weights (Settings → Start the plan at week 14).",
        muscles=MUSCLES, months=months, exercises=exercises, sessions=sessions)

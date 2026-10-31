#!/usr/bin/env python3
"""Single source of truth for the plan.

Writes the month-by-month markdown, the README, the tracker CSV and the
web app's workout data (web/plan.json). Run from anywhere:

    python3 scripts/generate.py
"""
import csv
import json
import re
import sys
from pathlib import Path

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent

MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps",
           "Quads", "Hamstrings", "Glutes", "Calves", "Abs"]


def ex(name, slot, muscles, cue, spec=False, abs_rx=None):
    return dict(name=name, slot=slot, muscles=muscles, cue=cue, spec=spec, abs_rx=abs_rx)


# ---------------------------------------------------------------- exercises
BENCH = ex("Barbell Bench Press", "M", {"Chest": 1, "Triceps": .5, "Shoulders": .5},
           "Shoulder blades squeezed and down, feet planted, bar to mid-chest, press up and slightly back.")
LEGPRESS = ex("Leg Press", "M", {"Quads": 1, "Glutes": .5},
              "Feet shoulder-width, mid-platform. Lower until your hips are about to lift off the pad. Never lock the knees.")
HIPTHRUST = ex("Barbell Hip Thrust", "M", {"Glutes": 1, "Hamstrings": .5},
               "Upper back on the bench, chin tucked, ribs down. Shins vertical at lockout, 1 s squeeze at the top.")
ROW = ex("Barbell Row", "M", {"Back": 1, "Biceps": .5},
         "Unrack from safeties at knee height so you never pull the bar off the floor. Torso 30-45°, brace, pull to the lower ribs.")
OHP = ex("Standing Overhead Press", "M", {"Shoulders": 1, "Triceps": .5},
         "Squeeze glutes and abs, bar travels straight up, push your head through at lockout.")
PULLUP_Q1 = ex("Pull-up (add weight once 3×10 is easy)", "M", {"Back": 1, "Biceps": .5},
               "Dead hang to chin over the bar. Can't hit the reps? Use the assisted machine or a band.")
PULLUP = ex("Weighted Pull-up", "M", {"Back": 1, "Biceps": .5},
            "Load with a dip belt. The % covers bodyweight + added weight (see the pull-up formula in the README).")

LEG_EXT = ex("Leg Extension", "I", {"Quads": 1}, "1 s squeeze at the top, 3 s on the way down.")
CALF_ST = ex("Standing Calf Raise", "I", {"Calves": 1}, "2 s pause in the full stretch at the bottom.")
CALF_SE = ex("Seated Calf Raise", "I", {"Calves": 1}, "2 s pause at the bottom, 1 s squeeze at the top.")
LYING_CURL = ex("Lying Leg Curl", "I", {"Hamstrings": 1}, "Press your hips into the pad, 3 s on the way down.")
SEATED_CURL = ex("Seated Leg Curl", "I", {"Hamstrings": 1}, "Lean your torso forward a little for a bigger stretch.")
CABLE_LAT = ex("Cable Lateral Raise", "I", {"Shoulders": 1},
               "Lead with the elbow, stop at shoulder height, no swinging.", spec=True)
DB_LAT = ex("Dumbbell Lateral Raise", "I", {"Shoulders": 1},
            "Lean forward slightly, pinkies level with thumbs, slow and controlled.", spec=True)
ROPE_PD = ex("Rope Triceps Pushdown", "I", {"Triceps": 1}, "Elbows pinned to your sides, spread the rope at the bottom.")
FACE_PULL = ex("Face Pull", "I", {"Shoulders": 1, "Back": .5}, "Pull to your forehead, thumbs back, squeeze the rear delts.")
INC_CURL = ex("Incline Dumbbell Curl", "I", {"Biceps": 1}, "Arms hang behind the body for a big stretch. No swinging.")
EZ_CURL = ex("EZ-Bar Curl", "I", {"Biceps": 1}, "Elbows still, no hip swing, 2-3 s on the way down.")
SKULL = ex("EZ-Bar Skull Crusher", "I", {"Triceps": 1}, "Lower the bar behind your head, elbows pointing at the ceiling.")
OH_CABLE_EXT = ex("Overhead Cable Triceps Extension", "I", {"Triceps": 1},
                  "Deep stretch behind the head. This trains the long head, the biggest part of the arm.")
DIPS_W = ex("Weighted Dips", "C", {"Chest": 1, "Triceps": .5, "Shoulders": .5},
            "Lean forward slightly to work the chest. Only go as deep as your shoulders are comfortable.")
BACK_EXT = ex("45° Back Extension", "C", {"Glutes": 1, "Hamstrings": .5},
              "Round slightly over the pad and squeeze the glutes to rise. Hold a plate once 3×12 is easy.")
NEUTRAL_PD = ex("Neutral-Grip Lat Pulldown", "C", {"Back": 1, "Biceps": .5},
                "Close neutral handle, pull to the upper chest, lean back slightly.")

Q1 = {
    "A": [
        ("1", BENCH), ("2", LEGPRESS),
        ("3a", ex("Incline Dumbbell Press (30°)", "C", {"Chest": 1, "Shoulders": .5, "Triceps": .5},
                  "Upper-chest builder. Elbows at about 45°, deep stretch at the bottom.", spec=True)),
        ("3b", ex("Lat Pulldown (wide grip)", "C", {"Back": 1, "Biceps": .5},
                  "Chest up, drive the elbows down to your ribs, control the way up.", spec=True)),
        ("4a", LEG_EXT), ("4b", CALF_ST),
        ("5a", CABLE_LAT), ("5b", ROPE_PD),
        ("6a", ex("Hanging Knee Raise", "X", {"Abs": 1},
                  "No swinging. Curl the pelvis up at the top (posterior tilt).",
                  abs_rx=["3×10", "3×12", "3×15"])),
        ("6b", ex("Cable Crunch", "X", {"Abs": 1},
                  "Round the spine and bring the ribs to the pelvis. Hips stay still.",
                  abs_rx=["3×12", "3×15", "4×12 (heavier)"])),
    ],
    "B": [
        ("1", HIPTHRUST), ("2", ROW),
        ("3", ex("Dumbbell Walking Lunge", "C", {"Quads": 1, "Glutes": .5},
                 "Long stride, slight forward lean, back knee lightly touches the floor.")),
        ("4a", ex("Single-Arm Dumbbell Row", "C", {"Back": 1, "Biceps": .5},
                  "Hand on the bench, pull the elbow toward your hip, full stretch at the bottom.")),
        ("4b", LYING_CURL),
        ("5a", FACE_PULL), ("5b", INC_CURL),
        ("6a", ex("Kneeling Ab Wheel Rollout", "X", {"Abs": 1},
                  "Ribs down, glutes tight. Roll out only as far as your lower back stays flat.",
                  abs_rx=["3×6-8 (partial range)", "3×8-10", "3×10-12 (full range)"])),
        ("6b", ex("Pallof Press", "X", {"Abs": 1},
                  "Stand side-on to the cable, press out and hold 2 s. Don't let it twist you.",
                  abs_rx=["3×10/side", "3×12/side", "3×12/side + 3 s hold"])),
    ],
    "C": [
        ("1", OHP), ("2", PULLUP_Q1),
        ("3a", ex("Dips (assisted if needed)", "C", {"Chest": 1, "Triceps": .5, "Shoulders": .5},
                  "Lean forward slightly for chest. Only go as deep as your shoulders are comfortable.")),
        ("3b", ex("Dumbbell Step-up", "C", {"Quads": 1, "Glutes": .5},
                  "Knee-height box. Drive through the front heel and don't push off the back foot.")),
        ("4a", SEATED_CURL), ("4b", CALF_SE),
        ("5a", EZ_CURL), ("5b", OH_CABLE_EXT), ("5c", DB_LAT),
        ("6a", ex("Reverse Crunch", "X", {"Abs": 1},
                  "Curl the hips off the bench toward your chest, lower slowly.",
                  abs_rx=["3×10", "3×12", "3×15"])),
        ("6b", ex("Side Plank", "X", {"Abs": 1}, "Straight line from ear to hip to ankle, hips high.",
                  abs_rx=["3×20 s/side", "3×30 s/side", "3×40 s/side"])),
    ],
}

Q2 = {
    "A": [
        ("1", BENCH), ("2", LEGPRESS),
        ("3a", ex("Incline Barbell Press (30°)", "C", {"Chest": 1, "Shoulders": .5, "Triceps": .5},
                  "Bar to the upper chest, elbows slightly tucked.", spec=True)),
        ("3b", NEUTRAL_PD),
        ("4a", LEG_EXT), ("4b", CALF_ST),
        ("5a", CABLE_LAT),
        ("5b", ex("Straight-Bar Triceps Pushdown", "I", {"Triceps": 1}, "Elbows pinned, full lockout, slow return.")),
        ("6a", ex("Hanging Leg Raise (straight legs)", "X", {"Abs": 1},
                  "Legs straight, raise to hip height or higher, no swinging.",
                  abs_rx=["3×8", "3×10", "3×12"])),
        ("6b", ex("Weighted Cable Crunch", "X", {"Abs": 1},
                  "Go heavier than in Q1: 8-10 hard reps, round the spine fully.",
                  abs_rx=["3×10 (heavy)", "4×10", "4×8 (heavier)"])),
    ],
    "B": [
        ("1", HIPTHRUST), ("2", ROW),
        ("3", ex("Dumbbell Reverse Lunge", "C", {"Quads": 1, "Glutes": .5},
                 "Step back, keep the front shin close to vertical. Easier on the knees than forward lunges.")),
        ("4a", ex("Chest-Supported Row (T-bar or dumbbell)", "C", {"Back": 1, "Biceps": .5},
                  "Chest on the pad, squeeze the shoulder blades. No load on the lower back.")),
        ("4b", SEATED_CURL),
        ("5a", ex("Reverse Pec Deck", "I", {"Shoulders": 1}, "Arms long, sweep wide, squeeze the rear delts.")),
        ("5b", ex("Hammer Curl", "I", {"Biceps": 1}, "Neutral grip trains the brachialis for thicker arms.")),
        ("6a", ex("Ab Wheel Rollout (kneeling, full range)", "X", {"Abs": 1},
                  "Full extension, ribs down, glutes tight, no sagging.",
                  abs_rx=["3×10", "3×12", "4×10 + 2 s pause at full extension"])),
        ("6b", ex("Suitcase Carry", "X", {"Abs": 1},
                  "Heavy dumbbell in one hand, walk tall and don't lean.",
                  abs_rx=["3×20 m/side", "3×30 m/side", "3×40 m/side"])),
    ],
    "C": [
        ("1", OHP), ("2", PULLUP),
        ("3a", DIPS_W), ("3b", BACK_EXT),
        ("4a", LYING_CURL), ("4b", CALF_SE),
        ("5a", EZ_CURL), ("5b", SKULL), ("5c", DB_LAT),
        ("6a", ex("Incline Reverse Crunch", "X", {"Abs": 1},
                  "Head at the top of an incline bench, curl the hips up and over.",
                  abs_rx=["3×10", "3×12", "3×15"])),
        ("6b", ex("Weighted Side Plank", "X", {"Abs": 1}, "Plate on the top hip, body in one straight line.",
                  abs_rx=["3×30 s/side (bodyweight)", "3×30 s/side + 5 kg", "3×40 s/side + 5-10 kg"])),
    ],
}

Q3 = {
    "A": [
        ("1", BENCH), ("2", LEGPRESS),
        ("3a", ex("Incline Dumbbell Press (30°)", "C", {"Chest": 1, "Shoulders": .5, "Triceps": .5},
                  "Upper-chest priority. Deep stretch, 3 s on the way down.", spec=True)),
        ("3b", ex("Wide-Grip Lat Pulldown", "C", {"Back": 1, "Biceps": .5},
                  "Width builder. Pull the elbows down and out, squeeze the lats at the bottom.", spec=True)),
        ("4a", LEG_EXT), ("4b", CALF_ST),
        ("5a", ex("Cable Y-Raise", "I", {"Shoulders": 1},
                  "Cable low, sweep the arm up in a Y in front of the body. Targets the side delts.", spec=True)),
        ("5b", ex("Overhead Rope Triceps Extension", "I", {"Triceps": 1}, "Face away from the stack, deep stretch.")),
        ("6a", ex("Toes-to-Bar (or Hanging Leg Raise)", "X", {"Abs": 1},
                  "Controlled. Use the lats to stay still and curl the pelvis up.",
                  abs_rx=["3×6", "3×8", "3×10"])),
        ("6b", ex("Weighted Decline Crunch", "X", {"Abs": 1}, "Plate on your chest, crunch, don't sit all the way up.",
                  abs_rx=["3×10", "3×12", "4×10"])),
    ],
    "B": [
        ("1", HIPTHRUST), ("2", ROW),
        ("3", ex("Dumbbell Walking Lunge", "C", {"Quads": 1, "Glutes": .5},
                 "Long stride, 2 s on the way down, drive through the front heel.")),
        ("4a", ex("Straight-Arm Cable Pulldown", "I", {"Back": 1},
                  "Arms nearly straight, sweep the bar down to your thighs. Isolates the lats for width.", spec=True)),
        ("4b", SEATED_CURL),
        ("5a", ex("Rear-Delt Cable Fly", "I", {"Shoulders": 1}, "Cross the cables, sweep the arms wide at shoulder height.")),
        ("5b", ex("Bayesian Cable Curl", "I", {"Biceps": 1},
                  "Face away from a low cable with the arm behind the body for a full stretch.")),
        ("6a", ex("Ab Wheel Rollout (from feet, shortened range)", "X", {"Abs": 1},
                  "Roll toward a wall or up an incline to limit the range. Not ready? Kneeling with a 3 s pause.",
                  abs_rx=["3×4-5", "3×5-6", "3×6-8"])),
        ("6b", ex("Cable Woodchopper (high to low)", "X", {"Abs": 1}, "Rotate through the trunk, arms stay long.",
                  abs_rx=["3×12/side", "3×12/side (heavier)", "3×15/side"])),
    ],
    "C": [
        ("1", OHP), ("2", PULLUP),
        ("3a", ex("Low-to-High Cable Fly", "I", {"Chest": 1},
                  "Cables low, sweep the hands up to chin height. Targets the upper chest.", spec=True)),
        ("3b", ex("High-Box Dumbbell Step-up", "C", {"Quads": 1, "Glutes": .5},
                  "Box a bit above knee height for more glute. Control the way down.")),
        ("4a", LYING_CURL), ("4b", CALF_SE),
        ("5a", ex("Preacher Curl", "I", {"Biceps": 1}, "Full stretch at the bottom, don't let the elbows lift.")),
        ("5b", ex("Single-Arm Cable Pushdown", "I", {"Triceps": 1}, "Reverse or neutral grip, full lockout.")),
        ("5c", ex("Lean-Away Cable Lateral Raise", "I", {"Shoulders": 1},
                  "Hold the post and lean away. Keeps tension on the delt at the bottom.", spec=True)),
        ("6a", ex("Dragon Flag Negative", "X", {"Abs": 1},
                  "Grip the bench behind your head, body rigid, lower over 5 s.",
                  abs_rx=["3×3 (5 s down)", "3×4 (5 s down)", "3×5 (5 s down)"])),
        ("6b", ex("Hollow Body Hold", "X", {"Abs": 1}, "Lower back pressed into the floor, arms and legs long.",
                  abs_rx=["3×20 s", "3×30 s", "3×40 s"])),
    ],
}

Q4 = {
    "A": [
        ("1", BENCH), ("2", LEGPRESS),
        ("3a", ex("Low-Incline Barbell Press (15-30°)", "C", {"Chest": 1, "Shoulders": .5, "Triceps": .5},
                  "Bar to the upper chest, 1 s pause on the chest.", spec=True)),
        ("3b", NEUTRAL_PD),
        ("4a", LEG_EXT), ("4b", CALF_ST),
        ("5a", CABLE_LAT), ("5b", ROPE_PD),
        ("6a", ex("Weighted Hanging Leg Raise", "X", {"Abs": 1}, "Light dumbbell between the feet, no swinging.",
                  abs_rx=["3×8 (light DB)", "3×10", "3×12"])),
        ("6b", ex("Heavy Cable Crunch", "X", {"Abs": 1}, "Heavy and strict, full spinal flexion.",
                  abs_rx=["4×8", "3×12-15", "3×15 + drop set"])),
    ],
    "B": [
        ("1", HIPTHRUST), ("2", ROW),
        ("3", ex("Deficit Dumbbell Reverse Lunge", "C", {"Quads": 1, "Glutes": .5},
                 "Front foot on a 5-10 cm plate for a deeper stretch.")),
        ("4a", ex("Machine Chest-Supported Row", "C", {"Back": 1, "Biceps": .5}, "Full stretch forward, squeeze at the back.")),
        ("4b", SEATED_CURL),
        ("5a", FACE_PULL), ("5b", INC_CURL),
        ("6a", ex("Ab Wheel Rollout (from feet)", "X", {"Abs": 1},
                  "Full range from the feet if you've earned it. Otherwise kneeling with a 3 s pause.",
                  abs_rx=["3×5", "3×6-8", "3×8"])),
        ("6b", ex("Half-Kneeling Pallof Press + Overhead Reach", "X", {"Abs": 1},
                  "Press out, raise the arms overhead, return. Don't let the cable rotate you.",
                  abs_rx=["3×10/side", "3×12/side", "3×12/side"])),
    ],
    "C": [
        ("1", OHP), ("2", PULLUP),
        ("3a", DIPS_W), ("3b", BACK_EXT),
        ("4a", LYING_CURL), ("4b", CALF_SE),
        ("5a", EZ_CURL), ("5b", SKULL), ("5c", DB_LAT),
        ("6a", ex("Dragon Flag", "X", {"Abs": 1}, "Full rep: lower under control, raise back up as one rigid piece.",
                  abs_rx=["3×3-5", "3×5", "3×5-6"])),
        ("6b", ex("L-Sit Hold (dip bars or parallettes)", "X", {"Abs": 1}, "Shoulders pushed down, legs straight (tuck if needed).",
                  abs_rx=["3×10-15 s (tuck OK)", "3×15-20 s", "3×20-30 s"])),
    ],
}

QUARTERS = {1: Q1, 2: Q2, 3: Q3, 4: Q4}
QUARTER_NAMES = {
    1: "Build the Base: Foundation & Hypertrophy",
    2: "Get Strong: Strength",
    3: "Build the Look: Hypertrophy & Aesthetics",
    4: "Peak & Reveal: Strength Peak & Definition",
}
DAY_NAMES = {
    "A": "Day A: Push & Quads",
    "B": "Day B: Pull & Posterior Chain",
    "C": "Day C: Shoulders, Back Width & Arms",
}

# ------------------------------------------------------------------ cardio
Z2 = "Zone 2 (60-70% HRmax, RPE 4-5, you can talk in full sentences)"
CARDIO_Q1 = dict(A="30 min " + Z2 + ". Incline walk, bike, elliptical or rower.",
                 B="30 min " + Z2 + ". Incline walk, bike, elliptical or rower.",
                 C="30 min " + Z2 + ". Incline walk, bike, elliptical or rower.")
CARDIO_Q2 = dict(A="30 min Zone 2, incline walk or elliptical. Keep it easy on the quads before the leg press.",
                 B="30 min Zone 2, elliptical or incline walk. An easy bike is fine too.",
                 C="30 min Zone 2, any machine: bike, stair climber, rower, incline walk.")
CARDIO_Q3 = dict(A="30 min Zone 2, incline walk or elliptical.",
                 B="30 min Zone 2, elliptical or bike.",
                 C="25 min Zone 2, then 5 min Zone 3 (70-80% HRmax, RPE 6) to finish.")
CARDIO_Z2_ALL = dict(A="30 min Zone 2, incline walk or elliptical.",
                     B="30 min Zone 2, elliptical or bike.",
                     C="30 min Zone 2, any machine.")
CARDIO_PEAK = dict(A="30 min easy Zone 2 (60-65% HRmax), incline walk.",
                   B="30 min easy Zone 2 (60-65% HRmax), elliptical.",
                   C="30 min easy Zone 2 (60-65% HRmax), any machine.")
CARDIO_DEF1 = dict(A="30 min Zone 2 (65-70% HRmax), incline walk or elliptical.",
                   B="30 min Zone 2 (65-70% HRmax), elliptical or bike.",
                   C="Intervals (bike or rower): 10 min Zone 2, then 6 × (1 min hard at 85-90% HRmax + 2 min easy), then 2 min easy = 30 min.")
CARDIO_DEF2 = dict(A="30 min Zone 2 (65-70% HRmax), incline walk or elliptical.",
                   B="30 min Zone 2 (65-70% HRmax), elliptical or bike.",
                   C="Sprints (bike, rower or air bike): 10 min Zone 2, then 8 × (30 s sprint at about 90% HRmax + 90 s easy), then 4 min easy = 30 min.")

# ---------------------------------------------------------- nutrition notes
NUT_GAIN = "Lean gain: TDEE + 200-300 kcal, protein 1.6-2.2 g/kg. Starting with higher body fat? Eat at maintenance (recomposition)."
NUT_PEAK = "Maintenance calories (TDEE), protein 1.6-2.2 g/kg. Fuel the heavy lifting."
NUT_CUT = "Definition: TDEE − 300-500 kcal, protein 2.0-2.4 g/kg, lose 0.5-1% of body weight per week. 8-10k steps/day."

# ------------------------------------------------------------------ months
BASE_RIR = "Months 1-3 go by effort, not percentages. Pick a weight that leaves the target RIR (reps in reserve). The % column is a rough guide only."

MONTHS = [
    dict(n=1, slug="01-foundation", title="Foundation", q=1,
         goal="Learn and groove the technique on the six main lifts, get your body used to 30 min of cardio plus lifting, and start your log. Loads are deliberately light: leave 2-4 reps in the tank on every set.",
         main=[("3×10", "≈ 60-65%", "RIR 4"), ("3×10", "≈ 65%", "RIR 3"), ("3×10", "≈ 67-70%", "RIR 3"), ("3×10", "≈ 70%", "RIR 2")],
         main_sets=3, main_rest="2 min", base=BASE_RIR,
         C=(3, "12", "RIR 3", "90 s"), I=(3, "12-15", "RIR 3", "60 s"),
         technique="None yet. Own the technique: lower every rep over 2-3 s.",
         w4="normal", cardio=CARDIO_Q1, cardio_note="Stay at the low end of Zone 2 (60-65% HRmax). The goal is to build the habit.",
         nutrition=NUT_GAIN,
         summary=("3×10 @ RIR 4→2", "3×12-15", "Zone 2", "Normal")),
    dict(n=2, slug="02-hypertrophy-1", title="Hypertrophy I", q=1,
         goal="Start the real muscle-building work: more sets on the main lifts and sets taken closer to failure. Week 4 is the first deload.",
         main=[("4×8", "≈ 68-70%", "RIR 3"), ("4×8", "≈ 72%", "RIR 2"), ("4×8", "≈ 74%", "RIR 1-2"), ("2×8", "≈ 60%", "RIR 5 (deload)")],
         main_sets=4, main_rest="2 min", base=BASE_RIR,
         C=(3, "10-12", "RIR 2", "90 s"), I=(3, "12-15", "RIR 2", "60 s"),
         technique="None. Use double progression: add reps each week, then add weight.",
         w4="deload", cardio=CARDIO_Q1, cardio_note="Zone 2 (60-70% HRmax). As you get fitter, raise the incline or resistance so your heart rate stays in the zone.",
         nutrition=NUT_GAIN,
         summary=("4×8 @ RIR 3→1", "3×10-15", "Zone 2", "Deload")),
    dict(n=3, slug="03-hypertrophy-2", title="Hypertrophy II", q=1,
         goal="Heavier hypertrophy work: 6-8 reps on the main lifts and drop sets on isolation work. At the end of the month you estimate your 1RMs, which set your Month 4 percentages.",
         main=[("4×8", "≈ 72%", "RIR 2"), ("4×7", "≈ 75%", "RIR 2"), ("4×6", "≈ 78%", "RIR 1-2"), ("4×6", "≈ 80%", "RIR 1, log it for your e1RM")],
         main_sets=4, main_rest="2 min", base=BASE_RIR + " After Week 4, calculate your e1RM for every main lift with the RIR-adjusted Epley formula in the README.",
         C=(4, "8-10", "RIR 1-2", "90 s"), I=(3, "10-15", "RIR 1", "60 s"),
         technique="Drop set on the LAST set of every isolation exercise: hit the target reps, drop the weight about 25%, then rep out to RIR 0-1.",
         w4="normal", cardio=CARDIO_Q1, cardio_note="Zone 2 (60-70% HRmax).",
         nutrition=NUT_GAIN, flex=13,
         summary=("4×8→4×6 @ RIR 2→1", "4×8-10 / 3×10-15 + drop sets", "Zone 2", "Normal, then Flex wk 13")),
    dict(n=4, slug="04-strength-accumulation", title="Strength I: Accumulation", q=2,
         goal="Switch to strength. The main lifts move to 5×5 with percentage-based loading. Accessories stay at 8-12 reps so you keep building muscle.",
         main=[("5×5", "75%", "RIR 3"), ("5×5", "77.5%", "RIR 2-3"), ("5×5", "80%", "RIR 2"), ("5×5", "82.5%", "RIR 1")],
         main_sets=5, main_rest="3 min", base="Percentages are of the e1RM you calculated from Month 3, Week 4.",
         C=(3, "8-10", "RIR 2", "2 min"), I=(3, "10-12", "RIR 2", "60-75 s"),
         technique="None. Strength months: save your energy for the main lifts.",
         w4="normal", cardio=CARDIO_Q2, cardio_note="Zone 2, low-impact only. Avoid running and hard leg cardio before heavy lower-body work.",
         nutrition=NUT_GAIN,
         summary=("5×5 @ 75→82.5%", "3×8-12", "Zone 2 (low-impact)", "Normal")),
    dict(n=5, slug="05-strength-intensification", title="Strength II: Intensification", q=2,
         goal="Heavier weights, fewer reps (3-4). This is where the big strength gains come from. Week 4 is a deload.",
         main=[("5×4", "82.5%", "RIR 2"), ("5×3", "85%", "RIR 2"), ("4×3", "87.5%", "RIR 1-2"), ("3×3", "70%", "RIR 4+ (deload)")],
         main_sets=5, main_rest="3 min", base="Percentages are of your Month 3 e1RM. If Month 4 felt easy, add 2.5% to the e1RM (autoregulation rule, README).",
         C=(3, "6-8", "RIR 2", "2 min"), I=(3, "10-12", "RIR 1-2", "60-75 s"),
         technique="None.",
         w4="deload", cardio=CARDIO_Q2, cardio_note="Zone 2, low-impact only.",
         nutrition=NUT_GAIN,
         summary=("5×4→4×3 @ 82.5→87.5%", "3×6-12", "Zone 2 (low-impact)", "Deload")),
    dict(n=6, slug="06-strength-realization-test", title="Strength III: Realization & Test", q=2,
         goal="Practise heavy triples, doubles and singles, then test your new maxes in Week 4. The tested numbers set your percentages for the whole of Q3.",
         main=[("1×3 then 3×5", "87.5% then 77.5%", "Top set RPE 8"), ("1×2 then 3×4", "90% then 80%", "Top set RPE 8"),
               ("1×1 then 2×3", "92.5% then 82.5%", "Top set RPE 8"), ("TEST", "See test protocol below", "RPE 9.5-10")],
         main_sets=4, main_rest="3-4 min", base="Percentages are of your current e1RM (Month 3 e1RM, plus any autoregulation bumps).",
         C=(3, "6-8", "RIR 1-2", "2 min"), I=(3, "10-12", "RIR 1", "60-75 s"),
         technique="None.",
         w4="test", cardio=CARDIO_Q2, cardio_note="Zone 2, low-impact only. In test week stay at the easy end (60% HRmax).",
         nutrition=NUT_GAIN, flex=26,
         summary=("Top set + back-offs, then TEST", "3×6-12", "Zone 2 (low-impact)", "Test, then Flex wk 26")),
    dict(n=7, slug="07-hypertrophy-volume", title="Hypertrophy III: Volume", q=3,
         goal="Use your new strength to build muscle: higher volume and slow eccentrics. The accessory list shifts toward V-taper aesthetics (upper chest, side delts, lats, arms).",
         main=[("4×10", "67.5%", "RIR 2"), ("4×9", "70%", "RIR 2"), ("4×8", "72.5%", "RIR 1-2"), ("4×8", "75%", "RIR 1")],
         main_sets=4, main_rest="2 min", base="Percentages are of the 1RM you tested in Week 25.",
         C=(4, "10-12", "RIR 1-2", "90 s"), I=(3, "12-15", "RIR 1", "60 s"),
         technique="3 s lowering on every accessory rep. On the last set of isolation work, finish with lengthened partials (half reps in the stretched position) until RIR 0.",
         w4="normal", cardio=CARDIO_Q3, cardio_note="Zone 2 on Days A and B. On Day C, finish with 5 min of Zone 3.",
         nutrition=NUT_GAIN,
         summary=("4×10→4×8 @ 67.5→75%", "4×10-12 / 3×12-15", "Zone 2 + Zone 3 finisher (Day C)", "Normal")),
    dict(n=8, slug="08-aesthetic-specialization", title="Aesthetic Specialization (V-Taper)", q=3,
         goal="Specialization month for the V-taper look: extra sets for side delts, upper chest and lats, plus intensity techniques. The main lifts drop to 3×6, which is enough to keep your strength.",
         main=[("3×6", "75%", "RIR 3"), ("3×6", "77.5%", "RIR 2-3"), ("3×6", "80%", "RIR 2"), ("2×6", "65%", "RIR 4+ (deload)")],
         main_sets=3, main_rest="2-3 min", base="Percentages are of the 1RM you tested in Week 25.",
         C=(3, "8-12", "RIR 0-1", "90 s"), I=(3, "10-15", "RIR 0-1", "60 s"),
         technique="★ = specialization exercise and gets +1 set (already included below). Rest-pause on the last set of compound accessories (rest 15 s, rep out again, twice). Myo-reps on the last set of isolation work (one set to RIR 1, then 3-4 mini-sets of 3-5 reps with 15 s rest).",
         spec=True, w4="deload", cardio=CARDIO_Q3, cardio_note="Zone 2 on Days A and B. On Day C, finish with 5 min of Zone 3.",
         nutrition=NUT_GAIN,
         summary=("3×6 @ 75→80% (maintain)", "+1 set V-taper, myo-reps", "Zone 2 + Zone 3 finisher (Day C)", "Deload")),
    dict(n=9, slug="09-powerbuilding", title="Powerbuilding", q=3,
         goal="Strength and size together: one heavy top set followed by volume back-off sets. This bridges the aesthetics block into the strength peak.",
         main=[("1×5 then 3×8", "82.5% then 70%", "Top set RPE 8"), ("1×4 then 3×7", "85% then 72.5%", "Top set RPE 8"),
               ("1×3 then 3×6", "87.5% then 75%", "Top set RPE 8"), ("1×2 then 3×5", "90% then 77.5%", "Top set RPE 8.5")],
         main_sets=4, main_rest="3 min (top set), 2 min (back-offs)", base="Percentages are of the Week 25 1RM. If the top set feels RPE 7 or easier, add 2.5% next week.",
         C=(3, "8-10", "RIR 1", "90 s"), I=(3, "12-15", "RIR 1", "60 s"),
         technique="Drop set on the last set of every isolation exercise.",
         w4="normal", cardio=CARDIO_Z2_ALL, cardio_note="Zone 2 on every day. Protect the heavy top sets.",
         nutrition=NUT_GAIN, flex=39,
         summary=("Top set + back-offs", "3×8-15 + drop sets", "Zone 2", "Normal, then Flex wk 39")),
    dict(n=10, slug="10-strength-peak", title="Strength Peak & Test", q=4,
         goal="Peak your strength: low reps at high intensity, with accessory volume cut back so you're fresh. Week 4 is test week, aim for PRs on all six lifts.",
         main=[("5×3", "85%", "RIR 2"), ("4×2", "90%", "RIR 1-2"), ("1×1 then 2×2", "95% then 85%", "Single RPE 8.5-9"), ("TEST", "See test protocol below", "PR attempts")],
         main_sets=4, main_rest="3-4 min", base="Percentages are of the higher of: your Week 25 test, or the e1RM from your Month 9, Week 4 top set.",
         C=(3, "6-8", "RIR 2", "2 min"), I=(2, "10-12", "RIR 2", "60 s"),
         technique="None. Accessory volume is cut back on purpose so you peak.",
         w4="test", cardio=CARDIO_PEAK, cardio_note="Easy Zone 2 only (60-65% HRmax). Cardio must not eat into your recovery this month.",
         nutrition=NUT_PEAK,
         summary=("5×3 → singles, then TEST", "3×6-8 / 2×10-12", "Easy Zone 2", "Test")),
    dict(n=11, slug="11-definition-1", title="Definition I: Lean Out", q=4,
         goal="Reveal the work. Calorie deficit, supersets and shorter rests, and interval cardio on Day C. Heavy 3×5 main lifts keep your strength while you diet.",
         main=[("3×5", "77.5%", "RIR 3"), ("3×5", "80%", "RIR 2"), ("3×5", "82.5%", "RIR 2"), ("2×5", "65%", "RIR 4+ (deload)")],
         main_sets=3, main_rest="2-3 min", base="Percentages are of the 1RM you tested in Week 43.",
         C=(3, "10-12", "RIR 1", "60 s"), I=(3, "15", "RIR 1", "30-45 s"),
         technique="Antagonist supersets and tri-sets with short rest (30-45 s isolation, 60 s compounds). Keep the heavy main work exactly as written.",
         w4="deload", cardio=CARDIO_DEF1, cardio_note="Zone 2 on Days A and B, intervals on Day C. In the deload week, every day is Zone 2.",
         nutrition=NUT_CUT,
         summary=("3×5 @ 77.5→82.5%", "3×10-15, short rest", "Zone 2 + intervals (Day C)", "Deload")),
    dict(n=12, slug="12-definition-2-final", title="Definition II: Final Assessment", q=4,
         goal="Final push for definition, then the Week 4 final assessment: strength, photos and measurements. Compare everything with Month 1.",
         main=[("3×6", "75%", "RIR 2"), ("3×5", "80%", "RIR 2"), ("3×4", "82.5%", "RIR 2"), ("FINAL", "Work up to a heavy triple", "RPE 9, then Epley e1RM")],
         main_sets=3, main_rest="2-3 min", base="Percentages are of the 1RM you tested in Week 43.",
         C=(3, "12-15", "RIR 1", "60 s"), I=(3, "15-20", "RIR 0-1", "30-45 s"),
         technique="Giant-set finish: drop set on the last set of every isolation exercise, short rests.",
         w4="final", cardio=CARDIO_DEF2, cardio_note="Zone 2 on Days A and B, sprints on Day C. In the assessment week, every day is Zone 2.",
         nutrition=NUT_CUT, flex=52,
         summary=("3×6→3×4, then FINAL test", "3×12-20 + drop sets", "Zone 2 + sprints (Day C)", "Final, then Flex wk 52")),
]

# week numbers: 4 per month + flex week after each quarter
WEEK = {}
w = 1
for m in MONTHS:
    WEEK[m["n"]] = (w, w + 3)
    w += 4
    if m.get("flex"):
        assert m["flex"] == w, (m["n"], w)
        w += 1
assert w == 53


def month_in_q(m):
    return (m["n"] - 1) % 3


def rx(m, e):
    """Return (sets_int, sets_reps_str, effort, rest) for a non-main exercise."""
    if e["slot"] == "X":
        s = e["abs_rx"][month_in_q(m)]
        return int(s.split("×")[0]), s, "Strict; stop 1-2 reps (or 5-10 s) short of failure", "45-60 s after the superset"
    sets, reps, effort, rest = m[e["slot"]]
    if m.get("spec") and e["spec"]:
        sets += 1
    return sets, f"{sets}×{reps}", effort, rest


def is_superset(label):
    return label[-1].isalpha()


def fmt(x):
    return str(int(x)) if float(x).is_integer() else f"{x:.1f}"


def weekly_volume(m):
    vol = {k: 0.0 for k in MUSCLES}
    for day in "ABC":
        for label, e in QUARTERS[m["q"]][day]:
            sets = m["main_sets"] if e["slot"] == "M" else rx(m, e)[0]
            for mus, f in e["muscles"].items():
                vol[mus] += sets * f
    return vol


def nav(m):
    parts = []
    if m["n"] > 1:
        p = MONTHS[m["n"] - 2]
        parts.append(f"[← Month {p['n']}]({p['slug']}.md)")
    parts.append("[Overview](../README.md)")
    if m["n"] < 12:
        nx = MONTHS[m["n"]]
        parts.append(f"[Month {nx['n']} →]({nx['slug']}.md)")
    return " · ".join(parts)


TEST_PROTOCOL = """### Week 4: Test week

Do 30 min of easy Zone 2 cardio first, as always, then test:

| Day | Lift 1 | Lift 2 |
|---|---|---|
| A | Bench Press: **1RM** (spotter or safety bars) | Leg Press: **5RM** |
| B | Hip Thrust: **5RM** | Barbell Row: **5RM** (strict, from safeties) |
| C | Overhead Press: **1RM** (or 3RM) | Weighted Pull-up: **3RM** (bodyweight + added) |

- **Warm-up ladder for a 1RM:** empty bar ×10 → 40% ×8 → 60% ×5 → 75% ×3 → 85% ×1 → 90% ×1 → attempt 1 (~95-97%) → attempt 2 (~100-102%) → optional attempt 3 (PR). Rest 3-5 min between heavy attempts.
- **For 3RM/5RM tests:** ramp in 4-6 sets with fewer reps each time, up to a weight you can do for the target reps at RPE 9.5-10.
- Convert every 3RM/5RM to an e1RM with the Epley formula ([README](../README.md#the-maths)).

After testing: **2 sets** of each accessory at RIR 3, and **2 sets** of each abs exercise. Nothing more.
"""

FINAL_PROTOCOL = """### Week 4: Final assessment

Do 30 min of easy Zone 2 cardio first, then:

1. **Strength:** for each main lift, work up to a heavy **triple at RPE 9** and convert it to an e1RM with the Epley formula. (A true 1RM isn't worth the risk while you're in a calorie deficit.) Compare with Weeks 12, 25 and 43.
2. **Abs test (Day C):** max-time hollow body hold, and max strict dragon flags.
3. **Physique:** front, side and back photos in the same light and at the same time of day as your Month 1 photos. Measure waist (at the navel), chest, flexed arms and thighs, and take your 7-day average body weight.
4. Accessories: **2 sets** at RIR 3. Abs: **2 sets**.
"""

DELOAD_TEXT = """### Week 4: Deload

- **Main lifts:** follow the Week 4 row in the main-lift table.
- **Everything else:** cut sets in half (usually to **2 sets**). Keep the same reps, drop the load 10-15%, and stop at **RIR 4 or more**.
- **Abs:** 2 sets each.
- **Cardio:** the full 30 min, but easy Zone 2 only.
- The point of a deload is to clear fatigue so you come back stronger. Don't skip it, and don't turn it into a hard week.
"""

NORMAL_W4 = """### Week 4

A normal week, and the hardest of the month. Hit the target RIR exactly.
"""


def flex_text(m):
    wk = m["flex"]
    extra = {
        13: "Before Month 4, calculate an **e1RM for each main lift** from your Month 3, Week 4 sets (RIR-adjusted Epley).",
        26: "You just tested. Write down your new 1RMs: they drive Months 7-9.",
        39: "Before Month 10, compare your Week 25 test with the e1RM from your Month 9, Week 4 top sets, and use the **higher** number.",
        52: "The year is done. Review your log and photos. For **Year 2**, start again at Month 4 using your Week 51 e1RMs and pick new accessory variations.",
    }[wk]
    return f"""## Flex week (Week {wk})

Every quarter ends with one flex week. Choose **one** option:

1. **Deload (recommended):** 3 sessions of 30 min easy Zone 2 cardio, then main lifts **2×5 at 50-60%**, 1 easy set of each accessory, and 2 sets of each abs exercise.
2. **Catch-up:** if you missed sessions this quarter, make them up now.
3. **Full rest or holiday:** no gym, but keep walking 8-10k steps a day.

{extra}
"""


def month_md(m):
    q = m["q"]
    w0, w1 = WEEK[m["n"]]
    L = []
    L.append(f"# Month {m['n']}: {m['title']}")
    L.append("")
    L.append(f"**Weeks {w0}-{w1}** · Quarter {q}: *{QUARTER_NAMES[q]}* · 3 sessions/week")
    L.append("")
    L.append(nav(m))
    L.append("")
    L.append("## Goal")
    L.append("")
    L.append(m["goal"])
    L.append("")
    L.append("## This month at a glance")
    L.append("")
    L.append("| | Prescription |")
    L.append("|---|---|")
    L.append(f"| **Main lifts** | See the week-by-week table · rest {m['main_rest']} |")
    c, i = m["C"], m["I"]
    L.append(f"| **Compound accessories** | {c[0]}×{c[1]} @ {c[2]} · rest {c[3]} |")
    L.append(f"| **Isolation** | {i[0]}×{i[1]} @ {i[2]} · rest {i[3]} |")
    L.append("| **Abs** | 2 exercises every session, done as a superset (see each day) |")
    L.append(f"| **Cardio** | 30 min before every session: {m['cardio_note']} |")
    L.append(f"| **Intensity technique** | {m['technique']} |")
    L.append(f"| **Nutrition** | {m['nutrition']} |")
    L.append("")
    L.append("## Cardio: 30 min before every session")
    L.append("")
    L.append("| Day | Cardio |")
    L.append("|---|---|")
    for d in "ABC":
        L.append(f"| {d} | {m['cardio'][d]} |")
    L.append("")
    L.append("## Main lifts: week by week")
    L.append("")
    L.append("Applies to all six main lifts: **Bench Press, Leg Press, Hip Thrust, Barbell Row, Overhead Press, Pull-up**.")
    L.append("")
    L.append("| Week | Sets × Reps | Load (% of 1RM) | Effort |")
    L.append("|---|---|---|---|")
    for k, (sr, load, eff) in enumerate(m["main"]):
        L.append(f"| {k + 1} (wk {w0 + k}) | {sr} | {load} | {eff} |")
    L.append("")
    L.append(f"> **Load basis:** {m['base']}")
    L.append("")
    for d in "ABC":
        L.append(f"## {DAY_NAMES[d]}")
        L.append("")
        L.append("| # | Exercise | Sets × Reps | Effort | Rest | Coaching cues |")
        L.append("|---|---|---|---|---|---|")
        # one rest value per superset group: the longest rest of any member
        group_rest = {}
        for label, e in QUARTERS[q][d]:
            if is_superset(label) and e["slot"] in "CI":
                g = label[:-1]
                if e["slot"] == "C" or g not in group_rest:
                    group_rest[g] = m[e["slot"]][3]
        for label, e in QUARTERS[q][d]:
            name = e["name"]
            if m.get("spec") and e["spec"]:
                name += " ★"
            if e["slot"] == "X":
                name = "Abs: " + name
            if e["slot"] == "M":
                L.append(f"| {label} | **{name}** (main) | Main-lift table | Main-lift table | {m['main_rest']} | {e['cue']} |")
            else:
                _, sr, eff, rest = rx(m, e)
                if is_superset(label) and e["slot"] != "X":
                    rest = group_rest[label[:-1]] + " after the superset"
                L.append(f"| {label} | {name} | {sr} | {eff} | {rest} | {e['cue']} |")
        L.append("")
    L.append("> Exercises with the same number and a letter (3a/3b, 5a/5b/5c) are a **superset**: do one set of each back to back, then rest.")
    L.append("")
    L.append({"deload": DELOAD_TEXT, "test": TEST_PROTOCOL, "final": FINAL_PROTOCOL, "normal": NORMAL_W4}[m["w4"]])
    L.append("## End-of-month checklist")
    L.append("")
    L.append("- [ ] Every session logged (weight, reps and RIR for every working set)")
    L.append("- [ ] 7-day average body weight written down")
    L.append("- [ ] Waist measured at the navel")
    if m["n"] % 3 == 0 or m["n"] == 1:
        L.append("- [ ] Progress photos (front, side, back, same light and time of day)")
    L.append("")
    if m.get("flex"):
        L.append(flex_text(m))
    L.append(nav(m))
    L.append("")
    return "\n".join(L)


# ------------------------------------------------------------------ README
def volume_table():
    rows = []
    head = "| Muscle | " + " | ".join(f"M{m['n']}" for m in MONTHS) + " |"
    sep = "|---|" + "---|" * len(MONTHS)
    vols = [weekly_volume(m) for m in MONTHS]
    rows.append(head)
    rows.append(sep)
    for mus in MUSCLES:
        rows.append(f"| {mus} | " + " | ".join(fmt(v[mus]) for v in vols) + " |")
    return "\n".join(rows)


def overview_table():
    L = ["| Month | Weeks | Phase | Main lifts | Accessories | Cardio | Week 4 |",
         "|---|---|---|---|---|---|---|"]
    for m in MONTHS:
        w0, w1 = WEEK[m["n"]]
        a, b, c, d = m["summary"]
        L.append(f"| [**{m['n']}**](months/{m['slug']}.md) | {w0}-{w1} | {m['title']} | {a} | {b} | {c} | {d} |")
    return "\n".join(L)


def day_template_table():
    L = ["| Quarter | Day A: Push & Quads | Day B: Pull & Posterior Chain | Day C: Shoulders, Back Width & Arms |",
         "|---|---|---|---|"]
    for q in (1, 2, 3, 4):
        cells = []
        for d in "ABC":
            names = [f"{lab}. {e['name']}" for lab, e in QUARTERS[q][d]]
            cells.append("<br>".join(names))
        L.append(f"| **Q{q}**<br>{QUARTER_NAMES[q]} | " + " | ".join(cells) + " |")
    return "\n".join(L)


README_TEMPLATE = open(Path(__file__).with_name("readme_template.md"), encoding="utf-8").read()


def readme():
    return (README_TEMPLATE
            .replace("{{OVERVIEW}}", overview_table())
            .replace("{{VOLUME}}", volume_table())
            .replace("{{TEMPLATES}}", day_template_table()))


# ------------------------------------------------------------------ tracker
MAIN_BY_DAY = {"A": ["Barbell Bench Press", "Leg Press"],
               "B": ["Barbell Hip Thrust", "Barbell Row"],
               "C": ["Standing Overhead Press", "Pull-up (total load = BW + added)"]}


def tracker_rows():
    rows = []
    week_to_month = {}
    for m in MONTHS:
        w0, _ = WEEK[m["n"]]
        for k in range(4):
            week_to_month[w0 + k] = (m, k)
        if m.get("flex"):
            week_to_month[m["flex"]] = (m, None)
    for wk in range(1, 53):
        m, k = week_to_month[wk]
        for d in "ABC":
            for lift in MAIN_BY_DAY[d]:
                if k is None:
                    phase, presc, load, eff = "Flex week", "2×5 (or rest)", "50-60%", "Easy"
                else:
                    phase = m["title"]
                    presc, load, eff = m["main"][k]
                rows.append([wk, m["n"] if k is not None else f"{m['n']} (flex)", phase, d, lift, presc, load, eff])
    return rows


def write_tracker(path):
    header = ["Week", "Month", "Phase", "Day", "Lift", "Prescription", "Load (% 1RM)", "Effort",
              "Weight used (kg)", "Reps done (best set)", "RIR", "e1RM (kg)"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(header)
        for r, row in enumerate(tracker_rows(), start=2):
            formula = f'=IF(AND(I{r}<>"",J{r}<>""),ROUND(I{r}*(1+(J{r}+IF(K{r}="",0,K{r}))/30),1),"")'
            wr.writerow(row + ["", "", "", formula])


# ---------------------------------------------------------------- web app data
LIFT_KEYS = {"Barbell Bench Press": "bench", "Leg Press": "legpress", "Barbell Hip Thrust": "hipthrust",
             "Barbell Row": "row", "Standing Overhead Press": "ohp",
             PULLUP_Q1["name"]: "pullup", PULLUP["name"]: "pullup"}
TEST_RM = {"bench": "1RM", "legpress": "5RM", "hipthrust": "5RM", "row": "5RM", "ohp": "1RM", "pullup": "3RM"}
EASY_CARDIO = "30 min easy Zone 2 (60-65% HRmax), any low-impact machine."
KIND_NOTES = {
    "deload": "Deload week: main lifts as written. Everything else is cut to 2 sets, about 10-15% lighter, stopping at RIR 4+. Keep the cardio easy.",
    "test": "Test week: find your new maxes. Ramp up: bar ×10 → 40% ×8 → 60% ×5 → 75% ×3 → 85% ×1 → 90% ×1 → attempts. Rest 3-5 min between heavy attempts. Use a spotter or safeties.",
    "final": "Final assessment: work up to a heavy triple at RPE 9 on each main lift. Take progress photos and measurements this week.",
    "flex": "Flex week: an easy deload (recommended), a catch-up week, or full rest. Skip these sessions if you're taking the week off.",
}


def rest_sec(text):
    m = re.search(r"(\d+)(?:-\d+)?\s*(s|min)", text)
    if not m:
        return 90
    return int(m.group(1)) * (60 if m.group(2) == "min" else 1)


def app_main_sets(m, k, lift):
    sr, load, eff = m["main"][k]
    if sr == "TEST":
        return [dict(reps=TEST_RM[lift], eff="Max test", pct=None)], f"Test your {TEST_RM[lift]}"
    if sr == "FINAL":
        return [dict(reps="3", eff="Heavy triple, RPE 9", pct=None)], "Work up to a heavy triple at RPE 9"
    parts, loads = sr.split(" then "), load.split(" then ")
    out = []
    for i, part in enumerate(parts):
        n, reps = part.split("×")
        ld = loads[min(i, len(loads) - 1)]
        pct = None if "≈" in ld else float(ld.rstrip("%")) / 100
        e = eff if i == 0 else "Back-off"
        for _ in range(int(n)):
            out.append(dict(reps=reps, eff=e, pct=pct))
    return out, f"{sr} · {load} · {eff}"


def app_session(m, k, day, wk, kind):
    q = QUARTERS[m["q"]][day]
    exs = []
    group_rest = {}
    for label, e in q:
        if is_superset(label) and e["slot"] in "CI":
            g = label[:-1]
            if e["slot"] == "C" or g not in group_rest:
                group_rest[g] = rest_sec(m[e["slot"]][3])
    for label, e in q:
        group = label[:-1] if is_superset(label) else None
        if e["slot"] == "M":
            lift = LIFT_KEYS[e["name"]]
            if kind == "flex":
                sets, summary = [dict(reps="5", eff="Easy", pct=None)] * 2, "2×5 · 50-60% · easy"
            else:
                sets, summary = app_main_sets(m, k, lift)
            rest = rest_sec(m["main_rest"])
        else:
            n, sr, eff, _ = rx(m, e)
            reps = sr.split("×", 1)[1]
            if e["slot"] == "X":
                eff, rest = "Strict", 60
                n = 2 if kind != "normal" else n
            else:
                rest = group_rest.get(group) or rest_sec(m[e["slot"]][3])
                if kind == "deload":
                    n, eff = min(n, 2), "RIR 4+, lighter"
                elif kind in ("test", "final"):
                    n, eff = 2, "RIR 3"
                elif kind == "flex":
                    n, eff = 1, "RIR 4, easy"
            sets = [dict(reps=reps, eff=eff, pct=None)] * n
            summary = f"{n}×{reps}" + ("" if e["slot"] == "X" else f" · {eff}")
        exs.append(dict(e=exercise_id(e), label=label, slot=e["slot"], group=group, rest=rest,
                        spec=bool(m.get("spec") and e["spec"] and kind == "normal"),
                        rx=summary, sets=sets))
    note = KIND_NOTES.get(kind)
    if kind == "final" and day == "C":
        note += " Abs test today: max hollow body hold and max strict dragon flags."
    cardio = EASY_CARDIO if kind != "normal" else m["cardio"][day]
    return dict(id=f"w{wk:02d}-{day}", week=wk, month=m["n"], day=day, kind=kind,
                title=f"Week {wk} · Day {day}", dayName=DAY_NAMES[day].split(": ", 1)[1],
                cardio=cardio, note=note, technique=m["technique"] if kind == "normal" else None,
                est=estimate_minutes(exs), ex=exs)


EXERCISES = {}


def exercise_id(e):
    key = (e["name"], e["cue"])
    for eid, data in EXERCISES.items():
        if (data["name"], data["cue"]) == key:
            return eid
    eid = f"e{len(EXERCISES) + 1}"
    EXERCISES[eid] = dict(name=e["name"], cue=e["cue"], muscles=e["muscles"], lift=LIFT_KEYS.get(e["name"]))
    return eid


def estimate_minutes(exs):
    total, seen = 36.0, set()  # 30 min cardio + ~6 min warm-up
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


def app_plan():
    sessions = []
    for m in MONTHS:
        w0, _ = WEEK[m["n"]]
        for k in range(4):
            kind = m["w4"] if (k == 3 and m["w4"] != "normal") else "normal"
            for day in "ABC":
                sessions.append(app_session(m, k, day, w0 + k, kind))
        if m.get("flex"):
            for day in "ABC":
                sessions.append(app_session(m, 0, day, m["flex"], "flex"))
    months = [dict(n=m["n"], title=m["title"], quarter=m["q"], weeks=list(WEEK[m["n"]]), goal=m["goal"],
                   technique=m["technique"], nutrition=m["nutrition"], base=m["base"],
                   planned={k: round(v, 1) for k, v in weekly_volume(m).items()}) for m in MONTHS]
    return dict(muscles=MUSCLES, months=months, exercises=EXERCISES, sessions=sessions)


def main():
    (OUT / "months").mkdir(parents=True, exist_ok=True)
    (OUT / "tracker").mkdir(parents=True, exist_ok=True)
    for m in MONTHS:
        (OUT / "months" / f"{m['slug']}.md").write_text(month_md(m), encoding="utf-8")
    (OUT / "README.md").write_text(readme(), encoding="utf-8")
    write_tracker(OUT / "tracker" / "main-lifts-tracker.csv")
    (OUT / "web").mkdir(exist_ok=True)
    (OUT / "web" / "plan.json").write_text(
        json.dumps(app_plan(), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()

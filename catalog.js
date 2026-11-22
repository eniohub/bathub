'use strict';
/* =========================================================
   CATALOG — calisthenics exercises, variations and rank scales.

   Every variation has "anchors": [[value, score], ...]
     value = reps (kind "reps") or seconds (kind "hold")
     score = 0..1000 points. Each 100 points = one rank tier
             (0-99 Iron, 100-199 Bronze, ... 800+ Legend).
   The app interpolates between anchors, so you can edit them
   (Ranks > Exercises > tap an exercise > "Edit scale").

   SOURCES for the starting numbers:
   - Pull-ups, push-ups, dips: Strength Level community standards (male reps for
     Beginner / Novice / Intermediate / Advanced / Elite -> 100 / 250 / 400 / 550 / 700).
   - Front lever / planche hold targets: FitnessVolt progression guides
     (tuck 30s, advanced tuck 10s, one-leg 10s, straddle 5s, full 5s; planche lean 30s,
     frog stand 20s).
   - Everything else is a starting ESTIMATE. Edit it to your own standards.
   ========================================================= */

const V = (id, name, anchors) => ({ id, name, anchors });

const CATALOG = [
  { id: 'pullup', name: 'Pull-ups', kind: 'reps', weighted: true, bw: 1.0, pose: 'pullup',
    muscles: { lats: .45, biceps: .2, forearms: .15, traps: .1, shoulders: .1 },
    variants: [
      V('strict', 'Strict', [[0, 0], [1, 100], [7, 250], [13, 400], [21, 550], [30, 700], [42, 800], [60, 1000]]),
      V('chin', 'Chin-up', [[0, 0], [1, 110], [8, 250], [15, 400], [24, 550], [34, 700], [46, 800], [65, 1000]]),
      V('archer', 'Archer', [[1, 300], [3, 400], [6, 500], [10, 600], [15, 700], [25, 850]]),
      V('oneArm', 'One-arm', [[1, 620], [3, 710], [5, 790], [8, 900], [12, 1000]]),
    ] },
  { id: 'pushup', name: 'Push-ups', kind: 'reps', weighted: true, bw: .64, pose: 'pushup',
    muscles: { chest: .5, triceps: .25, shoulders: .15, abs: .1 },
    variants: [
      V('standard', 'Standard', [[0, 0], [5, 100], [19, 250], [39, 400], [62, 550], [87, 700], [115, 800], [150, 1000]]),
      V('diamond', 'Diamond', [[1, 60], [4, 100], [15, 250], [30, 400], [50, 550], [70, 700], [95, 800], [130, 1000]]),
      V('archer', 'Archer', [[1, 250], [4, 350], [8, 450], [15, 550], [25, 650], [40, 780]]),
      V('pseudo', 'Pseudo planche', [[1, 300], [5, 420], [10, 520], [20, 620], [30, 700], [45, 820]]),
      V('oneArm', 'One-arm', [[1, 500], [3, 580], [6, 650], [10, 720], [20, 830], [30, 950]]),
    ] },
  { id: 'dips', name: 'Dips', kind: 'reps', weighted: true, bw: .95, pose: 'dips',
    muscles: { triceps: .4, chest: .35, shoulders: .25 },
    variants: [
      V('parallel', 'Parallel bars', [[0, 0], [3, 100], [10, 250], [20, 400], [31, 550], [43, 700], [55, 800], [75, 1000]]),
      V('rings', 'Rings', [[1, 120], [5, 250], [10, 380], [20, 520], [30, 640], [45, 780], [60, 900]]),
      V('straight', 'Straight bar', [[1, 100], [5, 230], [10, 350], [20, 500], [30, 620], [45, 760]]),
    ] },
  { id: 'muscleup', name: 'Muscle-ups', kind: 'reps', weighted: true, bw: 1.0, pose: 'muscleup',
    muscles: { lats: .3, triceps: .2, chest: .15, biceps: .15, shoulders: .1, forearms: .1 },
    variants: [
      V('bar', 'Bar', [[0, 0], [1, 450], [3, 520], [5, 580], [10, 700], [15, 800], [25, 900], [40, 1000]]),
      V('rings', 'Rings', [[1, 500], [3, 570], [5, 630], [10, 750], [15, 850], [25, 950]]),
    ] },
  { id: 'kneeraise', name: 'Knee raises', kind: 'reps', weighted: false, bw: 1, pose: 'kneeraise',
    muscles: { abs: .7, forearms: .2, quads: .1 },
    variants: [V('hanging', 'Hanging', [[0, 0], [1, 40], [8, 150], [15, 250], [25, 380], [35, 480], [50, 600], [70, 720], [100, 850]])] },
  { id: 'legraise', name: 'Leg raises', kind: 'reps', weighted: false, bw: 1, pose: 'legraise',
    muscles: { abs: .75, forearms: .15, quads: .1 },
    variants: [
      V('straight', 'Straight legs', [[1, 100], [5, 200], [10, 320], [15, 420], [20, 500], [30, 620], [40, 720]]),
      V('ttb', 'Toes to bar', [[1, 300], [3, 380], [6, 460], [10, 540], [15, 620], [25, 740], [40, 880]]),
    ] },
  { id: 'flraise', name: 'Front lever raises', kind: 'reps', weighted: false, bw: 1, pose: 'flraise',
    muscles: { lats: .4, abs: .3, shoulders: .1, forearms: .1, lowerback: .1 },
    variants: [
      V('tuck', 'Tuck', [[1, 150], [3, 200], [5, 250], [10, 320], [15, 380]]),
      V('straddle', 'Straddle', [[1, 400], [3, 450], [5, 500], [8, 550], [12, 600]]),
      V('full', 'Full', [[1, 600], [2, 640], [3, 680], [5, 740], [8, 820], [12, 900]]),
    ] },
  { id: 'frontlever', name: 'Front lever', kind: 'hold', weighted: false, bw: 1, pose: 'frontlever',
    muscles: { lats: .4, abs: .3, shoulders: .1, forearms: .1, lowerback: .1 },
    variants: [
      V('tuck', 'Tuck', [[0, 100], [30, 250]]),
      V('adv', 'Advanced tuck', [[0, 250], [10, 380]]),
      V('one', 'One leg', [[0, 380], [10, 480]]),
      V('straddle', 'Straddle', [[0, 480], [5, 600], [15, 680]]),
      V('full', 'Full', [[0, 600], [5, 800], [20, 1000]]),
    ] },
  { id: 'backlever', name: 'Back lever', kind: 'hold', weighted: false, bw: 1, pose: 'backlever',
    muscles: { shoulders: .3, lowerback: .2, biceps: .2, chest: .15, forearms: .15 },
    variants: [
      V('tuck', 'Tuck', [[0, 100], [20, 230]]),
      V('adv', 'Advanced tuck', [[0, 230], [15, 340]]),
      V('straddle', 'Straddle', [[0, 340], [10, 460]]),
      V('full', 'Full', [[0, 460], [10, 600], [30, 760]]),
    ] },
  { id: 'planche', name: 'Planche', kind: 'hold', weighted: false, bw: 1, pose: 'planche',
    muscles: { shoulders: .35, forearms: .2, chest: .2, abs: .15, triceps: .1 },
    variants: [
      V('lean', 'Planche lean', [[0, 40], [30, 100]]),
      V('frog', 'Frog stand', [[0, 100], [20, 180]]),
      V('tuck', 'Tuck', [[0, 180], [30, 330]]),
      V('adv', 'Advanced tuck', [[0, 330], [10, 470]]),
      V('straddle', 'Straddle', [[0, 470], [5, 640], [15, 720]]),
      V('full', 'Full', [[0, 640], [5, 850], [15, 1000]]),
    ] },
  { id: 'handstand', name: 'Handstand', kind: 'hold', weighted: false, bw: 1, pose: 'handstand',
    muscles: { shoulders: .5, forearms: .15, triceps: .15, traps: .1, abs: .1 },
    variants: [
      V('wall', 'Wall', [[0, 0], [10, 60], [30, 150], [60, 250]]),
      V('free', 'Freestanding', [[0, 150], [5, 250], [15, 360], [30, 480], [60, 620]]),
      V('oneArm', 'One-arm', [[0, 600], [3, 700], [10, 800], [20, 900]]),
    ] },
  { id: 'hspu', name: 'Handstand push-ups', kind: 'reps', weighted: true, bw: .9, pose: 'hspu',
    muscles: { shoulders: .45, triceps: .3, traps: .1, forearms: .1, chest: .05 },
    variants: [
      V('pike', 'Pike', [[1, 50], [8, 150], [15, 250], [25, 350]]),
      V('wall', 'Wall', [[1, 200], [3, 260], [6, 340], [10, 420], [15, 500], [20, 580]]),
      V('free', 'Freestanding', [[1, 450], [3, 520], [6, 600], [10, 700], [15, 800]]),
    ] },
  { id: 'lsit', name: 'L-sit', kind: 'hold', weighted: false, bw: 1, pose: 'lsit',
    muscles: { abs: .5, quads: .2, triceps: .15, forearms: .1, shoulders: .05 },
    variants: [
      V('tuck', 'Tuck', [[0, 40], [15, 120]]),
      V('l', 'L-sit', [[0, 120], [10, 240], [20, 320], [30, 400], [60, 520]]),
      V('v', 'V-sit', [[0, 450], [5, 520], [15, 620], [30, 720]]),
      V('manna', 'Manna', [[0, 700], [3, 760], [10, 860]]),
    ] },
  { id: 'humanflag', name: 'Human flag', kind: 'hold', weighted: false, bw: 1, pose: 'humanflag',
    muscles: { abs: .35, lats: .2, shoulders: .2, forearms: .1, lowerback: .1, glutes: .05 },
    variants: [
      V('tuck', 'Tuck', [[0, 200], [10, 330]]),
      V('straddle', 'Straddle', [[0, 330], [10, 480]]),
      V('full', 'Full', [[0, 480], [5, 620], [15, 760], [30, 900]]),
    ] },
  { id: 'pistol', name: 'Pistol squats', kind: 'reps', weighted: true, bw: 1.0, pose: 'pistol', perSide: true,
    muscles: { quads: .45, glutes: .3, calves: .15, hamstrings: .1 },
    variants: [V('pistol', 'Pistol (per leg)', [[0, 0], [1, 120], [5, 250], [10, 400], [15, 500], [25, 620], [40, 740], [60, 880]])] },
  { id: 'nordic', name: 'Nordic curls', kind: 'reps', weighted: false, bw: 1, pose: 'nordic',
    muscles: { hamstrings: .7, glutes: .2, lowerback: .1 },
    variants: [V('full', 'Full range', [[0, 0], [1, 100], [3, 230], [6, 360], [10, 500], [15, 620], [20, 720], [30, 850]])] },
  { id: 'calfraise', name: 'Calf raises', kind: 'reps', weighted: true, bw: 1.0, pose: 'calfraise', perSide: true,
    muscles: { calves: 1 },
    variants: [V('single', 'Single leg', [[0, 0], [5, 80], [15, 200], [25, 320], [40, 450], [60, 580], [80, 700], [100, 800], [140, 950]])] },
];
const CAT = Object.fromEntries(CATALOG.map(e => [e.id, e]));

const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

const els = {
  startDate: document.getElementById("startDate"),
  age: document.getElementById("age"),
  primaryGoal: document.getElementById("primaryGoal"),
  daysPerWeek: document.getElementById("daysPerWeek"),
  equipment: document.getElementById("equipment"),
  sessionLength: document.getElementById("sessionLength"),
  canPullUp: document.getElementById("canPullUp"),
  pullUpMax: document.getElementById("pullUpMax"),
  pushUpMax: document.getElementById("pushUpMax"),
  plankMax: document.getElementById("plankMax"),
  runBlockMinutes: document.getElementById("runBlockMinutes"),
  runBlockDistance: document.getElementById("runBlockDistance"),
  mileTime: document.getElementById("mileTime"),
  generatePlanBtn: document.getElementById("generatePlanBtn"),
  savePlanBtn: document.getElementById("savePlanBtn"),
  plannerStatus: document.getElementById("plannerStatus"),
  planSummaryPreview: document.getElementById("planSummaryPreview"),
  schedulePreview: document.getElementById("schedulePreview")
};

let currentGeneratedPlan = null;

function setStatus(message, type = "") {
  if (!els.plannerStatus) return;
  els.plannerStatus.textContent = message;
  els.plannerStatus.className = "status-box";
  if (type) els.plannerStatus.classList.add(type);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("fitnessplan_user") || "null");
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem("fitnessplan_token") || "";
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseFirstNumber(text) {
  const match = String(text || "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseTimeToSeconds(text) {
  const s = String(text || "").trim();

  let m = s.match(/^(\d{1,2}):([0-5]\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  m = s.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);

  return null;
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startDateDefault() {
  const today = new Date();
  return toISODate(today);
}

function starterFromMax(maxValue, floorValue) {
  const max = Math.max(0, toNumber(maxValue, 0));
  if (!max) return floorValue;
  return Math.max(floorValue, Math.floor(max * 0.6));
}

function getTrackerKey(plan) {
  const user = getUser();
  const userId = user?.email || "guest";
  return `fitnessplan_tracker_${userId}_${plan.planName}_${plan.schedule?.[0]?.date || "local"}`;
}

function loadTracker(plan) {
  try {
    return JSON.parse(localStorage.getItem(getTrackerKey(plan)) || '{"days":{}}');
  } catch {
    return { days: {} };
  }
}

function getExerciseCategory(exerciseName) {
  const n = String(exerciseName || "").toLowerCase();

  if (n.includes("pull")) return "pull";
  if (n.includes("chin")) return "pull";
  if (n.includes("row")) return "pull";

  if (n.includes("push")) return "push";
  if (n.includes("press")) return "push";
  if (n.includes("shoulder")) return "push";

  if (n.includes("squat")) return "legs";
  if (n.includes("split")) return "legs";
  if (n.includes("deadlift")) return "legs";
  if (n.includes("hinge")) return "legs";
  if (n.includes("bridge")) return "legs";
  if (n.includes("hip thrust")) return "legs";

  if (n.includes("plank")) return "core";
  if (n.includes("hang")) return "core";

  if (n.includes("mile")) return "run-test";
  if (n.includes("5k")) return "run-test";
  if (n.includes("tempo")) return "run";
  if (n.includes("run")) return "run";
  if (n.includes("repeat")) return "run";

  return "general";
}

function getMetricForEntry(exercise, entry) {
  const category = getExerciseCategory(exercise.name);
  const name = String(exercise.name || "").toLowerCase();

  if (category === "run-test" || (category === "run" && name.includes("mile"))) {
    const secs = parseTimeToSeconds(entry.logText || entry.noteText || "");
    if (secs != null) {
      return {
        value: secs,
        better: "lower"
      };
    }
  }

  if (category === "run") {
    const dist = parseFirstNumber(entry.logText);
    if (dist != null) {
      return {
        value: dist,
        better: "higher"
      };
    }
    return null;
  }

  if (
    category === "pull" &&
    entry.loadType === "assistance" &&
    Number.isFinite(Number(entry.loadValue)) &&
    String(entry.loadValue).trim() !== ""
  ) {
    return {
      value: Number(entry.loadValue),
      better: "lower"
    };
  }

  if (
    entry.loadType === "load" &&
    Number.isFinite(Number(entry.loadValue)) &&
    String(entry.loadValue).trim() !== "" &&
    Number(entry.loadValue) > 0
  ) {
    return {
      value: Number(entry.loadValue),
      better: "higher"
    };
  }

  if (exercise.targetType === "seconds" || category === "core") {
    const best = Array.isArray(entry.values) ? Math.max(...entry.values.map(Number)) : null;
    if (Number.isFinite(best)) {
      return {
        value: best,
        better: "higher"
      };
    }
  }

  if (Array.isArray(entry.values)) {
    const best = Math.max(...entry.values.map(Number));
    if (Number.isFinite(best)) {
      return {
        value: best,
        better: "higher"
      };
    }
  }

  return null;
}

function collectExerciseMetrics(plan, tracker) {
  const map = new Map();

  (plan.schedule || []).forEach((day) => {
    if (day.type !== "workout") return;

    (day.exercises || []).forEach((exercise) => {
      const entry = tracker.days?.[day.date]?.[exercise.id];
      if (!entry) return;

      const metric = getMetricForEntry(exercise, entry);
      if (!metric) return;

      const key = exercise.name;
      if (!map.has(key)) {
        map.set(key, {
          name: exercise.name,
          category: getExerciseCategory(exercise.name),
          better: metric.better,
          points: []
        });
      }

      map.get(key).points.push({
        date: day.date,
        value: metric.value
      });
    });
  });

  map.forEach((item) => item.points.sort((a, b) => a.date.localeCompare(b.date)));
  return Array.from(map.values());
}

function detectPlateau(points, better) {
  if (!points || points.length < 4) return false;

  const last3 = points.slice(-3);
  const earlier = points.slice(0, -3);
  if (!earlier.length) return false;

  if (better === "lower") {
    const bestEarlier = Math.min(...earlier.map((p) => p.value));
    return last3.every((p) => p.value >= bestEarlier);
  }

  const bestEarlier = Math.max(...earlier.map((p) => p.value));
  return last3.every((p) => p.value <= bestEarlier);
}

function pickRecordPoint(points, better) {
  if (!points.length) return null;
  if (better === "lower") {
    return points.reduce((best, p) => (p.value < best.value ? p : best), points[0]);
  }
  return points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);
}

function staleWindowDays(category) {
  if (category === "run" || category === "run-test") return 28;
  if (category === "core") return 35;
  return 42;
}

function getRetestSignalsFromPreviousPlan() {
  const previousPlan = (() => {
    try {
      return JSON.parse(localStorage.getItem("fitnessplan_latest_plan") || "null");
    } catch {
      return null;
    }
  })();

  if (!previousPlan || !previousPlan.schedule?.length) {
    return {
      run: false,
      pull: false,
      push: false,
      core: false,
      total: 0,
      notes: []
    };
  }

  const tracker = loadTracker(previousPlan);
  const metrics = collectExerciseMetrics(previousPlan, tracker);
  const today = new Date().toISOString().slice(0, 10);

  const categoryFlags = {
    run: false,
    pull: false,
    push: false,
    core: false
  };

  const notes = [];

  metrics.forEach((item) => {
    const recordPoint = pickRecordPoint(item.points, item.better);
    const stale = recordPoint ? daysBetween(recordPoint.date, today) >= staleWindowDays(item.category) : false;
    const plateau = detectPlateau(item.points, item.better);
    const retest = stale || plateau;

    if (!retest) return;

    const category = item.category === "run-test" ? "run" : item.category;
    if (categoryFlags[category] !== undefined) {
      categoryFlags[category] = true;
      notes.push(`${item.name}: ${plateau ? "plateau" : "stale record"}`);
    }
  });

  const total = Object.values(categoryFlags).filter(Boolean).length;

  return {
    ...categoryFlags,
    total,
    notes
  };
}

function makeExercise(id, name, options = {}) {
  return {
    id,
    name,
    sets: options.sets ?? 3,
    start: options.start ?? 5,
    max: options.max ?? 10,
    step: options.step ?? 1,
    targetType: options.targetType ?? "reps",
    tempo: options.tempo ?? "Controlled",
    rest: options.rest ?? "60 sec",
    progressionType: options.progressionType ?? "double",
    loadLabel: options.loadLabel ?? "Assistance or load"
  };
}

function getDayOffsets(daysPerWeek) {
  if (daysPerWeek === 3) return [0, 3, 6];
  if (daysPerWeek === 4) return [0, 2, 5, 6];
  return [0, 2, 4, 5, 6];
}

function getDayTitles(daysPerWeek) {
  if (daysPerWeek === 3) return ["Strength A", "Strength B", "Run Day"];
  if (daysPerWeek === 4) return ["Strength A", "Strength B", "Hard Run", "Easy Run"];
  return ["Strength A", "Strength B", "Strength C", "Hard Run", "Easy Run"];
}

function buildNormalStrengthDay(title, weekIndex, ctx) {
  const pushBase = starterFromMax(ctx.pushUpMax, 5) + weekIndex;
  const pullBase = ctx.canPullUp
    ? Math.max(1, starterFromMax(ctx.pullUpMax, 1) + Math.min(weekIndex, 2))
    : 4 + Math.min(weekIndex, 2);
  const plankBase = Math.max(20, Math.floor(ctx.plankMax * 0.6) + weekIndex * 5);

  if (title === "Strength A") {
    return {
      title: "Strength A",
      goal: "Push + pull + legs",
      warmup: ["2 min light movement", "Shoulder circles", "Bodyweight squats", "Easy push-up prep"],
      cooldown: ["Easy walk", "Chest stretch", "Hip stretch"],
      exercises: [
        makeExercise(`pushup-${weekIndex}-a`, "Push-Ups", {
          sets: 3,
          start: pushBase,
          max: pushBase + 4,
          step: 1,
          targetType: "reps",
          tempo: "2 down, controlled up",
          rest: "75 sec",
          progressionType: "double",
          loadLabel: "Load"
        }),
        makeExercise(`pull-${weekIndex}-a`, ctx.canPullUp ? "Pull-Ups" : "Assisted Pull-Ups", {
          sets: 3,
          start: pullBase,
          max: pullBase + 3,
          step: 1,
          targetType: "reps",
          tempo: "Controlled, full range",
          rest: "90 sec",
          progressionType: "double",
          loadLabel: ctx.canPullUp ? "Load" : "Assistance or load"
        }),
        makeExercise(`squat-${weekIndex}-a`, "Goblet Squat", {
          sets: 3,
          start: 8,
          max: 12,
          step: 1,
          targetType: "reps",
          tempo: "3 down, 1 pause, strong up",
          rest: "75 sec",
          progressionType: "double",
          loadLabel: "Load"
        }),
        makeExercise(`plank-${weekIndex}-a`, "Plank", {
          sets: 2,
          start: plankBase,
          max: plankBase + 15,
          step: 5,
          targetType: "seconds",
          tempo: "Braced and steady",
          rest: "45 sec",
          progressionType: "hold",
          loadLabel: "Note"
        })
      ]
    };
  }

  if (title === "Strength B") {
    return {
      title: "Strength B",
      goal: "Push + legs + core",
      warmup: ["2 min light movement", "Split squat patterning", "Arm circles", "Easy hinge reps"],
      cooldown: ["Easy walk", "Quad stretch", "Shoulder stretch"],
      exercises: [
        makeExercise(`press-${weekIndex}-b`, ctx.equipment === "gym" ? "DB Shoulder Press" : "Push-Up Variation", {
          sets: 3,
          start: ctx.equipment === "gym" ? 6 : Math.max(4, pushBase - 1),
          max: ctx.equipment === "gym" ? 10 : Math.max(7, pushBase + 2),
          step: 1,
          targetType: "reps",
          tempo: "Controlled",
          rest: "75 sec",
          progressionType: "double",
          loadLabel: ctx.equipment === "gym" ? "Load" : "Load"
        }),
        makeExercise(`split-${weekIndex}-b`, "Split Squat", {
          sets: 3,
          start: 6,
          max: 10,
          step: 1,
          targetType: "reps",
          tempo: "Controlled",
          rest: "75 sec",
          progressionType: "double",
          loadLabel: "Load"
        }),
        makeExercise(`hang-${weekIndex}-b`, "Dead Hang", {
          sets: 2,
          start: Math.max(10, Math.floor(ctx.plankMax * 0.35)),
          max: Math.max(20, Math.floor(ctx.plankMax * 0.35) + 15),
          step: 5,
          targetType: "seconds",
          tempo: "Smooth hold",
          rest: "45 sec",
          progressionType: "hold",
          loadLabel: "Note"
        })
      ]
    };
  }

  return {
    title: "Strength C",
    goal: "Pull + push + hips",
    warmup: ["2 min light movement", "Hip bridge prep", "Scap pull prep", "Easy squats"],
    cooldown: ["Easy walk", "Back stretch", "Hip stretch"],
    exercises: [
      makeExercise(`pull-${weekIndex}-c`, ctx.canPullUp ? "Chin-Ups" : "Assisted Pull-Ups", {
        sets: 3,
        start: pullBase,
        max: pullBase + 3,
        step: 1,
        targetType: "reps",
        tempo: "Controlled, full range",
        rest: "90 sec",
        progressionType: "double",
        loadLabel: ctx.canPullUp ? "Load" : "Assistance or load"
      }),
      makeExercise(`bridge-${weekIndex}-c`, "Hip Bridge", {
        sets: 3,
        start: 8,
        max: 12,
        step: 1,
        targetType: "reps",
        tempo: "Controlled squeeze",
        rest: "60 sec",
        progressionType: "double",
        loadLabel: "Load"
      }),
      makeExercise(`push-${weekIndex}-c`, "Push-Ups", {
        sets: 3,
        start: Math.max(4, pushBase - 1),
        max: Math.max(7, pushBase + 2),
        step: 1,
        targetType: "reps",
        tempo: "2 down, controlled up",
        rest: "75 sec",
        progressionType: "double",
        loadLabel: "Load"
      })
    ]
  };
}

function buildNormalRunDay(title, weekIndex, ctx) {
  const baseEasy = ctx.runBlockMinutes;
  const youthMultiplier = ctx.age < 16 ? 1.1 : 1.12;
  const easyMinutes = Math.round(baseEasy * Math.pow(youthMultiplier, weekIndex));
  const hardMinutes = ctx.primaryGoal === "mile"
    ? Math.max(5, baseEasy - 1 + weekIndex)
    : Math.max(6, baseEasy - 1 + weekIndex + 1);

  if (title === "Easy Run" || title === "Run Day") {
    return {
      title: title,
      goal: title === "Run Day" ? "Aerobic run" : "Easy aerobic run",
      warmup: ["2 min walk", "Easy jog build-up"],
      cooldown: ["Walk 2 min", "Easy stretch"],
      exercises: [
        makeExercise(`easyrun-${weekIndex}`, "Easy Run", {
          sets: 1,
          start: easyMinutes,
          max: easyMinutes,
          step: 0,
          targetType: "minutes",
          tempo: "Conversational",
          rest: "—",
          progressionType: "static",
          loadLabel: "Note"
        })
      ]
    };
  }

  return {
    title: "Hard Run",
    goal: ctx.primaryGoal === "mile" ? "Quality speed work" : "Controlled tempo work",
    warmup: ["Walk 2 min", "Easy jog 3 min", "Leg swings"],
    cooldown: ["Walk 2 min", "Easy stretch"],
    exercises: [
      makeExercise(`hardrun-${weekIndex}`, ctx.primaryGoal === "mile" ? "Hard Run" : "Tempo Run", {
        sets: 1,
        start: hardMinutes,
        max: hardMinutes,
        step: 0,
        targetType: "minutes",
        tempo: ctx.primaryGoal === "mile" ? "Strong repeatable effort" : "Comfortably hard",
        rest: "—",
        progressionType: "static",
        loadLabel: "Note"
      })
    ]
  };
}

function buildInterventionDay(title, weekIndex, ctx, signals) {
  const reducedStrengthSets = 2;
  const reducedRunMinutes = Math.max(5, ctx.runBlockMinutes - 2);

  if (title === "Strength A") {
    const exercises = [];

    if (signals.pull) {
      exercises.push(
        makeExercise(`pulltest-${weekIndex}-a`, ctx.canPullUp ? "Pull-Up Test" : "Assisted Pull-Up Retest", {
          sets: 1,
          start: ctx.canPullUp ? Math.max(1, ctx.pullUpMax || 1) : 4,
          max: ctx.canPullUp ? Math.max(1, ctx.pullUpMax || 1) : 4,
          step: 0,
          targetType: "reps",
          tempo: "Clean full reps",
          rest: "Full recovery",
          progressionType: "static",
          loadLabel: ctx.canPullUp ? "Load" : "Assistance or load"
        })
      );
    }

    exercises.push(
      makeExercise(`squat-deload-${weekIndex}-a`, "Goblet Squat", {
        sets: reducedStrengthSets,
        start: 6,
        max: 8,
        step: 1,
        targetType: "reps",
        tempo: "Controlled",
        rest: "75 sec",
        progressionType: "double",
        loadLabel: "Load"
      })
    );

    if (signals.core) {
      exercises.push(
        makeExercise(`planktest-${weekIndex}-a`, "Plank Test", {
          sets: 1,
          start: Math.max(20, ctx.plankMax || 30),
          max: Math.max(20, ctx.plankMax || 30),
          step: 0,
          targetType: "seconds",
          tempo: "Clean hold",
          rest: "Full recovery",
          progressionType: "static",
          loadLabel: "Note"
        })
      );
    }

    return {
      title: "Strength A",
      goal: "Intervention: deload + retest",
      warmup: ["Easy movement", "Technique warm-up", "Longer prep"],
      cooldown: ["Easy walk", "Light stretch"],
      exercises
    };
  }

  if (title === "Strength B") {
    const exercises = [];

    if (signals.push) {
      exercises.push(
        makeExercise(`pushtest-${weekIndex}-b`, "Push-Up Test", {
          sets: 1,
          start: Math.max(5, ctx.pushUpMax || 8),
          max: Math.max(5, ctx.pushUpMax || 8),
          step: 0,
          targetType: "reps",
          tempo: "Clean full reps",
          rest: "Full recovery",
          progressionType: "static",
          loadLabel: "Load"
        })
      );
    }

    exercises.push(
      makeExercise(`split-deload-${weekIndex}-b`, "Split Squat", {
        sets: reducedStrengthSets,
        start: 5,
        max: 7,
        step: 1,
        targetType: "reps",
        tempo: "Controlled",
        rest: "75 sec",
        progressionType: "double",
        loadLabel: "Load"
      })
    );

    return {
      title: "Strength B",
      goal: "Intervention: deload + retest",
      warmup: ["Easy movement", "Technique warm-up"],
      cooldown: ["Easy walk", "Light stretch"],
      exercises
    };
  }

  if (title === "Strength C") {
    return {
      title: "Strength C",
      goal: "Intervention deload",
      warmup: ["Easy movement", "Technique prep"],
      cooldown: ["Easy walk", "Light stretch"],
      exercises: [
        makeExercise(`bridge-deload-${weekIndex}-c`, "Hip Bridge", {
          sets: reducedStrengthSets,
          start: 6,
          max: 8,
          step: 1,
          targetType: "reps",
          tempo: "Controlled",
          rest: "60 sec",
          progressionType: "double",
          loadLabel: "Load"
        }),
        makeExercise(`row-deload-${weekIndex}-c`, ctx.canPullUp ? "Chin-Ups" : "Assisted Pull-Ups", {
          sets: reducedStrengthSets,
          start: ctx.canPullUp ? 2 : 4,
          max: ctx.canPullUp ? 4 : 5,
          step: 1,
          targetType: "reps",
          tempo: "Controlled",
          rest: "90 sec",
          progressionType: "double",
          loadLabel: ctx.canPullUp ? "Load" : "Assistance or load"
        })
      ]
    };
  }

  if (title === "Hard Run") {
    if (signals.run) {
      return {
        title: "Hard Run",
        goal: "Intervention: run retest",
        warmup: ["Walk 2 min", "Easy jog", "Strides on a flat area"],
        cooldown: ["Walk 3 min", "Light stretch"],
        exercises: [
          makeExercise(`runtest-${weekIndex}`, `${ctx.runBlockMinutes}-Minute Run Test`, {
            sets: 1,
            start: ctx.runBlockMinutes,
            max: ctx.runBlockMinutes,
            step: 0,
            targetType: "minutes",
            tempo: "Controlled test effort",
            rest: "—",
            progressionType: "static",
            loadLabel: "Note"
          })
        ]
      };
    }

    return {
      title: "Hard Run",
      goal: "Intervention deload",
      warmup: ["Walk 2 min", "Easy jog"],
      cooldown: ["Walk 2 min", "Light stretch"],
      exercises: [
        makeExercise(`run-deload-${weekIndex}`, "Easy Run", {
          sets: 1,
          start: reducedRunMinutes,
          max: reducedRunMinutes,
          step: 0,
          targetType: "minutes",
          tempo: "Conversational",
          rest: "—",
          progressionType: "static",
          loadLabel: "Note"
        })
      ]
    };
  }

  return {
    title: title,
    goal: "Intervention deload",
    warmup: ["Walk 2 min", "Easy jog"],
    cooldown: ["Walk 2 min", "Light stretch"],
    exercises: [
      makeExercise(`easy-deload-${weekIndex}`, "Easy Run", {
        sets: 1,
        start: reducedRunMinutes,
        max: reducedRunMinutes,
        step: 0,
        targetType: "minutes",
        tempo: "Conversational",
        rest: "—",
        progressionType: "static",
        loadLabel: "Note"
      })
    ]
  };
}

function getWeekType(weekIndex, retestSignals) {
  if (retestSignals.total >= 2 && weekIndex === 0) return "intervention";
  if (weekIndex === 3) return "deload";
  return "normal";
}

function buildWeekBlock(weekIndex, weekStartDate, ctx, retestSignals) {
  const offsets = getDayOffsets(ctx.daysPerWeek);
  const titles = getDayTitles(ctx.daysPerWeek);
  const weekType = getWeekType(weekIndex, retestSignals);

  return offsets.map((offset, i) => {
    const date = addDays(weekStartDate, offset);
    const iso = toISODate(date);
    const dateLabel = formatDateLabel(date);
    const title = titles[i];

    let built;

    if (weekType === "intervention") {
      built = buildInterventionDay(title, weekIndex + 1, ctx, retestSignals);
    } else if (title.includes("Run")) {
      built = buildNormalRunDay(title, weekIndex, ctx);
    } else {
      built = buildNormalStrengthDay(title, weekIndex, ctx);
    }

    if (weekType === "deload" && weekType !== "intervention") {
      built.goal = `${built.goal} • Deload`;
      built.exercises = built.exercises.map((exercise) => ({
        ...exercise,
        sets: Math.max(1, Math.ceil((exercise.sets || 3) * 0.7)),
        start: exercise.targetType === "minutes"
          ? Math.max(5, exercise.start - 2)
          : exercise.start
      }));
    }

    return {
      date: iso,
      dateLabel,
      type: "workout",
      title: built.title,
      goal: built.goal,
      warmup: built.warmup,
      cooldown: built.cooldown,
      exercises: built.exercises
    };
  });
}

function buildPlan(ctx) {
  const retestSignals = getRetestSignalsFromPreviousPlan();
  const start = new Date(`${ctx.startDate}T12:00:00`);
  const schedule = [];

  for (let weekIndex = 0; weekIndex < 4; weekIndex += 1) {
    const weekStart = addDays(start, weekIndex * 7);
    const weekDays = buildWeekBlock(weekIndex, weekStart, ctx, retestSignals);
    schedule.push(...weekDays);
  }

  const youthMode = ctx.age < 16;
  const summaryParts = [
    `${ctx.daysPerWeek}-day block`,
    youthMode ? "Youth-safe mode on" : "Standard mode",
    ctx.primaryGoal === "5k" ? "5K focus" : ctx.primaryGoal === "mile" ? "Mile focus" : "Mixed focus"
  ];

  if (retestSignals.total >= 2) {
    summaryParts.push("Week 1 starts as an intervention week");
  } else {
    summaryParts.push("Week 4 is a deload week");
  }

  if (retestSignals.notes.length) {
    summaryParts.push(`Retest signals: ${retestSignals.notes.join(", ")}`);
  }

  return {
    planName: "FitnessPlan 4-Week Block",
    summary: summaryParts.join(" • "),
    createdAt: new Date().toISOString(),
    daysPerWeek: ctx.daysPerWeek,
    startDate: ctx.startDate,
    schedule,
    generatorMeta: {
      youthMode,
      retestSignals
    }
  };
}

function renderPlanPreview(plan) {
  if (!plan) {
    els.planSummaryPreview.textContent = "No plan generated yet.";
    els.schedulePreview.innerHTML = "";
    return;
  }

  els.planSummaryPreview.textContent = plan.summary || "Plan generated.";

  const weeks = [];
  for (let i = 0; i < plan.schedule.length; i += ctxDaysToChunk(plan.daysPerWeek)) {
    weeks.push(plan.schedule.slice(i, i + ctxDaysToChunk(plan.daysPerWeek)));
  }

  els.schedulePreview.innerHTML = "";

  weeks.forEach((week, index) => {
    const block = document.createElement("div");
    block.className = "preview-week";

    const weekTitle = document.createElement("div");
    weekTitle.className = "preview-week-title";
    weekTitle.textContent = `Week ${index + 1}`;
    block.appendChild(weekTitle);

    week.forEach((day) => {
      const dayCard = document.createElement("div");
      dayCard.className = "preview-day";

      const warning = String(day.goal || "").toLowerCase().includes("intervention") || String(day.goal || "").toLowerCase().includes("deload");

      dayCard.innerHTML = `
        <div class="preview-day-top">
          <div>
            <div class="preview-day-name">${day.title}</div>
            <div class="preview-day-date">${day.dateLabel}</div>
          </div>
          <span class="preview-badge ${warning ? "warn" : ""}">${day.goal}</span>
        </div>
      `;

      const ul = document.createElement("ul");
      ul.className = "preview-exercise-list";

      (day.exercises || []).forEach((exercise) => {
        const li = document.createElement("li");
        const unit =
          exercise.targetType === "seconds"
            ? "sec"
            : exercise.targetType === "minutes"
              ? "min"
              : "reps";

        li.textContent = `${exercise.name} • ${exercise.sets} set${exercise.sets === 1 ? "" : "s"} • target ${exercise.start} ${unit}`;
        ul.appendChild(li);
      });

      dayCard.appendChild(ul);
      block.appendChild(dayCard);
    });

    els.schedulePreview.appendChild(block);
  });
}

function ctxDaysToChunk(daysPerWeek) {
  return Number(daysPerWeek) || 5;
}

function getContextFromForm() {
  const ageFromUser = getUser()?.age;
  const age = toNumber(els.age.value || ageFromUser, 13);

  return {
    startDate: els.startDate.value,
    age,
    primaryGoal: els.primaryGoal.value,
    daysPerWeek: Number(els.daysPerWeek.value),
    equipment: els.equipment.value,
    sessionLength: els.sessionLength.value,
    canPullUp: els.canPullUp.value === "yes",
    pullUpMax: toNumber(els.pullUpMax.value, 0),
    pushUpMax: toNumber(els.pushUpMax.value, 8),
    plankMax: toNumber(els.plankMax.value, 40),
    runBlockMinutes: Math.max(5, toNumber(els.runBlockMinutes.value, 10)),
    runBlockDistance: toNumber(els.runBlockDistance.value, 0),
    mileTime: els.mileTime.value.trim()
  };
}

function validateContext(ctx) {
  if (!ctx.startDate) return "Choose a plan start date.";
  if (!ctx.age || ctx.age < 8 || ctx.age > 100) return "Enter a real age.";
  if (ctx.pushUpMax < 0) return "Push-up input cannot be negative.";
  if (ctx.pullUpMax < 0) return "Pull-up input cannot be negative.";
  if (ctx.plankMax < 0) return "Plank input cannot be negative.";
  if (ctx.runBlockMinutes < 5) return "Run block should be at least 5 minutes.";
  return "";
}

async function savePlan(plan) {
  localStorage.setItem("fitnessplan_latest_plan", JSON.stringify(plan));
  localStorage.setItem(
    "fitnessplan_pending_plan",
    JSON.stringify({
      planName: plan.planName,
      startDate: plan.startDate,
      plan
    })
  );

  const token = getToken();
  if (!token) {
    setStatus("Plan generated and saved locally. Log in to save it to your account.", "ok");
    return;
  }

  try {
    const res = await fetch(`${API}/save-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        planName: plan.planName,
        startDate: plan.startDate,
        plan
      })
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, error: text || "Save failed." };
    }

    if (data.ok) {
      localStorage.removeItem("fitnessplan_pending_plan");
      setStatus("Plan generated and saved to your account.", "ok");
      return;
    }

    setStatus(data.error || "Plan saved locally, but backend save failed.", "bad");
  } catch (error) {
    setStatus(`Plan saved locally, but backend save failed: ${error.message}`, "bad");
  }
}

function initializePlanner() {
  const user = getUser();

  els.startDate.value = startDateDefault();

  if (user?.age) {
    els.age.value = String(user.age);
  }

  els.pushUpMax.value = "10";
  els.plankMax.value = "45";
  els.runBlockMinutes.value = "10";
  els.runBlockDistance.value = "0.8";

  els.generatePlanBtn.addEventListener("click", async () => {
    const ctx = getContextFromForm();
    const error = validateContext(ctx);

    if (error) {
      setStatus(error, "bad");
      return;
    }

    currentGeneratedPlan = buildPlan(ctx);
    renderPlanPreview(currentGeneratedPlan);
    setStatus("Plan generated. Save it if it looks right.", "ok");
  });

  els.savePlanBtn.addEventListener("click", async () => {
    if (!currentGeneratedPlan) {
      setStatus("Generate the plan first.", "bad");
      return;
    }
    await savePlan(currentGeneratedPlan);
  });

  setStatus("Fill the form, then generate the plan.");
}

initializePlanner();
const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

const STORAGE = {
  user: "fitnessplan_user",
  token: "fitnessplan_token",
  latestPlan: "fitnessplan_latest_plan",
  pendingPlan: "fitnessplan_pending_plan"
};

const plannerEls = {
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
  schedulePreview: document.getElementById("schedulePreview"),
  plannerSignalBox: document.getElementById("plannerSignalBox")
};

const dashEls = {
  logoutBtn: document.getElementById("logoutBtn"),
  profileBox: document.getElementById("profileBox"),
  streakBox: document.getElementById("streakBox"),
  currentPlanBox: document.getElementById("currentPlanBox"),
  interventionBanner: document.getElementById("interventionBanner"),
  todayWorkoutBox: document.getElementById("todayWorkoutBox"),
  todayReadinessBox: document.getElementById("todayReadinessBox"),
  todayLogBox: document.getElementById("todayLogBox"),
  todayLogStatus: document.getElementById("todayLogStatus"),
  recordsBox: document.getElementById("recordsBox"),
  retestsBox: document.getElementById("retestsBox"),
  chartsBox: document.getElementById("chartsBox"),
  weekTrackerBox: document.getElementById("weekTrackerBox"),
  calendarBox: document.getElementById("calendarBox")
};

const appState = {
  currentGeneratedPlan: null,
  currentPlan: null,
  currentTracker: null,
  currentUser: null,
  todayDay: null
};

function safeJSONRead(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeJSONWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUser() {
  return safeJSONRead(STORAGE.user, null);
}

function getToken() {
  return localStorage.getItem(STORAGE.token) || "";
}

function getLatestPlan() {
  return safeJSONRead(STORAGE.latestPlan, null);
}

function setLatestPlan(plan) {
  localStorage.setItem(STORAGE.latestPlan, JSON.stringify(plan));
}

function getPendingPlan() {
  return safeJSONRead(STORAGE.pendingPlan, null);
}

function setPendingPlan(value) {
  safeJSONWrite(STORAGE.pendingPlan, value);
}

function clearPendingPlan() {
  localStorage.removeItem(STORAGE.pendingPlan);
}

function setStatus(target, message, type = "") {
  if (!target) return;
  target.textContent = message;
  target.className = "status-box";
  if (type) target.classList.add(type);
}

function setPlannerStatus(message, type = "") {
  setStatus(plannerEls.plannerStatus, message, type);
}

function setTodayLogStatus(message, type = "") {
  setStatus(dashEls.todayLogStatus, message, type);
}

async function apiGet(path) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { headers });
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: text || "Invalid server response." };
  }
}

async function apiPost(path, body) {
  const headers = {
    "Content-Type": "application/json"
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: text || "Invalid server response." };
  }
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function formatSeconds(totalSeconds) {
  const sec = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${String(rem).padStart(2, "0")}`;
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatLongDate(dateString) {
  const d = new Date(`${dateString}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
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

function todayISO() {
  return toISODate(new Date());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startDateDefault() {
  return toISODate(new Date());
}

function daysBetween(dateA, dateB) {
  const a = new Date(`${dateA}T12:00:00`);
  const b = new Date(`${dateB}T12:00:00`);
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function starterFromMax(maxValue, floorValue) {
  const max = Math.max(0, toNumber(maxValue, 0));
  if (!max) return floorValue;
  return Math.max(floorValue, Math.floor(max * 0.6));
}

function goalLabel(goal) {
  if (goal === "mile") return "Mile focus";
  if (goal === "mixed") return "Mixed running + strength";
  return "5K focus";
}

function getTrackerKey(plan) {
  const user = getUser();
  const userId = user?.email || "guest";
  return `fitnessplan_tracker_${userId}_${plan.planName}_${plan.schedule?.[0]?.date || "local"}`;
}

function loadTracker(plan) {
  if (!plan) return { days: {} };
  return safeJSONRead(getTrackerKey(plan), { days: {} });
}

function saveTracker(plan, tracker) {
  if (!plan) return;
  localStorage.setItem(getTrackerKey(plan), JSON.stringify(tracker));
}

function readinessComplete(r) {
  return !!(
    r &&
    r.sleepHours !== undefined &&
    r.sleepHours !== "" &&
    r.soreness !== undefined &&
    r.soreness !== "" &&
    r.energy !== undefined &&
    r.energy !== ""
  );
}

function getDayReadiness(tracker, date) {
  return tracker?.days?.[date]?._sessionReadiness || null;
}

function setDayReadiness(plan, tracker, date, readiness) {
  if (!tracker.days[date]) tracker.days[date] = {};
  tracker.days[date]._sessionReadiness = readiness;
  saveTracker(plan, tracker);
}

function clearDayReadiness(plan, tracker, date) {
  if (!tracker.days[date]) tracker.days[date] = {};
  delete tracker.days[date]._sessionReadiness;
  saveTracker(plan, tracker);
}

function sleepHoursToScore(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h)) return null;
  if (h < 5) return 1;
  if (h < 6) return 2;
  if (h < 7) return 3;
  if (h < 8) return 4;
  return 5;
}

function computeReadinessSummary(readiness) {
  if (!readinessComplete(readiness)) return null;

  const sleepScore = sleepHoursToScore(readiness.sleepHours);
  const soreness = Number(readiness.soreness);
  const energy = Number(readiness.energy);

  if (!Number.isFinite(sleepScore) || !Number.isFinite(soreness) || !Number.isFinite(energy)) {
    return null;
  }

  const sorenessAdjusted = 6 - soreness;
  const avg = (sleepScore + sorenessAdjusted + energy) / 3;

  const strongFatigue = Number(readiness.sleepHours) < 6 || soreness >= 5 || energy <= 2;
  const testingAllowed = Number(readiness.sleepHours) >= 7 && soreness <= 3 && energy >= 3 && !strongFatigue;

  if (avg <= 2.25 || strongFatigue) {
    return {
      level: "low",
      avg,
      label: "Low readiness",
      testingAllowed: false,
      note: "Low readiness. Volume is reduced automatically today and tests stay locked."
    };
  }

  if (avg >= 4) {
    return {
      level: "high",
      avg,
      label: "High readiness",
      testingAllowed: true,
      note: "High readiness. Proceed normally if form stays clean."
    };
  }

  return {
    level: "normal",
    avg,
    label: "Normal readiness",
    testingAllowed,
    note: "Proceed with the planned work. Tests still require enough prior clean sessions."
  };
}

function getWorkoutMap(daysPerWeek) {
  if (daysPerWeek === 3) {
    return {
      0: "Strength A",
      2: "Hard Run",
      5: "Easy Run"
    };
  }

  if (daysPerWeek === 4) {
    return {
      0: "Strength A",
      2: "Strength B",
      4: "Hard Run",
      6: "Easy Run"
    };
  }

  return {
    0: "Strength A",
    2: "Strength B",
    4: "Strength C",
    5: "Hard Run",
    6: "Easy Run"
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
    loadLabel: options.loadLabel ?? "Assistance or load",
    logHint: options.logHint ?? "",
    test: !!options.test
  };
}

function buildNormalStrengthDay(title, weekIndex, ctx) {
  const lengthBonus = ctx.sessionLength === "long" ? 1 : 0;
  const shortPenalty = ctx.sessionLength === "short" ? 1 : 0;
  const baseSets = clamp(3 + lengthBonus - shortPenalty, 2, 4);

  const pushBase = starterFromMax(ctx.pushUpMax, 5) + Math.min(weekIndex, 3);
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
          sets: baseSets,
          start: pushBase,
          max: pushBase + 4,
          step: 1,
          targetType: "reps",
          tempo: "2 down, controlled up",
          rest: "75 sec",
          progressionType: "double",
          loadLabel: "Load",
          logHint: "Log clean reps for each set."
        }),
        makeExercise(`pull-${weekIndex}-a`, ctx.canPullUp ? "Pull-Ups" : "Assisted Pull-Ups", {
          sets: baseSets,
          start: pullBase,
          max: pullBase + 3,
          step: 1,
          targetType: "reps",
          tempo: "Controlled, full range",
          rest: "90 sec",
          progressionType: "double",
          loadLabel: ctx.canPullUp ? "Load" : "Assistance or load",
          logHint: ctx.canPullUp ? "Log clean reps." : "Log clean reps and assistance used."
        }),
        makeExercise(`squat-${weekIndex}-a`, "Goblet Squat", {
          sets: baseSets,
          start: 8,
          max: 12,
          step: 1,
          targetType: "reps",
          tempo: "3 down, 1 pause, strong up",
          rest: "75 sec",
          progressionType: "double",
          loadLabel: "Load",
          logHint: "Log clean reps and load if used."
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
          loadLabel: "Note",
          logHint: "Log clean seconds held."
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
          sets: baseSets,
          start: ctx.equipment === "gym" ? 6 : Math.max(4, pushBase - 1),
          max: ctx.equipment === "gym" ? 10 : Math.max(7, pushBase + 2),
          step: 1,
          targetType: "reps",
          tempo: "Controlled",
          rest: "75 sec",
          progressionType: "double",
          loadLabel: "Load",
          logHint: "Log clean reps and load if used."
        }),
        makeExercise(`split-${weekIndex}-b`, "Split Squat", {
          sets: baseSets,
          start: 6,
          max: 10,
          step: 1,
          targetType: "reps",
          tempo: "Controlled",
          rest: "75 sec",
          progressionType: "double",
          loadLabel: "Load",
          logHint: "Log clean reps and load if used."
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
          loadLabel: "Note",
          logHint: "Log clean seconds held."
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
        sets: baseSets,
        start: pullBase,
        max: pullBase + 3,
        step: 1,
        targetType: "reps",
        tempo: "Controlled, full range",
        rest: "90 sec",
        progressionType: "double",
        loadLabel: ctx.canPullUp ? "Load" : "Assistance or load",
        logHint: ctx.canPullUp ? "Log clean reps." : "Log clean reps and assistance used."
      }),
      makeExercise(`bridge-${weekIndex}-c`, "Hip Bridge", {
        sets: baseSets,
        start: 8,
        max: 12,
        step: 1,
        targetType: "reps",
        tempo: "Controlled squeeze",
        rest: "60 sec",
        progressionType: "double",
        loadLabel: "Load",
        logHint: "Log clean reps and load if used."
      }),
      makeExercise(`push-${weekIndex}-c`, "Push-Ups", {
        sets: baseSets,
        start: Math.max(4, pushBase - 1),
        max: Math.max(7, pushBase + 2),
        step: 1,
        targetType: "reps",
        tempo: "2 down, controlled up",
        rest: "75 sec",
        progressionType: "double",
        loadLabel: "Load",
        logHint: "Log clean reps."
      })
    ]
  };
}

function buildNormalRunDay(title, weekIndex, ctx) {
  const youthMultiplier = ctx.age < 16 ? 1.08 : 1.1;
  const lengthBoost = ctx.sessionLength === "long" ? 4 : ctx.sessionLength === "short" ? -3 : 0;
  const easyMinutes = Math.max(8, Math.round(ctx.runBlockMinutes * Math.pow(youthMultiplier, weekIndex)) + lengthBoost);
  const hardMinutes = ctx.primaryGoal === "mile"
    ? Math.max(5, ctx.runBlockMinutes - 1 + weekIndex)
    : Math.max(6, ctx.runBlockMinutes + weekIndex);

  if (title === "Easy Run") {
    return {
      title: "Easy Run",
      goal: "Aerobic conversational run",
      warmup: ["2 min walk", "Easy jog build-up"],
      cooldown: ["Walk 2 min", "Easy stretch"],
      exercises: [
        makeExercise(`easyrun-${weekIndex}`, "Easy Run", {
          sets: 1,
          start: easyMinutes,
          max: easyMinutes,
          step: 0,
          targetType: "minutes",
          tempo: "Aerobic conversational run",
          rest: "—",
          progressionType: "static",
          loadLabel: "Distance",
          logHint: "Log distance covered. Notes are optional and mainly for running."
        })
      ]
    };
  }

  return {
    title: "Hard Run",
    goal: ctx.primaryGoal === "mile" ? "Quality speed work" : "Comfortably hard, controlled effort",
    warmup: ["Walk 2 min", "Easy jog 3 min", "Leg swings"],
    cooldown: ["Walk 2 min", "Easy stretch"],
    exercises: [
      makeExercise(`hardrun-${weekIndex}`, ctx.primaryGoal === "mile" ? "Hard Run" : "Tempo Run", {
        sets: 1,
        start: hardMinutes,
        max: hardMinutes,
        step: 0,
        targetType: "minutes",
        tempo: ctx.primaryGoal === "mile" ? "Strong repeatable effort" : "Comfortably hard, controlled effort",
        rest: "—",
        progressionType: "static",
        loadLabel: "Distance",
        logHint: "Log total distance covered. Notes are optional and mainly for running."
      })
    ]
  };
}

function buildRunRetestExercise(weekIndex, ctx) {
  if (ctx.primaryGoal === "mile" || ctx.mileTime) {
    return makeExercise(`miletest-${weekIndex}`, "Mile Test", {
      sets: 1,
      start: 1,
      max: 1,
      step: 0,
      targetType: "minutes",
      tempo: "Flat route or track test",
      rest: "Full recovery",
      progressionType: "static",
      loadLabel: "Time",
      logHint: "Log mile time like 7:42. Safe test only.",
      test: true
    });
  }

  return makeExercise(`runtest-${weekIndex}`, `${ctx.runBlockMinutes}-Minute Run Test`, {
    sets: 1,
    start: ctx.runBlockMinutes,
    max: ctx.runBlockMinutes,
    step: 0,
    targetType: "minutes",
    tempo: "Controlled test effort",
    rest: "Full recovery",
    progressionType: "static",
    loadLabel: "Distance",
    logHint: "Log distance covered in the fixed-time run. Safe test only.",
    test: true
  });
}

function buildInterventionDay(title, weekIndex, ctx, signals) {
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
          tempo: "Max clean reps only",
          rest: "Full recovery",
          progressionType: "static",
          loadLabel: ctx.canPullUp ? "Load" : "Assistance or load",
          logHint: "Safe test only. Stop when form breaks.",
          test: true
        })
      );
    }

    exercises.push(
      makeExercise(`squat-deload-${weekIndex}-a`, "Goblet Squat", {
        sets: 2,
        start: 6,
        max: 8,
        step: 1,
        targetType: "reps",
        tempo: "Controlled",
        rest: "75 sec",
        progressionType: "double",
        loadLabel: "Load",
        logHint: "Deload work. No max testing."
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
          tempo: "Max clean hold",
          rest: "Full recovery",
          progressionType: "static",
          loadLabel: "Note",
          logHint: "Safe hold test only.",
          test: true
        })
      );
    }

    return {
      title: "Strength A",
      goal: "Intervention week",
      warmup: ["Easy movement", "Technique prep", "Longer warm-up"],
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
          tempo: "Max clean reps only",
          rest: "Full recovery",
          progressionType: "static",
          loadLabel: "Load",
          logHint: "Safe clean rep test only.",
          test: true
        })
      );
    }

    exercises.push(
      makeExercise(`split-deload-${weekIndex}-b`, "Split Squat", {
        sets: 2,
        start: 5,
        max: 7,
        step: 1,
        targetType: "reps",
        tempo: "Controlled",
        rest: "75 sec",
        progressionType: "double",
        loadLabel: "Load",
        logHint: "Deload work."
      })
    );

    return {
      title: "Strength B",
      goal: "Intervention week",
      warmup: ["Easy movement", "Technique prep"],
      cooldown: ["Easy walk", "Light stretch"],
      exercises
    };
  }

  if (title === "Strength C") {
    return {
      title: "Strength C",
      goal: "Intervention week",
      warmup: ["Easy movement", "Technique prep"],
      cooldown: ["Easy walk", "Light stretch"],
      exercises: [
        makeExercise(`bridge-deload-${weekIndex}-c`, "Hip Bridge", {
          sets: 2,
          start: 6,
          max: 8,
          step: 1,
          targetType: "reps",
          tempo: "Controlled",
          rest: "60 sec",
          progressionType: "double",
          loadLabel: "Load",
          logHint: "Deload work."
        }),
        makeExercise(`row-deload-${weekIndex}-c`, ctx.canPullUp ? "Chin-Ups" : "Assisted Pull-Ups", {
          sets: 2,
          start: ctx.canPullUp ? 2 : 4,
          max: ctx.canPullUp ? 4 : 5,
          step: 1,
          targetType: "reps",
          tempo: "Controlled",
          rest: "90 sec",
          progressionType: "double",
          loadLabel: ctx.canPullUp ? "Load" : "Assistance or load",
          logHint: "Controlled pulling. No max testing."
        })
      ]
    };
  }

  if (title === "Hard Run") {
    const exercises = [];
    if (signals.run) {
      exercises.push(buildRunRetestExercise(weekIndex, ctx));
    } else {
      exercises.push(
        makeExercise(`run-deload-${weekIndex}`, "Easy Run", {
          sets: 1,
          start: Math.max(5, ctx.runBlockMinutes - 2),
          max: Math.max(5, ctx.runBlockMinutes - 2),
          step: 0,
          targetType: "minutes",
          tempo: "Aerobic conversational run",
          rest: "—",
          progressionType: "static",
          loadLabel: "Distance",
          logHint: "Light running only."
        })
      );
    }

    return {
      title: "Hard Run",
      goal: "Intervention week",
      warmup: ["Walk 2 min", "Easy jog", "Strides on a flat area if testing"],
      cooldown: ["Walk 3 min", "Light stretch"],
      exercises
    };
  }

  return {
    title: "Easy Run",
    goal: "Intervention week",
    warmup: ["Walk 2 min", "Easy jog build-up"],
    cooldown: ["Walk 2 min", "Light stretch"],
    exercises: [
      makeExercise(`easy-deload-${weekIndex}`, "Easy Run", {
        sets: 1,
        start: Math.max(5, ctx.runBlockMinutes - 2),
        max: Math.max(5, ctx.runBlockMinutes - 2),
        step: 0,
        targetType: "minutes",
        tempo: "Aerobic conversational run",
        rest: "—",
        progressionType: "static",
        loadLabel: "Distance",
        logHint: "Light running only."
      })
    ]
  };
}

function applyDeloadToBuiltDay(day, ctx) {
  const next = structuredCloneSafe(day);
  next.goal = `${day.goal} • Deload`;

  const shouldRetestRun = day.title === "Hard Run";
  const shouldRetestUpper = day.title === "Strength A";

  if (shouldRetestRun) {
    next.exercises = [buildRunRetestExercise(4, ctx)];
    next.warmup = ["Walk 2 min", "Easy jog 5 min", "Light strides if ready"];
    next.cooldown = ["Walk 3 min", "Easy stretch"];
    next.goal = "Deload + safe running retest";
    return next;
  }

  if (shouldRetestUpper) {
    next.exercises = [
      makeExercise("deload-pushup-test", "Push-Up Test", {
        sets: 1,
        start: Math.max(5, ctx.pushUpMax || 8),
        max: Math.max(5, ctx.pushUpMax || 8),
        step: 0,
        targetType: "reps",
        tempo: "Max clean reps only",
        rest: "Full recovery",
        progressionType: "static",
        loadLabel: "Load",
        logHint: "Safe clean rep test only.",
        test: true
      }),
      makeExercise("deload-pullup-test", ctx.canPullUp ? "Pull-Up Test" : "Assisted Pull-Up Retest", {
        sets: 1,
        start: ctx.canPullUp ? Math.max(1, ctx.pullUpMax || 1) : 4,
        max: ctx.canPullUp ? Math.max(1, ctx.pullUpMax || 1) : 4,
        step: 0,
        targetType: "reps",
        tempo: "Max clean reps only",
        rest: "Full recovery",
        progressionType: "static",
        loadLabel: ctx.canPullUp ? "Load" : "Assistance or load",
        logHint: "Safe clean rep test only.",
        test: true
      }),
      makeExercise("deload-plank-test", "Plank Test", {
        sets: 1,
        start: Math.max(20, ctx.plankMax || 30),
        max: Math.max(20, ctx.plankMax || 30),
        step: 0,
        targetType: "seconds",
        tempo: "Max clean hold",
        rest: "Full recovery",
        progressionType: "static",
        loadLabel: "Note",
        logHint: "Safe clean hold test only.",
        test: true
      })
    ];
    next.goal = "Deload + safe upper-body retests";
    return next;
  }

  next.exercises = (day.exercises || []).map((exercise) => ({
    ...exercise,
    sets: Math.max(1, Math.ceil((exercise.sets || 3) * 0.65)),
    start: exercise.targetType === "minutes"
      ? Math.max(5, exercise.start - 2)
      : Math.max(1, exercise.start)
  }));

  return next;
}

function createRestDay(dateObj) {
  return {
    date: toISODate(dateObj),
    dateLabel: formatDateLabel(dateObj),
    type: "rest",
    title: "Recovery Day",
    goal: "Recovery",
    warmup: [],
    cooldown: [],
    exercises: []
  };
}

function buildWeekSchedule(weekIndex, weekStart, ctx, signals) {
  const workoutMap = getWorkoutMap(ctx.daysPerWeek);
  const weekType = weekIndex === 0 && signals.total >= 2 ? "intervention" : weekIndex === 3 ? "deload" : "normal";
  const weekDays = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dateObj = addDays(weekStart, dayOffset);
    const workoutTitle = workoutMap[dayOffset];

    if (!workoutTitle) {
      weekDays.push(createRestDay(dateObj));
      continue;
    }

    let built;
    if (weekType === "intervention") {
      built = buildInterventionDay(workoutTitle, weekIndex + 1, ctx, signals);
    } else if (workoutTitle.includes("Run")) {
      built = buildNormalRunDay(workoutTitle, weekIndex, ctx);
    } else {
      built = buildNormalStrengthDay(workoutTitle, weekIndex, ctx);
    }

    if (weekType === "deload") {
      built = applyDeloadToBuiltDay(built, ctx);
    }

    weekDays.push({
      date: toISODate(dateObj),
      dateLabel: formatDateLabel(dateObj),
      type: "workout",
      weekIndex: weekIndex + 1,
      weekType,
      title: built.title,
      goal: built.goal,
      warmup: built.warmup,
      cooldown: built.cooldown,
      exercises: built.exercises
    });
  }

  return weekDays;
}

function buildPlan(ctx) {
  const retestSignals = getRetestSignalsFromPreviousPlan();
  const start = new Date(`${ctx.startDate}T12:00:00`);
  const schedule = [];

  for (let weekIndex = 0; weekIndex < 4; weekIndex += 1) {
    const weekStart = addDays(start, weekIndex * 7);
    schedule.push(...buildWeekSchedule(weekIndex, weekStart, ctx, retestSignals));
  }

  const youthMode = ctx.age < 16;

  const summaryParts = [
    `${ctx.daysPerWeek}-day block`,
    youthMode ? "Youth-safe mode on" : "Standard mode",
    goalLabel(ctx.primaryGoal)
  ];

  if (retestSignals.total >= 2) {
    summaryParts.push("Week 1 starts as an intervention week");
  } else {
    summaryParts.push("Week 4 is a deload + safe retest week");
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
    ctx,
    schedule,
    generatorMeta: {
      youthMode,
      retestSignals
    }
  };
}

function getMeaningfulImprovementThreshold(item) {
  const category = item.category;
  const label = String(item.metricLabel || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();

  if (item.better === "lower" && category === "run-test") return 3;
  if (item.better === "lower" && label.includes("assistance")) return 5;
  if (label.includes("distance")) return 0.05;
  if (label.includes("hold")) return 5;
  if (label.includes("load") && category === "legs") return 5;
  if (label.includes("load")) return 2.5;
  if (name.includes("dead hang")) return 5;
  return 1;
}

function detectPlateau(points, item) {
  if (!points || points.length < 4) return false;

  const last3 = points.slice(-3);
  const earlier = points.slice(0, -3);
  if (!earlier.length) return false;

  const threshold = getMeaningfulImprovementThreshold(item);

  if (item.better === "lower") {
    const bestEarlier = Math.min(...earlier.map((p) => p.value));
    return last3.every((p) => p.value >= bestEarlier - threshold);
  }

  const bestEarlier = Math.max(...earlier.map((p) => p.value));
  return last3.every((p) => p.value <= bestEarlier + threshold);
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
  if (n.includes("minute run test")) return "run-test";
  if (n.includes("tempo")) return "run";
  if (n.includes("run")) return "run";
  if (n.includes("repeat")) return "run";

  return "general";
}

function isTestExercise(exercise) {
  return !!exercise?.test || String(exercise?.name || "").toLowerCase().includes("test");
}

function getMetricForEntry(exercise, entry) {
  const category = getExerciseCategory(exercise.name);
  const name = String(exercise.name || "").toLowerCase();

  if (category === "run-test" || (category === "run" && name.includes("mile"))) {
    const secs = parseTimeToSeconds(entry.logText || entry.noteText || "");
    if (secs != null) {
      return {
        value: secs,
        better: "lower",
        display: formatSeconds(secs),
        metricLabel: "Best time"
      };
    }
  }

  if (category === "run") {
    const dist = parseFirstNumber(entry.logText);
    if (dist != null) {
      return {
        value: dist,
        better: "higher",
        display: `${dist} mi`,
        metricLabel: "Distance covered"
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
      better: "lower",
      display: `${Number(entry.loadValue)} assist`,
      metricLabel: "Lowest assistance"
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
      better: "higher",
      display: `${Number(entry.loadValue)} lb`,
      metricLabel: "Highest clean load"
    };
  }

  if (exercise.targetType === "seconds" || category === "core") {
    const best = Array.isArray(entry.values)
      ? Math.max(...entry.values.map(Number).filter(Number.isFinite))
      : null;

    if (Number.isFinite(best)) {
      return {
        value: best,
        better: "higher",
        display: `${best} sec`,
        metricLabel: "Best clean hold"
      };
    }
  }

  if (Array.isArray(entry.values)) {
    const best = Math.max(...entry.values.map(Number).filter(Number.isFinite));
    if (Number.isFinite(best)) {
      return {
        value: best,
        better: "higher",
        display: `${best} reps`,
        metricLabel: "Best clean reps"
      };
    }
  }

  return null;
}

function collectExerciseMetrics(plan, tracker) {
  const map = new Map();

  (plan?.schedule || []).forEach((day) => {
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
          exercise,
          category: getExerciseCategory(exercise.name),
          better: metric.better,
          metricLabel: metric.metricLabel,
          points: []
        });
      }

      map.get(key).points.push({
        date: day.date,
        label: day.dateLabel,
        value: metric.value,
        display: metric.display
      });
    });
  });

  map.forEach((item) => item.points.sort((a, b) => a.date.localeCompare(b.date)));
  return Array.from(map.values());
}

function getRetestSignalsFromPlan(plan) {
  if (!plan || !plan.schedule?.length) {
    return {
      run: false,
      pull: false,
      push: false,
      core: false,
      total: 0,
      notes: []
    };
  }

  const tracker = loadTracker(plan);
  const metrics = collectExerciseMetrics(plan, tracker);
  const today = todayISO();

  const flags = {
    run: false,
    pull: false,
    push: false,
    core: false
  };

  const notes = [];

  metrics.forEach((item) => {
    const recordPoint = pickRecordPoint(item.points, item.better);
    const stale = recordPoint ? daysBetween(recordPoint.date, today) >= staleWindowDays(item.category) : false;
    const plateau = detectPlateau(item.points, item);
    const retest = stale || plateau;

    if (!retest) return;

    const bucket = item.category === "run-test" ? "run" : item.category;
    if (flags[bucket] !== undefined && !flags[bucket]) {
      flags[bucket] = true;
    }

    notes.push(`${item.name}: ${plateau ? "plateau" : "stale record"}`);
  });

  const total = Object.values(flags).filter(Boolean).length;

  return {
    ...flags,
    total,
    notes
  };
}

function getRetestSignalsFromPreviousPlan() {
  return getRetestSignalsFromPlan(getLatestPlan());
}

async function flushPendingPlanIfPossible() {
  const token = getToken();
  const pending = getPendingPlan();

  if (!token || !pending?.plan) return false;

  try {
    const data = await apiPost("/save-plan", {
      planName: pending.planName,
      startDate: pending.startDate,
      plan: pending.plan
    });

    if (data.ok) {
      clearPendingPlan();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function renderPlannerSignals() {
  if (!plannerEls.plannerSignalBox) return;

  const existingPlan = getLatestPlan();
  const signals = getRetestSignalsFromPlan(existingPlan);

  if (!existingPlan) {
    plannerEls.plannerSignalBox.textContent = "No previous plan found yet. The next block will use normal progression.";
    return;
  }

  if (!signals.total) {
    plannerEls.plannerSignalBox.textContent = "No strong stale-record or plateau signal found. Normal progression is recommended.";
    return;
  }

  plannerEls.plannerSignalBox.innerHTML = `
    <strong>${signals.total >= 2 ? "Intervention likely." : "Retest watchlist."}</strong><br>
    ${escapeHTML(signals.notes.join(" • "))}
  `;
}

function renderPlanPreview(plan) {
  if (!plannerEls.planSummaryPreview || !plannerEls.schedulePreview) return;

  if (!plan) {
    plannerEls.planSummaryPreview.textContent = "No plan generated yet.";
    plannerEls.schedulePreview.innerHTML = "";
    return;
  }

  plannerEls.planSummaryPreview.textContent = plan.summary || "Plan generated.";
  plannerEls.schedulePreview.innerHTML = "";

  for (let i = 0; i < plan.schedule.length; i += 7) {
    const week = plan.schedule.slice(i, i + 7);
    const weekIndex = i / 7;

    const block = document.createElement("div");
    block.className = "preview-week";

    const weekTitle = document.createElement("div");
    weekTitle.className = "preview-week-title";
    weekTitle.textContent = `Week ${weekIndex + 1}`;
    block.appendChild(weekTitle);

    week.forEach((day) => {
      const dayCard = document.createElement("div");
      dayCard.className = "preview-day";

      const warning =
        String(day.goal || "").toLowerCase().includes("intervention") ||
        String(day.goal || "").toLowerCase().includes("deload");

      dayCard.innerHTML = `
        <div class="preview-day-top">
          <div>
            <div class="preview-day-name">${escapeHTML(day.title)}</div>
            <div class="preview-day-date">${escapeHTML(day.dateLabel)}</div>
          </div>
          <span class="preview-badge ${warning ? "warn" : ""}">${escapeHTML(day.goal)}</span>
        </div>
      `;

      if (day.type === "rest") {
        const p = document.createElement("div");
        p.className = "field-help";
        p.textContent = "Recovery day";
        dayCard.appendChild(p);
        block.appendChild(dayCard);
        return;
      }

      const ul = document.createElement("ul");
      ul.className = "preview-exercise-list";

      (day.exercises || []).forEach((exercise) => {
        const li = document.createElement("li");
        const unit = getUnitLabel(exercise.targetType);
        li.textContent = `${exercise.name} • ${exercise.sets} set${exercise.sets === 1 ? "" : "s"} • target ${exercise.start} ${unit}`;
        ul.appendChild(li);
      });

      dayCard.appendChild(ul);
      block.appendChild(dayCard);
    });

    plannerEls.schedulePreview.appendChild(block);
  }
}

function getUnitLabel(targetType) {
  if (targetType === "seconds") return "sec";
  if (targetType === "minutes") return "min";
  return "reps";
}

function getContextFromForm() {
  const user = getUser();
  const age = toNumber(plannerEls.age.value || user?.age, 13);

  return {
    startDate: plannerEls.startDate.value,
    age,
    primaryGoal: plannerEls.primaryGoal.value,
    daysPerWeek: Number(plannerEls.daysPerWeek.value),
    equipment: plannerEls.equipment.value,
    sessionLength: plannerEls.sessionLength.value,
    canPullUp: plannerEls.canPullUp.value === "yes",
    pullUpMax: toNumber(plannerEls.pullUpMax.value, 0),
    pushUpMax: toNumber(plannerEls.pushUpMax.value, 10),
    plankMax: toNumber(plannerEls.plankMax.value, 45),
    runBlockMinutes: Math.max(5, toNumber(plannerEls.runBlockMinutes.value, 10)),
    runBlockDistance: toNumber(plannerEls.runBlockDistance.value, 0),
    mileTime: plannerEls.mileTime.value.trim()
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
  setLatestPlan(plan);
  setPendingPlan({
    planName: plan.planName,
    startDate: plan.startDate,
    plan
  });

  const token = getToken();
  if (!token) {
    setPlannerStatus("Plan generated and saved locally. Log in to save it to your account.", "ok");
    return;
  }

  try {
    const data = await apiPost("/save-plan", {
      planName: plan.planName,
      startDate: plan.startDate,
      plan
    });

    if (data.ok) {
      clearPendingPlan();
      setPlannerStatus("Plan generated and saved to your account.", "ok");
      return;
    }

    setPlannerStatus(data.error || "Plan saved locally, but backend save failed.", "bad");
  } catch (error) {
    setPlannerStatus(`Plan saved locally, but backend save failed: ${error.message}`, "bad");
  }
}

async function initializePlanner() {
  const user = getUser();

  if (plannerEls.startDate) plannerEls.startDate.value = startDateDefault();
  if (user?.age && plannerEls.age) plannerEls.age.value = String(user.age);

  if (plannerEls.pushUpMax && !plannerEls.pushUpMax.value) plannerEls.pushUpMax.value = "10";
  if (plannerEls.plankMax && !plannerEls.plankMax.value) plannerEls.plankMax.value = "45";
  if (plannerEls.runBlockMinutes && !plannerEls.runBlockMinutes.value) plannerEls.runBlockMinutes.value = "10";
  if (plannerEls.runBlockDistance && !plannerEls.runBlockDistance.value) plannerEls.runBlockDistance.value = "0.8";

  await flushPendingPlanIfPossible();

  const existingPlan = getLatestPlan();
  if (existingPlan?.schedule?.length) {
    appState.currentGeneratedPlan = existingPlan;
    renderPlanPreview(existingPlan);
    setPlannerStatus("Loaded your latest saved plan preview.");
  } else {
    setPlannerStatus("Fill the form, then generate the plan.");
  }

  renderPlannerSignals();

  plannerEls.generatePlanBtn?.addEventListener("click", () => {
    const ctx = getContextFromForm();
    const error = validateContext(ctx);

    if (error) {
      setPlannerStatus(error, "bad");
      return;
    }

    appState.currentGeneratedPlan = buildPlan(ctx);
    renderPlanPreview(appState.currentGeneratedPlan);
    renderPlannerSignals();
    setPlannerStatus("Plan generated. Save it if it looks right.", "ok");
  });

  plannerEls.savePlanBtn?.addEventListener("click", async () => {
    if (!appState.currentGeneratedPlan) {
      setPlannerStatus("Generate the plan first.", "bad");
      return;
    }

    await savePlan(appState.currentGeneratedPlan);
  });
}

function getLocalOrLoggedOutProfile() {
  const user = getUser();
  if (user) return user;

  return {
    username: "Local mode",
    email: "Not signed in",
    age: appState.currentPlan?.ctx?.age ?? "Unknown",
    ageBand: "—",
    parentRequired: false
  };
}

async function loadDashboardData() {
  await flushPendingPlanIfPossible();

  appState.currentUser = getUser();
  let plan = getLatestPlan();

  const token = getToken();

  if (token) {
    try {
      const me = await apiGet("/me");
      if (me.ok && me.user) {
        localStorage.setItem(STORAGE.user, JSON.stringify(me.user));
        appState.currentUser = me.user;
      }
    } catch {}

    try {
      const planData = await apiGet("/my-plan");
      if (planData.ok && planData.plan) {
        plan = planData.plan;
        setLatestPlan(plan);
      }
    } catch {}
  }

  appState.currentPlan = plan;
  appState.currentTracker = loadTracker(plan);
  appState.todayDay = getTodayDay(plan);
}

function getTodayDay(plan) {
  if (!plan?.schedule?.length) return null;
  return plan.schedule.find((day) => day.date === todayISO()) || null;
}

function getNextWorkout(plan) {
  if (!plan?.schedule?.length) return null;
  return plan.schedule.find((day) => day.type === "workout" && day.date >= todayISO()) || null;
}

function countWorkoutStreak(plan, tracker) {
  if (!plan) return 0;

  const today = todayISO();
  const workoutDates = (plan.schedule || [])
    .filter((day) => day.type === "workout" && day.date <= today)
    .map((day) => day.date);

  let streak = 0;
  for (let i = workoutDates.length - 1; i >= 0; i -= 1) {
    const done = !!(tracker.days?.[workoutDates[i]] && Object.keys(tracker.days[workoutDates[i]]).some((k) => !k.startsWith("_")));
    if (done) streak += 1;
    else break;
  }

  return streak;
}

function renderProfile() {
  const user = getLocalOrLoggedOutProfile();
  const streak = countWorkoutStreak(appState.currentPlan, appState.currentTracker);

  dashEls.profileBox.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <span class="metric-label">User</span>
        <strong class="metric-value">${escapeHTML(user.username)}</strong>
      </div>
      <div class="metric-card">
        <span class="metric-label">Email</span>
        <strong class="metric-value small-value">${escapeHTML(user.email)}</strong>
      </div>
      <div class="metric-card">
        <span class="metric-label">Age</span>
        <strong class="metric-value">${escapeHTML(user.age)}</strong>
      </div>
      <div class="metric-card">
        <span class="metric-label">Mode</span>
        <strong class="metric-value">${appState.currentPlan?.generatorMeta?.youthMode ? "Youth-safe" : "Standard"}</strong>
      </div>
    </div>
  `;

  dashEls.streakBox.innerHTML = `<strong>Workout streak:</strong> ${streak}`;
}

function renderCurrentPlan() {
  const plan = appState.currentPlan;

  if (!plan) {
    dashEls.currentPlanBox.className = "empty-box";
    dashEls.currentPlanBox.textContent = "No plan found yet.";
    return;
  }

  const next = getNextWorkout(plan);

  dashEls.currentPlanBox.className = "summary-box";
  dashEls.currentPlanBox.innerHTML = `
    <div class="plan-summary-grid">
      <div class="metric-card">
        <span class="metric-label">Plan</span>
        <strong class="metric-value small-value">${escapeHTML(plan.planName || "FitnessPlan")}</strong>
      </div>
      <div class="metric-card">
        <span class="metric-label">Start date</span>
        <strong class="metric-value">${escapeHTML(plan.startDate || "—")}</strong>
      </div>
      <div class="metric-card">
        <span class="metric-label">Goal</span>
        <strong class="metric-value small-value">${escapeHTML(goalLabel(plan.ctx?.primaryGoal || "5k"))}</strong>
      </div>
      <div class="metric-card">
        <span class="metric-label">Next workout</span>
        <strong class="metric-value small-value">${next ? escapeHTML(`${next.dateLabel} • ${next.title}`) : "Block complete"}</strong>
      </div>
    </div>
    <div class="status-box">${escapeHTML(plan.summary || "Plan loaded.")}</div>
  `;
}

function renderInterventionBanner() {
  const signals = getRetestSignalsFromPlan(appState.currentPlan);

  if (!signals.total) {
    dashEls.interventionBanner.className = "banner hidden";
    dashEls.interventionBanner.textContent = "";
    return;
  }

  dashEls.interventionBanner.className = `banner ${signals.total >= 2 ? "warn" : "ok"}`;
  dashEls.interventionBanner.innerHTML = `
    <strong>${signals.total >= 2 ? "Intervention week is recommended soon." : "Retest watchlist active."}</strong><br>
    ${escapeHTML(signals.notes.join(" • "))}
  `;
}

function getPriorComparableHistory(plan, tracker, exercise, beforeDate) {
  const exerciseName = String(exercise.name || "").toLowerCase();
  const category = getExerciseCategory(exercise.name);
  const output = [];

  (plan?.schedule || [])
    .filter((day) => day.type === "workout" && day.date < beforeDate)
    .forEach((day) => {
      (day.exercises || []).forEach((otherExercise) => {
        const sameName = String(otherExercise.name || "").toLowerCase() === exerciseName;
        const sameCategory = getExerciseCategory(otherExercise.name) === category;

        if (!sameName && !sameCategory) return;

        const entry = tracker.days?.[day.date]?.[otherExercise.id];
        if (!entry) return;

        output.push({
          date: day.date,
          exercise: otherExercise,
          entry,
          category: getExerciseCategory(otherExercise.name)
        });
      });
    });

  return output;
}

function countPriorCleanComparableSessions(plan, tracker, exercise, beforeDate) {
  const history = getPriorComparableHistory(plan, tracker, exercise, beforeDate);

  return history.filter((item) => !isTestExercise(item.exercise)).length;
}

function hasRecentTestInCategory(plan, tracker, exercise, beforeDate) {
  const category = getExerciseCategory(exercise.name);
  const history = getPriorComparableHistory(plan, tracker, exercise, beforeDate)
    .filter((item) => item.category === category && isTestExercise(item.exercise));

  if (!history.length) return false;

  const latest = history.sort((a, b) => b.date.localeCompare(a.date))[0];
  return daysBetween(latest.date, beforeDate) <= 14;
}

function canExerciseTestToday(plan, tracker, day, exercise, readinessSummary) {
  if (!isTestExercise(exercise)) {
    return { allowed: true, reason: "" };
  }

  if (!readinessSummary) {
    return {
      allowed: false,
      reason: "Set readiness first."
    };
  }

  if (!readinessSummary.testingAllowed) {
    return {
      allowed: false,
      reason: "Readiness is not high enough for safe testing today."
    };
  }

  const cleanSessions = countPriorCleanComparableSessions(plan, tracker, exercise, day.date);
  if (cleanSessions < 2) {
    return {
      allowed: false,
      reason: "Not enough successful comparable sessions yet."
    };
  }

  if (hasRecentTestInCategory(plan, tracker, exercise, day.date)) {
    return {
      allowed: false,
      reason: "A recent test already happened in this category."
    };
  }

  return { allowed: true, reason: "" };
}

function getAdjustedExercisePlan(day, readinessSummary) {
  const exercises = day.exercises || [];
  const adjusted = [];

  exercises.forEach((exercise, index) => {
    const copy = structuredCloneSafe(exercise);
    copy.skipped = false;
    copy.adjustedNote = "";

    if (!readinessSummary || readinessSummary.level === "normal" || readinessSummary.level === "high") {
      adjusted.push(copy);
      return;
    }

    if (isTestExercise(copy)) {
      copy.skipped = true;
      copy.adjustedNote = "Safe test skipped today because readiness is low.";
      adjusted.push(copy);
      return;
    }

    const category = getExerciseCategory(copy.name);

    if (index >= 2) {
      copy.skipped = true;
      copy.adjustedNote = "Accessory cut first because readiness is low.";
      adjusted.push(copy);
      return;
    }

    if (category === "run" || category === "run-test") {
      copy.start = Math.max(5, Math.floor((copy.start || 5) * 0.7));
      copy.max = copy.start;
      copy.tempo = "Aerobic conversational run";
      copy.adjustedNote = "Run reduced and made easier because readiness is low.";
      adjusted.push(copy);
      return;
    }

    copy.sets = Math.max(1, (copy.sets || 1) - 1);
    copy.adjustedNote = "Volume reduced because readiness is low.";
    adjusted.push(copy);
  });

  return adjusted;
}

function getTodayGoalCallout(day) {
  const goal = String(day.goal || "").toLowerCase();
  if (goal.includes("tempo")) return "Comfortably hard, controlled effort";
  if (goal.includes("aerobic")) return "Aerobic conversational run";
  if (goal.includes("speed")) return "Controlled speed work";
  if (goal.includes("intervention")) return "Deload + safe retest work";
  return day.goal || "Today’s workout";
}

function renderTodayWorkout() {
  const plan = appState.currentPlan;
  const day = appState.todayDay;
  const tracker = appState.currentTracker || { days: {} };

  if (!plan) {
    dashEls.todayWorkoutBox.innerHTML = `<div class="empty-box">No saved plan yet.</div>`;
    dashEls.todayReadinessBox.innerHTML = "";
    dashEls.todayLogBox.innerHTML = "";
    setTodayLogStatus("No plan loaded.", "bad");
    return;
  }

  if (!day) {
    const next = getNextWorkout(plan);
    dashEls.todayWorkoutBox.innerHTML = `
      <div class="today-card">
        <h3>No workout scheduled today.</h3>
        <div class="helper">${next ? `Next workout: ${escapeHTML(next.dateLabel)} • ${escapeHTML(next.title)}` : "This block is complete."}</div>
      </div>
    `;
    dashEls.todayReadinessBox.innerHTML = "";
    dashEls.todayLogBox.innerHTML = "";
    setTodayLogStatus("No workout to log today.", "warn");
    return;
  }

  if (day.type === "rest") {
    dashEls.todayWorkoutBox.innerHTML = `
      <div class="today-card">
        <div class="day-topline">
          <span class="date-chip">${escapeHTML(day.dateLabel)}</span>
          <span class="pill neutral">Rest day</span>
        </div>
        <h3>Recovery Day</h3>
        <div class="helper">No workout is scheduled today.</div>
      </div>
    `;
    dashEls.todayReadinessBox.innerHTML = "";
    dashEls.todayLogBox.innerHTML = "";
    setTodayLogStatus("Recovery day. No log needed.", "ok");
    return;
  }

  const readiness = getDayReadiness(tracker, day.date);
  const readinessSummary = computeReadinessSummary(readiness);
  const adjustedExercises = getAdjustedExercisePlan(day, readinessSummary);

  dashEls.todayWorkoutBox.innerHTML = `
    <div class="today-card">
      <div class="day-topline">
        <span class="date-chip">${escapeHTML(day.dateLabel)}</span>
        <span class="pill ${day.weekType === "intervention" || day.weekType === "deload" ? "warn" : "neutral"}">${escapeHTML(day.weekType || "normal")}</span>
      </div>

      <h3>${escapeHTML(day.title)}</h3>

      <div class="goal-callout">
        <div class="goal-callout-label">Goal</div>
        <div class="goal-callout-text">${escapeHTML(getTodayGoalCallout(day))}</div>
      </div>

      <div class="session-block">
        <h4>Warm-up</h4>
        <ul>
          ${(day.warmup || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
        </ul>
      </div>

      <div class="session-block">
        <h4>Workout</h4>
        <div class="exercise-preview-list">
          ${adjustedExercises.map((exercise) => {
            const unit = getUnitLabel(exercise.targetType);
            const testGate = canExerciseTestToday(plan, tracker, day, exercise, readinessSummary);

            return `
              <div class="exercise-preview-card ${exercise.skipped ? "muted" : ""}">
                <div class="exercise-preview-top">
                  <strong>${escapeHTML(exercise.name)}</strong>
                  <span class="tag ${isTestExercise(exercise) ? "warn" : "good"}">${isTestExercise(exercise) ? "safe test" : "training"}</span>
                </div>
                <div class="record-sub">
                  ${
                    exercise.skipped
                      ? escapeHTML(exercise.adjustedNote)
                      : `${exercise.sets} set${exercise.sets === 1 ? "" : "s"} • target ${exercise.start}${exercise.max !== exercise.start ? `–${exercise.max}` : ""} ${unit} • ${escapeHTML(exercise.tempo)}`
                  }
                </div>
                ${
                  exercise.adjustedNote && !exercise.skipped
                    ? `<div class="record-sub">${escapeHTML(exercise.adjustedNote)}</div>`
                    : ""
                }
                ${
                  isTestExercise(exercise) && !testGate.allowed
                    ? `<div class="record-sub test-lock">${escapeHTML(testGate.reason)}</div>`
                    : ""
                }
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="session-block">
        <h4>Cooldown</h4>
        <ul>
          ${(day.cooldown || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;

  renderTodayReadiness(plan, tracker, day, readiness, readinessSummary);
  renderTodayLog(plan, tracker, day, readinessSummary, adjustedExercises);
}

function renderTodayReadiness(plan, tracker, day, readiness, readinessSummary) {
  dashEls.todayReadinessBox.innerHTML = `
    <div class="readiness-box">
      <h3>Today’s Readiness</h3>

      <div class="readiness-grid">
        <div>
          <label for="todaySleepHours">Sleep (hours)</label>
          <input id="todaySleepHours" type="number" min="0" max="14" step="0.25" placeholder="Example: 7.5" value="${readiness?.sleepHours ?? ""}" />
        </div>

        <div>
          <label for="todaySoreness">Soreness (1 to 5)</label>
          <input id="todaySoreness" type="number" min="1" max="5" step="1" placeholder="1 to 5" value="${readiness?.soreness ?? ""}" />
        </div>

        <div>
          <label for="todayEnergy">Energy (1 to 5)</label>
          <input id="todayEnergy" type="number" min="1" max="5" step="1" placeholder="1 to 5" value="${readiness?.energy ?? ""}" />
        </div>
      </div>

      <div class="readiness-actions">
        <button type="button" id="saveReadinessBtn">Set readiness</button>
        <button type="button" class="secondary" id="resetReadinessBtn">Reset readiness</button>
        ${
          readinessSummary
            ? `<span class="tag ${readinessSummary.level === "low" ? "warn" : "good"}">${escapeHTML(readinessSummary.label)}</span>`
            : ""
        }
      </div>

      <div class="readiness-note ${readinessSummary?.level === "low" ? "low" : readinessSummary?.level === "high" ? "high" : ""}">
        ${
          readinessSummary
            ? escapeHTML(readinessSummary.note)
            : "Readiness is required before logging. Sleep is typed in hours. Soreness and energy use 1 to 5."
        }
      </div>
    </div>
  `;

  document.getElementById("saveReadinessBtn")?.addEventListener("click", () => {
    const sleepHours = Number(document.getElementById("todaySleepHours")?.value);
    const soreness = Number(document.getElementById("todaySoreness")?.value);
    const energy = Number(document.getElementById("todayEnergy")?.value);

    if (!Number.isFinite(sleepHours) || sleepHours <= 0 || sleepHours > 24) {
      alert("Enter a real sleep value in hours.");
      return;
    }

    if (!Number.isFinite(soreness) || soreness < 1 || soreness > 5) {
      alert("Soreness must be from 1 to 5.");
      return;
    }

    if (!Number.isFinite(energy) || energy < 1 || energy > 5) {
      alert("Energy must be from 1 to 5.");
      return;
    }

    setDayReadiness(plan, tracker, day.date, {
      sleepHours,
      soreness,
      energy
    });

    appState.currentTracker = loadTracker(plan);
    renderDashboardAll();
  });

  document.getElementById("resetReadinessBtn")?.addEventListener("click", () => {
    clearDayReadiness(plan, tracker, day.date);
    appState.currentTracker = loadTracker(plan);
    renderDashboardAll();
  });
}

function getRunCue(exercise) {
  const name = String(exercise?.name || "").toLowerCase();
  if (name.includes("easy")) return "Aerobic conversational run";
  if (name.includes("tempo")) return "Comfortably hard, controlled effort";
  if (name.includes("interval")) return "Strong repeatable effort";
  if (name.includes("hard")) return "Strong repeatable effort";
  if (name.includes("mile")) return "Flat route or track test";
  return exercise.tempo || "Controlled running";
}

function getExerciseLogLabel(exercise) {
  const name = String(exercise?.name || "").toLowerCase();
  const targetType = exercise?.targetType || "reps";

  if (name.includes("mile")) return "Log mile time";
  if (name.includes("run test")) return "Log distance covered";
  if (name.includes("easy run")) return "Log distance covered";
  if (name.includes("tempo")) return "Log distance covered";
  if (targetType === "seconds") return "Log seconds completed";
  return "Log reps completed";
}

function getInputPlaceholder(exercise) {
  const name = String(exercise?.name || "").toLowerCase();
  const targetType = exercise?.targetType || "reps";

  if (name.includes("mile")) return "Example: 7:42";
  if (name.includes("run")) return "Example: 1.25";
  if (targetType === "seconds") return "sec";
  return "reps";
}

function renderTodayLog(plan, tracker, day, readinessSummary, adjustedExercises) {
  if (!readinessSummary) {
    dashEls.todayLogBox.innerHTML = `<div class="empty-box">Set readiness before logging today.</div>`;
    setTodayLogStatus("Readiness is required before logging.", "warn");
    return;
  }

  const visibleExercises = adjustedExercises.filter((exercise) => {
    if (exercise.skipped) return false;
    const gate = canExerciseTestToday(plan, tracker, day, exercise, readinessSummary);
    if (isTestExercise(exercise) && !gate.allowed) return false;
    return true;
  });

  if (!visibleExercises.length) {
    dashEls.todayLogBox.innerHTML = `<div class="empty-box">Nothing is loggable today after readiness adjustments.</div>`;
    setTodayLogStatus("No loggable work today.", "warn");
    return;
  }

  dashEls.todayLogBox.innerHTML = `
    <div class="today-log-card">
      <h3>Log Today’s Work</h3>
      <div class="today-log-list">
        ${visibleExercises.map((exercise) => renderExerciseLogCard(day, tracker, exercise)).join("")}
      </div>

      <div class="save-bar">
        <button type="button" id="saveTodayLogBtn">Save day log</button>
      </div>
    </div>
  `;

  document.getElementById("saveTodayLogBtn")?.addEventListener("click", () => {
    const nextTracker = loadTracker(plan);
    if (!nextTracker.days[day.date]) nextTracker.days[day.date] = {};
    const dayBucket = nextTracker.days[day.date];

    let wroteAnyData = false;

    visibleExercises.forEach((exercise) => {
      const card = dashEls.todayLogBox.querySelector(`[data-log-card="${exercise.id}"]`);
      if (!card) return;

      const category = getExerciseCategory(exercise.name);
      const existing = dayBucket[exercise.id] || {};

      if (category === "run" || category === "run-test") {
        const logText = card.querySelector("[data-run-log]")?.value?.trim() || "";
        const noteText = card.querySelector("[data-run-note]")?.value?.trim() || "";

        if (!logText && !noteText) return;

        dayBucket[exercise.id] = {
          ...existing,
          logText,
          noteText,
          savedAt: new Date().toISOString()
        };
        wroteAnyData = true;
        return;
      }

      const values = [...card.querySelectorAll("[data-set-value]")]
        .map((input) => Number(input.value))
        .filter((n) => Number.isFinite(n) && n > 0);

      const loadType = card.querySelector("[data-load-type]")?.value || "";
      const loadValueRaw = card.querySelector("[data-load-value]")?.value ?? "";
      const loadValue = loadValueRaw === "" ? "" : Number(loadValueRaw);

      if (!values.length && loadValueRaw === "") return;

      dayBucket[exercise.id] = {
        ...existing,
        values,
        loadType,
        loadValue,
        savedAt: new Date().toISOString()
      };
      wroteAnyData = true;
    });

    if (!wroteAnyData) {
      setTodayLogStatus("Enter at least one real result before saving.", "bad");
      return;
    }

    saveTracker(plan, nextTracker);
    appState.currentTracker = loadTracker(plan);
    setTodayLogStatus("Day log saved locally.", "ok");
    renderDashboardAll();
  });

  setTodayLogStatus("Logging unlocked. Enter actual clean work completed.", "ok");
}

function renderExerciseLogCard(day, tracker, exercise) {
  const existing = tracker.days?.[day.date]?.[exercise.id] || {};
  const category = getExerciseCategory(exercise.name);

  if (category === "run" || category === "run-test") {
    const isMile = String(exercise.name || "").toLowerCase().includes("mile");
    return `
      <div class="log-exercise-card" data-log-card="${escapeHTML(exercise.id)}">
        <div class="log-exercise-head">
          <div>
            <div class="record-name">${escapeHTML(exercise.name)}</div>
            <div class="record-sub">${escapeHTML(getRunCue(exercise))}</div>
          </div>
          <span class="tag ${isTestExercise(exercise) ? "warn" : "good"}">${isTestExercise(exercise) ? "safe test" : "run"}</span>
        </div>

        <label class="log-label-strong">${escapeHTML(getExerciseLogLabel(exercise))}</label>
        <input class="small-input" data-run-log type="text" placeholder="${escapeHTML(getInputPlaceholder(exercise))}" value="${escapeHTML(existing.logText || "")}" />

        <div class="small-note">
          <label>Optional notes</label>
          <textarea class="small-textarea" data-run-note placeholder="Optional. Mainly for running.">${escapeHTML(existing.noteText || "")}</textarea>
        </div>
      </div>
    `;
  }

  const values = Array.isArray(existing.values) ? existing.values : [];
  const loadType = existing.loadType || "";
  const loadValue = existing.loadValue ?? "";

  return `
    <div class="log-exercise-card" data-log-card="${escapeHTML(exercise.id)}">
      <div class="log-exercise-head">
        <div>
          <div class="record-name">${escapeHTML(exercise.name)}</div>
          <div class="record-sub">${escapeHTML(exercise.logHint || "Log clean work only.")}</div>
        </div>
        <span class="tag good">strength</span>
      </div>

      <label class="log-label-strong">${escapeHTML(getExerciseLogLabel(exercise))}</label>
      <div class="set-grid">
        ${Array.from({ length: exercise.sets }).map((_, i) => `
          <div>
            <label>Set ${i + 1}</label>
            <input
              class="small-input"
              data-set-value
              type="number"
              min="0"
              step="1"
              placeholder="${escapeHTML(getInputPlaceholder(exercise))}"
              value="${values[i] ?? ""}"
            />
          </div>
        `).join("")}
      </div>

      <div class="tracker-load-grid small-note">
        <div>
          <label>Load type</label>
          <select class="small-input" data-load-type>
            <option value="" ${loadType === "" ? "selected" : ""}>None</option>
            <option value="load" ${loadType === "load" ? "selected" : ""}>Load</option>
            <option value="assistance" ${loadType === "assistance" ? "selected" : ""}>Assistance</option>
          </select>
        </div>

        <div>
          <label>${escapeHTML(exercise.loadLabel || "Assistance or load")}</label>
          <input
            class="small-input"
            data-load-value
            type="number"
            min="0"
            step="0.5"
            placeholder="Optional"
            value="${loadValue}"
          />
        </div>
      </div>
    </div>
  `;
}

function formatMetricDisplay(item, point) {
  if (!point) return "No record yet";
  return point.display || String(point.value);
}

function renderRecordsAndRetests() {
  const plan = appState.currentPlan;
  const tracker = appState.currentTracker || loadTracker(plan);
  const metrics = collectExerciseMetrics(plan, tracker);

  if (!metrics.length) {
    dashEls.recordsBox.className = "empty-box";
    dashEls.recordsBox.textContent = "No records yet. Log workouts first.";
    dashEls.retestsBox.className = "empty-box";
    dashEls.retestsBox.textContent = "Retest suggestions will appear after comparable logs exist.";
    return;
  }

  const today = todayISO();
  const records = [];
  const retestNotes = [];

  metrics.forEach((item) => {
    const recordPoint = pickRecordPoint(item.points, item.better);
    const stale = recordPoint ? daysBetween(recordPoint.date, today) >= staleWindowDays(item.category) : false;
    const plateau = detectPlateau(item.points, item);
    const retest = stale || plateau;

    records.push({
      ...item,
      recordPoint,
      stale,
      plateau,
      retest
    });

    if (retest) {
      retestNotes.push(`${item.name}: ${plateau ? "plateau" : "stale record"}`);
    }
  });

  records.sort((a, b) => a.name.localeCompare(b.name));

  dashEls.recordsBox.className = "";
  dashEls.recordsBox.innerHTML = `
    <div class="records-list">
      ${records.map((item) => `
        <div class="record-item">
          <div class="record-top">
            <div>
              <div class="record-name">${escapeHTML(item.name)}</div>
              <div class="record-sub">${escapeHTML(item.metricLabel)}</div>
            </div>
            <span class="tag ${item.retest ? "warn" : "good"}">${item.retest ? "Retest" : "Active"}</span>
          </div>
          <div class="record-value">${escapeHTML(formatMetricDisplay(item, item.recordPoint))}</div>
          <div class="record-sub">
            ${item.recordPoint ? `Set on ${escapeHTML(item.recordPoint.label)}` : "No record yet."}
            ${item.plateau ? " • plateau detected" : item.stale ? " • stale record" : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;

  if (!retestNotes.length) {
    dashEls.retestsBox.className = "";
    dashEls.retestsBox.innerHTML = `<div class="status-box ok">No retest is currently recommended.</div>`;
    return;
  }

  dashEls.retestsBox.className = "";
  dashEls.retestsBox.innerHTML = `
    <div class="status-box ${retestNotes.length >= 2 ? "warn" : "ok"}">
      <strong>${retestNotes.length >= 2 ? "Intervention week recommended" : "Retest watchlist active"}</strong>
      <div>${appState.todayDay ? "Safe retests only happen when readiness is good and enough clean sessions exist." : "Recommendations are based on stale or plateaued records."}</div>
    </div>
    <ul class="recommendation-list">
      ${retestNotes.map((note) => `<li>${escapeHTML(note)}</li>`).join("")}
    </ul>
  `;
}

function createSparkline(points, better) {
  if (!points || points.length < 2) {
    return `<svg class="chart-svg" viewBox="0 0 300 74" preserveAspectRatio="none">
      <text x="12" y="42" fill="#94a3b8" font-size="12">Need more logs to chart progress</text>
    </svg>`;
  }

  const width = 300;
  const height = 74;
  const padX = 12;
  const padY = 10;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(1, points.length - 1);
    let normalized = (p.value - min) / range;
    if (better === "lower") normalized = 1 - normalized;
    const y = padY + (1 - normalized) * (height - padY * 2);
    return { x, y };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const circles = coords.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="3.2" fill="#93c5fd" />`).join("");

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <path d="${path}" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${circles}
    </svg>
  `;
}

function renderCharts() {
  const plan = appState.currentPlan;
  const tracker = appState.currentTracker || loadTracker(plan);
  const metrics = collectExerciseMetrics(plan, tracker);

  if (!metrics.length) {
    dashEls.chartsBox.className = "empty-box";
    dashEls.chartsBox.textContent = "Charts will appear after you log workouts.";
    return;
  }

  dashEls.chartsBox.className = "";
  dashEls.chartsBox.innerHTML = `
    <div class="charts-list">
      ${metrics
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => {
          const latest = item.points[item.points.length - 1];
          const recordPoint = pickRecordPoint(item.points, item.better);

          return `
            <div class="chart-item">
              <div class="chart-top">
                <div>
                  <div class="chart-name">${escapeHTML(item.name)}</div>
                  <div class="record-sub">${escapeHTML(item.metricLabel)}</div>
                </div>
                <span class="tag">${latest ? escapeHTML(latest.display) : "No data"}</span>
              </div>
              ${createSparkline(item.points, item.better)}
              <div class="chart-sub">${recordPoint ? `Record: ${escapeHTML(recordPoint.display)}` : "No chart data yet."}</div>
            </div>
          `;
        }).join("")}
    </div>
  `;
}

function splitIntoWeeks(schedule) {
  const weeks = [];
  for (let i = 0; i < (schedule || []).length; i += 7) {
    weeks.push(schedule.slice(i, i + 7));
  }
  return weeks;
}

function formatWeekRange(week) {
  if (!week.length) return "Week";
  return `Week of ${week[0].dateLabel} to ${week[week.length - 1].dateLabel}`;
}

function renderWeekTracker() {
  const plan = appState.currentPlan;
  const tracker = appState.currentTracker || loadTracker(plan);

  if (!plan) {
    dashEls.weekTrackerBox.className = "empty-box";
    dashEls.weekTrackerBox.textContent = "No plan found yet.";
    return;
  }

  const weeks = splitIntoWeeks(plan.schedule || []);
  const today = todayISO();
  let weekIndex = weeks.findIndex((week) => week.some((day) => day.date === today));
  if (weekIndex < 0) {
    weekIndex = plan.schedule?.[0]?.date && today < plan.schedule[0].date ? 0 : Math.max(0, weeks.length - 1);
  }

  const week = weeks[weekIndex] || [];

  dashEls.weekTrackerBox.className = "";
  dashEls.weekTrackerBox.innerHTML = `
    <div class="week-title">${escapeHTML(formatWeekRange(week))}</div>
    <div class="week-list">
      ${week.map((day) => {
        const logged = !!(tracker.days?.[day.date] && Object.keys(tracker.days[day.date]).some((k) => !k.startsWith("_")));
        const isToday = day.date === today;
        const missed = day.date < today && day.type === "workout" && !logged;

        return `
          <div class="week-row ${isToday ? "today" : ""} ${logged ? "logged" : ""} ${missed ? "missed" : ""}">
            <div>
              <strong>${escapeHTML(day.dateLabel)}</strong>
              <div class="record-sub">${escapeHTML(day.title)}</div>
            </div>
            <span class="tag ${logged ? "good" : missed ? "warn" : ""}">
              ${logged ? "Logged" : day.type === "rest" ? "Rest" : isToday ? "Today" : missed ? "Not logged" : "Ahead"}
            </span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderCalendar() {
  const plan = appState.currentPlan;

  if (!plan) {
    dashEls.calendarBox.className = "empty-box";
    dashEls.calendarBox.textContent = "No plan found yet.";
    return;
  }

  const upcomingWeeks = splitIntoWeeks((plan.schedule || []).filter((day) => day.date >= todayISO()));

  if (!upcomingWeeks.length) {
    dashEls.calendarBox.className = "empty-box";
    dashEls.calendarBox.textContent = "This block is complete.";
    return;
  }

  dashEls.calendarBox.className = "";
  dashEls.calendarBox.innerHTML = upcomingWeeks.map((week) => `
    <section class="calendar-section">
      <div class="week-title">${escapeHTML(formatWeekRange(week))}</div>
      <div class="calendar-grid">
        ${week.map((day) => `
          <div class="calendar-card ${day.type === "rest" ? "rest" : ""}">
            <div class="day-top">
              <div>
                <div class="day-date">${escapeHTML(day.dateLabel)}</div>
                <div class="helper">${escapeHTML(day.title)}</div>
              </div>
              <span class="badge ${day.type === "rest" ? "rest" : ""}">${escapeHTML(day.goal)}</span>
            </div>
            <div class="helper">${escapeHTML((day.exercises || []).map((ex) => ex.name).join(", ") || "Recovery")}</div>
          </div>
        `).join("")}
      </div>
    </section>
  `).join("");
}

function renderDashboardAll() {
  renderProfile();
  renderCurrentPlan();
  renderInterventionBanner();
  renderTodayWorkout();
  renderRecordsAndRetests();
  renderCharts();
  renderWeekTracker();
  renderCalendar();
}

async function initializeDashboard() {
  await loadDashboardData();
  renderDashboardAll();

  dashEls.logoutBtn?.addEventListener("click", async () => {
    const token = getToken();

    if (token) {
      try {
        await fetch(`${API}/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }

    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.user);
    window.location.href = "./account-test.html";
  });
}

function boot() {
  const hasPlanner = !!plannerEls.generatePlanBtn;
  const hasDashboard = !!dashEls.profileBox;

  if (hasPlanner) {
    initializePlanner();
  }

  if (hasDashboard) {
    initializeDashboard();
  }
}

document.addEventListener("DOMContentLoaded", boot);
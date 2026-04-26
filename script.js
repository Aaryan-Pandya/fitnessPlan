const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

const STORAGE_KEYS = {
  user: "fitnessplan_user",
  token: "fitnessplan_token",
  latestPlan: "fitnessplan_latest_plan",
  pendingPlan: "fitnessplan_pending_plan"
};

const plannerEls = {
  plannerForm: document.getElementById("plannerForm"),
  age: document.getElementById("age"),
  primaryGoal: document.getElementById("primaryGoal"),
  daysPerWeek: document.getElementById("daysPerWeek"),
  sessionLength: document.getElementById("sessionLength"),
  styleChecks: Array.from(document.querySelectorAll("[data-style-choice]")),
  canDoPushup: document.getElementById("canDoPushup"),
  pushUpMax: document.getElementById("pushUpMax"),
  canPullUp: document.getElementById("canPullUp"),
  pullUpMax: document.getElementById("pullUpMax"),
  plankMax: document.getElementById("plankMax"),
  mileTime: document.getElementById("mileTime"),
  runDurationValue: document.getElementById("runDurationValue"),
  runDurationUnit: document.getElementById("runDurationUnit"),
  runDistanceValue: document.getElementById("runDistanceValue"),
  runDistanceUnit: document.getElementById("runDistanceUnit"),
  startDate: document.getElementById("startDate"),
  pushCountWrap: document.getElementById("pushCountWrap"),
  pullCountWrap: document.getElementById("pullCountWrap"),
  generateBtn: document.getElementById("generatePlanBtn"),
  saveBtn: document.getElementById("savePlanBtn"),
  status: document.getElementById("plannerStatus"),
  summaryPreview: document.getElementById("planSummaryPreview"),
  schedulePreview: document.getElementById("schedulePreview")
};

const dashEls = {
  logoutBtn: document.getElementById("logoutBtn"),
  profileBox: document.getElementById("profileBox"),
  currentPlanBox: document.getElementById("currentPlanBox"),
  recordsBox: document.getElementById("recordsBox"),
  signalsBox: document.getElementById("signalsBox"),
  quickStatsBox: document.getElementById("quickStatsBox"),
  todayBox: document.getElementById("todayBox"),
  todayStatus: document.getElementById("todayStatus"),
  weekTitle: document.getElementById("weekTitle"),
  weekTrackerBox: document.getElementById("weekTrackerBox"),
  calendarBox: document.getElementById("calendarBox"),
  streakHeroNumber: document.getElementById("streakHeroNumber"),
  streakHeroSub: document.getElementById("streakHeroSub")
};

let currentGeneratedPlan = null;

document.addEventListener("DOMContentLoaded", () => {
  initPlanner();
  initDashboard();
  initLogout();
});

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null");
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token) || "";
}

function getLatestPlan() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.latestPlan) || "null");
  } catch {
    return null;
  }
}

function setLatestPlan(plan) {
  localStorage.setItem(STORAGE_KEYS.latestPlan, JSON.stringify(plan));
}

function setPendingPlan(plan) {
  localStorage.setItem(
    STORAGE_KEYS.pendingPlan,
    JSON.stringify({
      planName: plan.planName,
      startDate: plan.startDate,
      plan
    })
  );
}

function getPendingPlan() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.pendingPlan) || "null");
  } catch {
    return null;
  }
}

function clearPendingPlan() {
  localStorage.removeItem(STORAGE_KEYS.pendingPlan);
}

function setStatus(el, text, type = "") {
  if (!el) return;
  el.textContent = text;
  el.className = "status-box";
  if (type) el.classList.add(type);
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

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function todayISO() {
  return toISODate(new Date());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

function startDateDefault() {
  return todayISO();
}

function getSelectedStyles() {
  const selected = plannerEls.styleChecks.filter((box) => box.checked).map((box) => box.value);
  return selected.length ? selected : ["calisthenics"];
}

function syncPlannerConditionalFields() {
  if (!plannerEls.plannerForm) return;

  const hidePush = plannerEls.canDoPushup?.value === "no";
  const hidePull = plannerEls.canPullUp?.value !== "yes";

  plannerEls.pushCountWrap?.classList.toggle("hidden", hidePush);
  plannerEls.pullCountWrap?.classList.toggle("hidden", hidePull);

  if (hidePush && plannerEls.pushUpMax) plannerEls.pushUpMax.value = "";
  if (hidePull && plannerEls.pullUpMax) plannerEls.pullUpMax.value = "";
}

function initPlanner() {
  if (!plannerEls.plannerForm) return;

  const user = getUser();

  if (plannerEls.age) {
    plannerEls.age.value = user?.age ? String(user.age) : "12";
  }

  if (plannerEls.plankMax && !plannerEls.plankMax.value) plannerEls.plankMax.value = "45";
  if (plannerEls.runDurationValue && !plannerEls.runDurationValue.value) plannerEls.runDurationValue.value = "20";
  if (plannerEls.runDistanceValue && !plannerEls.runDistanceValue.value) plannerEls.runDistanceValue.value = "2";
  if (plannerEls.startDate) plannerEls.startDate.value = startDateDefault();

  syncPlannerConditionalFields();
  plannerEls.canDoPushup?.addEventListener("change", syncPlannerConditionalFields);
  plannerEls.canPullUp?.addEventListener("change", syncPlannerConditionalFields);

  const existingPlan = getLatestPlan();
  if (existingPlan?.schedule?.length) {
    currentGeneratedPlan = existingPlan;
    renderPlanPreview(existingPlan);
    setStatus(plannerEls.status, "Loaded your latest saved plan preview.");
  } else {
    setStatus(plannerEls.status, "Fill the form, then generate the plan.");
  }

  plannerEls.generateBtn?.addEventListener("click", () => {
    const ctx = getPlannerContext();
    const error = validatePlannerContext(ctx);

    if (error) {
      setStatus(plannerEls.status, error, "bad");
      return;
    }

    currentGeneratedPlan = buildPlan(ctx);
    renderPlanPreview(currentGeneratedPlan);
    setStatus(plannerEls.status, "Plan generated. Save it if it looks right.", "ok");
  });

  plannerEls.saveBtn?.addEventListener("click", async () => {
    if (!currentGeneratedPlan) {
      setStatus(plannerEls.status, "Generate the plan first.", "bad");
      return;
    }

    await savePlan(currentGeneratedPlan);
  });
}

function getPlannerContext() {
  const user = getUser();
  const age = user?.age ? Number(user.age) : toNumber(plannerEls.age?.value, 12);
  const styles = getSelectedStyles();

  const runDurationValue = toNumber(plannerEls.runDurationValue?.value, 20);
  const runDurationUnit = plannerEls.runDurationUnit?.value || "minutes";
  const runDurationMinutes =
    runDurationUnit === "hours"
      ? Math.round(runDurationValue * 60)
      : runDurationValue;

  return {
    startDate: plannerEls.startDate?.value,
    age,
    primaryGoal: plannerEls.primaryGoal?.value || "general",
    daysPerWeek: Number(plannerEls.daysPerWeek?.value || 3),
    sessionLength: Number(plannerEls.sessionLength?.value || 60),
    styles,
    canDoPushup: plannerEls.canDoPushup?.value !== "no",
    pushUpMax: plannerEls.canDoPushup?.value === "no" ? 0 : toNumber(plannerEls.pushUpMax?.value, 0),
    canPullUp: plannerEls.canPullUp?.value === "yes",
    pullUpMax: plannerEls.canPullUp?.value === "yes" ? toNumber(plannerEls.pullUpMax?.value, 0) : 0,
    plankMax: toNumber(plannerEls.plankMax?.value, 45),
    mileTime: String(plannerEls.mileTime?.value || "").trim(),
    runDurationValue,
    runDurationUnit,
    runDurationMinutes,
    runDistanceValue: toNumber(plannerEls.runDistanceValue?.value, 2),
    runDistanceUnit: plannerEls.runDistanceUnit?.value || "miles"
  };
}

function validatePlannerContext(ctx) {
  if (!ctx.startDate) return "Choose a plan start date.";
  if (!ctx.age || ctx.age < 8 || ctx.age > 100) return "Enter a real age.";
  if (!ctx.styles.length) return "Pick at least one training style.";
  if ((ctx.primaryGoal === "running" || ctx.primaryGoal === "mixed") && ctx.mileTime && parseTimeToSeconds(ctx.mileTime) == null) {
    return "Enter a real mile time like 8:05.";
  }
  if (ctx.runDurationMinutes < 0) return "Longest continuous run cannot be negative.";
  if (ctx.runDistanceValue < 0) return "Longest run distance cannot be negative.";
  return "";
}

function getWorkoutTemplates(daysPerWeek) {
  if (daysPerWeek === 3) return ["strengthA", "runOrConditioning", "strengthB"];
  if (daysPerWeek === 4) return ["strengthA", "runOrConditioning", "strengthB", "easyRunOrRecovery"];
  return ["strengthA", "runOrConditioning", "strengthB", "easyRunOrRecovery", "mixed"];
}

function getWorkoutOffsets(daysPerWeek) {
  if (daysPerWeek === 3) return [0, 2, 4];
  if (daysPerWeek === 4) return [0, 2, 4, 6];
  return [0, 1, 3, 5, 6];
}

function pickStyleExercise(styles, options) {
  for (const style of styles) {
    if (options[style]) return options[style];
  }
  return options.default;
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
    tempo: options.tempo ?? "Controlled clean reps",
    rest: options.rest ?? "60 sec",
    progressionType: options.progressionType ?? "double",
    loadLabel: options.loadLabel ?? "Load or assistance",
    test: !!options.test
  };
}

function makePushExercise(ctx, weekIndex, id, test = false) {
  if (test) {
    return makeExercise(id, "Push-Up Test", {
      sets: 1,
      start: Math.max(5, ctx.pushUpMax || 8),
      max: Math.max(5, ctx.pushUpMax || 8),
      step: 0,
      targetType: "reps",
      tempo: "Max clean reps only",
      rest: "Full recovery",
      progressionType: "static",
      test: true
    });
  }

  const name = pickStyleExercise(ctx.styles, {
    calisthenics: ctx.canDoPushup ? "Push-Ups" : "Incline Push-Ups",
    weightlifting: "DB Bench Press",
    machines: "Chest Press Machine",
    isometrics: "Push-Up Hold",
    default: ctx.canDoPushup ? "Push-Ups" : "Incline Push-Ups"
  });

  const isHold = name.toLowerCase().includes("hold");
  const base = Math.max(4, Math.floor((ctx.pushUpMax || 8) * 0.6) + Math.min(weekIndex - 1, 3));

  return makeExercise(id, name, {
    sets: ctx.sessionLength === 30 ? 2 : ctx.sessionLength === 90 ? 4 : 3,
    start: isHold ? 15 + (weekIndex - 1) * 5 : base,
    max: isHold ? 40 + (weekIndex - 1) * 5 : base + 4,
    step: isHold ? 5 : 1,
    targetType: isHold ? "seconds" : "reps",
    tempo: isHold ? "Stable hold" : "Controlled clean reps",
    rest: isHold ? "45 sec" : "75 sec",
    progressionType: isHold ? "hold" : "double",
    loadLabel: "Load"
  });
}

function makePullExercise(ctx, weekIndex, id, test = false) {
  if (test) {
    return makeExercise(id, ctx.canPullUp ? "Pull-Up Test" : "Assisted Pull-Up Retest", {
      sets: 1,
      start: ctx.canPullUp ? Math.max(1, ctx.pullUpMax || 1) : 4,
      max: ctx.canPullUp ? Math.max(1, ctx.pullUpMax || 1) : 4,
      step: 0,
      targetType: "reps",
      tempo: "Max clean reps only",
      rest: "Full recovery",
      progressionType: "static",
      loadLabel: ctx.canPullUp ? "Load" : "Assistance or load",
      test: true
    });
  }

  const name = pickStyleExercise(ctx.styles, {
    calisthenics: ctx.canPullUp ? "Pull-Ups" : "Assisted Pull-Ups",
    weightlifting: "DB Row",
    machines: "Lat Pulldown",
    isometrics: "Dead Hang",
    default: ctx.canPullUp ? "Pull-Ups" : "Assisted Pull-Ups"
  });

  const isHold = name.toLowerCase().includes("hang");
  const base = ctx.canPullUp
    ? Math.max(1, Math.floor((ctx.pullUpMax || 1) * 0.6) + Math.min(weekIndex - 1, 2))
    : 4 + Math.min(weekIndex - 1, 2);

  return makeExercise(id, name, {
    sets: ctx.sessionLength === 30 ? 2 : ctx.sessionLength === 90 ? 4 : 3,
    start: isHold ? 12 + (weekIndex - 1) * 5 : base,
    max: isHold ? 30 + (weekIndex - 1) * 5 : base + 3,
    step: isHold ? 5 : 1,
    targetType: isHold ? "seconds" : "reps",
    tempo: isHold ? "Clean hold" : "Controlled full range",
    rest: isHold ? "45 sec" : "90 sec",
    progressionType: isHold ? "hold" : "double",
    loadLabel: ctx.canPullUp ? "Load" : "Assistance or load"
  });
}

function makeLegExercise(ctx, weekIndex, id) {
  const name = pickStyleExercise(ctx.styles, {
    weightlifting: weekIndex % 2 === 0 ? "DB Romanian Deadlift" : "Goblet Squat",
    machines: weekIndex % 2 === 0 ? "Hamstring Curl Machine" : "Leg Press Machine",
    calisthenics: weekIndex % 2 === 0 ? "Bodyweight Squat" : "Split Squat",
    isometrics: weekIndex % 2 === 0 ? "Split Squat Hold" : "Wall Sit",
    default: "Goblet Squat"
  });

  const isHold = name.toLowerCase().includes("hold") || name.toLowerCase().includes("wall sit");

  return makeExercise(id, name, {
    sets: ctx.sessionLength === 30 ? 2 : ctx.sessionLength === 90 ? 4 : 3,
    start: isHold ? 20 + (weekIndex - 1) * 5 : 6 + Math.min(weekIndex - 1, 3),
    max: isHold ? 45 + (weekIndex - 1) * 5 : 10 + Math.min(weekIndex - 1, 3),
    step: isHold ? 5 : 1,
    targetType: isHold ? "seconds" : "reps",
    tempo: isHold ? "Strong steady hold" : "Controlled clean reps",
    rest: "75 sec",
    progressionType: isHold ? "hold" : "double",
    loadLabel: "Load"
  });
}

function makeCoreExercise(ctx, weekIndex, id, test = false) {
  if (test) {
    return makeExercise(id, "Plank Test", {
      sets: 1,
      start: Math.max(20, ctx.plankMax || 45),
      max: Math.max(20, ctx.plankMax || 45),
      step: 0,
      targetType: "seconds",
      tempo: "Max clean hold",
      rest: "Full recovery",
      progressionType: "static",
      loadLabel: "Note",
      test: true
    });
  }

  return makeExercise(id, "Plank", {
    sets: 2,
    start: Math.max(20, Math.floor((ctx.plankMax || 45) * 0.6) + (weekIndex - 1) * 5),
    max: Math.max(35, Math.floor((ctx.plankMax || 45) * 0.6) + (weekIndex - 1) * 10),
    step: 5,
    targetType: "seconds",
    tempo: "Strong steady hold",
    rest: "45 sec",
    progressionType: "hold",
    loadLabel: "Note"
  });
}

function makeRunExercise(ctx, weekIndex, id, easy = false, test = false) {
  if (test) {
    return makeExercise(id, "Mile Test", {
      sets: 1,
      start: 1,
      max: 1,
      step: 0,
      targetType: "minutes",
      tempo: "Timed mile effort",
      rest: "Full recovery",
      progressionType: "static",
      loadLabel: "Time",
      test: true
    });
  }

  const baseMinutes = Math.max(10, ctx.runDurationMinutes || 20);
  const minutes = easy
    ? Math.max(12, Math.round(baseMinutes * (1 + (weekIndex - 1) * 0.08)))
    : Math.max(12, baseMinutes + weekIndex - 1);

  const runName =
    ctx.primaryGoal === "running"
      ? (easy ? "Easy Run" : "Run Workout")
      : ctx.primaryGoal === "mixed"
        ? (easy ? "Easy Run" : "Conditioning Run")
        : "Conditioning Run";

  return makeExercise(id, runName, {
    sets: 1,
    start: minutes,
    max: minutes,
    step: 0,
    targetType: "minutes",
    tempo: easy ? "Easy conversational effort" : "Controlled effort",
    rest: "—",
    progressionType: "static",
    loadLabel: "Distance"
  });
}

function getRetestSignalsFromPreviousPlan() {
  const previousPlan = getLatestPlan();
  if (!previousPlan?.schedule?.length) {
    return {
      run: false,
      push: false,
      pull: false,
      core: false,
      total: 0,
      notes: []
    };
  }

  return getRetestSignalsFromPlan(previousPlan, loadTracker(previousPlan));
}

function buildWorkout(template, ctx, weekIndex, phase, retestSignals) {
  if (template === "strengthA") {
    if (phase !== "normal") {
      return {
        title: "Strength A",
        goal: phase === "intervention" ? "Intervention strength" : "Deload + safe retests",
        warmup: ["Easy movement", "Technique prep", "Gradual warm-up"],
        cooldown: ["Easy walk", "Light stretch"],
        exercises: [
          makePushExercise(ctx, weekIndex, `push-test-${weekIndex}`, retestSignals.push || phase === "retest"),
          makePullExercise(ctx, weekIndex, `pull-test-${weekIndex}`, retestSignals.pull || phase === "retest"),
          makeLegExercise(ctx, 1, `legs-deload-a-${weekIndex}`),
          makeCoreExercise(ctx, weekIndex, `core-test-${weekIndex}`, retestSignals.core || phase === "retest")
        ]
      };
    }

    return {
      title: "Strength A",
      goal: "Full-body strength",
      warmup: ["2 min easy movement", "Prep reps", "Bodyweight warm-up"],
      cooldown: ["Walk 2 min", "Chest stretch", "Hip stretch"],
      exercises: [
        makePushExercise(ctx, weekIndex, `push-a-${weekIndex}`),
        makePullExercise(ctx, weekIndex, `pull-a-${weekIndex}`),
        makeLegExercise(ctx, weekIndex, `legs-a-${weekIndex}`),
        makeCoreExercise(ctx, weekIndex, `core-a-${weekIndex}`)
      ]
    };
  }

  if (template === "strengthB") {
    if (phase !== "normal") {
      return {
        title: "Strength B",
        goal: "Reduced volume",
        warmup: ["2 min easy movement", "Technique prep"],
        cooldown: ["Easy walk", "Light stretch"],
        exercises: [
          makePushExercise(ctx, 1, `push-b-${weekIndex}`),
          makeLegExercise(ctx, 1, `legs-b-${weekIndex}`),
          makePullExercise(ctx, 1, `pull-b-${weekIndex}`)
        ].map((exercise) => ({
          ...exercise,
          sets: Math.max(1, exercise.sets - 1)
        }))
      };
    }

    return {
      title: "Strength B",
      goal: "Strength + athleticism",
      warmup: ["2 min easy movement", "Shoulder prep", "Hip prep"],
      cooldown: ["Easy walk", "Shoulder stretch", "Quad stretch"],
      exercises: [
        makePushExercise(ctx, weekIndex + 1, `push-b-${weekIndex}`),
        makeLegExercise(ctx, weekIndex + 1, `legs-b-${weekIndex}`),
        makePullExercise(ctx, weekIndex + 1, `pull-b-${weekIndex}`),
        makeCoreExercise(ctx, weekIndex, `core-b-${weekIndex}`)
      ]
    };
  }

  if (template === "runOrConditioning") {
    if ((phase === "intervention" && retestSignals.run) || phase === "retest") {
      return {
        title: "Run / Conditioning",
        goal: phase === "intervention" ? "Intervention retest" : "Deload + safe retest",
        warmup: ["Walk 2 min", "Easy jog 5 min", "Light strides"],
        cooldown: ["Walk 3 min", "Easy stretch"],
        exercises: [makeRunExercise(ctx, weekIndex, `mile-test-${weekIndex}`, false, true)]
      };
    }

    if (phase !== "normal") {
      const easy = makeRunExercise(ctx, 1, `run-light-${weekIndex}`, true, false);
      easy.start = Math.max(10, easy.start - 4);
      easy.max = easy.start;
      return {
        title: "Run / Conditioning",
        goal: "Reduced conditioning volume",
        warmup: ["Walk 2 min", "Easy jog"],
        cooldown: ["Walk 3 min", "Easy stretch"],
        exercises: [easy]
      };
    }

    return {
      title: "Run / Conditioning",
      goal: ctx.primaryGoal === "strength" ? "Conditioning work" : "Run development",
      warmup: ["Walk 2 min", "Easy jog 3 min", "Leg swings"],
      cooldown: ["Walk 2 min", "Easy stretch"],
      exercises: [makeRunExercise(ctx, weekIndex, `quality-run-${weekIndex}`, false, false)]
    };
  }

  if (template === "easyRunOrRecovery") {
    const easy = makeRunExercise(ctx, weekIndex, `easy-run-${weekIndex}`, true, false);
    if (phase !== "normal") {
      easy.start = Math.max(10, easy.start - 4);
      easy.max = easy.start;
    }

    return {
      title: "Easy Run / Recovery",
      goal: "Easy aerobic work",
      warmup: ["Walk 2 min", "Easy jog build-up"],
      cooldown: ["Walk 2 min", "Easy stretch"],
      exercises: [easy]
    };
  }

  return {
    title: "Mixed Workout",
    goal: phase === "normal" ? "Athletic full-body work" : "Reduced mixed work",
    warmup: ["2 min easy movement", "Prep reps"],
    cooldown: ["Easy walk", "Light stretch"],
    exercises: phase === "normal"
      ? [
          makeLegExercise(ctx, weekIndex, `mixed-legs-${weekIndex}`),
          makePushExercise(ctx, weekIndex, `mixed-push-${weekIndex}`),
          makePullExercise(ctx, weekIndex, `mixed-pull-${weekIndex}`),
          makeCoreExercise(ctx, weekIndex, `mixed-core-${weekIndex}`)
        ]
      : [
          makeLegExercise(ctx, 1, `mixed-legs-${weekIndex}`),
          makeCoreExercise(ctx, 1, `mixed-core-${weekIndex}`)
        ]
  };
}

function buildPlan(ctx) {
  const user = getUser();
  const retestSignals = getRetestSignalsFromPreviousPlan();
  const templates = getWorkoutTemplates(ctx.daysPerWeek);
  const offsets = getWorkoutOffsets(ctx.daysPerWeek);
  const start = new Date(`${ctx.startDate}T12:00:00`);
  const schedule = [];

  for (let weekIndex = 1; weekIndex <= 4; weekIndex += 1) {
    const phase =
      weekIndex === 1 && retestSignals.total >= 2
        ? "intervention"
        : weekIndex === 4
          ? "retest"
          : "normal";

    const weekStart = addDays(start, (weekIndex - 1) * 7);

    templates.forEach((template, i) => {
      const built = buildWorkout(template, ctx, weekIndex, phase, retestSignals);
      const workoutDate = addDays(weekStart, offsets[i]);

      schedule.push({
        id: `week-${weekIndex}-workout-${i + 1}`,
        weekIndex,
        weekLabel: `Week ${weekIndex}`,
        workoutLabel: `Workout ${String.fromCharCode(65 + i)}`,
        date: toISODate(workoutDate),
        dateLabel: formatDateLabel(workoutDate),
        type: "workout",
        phase,
        title: built.title,
        goal: built.goal,
        warmup: built.warmup,
        cooldown: built.cooldown,
        exercises: built.exercises
      });
    });
  }

  const focusLabel =
    ctx.primaryGoal === "running"
      ? "Running"
      : ctx.primaryGoal === "strength"
        ? "Strength"
        : ctx.primaryGoal === "mixed"
          ? "Running + strength"
          : "General fitness";

  const summaryParts = [
    `${ctx.daysPerWeek} workouts per week`,
    `${ctx.sessionLength} minutes`,
    focusLabel,
    ctx.styles.join(", ")
  ];

  if (ctx.runDurationValue > 0) {
    summaryParts.push(`${ctx.runDurationValue} ${ctx.runDurationUnit} longest continuous run`);
  }

  if (ctx.runDistanceValue > 0) {
    summaryParts.push(`${ctx.runDistanceValue} ${ctx.runDistanceUnit} longest run distance`);
  }

  return {
    planName: "FitnessPlan 4-Week Block",
    createdAt: new Date().toISOString(),
    startDate: ctx.startDate,
    age: user?.age || ctx.age,
    ageBand: user?.ageBand || "",
    sessionLength: ctx.sessionLength,
    daysPerWeek: ctx.daysPerWeek,
    primaryGoal: ctx.primaryGoal,
    styles: ctx.styles,
    runDurationValue: ctx.runDurationValue,
    runDurationUnit: ctx.runDurationUnit,
    runDistanceValue: ctx.runDistanceValue,
    runDistanceUnit: ctx.runDistanceUnit,
    mileTime: ctx.mileTime,
    summary: summaryParts.join(" • "),
    generatorMeta: {
      youthMode: (user?.age || ctx.age) < 16,
      retestSignals
    },
    schedule
  };
}

function groupWorkoutsByWeek(plan) {
  const weeks = [];
  for (let i = 1; i <= 4; i += 1) {
    weeks.push({
      weekIndex: i,
      weekLabel: `Week ${i}`,
      workouts: []
    });
  }

  (plan.schedule || []).forEach((workout) => {
    weeks[workout.weekIndex - 1]?.workouts.push(workout);
  });

  return weeks.filter((week) => week.workouts.length);
}

function renderPlanPreview(plan) {
  if (!plannerEls.summaryPreview || !plannerEls.schedulePreview) return;

  plannerEls.summaryPreview.textContent = plan.summary || "Plan generated.";
  plannerEls.schedulePreview.innerHTML = "";

  const weeks = groupWorkoutsByWeek(plan);

  weeks.forEach((week) => {
    const weekBlock = document.createElement("div");
    weekBlock.className = "preview-week";

    weekBlock.innerHTML = `<div class="preview-week-title">${week.weekLabel}</div>`;

    week.workouts.forEach((workout) => {
      const card = document.createElement("div");
      card.className = "preview-day";
      card.innerHTML = `
        <div class="preview-day-top">
          <div>
            <div class="preview-day-name">${workout.workoutLabel}</div>
            <div class="preview-day-date">${workout.title}</div>
          </div>
          <span class="preview-badge ${workout.phase !== "normal" ? "warn" : ""}">${workout.goal}</span>
        </div>
      `;

      const ul = document.createElement("ul");
      ul.className = "preview-exercise-list";

      (workout.exercises || []).forEach((exercise) => {
        const unit =
          exercise.targetType === "seconds"
            ? "sec"
            : exercise.targetType === "minutes"
              ? "min"
              : "reps";

        const li = document.createElement("li");
        li.textContent = `${exercise.name} • ${exercise.sets} set${exercise.sets === 1 ? "" : "s"} • target ${exercise.start} ${unit}`;
        ul.appendChild(li);
      });

      card.appendChild(ul);
      weekBlock.appendChild(card);
    });

    plannerEls.schedulePreview.appendChild(weekBlock);
  });
}

async function savePlan(plan) {
  setLatestPlan(plan);
  setPendingPlan(plan);

  const token = getToken();
  if (!token) {
    setStatus(plannerEls.status, "Plan generated and saved locally. Log in to save it to your account.", "ok");
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
      setStatus(plannerEls.status, "Plan generated and saved to your account.", "ok");
      return;
    }

    setStatus(plannerEls.status, data.error || "Plan saved locally, but backend save failed.", "bad");
  } catch (error) {
    setStatus(plannerEls.status, `Plan saved locally, but backend save failed: ${error.message}`, "bad");
  }
}

function initLogout() {
  if (!dashEls.logoutBtn) return;

  dashEls.logoutBtn.addEventListener("click", async () => {
    const token = getToken();

    if (token) {
      try {
        await fetch(`${API}/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }

    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    window.location.href = "./account-test.html";
  });
}

async function initDashboard() {
  if (!dashEls.currentPlanBox && !dashEls.todayBox) return;

  let user = getUser();
  let plan = getLatestPlan();
  const token = getToken();

  if (!user && !token) {
    renderNoPlanState();
    return;
  }

  if (token) {
    try {
      const me = await apiGet("/me");
      if (me.ok && me.user) {
        user = me.user;
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(me.user));
      }
    } catch {}

    try {
      const planData = await apiGet("/my-plan");
      if (planData.ok && planData.plan) {
        plan = planData.plan;
        setLatestPlan(plan);
      }
    } catch {}

    const pending = getPendingPlan();
    if (pending?.plan) {
      try {
        const saved = await apiPost("/save-plan", pending);
        if (saved.ok) clearPendingPlan();
      } catch {}
    }
  }

  if (!plan) {
    renderNoPlanState(user);
    return;
  }

  const tracker = loadTracker(plan);

  renderProfile(user, plan);
  renderCurrentPlan(plan);
  renderStreak(plan, tracker);
  renderRecords(plan, tracker);
  renderSignals(plan, tracker);
  renderQuickStats(plan, tracker);
  renderToday(plan, tracker);
  renderWeekTracker(plan, tracker);
  renderCalendar(plan);
}

function renderNoPlanState(user = null) {
  if (dashEls.profileBox) {
    dashEls.profileBox.innerHTML = `
      <div class="info-card">
        <div class="info-label">User</div>
        <div class="info-value">${escapeHTML(user?.username || "Signed in")}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Email</div>
        <div class="info-value">${escapeHTML(user?.email || "—")}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Age</div>
        <div class="info-value">${escapeHTML(user?.age || "—")}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Age band</div>
        <div class="info-value">${escapeHTML(user?.ageBand || "—")}</div>
      </div>
    `;
  }

  if (dashEls.currentPlanBox) dashEls.currentPlanBox.innerHTML = `<div class="empty-box">No saved plan yet. Build one in the planner first.</div>`;
  if (dashEls.recordsBox) dashEls.recordsBox.innerHTML = `<div class="empty-box">No records yet. Save and log a plan first.</div>`;
  if (dashEls.signalsBox) dashEls.signalsBox.innerHTML = `No coaching signals yet.`;
  if (dashEls.quickStatsBox) dashEls.quickStatsBox.innerHTML = `<div class="empty-box">No quick stats yet.</div>`;
  if (dashEls.todayBox) dashEls.todayBox.innerHTML = `<div class="empty-box">No workout to show yet.</div>`;
  if (dashEls.weekTrackerBox) dashEls.weekTrackerBox.innerHTML = `<div class="empty-box">No week loaded yet.</div>`;
  if (dashEls.calendarBox) dashEls.calendarBox.innerHTML = `<div class="empty-box">No future weeks loaded yet.</div>`;
  if (dashEls.streakHeroNumber) dashEls.streakHeroNumber.textContent = "0";
  if (dashEls.streakHeroSub) dashEls.streakHeroSub.textContent = "Build and save a plan to get started.";
  setStatus(dashEls.todayStatus, "No plan saved yet.");
}

function renderProfile(user, plan) {
  if (!dashEls.profileBox) return;

  dashEls.profileBox.innerHTML = `
    <div class="info-card">
      <div class="info-label">User</div>
      <div class="info-value">${escapeHTML(user?.username || "Local mode")}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Email</div>
      <div class="info-value">${escapeHTML(user?.email || "Not signed in")}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Age</div>
      <div class="info-value">${escapeHTML(user?.age || plan?.age || "—")}</div>
      <div class="info-sub">Used to tailor difficulty and recovery.</div>
    </div>
    <div class="info-card">
      <div class="info-label">Age band</div>
      <div class="info-value">${escapeHTML(user?.ageBand || plan?.ageBand || "—")}</div>
    </div>
  `;
}

function getNextWorkout(plan) {
  const today = todayISO();
  return (plan.schedule || []).find((workout) => workout.date >= today) || null;
}

function renderCurrentPlan(plan) {
  if (!dashEls.currentPlanBox) return;

  const nextWorkout = getNextWorkout(plan);
  const focusLabel =
    plan.primaryGoal === "running"
      ? "Running"
      : plan.primaryGoal === "strength"
        ? "Strength"
        : plan.primaryGoal === "mixed"
          ? "Running + strength"
          : "General fitness";

  dashEls.currentPlanBox.innerHTML = `
    <div class="info-card">
      <div class="info-label">Plan</div>
      <div class="info-value">${escapeHTML(plan.planName || "FitnessPlan")}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Primary focus</div>
      <div class="info-value">${escapeHTML(focusLabel)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Workout length</div>
      <div class="info-value">${escapeHTML(`${plan.sessionLength || 60} minutes`)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Styles</div>
      <div class="info-value">${escapeHTML(Array.isArray(plan.styles) ? plan.styles.join(", ") : "—")}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Longest continuous run</div>
      <div class="info-value">${escapeHTML(`${plan.runDurationValue || "—"} ${plan.runDurationUnit || "minutes"}`)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Longest run distance</div>
      <div class="info-value">${escapeHTML(`${plan.runDistanceValue || "—"} ${plan.runDistanceUnit || "miles"}`)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Next workout</div>
      <div class="info-value">${escapeHTML(nextWorkout ? `${nextWorkout.weekLabel} • ${nextWorkout.workoutLabel}` : "Plan complete")}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Summary</div>
      <div class="info-value">${escapeHTML(plan.summary || "Plan loaded.")}</div>
    </div>
  `;
}

function getTrackerKey(plan) {
  const user = getUser();
  const userId = user?.email || "guest";
  return `fitnessplan_tracker_${userId}_${plan.planName}_${plan.schedule?.[0]?.date || "local"}`;
}

function loadTracker(plan) {
  if (!plan) return { days: {} };
  try {
    return JSON.parse(localStorage.getItem(getTrackerKey(plan)) || '{"days":{}}');
  } catch {
    return { days: {} };
  }
}

function saveTracker(plan, tracker) {
  if (!plan) return;
  localStorage.setItem(getTrackerKey(plan), JSON.stringify(tracker));
}

function countWorkoutStreak(plan, tracker) {
  const today = todayISO();
  const workoutDates = (plan.schedule || [])
    .filter((workout) => workout.date <= today)
    .map((workout) => workout.date);

  let streak = 0;
  for (let i = workoutDates.length - 1; i >= 0; i -= 1) {
    const dayLog = tracker.days?.[workoutDates[i]];
    const logged = dayLog && Object.keys(dayLog).some((key) => !key.startsWith("_"));
    if (!logged) break;
    streak += 1;
  }

  return streak;
}

function renderStreak(plan, tracker) {
  const streak = countWorkoutStreak(plan, tracker);

  if (dashEls.streakHeroNumber) dashEls.streakHeroNumber.textContent = String(streak);

  if (dashEls.streakHeroSub) {
    if (streak === 0) dashEls.streakHeroSub.textContent = "Log workouts to build your streak.";
    else if (streak === 1) dashEls.streakHeroSub.textContent = "Nice start. You completed 1 workout day in a row.";
    else dashEls.streakHeroSub.textContent = `Nice. You completed ${streak} workout days in a row.`;
  }
}

function getExerciseCategory(exerciseName) {
  const n = String(exerciseName || "").toLowerCase();

  if (n.includes("mile")) return "mile";
  if (n.includes("run")) return "run";
  if (n.includes("plank") || n.includes("wall sit") || n.includes("hang")) return "core";
  if (n.includes("pull") || n.includes("pulldown") || n.includes("row")) return "pull";
  if (n.includes("push") || n.includes("bench") || n.includes("press")) return "push";
  if (n.includes("squat") || n.includes("deadlift") || n.includes("leg press") || n.includes("curl")) return "legs";

  return "general";
}

function getBestMileRecord(plan, tracker) {
  const items = [];

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (getExerciseCategory(exercise.name) !== "mile") return;

      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry) return;

      const secs = parseTimeToSeconds(entry.logText || entry.noteText || "");
      if (secs == null) return;

      items.push({
        value: secs,
        display: formatSeconds(secs),
        note: workout.weekLabel
      });
    });
  });

  if (!items.length) return null;
  return items.reduce((best, item) => (item.value < best.value ? item : best), items[0]);
}

function getLongestRunRecord(plan, tracker) {
  const items = [];

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      const category = getExerciseCategory(exercise.name);
      if (category !== "run" && category !== "mile") return;

      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry) return;

      const value = parseFirstNumber(entry.logText);
      if (value == null) return;

      items.push({
        value,
        display: `${value} ${plan.runDistanceUnit || "miles"}`,
        note: workout.weekLabel
      });
    });
  });

  if (!items.length) return null;
  return items.reduce((best, item) => (item.value > best.value ? item : best), items[0]);
}

function getLongestWorkoutRecord(plan, tracker) {
  const items = [];

  (plan.schedule || []).forEach((workout) => {
    const mins = Number(tracker.days?.[workout.date]?._durationMinutes);
    if (!Number.isFinite(mins) || mins <= 0) return;

    items.push({
      value: mins,
      display: `${mins} minutes`,
      note: workout.weekLabel
    });
  });

  if (!items.length) return null;
  return items.reduce((best, item) => (item.value > best.value ? item : best), items[0]);
}

function getBestPushRecord(plan, tracker) {
  const items = [];

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (getExerciseCategory(exercise.name) !== "push") return;

      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry?.values?.length) return;

      const best = Math.max(...entry.values.map(Number).filter(Number.isFinite));
      if (!Number.isFinite(best)) return;

      items.push({
        value: best,
        display: `${best} reps`,
        note: workout.weekLabel
      });
    });
  });

  if (!items.length) return null;
  return items.reduce((best, item) => (item.value > best.value ? item : best), items[0]);
}

function getBestPullRecord(plan, tracker) {
  const assistItems = [];
  const repItems = [];

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (getExerciseCategory(exercise.name) !== "pull") return;

      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry) return;

      if (entry.loadType === "assistance" && Number.isFinite(Number(entry.loadValue))) {
        assistItems.push({
          value: Number(entry.loadValue),
          display: `${Number(entry.loadValue)} assistance`,
          note: workout.weekLabel
        });
      }

      if (Array.isArray(entry.values) && entry.values.length) {
        const best = Math.max(...entry.values.map(Number).filter(Number.isFinite));
        if (Number.isFinite(best)) {
          repItems.push({
            value: best,
            display: `${best} reps`,
            note: workout.weekLabel
          });
        }
      }
    });
  });

  if (assistItems.length) {
    return assistItems.reduce((best, item) => (item.value < best.value ? item : best), assistItems[0]);
  }

  if (repItems.length) {
    return repItems.reduce((best, item) => (item.value > best.value ? item : best), repItems[0]);
  }

  return null;
}

function renderRecords(plan, tracker) {
  if (!dashEls.recordsBox) return;

  const bestMile = getBestMileRecord(plan, tracker);
  const longestRun = getLongestRunRecord(plan, tracker);
  const longestWorkout = getLongestWorkoutRecord(plan, tracker);
  const bestPush = getBestPushRecord(plan, tracker);
  const bestPull = getBestPullRecord(plan, tracker);

  dashEls.recordsBox.innerHTML = `
    <div class="record-card">
      <div class="record-title">Best mile time</div>
      <div class="record-value">${bestMile ? escapeHTML(bestMile.display) : "—"}</div>
      <div class="record-note">${bestMile ? escapeHTML(bestMile.note) : "Log a timed mile to create this record."}</div>
    </div>

    <div class="record-card">
      <div class="record-title">Longest run</div>
      <div class="record-value">${longestRun ? escapeHTML(longestRun.display) : "—"}</div>
      <div class="record-note">${longestRun ? escapeHTML(longestRun.note) : "Log a run to create this record."}</div>
    </div>

    <div class="record-card">
      <div class="record-title">Longest workout</div>
      <div class="record-value">${longestWorkout ? escapeHTML(longestWorkout.display) : "—"}</div>
      <div class="record-note">${longestWorkout ? escapeHTML(longestWorkout.note) : "Save workout duration to create this record."}</div>
    </div>

    <div class="record-card">
      <div class="record-title">Best push result</div>
      <div class="record-value">${bestPush ? escapeHTML(bestPush.display) : "—"}</div>
      <div class="record-note">${bestPush ? escapeHTML(bestPush.note) : "Push records appear after strength logs."}</div>
    </div>

    <div class="record-card">
      <div class="record-title">Best pull result</div>
      <div class="record-value">${bestPull ? escapeHTML(bestPull.display) : "—"}</div>
      <div class="record-note">${bestPull ? escapeHTML(bestPull.note) : "Pull records appear after strength logs."}</div>
    </div>
  `;
}

function collectExerciseMetrics(plan, tracker) {
  const map = new Map();

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry) return;

      const category = getExerciseCategory(exercise.name);

      let metric = null;

      if (category === "mile") {
        const secs = parseTimeToSeconds(entry.logText || "");
        if (secs != null) metric = { value: secs, better: "lower" };
      } else if (category === "run") {
        const dist = parseFirstNumber(entry.logText || "");
        if (dist != null) metric = { value: dist, better: "higher" };
      } else if (entry.loadType === "assistance" && Number.isFinite(Number(entry.loadValue))) {
        metric = { value: Number(entry.loadValue), better: "lower" };
      } else if (entry.loadType === "load" && Number.isFinite(Number(entry.loadValue)) && Number(entry.loadValue) > 0) {
        metric = { value: Number(entry.loadValue), better: "higher" };
      } else if (Array.isArray(entry.values) && entry.values.length) {
        const best = Math.max(...entry.values.map(Number).filter(Number.isFinite));
        if (Number.isFinite(best)) metric = { value: best, better: "higher" };
      }

      if (!metric) return;

      const key = exercise.name;
      if (!map.has(key)) {
        map.set(key, {
          name: exercise.name,
          category,
          better: metric.better,
          points: []
        });
      }

      map.get(key).points.push({
        date: workout.date,
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

function staleWindowDays(category) {
  if (category === "run" || category === "mile") return 28;
  if (category === "core") return 35;
  return 42;
}

function pickRecordPoint(points, better) {
  if (!points.length) return null;
  if (better === "lower") return points.reduce((best, p) => (p.value < best.value ? p : best), points[0]);
  return points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);
}

function getRetestSignalsFromPlan(plan, tracker) {
  const metrics = collectExerciseMetrics(plan, tracker);
  const today = todayISO();

  const flags = {
    run: false,
    push: false,
    pull: false,
    core: false
  };

  const notes = [];

  metrics.forEach((item) => {
    const record = pickRecordPoint(item.points, item.better);
    const stale = record ? daysBetween(record.date, today) >= staleWindowDays(item.category) : false;
    const plateau = detectPlateau(item.points, item.better);

    if (!stale && !plateau) return;

    const bucket = item.category === "mile" ? "run" : item.category;
    if (flags[bucket] !== undefined) flags[bucket] = true;

    notes.push(`${item.name}: ${plateau ? "plateau" : "stale record"}`);
  });

  const total = Object.values(flags).filter(Boolean).length;

  return {
    ...flags,
    total,
    notes
  };
}

function renderSignals(plan, tracker) {
  if (!dashEls.signalsBox) return;

  const signals = getRetestSignalsFromPlan(plan, tracker);

  if (!signals.total) {
    dashEls.signalsBox.innerHTML = "No strong plateau or stale-record warning right now.";
    return;
  }

  dashEls.signalsBox.innerHTML = `
    <strong>${signals.total >= 2 ? "Intervention week recommended" : "Retest watchlist active"}</strong><br>
    ${escapeHTML(signals.notes.join(" • "))}
  `;
}

function renderQuickStats(plan, tracker) {
  if (!dashEls.quickStatsBox) return;

  const nextWorkout = getNextWorkout(plan);
  const totalWorkouts = plan.schedule?.length || 0;
  const loggedWorkouts = (plan.schedule || []).filter((workout) => {
    const dayLog = tracker.days?.[workout.date];
    return dayLog && Object.keys(dayLog).some((key) => !key.startsWith("_"));
  }).length;

  dashEls.quickStatsBox.innerHTML = `
    <div class="info-card">
      <div class="info-label">Workouts in block</div>
      <div class="info-value">${escapeHTML(totalWorkouts)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Logged workouts</div>
      <div class="info-value">${escapeHTML(loggedWorkouts)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Workout length</div>
      <div class="info-value">${escapeHTML(`${plan.sessionLength || 60} minutes`)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Next workout</div>
      <div class="info-value">${escapeHTML(nextWorkout ? `${nextWorkout.weekLabel} • ${nextWorkout.workoutLabel}` : "Plan complete")}</div>
    </div>
  `;
}

function getTodayWorkout(plan) {
  return (plan.schedule || []).find((workout) => workout.date === todayISO()) || null;
}

function getDayReadiness(tracker, date) {
  return tracker.days?.[date]?._sessionReadiness || null;
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

  if (!Number.isFinite(sleepScore) || !Number.isFinite(soreness) || !Number.isFinite(energy)) return null;

  const sorenessAdjusted = 6 - soreness;
  const avg = (sleepScore + sorenessAdjusted + energy) / 3;

  if (avg <= 2.25) {
    return {
      level: "low",
      label: "Low readiness",
      note: "Volume is reduced automatically today."
    };
  }

  if (avg >= 4) {
    return {
      level: "high",
      label: "High readiness",
      note: "Proceed normally if form stays clean."
    };
  }

  return {
    level: "normal",
    label: "Normal readiness",
    note: "Proceed with the planned work."
  };
}

function adjustWorkoutForLowReadiness(workout) {
  const copy = JSON.parse(JSON.stringify(workout));

  copy.exercises = (copy.exercises || []).map((exercise, index) => {
    const next = { ...exercise };

    if (next.test) {
      next.skipped = true;
      next.adjustedNote = "Safe test skipped because readiness is low.";
      return next;
    }

    if (next.targetType === "minutes") {
      next.start = Math.max(8, Math.floor((next.start || 10) * 0.75));
      next.max = next.start;
      next.tempo = "Easy conversational effort";
      next.adjustedNote = "Run shortened and made easier.";
      return next;
    }

    next.sets = Math.max(1, (next.sets || 1) - 1);

    if (index >= 2) {
      next.skipped = true;
      next.adjustedNote = "Accessory cut first because readiness is low.";
    } else {
      next.adjustedNote = "Volume reduced because readiness is low.";
    }

    return next;
  });

  return copy;
}

function renderToday(plan, tracker) {
  if (!dashEls.todayBox) return;

  const workout = getTodayWorkout(plan);

  if (!workout) {
    const next = getNextWorkout(plan);
    dashEls.todayBox.innerHTML = `<div class="empty-box">No workout scheduled today. ${next ? `Next: ${next.weekLabel} • ${next.workoutLabel}` : "Plan complete."}</div>`;
    setStatus(dashEls.todayStatus, "No workout to log today.");
    return;
  }

  const readiness = getDayReadiness(tracker, workout.date);
  const readinessSummary = computeReadinessSummary(readiness);
  const displayWorkout = readinessSummary?.level === "low" ? adjustWorkoutForLowReadiness(workout) : workout;

  const wrap = document.createElement("div");
  wrap.className = "today-card";

  wrap.innerHTML = `
    <div class="day-top">
      <div>
        <div class="day-label">${displayWorkout.workoutLabel}</div>
        <div class="day-title">${displayWorkout.title}</div>
        <div class="day-meta">${displayWorkout.weekLabel} • ${displayWorkout.goal}</div>
      </div>
      <span class="badge ${displayWorkout.phase !== "normal" ? "warn" : ""}">${displayWorkout.phase}</span>
    </div>
  `;

  const readinessBox = document.createElement("div");
  readinessBox.className = "readiness-box";
  readinessBox.innerHTML = `
    <div class="block-title">Readiness</div>
    <div class="readiness-grid">
      <div>
        <label>Sleep (hours)</label>
        <input class="small-input" id="todaySleepHours" type="text" inputmode="decimal" placeholder="Example: 7.5" value="${readiness?.sleepHours ?? ""}" />
      </div>
      <div>
        <label>Soreness (1 to 5)</label>
        <input class="small-input" id="todaySoreness" type="text" inputmode="numeric" placeholder="1 to 5" value="${readiness?.soreness ?? ""}" />
      </div>
      <div>
        <label>Energy (1 to 5)</label>
        <input class="small-input" id="todayEnergy" type="text" inputmode="numeric" placeholder="1 to 5" value="${readiness?.energy ?? ""}" />
      </div>
    </div>
    <div class="button-row">
      <button type="button" id="saveReadinessBtn">Set readiness</button>
    </div>
    <div class="small-note">${readinessSummary ? `${readinessSummary.label}. ${readinessSummary.note}` : "Readiness is required before logging."}</div>
  `;
  wrap.appendChild(readinessBox);

  if (displayWorkout.warmup?.length) {
    const warm = document.createElement("div");
    warm.className = "session-block";
    warm.innerHTML = `
      <div class="block-title">Warm up</div>
      <div class="small-note">${displayWorkout.warmup.join(" • ")}</div>
    `;
    wrap.appendChild(warm);
  }

  const durationBox = document.createElement("div");
  durationBox.className = "duration-box";
  durationBox.innerHTML = `
    <div class="block-title">Workout duration</div>
    <label>How long was the whole workout?</label>
    <input class="small-input" id="todayDurationMinutes" type="text" inputmode="numeric" placeholder="Example: 52" value="${tracker.days?.[workout.date]?._durationMinutes ?? ""}" />
    <div class="small-note">Used for your longest workout time record.</div>
  `;
  wrap.appendChild(durationBox);

  const exerciseList = document.createElement("div");
  exerciseList.className = "week-grid";
  exerciseList.style.gridTemplateColumns = "1fr";

  (displayWorkout.exercises || []).forEach((exercise) => {
    if (exercise.skipped) {
      const card = document.createElement("div");
      card.className = "exercise-box";
      card.innerHTML = `
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${exercise.name}</div>
            <div class="exercise-sub">${exercise.adjustedNote || "Skipped today."}</div>
          </div>
          <span class="chip neutral">Skipped</span>
        </div>
      `;
      exerciseList.appendChild(card);
      return;
    }

    if (exercise.targetType === "minutes") {
      exerciseList.appendChild(createTodayRunBox(workout, tracker, exercise, plan));
    } else {
      exerciseList.appendChild(createTodayStrengthBox(workout, tracker, exercise));
    }
  });

  wrap.appendChild(exerciseList);

  if (displayWorkout.cooldown?.length) {
    const cool = document.createElement("div");
    cool.className = "session-block";
    cool.innerHTML = `
      <div class="block-title">Cooldown</div>
      <div class="small-note">${displayWorkout.cooldown.join(" • ")}</div>
    `;
    wrap.appendChild(cool);
  }

  const actionRow = document.createElement("div");
  actionRow.className = "button-row";
  actionRow.innerHTML = `<button type="button" id="saveTodayWorkoutBtn">Save workout</button>`;
  wrap.appendChild(actionRow);

  dashEls.todayBox.innerHTML = "";
  dashEls.todayBox.appendChild(wrap);

  document.getElementById("saveReadinessBtn")?.addEventListener("click", () => {
    const nextTracker = loadTracker(plan);
    if (!nextTracker.days[workout.date]) nextTracker.days[workout.date] = {};

    const sleepHours = Number(document.getElementById("todaySleepHours")?.value || 0);
    const soreness = Number(document.getElementById("todaySoreness")?.value || 0);
    const energy = Number(document.getElementById("todayEnergy")?.value || 0);

    if (!sleepHours || soreness < 1 || soreness > 5 || energy < 1 || energy > 5) {
      setStatus(dashEls.todayStatus, "Enter real readiness values first.", "bad");
      return;
    }

    nextTracker.days[workout.date]._sessionReadiness = {
      sleepHours,
      soreness,
      energy
    };

    saveTracker(plan, nextTracker);
    renderDashboard(getUser(), plan);
  });

  document.getElementById("saveTodayWorkoutBtn")?.addEventListener("click", () => {
    const readiness = computeReadinessSummary(getDayReadiness(loadTracker(plan), workout.date));
    if (!readiness) {
      setStatus(dashEls.todayStatus, "Set readiness before logging today.", "bad");
      return;
    }

    const nextTracker = loadTracker(plan);
    if (!nextTracker.days[workout.date]) nextTracker.days[workout.date] = {};

    const duration = Number(document.getElementById("todayDurationMinutes")?.value || 0);
    if (duration > 0) nextTracker.days[workout.date]._durationMinutes = duration;

    (displayWorkout.exercises || []).forEach((exercise) => {
      if (exercise.skipped) return;

      if (exercise.targetType === "minutes") {
        const logText = document.getElementById(`run-log-${exercise.id}`)?.value?.trim() || "";
        const noteText = document.getElementById(`run-note-${exercise.id}`)?.value?.trim() || "";
        if (!logText && !noteText) return;

        nextTracker.days[workout.date][exercise.id] = {
          logText,
          noteText,
          savedAt: new Date().toISOString()
        };
      } else {
        const values = [];
        for (let i = 0; i < (exercise.sets || 1); i += 1) {
          const raw = document.getElementById(`set-${exercise.id}-${i}`)?.value;
          const n = Number(raw);
          if (Number.isFinite(n) && n > 0) values.push(n);
        }

        const loadType = document.getElementById(`load-type-${exercise.id}`)?.value || "load";
        const loadValueRaw = document.getElementById(`load-value-${exercise.id}`)?.value;
        const loadValue = loadValueRaw === "" ? "" : Number(loadValueRaw);

        if (!values.length && loadValueRaw === "") return;

        nextTracker.days[workout.date][exercise.id] = {
          values,
          loadType,
          loadValue,
          savedAt: new Date().toISOString()
        };
      }
    });

    saveTracker(plan, nextTracker);
    setStatus(dashEls.todayStatus, "Workout saved.", "ok");
    renderDashboard(getUser(), plan);
  });

  setStatus(dashEls.todayStatus, readinessSummary ? "Ready to log." : "Set readiness before logging.");
}

function createTodayRunBox(workout, tracker, exercise, plan) {
  const existing = tracker.days?.[workout.date]?.[exercise.id] || {};
  const isMile = getExerciseCategory(exercise.name) === "mile";

  const box = document.createElement("div");
  box.className = "exercise-box";
  box.innerHTML = `
    <div class="exercise-head">
      <div>
        <div class="exercise-name">${exercise.name}</div>
        <div class="exercise-sub">${exercise.tempo}</div>
      </div>
      <span class="chip neutral">Run</span>
    </div>

    <label>${isMile ? "Log time (m:ss)" : `Log distance in ${plan.runDistanceUnit || "miles"}`}</label>
    <input class="small-input" id="run-log-${exercise.id}" type="text" placeholder="${isMile ? "Example: 8:05" : "Example: 2.1"}" value="${existing.logText || ""}" />

    <label>Notes</label>
    <textarea class="small-textarea" id="run-note-${exercise.id}" placeholder="Optional">${existing.noteText || ""}</textarea>
  `;
  return box;
}

function createTodayStrengthBox(workout, tracker, exercise) {
  const existing = tracker.days?.[workout.date]?.[exercise.id] || {};
  const values = existing.values || [];

  const box = document.createElement("div");
  box.className = "exercise-box";

  let setRows = `
    <div class="set-grid header">
      <div>Set</div>
      <div>Goal</div>
      <div>Log</div>
    </div>
  `;

  for (let i = 0; i < (exercise.sets || 1); i += 1) {
    setRows += `
      <div class="set-grid">
        <div>Set ${i + 1}</div>
        <div class="set-goal">${exercise.start}${exercise.targetType === "seconds" ? " sec" : " reps"}</div>
        <div><input class="small-input" id="set-${exercise.id}-${i}" type="text" inputmode="numeric" placeholder="${exercise.targetType === "seconds" ? "sec" : "reps"}" value="${values[i] || ""}" /></div>
      </div>
    `;
  }

  box.innerHTML = `
    <div class="exercise-head">
      <div>
        <div class="exercise-name">${exercise.name}</div>
        <div class="exercise-sub">${exercise.tempo}</div>
        ${exercise.adjustedNote ? `<div class="small-note">${exercise.adjustedNote}</div>` : ""}
      </div>
      <span class="chip neutral">Strength</span>
    </div>

    ${setRows}

    <div class="load-grid">
      <div>
        <label>Load type</label>
        <select class="small-input" id="load-type-${exercise.id}">
          <option value="load" ${existing.loadType === "assistance" ? "" : "selected"}>Load</option>
          <option value="assistance" ${existing.loadType === "assistance" ? "selected" : ""}>Assistance</option>
        </select>
      </div>
      <div>
        <label>${exercise.loadLabel}</label>
        <input class="small-input" id="load-value-${exercise.id}" type="text" inputmode="decimal" placeholder="Optional" value="${existing.loadValue ?? ""}" />
      </div>
    </div>
  `;
  return box;
}

function getCurrentWeekNumber(plan) {
  const diff = daysBetween(plan.startDate, todayISO());
  if (diff < 0) return 1;
  return clamp(Math.floor(diff / 7) + 1, 1, 4);
}

function renderWeekTracker(plan, tracker) {
  if (!dashEls.weekTrackerBox) return;

  const weeks = groupWorkoutsByWeek(plan);
  const currentWeek = weeks.find((week) => week.weekIndex === getCurrentWeekNumber(plan)) || weeks[0];

  if (dashEls.weekTitle) dashEls.weekTitle.textContent = currentWeek?.weekLabel || "This Week";

  dashEls.weekTrackerBox.innerHTML = "";

  (currentWeek?.workouts || []).forEach((workout) => {
    const dayLog = tracker.days?.[workout.date];
    const logged = !!(dayLog && Object.keys(dayLog).some((key) => !key.startsWith("_")));

    const card = document.createElement("div");
    card.className = "week-card";
    card.innerHTML = `
      <div class="week-card-title">${workout.workoutLabel}</div>
      <div class="week-card-sub">${workout.title}</div>
      <div class="week-card-sub">${workout.goal}</div>
      <div class="week-card-sub">${workout.dateLabel}</div>
      <div class="week-card-sub">${logged ? "Logged" : workout.date === todayISO() ? "Today" : workout.date < todayISO() ? "Missed / not logged" : "Ahead"}</div>
    `;
    dashEls.weekTrackerBox.appendChild(card);
  });
}

function renderCalendar(plan) {
  if (!dashEls.calendarBox) return;

  const weeks = groupWorkoutsByWeek(plan);

  dashEls.calendarBox.innerHTML = weeks.map((week) => `
    <div class="week-section">
      <div class="week-title">${week.weekLabel}</div>
      <div class="week-mini-grid">
        ${week.workouts.map((workout) => `
          <div class="week-mini-card">
            <div class="week-mini-label">${workout.workoutLabel}</div>
            <div class="week-mini-sub">${workout.title}</div>
            <div class="week-mini-sub">${workout.goal}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}
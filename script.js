const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

const plannerEls = {
  body: document.body,
  plannerForm: document.getElementById("plannerForm"),
  startDate: document.getElementById("startDate"),
  age: document.getElementById("age"),
  primaryGoal: document.getElementById("primaryGoal"),
  daysPerWeek: document.getElementById("daysPerWeek"),
  sessionLength: document.getElementById("sessionLength"),
  canDoPushup: document.getElementById("canDoPushup"),
  pushUpMax: document.getElementById("pushUpMax"),
  pushupCountWrap: document.getElementById("pushupCountWrap"),
  canPullUp: document.getElementById("canPullUp"),
  pullUpMax: document.getElementById("pullUpMax"),
  pullupCountWrap: document.getElementById("pullupCountWrap"),
  plankMax: document.getElementById("plankMax"),
  runBlockMinutes: document.getElementById("runBlockMinutes"),
  runBlockDistance: document.getElementById("runBlockDistance"),
  mileTime: document.getElementById("mileTime"),
  equipmentHidden: document.getElementById("equipment"),
  equipmentChecks: Array.from(document.querySelectorAll("[data-equipment-choice]")),
  generatePlanBtn: document.getElementById("generatePlanBtn"),
  savePlanBtn: document.getElementById("savePlanBtn"),
  plannerStatus: document.getElementById("plannerStatus"),
  planSummaryPreview: document.getElementById("planSummaryPreview"),
  schedulePreview: document.getElementById("schedulePreview")
};

const dashEls = {
  logoutBtn: document.getElementById("logoutBtn"),
  profileBox: document.getElementById("profileBox"),
  planBox: firstExisting(["currentPlanBox", "planSummaryBox"]),
  recordsBox: document.getElementById("recordsBox"),
  retestsBox: document.getElementById("retestsBox"),
  chartsBox: document.getElementById("chartsBox"),
  interventionBanner: document.getElementById("interventionBanner"),
  todayBox: document.getElementById("todayBox"),
  todayWorkoutBox: document.getElementById("todayWorkoutBox"),
  todayReadinessBox: document.getElementById("todayReadinessBox"),
  todayLogBox: document.getElementById("todayLogBox"),
  todayLogStatus: document.getElementById("todayLogStatus"),
  weekTrackerBox: document.getElementById("weekTrackerBox"),
  calendarBox: document.getElementById("calendarBox"),
  weekTitle: document.getElementById("weekTitle"),
  streakHeroNumber: document.getElementById("streakHeroNumber"),
  streakHeroSub: document.getElementById("streakHeroSub"),
  streakBox: document.getElementById("streakBox")
};

let currentGeneratedPlan = null;

document.addEventListener("DOMContentLoaded", () => {
  initPlanner();
  initDashboard();
  initLogout();
});

function firstExisting(ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function safeJSONRead(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function getUser() {
  return safeJSONRead("fitnessplan_user", null);
}

function getToken() {
  return localStorage.getItem("fitnessplan_token") || "";
}

function getLatestPlan() {
  return safeJSONRead("fitnessplan_latest_plan", null);
}

function setLatestPlan(plan) {
  localStorage.setItem("fitnessplan_latest_plan", JSON.stringify(plan));
}

function setPendingPlan(plan) {
  localStorage.setItem(
    "fitnessplan_pending_plan",
    JSON.stringify({
      planName: plan.planName,
      startDate: plan.startDate,
      plan
    })
  );
}

function getPendingPlan() {
  return safeJSONRead("fitnessplan_pending_plan", null);
}

function clearPendingPlan() {
  localStorage.removeItem("fitnessplan_pending_plan");
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function todayISO() {
  return toISODate(new Date());
}

function startDateDefault() {
  return todayISO();
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
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

function setStatus(target, message, type = "") {
  if (!target) return;
  target.textContent = message;
  target.className = "status-box";
  if (type) target.classList.add(type);
}

function goalLabel(goal) {
  if (goal === "mile") return "Mile focus";
  if (goal === "mixed") return "Running + strength";
  return "Running focus";
}

function starterFromMax(maxValue, floorValue) {
  const max = Math.max(0, toNumber(maxValue, 0));
  if (!max) return floorValue;
  return Math.max(floorValue, Math.floor(max * 0.6));
}

function getSelectedEquipmentChoices() {
  if (!plannerEls.equipmentChecks.length) {
    const raw = plannerEls.equipmentHidden?.value || "";
    return raw ? raw.split(",").map((x) => x.trim()).filter(Boolean) : [];
  }

  return plannerEls.equipmentChecks
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function syncEquipmentHidden() {
  if (!plannerEls.equipmentHidden) return;

  let selected = getSelectedEquipmentChoices();

  if (!selected.length && plannerEls.equipmentChecks.length) {
    plannerEls.equipmentChecks[0].checked = true;
    selected = getSelectedEquipmentChoices();
  }

  plannerEls.equipmentHidden.value = selected.join(",");
}

function syncPushPullVisibility() {
  if (plannerEls.canDoPushup && plannerEls.pushupCountWrap) {
    const hidePush = plannerEls.canDoPushup.value === "no";
    plannerEls.pushupCountWrap.classList.toggle("hidden", hidePush);
    if (hidePush && plannerEls.pushUpMax) plannerEls.pushUpMax.value = "";
  }

  if (plannerEls.canPullUp && plannerEls.pullupCountWrap) {
    const hidePull = plannerEls.canPullUp.value === "no";
    plannerEls.pullupCountWrap.classList.toggle("hidden", hidePull);
    if (hidePull && plannerEls.pullUpMax) plannerEls.pullUpMax.value = "";
  }
}

function getContextFromForm() {
  const user = getUser();
  const selectedEquipment = getSelectedEquipmentChoices();
  const ageFromForm = toNumber(plannerEls.age?.value || "", 0);
  const age = ageFromForm || toNumber(user?.age, 13);

  const canDoPushup = plannerEls.canDoPushup?.value !== "no";
  const canPullUp = plannerEls.canPullUp?.value === "yes";

  return {
    startDate: plannerEls.startDate?.value,
    age,
    primaryGoal: plannerEls.primaryGoal?.value || "5k",
    daysPerWeek: Number(plannerEls.daysPerWeek?.value || 3),
    sessionLength: Number(plannerEls.sessionLength?.value || 60),
    equipmentSelections: selectedEquipment,
    equipment: selectedEquipment,
    canDoPushup,
    pushUpMax: canDoPushup ? toNumber(plannerEls.pushUpMax?.value, 0) : 0,
    canPullUp,
    pullUpMax: canPullUp ? toNumber(plannerEls.pullUpMax?.value, 0) : 0,
    plankMax: toNumber(plannerEls.plankMax?.value, 45),
    runBlockMinutes: Math.max(5, toNumber(plannerEls.runBlockMinutes?.value, 15)),
    runBlockDistance: Math.max(0, toNumber(plannerEls.runBlockDistance?.value, 0)),
    mileTime: String(plannerEls.mileTime?.value || "").trim()
  };
}

function validateContext(ctx) {
  if (!ctx.startDate) return "Choose a plan start date.";
  if (!ctx.age || ctx.age < 8 || ctx.age > 100) return "Enter a real age.";
  if (!ctx.equipmentSelections.length) return "Pick at least one training style.";
  if (!ctx.mileTime || parseTimeToSeconds(ctx.mileTime) == null) {
    return "Enter a real mile time like 8:05.";
  }
  if (ctx.runBlockMinutes < 5) return "Longest continuous run should be at least 5 minutes.";
  if (ctx.runBlockDistance <= 0) return "Longest distance run should be greater than 0.";
  return "";
}

function initPlanner() {
  if (!plannerEls.plannerForm) return;

  const user = getUser();

  if (plannerEls.startDate) plannerEls.startDate.value = startDateDefault();
  if (plannerEls.age && user?.age) plannerEls.age.value = String(user.age);
  if (plannerEls.plankMax && !plannerEls.plankMax.value) plannerEls.plankMax.value = "45";
  if (plannerEls.runBlockMinutes && !plannerEls.runBlockMinutes.value) plannerEls.runBlockMinutes.value = "20";
  if (plannerEls.runBlockDistance && !plannerEls.runBlockDistance.value) plannerEls.runBlockDistance.value = "1.8";

  syncEquipmentHidden();
  syncPushPullVisibility();

  plannerEls.equipmentChecks.forEach((input) => {
    input.addEventListener("change", syncEquipmentHidden);
  });

  plannerEls.canDoPushup?.addEventListener("change", syncPushPullVisibility);
  plannerEls.canPullUp?.addEventListener("change", syncPushPullVisibility);

  const existingPlan = getLatestPlan();
  if (existingPlan?.schedule?.length) {
    currentGeneratedPlan = existingPlan;
    renderPlanPreview(existingPlan);
    setStatus(plannerEls.plannerStatus, "Loaded your latest saved plan preview.");
  } else {
    setStatus(plannerEls.plannerStatus, "Fill the form, then generate the plan.");
  }

  plannerEls.generatePlanBtn?.addEventListener("click", () => {
    syncEquipmentHidden();
    syncPushPullVisibility();

    const ctx = getContextFromForm();
    const error = validateContext(ctx);

    if (error) {
      setStatus(plannerEls.plannerStatus, error, "bad");
      return;
    }

    currentGeneratedPlan = buildPlan(ctx);
    renderPlanPreview(currentGeneratedPlan);
    setStatus(plannerEls.plannerStatus, "Plan generated. Save it if it looks right.", "ok");
  });

  plannerEls.savePlanBtn?.addEventListener("click", async () => {
    if (!currentGeneratedPlan) {
      setStatus(plannerEls.plannerStatus, "Generate the plan first.", "bad");
      return;
    }

    await savePlan(currentGeneratedPlan);
  });
}

function pickExerciseFromStyles(styles, options) {
  for (const style of styles) {
    if (options[style]) return options[style];
  }
  return options.default;
}

function buildPushMainName(ctx, weekIndex) {
  return pickExerciseFromStyles(ctx.equipmentSelections, {
    calisthenics: ctx.canDoPushup ? (weekIndex % 2 === 0 ? "Push-Ups" : "Tempo Push-Ups") : "Incline Push-Ups",
    weightlifting: weekIndex % 2 === 0 ? "DB Bench Press" : "DB Floor Press",
    machines: "Chest Press Machine",
    isometrics: "Push-Up Hold",
    default: ctx.canDoPushup ? "Push-Ups" : "Incline Push-Ups"
  });
}

function buildPushSecondaryName(ctx) {
  return pickExerciseFromStyles(ctx.equipmentSelections, {
    weightlifting: "DB Shoulder Press",
    machines: "Shoulder Press Machine",
    calisthenics: ctx.canDoPushup ? "Push-Ups" : "Incline Push-Ups",
    isometrics: "Top Push-Up Hold",
    default: ctx.canDoPushup ? "Push-Ups" : "Incline Push-Ups"
  });
}

function buildPullMainName(ctx, weekIndex) {
  return pickExerciseFromStyles(ctx.equipmentSelections, {
    calisthenics: ctx.canPullUp ? (weekIndex % 2 === 0 ? "Pull-Ups" : "Chin-Ups") : "Assisted Pull-Ups",
    weightlifting: "DB Row",
    machines: "Lat Pulldown",
    isometrics: "Dead Hang",
    default: ctx.canPullUp ? "Pull-Ups" : "Assisted Pull-Ups"
  });
}

function buildPullSecondaryName(ctx) {
  return pickExerciseFromStyles(ctx.equipmentSelections, {
    weightlifting: "DB Row",
    machines: "Seated Row Machine",
    calisthenics: ctx.canPullUp ? "Pull-Ups" : "Assisted Pull-Ups",
    isometrics: "Dead Hang",
    default: ctx.canPullUp ? "Pull-Ups" : "Assisted Pull-Ups"
  });
}

function buildLegMainName(ctx, weekIndex) {
  return pickExerciseFromStyles(ctx.equipmentSelections, {
    weightlifting: weekIndex % 2 === 0 ? "Goblet Squat" : "DB Romanian Deadlift",
    machines: weekIndex % 2 === 0 ? "Leg Press Machine" : "Hamstring Curl Machine",
    calisthenics: weekIndex % 2 === 0 ? "Split Squat" : "Bodyweight Squat",
    isometrics: weekIndex % 2 === 0 ? "Wall Sit" : "Split Squat Hold",
    default: "Goblet Squat"
  });
}

function buildCoreName(ctx) {
  if (ctx.equipmentSelections.includes("isometrics")) return "Wall Sit";
  return "Plank";
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
    loadLabel: options.loadLabel ?? "Load or assistance",
    test: !!options.test
  };
}

function makePushExercise(id, ctx, weekIndex, secondary = false, test = false) {
  const name = secondary ? buildPushSecondaryName(ctx) : buildPushMainName(ctx, weekIndex);
  const base = starterFromMax(ctx.pushUpMax || 8, ctx.canDoPushup ? 5 : 4) + Math.min(weekIndex - 1, 3);

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
      loadLabel: "Load",
      test: true
    });
  }

  const isHold = name.toLowerCase().includes("hold");
  return makeExercise(id, name, {
    sets: Number(ctx.sessionLength) === 30 ? 2 : Number(ctx.sessionLength) === 90 ? 4 : 3,
    start: isHold ? 15 + (weekIndex - 1) * 5 : base,
    max: isHold ? 40 + (weekIndex - 1) * 5 : base + 4,
    step: isHold ? 5 : 1,
    targetType: isHold ? "seconds" : "reps",
    tempo: isHold ? "Strong stable hold" : "Controlled clean reps",
    rest: isHold ? "45 sec" : "75 sec",
    progressionType: isHold ? "hold" : "double",
    loadLabel: "Load"
  });
}

function makePullExercise(id, ctx, weekIndex, secondary = false, test = false) {
  const name = secondary ? buildPullSecondaryName(ctx) : buildPullMainName(ctx, weekIndex);
  const base = ctx.canPullUp
    ? Math.max(1, starterFromMax(ctx.pullUpMax || 1, 1) + Math.min(weekIndex - 1, 2))
    : 4 + Math.min(weekIndex - 1, 2);

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

  const isHold = name.toLowerCase().includes("hang");
  return makeExercise(id, name, {
    sets: Number(ctx.sessionLength) === 30 ? 2 : Number(ctx.sessionLength) === 90 ? 4 : 3,
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

function makeLegExercise(id, ctx, weekIndex) {
  const name = buildLegMainName(ctx, weekIndex);
  const isHold = name.toLowerCase().includes("wall sit") || name.toLowerCase().includes("hold");

  return makeExercise(id, name, {
    sets: Number(ctx.sessionLength) === 30 ? 2 : Number(ctx.sessionLength) === 90 ? 4 : 3,
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

function makeCoreExercise(id, ctx, weekIndex, test = false) {
  if (test) {
    return makeExercise(id, "Plank Test", {
      sets: 1,
      start: Math.max(20, ctx.plankMax || 30),
      max: Math.max(20, ctx.plankMax || 30),
      step: 0,
      targetType: "seconds",
      tempo: "Max clean hold",
      rest: "Full recovery",
      progressionType: "static",
      loadLabel: "Note",
      test: true
    });
  }

  const name = buildCoreName(ctx);
  const isHold = true;
  return makeExercise(id, name, {
    sets: 2,
    start: Math.max(20, Math.floor((ctx.plankMax || 45) * 0.6) + (weekIndex - 1) * 5),
    max: Math.max(35, Math.floor((ctx.plankMax || 45) * 0.6) + (weekIndex - 1) * 10),
    step: 5,
    targetType: isHold ? "seconds" : "reps",
    tempo: "Strong steady hold",
    rest: "45 sec",
    progressionType: "hold",
    loadLabel: "Note"
  });
}

function makeRunTestExercise(id, ctx) {
  return makeExercise(
    id,
    "Mile Test",
    {
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
    }
  );
}

function makeQualityRunExercise(id, ctx, weekIndex) {
  const baseMinutes = ctx.primaryGoal === "mile"
    ? Math.max(10, ctx.runBlockMinutes - 2 + weekIndex)
    : Math.max(12, ctx.runBlockMinutes + weekIndex);

  return makeExercise(
    id,
    ctx.primaryGoal === "mile" ? "Quality Run" : "Tempo Run",
    {
      sets: 1,
      start: baseMinutes,
      max: baseMinutes,
      step: 0,
      targetType: "minutes",
      tempo: ctx.primaryGoal === "mile" ? "Strong repeatable effort" : "Controlled hard effort",
      rest: "—",
      progressionType: "static",
      loadLabel: "Distance"
    }
  );
}

function makeEasyRunExercise(id, ctx, weekIndex) {
  const baseMinutes = Math.max(12, Math.round(ctx.runBlockMinutes * (1 + (weekIndex - 1) * 0.08)));
  return makeExercise(id, "Easy Run", {
    sets: 1,
    start: baseMinutes,
    max: baseMinutes,
    step: 0,
    targetType: "minutes",
    tempo: "Easy conversational effort",
    rest: "—",
    progressionType: "static",
    loadLabel: "Distance"
  });
}

function buildStrengthA(ctx, weekIndex, phase, signals) {
  if (phase !== "normal") {
    return {
      title: "Strength A",
      goal: phase === "intervention" ? "Intervention strength" : "Deload + safe retests",
      warmup: ["Easy movement", "Technique prep", "Gradual warm-up"],
      cooldown: ["Easy walk", "Light stretch"],
      exercises: [
        makePushExercise(`push-test-${weekIndex}`, ctx, weekIndex, false, signals.push || phase === "retest"),
        makePullExercise(`pull-test-${weekIndex}`, ctx, weekIndex, false, signals.pull || phase === "retest"),
        makeLegExercise(`legs-deload-a-${weekIndex}`, ctx, 1),
        makeCoreExercise(`core-test-${weekIndex}`, ctx, weekIndex, signals.core || phase === "retest")
      ]
    };
  }

  return {
    title: "Strength A",
    goal: "Full-body strength",
    warmup: ["2 min light movement", "Arm circles", "Bodyweight squats", "Easy prep reps"],
    cooldown: ["Walk 2 min", "Chest stretch", "Hip stretch"],
    exercises: [
      makePushExercise(`push-a-${weekIndex}`, ctx, weekIndex),
      makePullExercise(`pull-a-${weekIndex}`, ctx, weekIndex),
      makeLegExercise(`legs-a-${weekIndex}`, ctx, weekIndex),
      makeCoreExercise(`core-a-${weekIndex}`, ctx, weekIndex)
    ]
  };
}

function buildStrengthB(ctx, weekIndex, phase) {
  if (phase !== "normal") {
    return {
      title: "Strength B",
      goal: "Reduced volume",
      warmup: ["2 min light movement", "Technique prep"],
      cooldown: ["Easy walk", "Light stretch"],
      exercises: [
        makePushExercise(`push-b-${weekIndex}`, ctx, 1, true, false),
        makeLegExercise(`legs-b-${weekIndex}`, ctx, 1),
        makePullExercise(`pull-b-${weekIndex}`, ctx, 1, true, false)
      ].map((exercise) => ({
        ...exercise,
        sets: Math.max(1, exercise.sets - 1)
      }))
    };
  }

  return {
    title: "Strength B",
    goal: "Strength + athleticism",
    warmup: ["2 min light movement", "Shoulder prep", "Hip prep"],
    cooldown: ["Easy walk", "Shoulder stretch", "Quad stretch"],
    exercises: [
      makePushExercise(`push-b-${weekIndex}`, ctx, weekIndex, true),
      makeLegExercise(`legs-b-${weekIndex}`, ctx, weekIndex + 1),
      makePullExercise(`pull-b-${weekIndex}`, ctx, weekIndex, true),
      makeCoreExercise(`core-b-${weekIndex}`, ctx, weekIndex)
    ]
  };
}

function buildQualityRun(ctx, weekIndex, phase, signals) {
  if ((phase === "intervention" && signals.run) || phase === "retest") {
    return {
      title: "Run Workout",
      goal: phase === "intervention" ? "Intervention run retest" : "Deload + safe run retest",
      warmup: ["Walk 2 min", "Easy jog 5 min", "Light strides"],
      cooldown: ["Walk 3 min", "Easy stretch"],
      exercises: [makeRunTestExercise(`mile-test-${weekIndex}`, ctx)]
    };
  }

  if (phase !== "normal") {
    const easy = makeEasyRunExercise(`easy-run-light-${weekIndex}`, ctx, 1);
    easy.start = Math.max(10, easy.start - 4);
    easy.max = easy.start;
    return {
      title: "Run Workout",
      goal: "Reduced run volume",
      warmup: ["Walk 2 min", "Easy jog"],
      cooldown: ["Walk 3 min", "Easy stretch"],
      exercises: [easy]
    };
  }

  return {
    title: "Run Workout",
    goal: ctx.primaryGoal === "mile" ? "Controlled speed work" : "Controlled tempo work",
    warmup: ["Walk 2 min", "Easy jog 3 min", "Leg swings"],
    cooldown: ["Walk 2 min", "Easy stretch"],
    exercises: [makeQualityRunExercise(`quality-run-${weekIndex}`, ctx, weekIndex)]
  };
}

function buildEasyRun(ctx, weekIndex, phase) {
  const easy = makeEasyRunExercise(`easy-run-${weekIndex}`, ctx, weekIndex);

  if (phase !== "normal") {
    easy.start = Math.max(10, easy.start - 4);
    easy.max = easy.start;
  }

  return {
    title: "Easy Run",
    goal: "Aerobic conversational run",
    warmup: ["Walk 2 min", "Easy jog build-up"],
    cooldown: ["Walk 2 min", "Easy stretch"],
    exercises: [easy]
  };
}

function buildMixedWorkout(ctx, weekIndex, phase) {
  if (phase !== "normal") {
    return {
      title: "Mixed Workout",
      goal: "Reduced mixed work",
      warmup: ["2 min easy movement", "Prep reps"],
      cooldown: ["Easy walk", "Light stretch"],
      exercises: [
        makeLegExercise(`mixed-legs-${weekIndex}`, ctx, 1),
        makeCoreExercise(`mixed-core-${weekIndex}`, ctx, 1)
      ].map((exercise) => ({
        ...exercise,
        sets: Math.max(1, exercise.sets - 1)
      }))
    };
  }

  return {
    title: "Mixed Workout",
    goal: "Athletic full-body work",
    warmup: ["2 min easy movement", "Prep reps"],
    cooldown: ["Easy walk", "Light stretch"],
    exercises: [
      makeLegExercise(`mixed-legs-${weekIndex}`, ctx, weekIndex),
      makePushExercise(`mixed-push-${weekIndex}`, ctx, weekIndex, true),
      makePullExercise(`mixed-pull-${weekIndex}`, ctx, weekIndex, true),
      makeCoreExercise(`mixed-core-${weekIndex}`, ctx, weekIndex)
    ]
  };
}

function getWorkoutTemplates(daysPerWeek) {
  if (daysPerWeek === 3) {
    return ["strengthA", "runQuality", "strengthB"];
  }

  if (daysPerWeek === 4) {
    return ["strengthA", "runQuality", "strengthB", "runEasy"];
  }

  return ["strengthA", "runQuality", "strengthB", "runEasy", "mixed"];
}

function getWorkoutOffsets(daysPerWeek) {
  if (daysPerWeek === 3) return [0, 2, 5];
  if (daysPerWeek === 4) return [0, 2, 4, 6];
  return [0, 1, 3, 5, 6];
}

function getCurrentWeekNumber(plan) {
  const diff = daysBetween(plan.startDate, todayISO());
  if (diff < 0) return 1;
  return clamp(Math.floor(diff / 7) + 1, 1, 4);
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

function buildPlan(ctx) {
  const user = getUser();
  const retestSignals = getRetestSignalsFromPreviousPlan();
  const start = new Date(`${ctx.startDate}T12:00:00`);
  const templates = getWorkoutTemplates(ctx.daysPerWeek);
  const offsets = getWorkoutOffsets(ctx.daysPerWeek);

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
      let built;

      if (template === "strengthA") built = buildStrengthA(ctx, weekIndex, phase, retestSignals);
      if (template === "strengthB") built = buildStrengthB(ctx, weekIndex, phase);
      if (template === "runQuality") built = buildQualityRun(ctx, weekIndex, phase, retestSignals);
      if (template === "runEasy") built = buildEasyRun(ctx, weekIndex, phase);
      if (template === "mixed") built = buildMixedWorkout(ctx, weekIndex, phase);

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

  const summaryParts = [
    `${ctx.daysPerWeek} workouts per week`,
    `${ctx.sessionLength}-minute sessions`,
    goalLabel(ctx.primaryGoal),
    ctx.equipmentSelections.join(", "),
    retestSignals.total >= 2 ? "Week 1 starts with intervention work" : "Week 4 includes deload + safe retests"
  ];

  return {
    planName: "FitnessPlan 4-Week Block",
    createdAt: new Date().toISOString(),
    startDate: ctx.startDate,
    age: user?.age || ctx.age,
    ageBand: user?.ageBand || "",
    primaryGoal: ctx.primaryGoal,
    sessionLength: ctx.sessionLength,
    daysPerWeek: ctx.daysPerWeek,
    equipment: ctx.equipmentSelections,
    summary: summaryParts.join(" • "),
    generatorMeta: {
      youthMode: (user?.age || ctx.age) < 16,
      retestSignals
    },
    schedule
  };
}

function renderPlanPreview(plan) {
  if (!plannerEls.planSummaryPreview || !plannerEls.schedulePreview) return;

  plannerEls.planSummaryPreview.textContent = plan.summary || "Plan generated.";
  plannerEls.schedulePreview.innerHTML = "";

  const weeks = groupWorkoutsByWeek(plan);

  weeks.forEach((week) => {
    const weekBlock = document.createElement("div");
    weekBlock.className = "preview-week";

    weekBlock.innerHTML = `
      <div class="preview-week-title">${week.weekLabel}</div>
    `;

    week.workouts.forEach((workout) => {
      const dayCard = document.createElement("div");
      dayCard.className = "preview-day";

      dayCard.innerHTML = `
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
        const li = document.createElement("li");
        const unit = exercise.targetType === "seconds" ? "sec" : exercise.targetType === "minutes" ? "min" : "reps";
        li.textContent = `${exercise.name} • ${exercise.sets} set${exercise.sets === 1 ? "" : "s"} • target ${exercise.start} ${unit}`;
        ul.appendChild(li);
      });

      dayCard.appendChild(ul);
      weekBlock.appendChild(dayCard);
    });

    plannerEls.schedulePreview.appendChild(weekBlock);
  });
}

async function savePlan(plan) {
  setLatestPlan(plan);
  setPendingPlan(plan);

  const token = getToken();
  if (!token) {
    setStatus(plannerEls.plannerStatus, "Plan generated and saved locally. Log in to save it to your account.", "ok");
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
      setStatus(plannerEls.plannerStatus, "Plan generated and saved to your account.", "ok");
      return;
    }

    setStatus(plannerEls.plannerStatus, data.error || "Plan saved locally, but backend save failed.", "bad");
  } catch (error) {
    setStatus(plannerEls.plannerStatus, `Plan saved locally, but backend save failed: ${error.message}`, "bad");
  }
}

/* ---------------- Dashboard ---------------- */

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

    localStorage.removeItem("fitnessplan_token");
    localStorage.removeItem("fitnessplan_user");
    window.location.href = "./account-test.html";
  });
}

async function initDashboard() {
  if (!dashEls.profileBox && !dashEls.planBox && !dashEls.todayBox && !dashEls.todayWorkoutBox) return;

  const user = getUser();
  const token = getToken();

  if (!user && !token) {
    renderLoggedOutState();
    return;
  }

  let dashboardUser = user;
  let plan = getLatestPlan();

  if (token) {
    try {
      const me = await apiGet("/me");
      if (me.ok && me.user) {
        dashboardUser = me.user;
        localStorage.setItem("fitnessplan_user", JSON.stringify(me.user));
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

  if (!dashboardUser) dashboardUser = getUser();

  renderDashboard(dashboardUser, plan);
}

function renderLoggedOutState() {
  if (dashEls.profileBox) dashEls.profileBox.innerHTML = `<div class="empty-box">Please log in to view your dashboard.</div>`;
  if (dashEls.planBox) dashEls.planBox.innerHTML = `<div class="empty-box">No plan loaded.</div>`;
  if (dashEls.recordsBox) dashEls.recordsBox.innerHTML = `<div class="empty-box">Please log in to view records.</div>`;
  if (dashEls.todayBox) dashEls.todayBox.innerHTML = `<div class="empty-box">Please log in to use the dashboard.</div>`;
  if (dashEls.todayWorkoutBox) dashEls.todayWorkoutBox.innerHTML = `<div class="empty-box">Please log in to use the dashboard.</div>`;
  if (dashEls.weekTrackerBox) dashEls.weekTrackerBox.innerHTML = `<div class="empty-box">Please log in to use the dashboard.</div>`;
  if (dashEls.calendarBox) dashEls.calendarBox.innerHTML = `<div class="empty-box">Please log in to use the dashboard.</div>`;
  if (dashEls.streakHeroNumber) dashEls.streakHeroNumber.textContent = "0";
  if (dashEls.streakHeroSub) dashEls.streakHeroSub.textContent = "Please sign in to start tracking.";
  if (dashEls.streakBox) dashEls.streakBox.innerHTML = `<strong>Workout streak:</strong> 0`;
}

function renderDashboard(user, plan) {
  if (!plan) {
    renderProfile(user, null);
    if (dashEls.planBox) dashEls.planBox.innerHTML = `<div class="empty-box">No saved plan yet.</div>`;
    if (dashEls.recordsBox) dashEls.recordsBox.innerHTML = `<div class="empty-box">No records yet.</div>`;
    if (dashEls.todayBox) dashEls.todayBox.innerHTML = `<div class="empty-box">No workout to show.</div>`;
    if (dashEls.todayWorkoutBox) dashEls.todayWorkoutBox.innerHTML = `<div class="empty-box">No workout to show.</div>`;
    if (dashEls.weekTrackerBox) dashEls.weekTrackerBox.innerHTML = `<div class="empty-box">No weekly view yet.</div>`;
    if (dashEls.calendarBox) dashEls.calendarBox.innerHTML = `<div class="empty-box">No weeks ahead yet.</div>`;
    return;
  }

  const tracker = loadTracker(plan);

  renderProfile(user, plan);
  renderPlanSummary(user, plan);
  renderStreak(plan, tracker);
  renderRecords(plan, tracker);
  renderRetestSignals(plan, tracker);
  renderCharts(plan, tracker);
  renderToday(plan, tracker);
  renderWeekTracker(plan, tracker);
  renderCalendar(plan);
}

function renderProfile(user, plan) {
  if (!dashEls.profileBox) return;

  const age = user?.age || plan?.age || "";
  const ageBand = user?.ageBand || plan?.ageBand || "";

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
      <div class="info-value">${escapeHTML(age)}</div>
      <div class="info-sub">One source of truth for age.</div>
    </div>

    <div class="info-card">
      <div class="info-label">Age band</div>
      <div class="info-value">${escapeHTML(ageBand || "—")}</div>
    </div>
  `;
}

function renderPlanSummary(user, plan) {
  if (!dashEls.planBox) return;

  const weeks = groupWorkoutsByWeek(plan);
  const nextWorkout = getNextWorkout(plan);

  dashEls.planBox.innerHTML = `
    <div class="info-card">
      <div class="info-label">Plan</div>
      <div class="info-value">${escapeHTML(plan.planName || "FitnessPlan")}</div>
    </div>

    <div class="info-card">
      <div class="info-label">Goal</div>
      <div class="info-value">${escapeHTML(goalLabel(plan.primaryGoal || "5k"))}</div>
    </div>

    <div class="info-card">
      <div class="info-label">Weeks</div>
      <div class="info-value">${weeks.length}</div>
    </div>

    <div class="info-card">
      <div class="info-label">Next workout</div>
      <div class="info-value">${escapeHTML(nextWorkout || "Plan complete")}</div>
    </div>

    <div class="info-card">
      <div class="info-label">Session length</div>
      <div class="info-value">${escapeHTML(`${plan.sessionLength} minutes`)}</div>
    </div>

    <div class="info-card">
      <div class="info-label">Training style</div>
      <div class="info-value">${escapeHTML(Array.isArray(plan.equipment) ? plan.equipment.join(", ") : String(plan.equipment || ""))}</div>
    </div>
  `;
}

function countWorkoutStreak(plan, tracker) {
  const today = todayISO();
  const workoutDates = (plan.schedule || [])
    .filter((day) => day.type === "workout" && day.date <= today)
    .map((day) => day.date);

  let streak = 0;
  for (let i = workoutDates.length - 1; i >= 0; i -= 1) {
    const dayLog = tracker.days?.[workoutDates[i]];
    const done = dayLog && Object.keys(dayLog).some((k) => !k.startsWith("_"));
    if (done) streak += 1;
    else break;
  }

  return streak;
}

function renderStreak(plan, tracker) {
  const streak = countWorkoutStreak(plan, tracker);

  if (dashEls.streakHeroNumber) dashEls.streakHeroNumber.textContent = String(streak);

  if (dashEls.streakHeroSub) {
    if (streak === 0) dashEls.streakHeroSub.textContent = "No streak yet. Log a workout to start one.";
    else if (streak === 1) dashEls.streakHeroSub.textContent = "Nice start. You completed 1 workout in a row.";
    else dashEls.streakHeroSub.textContent = `Nice. You completed ${streak} workout days in a row.`;
  }

  if (dashEls.streakBox) {
    dashEls.streakBox.innerHTML = `<strong>Workout streak:</strong> ${streak}`;
  }
}

function getBestMileRecord(plan, tracker) {
  const mileEntries = [];

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (getExerciseCategory(exercise.name) !== "mile") return;

      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry) return;

      const secs = parseTimeToSeconds(entry.logText || entry.noteText || "");
      if (secs == null) return;

      mileEntries.push({
        value: secs,
        display: formatSeconds(secs),
        weekLabel: workout.weekLabel
      });
    });
  });

  if (!mileEntries.length) return null;
  return mileEntries.reduce((best, item) => (item.value < best.value ? item : best), mileEntries[0]);
}

function getLongestDistanceRun(plan, tracker) {
  const runEntries = [];

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      const category = getExerciseCategory(exercise.name);
      if (category !== "run" && category !== "mile") return;

      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry) return;

      const dist = parseFirstNumber(entry.logText);
      if (dist == null) return;

      runEntries.push({
        value: dist,
        display: `${dist} mi`,
        weekLabel: workout.weekLabel
      });
    });
  });

  if (!runEntries.length) return null;
  return runEntries.reduce((best, item) => (item.value > best.value ? item : best), runEntries[0]);
}

function getLongestWorkoutTime(plan, tracker) {
  const items = [];

  (plan.schedule || []).forEach((workout) => {
    const mins = Number(tracker.days?.[workout.date]?._durationMinutes);
    if (!Number.isFinite(mins) || mins <= 0) return;

    items.push({
      value: mins,
      display: `${mins} min`,
      weekLabel: workout.weekLabel
    });
  });

  if (!items.length) return null;
  return items.reduce((best, item) => (item.value > best.value ? item : best), items[0]);
}

function renderRecords(plan, tracker) {
  if (!dashEls.recordsBox) return;

  const bestMile = getBestMileRecord(plan, tracker);
  const longestRun = getLongestDistanceRun(plan, tracker);
  const longestWorkout = getLongestWorkoutTime(plan, tracker);

  dashEls.recordsBox.innerHTML = `
    <div class="record-card ${bestMile ? "" : "mandatory"}">
      <div class="record-title">Best mile time</div>
      <div class="record-value">${bestMile ? bestMile.display : "Required"}</div>
      <div class="record-note">
        ${bestMile ? `Best logged timed mile so far. ${bestMile.weekLabel}.` : "Log a mile time to create your baseline."}
      </div>
    </div>

    <div class="record-card">
      <div class="record-title">Longest distance run</div>
      <div class="record-value">${longestRun ? longestRun.display : "—"}</div>
      <div class="record-note">
        ${longestRun ? `Your farthest logged run so far. ${longestRun.weekLabel}.` : "Distance records appear after you log a run."}
      </div>
    </div>

    <div class="record-card">
      <div class="record-title">Longest workout time</div>
      <div class="record-value">${longestWorkout ? longestWorkout.display : "—"}</div>
      <div class="record-note">
        ${longestWorkout ? `Your longest logged workout so far. ${longestWorkout.weekLabel}.` : "Workout duration shows here after you save it."}
      </div>
    </div>
  `;
}

function getExerciseCategory(exerciseName) {
  const n = String(exerciseName || "").toLowerCase();

  if (n.includes("mile")) return "mile";
  if (n.includes("tempo")) return "run";
  if (n.includes("quality run")) return "run";
  if (n.includes("easy run")) return "run";
  if (n.includes("run")) return "run";

  if (n.includes("plank")) return "core";
  if (n.includes("hang")) return "core";
  if (n.includes("wall sit")) return "core";

  if (n.includes("pull") || n.includes("chin") || n.includes("row") || n.includes("pulldown")) return "pull";
  if (n.includes("push") || n.includes("press")) return "push";
  if (n.includes("squat") || n.includes("deadlift") || n.includes("split") || n.includes("leg press") || n.includes("curl machine")) return "legs";

  return "general";
}

function getMetricForEntry(exercise, entry) {
  const category = getExerciseCategory(exercise.name);

  if (category === "mile") {
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
        metricLabel: "Longest distance"
      };
    }
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
    const best = Array.isArray(entry.values) ? Math.max(...entry.values.map(Number).filter(Number.isFinite)) : null;
    if (Number.isFinite(best)) {
      return {
        value: best,
        better: "higher",
        display: `${best} sec`,
        metricLabel: "Best hold"
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

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      const entry = tracker.days?.[workout.date]?.[exercise.id];
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
        date: workout.date,
        label: workout.weekLabel,
        value: metric.value,
        display: metric.display
      });
    });
  });

  map.forEach((item) => item.points.sort((a, b) => a.date.localeCompare(b.date)));
  return Array.from(map.values());
}

function getMeaningfulImprovementThreshold(item) {
  if (item.better === "lower" && item.category === "mile") return 3;
  if (item.better === "lower" && String(item.metricLabel || "").toLowerCase().includes("assistance")) return 5;
  if (String(item.metricLabel || "").toLowerCase().includes("distance")) return 0.05;
  if (String(item.metricLabel || "").toLowerCase().includes("hold")) return 5;
  if (String(item.metricLabel || "").toLowerCase().includes("load") && item.category === "legs") return 5;
  if (String(item.metricLabel || "").toLowerCase().includes("load")) return 2.5;
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
  if (category === "run" || category === "mile") return 28;
  if (category === "core") return 35;
  return 42;
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

function getRetestSignalsFromPreviousPlan() {
  return getRetestSignalsFromPlan(getLatestPlan());
}

function renderRetestSignals(plan, tracker) {
  const signals = getRetestSignalsFromPlan(plan);

  if (dashEls.interventionBanner) {
    if (!signals.total) {
      dashEls.interventionBanner.className = "hidden";
      dashEls.interventionBanner.textContent = "";
    } else {
      dashEls.interventionBanner.className = "status-box";
      dashEls.interventionBanner.textContent =
        signals.total >= 2
          ? `Intervention week recommended soon: ${signals.notes.join(" • ")}`
          : `Retest watchlist: ${signals.notes.join(" • ")}`;
    }
  }

  if (dashEls.retestsBox) {
    if (!signals.total) {
      dashEls.retestsBox.innerHTML = `<div class="empty-box">No retest is currently recommended.</div>`;
    } else {
      dashEls.retestsBox.innerHTML = `
        <div class="empty-box">
          <strong>${signals.total >= 2 ? "Intervention week recommended" : "Retest watchlist"}</strong><br>
          ${signals.notes.join(" • ")}
        </div>
      `;
    }
  }
}

function createSparkline(points, better) {
  if (!points || points.length < 2) {
    return `<svg class="chart-svg" viewBox="0 0 300 74" preserveAspectRatio="none">
      <text x="12" y="42" fill="#94a3b8" font-size="12">Need more logs</text>
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

function renderCharts(plan, tracker) {
  if (!dashEls.chartsBox) return;

  const metrics = collectExerciseMetrics(plan, tracker);

  if (!metrics.length) {
    dashEls.chartsBox.innerHTML = `<div class="empty-box">Charts will appear after you log workouts.</div>`;
    return;
  }

  dashEls.chartsBox.innerHTML = metrics
    .slice(0, 6)
    .map((item) => {
      const recordPoint = pickRecordPoint(item.points, item.better);
      return `
        <div class="chart-item">
          <div class="chart-top">
            <div>
              <div class="chart-name">${escapeHTML(item.name)}</div>
              <div class="record-sub">${escapeHTML(item.metricLabel)}</div>
            </div>
            <span class="tag">${recordPoint ? escapeHTML(recordPoint.display) : "No data"}</span>
          </div>
          ${createSparkline(item.points, item.better)}
        </div>
      `;
    })
    .join("");
}

function getNextWorkout(plan) {
  const today = todayISO();
  const next = (plan.schedule || []).find((workout) => workout.date >= today);
  return next ? `${next.weekLabel} • ${next.workoutLabel}` : "Plan complete";
}

function getTodayWorkout(plan) {
  const today = todayISO();
  return (plan.schedule || []).find((workout) => workout.date === today) || null;
}

function getComparableHistory(plan, tracker, exercise, beforeDate) {
  const category = getExerciseCategory(exercise.name);
  const history = [];

  (plan.schedule || []).forEach((workout) => {
    if (workout.date >= beforeDate) return;

    (workout.exercises || []).forEach((otherExercise) => {
      if (getExerciseCategory(otherExercise.name) !== category) return;

      const entry = tracker.days?.[workout.date]?.[otherExercise.id];
      if (!entry) return;

      history.push({
        workout,
        exercise: otherExercise,
        entry
      });
    });
  });

  return history;
}

function hasRecentTest(plan, tracker, exercise, beforeDate) {
  const history = getComparableHistory(plan, tracker, exercise, beforeDate)
    .filter((item) => item.exercise.test);

  if (!history.length) return false;

  const latest = history.sort((a, b) => b.workout.date.localeCompare(a.workout.date))[0];
  return daysBetween(latest.workout.date, beforeDate) <= 14;
}

function canExerciseTestToday(plan, tracker, workout, exercise, readinessSummary) {
  if (!exercise.test) return { allowed: true, reason: "" };

  if (!readinessSummary) {
    return { allowed: false, reason: "Set readiness first." };
  }

  if (readinessSummary.level === "low") {
    return { allowed: false, reason: "Readiness is too low for safe testing today." };
  }

  if (workout.phase === "intervention" && workout.weekIndex === 1) {
    return { allowed: true, reason: "" };
  }

  const cleanHistory = getComparableHistory(plan, tracker, exercise, workout.date)
    .filter((item) => !item.exercise.test);

  if (cleanHistory.length < 2) {
    return { allowed: false, reason: "Not enough successful comparable sessions yet." };
  }

  if (hasRecentTest(plan, tracker, exercise, workout.date)) {
    return { allowed: false, reason: "A recent test already happened in this category." };
  }

  return { allowed: true, reason: "" };
}

function getReadiness(dayTracker) {
  return dayTracker?._sessionReadiness || null;
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

function computeReadinessSummary(r) {
  if (!readinessComplete(r)) return null;

  const sleepScore = sleepHoursToScore(r.sleepHours);
  const soreness = Number(r.soreness);
  const energy = Number(r.energy);

  if (!Number.isFinite(sleepScore) || !Number.isFinite(soreness) || !Number.isFinite(energy)) {
    return null;
  }

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

    const category = getExerciseCategory(next.name);

    if (category === "run" || category === "mile") {
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
  const todayWorkout = getTodayWorkout(plan);
  const todayTarget = dashEls.todayBox || dashEls.todayWorkoutBox;

  if (!todayTarget) return;

  if (!todayWorkout) {
    const next = getNextWorkout(plan);
    todayTarget.innerHTML = `<div class="empty-box">No workout scheduled today. Next: ${escapeHTML(next)}</div>`;
    if (dashEls.todayReadinessBox) dashEls.todayReadinessBox.innerHTML = "";
    if (dashEls.todayLogBox) dashEls.todayLogBox.innerHTML = "";
    if (dashEls.todayLogStatus) setStatus(dashEls.todayLogStatus, "No workout to log today.");
    return;
  }

  const dayTracker = tracker.days?.[todayWorkout.date] || {};
  const readiness = getReadiness(dayTracker);
  const readinessSummary = computeReadinessSummary(readiness);
  const workoutToRender = readinessSummary?.level === "low" ? adjustWorkoutForLowReadiness(todayWorkout) : todayWorkout;

  const card = createWorkoutCard(plan, tracker, workoutToRender, true, readinessSummary);
  todayTarget.innerHTML = "";
  todayTarget.appendChild(card);

  if (dashEls.todayReadinessBox) dashEls.todayReadinessBox.innerHTML = "";
  if (dashEls.todayLogBox) dashEls.todayLogBox.innerHTML = "";
}

function createWorkoutCard(plan, tracker, workout, isTodayCard = false, providedReadinessSummary = null) {
  const card = document.createElement("div");
  card.className = "day-card";

  const unlocked = workout.date === todayISO();
  const dayTracker = tracker.days?.[workout.date] || {};
  const storedReadiness = getReadiness(dayTracker) || {};
  const readinessSummary = providedReadinessSummary || computeReadinessSummary(storedReadiness);
  const canLog = unlocked && !!readinessSummary;

  card.innerHTML = `
    <div class="day-top">
      <div>
        <div class="day-label">${workout.workoutLabel}</div>
        <div class="day-title">${workout.title}</div>
        <div class="day-meta">${workout.weekLabel}${isTodayCard ? " • Today" : ""}</div>
      </div>
      <span class="badge ${workout.phase !== "normal" ? "warn" : "good"}">${workout.goal}</span>
    </div>
  `;

  const readinessBox = document.createElement("div");
  readinessBox.className = "readiness-box";

  if (!unlocked) {
    readinessBox.innerHTML = `
      <div class="block-title">Readiness</div>
      <div class="readiness-note">You can fill readiness on the actual workout day.</div>
    `;
  } else {
    readinessBox.innerHTML = `
      <div class="block-title">Readiness</div>

      <div class="readiness-grid">
        <div>
          <label>Sleep (hours)</label>
          <input
            class="small-input"
            type="text"
            inputmode="decimal"
            placeholder="Example: 7.5"
            data-readiness-day="${workout.date}"
            data-field="sleepHours"
            value="${storedReadiness.sleepHours ?? ""}"
          />
        </div>

        <div>
          <label>Soreness (1 to 5)</label>
          <select class="small-input" data-readiness-day="${workout.date}" data-field="soreness">
            <option value="">-</option>
            <option value="1" ${storedReadiness.soreness == 1 ? "selected" : ""}>1</option>
            <option value="2" ${storedReadiness.soreness == 2 ? "selected" : ""}>2</option>
            <option value="3" ${storedReadiness.soreness == 3 ? "selected" : ""}>3</option>
            <option value="4" ${storedReadiness.soreness == 4 ? "selected" : ""}>4</option>
            <option value="5" ${storedReadiness.soreness == 5 ? "selected" : ""}>5</option>
          </select>
        </div>

        <div>
          <label>Energy (1 to 5)</label>
          <select class="small-input" data-readiness-day="${workout.date}" data-field="energy">
            <option value="">-</option>
            <option value="1" ${storedReadiness.energy == 1 ? "selected" : ""}>1</option>
            <option value="2" ${storedReadiness.energy == 2 ? "selected" : ""}>2</option>
            <option value="3" ${storedReadiness.energy == 3 ? "selected" : ""}>3</option>
            <option value="4" ${storedReadiness.energy == 4 ? "selected" : ""}>4</option>
            <option value="5" ${storedReadiness.energy == 5 ? "selected" : ""}>5</option>
          </select>
        </div>
      </div>

      <div class="input-row">
        <button type="button" data-save-readiness="${workout.date}">Set readiness</button>
      </div>

      <div class="readiness-note">
        ${readinessSummary ? `${readinessSummary.label}. ${readinessSummary.note}` : "Readiness is required before logging."}
      </div>
    `;
  }

  card.appendChild(readinessBox);

  const durationBox = document.createElement("div");
  durationBox.className = "duration-box";
  durationBox.innerHTML = `
    <div class="block-title">Workout duration</div>
    <label>How long was the whole workout?</label>
    <input
      class="small-input"
      type="text"
      inputmode="numeric"
      placeholder="Example: 52"
      data-duration-day="${workout.date}"
      value="${dayTracker._durationMinutes ?? ""}"
      ${canLog ? "" : "disabled"}
    />
    <div class="small-note">Used for your longest workout time record.</div>
  `;
  card.appendChild(durationBox);

  if (workout.warmup?.length) {
    const warm = document.createElement("div");
    warm.className = "session-block";
    warm.innerHTML = `
      <div class="block-title">Warm up</div>
      <div class="small-note">${workout.warmup.join(" • ")}</div>
    `;
    card.appendChild(warm);
  }

  (workout.exercises || []).forEach((exercise) => {
    if (exercise.skipped) {
      const skipped = document.createElement("div");
      skipped.className = "exercise-box";
      skipped.innerHTML = `
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${exercise.name}</div>
            <div class="exercise-sub">${exercise.adjustedNote || "Skipped today."}</div>
          </div>
          <span class="chip neutral">Skipped</span>
        </div>
      `;
      card.appendChild(skipped);
      return;
    }

    const testGate = canExerciseTestToday(plan, tracker, workout, exercise, readinessSummary);

    if (exercise.test && !testGate.allowed) {
      const gated = document.createElement("div");
      gated.className = "exercise-box";
      gated.innerHTML = `
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${exercise.name}</div>
            <div class="exercise-sub">${testGate.reason}</div>
          </div>
          <span class="chip neutral">Locked</span>
        </div>
      `;
      card.appendChild(gated);
      return;
    }

    const category = getExerciseCategory(exercise.name);

    if (category === "run" || category === "mile") {
      card.appendChild(createRunExerciseBox(workout, dayTracker, exercise, readinessSummary, canLog));
    } else {
      card.appendChild(createStrengthExerciseBox(plan, tracker, workout, dayTracker, exercise, readinessSummary, canLog));
    }
  });

  if (workout.cooldown?.length) {
    const cool = document.createElement("div");
    cool.className = "session-block";
    cool.innerHTML = `
      <div class="block-title">Cooldown</div>
      <div class="small-note">${workout.cooldown.join(" • ")}</div>
    `;
    card.appendChild(cool);
  }

  const saveWrap = document.createElement("div");
  saveWrap.className = "save-wrap";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save workout";
  if (!canLog) saveBtn.disabled = true;

  saveBtn.addEventListener("click", () => {
    const nextTracker = loadTracker(plan);
    if (!nextTracker.days[workout.date]) nextTracker.days[workout.date] = {};

    const durationInput = card.querySelector(`[data-duration-day="${workout.date}"]`);
    const durationMinutes = Number(durationInput?.value || 0);
    if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
      nextTracker.days[workout.date]._durationMinutes = durationMinutes;
    }

    const repInputs = card.querySelectorAll("input[data-day]");
    const loadTypeSelects = card.querySelectorAll("select[data-load-type-day]");
    const loadValueInputs = card.querySelectorAll("input[data-load-value-day]");
    const runLogInputs = card.querySelectorAll("input[data-run-log-day]");
    const runNoteInputs = card.querySelectorAll("textarea[data-run-note-day]");

    const grouped = {};

    repInputs.forEach((input) => {
      const exId = input.dataset.ex;
      if (!grouped[exId]) grouped[exId] = {};
      if (!grouped[exId].values) grouped[exId].values = [];
      grouped[exId].values[Number(input.dataset.set)] = Number(input.value || 0);
    });

    loadTypeSelects.forEach((select) => {
      const exId = select.dataset.loadTypeEx;
      if (!grouped[exId]) grouped[exId] = {};
      grouped[exId].loadType = select.value;
    });

    loadValueInputs.forEach((input) => {
      const exId = input.dataset.loadValueEx;
      if (!grouped[exId]) grouped[exId] = {};
      grouped[exId].loadValue = Number(input.value || 0);
    });

    runLogInputs.forEach((input) => {
      const exId = input.dataset.runLogEx;
      if (!grouped[exId]) grouped[exId] = {};
      grouped[exId].logText = input.value || "";
    });

    runNoteInputs.forEach((input) => {
      const exId = input.dataset.runNoteEx;
      if (!grouped[exId]) grouped[exId] = {};
      grouped[exId].noteText = input.value || "";
    });

    Object.entries(grouped).forEach(([exId, entry]) => {
      nextTracker.days[workout.date][exId] = {
        ...entry,
        savedAt: new Date().toISOString()
      };
    });

    saveTracker(plan, nextTracker);
    renderDashboard(getUser(), plan);
  });

  if (unlocked) {
    const readinessButton = card.querySelector(`[data-save-readiness="${workout.date}"]`);
    readinessButton?.addEventListener("click", () => {
      const nextTracker = loadTracker(plan);
      if (!nextTracker.days[workout.date]) nextTracker.days[workout.date] = {};

      const values = {};
      card.querySelectorAll(`[data-readiness-day="${workout.date}"]`).forEach((el) => {
        values[el.dataset.field] = el.value;
      });

      if (!readinessComplete(values)) {
        alert("Fill sleep hours, soreness, and energy first.");
        return;
      }

      const sleepHours = Number(values.sleepHours);
      const soreness = Number(values.soreness);
      const energy = Number(values.energy);

      if (!Number.isFinite(sleepHours) || sleepHours <= 0 || sleepHours > 24) {
        alert("Enter a real sleep value in hours.");
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
  }

  saveWrap.appendChild(saveBtn);
  card.appendChild(saveWrap);

  return card;
}

function createRunExerciseBox(workout, dayTracker, exercise, readinessSummary, canLog) {
  const existing = dayTracker?.[exercise.id] || {};
  const isMile = getExerciseCategory(exercise.name) === "mile";

  const wrap = document.createElement("div");
  wrap.className = "exercise-box";
  wrap.innerHTML = `
    <div class="exercise-head">
      <div>
        <div class="exercise-name">${exercise.name}</div>
        <div class="exercise-sub">${exercise.tempo}</div>
        <div class="exercise-chip-row">
          <span class="chip neutral">${isMile ? "Log mile time" : `Target about ${exercise.start} min`}</span>
          ${readinessSummary ? `<span class="chip ${readinessSummary.level === "high" ? "ready" : "neutral"}">${readinessSummary.label}</span>` : ""}
        </div>
      </div>
      <span class="chip neutral">Track</span>
    </div>

    <label>${isMile ? "Log time (m:ss)" : "Log distance covered"}</label>
    <input
      class="small-input"
      type="text"
      placeholder="${isMile ? "Example: 8:05" : "Example: 1.8 miles"}"
      data-run-log-day="${workout.date}"
      data-run-log-ex="${exercise.id}"
      value="${existing.logText || ""}"
      ${canLog ? "" : "disabled"}
    />

    <label>Notes</label>
    <textarea
      class="small-textarea"
      data-run-note-day="${workout.date}"
      data-run-note-ex="${exercise.id}"
      placeholder="Optional"
      ${canLog ? "" : "disabled"}
    >${existing.noteText || ""}</textarea>

    ${canLog ? "" : `<div class="lock-note">Complete readiness first to unlock logging.</div>`}
  `;
  return wrap;
}

function createStrengthExerciseBox(plan, tracker, workout, dayTracker, exercise, readinessSummary, canLog) {
  const safe = {
    sets: exercise.sets || 3,
    targetType: exercise.targetType || "reps"
  };
  const history = getComparableHistory(plan, tracker, exercise, workout.date)
    .filter((item) => !item.exercise.test)
    .map((item) => item.entry);

  const goalState = computeNextGoal(exercise, history);
  const existing = dayTracker?.[exercise.id] || {};
  const existingValues = existing.values || [];
  let visibleTargets = [...goalState.targetArray];

  if (readinessSummary?.level === "low" && visibleTargets.length > 1) {
    visibleTargets = visibleTargets.slice(0, visibleTargets.length - 1);
  }

  const wrap = document.createElement("div");
  wrap.className = "exercise-box";

  let rows = `
    <div class="set-grid header">
      <div>Set</div>
      <div>Goal</div>
      <div>Log</div>
    </div>
  `;

  visibleTargets.forEach((target, i) => {
    rows += `
      <div class="set-grid">
        <div>Set ${i + 1}</div>
        <div class="set-goal">${formatTargetValue(target, safe.targetType)}</div>
        <div>
          <input
            class="small-input"
            type="text"
            inputmode="numeric"
            placeholder="${safe.targetType === "seconds" ? "sec" : "reps"}"
            data-day="${workout.date}"
            data-ex="${exercise.id}"
            data-set="${i}"
            value="${existingValues[i] || ""}"
            ${canLog ? "" : "disabled"}
          />
        </div>
      </div>
    `;
  });

  wrap.innerHTML = `
    <div class="exercise-head">
      <div>
        <div class="exercise-name">${exercise.name}</div>
        <div class="exercise-sub">${exercise.tempo}</div>
        <div class="exercise-chip-row">
          <span class="chip neutral">Rest ${exercise.rest}</span>
          <span class="chip ${goalState.advanceFlag ? "ready" : "neutral"}">${goalState.advanceFlag ? "Ready to progress" : "Current target"}</span>
        </div>
      </div>
    </div>

    ${exercise.adjustedNote ? `<div class="small-note">${exercise.adjustedNote}</div>` : ""}
    ${rows}

    <div class="load-grid input-row">
      <div>
        <label>Load type</label>
        <select class="small-input" data-load-type-day="${workout.date}" data-load-type-ex="${exercise.id}" ${canLog ? "" : "disabled"}>
          <option value="load" ${existing.loadType === "assistance" ? "" : "selected"}>Load</option>
          <option value="assistance" ${existing.loadType === "assistance" ? "selected" : ""}>Assistance</option>
        </select>
      </div>

      <div>
        <label>${exercise.loadLabel || "Load or assistance"}</label>
        <input
          class="small-input"
          type="text"
          inputmode="decimal"
          placeholder="Optional"
          data-load-value-day="${workout.date}"
          data-load-value-ex="${exercise.id}"
          value="${existing.loadValue ?? ""}"
          ${canLog ? "" : "disabled"}
        />
      </div>
    </div>

    <div class="exercise-help">${getNextLoadSuggestion(exercise, history, goalState)}</div>

    ${canLog ? "" : `<div class="lock-note">Complete readiness first to unlock logging.</div>`}
  `;

  return wrap;
}

function getNextLoadSuggestion(exercise, history, goalState) {
  const last = getLastLoadOrAssist(history);
  const category = getExerciseCategory(exercise.name);

  if (!last) return "Log a load or assistance value to unlock the next suggestion.";

  if (!goalState.advanceFlag) {
    if (last.loadType === "assistance") return `Keep assistance at ${last.loadValue} for now.`;
    return `Keep load at ${last.loadValue} for now.`;
  }

  if (last.loadType === "assistance") {
    return `Next time: reduce assistance to ${Math.max(0, last.loadValue - 5)}.`;
  }

  const bump = category === "legs" ? 5 : 2.5;
  return `Next time: increase load to ${last.loadValue + bump} if form stays clean.`;
}

function getLastLoadOrAssist(history) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry && entry.loadType && entry.loadValue !== undefined) {
      return {
        loadType: entry.loadType,
        loadValue: Number(entry.loadValue) || 0
      };
    }
  }
  return null;
}

function renderWeekTracker(plan, tracker) {
  if (!dashEls.weekTrackerBox) return;

  const weekNumber = getCurrentWeekNumber(plan);
  const week = groupWorkoutsByWeek(plan).find((w) => w.weekIndex === weekNumber);

  if (dashEls.weekTitle) dashEls.weekTitle.textContent = week?.weekLabel || "This Week";

  if (!week) {
    dashEls.weekTrackerBox.innerHTML = `<div class="empty-box">No week found.</div>`;
    return;
  }

  dashEls.weekTrackerBox.innerHTML = "";
  week.workouts.forEach((workout) => {
    dashEls.weekTrackerBox.appendChild(createWorkoutCard(plan, tracker, workout));
  });
}

function renderCalendar(plan) {
  if (!dashEls.calendarBox) return;

  const weeks = groupWorkoutsByWeek(plan);

  dashEls.calendarBox.innerHTML = weeks
    .map((week) => `
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
    `)
    .join("");
}
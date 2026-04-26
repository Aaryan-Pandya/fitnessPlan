const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

const STORAGE = {
  user: "fitnessplan_user",
  token: "fitnessplan_token",
  latestPlan: "fitnessplan_latest_plan",
  pendingPlan: "fitnessplan_pending_plan",
  plannerDraft: "fitnessplan_planner_draft"
};

const APP = {
  plannerStepIndex: 0,
  plannerDraft: null,
  currentPlan: null
};

document.addEventListener("DOMContentLoaded", () => {
  initApp().catch((error) => {
    console.error(error);
    const plannerStatus = byId("plannerStatus");
    const todayStatus = byId("todayStatus");
    if (plannerStatus) setStatus(plannerStatus, `Planner error: ${error.message}`, "bad");
    if (todayStatus) setStatus(todayStatus, `Dashboard error: ${error.message}`, "bad");
  });
});

async function initApp() {
  await initPlannerPage();
  await initDashboardPage();
  initLogout();
}

// =========================
// BASIC HELPERS
// =========================
function byId(id) {
  return document.getElementById(id);
}

function byAnyId(ids) {
  for (const id of ids) {
    const el = byId(id);
    if (el) return el;
  }
  return null;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function todayISO() {
  return toISODate(new Date());
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateLabel(dateInput) {
  const date = typeof dateInput === "string" ? new Date(`${dateInput}T12:00:00`) : dateInput;
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

function startDateDefault() {
  return todayISO();
}

function setStatus(el, text, type = "") {
  if (!el) return;
  el.textContent = text;
  el.className = "status-box";
  if (type) el.classList.add(type);
}

// =========================
// STORAGE
// =========================
function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.user) || "null");
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem(STORAGE.token) || "";
}

function getLatestPlanRaw() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.latestPlan) || "null");
  } catch {
    return null;
  }
}

function setLatestPlan(plan) {
  localStorage.setItem(STORAGE.latestPlan, JSON.stringify(plan));
}

function getPlannerDraftRaw() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.plannerDraft) || "null");
  } catch {
    return null;
  }
}

function setPlannerDraft(draft) {
  localStorage.setItem(STORAGE.plannerDraft, JSON.stringify(draft));
}

function setPendingPlan(plan) {
  localStorage.setItem(
    STORAGE.pendingPlan,
    JSON.stringify({
      planName: plan.planName,
      startDate: plan.startDate,
      plan
    })
  );
}

function clearPendingPlan() {
  localStorage.removeItem(STORAGE.pendingPlan);
}

function getPendingPlan() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.pendingPlan) || "null");
  } catch {
    return null;
  }
}

// =========================
// API
// =========================
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

// =========================
// NORMALIZATION
// =========================
function normalizeSessionLength(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 30 || value === 60 || value === 90) return value;
  }

  const s = String(value || "").toLowerCase().trim();

  if (s.includes("30") || s === "short") return 30;
  if (s.includes("90") || s === "long") return 90;
  return 60;
}

function focusFromLegacyGoal(goal) {
  const g = String(goal || "").toLowerCase().trim();

  if (g === "running" || g === "5k" || g === "mile") return ["endurance"];
  if (g === "strength") return ["strength"];
  if (g === "mixed" || g === "running + strength") return ["endurance", "strength"];
  return ["strength"];
}

function normalizeFocus(value) {
  const valid = ["endurance", "strength", "cardio", "flexibility"];

  if (Array.isArray(value)) {
    const cleaned = value
      .map((v) => String(v).toLowerCase().trim())
      .filter((v) => valid.includes(v));
    return [...new Set(cleaned)].slice(0, 2);
  }

  if (typeof value === "string" && value.trim()) {
    const parts = value
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter((v) => valid.includes(v));
    return [...new Set(parts)].slice(0, 2);
  }

  return ["strength"];
}

function normalizeEnduranceType(value) {
  const valid = ["running", "cycling", "swimming"];
  const v = String(value || "").toLowerCase().trim();
  return valid.includes(v) ? v : "running";
}

function normalizeTrainingStyles(value, legacyPlan = {}) {
  const valid = ["calisthenics", "weightlifting", "machines", "isometrics"];

  if (Array.isArray(value)) {
    const cleaned = value
      .map((v) => String(v).toLowerCase().trim())
      .filter((v) => valid.includes(v));
    if (cleaned.length) return [...new Set(cleaned)];
  }

  const styles = [];

  const legacySingle = String(legacyPlan.trainingStyle || legacyPlan.style || "").toLowerCase();
  if (valid.includes(legacySingle)) styles.push(legacySingle);

  const legacyEquipment = String(legacyPlan.equipment || "").toLowerCase();
  if (legacyEquipment.includes("gym")) {
    styles.push("weightlifting");
    styles.push("machines");
  }
  if (legacyEquipment.includes("dumbbell") || legacyEquipment.includes("bodyweight")) {
    styles.push("calisthenics");
  }

  const cleaned = [...new Set(styles.filter((v) => valid.includes(v)))];
  return cleaned.length ? cleaned : ["calisthenics"];
}

function normalizePushVariation(value) {
  const valid = ["wall push-up", "incline push-up", "knee push-up"];
  const v = String(value || "").toLowerCase().trim();
  return valid.includes(v) ? v : "incline push-up";
}

function normalizePullVariation(value) {
  const valid = ["dead hang", "active hang", "negative pull-up", "assisted pull-up"];
  const v = String(value || "").toLowerCase().trim();
  return valid.includes(v) ? v : "assisted pull-up";
}

function computeAgeFromDob(dobString) {
  if (!dobString || !/^\d{4}-\d{2}-\d{2}$/.test(dobString)) return null;

  const dob = new Date(`${dobString}T12:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

function getAgeBand(age) {
  if (!Number.isFinite(age)) return "";
  if (age <= 12) return "9-12";
  if (age <= 15) return "13-15";
  if (age <= 17) return "16-17";
  return "18+";
}

function effectiveAge(draft, user) {
  const fromDob = computeAgeFromDob(draft?.dob);
  if (fromDob != null) return fromDob;
  if (Number.isFinite(Number(user?.age))) return Number(user.age);
  if (Number.isFinite(Number(draft?.age))) return Number(draft.age);
  return 12;
}

function normalizeDraft(rawDraft, user = null) {
  const raw = rawDraft || {};
  const focus = normalizeFocus(raw.focus || focusFromLegacyGoal(raw.primaryGoal));
  const age = effectiveAge(raw, user);

  return {
    dob: raw.dob || "",
    focus,
    enduranceType: normalizeEnduranceType(raw.enduranceType),
    daysPerWeek: clamp(toNumber(raw.daysPerWeek, 3), 3, 5),
    sessionLength: normalizeSessionLength(raw.sessionLength),
    trainingStyles: normalizeTrainingStyles(raw.trainingStyles || raw.styles, raw),
    pushupAbility:
      String(raw.pushupAbility || (raw.canDoPushup === false ? "no" : raw.canDoPushup === true ? "yes" : "yes")).toLowerCase() === "no"
        ? "no"
        : "yes",
    pushUpMax: clamp(toNumber(raw.pushUpMax || raw.pushupMax, 0), 0, 1000),
    pushupVariation: normalizePushVariation(raw.pushupVariation),
    pullupAbility:
      String(raw.pullupAbility || (raw.canPullUp === true ? "yes" : "no")).toLowerCase() === "yes"
        ? "yes"
        : "no",
    pullUpMax: clamp(toNumber(raw.pullUpMax || raw.pullupMax, 0), 0, 1000),
    pullupVariation: normalizePullVariation(raw.pullupVariation),
    plankMax: clamp(toNumber(raw.plankMax, 45), 0, 3600),
    mileTime: String(raw.mileTime || "").trim(),
    runDurationValue: clamp(
      toNumber(raw.runDurationValue || raw.runBlockMinutes || raw.runDurationMinutes, 20),
      0,
      10000
    ),
    runDurationUnit: String(raw.runDurationUnit || "minutes").toLowerCase() === "hours" ? "hours" : "minutes",
    runDistanceValue: clamp(
      toNumber(raw.runDistanceValue || raw.runBlockDistance, 2),
      0,
      10000
    ),
    runDistanceUnit: String(raw.runDistanceUnit || "miles").toLowerCase() === "km" ? "km" : "miles",
    startDate: raw.startDate || startDateDefault(),
    age,
    ageBand: user?.ageBand || getAgeBand(age)
  };
}

function normalizeExercise(exercise, fallbackIdPrefix, index) {
  const out = { ...exercise };

  out.id = out.id || `${fallbackIdPrefix}-exercise-${index + 1}`;
  out.name = out.name || `Exercise ${index + 1}`;
  out.category = out.category || inferExerciseCategory(out.name);
  out.targetType = out.targetType || "reps";
  out.sets = clamp(toNumber(out.sets, out.targetType === "minutes" ? 1 : 3), 1, 12);
  out.targets = Array.isArray(out.targets) && out.targets.length
    ? out.targets.map((v) => toNumber(v, 0))
    : Array(out.sets).fill(toNumber(out.start, out.targetType === "minutes" ? 12 : out.targetType === "seconds" ? 20 : 5));
  out.tempo = out.tempo || "Controlled effort";
  out.rest = out.rest || "60 sec";
  out.defaultLoadMode = out.defaultLoadMode || "normal";
  out.goalLoadText = out.goalLoadText || "Normal bodyweight";
  out.test = !!out.test;
  out.notes = out.notes || "";
  return out;
}

function normalizeWorkout(workout, index, planStartDate) {
  const out = { ...workout };

  out.id = out.id || `workout-${index + 1}`;
  out.date = out.date || addDays(new Date(`${planStartDate}T12:00:00`), index).toISOString().slice(0, 10);
  out.dateLabel = out.dateLabel || formatDateLabel(out.date);
  out.weekIndex = out.weekIndex || Math.floor(Math.max(0, daysBetween(planStartDate, out.date)) / 7) + 1;
  out.weekLabel = out.weekLabel || `Week ${out.weekIndex}`;
  out.workoutLabel = out.workoutLabel || `Workout ${String.fromCharCode(64 + ((index % 5) + 1))}`;
  out.title = out.title || out.goal || out.workoutLabel;
  out.goal = out.goal || out.title;
  out.phase = out.phase || "normal";
  out.type = "workout";
  out.warmup = Array.isArray(out.warmup) ? out.warmup : [];
  out.cooldown = Array.isArray(out.cooldown) ? out.cooldown : [];
  out.exercises = Array.isArray(out.exercises)
    ? out.exercises.map((exercise, exerciseIndex) => normalizeExercise(exercise, out.id, exerciseIndex))
    : [];

  return out;
}

function buildPlanSummary(plan) {
  const parts = [
    `Age ${plan.age}`,
    `Age band ${plan.ageBand}`,
    `Focus ${plan.focus.map(labelFocus).join(" + ")}`,
    `${plan.daysPerWeek} workouts per week`,
    `${plan.sessionLength} minutes`,
    `Styles ${plan.trainingStyles.map(labelTrainingStyle).join(", ")}`
  ];

  if (plan.focus.includes("endurance")) {
    parts.push(`Endurance type ${labelEnduranceType(plan.enduranceType)}`);
  }

  if (plan.mileTime) {
    parts.push(`Mile ${plan.mileTime}`);
  }

  return parts.join(" • ");
}

function normalizePlan(rawPlan, user = null) {
  if (!rawPlan) return null;

  const base = normalizeDraft(rawPlan, user);
  const plan = {
    ...rawPlan,
    ...base,
    planName: rawPlan.planName || "FitnessPlan 4-Week Block",
    createdAt: rawPlan.createdAt || new Date().toISOString(),
    summary: "",
    baselines: {
      mileTime: base.mileTime || null,
      longestRunDistance:
        base.runDistanceValue > 0
          ? `${base.runDistanceValue} ${base.runDistanceUnit}`
          : null,
      longestContinuousRun:
        base.runDurationValue > 0
          ? `${base.runDurationValue} ${base.runDurationUnit}`
          : null,
      push:
        base.pushupAbility === "yes" && base.pushUpMax > 0
          ? `${base.pushUpMax} reps`
          : base.pushupAbility === "no"
            ? labelPushVariation(base.pushupVariation)
            : null,
      pull:
        base.pullupAbility === "yes" && base.pullUpMax > 0
          ? `${base.pullUpMax} reps`
          : base.pullupAbility === "no"
            ? labelPullVariation(base.pullupVariation)
            : null,
      plank: base.plankMax > 0 ? `${base.plankMax} sec` : null
    }
  };

  const rawSchedule = Array.isArray(rawPlan.schedule) ? rawPlan.schedule : [];
  const schedule = rawSchedule
    .filter((item) => item && (item.type === "workout" || (Array.isArray(item.exercises) && item.exercises.length)))
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((workout, index) => normalizeWorkout(workout, index, plan.startDate));

  plan.schedule = schedule;
  plan.summary = buildPlanSummary(plan);

  return plan;
}

// =========================
// LABELS
// =========================
function labelFocus(value) {
  if (value === "endurance") return "Endurance";
  if (value === "strength") return "Strength";
  if (value === "cardio") return "Cardio";
  if (value === "flexibility") return "Flexibility";
  return "Focus";
}

function labelEnduranceType(value) {
  if (value === "running") return "Running";
  if (value === "cycling") return "Cycling";
  if (value === "swimming") return "Swimming";
  return "Running";
}

function labelTrainingStyle(value) {
  if (value === "calisthenics") return "Calisthenics";
  if (value === "weightlifting") return "Weightlifting";
  if (value === "machines") return "Machines";
  if (value === "isometrics") return "Isometrics";
  return "Training";
}

function labelPushVariation(value) {
  if (value === "wall push-up") return "Wall push-up";
  if (value === "incline push-up") return "Incline push-up";
  if (value === "knee push-up") return "Knee push-up";
  return "Incline push-up";
}

function labelPullVariation(value) {
  if (value === "dead hang") return "Dead hang";
  if (value === "active hang") return "Active hang";
  if (value === "negative pull-up") return "Negative pull-up";
  if (value === "assisted pull-up") return "Assisted pull-up";
  return "Assisted pull-up";
}

function inferExerciseCategory(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("mile")) return "mile";
  if (n.includes("run") || n.includes("cycle") || n.includes("swim")) return "endurance";
  if (n.includes("plank") || n.includes("hang") || n.includes("hold") || n.includes("mobility") || n.includes("stretch")) return "hold";
  if (n.includes("pull") || n.includes("row") || n.includes("pulldown")) return "pull";
  if (n.includes("push") || n.includes("press") || n.includes("bench")) return "push";
  if (n.includes("squat") || n.includes("lunge") || n.includes("deadlift") || n.includes("leg")) return "legs";
  return "general";
}

// =========================
// PLANNER
// =========================
async function initPlannerPage() {
  const plannerForm = byId("plannerForm");
  const planSummaryPreview = byId("planSummaryPreview");
  const schedulePreview = byId("schedulePreview");
  const plannerStatus = byId("plannerStatus");

  if (!plannerForm && !planSummaryPreview && !schedulePreview) return;

  let user = getUser();
  const token = getToken();

  if (token) {
    try {
      const me = await apiGet("/me");
      if (me.ok && me.user) {
        user = me.user;
        localStorage.setItem(STORAGE.user, JSON.stringify(me.user));
      }
    } catch {}
  }

  let initialDraft = getPlannerDraftRaw();
  if (!initialDraft) {
    const latestPlan = normalizePlan(getLatestPlanRaw(), user);
    if (latestPlan) initialDraft = latestPlan;
  }

  APP.plannerDraft = normalizeDraft(initialDraft, user);
  APP.currentPlan = normalizePlan(getLatestPlanRaw(), user);

  renderPlannerQuestion();
  renderPlannerSummary();
  renderPlannerWeekPreview();

  if (APP.currentPlan?.schedule?.length) {
    setStatus(plannerStatus, "Loaded your latest saved plan preview.");
  } else {
    setStatus(plannerStatus, "Answer the questions to build your plan.");
  }
}

function getPlannerQuestions() {
  const draft = APP.plannerDraft || normalizeDraft(null, getUser());
  const questions = [];

  questions.push({
    id: "dob",
    label: "Date of birth",
    help: "Used to adjust difficulty and recovery."
  });

  questions.push({
    id: "focus",
    label: "Primary focus",
    help: "Pick up to 2."
  });

  if (draft.focus.includes("endurance")) {
    questions.push({
      id: "enduranceType",
      label: "What type of endurance?",
      help: "This shapes the endurance sessions."
    });
  }

  questions.push({
    id: "daysPerWeek",
    label: "Workouts per week",
    help: "Pick the number you can realistically sustain."
  });

  questions.push({
    id: "sessionLength",
    label: "Workout length",
    help: "This controls session size and accessory volume."
  });

  questions.push({
    id: "trainingStyles",
    label: "Training style",
    help: "Pick all that apply."
  });

  questions.push({
    id: "pushupAbility",
    label: "Can you do a push-up?",
    help: ""
  });

  if (draft.pushupAbility === "yes") {
    questions.push({
      id: "pushupMax",
      label: "How many clean push-ups in one set?",
      help: "One set only. Not across all sets."
    });
  } else {
    questions.push({
      id: "pushupVariation",
      label: "What is the hardest push-up variation you can do?",
      help: ""
    });
  }

  questions.push({
    id: "pullupAbility",
    label: "Can you do a pull-up?",
    help: ""
  });

  if (draft.pullupAbility === "yes") {
    questions.push({
      id: "pullupMax",
      label: "How many clean pull-ups in one set?",
      help: "One set only. Not across all sets."
    });
  } else {
    questions.push({
      id: "pullupVariation",
      label: "What is the hardest pull variation you can do?",
      help: ""
    });
  }

  questions.push({
    id: "plankMax",
    label: "Best plank hold",
    help: "Seconds."
  });

  questions.push({
    id: "mileTime",
    label: "Best mile time",
    help: "Used as your starting mile record."
  });

  questions.push({
    id: "runDuration",
    label: "Longest continuous run",
    help: "Use the longest continuous endurance effort you can currently handle."
  });

  questions.push({
    id: "runDistance",
    label: "Longest run distance",
    help: "Use the farthest distance you can currently cover in one session."
  });

  questions.push({
    id: "startDate",
    label: "Planned start date",
    help: ""
  });

  return questions;
}

function renderPlannerQuestion() {
  const plannerForm = byId("plannerForm");
  if (!plannerForm) return;

  const questions = getPlannerQuestions();
  APP.plannerStepIndex = clamp(APP.plannerStepIndex, 0, questions.length - 1);

  const q = questions[APP.plannerStepIndex];
  const progress = Math.round(((APP.plannerStepIndex + 1) / questions.length) * 100);

  plannerForm.innerHTML = `
    <div class="stepper-top">
      <div class="stepper-counter">Question ${APP.plannerStepIndex + 1} of ${questions.length}</div>
      <div class="stepper-progress">
        <div class="stepper-progress-fill" style="width:${progress}%"></div>
      </div>
    </div>

    <div class="planner-step active">
      <label class="question-label">${escapeHTML(q.label)}</label>
      <div id="plannerQuestionControl"></div>
      ${q.help ? `<div class="field-help">${escapeHTML(q.help)}</div>` : ""}
    </div>

    <div class="button-row">
      <button type="button" id="plannerBackBtn" class="secondary" ${APP.plannerStepIndex === 0 ? "disabled" : ""}>Back</button>
      ${
        APP.plannerStepIndex === questions.length - 1
          ? `<button type="button" id="plannerGenerateBtn">Generate plan</button>`
          : `<button type="button" id="plannerNextBtn">Next</button>`
      }
      <button type="button" id="plannerSaveBtn" class="secondary">Save now</button>
    </div>
  `;

  const controlWrap = byId("plannerQuestionControl");
  renderPlannerControl(q, controlWrap);

  const backBtn = byId("plannerBackBtn");
  const nextBtn = byId("plannerNextBtn");
  const generateBtn = byId("plannerGenerateBtn");
  const saveBtn = byId("plannerSaveBtn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      APP.plannerStepIndex -= 1;
      renderPlannerQuestion();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const error = validatePlannerQuestion(q.id);
      if (error) {
        setStatus(byId("plannerStatus"), error, "bad");
        return;
      }
      APP.plannerStepIndex += 1;
      renderPlannerQuestion();
      renderPlannerSummary();
      renderPlannerWeekPreview();
      setStatus(byId("plannerStatus"), "Saved locally.");
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      const error = validatePlannerQuestion(q.id) || validateFullDraft();
      if (error) {
        setStatus(byId("plannerStatus"), error, "bad");
        return;
      }

      await generateAndPersistPlan();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      setPlannerDraft(APP.plannerDraft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
      setStatus(byId("plannerStatus"), "Draft saved locally.", "ok");
    });
  }
}

function renderPlannerControl(question, wrap) {
  if (!wrap) return;
  const draft = APP.plannerDraft;

  if (question.id === "dob") {
    wrap.innerHTML = `<input id="plannerDob" type="date" value="${escapeHTML(draft.dob || "")}" />`;
    byId("plannerDob")?.addEventListener("input", (e) => {
      draft.dob = e.target.value;
      draft.age = effectiveAge(draft, getUser());
      draft.ageBand = getAgeBand(draft.age);
      setPlannerDraft(draft);
      renderPlannerSummary();
    });
    return;
  }

  if (question.id === "focus") {
    wrap.innerHTML = `
      <div class="checkbox-grid" id="plannerFocusGrid">
        ${["endurance", "strength", "cardio", "flexibility"].map((value) => `
          <label class="check-tile ${draft.focus.includes(value) ? "active" : ""}" data-focus-tile="${value}">
            <input type="checkbox" ${draft.focus.includes(value) ? "checked" : ""} />
            <span>${escapeHTML(labelFocus(value))}</span>
          </label>
        `).join("")}
      </div>
    `;

    wrap.querySelectorAll("[data-focus-tile]").forEach((tile) => {
      tile.addEventListener("click", (event) => {
        event.preventDefault();
        const value = tile.dataset.focusTile;
        const already = draft.focus.includes(value);

        if (already) {
          draft.focus = draft.focus.filter((item) => item !== value);
        } else {
          if (draft.focus.length >= 2) {
            setStatus(byId("plannerStatus"), "Pick at most 2 focus areas.", "bad");
            return;
          }
          draft.focus = [...draft.focus, value];
        }

        if (!draft.focus.includes("endurance")) {
          draft.enduranceType = "running";
        }

        setPlannerDraft(draft);
        renderPlannerQuestion();
        renderPlannerSummary();
        renderPlannerWeekPreview();
        setStatus(byId("plannerStatus"), "Saved locally.");
      });
    });

    return;
  }

  if (question.id === "enduranceType") {
    wrap.innerHTML = `
      <select id="plannerEnduranceType">
        <option value="running" ${draft.enduranceType === "running" ? "selected" : ""}>Running</option>
        <option value="cycling" ${draft.enduranceType === "cycling" ? "selected" : ""}>Cycling</option>
        <option value="swimming" ${draft.enduranceType === "swimming" ? "selected" : ""}>Swimming</option>
      </select>
    `;
    byId("plannerEnduranceType")?.addEventListener("change", (e) => {
      draft.enduranceType = normalizeEnduranceType(e.target.value);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "daysPerWeek") {
    wrap.innerHTML = `
      <select id="plannerDaysPerWeek">
        <option value="3" ${draft.daysPerWeek === 3 ? "selected" : ""}>3 workouts</option>
        <option value="4" ${draft.daysPerWeek === 4 ? "selected" : ""}>4 workouts</option>
        <option value="5" ${draft.daysPerWeek === 5 ? "selected" : ""}>5 workouts</option>
      </select>
    `;
    byId("plannerDaysPerWeek")?.addEventListener("change", (e) => {
      draft.daysPerWeek = clamp(toNumber(e.target.value, 3), 3, 5);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "sessionLength") {
    wrap.innerHTML = `
      <select id="plannerSessionLength">
        <option value="30" ${draft.sessionLength === 30 ? "selected" : ""}>30 minutes</option>
        <option value="60" ${draft.sessionLength === 60 ? "selected" : ""}>60 minutes</option>
        <option value="90" ${draft.sessionLength === 90 ? "selected" : ""}>90 minutes</option>
      </select>
    `;
    byId("plannerSessionLength")?.addEventListener("change", (e) => {
      draft.sessionLength = normalizeSessionLength(Number(e.target.value));
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "trainingStyles") {
    wrap.innerHTML = `
      <div class="checkbox-grid" id="plannerStyleGrid">
        ${["calisthenics", "weightlifting", "machines", "isometrics"].map((value) => `
          <label class="check-tile ${draft.trainingStyles.includes(value) ? "active" : ""}" data-style-tile="${value}">
            <input type="checkbox" ${draft.trainingStyles.includes(value) ? "checked" : ""} />
            <span>${escapeHTML(labelTrainingStyle(value))}</span>
          </label>
        `).join("")}
      </div>
    `;
    wrap.querySelectorAll("[data-style-tile]").forEach((tile) => {
      tile.addEventListener("click", (event) => {
        event.preventDefault();
        const value = tile.dataset.styleTile;
        const already = draft.trainingStyles.includes(value);

        if (already) {
          draft.trainingStyles = draft.trainingStyles.filter((item) => item !== value);
        } else {
          draft.trainingStyles = [...draft.trainingStyles, value];
        }

        if (!draft.trainingStyles.length) {
          draft.trainingStyles = ["calisthenics"];
        }

        setPlannerDraft(draft);
        renderPlannerQuestion();
        renderPlannerSummary();
        renderPlannerWeekPreview();
      });
    });
    return;
  }

  if (question.id === "pushupAbility") {
    wrap.innerHTML = `
      <select id="plannerPushupAbility">
        <option value="yes" ${draft.pushupAbility === "yes" ? "selected" : ""}>Yes</option>
        <option value="no" ${draft.pushupAbility === "no" ? "selected" : ""}>No</option>
      </select>
    `;
    byId("plannerPushupAbility")?.addEventListener("change", (e) => {
      draft.pushupAbility = e.target.value === "no" ? "no" : "yes";
      setPlannerDraft(draft);
      renderPlannerQuestion();
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "pushupMax") {
    wrap.innerHTML = `<input id="plannerPushupMax" type="text" inputmode="numeric" placeholder="Example: 12" value="${escapeHTML(String(draft.pushUpMax || ""))}" />`;
    byId("plannerPushupMax")?.addEventListener("input", (e) => {
      draft.pushUpMax = clamp(toNumber(e.target.value, 0), 0, 1000);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "pushupVariation") {
    wrap.innerHTML = `
      <select id="plannerPushupVariation">
        <option value="wall push-up" ${draft.pushupVariation === "wall push-up" ? "selected" : ""}>Wall push-up</option>
        <option value="incline push-up" ${draft.pushupVariation === "incline push-up" ? "selected" : ""}>Incline push-up</option>
        <option value="knee push-up" ${draft.pushupVariation === "knee push-up" ? "selected" : ""}>Knee push-up</option>
      </select>
    `;
    byId("plannerPushupVariation")?.addEventListener("change", (e) => {
      draft.pushupVariation = normalizePushVariation(e.target.value);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "pullupAbility") {
    wrap.innerHTML = `
      <select id="plannerPullupAbility">
        <option value="no" ${draft.pullupAbility === "no" ? "selected" : ""}>No</option>
        <option value="yes" ${draft.pullupAbility === "yes" ? "selected" : ""}>Yes</option>
      </select>
    `;
    byId("plannerPullupAbility")?.addEventListener("change", (e) => {
      draft.pullupAbility = e.target.value === "yes" ? "yes" : "no";
      setPlannerDraft(draft);
      renderPlannerQuestion();
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "pullupMax") {
    wrap.innerHTML = `<input id="plannerPullupMax" type="text" inputmode="numeric" placeholder="Example: 3" value="${escapeHTML(String(draft.pullUpMax || ""))}" />`;
    byId("plannerPullupMax")?.addEventListener("input", (e) => {
      draft.pullUpMax = clamp(toNumber(e.target.value, 0), 0, 1000);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "pullupVariation") {
    wrap.innerHTML = `
      <select id="plannerPullupVariation">
        <option value="dead hang" ${draft.pullupVariation === "dead hang" ? "selected" : ""}>Dead hang</option>
        <option value="active hang" ${draft.pullupVariation === "active hang" ? "selected" : ""}>Active hang</option>
        <option value="negative pull-up" ${draft.pullupVariation === "negative pull-up" ? "selected" : ""}>Negative pull-up</option>
        <option value="assisted pull-up" ${draft.pullupVariation === "assisted pull-up" ? "selected" : ""}>Assisted pull-up</option>
      </select>
    `;
    byId("plannerPullupVariation")?.addEventListener("change", (e) => {
      draft.pullupVariation = normalizePullVariation(e.target.value);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "plankMax") {
    wrap.innerHTML = `<input id="plannerPlankMax" type="text" inputmode="numeric" placeholder="Example: 60" value="${escapeHTML(String(draft.plankMax || ""))}" />`;
    byId("plannerPlankMax")?.addEventListener("input", (e) => {
      draft.plankMax = clamp(toNumber(e.target.value, 0), 0, 3600);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "mileTime") {
    wrap.innerHTML = `<input id="plannerMileTime" type="text" placeholder="Example: 8:05" value="${escapeHTML(draft.mileTime || "")}" />`;
    byId("plannerMileTime")?.addEventListener("input", (e) => {
      draft.mileTime = String(e.target.value || "").trim();
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "runDuration") {
    wrap.innerHTML = `
      <div class="split-input">
        <input id="plannerRunDurationValue" type="text" inputmode="decimal" placeholder="Example: 20" value="${escapeHTML(String(draft.runDurationValue || ""))}" />
        <select id="plannerRunDurationUnit">
          <option value="minutes" ${draft.runDurationUnit === "minutes" ? "selected" : ""}>Minutes</option>
          <option value="hours" ${draft.runDurationUnit === "hours" ? "selected" : ""}>Hours</option>
        </select>
      </div>
    `;
    byId("plannerRunDurationValue")?.addEventListener("input", (e) => {
      draft.runDurationValue = clamp(toNumber(e.target.value, 0), 0, 10000);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    byId("plannerRunDurationUnit")?.addEventListener("change", (e) => {
      draft.runDurationUnit = e.target.value === "hours" ? "hours" : "minutes";
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "runDistance") {
    wrap.innerHTML = `
      <div class="split-input">
        <input id="plannerRunDistanceValue" type="text" inputmode="decimal" placeholder="Example: 2" value="${escapeHTML(String(draft.runDistanceValue || ""))}" />
        <select id="plannerRunDistanceUnit">
          <option value="miles" ${draft.runDistanceUnit === "miles" ? "selected" : ""}>Miles</option>
          <option value="km" ${draft.runDistanceUnit === "km" ? "selected" : ""}>Kilometers</option>
        </select>
      </div>
    `;
    byId("plannerRunDistanceValue")?.addEventListener("input", (e) => {
      draft.runDistanceValue = clamp(toNumber(e.target.value, 0), 0, 10000);
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    byId("plannerRunDistanceUnit")?.addEventListener("change", (e) => {
      draft.runDistanceUnit = e.target.value === "km" ? "km" : "miles";
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
    return;
  }

  if (question.id === "startDate") {
    wrap.innerHTML = `<input id="plannerStartDate" type="date" value="${escapeHTML(draft.startDate || startDateDefault())}" />`;
    byId("plannerStartDate")?.addEventListener("input", (e) => {
      draft.startDate = e.target.value || startDateDefault();
      setPlannerDraft(draft);
      renderPlannerSummary();
      renderPlannerWeekPreview();
    });
  }
}

function validatePlannerQuestion(questionId) {
  const draft = APP.plannerDraft;

  if (questionId === "dob") {
    const user = getUser();
    if (!draft.dob && !user?.age) return "Enter your date of birth.";
    if (draft.dob && computeAgeFromDob(draft.dob) == null) return "Enter a real date of birth.";
  }

  if (questionId === "focus" && (!Array.isArray(draft.focus) || draft.focus.length === 0)) {
    return "Pick at least 1 focus area.";
  }

  if (questionId === "enduranceType" && draft.focus.includes("endurance") && !draft.enduranceType) {
    return "Choose an endurance type.";
  }

  if (questionId === "trainingStyles" && (!draft.trainingStyles || !draft.trainingStyles.length)) {
    return "Pick at least 1 training style.";
  }

  if (questionId === "pushupMax" && draft.pushupAbility === "yes") {
    if (!Number.isFinite(Number(draft.pushUpMax)) || draft.pushUpMax < 0) {
      return "Enter a real push-up number.";
    }
  }

  if (questionId === "pullupMax" && draft.pullupAbility === "yes") {
    if (!Number.isFinite(Number(draft.pullUpMax)) || draft.pullUpMax < 0) {
      return "Enter a real pull-up number.";
    }
  }

  if (questionId === "plankMax" && draft.plankMax < 0) {
    return "Enter a real plank time.";
  }

  if (questionId === "mileTime") {
    if (!draft.mileTime) return "Enter your mile time.";
    if (parseTimeToSeconds(draft.mileTime) == null) return "Enter mile time like 8:05.";
  }

  if (questionId === "runDuration" && draft.runDurationValue < 0) {
    return "Enter a real longest continuous run value.";
  }

  if (questionId === "runDistance" && draft.runDistanceValue < 0) {
    return "Enter a real longest run distance value.";
  }

  if (questionId === "startDate" && !draft.startDate) {
    return "Choose a planned start date.";
  }

  return "";
}

function validateFullDraft() {
  const questions = getPlannerQuestions();
  for (const q of questions) {
    const error = validatePlannerQuestion(q.id);
    if (error) return error;
  }

  return "";
}

function renderPlannerSummary() {
  const preview = byId("planSummaryPreview");
  if (!preview) return;

  const draft = APP.plannerDraft;
  const age = effectiveAge(draft, getUser());
  const ageBand = getAgeBand(age);

  const rows = [
    ["Age", age],
    ["Age band", ageBand],
    ["Focus", draft.focus.length ? draft.focus.map(labelFocus).join(" + ") : "—"],
    ["Workouts/week", draft.daysPerWeek],
    ["Workout length", `${draft.sessionLength} minutes`],
    ["Training style", draft.trainingStyles.map(labelTrainingStyle).join(", ")],
    ["Push", draft.pushupAbility === "yes" ? `${draft.pushUpMax || 0} clean push-ups` : labelPushVariation(draft.pushupVariation)],
    ["Pull", draft.pullupAbility === "yes" ? `${draft.pullUpMax || 0} clean pull-ups` : labelPullVariation(draft.pullupVariation)],
    ["Plank", draft.plankMax ? `${draft.plankMax} sec` : "—"],
    ["Mile", draft.mileTime || "—"],
    ["Start", draft.startDate || "—"]
  ];

  if (draft.focus.includes("endurance")) {
    rows.splice(3, 0, ["Endurance type", labelEnduranceType(draft.enduranceType)]);
  }

  preview.innerHTML = `
    <div class="summary-list">
      ${rows.map(([label, value]) => `
        <div class="summary-item">
          <div class="summary-label">${escapeHTML(label)}</div>
          <div class="summary-value">${escapeHTML(String(value))}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderPlannerWeekPreview() {
  const container = byId("schedulePreview");
  if (!container) return;

  const error = validateFullDraft();
  if (error) {
    container.innerHTML = `<div class="empty-box">Complete the planner to preview the week.</div>`;
    return;
  }

  const previewPlan = buildPlanFromDraft(APP.plannerDraft, getUser());
  const weeks = groupPlanByWeek(previewPlan);
  const firstWeek = weeks[0];

  if (!firstWeek) {
    container.innerHTML = `<div class="empty-box">No preview available yet.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="preview-week">
      <div class="preview-week-title">${escapeHTML(firstWeek.weekLabel)}</div>
      <div class="preview-workout-list">
        ${firstWeek.workouts.map((workout) => `
          <div class="preview-workout">
            <div class="preview-workout-top">
              <div class="preview-workout-name">${escapeHTML(workout.workoutLabel)}</div>
              <span class="preview-badge ${workout.phase !== "normal" ? "warn" : ""}">${escapeHTML(workout.goal)}</span>
            </div>
            <div class="preview-workout-sub">${escapeHTML(workout.title)}</div>
            <div class="preview-workout-sub">${escapeHTML(workout.exercises.slice(0, 3).map((exercise) => exercise.name).join(" • "))}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function generateAndPersistPlan() {
  const plannerStatus = byId("plannerStatus");
  const user = getUser();

  APP.currentPlan = buildPlanFromDraft(APP.plannerDraft, user);
  setLatestPlan(APP.currentPlan);
  setPendingPlan(APP.currentPlan);
  setPlannerDraft(APP.plannerDraft);
  renderPlannerSummary();
  renderPlannerWeekPreview();

  const token = getToken();

  if (!token) {
    setStatus(plannerStatus, "Plan generated and saved locally. Log in to sync it to your account.", "ok");
    return;
  }

  try {
    const data = await apiPost("/save-plan", {
      planName: APP.currentPlan.planName,
      startDate: APP.currentPlan.startDate,
      plan: APP.currentPlan
    });

    if (data.ok) {
      clearPendingPlan();
      setStatus(plannerStatus, "Plan generated and saved to your account.", "ok");
    } else {
      setStatus(plannerStatus, data.error || "Plan saved locally, but backend save failed.", "bad");
    }
  } catch (error) {
    setStatus(plannerStatus, `Plan saved locally, but backend save failed: ${error.message}`, "bad");
  }
}

// =========================
// PLAN GENERATOR
// =========================
function buildPlanFromDraft(rawDraft, user = null) {
  const draft = normalizeDraft(rawDraft, user);
  const start = new Date(`${draft.startDate}T12:00:00`);
  const offsets = draft.daysPerWeek === 3 ? [0, 2, 4] : draft.daysPerWeek === 4 ? [0, 2, 4, 6] : [0, 1, 3, 5, 6];
  const templates = getWorkoutTemplates(draft.focus, draft.daysPerWeek);
  const schedule = [];

  for (let weekIndex = 1; weekIndex <= 4; weekIndex += 1) {
    const phase = weekIndex === 4 ? "deload" : "normal";
    const weekStart = addDays(start, (weekIndex - 1) * 7);

    templates.forEach((template, templateIndex) => {
      const date = addDays(weekStart, offsets[templateIndex] ?? templateIndex);
      const workout = buildWorkoutTemplate(template, draft, weekIndex, phase);

      schedule.push({
        id: `week-${weekIndex}-workout-${templateIndex + 1}`,
        weekIndex,
        weekLabel: `Week ${weekIndex}`,
        workoutLabel: `Workout ${String.fromCharCode(65 + templateIndex)}`,
        date: toISODate(date),
        dateLabel: formatDateLabel(date),
        type: "workout",
        phase,
        title: workout.title,
        goal: workout.goal,
        warmup: workout.warmup,
        cooldown: workout.cooldown,
        exercises: workout.exercises
      });
    });
  }

  return normalizePlan({
    planName: "FitnessPlan 4-Week Block",
    createdAt: new Date().toISOString(),
    dob: draft.dob,
    age: effectiveAge(draft, user),
    ageBand: getAgeBand(effectiveAge(draft, user)),
    focus: draft.focus,
    enduranceType: draft.enduranceType,
    daysPerWeek: draft.daysPerWeek,
    sessionLength: draft.sessionLength,
    trainingStyles: draft.trainingStyles,
    pushupAbility: draft.pushupAbility,
    pushUpMax: draft.pushUpMax,
    pushupVariation: draft.pushupVariation,
    pullupAbility: draft.pullupAbility,
    pullUpMax: draft.pullUpMax,
    pullupVariation: draft.pullupVariation,
    plankMax: draft.plankMax,
    mileTime: draft.mileTime,
    runDurationValue: draft.runDurationValue,
    runDurationUnit: draft.runDurationUnit,
    runDistanceValue: draft.runDistanceValue,
    runDistanceUnit: draft.runDistanceUnit,
    startDate: draft.startDate,
    schedule
  }, user);
}

function getWorkoutTemplates(focus, daysPerWeek) {
  const selected = Array.isArray(focus) ? focus : ["strength"];
  const list = [];

  if (selected.includes("strength")) list.push("strengthA");
  if (selected.includes("endurance")) list.push("enduranceA");
  if (selected.includes("cardio")) list.push("cardioA");
  if (selected.includes("flexibility")) list.push("flexibilityA");

  if (selected.includes("strength")) list.push("strengthB");
  if (selected.includes("endurance")) list.push("enduranceB");
  if (selected.includes("cardio")) list.push("cardioB");
  if (selected.includes("flexibility")) list.push("flexibilityB");

  while (list.length < daysPerWeek) {
    list.push("mixed");
  }

  return list.slice(0, daysPerWeek);
}

function buildWorkoutTemplate(template, draft, weekIndex, phase) {
  if (template === "strengthA") {
    return {
      title: "Strength Session",
      goal: phase === "deload" ? "Deload strength" : "Strength and control",
      warmup: [
        "Easy jog or brisk walk • 2 min",
        "Prep reps • 1 easy round",
        "Bodyweight warm-up"
      ],
      cooldown: [
        "Easy walk • 2 min",
        "Chest stretch • 30 sec",
        "Hip stretch • 30 sec"
      ],
      exercises: compactExercises([
        buildPushExercise(draft, weekIndex, phase, "push-a"),
        buildPullExercise(draft, weekIndex, phase, "pull-a"),
        buildLegExercise(draft, weekIndex, phase, "legs-a"),
        buildCoreExercise(draft, weekIndex, phase, "core-a")
      ])
    };
  }

  if (template === "strengthB") {
    return {
      title: "Strength Session",
      goal: phase === "deload" ? "Reduced volume strength" : "Strength and athleticism",
      warmup: [
        "Easy jog or brisk walk • 2 min",
        "Prep reps • 1 easy round",
        "Shoulder and hip prep"
      ],
      cooldown: [
        "Easy walk • 2 min",
        "Quad stretch • 30 sec",
        "Shoulder stretch • 30 sec"
      ],
      exercises: compactExercises([
        buildLegExercise(draft, weekIndex + 1, phase, "legs-b"),
        buildPushExercise(draft, weekIndex, phase, "push-b"),
        buildPullExercise(draft, weekIndex, phase, "pull-b"),
        buildCoreExercise(draft, weekIndex + 1, phase, "core-b")
      ])
    };
  }

  if (template === "enduranceA") {
    return buildEnduranceWorkout(draft, weekIndex, phase, "A");
  }

  if (template === "enduranceB") {
    return buildEnduranceWorkout(draft, weekIndex + 1, phase, "B");
  }

  if (template === "cardioA") {
    return {
      title: "Cardio Session",
      goal: phase === "deload" ? "Reduced cardio volume" : "Cardio development",
      warmup: [
        "Easy movement • 3 min",
        "Joint prep • 1 round"
      ],
      cooldown: [
        "Easy walk • 2 min",
        "Breathing reset • 1 min"
      ],
      exercises: compactExercises([
        makeExercise("cardio-circuit", "Cardio Circuit", {
          category: "endurance",
          sets: 1,
          targets: [cardioMinutesForWeek(draft, weekIndex, phase)],
          targetType: "minutes",
          tempo: "Steady effort",
          rest: "As needed",
          defaultLoadMode: "normal",
          goalLoadText: "Normal bodyweight"
        }),
        buildCoreExercise(draft, weekIndex, phase, "cardio-core")
      ])
    };
  }

  if (template === "cardioB") {
    return {
      title: "Cardio Session",
      goal: phase === "deload" ? "Easy cardio" : "Steady cardio work",
      warmup: [
        "Easy movement • 3 min",
        "Prep pace gradually"
      ],
      cooldown: [
        "Easy walk • 2 min",
        "Breathing reset • 1 min"
      ],
      exercises: compactExercises([
        makeExercise("steady-cardio", "Steady Cardio", {
          category: "endurance",
          sets: 1,
          targets: [Math.max(10, cardioMinutesForWeek(draft, weekIndex, phase) - 4)],
          targetType: "minutes",
          tempo: "Comfortably hard controlled effort",
          rest: "As needed",
          defaultLoadMode: "normal",
          goalLoadText: "Normal effort"
        })
      ])
    };
  }

  if (template === "flexibilityA" || template === "flexibilityB") {
    return {
      title: "Mobility Session",
      goal: "Flexibility and control",
      warmup: [
        "Easy movement • 2 min",
        "Joint circles • 1 round"
      ],
      cooldown: [
        "Easy breathing • 1 min",
        "Relaxed walking • 2 min"
      ],
      exercises: [
        makeExercise("hip-mobility", "Hip Mobility Flow", {
          category: "hold",
          sets: 2,
          targets: [30, 30],
          targetType: "seconds",
          tempo: "Smooth controlled range",
          rest: "20 sec",
          defaultLoadMode: "normal",
          goalLoadText: "Normal bodyweight"
        }),
        makeExercise("hamstring-hold", "Hamstring Stretch Hold", {
          category: "hold",
          sets: 2,
          targets: [25, 25],
          targetType: "seconds",
          tempo: "Gentle steady hold",
          rest: "20 sec",
          defaultLoadMode: "normal",
          goalLoadText: "Normal bodyweight"
        }),
        makeExercise("thoracic-mobility", "Thoracic Mobility", {
          category: "hold",
          sets: 2,
          targets: [25, 25],
          targetType: "seconds",
          tempo: "Smooth controlled range",
          rest: "20 sec",
          defaultLoadMode: "normal",
          goalLoadText: "Normal bodyweight"
        })
      ]
    };
  }

  return {
    title: "Mixed Session",
    goal: phase === "deload" ? "Deload mixed work" : "General mixed training",
    warmup: [
      "Easy jog or brisk walk • 2 min",
      "Prep reps • 1 easy round"
    ],
    cooldown: [
      "Easy walk • 2 min",
      "Light stretch • 1 round"
    ],
    exercises: compactExercises([
      buildPushExercise(draft, weekIndex, phase, "mixed-push"),
      buildEnduranceExercise(draft, weekIndex, phase, "mixed-endurance"),
      buildCoreExercise(draft, weekIndex, phase, "mixed-core")
    ])
  };
}

function compactExercises(exercises) {
  return exercises.filter(Boolean);
}

function makeExercise(id, name, options = {}) {
  return {
    id,
    name,
    category: options.category || inferExerciseCategory(name),
    sets: options.sets ?? 3,
    targets: Array.isArray(options.targets) ? options.targets : [options.target ?? 5],
    targetType: options.targetType || "reps",
    tempo: options.tempo || "Controlled effort",
    rest: options.rest || "60 sec",
    defaultLoadMode: options.defaultLoadMode || "normal",
    goalLoadText: options.goalLoadText || "Normal bodyweight",
    notes: options.notes || "",
    test: !!options.test
  };
}

function strengthSetsForSessionLength(sessionLength, phase) {
  const base = sessionLength === 30 ? 2 : sessionLength === 90 ? 4 : 3;
  return phase === "deload" ? Math.max(1, base - 1) : base;
}

function buildPushExercise(draft, weekIndex, phase, idPrefix) {
  const sets = strengthSetsForSessionLength(draft.sessionLength, phase);

  if (draft.pushupAbility === "no") {
    const variation = draft.pushupVariation;
    const name = labelPushVariation(variation);
    const start = variation === "wall push-up" ? 8 : variation === "incline push-up" ? 6 : 5;
    const reps = phase === "deload" ? Math.max(3, start - 1) : start + Math.min(weekIndex - 1, 2);

    return makeExercise(`${idPrefix}-${weekIndex}`, name, {
      category: "push",
      sets,
      targets: Array(sets).fill(reps),
      targetType: "reps",
      tempo: "2 sec down • pause • drive up",
      rest: "75 sec",
      defaultLoadMode: "normal",
      goalLoadText: "Normal bodyweight"
    });
  }

  if (draft.pushUpMax <= 3) {
    const reps = phase === "deload" ? 3 : 4;
    return makeExercise(`${idPrefix}-${weekIndex}`, "Knee Push-Ups", {
      category: "push",
      sets,
      targets: Array(sets).fill(reps),
      targetType: "reps",
      tempo: "2 sec down • pause • drive up",
      rest: "75 sec",
      defaultLoadMode: "normal",
      goalLoadText: "Normal bodyweight"
    });
  }

  const safeTop = Math.max(1, Math.floor(draft.pushUpMax * 0.6));
  const reps = phase === "deload"
    ? Math.max(1, safeTop - 1)
    : Math.min(draft.pushUpMax, safeTop + Math.min(weekIndex - 1, 2));

  const weighted = draft.trainingStyles.includes("weightlifting") || draft.trainingStyles.includes("machines");
  const name = weighted ? "DB Floor Press" : "Push-Ups";

  return makeExercise(`${idPrefix}-${weekIndex}`, name, {
    category: "push",
    sets,
    targets: Array(sets).fill(reps),
    targetType: "reps",
    tempo: weighted ? "2 sec down • light pause • drive up" : "2 sec down • pause • drive up",
    rest: "75 sec",
    defaultLoadMode: weighted ? "load" : "normal",
    goalLoadText: weighted
      ? "Goal mode: added load. Pick a clean working weight."
      : "Goal mode: normal bodyweight"
  });
}

function buildPullExercise(draft, weekIndex, phase, idPrefix) {
  const sets = strengthSetsForSessionLength(draft.sessionLength, phase);

  if (draft.pullupAbility === "no") {
    const variation = draft.pullupVariation;
    const name = labelPullVariation(variation);

    if (variation === "dead hang" || variation === "active hang") {
      const seconds = phase === "deload" ? 10 : 12 + Math.min(weekIndex - 1, 2) * 5;
      return makeExercise(`${idPrefix}-${weekIndex}`, name, {
        category: "pull",
        sets: Math.max(2, sets - 1),
        targets: Array(Math.max(2, sets - 1)).fill(seconds),
        targetType: "seconds",
        tempo: "Still body • strong grip",
        rest: "45 sec",
        defaultLoadMode: "normal",
        goalLoadText: "Goal mode: normal bodyweight"
      });
    }

    if (variation === "negative pull-up") {
      return makeExercise(`${idPrefix}-${weekIndex}`, "Negative Pull-Ups", {
        category: "pull",
        sets,
        targets: Array(sets).fill(3),
        targetType: "reps",
        tempo: "Jump up • 4 sec lower",
        rest: "90 sec",
        defaultLoadMode: "normal",
        goalLoadText: "Goal mode: normal bodyweight"
      });
    }

    return makeExercise(`${idPrefix}-${weekIndex}`, "Assisted Pull-Ups", {
      category: "pull",
      sets,
      targets: Array(sets).fill(4 + Math.min(weekIndex - 1, 1)),
      targetType: "reps",
      tempo: "Full range • lower under control",
      rest: "90 sec",
      defaultLoadMode: "assistance",
      goalLoadText: "Goal mode: assistance. Use enough help to hit all clean reps."
    });
  }

  if (draft.pullUpMax <= 2) {
    return makeExercise(`${idPrefix}-${weekIndex}`, "Assisted Pull-Ups", {
      category: "pull",
      sets,
      targets: Array(sets).fill(4),
      targetType: "reps",
      tempo: "Full range • lower under control",
      rest: "90 sec",
      defaultLoadMode: "assistance",
      goalLoadText: "Goal mode: assistance. Use enough help to hit all clean reps."
    });
  }

  const safeTop = Math.max(1, Math.floor(draft.pullUpMax * 0.6));
  const reps = phase === "deload"
    ? Math.max(1, safeTop - 1)
    : Math.min(draft.pullUpMax, safeTop + Math.min(weekIndex - 1, 1));

  const weighted = draft.trainingStyles.includes("weightlifting") || draft.trainingStyles.includes("machines");
  const name = weighted ? "Lat Pulldown / Row" : "Pull-Ups";

  return makeExercise(`${idPrefix}-${weekIndex}`, name, {
    category: "pull",
    sets,
    targets: Array(sets).fill(reps),
    targetType: "reps",
    tempo: weighted ? "Pull smooth • lower under control" : "Full hang • pull smooth • lower under control",
    rest: "90 sec",
    defaultLoadMode: weighted ? "load" : "normal",
    goalLoadText: weighted
      ? "Goal mode: added load. Pick a clean working weight."
      : "Goal mode: normal bodyweight"
  });
}

function buildLegExercise(draft, weekIndex, phase, idPrefix) {
  const sets = strengthSetsForSessionLength(draft.sessionLength, phase);
  const isMachine = draft.trainingStyles.includes("machines");
  const isWeight = draft.trainingStyles.includes("weightlifting");

  const name = isMachine
    ? "Leg Press"
    : isWeight
      ? "Goblet Squat"
      : "Split Squat";

  const reps = phase === "deload" ? 6 : 6 + Math.min(weekIndex - 1, 2);

  return makeExercise(`${idPrefix}-${weekIndex}`, name, {
    category: "legs",
    sets,
    targets: Array(sets).fill(reps),
    targetType: "reps",
    tempo: "3 sec down • pause • stand tall",
    rest: "75 sec",
    defaultLoadMode: isMachine || isWeight ? "load" : "normal",
    goalLoadText: isMachine || isWeight
      ? "Goal mode: added load. Pick a clean working weight."
      : "Goal mode: normal bodyweight"
  });
}

function buildCoreExercise(draft, weekIndex, phase, idPrefix) {
  const sets = Math.max(2, strengthSetsForSessionLength(draft.sessionLength, phase) - 1);
  const secondsBase = Math.max(15, Math.floor((draft.plankMax || 45) * 0.6));
  const seconds = phase === "deload"
    ? Math.max(10, secondsBase - 5)
    : Math.min(draft.plankMax || 45, secondsBase + Math.min(weekIndex - 1, 2) * 5);

  return makeExercise(`${idPrefix}-${weekIndex}`, "Plank", {
    category: "hold",
    sets,
    targets: Array(sets).fill(seconds),
    targetType: "seconds",
    tempo: "Brace hard • still hips",
    rest: "45 sec",
    defaultLoadMode: "normal",
    goalLoadText: "Goal mode: normal bodyweight"
  });
}

function cardioMinutesForWeek(draft, weekIndex, phase) {
  const base = draft.sessionLength === 30 ? 12 : draft.sessionLength === 90 ? 24 : 18;
  const progressed = base + Math.min(weekIndex - 1, 2) * 3;
  return phase === "deload" ? Math.max(10, progressed - 4) : progressed;
}

function buildEnduranceExercise(draft, weekIndex, phase, idPrefix) {
  const label = draft.enduranceType === "cycling"
    ? "Bike Ride"
    : draft.enduranceType === "swimming"
      ? "Swim"
      : "Run";

  const minutesBase = normalizeRunMinutes(draft);
  const minutes = phase === "deload"
    ? Math.max(10, Math.round(minutesBase * 0.75))
    : Math.max(12, Math.round(minutesBase * (1 + (weekIndex - 1) * 0.08)));

  return makeExercise(`${idPrefix}-${weekIndex}`, label, {
    category: draft.enduranceType === "running" ? "endurance" : "endurance",
    sets: 1,
    targets: [minutes],
    targetType: "minutes",
    tempo: draft.enduranceType === "running"
      ? "Easy conversational effort"
      : "Steady controlled endurance",
    rest: "—",
    defaultLoadMode: "normal",
    goalLoadText: "Goal mode: normal effort"
  });
}

function buildEnduranceWorkout(draft, weekIndex, phase, suffix) {
  if (draft.enduranceType === "running") {
    const easy = suffix === "B";
    const name = easy ? "Easy Run" : "Run Workout";

    const targetMinutes = easy
      ? Math.max(12, Math.round(normalizeRunMinutes(draft) * (1 + (weekIndex - 1) * 0.08)))
      : Math.max(12, normalizeRunMinutes(draft) + Math.min(weekIndex - 1, 2));

    const finalMinutes = phase === "deload" ? Math.max(10, targetMinutes - 4) : targetMinutes;

    return {
      title: name,
      goal: easy ? "Aerobic conversational run" : "Endurance development",
      warmup: [
        "Easy jog • 8 to 10 min",
        "Leg swings • 10 each side",
        "2 short build-ups"
      ],
      cooldown: [
        "Easy walk • 2 to 3 min",
        "Calf stretch • 30 sec",
        "Hip flexor stretch • 30 sec"
      ],
      exercises: [
        makeExercise(`run-${suffix}-${weekIndex}`, name, {
          category: easy ? "endurance" : "mile",
          sets: 1,
          targets: [finalMinutes],
          targetType: "minutes",
          tempo: easy ? "Easy conversational effort" : "Comfortably hard controlled effort",
          rest: "—",
          defaultLoadMode: "normal",
          goalLoadText: "Goal mode: normal effort"
        })
      ]
    };
  }

  if (draft.enduranceType === "cycling") {
    const label = suffix === "B" ? "Easy Ride" : "Bike Workout";
    return {
      title: label,
      goal: suffix === "B" ? "Steady aerobic cycling" : "Endurance development",
      warmup: [
        "Easy spin • 5 min",
        "Gradual build-up"
      ],
      cooldown: [
        "Easy spin • 3 min",
        "Light stretch • 1 round"
      ],
      exercises: [
        buildEnduranceExercise(draft, weekIndex, phase, `cycle-${suffix}`)
      ]
    };
  }

  return {
    title: suffix === "B" ? "Easy Swim" : "Swim Workout",
    goal: suffix === "B" ? "Steady aerobic swimming" : "Endurance development",
    warmup: [
      "Easy warm-up • 5 min",
      "Gradual build-up"
    ],
    cooldown: [
      "Easy cool-down • 3 min",
      "Light stretch • 1 round"
    ],
    exercises: [
      buildEnduranceExercise(draft, weekIndex, phase, `swim-${suffix}`)
    ]
  };
}

function normalizeRunMinutes(draft) {
  const minutes = draft.runDurationUnit === "hours"
    ? draft.runDurationValue * 60
    : draft.runDurationValue;

  return Math.max(12, Math.round(minutes || 20));
}

function groupPlanByWeek(plan) {
  const map = new Map();

  (plan.schedule || []).forEach((workout) => {
    const key = workout.weekIndex;
    if (!map.has(key)) {
      map.set(key, {
        weekIndex: workout.weekIndex,
        weekLabel: workout.weekLabel,
        workouts: []
      });
    }
    map.get(key).workouts.push(workout);
  });

  return Array.from(map.values()).sort((a, b) => a.weekIndex - b.weekIndex);
}

// =========================
// DASHBOARD
// =========================
async function initDashboardPage() {
  const currentPlanBox = byAnyId(["currentPlanBox", "planSummaryBox"]);
  const todayBox = byId("todayBox");
  const recordsBox = byId("recordsBox");
  const weekTrackerBox = byId("weekTrackerBox");
  const calendarBox = byId("calendarBox");

  if (!currentPlanBox && !todayBox && !recordsBox && !weekTrackerBox && !calendarBox) return;

  let user = getUser();
  let plan = normalizePlan(getLatestPlanRaw(), user);
  const token = getToken();

  if (token) {
    try {
      const me = await apiGet("/me");
      if (me.ok && me.user) {
        user = me.user;
        localStorage.setItem(STORAGE.user, JSON.stringify(me.user));
      }
    } catch {}

    try {
      const planData = await apiGet("/my-plan");
      if (planData.ok && planData.plan) {
        plan = normalizePlan(planData.plan, user);
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

  APP.currentPlan = plan;

  if (!plan) {
    renderNoPlanDashboard(user);
    return;
  }

  renderFullDashboard(user, plan);
}

function renderNoPlanDashboard(user) {
  const profileBox = byId("profileBox");
  const currentPlanBox = byAnyId(["currentPlanBox", "planSummaryBox"]);
  const recordsBox = byId("recordsBox");
  const signalsBox = byId("signalsBox");
  const quickStatsBox = byId("quickStatsBox");
  const todayBox = byId("todayBox");
  const todayStatus = byId("todayStatus");
  const weekTrackerBox = byId("weekTrackerBox");
  const calendarBox = byId("calendarBox");
  const streakHeroNumber = byId("streakHeroNumber");
  const streakHeroSub = byId("streakHeroSub");

  if (profileBox) {
    profileBox.innerHTML = `
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
        <div class="info-value">${escapeHTML(String(user?.age || "—"))}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Age band</div>
        <div class="info-value">${escapeHTML(user?.ageBand || "—")}</div>
      </div>
    `;
  }

  if (currentPlanBox) currentPlanBox.innerHTML = `<div class="empty-box">No saved plan yet. Build one in the planner first.</div>`;
  if (recordsBox) recordsBox.innerHTML = `<div class="empty-box">No records yet. Save a plan first.</div>`;
  if (signalsBox) signalsBox.innerHTML = `No coaching signals yet.`;
  if (quickStatsBox) quickStatsBox.innerHTML = `<div class="empty-box">No quick stats yet.</div>`;
  if (todayBox) todayBox.innerHTML = `<div class="empty-box">No workout to show yet.</div>`;
  if (weekTrackerBox) weekTrackerBox.innerHTML = `<div class="empty-box">No week loaded yet.</div>`;
  if (calendarBox) calendarBox.innerHTML = `<div class="empty-box">No future weeks loaded yet.</div>`;
  if (streakHeroNumber) streakHeroNumber.textContent = "0";
  if (streakHeroSub) streakHeroSub.textContent = "Build and save a plan to get started.";
  if (todayStatus) setStatus(todayStatus, "No saved plan yet.");
}

function renderFullDashboard(user, plan) {
  const tracker = loadTracker(plan);

  renderProfileCard(user, plan);
  renderCurrentPlanCard(plan);
  renderStreakCard(plan, tracker);
  renderRecordsCard(plan, tracker);
  renderSignalsCard(plan, tracker);
  renderQuickStatsCard(plan, tracker);
  renderTodayCard(plan, tracker);
  renderWeekTracker(plan, tracker);
  renderWeeksAhead(plan);
}

function renderProfileCard(user, plan) {
  const profileBox = byId("profileBox");
  if (!profileBox) return;

  profileBox.innerHTML = `
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
      <div class="info-value">${escapeHTML(String(plan.age))}</div>
      <div class="info-sub">Planner age is based on date of birth if entered.</div>
    </div>
    <div class="info-card">
      <div class="info-label">Age band</div>
      <div class="info-value">${escapeHTML(plan.ageBand)}</div>
    </div>
  `;
}

function renderCurrentPlanCard(plan) {
  const currentPlanBox = byAnyId(["currentPlanBox", "planSummaryBox"]);
  if (!currentPlanBox) return;

  const nextWorkout = getNextWorkout(plan);

  currentPlanBox.innerHTML = `
    <div class="info-card">
      <div class="info-label">Plan</div>
      <div class="info-value">${escapeHTML(plan.planName)}</div>
      <div class="info-sub">${escapeHTML(plan.summary)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Next workout</div>
      <div class="info-value">${escapeHTML(nextWorkout ? `${nextWorkout.weekLabel} • ${nextWorkout.workoutLabel}` : "Plan complete")}</div>
      <div class="info-sub">${escapeHTML(nextWorkout ? nextWorkout.title : "No remaining workouts")}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Workout length</div>
      <div class="info-value">${escapeHTML(`${plan.sessionLength} minutes`)}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Training style</div>
      <div class="info-value">${escapeHTML(plan.trainingStyles.map(labelTrainingStyle).join(", "))}</div>
    </div>
  `;
}

function getTrackerKey(plan) {
  const user = getUser();
  const userId = user?.email || "guest";
  return `fitnessplan_tracker_${userId}_${plan.planName}_${plan.startDate || "local"}`;
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
  const workouts = (plan.schedule || []).filter((workout) => workout.date <= todayISO());

  let streak = 0;
  for (let i = workouts.length - 1; i >= 0; i -= 1) {
    const dayLog = tracker.days?.[workouts[i].date];
    const logged = dayLog && Object.keys(dayLog).some((key) => !key.startsWith("_"));
    if (!logged) break;
    streak += 1;
  }
  return streak;
}

function renderStreakCard(plan, tracker) {
  const streakHeroNumber = byId("streakHeroNumber");
  const streakHeroSub = byId("streakHeroSub");
  const streak = countWorkoutStreak(plan, tracker);

  if (streakHeroNumber) streakHeroNumber.textContent = String(streak);
  if (streakHeroSub) {
    streakHeroSub.textContent =
      streak === 0
        ? "Log workouts to build your streak."
        : streak === 1
          ? "You completed 1 workout day in a row."
          : `You completed ${streak} workout days in a row.`;
  }
}

function renderRecordsCard(plan, tracker) {
  const recordsBox = byId("recordsBox");
  if (!recordsBox) return;

  const mileRecord = getBestMileRecord(plan, tracker);
  const runDistanceRecord = getLongestRunDistanceRecord(plan, tracker);
  const plankRecord = getBestHoldRecord(plan, tracker, "Plank") || plan.baselines.plank;
  const pushRecord = getBestRepRecord(plan, tracker, "push") || plan.baselines.push;
  const pullRecord = getBestPullRecord(plan, tracker) || plan.baselines.pull;
  const durationRecord = plan.baselines.longestContinuousRun || "—";

  recordsBox.innerHTML = `
    <div class="record-card">
      <div class="record-title">Best mile time</div>
      <div class="record-value">${escapeHTML(mileRecord || "—")}</div>
      <div class="record-note">${mileRecord ? "Baseline or logged record." : "Add a mile baseline in the planner."}</div>
    </div>

    <div class="record-card">
      <div class="record-title">Longest run distance</div>
      <div class="record-value">${escapeHTML(runDistanceRecord || "—")}</div>
      <div class="record-note">${runDistanceRecord ? "Baseline or logged record." : "Add a distance baseline in the planner."}</div>
    </div>

    <div class="record-card">
      <div class="record-title">Best push result</div>
      <div class="record-value">${escapeHTML(pushRecord || "—")}</div>
      <div class="record-note">Uses your planner baseline or best logged set.</div>
    </div>

    <div class="record-card">
      <div class="record-title">Best pull result</div>
      <div class="record-value">${escapeHTML(pullRecord || "—")}</div>
      <div class="record-note">Uses your planner baseline or best logged set.</div>
    </div>

    <div class="record-card">
      <div class="record-title">Best plank hold</div>
      <div class="record-value">${escapeHTML(plankRecord || "—")}</div>
      <div class="record-note">Uses your planner baseline or best logged hold.</div>
    </div>

    <div class="record-card">
      <div class="record-title">Longest continuous effort</div>
      <div class="record-value">${escapeHTML(durationRecord || "—")}</div>
      <div class="record-note">Taken from your planner baseline.</div>
    </div>
  `;
}

function getBestMileRecord(plan, tracker) {
  const baseline = plan.baselines.mileTime || null;
  let best = baseline;
  let bestSeconds = baseline ? parseTimeToSeconds(baseline) : null;

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (exercise.category !== "mile") return;
      const entry = tracker.days?.[workout.date]?.[exercise.id];
      const secs = parseTimeToSeconds(entry?.logText || entry?.noteText || "");
      if (secs == null) return;
      if (bestSeconds == null || secs < bestSeconds) {
        bestSeconds = secs;
        best = formatSeconds(secs);
      }
    });
  });

  return best;
}

function getLongestRunDistanceRecord(plan, tracker) {
  const baselineText = plan.baselines.longestRunDistance || null;
  let bestText = baselineText;
  let bestValue = baselineText ? parseFirstNumber(baselineText) : null;

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (exercise.category !== "endurance" && exercise.category !== "mile") return;
      const entry = tracker.days?.[workout.date]?.[exercise.id];
      const value = parseFirstNumber(entry?.logText || "");
      if (value == null) return;
      if (bestValue == null || value > bestValue) {
        bestValue = value;
        bestText = `${value} ${plan.runDistanceUnit}`;
      }
    });
  });

  return bestText;
}

function getBestRepRecord(plan, tracker, category) {
  let bestValue = null;
  let bestText = null;

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (exercise.category !== category) return;
      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!Array.isArray(entry?.values) || !entry.values.length) return;
      const best = Math.max(...entry.values.map(Number).filter(Number.isFinite));
      if (!Number.isFinite(best)) return;
      if (bestValue == null || best > bestValue) {
        bestValue = best;
        bestText = `${best} reps`;
      }
    });
  });

  return bestText;
}

function getBestPullRecord(plan, tracker) {
  let bestAssist = null;
  let bestReps = null;

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (exercise.category !== "pull") return;

      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry) return;

      if (entry.loadMode === "assistance" && Number.isFinite(Number(entry.loadValue))) {
        const assist = Number(entry.loadValue);
        if (bestAssist == null || assist < bestAssist) bestAssist = assist;
      }

      if (Array.isArray(entry.values) && entry.values.length) {
        const reps = Math.max(...entry.values.map(Number).filter(Number.isFinite));
        if (Number.isFinite(reps) && (bestReps == null || reps > bestReps)) bestReps = reps;
      }
    });
  });

  if (bestAssist != null) return `${bestAssist} assistance`;
  if (bestReps != null) return `${bestReps} reps`;
  return null;
}

function getBestHoldRecord(plan, tracker, exerciseNameContains) {
  const matchText = String(exerciseNameContains || "").toLowerCase();
  let bestValue = null;
  let bestText = null;

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (!String(exercise.name).toLowerCase().includes(matchText)) return;
      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!Array.isArray(entry?.values) || !entry.values.length) return;
      const hold = Math.max(...entry.values.map(Number).filter(Number.isFinite));
      if (!Number.isFinite(hold)) return;
      if (bestValue == null || hold > bestValue) {
        bestValue = hold;
        bestText = `${hold} sec`;
      }
    });
  });

  return bestText;
}

function collectExerciseMetrics(plan, tracker) {
  const map = new Map();

  (plan.schedule || []).forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      const entry = tracker.days?.[workout.date]?.[exercise.id];
      if (!entry) return;

      let metric = null;
      if (exercise.category === "mile") {
        const secs = parseTimeToSeconds(entry.logText || "");
        if (secs != null) metric = { value: secs, better: "lower" };
      } else if (exercise.category === "endurance") {
        const dist = parseFirstNumber(entry.logText || "");
        if (dist != null) metric = { value: dist, better: "higher" };
      } else if (entry.loadMode === "assistance" && Number.isFinite(Number(entry.loadValue))) {
        metric = { value: Number(entry.loadValue), better: "lower" };
      } else if (entry.loadMode === "load" && Number.isFinite(Number(entry.loadValue))) {
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
          category: exercise.category,
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
  if (category === "mile" || category === "endurance") return 28;
  if (category === "hold") return 35;
  return 42;
}

function pickRecordPoint(points, better) {
  if (!points.length) return null;
  if (better === "lower") {
    return points.reduce((best, p) => (p.value < best.value ? p : best), points[0]);
  }
  return points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);
}

function renderSignalsCard(plan, tracker) {
  const signalsBox = byId("signalsBox");
  if (!signalsBox) return;

  const metrics = collectExerciseMetrics(plan, tracker);
  const notes = [];
  const today = todayISO();

  metrics.forEach((item) => {
    const record = pickRecordPoint(item.points, item.better);
    const stale = record ? daysBetween(record.date, today) >= staleWindowDays(item.category) : false;
    const plateau = detectPlateau(item.points, item.better);
    if (!stale && !plateau) return;
    notes.push(`${item.name}: ${plateau ? "plateau" : "stale record"}`);
  });

  if (!notes.length) {
    signalsBox.innerHTML = "No strong plateau or stale-record warning right now.";
    return;
  }

  signalsBox.innerHTML = `
    <strong>${notes.length >= 2 ? "Intervention week recommended" : "Retest watchlist active"}</strong><br>
    ${escapeHTML(notes.join(" • "))}
  `;
}

function renderQuickStatsCard(plan, tracker) {
  const quickStatsBox = byId("quickStatsBox");
  if (!quickStatsBox) return;

  const total = (plan.schedule || []).length;
  const logged = (plan.schedule || []).filter((workout) => {
    const dayLog = tracker.days?.[workout.date];
    return dayLog && Object.keys(dayLog).some((key) => !key.startsWith("_"));
  }).length;
  const nextWorkout = getNextWorkout(plan);

  quickStatsBox.innerHTML = `
    <div class="info-card">
      <div class="info-label">Workouts in block</div>
      <div class="info-value">${escapeHTML(String(total))}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Logged workouts</div>
      <div class="info-value">${escapeHTML(String(logged))}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Focus</div>
      <div class="info-value">${escapeHTML(plan.focus.map(labelFocus).join(" + "))}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Next workout</div>
      <div class="info-value">${escapeHTML(nextWorkout ? `${nextWorkout.weekLabel} • ${nextWorkout.workoutLabel}` : "Plan complete")}</div>
    </div>
  `;
}

function getNextWorkout(plan) {
  return (plan.schedule || []).find((workout) => workout.date >= todayISO()) || null;
}

function getTodayWorkout(plan) {
  return (plan.schedule || []).find((workout) => workout.date === todayISO()) || null;
}

// =========================
// READINESS
// =========================
function getDayReadiness(tracker, date) {
  return tracker.days?.[date]?._sessionReadiness || null;
}

function readinessComplete(readiness) {
  return !!(
    readiness &&
    readiness.sleepHours !== undefined &&
    readiness.sleepHours !== "" &&
    readiness.soreness !== undefined &&
    readiness.soreness !== "" &&
    readiness.energy !== undefined &&
    readiness.energy !== ""
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
      note: "Volume is reduced. Accessories are cut first."
    };
  }

  if (avg >= 4) {
    return {
      level: "high",
      label: "High readiness",
      note: "Run the planned session if form stays clean."
    };
  }

  return {
    level: "normal",
    label: "Normal readiness",
    note: "Run the planned session."
  };
}

function adjustWorkoutForReadiness(workout, readinessSummary) {
  if (!readinessSummary || readinessSummary.level !== "low") return JSON.parse(JSON.stringify(workout));

  const copy = JSON.parse(JSON.stringify(workout));

  copy.exercises = (copy.exercises || []).map((exercise, index) => {
    const next = { ...exercise };

    if (exercise.test) {
      next.skipped = true;
      next.adjustedNote = "Skipped because readiness is low.";
      return next;
    }

    if (next.targetType === "minutes") {
      next.targets = [Math.max(8, Math.round((next.targets?.[0] || 12) * 0.75))];
      next.tempo = "Easy conversational effort";
      next.adjustedNote = "Made easier because readiness is low.";
      return next;
    }

    if (index >= 2) {
      next.skipped = true;
      next.adjustedNote = "Accessory cut first because readiness is low.";
      return next;
    }

    next.targets = (next.targets || []).slice(0, Math.max(1, (next.targets || []).length - 1));
    next.sets = next.targets.length;
    next.adjustedNote = "Volume reduced because readiness is low.";
    return next;
  });

  return copy;
}

// =========================
// TODAY CARD
// =========================
function renderTodayCard(plan, tracker) {
  const todayBox = byId("todayBox");
  const todayStatus = byId("todayStatus");
  if (!todayBox) return;

  const todayWorkout = getTodayWorkout(plan);

  if (!todayWorkout) {
    const next = getNextWorkout(plan);
    todayBox.innerHTML = `<div class="empty-box">No workout scheduled today. ${next ? `Next: ${next.weekLabel} • ${next.workoutLabel}` : "Plan complete."}</div>`;
    if (todayStatus) setStatus(todayStatus, "No workout to log today.");
    return;
  }

  const readiness = getDayReadiness(tracker, todayWorkout.date);
  const readinessSummary = computeReadinessSummary(readiness);
  const displayWorkout = adjustWorkoutForReadiness(todayWorkout, readinessSummary);
  const canLog = !!readinessSummary;

  todayBox.innerHTML = `
    <div class="today-card">
      <div class="day-top">
        <div>
          <div class="day-label">${escapeHTML(displayWorkout.workoutLabel)}</div>
          <div class="day-title">${escapeHTML(displayWorkout.title)}</div>
          <div class="day-meta">${escapeHTML(displayWorkout.weekLabel)} • ${escapeHTML(displayWorkout.goal)}</div>
        </div>
        <span class="badge ${displayWorkout.phase !== "normal" ? "warn" : ""}">${escapeHTML(displayWorkout.phase)}</span>
      </div>

      <div class="readiness-box">
        <div class="block-title">Readiness</div>
        <div class="readiness-grid">
          <div>
            <label>Sleep (hours)</label>
            <input id="todaySleepHours" class="small-input" type="text" inputmode="decimal" placeholder="Example: 7.5" value="${escapeHTML(String(readiness?.sleepHours ?? ""))}" />
          </div>
          <div>
            <label>Soreness (1 to 5)</label>
            <input id="todaySoreness" class="small-input" type="text" inputmode="numeric" placeholder="1 to 5" value="${escapeHTML(String(readiness?.soreness ?? ""))}" />
          </div>
          <div>
            <label>Energy (1 to 5)</label>
            <input id="todayEnergy" class="small-input" type="text" inputmode="numeric" placeholder="1 to 5" value="${escapeHTML(String(readiness?.energy ?? ""))}" />
          </div>
        </div>
        <div class="button-row">
          <button type="button" id="saveReadinessBtn">Set readiness</button>
        </div>
        <div class="small-note">${escapeHTML(readinessSummary ? `${readinessSummary.label}. ${readinessSummary.note}` : "Readiness is required before logging.")}</div>
      </div>

      ${renderTrackableBlockHTML("Warm up", "warmup", displayWorkout.warmup, tracker, todayWorkout.date, canLog)}
      ${renderExercisesHTML(displayWorkout, tracker, todayWorkout.date, canLog)}
      ${renderTrackableBlockHTML("Cooldown", "cooldown", displayWorkout.cooldown, tracker, todayWorkout.date, canLog)}

      <div class="button-row">
        <button type="button" id="saveTodayWorkoutBtn" ${canLog ? "" : "disabled"}>Save workout</button>
      </div>
    </div>
  `;

  byId("saveReadinessBtn")?.addEventListener("click", () => {
    const nextTracker = loadTracker(plan);
    if (!nextTracker.days[todayWorkout.date]) nextTracker.days[todayWorkout.date] = {};

    const sleepHours = Number(byId("todaySleepHours")?.value || 0);
    const soreness = Number(byId("todaySoreness")?.value || 0);
    const energy = Number(byId("todayEnergy")?.value || 0);

    if (!sleepHours || soreness < 1 || soreness > 5 || energy < 1 || energy > 5) {
      if (todayStatus) setStatus(todayStatus, "Enter real readiness values first.", "bad");
      return;
    }

    nextTracker.days[todayWorkout.date]._sessionReadiness = {
      sleepHours,
      soreness,
      energy
    };

    saveTracker(plan, nextTracker);
    renderFullDashboard(getUser(), plan);
    if (todayStatus) setStatus(todayStatus, "Readiness set.", "ok");
  });

  addTrackableChecklistListeners(plan, todayWorkout.date, "warmup");
  addTrackableChecklistListeners(plan, todayWorkout.date, "cooldown");
  addLoadModeListeners(displayWorkout, canLog);

  byId("saveTodayWorkoutBtn")?.addEventListener("click", () => {
    if (!canLog) {
      if (todayStatus) setStatus(todayStatus, "Set readiness before logging.", "bad");
      return;
    }

    const nextTracker = loadTracker(plan);
    if (!nextTracker.days[todayWorkout.date]) nextTracker.days[todayWorkout.date] = {};

    const validationError = collectTodayExerciseLogs(displayWorkout, nextTracker.days[todayWorkout.date]);
    if (validationError) {
      if (todayStatus) setStatus(todayStatus, validationError, "bad");
      return;
    }

    nextTracker.days[todayWorkout.date]._savedAt = new Date().toISOString();
    saveTracker(plan, nextTracker);
    renderFullDashboard(getUser(), plan);
    if (todayStatus) setStatus(todayStatus, "Workout saved.", "ok");
  });

  if (todayStatus) {
    setStatus(todayStatus, canLog ? "Ready to log." : "Set readiness before logging.");
  }
}

function renderTrackableBlockHTML(title, bucket, items, tracker, date, canLog) {
  if (!Array.isArray(items) || !items.length) return "";

  const doneMap = tracker.days?.[date]?.[`_${bucket}Done`] || {};

  return `
    <div class="session-block">
      <div class="block-title">${escapeHTML(title)}</div>
      <div class="small-note">
        ${items.map((item, index) => `
          <label class="check-tile" style="margin-bottom:10px;">
            <input
              type="checkbox"
              data-track-bucket="${bucket}"
              data-track-index="${index}"
              ${doneMap[index] ? "checked" : ""}
              ${canLog ? "" : "disabled"}
            />
            <span>${escapeHTML(item)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function addTrackableChecklistListeners(plan, date, bucket) {
  document.querySelectorAll(`[data-track-bucket="${bucket}"]`).forEach((box) => {
    box.addEventListener("change", () => {
      const tracker = loadTracker(plan);
      if (!tracker.days[date]) tracker.days[date] = {};
      if (!tracker.days[date][`_${bucket}Done`]) tracker.days[date][`_${bucket}Done`] = {};
      tracker.days[date][`_${bucket}Done`][box.dataset.trackIndex] = box.checked;
      saveTracker(plan, tracker);
    });
  });
}

function renderExercisesHTML(workout, tracker, date, canLog) {
  return `
    <div class="week-grid" style="grid-template-columns:1fr;">
      ${(workout.exercises || []).map((exercise) => {
        if (exercise.skipped) {
          return `
            <div class="exercise-box">
              <div class="exercise-head">
                <div>
                  <div class="exercise-name">${escapeHTML(exercise.name)}</div>
                  <div class="exercise-sub">${escapeHTML(exercise.adjustedNote || "Skipped today.")}</div>
                </div>
                <span class="chip neutral">Skipped</span>
              </div>
            </div>
          `;
        }

        return renderExerciseHTML(exercise, tracker.days?.[date]?.[exercise.id], canLog);
      }).join("")}
    </div>
  `;
}

function renderExerciseHTML(exercise, entry, canLog) {
  const safeEntry = entry || {};
  const loadMode = safeEntry.loadMode || exercise.defaultLoadMode || "normal";
  const loadValue = safeEntry.loadValue ?? "";
  const values = Array.isArray(safeEntry.values) ? safeEntry.values : [];

  if (exercise.targetType === "minutes") {
    return `
      <div class="exercise-box">
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${escapeHTML(exercise.name)}</div>
            <div class="exercise-sub">${escapeHTML(exercise.tempo)}</div>
            <div class="small-note">Rest: ${escapeHTML(exercise.rest)} • ${escapeHTML(exercise.goalLoadText)}</div>
            ${exercise.adjustedNote ? `<div class="small-note">${escapeHTML(exercise.adjustedNote)}</div>` : ""}
          </div>
          <span class="chip neutral">Endurance</span>
        </div>

        <div class="session-block">
          <div class="block-title">Main set</div>
          <div class="small-note">Goal: ${escapeHTML(`${exercise.targets[0]} minutes`)}</div>

          <label>Log distance / output</label>
          <input
            id="exercise-log-${escapeHTML(exercise.id)}"
            class="small-input"
            type="text"
            placeholder="Example: 2.1 miles"
            value="${escapeHTML(safeEntry.logText || "")}"
            ${canLog ? "" : "disabled"}
          />

          <label>Notes</label>
          <textarea
            id="exercise-note-${escapeHTML(exercise.id)}"
            class="small-textarea"
            placeholder="Optional"
            ${canLog ? "" : "disabled"}
          >${escapeHTML(safeEntry.noteText || "")}</textarea>
        </div>
      </div>
    `;
  }

  return `
    <div class="exercise-box">
      <div class="exercise-head">
        <div>
          <div class="exercise-name">${escapeHTML(exercise.name)}</div>
          <div class="exercise-sub">${escapeHTML(exercise.tempo)}</div>
          <div class="small-note">Rest: ${escapeHTML(exercise.rest)} • ${escapeHTML(exercise.goalLoadText)}</div>
          ${exercise.adjustedNote ? `<div class="small-note">${escapeHTML(exercise.adjustedNote)}</div>` : ""}
        </div>
        <span class="chip neutral">Strength</span>
      </div>

      <div class="set-grid header">
        <div>Set</div>
        <div>Goal</div>
        <div>Log</div>
      </div>

      ${(exercise.targets || []).map((target, index) => `
        <div class="set-grid">
          <div>Set ${index + 1}</div>
          <div class="set-goal">${escapeHTML(`${target}${exercise.targetType === "seconds" ? " sec" : " reps"}`)}</div>
          <div>
            <input
              id="exercise-set-${escapeHTML(exercise.id)}-${index}"
              class="small-input"
              type="text"
              inputmode="numeric"
              placeholder="${exercise.targetType === "seconds" ? "sec" : "reps"}"
              value="${escapeHTML(String(values[index] ?? ""))}"
              ${canLog ? "" : "disabled"}
            />
          </div>
        </div>
      `).join("")}

      <div class="load-grid">
        <div>
          <label>Load mode</label>
          <select
            id="exercise-load-mode-${escapeHTML(exercise.id)}"
            class="small-input"
            ${canLog ? "" : "disabled"}
          >
            <option value="normal" ${loadMode === "normal" ? "selected" : ""}>Normal</option>
            <option value="load" ${loadMode === "load" ? "selected" : ""}>Added load</option>
            <option value="assistance" ${loadMode === "assistance" ? "selected" : ""}>Assistance</option>
          </select>
        </div>
        <div>
          <label>Load / assistance value</label>
          <input
            id="exercise-load-value-${escapeHTML(exercise.id)}"
            class="small-input"
            type="text"
            inputmode="decimal"
            placeholder="Required for load or assistance"
            value="${escapeHTML(String(loadValue))}"
            ${(canLog && loadMode !== "normal") ? "" : "disabled"}
          />
        </div>
      </div>
    </div>
  `;
}

function addLoadModeListeners(workout, canLog) {
  if (!canLog) return;

  (workout.exercises || []).forEach((exercise) => {
    if (exercise.skipped || exercise.targetType === "minutes") return;

    const select = byId(`exercise-load-mode-${exercise.id}`);
    const input = byId(`exercise-load-value-${exercise.id}`);

    if (!select || !input) return;

    select.addEventListener("change", () => {
      input.disabled = select.value === "normal";
      if (select.value === "normal") input.value = "";
    });
  });
}

function collectTodayExerciseLogs(workout, dayLog) {
  for (const exercise of workout.exercises || []) {
    if (exercise.skipped) continue;

    if (exercise.targetType === "minutes") {
      const logText = byId(`exercise-log-${exercise.id}`)?.value?.trim() || "";
      const noteText = byId(`exercise-note-${exercise.id}`)?.value?.trim() || "";

      if (logText || noteText) {
        dayLog[exercise.id] = {
          logText,
          noteText,
          savedAt: new Date().toISOString()
        };
      }

      continue;
    }

    const values = [];
    for (let i = 0; i < (exercise.targets || []).length; i += 1) {
      const raw = byId(`exercise-set-${exercise.id}-${i}`)?.value;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) values.push(n);
    }

    const loadMode = byId(`exercise-load-mode-${exercise.id}`)?.value || "normal";
    const rawLoadValue = byId(`exercise-load-value-${exercise.id}`)?.value?.trim() || "";

    if ((loadMode === "load" || loadMode === "assistance") && rawLoadValue === "") {
      return `${exercise.name}: enter a load or assistance value.`;
    }

    const loadValue = rawLoadValue === "" ? "" : Number(rawLoadValue);
    if (rawLoadValue !== "" && !Number.isFinite(loadValue)) {
      return `${exercise.name}: load or assistance must be a number.`;
    }

    if (values.length || loadMode !== "normal" || rawLoadValue !== "") {
      dayLog[exercise.id] = {
        values,
        loadMode,
        loadValue,
        savedAt: new Date().toISOString()
      };
    }
  }

  return "";
}

// =========================
// WEEK / CALENDAR
// =========================
function getCurrentWeekIndex(plan) {
  const diff = daysBetween(plan.startDate, todayISO());
  if (diff < 0) return 1;
  return clamp(Math.floor(diff / 7) + 1, 1, 4);
}

function renderWeekTracker(plan, tracker) {
  const weekTitle = byId("weekTitle");
  const weekTrackerBox = byId("weekTrackerBox");
  if (!weekTrackerBox) return;

  const weeks = groupPlanByWeek(plan);
  const currentWeek = weeks.find((week) => week.weekIndex === getCurrentWeekIndex(plan)) || weeks[0];

  if (weekTitle) weekTitle.textContent = currentWeek?.weekLabel || "This Week";

  weekTrackerBox.innerHTML = currentWeek
    ? currentWeek.workouts.map((workout) => {
        const dayLog = tracker.days?.[workout.date];
        const logged = dayLog && Object.keys(dayLog).some((key) => !key.startsWith("_"));
        const status = logged ? "Logged" : workout.date === todayISO() ? "Today" : workout.date < todayISO() ? "Not logged" : "Upcoming";

        return `
          <div class="week-card">
            <div class="week-card-title">${escapeHTML(workout.workoutLabel)}</div>
            <div class="week-card-sub">${escapeHTML(workout.title)}</div>
            <div class="week-card-sub">${escapeHTML(workout.goal)}</div>
            <div class="week-card-sub">${escapeHTML(workout.dateLabel)}</div>
            <div class="week-card-sub">${escapeHTML(status)}</div>
          </div>
        `;
      }).join("")
    : `<div class="empty-box">No week loaded yet.</div>`;
}

function renderWeeksAhead(plan) {
  const calendarBox = byId("calendarBox");
  if (!calendarBox) return;

  const weeks = groupPlanByWeek(plan);

  calendarBox.innerHTML = weeks.map((week) => `
    <div class="week-section">
      <div class="week-title">${escapeHTML(week.weekLabel)}</div>
      <div class="week-mini-grid">
        ${week.workouts.map((workout) => `
          <div class="week-mini-card">
            <div class="week-mini-label">${escapeHTML(workout.workoutLabel)}</div>
            <div class="week-mini-sub">${escapeHTML(workout.title)}</div>
            <div class="week-mini-sub">${escapeHTML(workout.goal)}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

// =========================
// LOGOUT
// =========================
function initLogout() {
  const logoutBtn = byId("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
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
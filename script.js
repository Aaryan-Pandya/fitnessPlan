const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

const stepOrder = [
  "dob",
  "parent",
  "goals",
  "days",
  "length",
  "experience",
  "equipment",
  "start",
  "result"
];

const state = {
  dob: "",
  age: 0,
  ageBand: "",
  parentConfirmed: false,
  mainGoals: [],
  daysPerWeek: "",
  sessionLength: "",
  experienceLevel: "",
  equipment: [],
  startDate: ""
};

const refs = {
  errorBox: document.getElementById("errorBox"),
  progressLabel: document.getElementById("progressLabel"),
  progressFill: document.getElementById("progressFill"),
  dobHelper: document.getElementById("dobHelper"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingText: document.getElementById("loadingText"),
  loadingFill: document.getElementById("loadingFill"),
  summaryBox: document.getElementById("summaryBox"),
  planTitle: document.getElementById("planTitle"),
  planSubtitle: document.getElementById("planSubtitle"),
  progressionList: document.getElementById("progressionList"),
  safetyList: document.getElementById("safetyList"),
  scheduleWrap: document.getElementById("scheduleWrap"),
  saveNote: document.getElementById("saveNote"),
  dashboardBtn: document.getElementById("dashboardBtn"),
  resultDashboardBtn: document.getElementById("resultDashboardBtn"),
  loginSaveBox: document.getElementById("loginSaveBox")
};

function showError(message) {
  refs.errorBox.textContent = message;
  refs.errorBox.classList.remove("hidden");
}

function hideError() {
  refs.errorBox.textContent = "";
  refs.errorBox.classList.add("hidden");
}

function showStep(name) {
  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));
  document.getElementById(`step-${name}`).classList.add("active");

  const idx = stepOrder.indexOf(name);
  const shownIndex = idx >= 0 ? idx + 1 : stepOrder.length;
  refs.progressLabel.textContent = name === "result" ? "Plan Ready" : `Question ${shownIndex}`;
  refs.progressFill.style.width = `${(shownIndex / stepOrder.length) * 100}%`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function normalizeDateInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function attachInputHelpers() {
  document.querySelectorAll(".date-input").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = normalizeDateInput(input.value);
    });
  });

  document.querySelectorAll(".enter-next").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const btn = document.getElementById(input.dataset.next);
        if (btn) btn.click();
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const active = document.querySelector(".step.active");
    if (!active) return;
    const target = e.target;
    if (target.tagName === "TEXTAREA") return;
    if (target.closest(".choice-card")) return;
  });
}

function parseStrictDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const d = new Date(`${text}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getAgeData(dobText) {
  const dob = parseStrictDate(dobText);
  const today = new Date();

  if (!dob) return { age: -1, ageBand: "unsupported", countdown: "" };

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  let ageBand = "unsupported";
  if (age >= 9 && age <= 12) ageBand = "9-12";
  else if (age >= 13 && age <= 15) ageBand = "13-15";
  else if (age >= 16 && age <= 17) ageBand = "16-17";
  else if (age >= 18) ageBand = "18";

  let countdown = "";
  if (age < 9) {
    const target = new Date(dob);
    target.setFullYear(dob.getFullYear() + 9);
    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays - (years * 365 + months * 30);
    countdown = `This app currently supports age 9 and up. Come back in about ${years} year(s), ${months} month(s), and ${days} day(s).`;
  }

  return { age, ageBand, countdown };
}

function getSelectedCheckboxValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
}

function getSelectedRadioValue(name) {
  const found = document.querySelector(`input[name="${name}"]:checked`);
  return found ? found.value : "";
}

function wantsRunning() {
  return state.mainGoals.includes("Running") || state.mainGoals.includes("Endurance");
}

function wantsStrength() {
  return state.mainGoals.includes("Strength");
}

function wantsMobility() {
  return state.mainGoals.includes("Flexibility");
}

function getPushName() {
  return state.equipment.includes("Dumbbells") ? "DB floor press" : "Push-up variation";
}

function getOverheadName() {
  return state.equipment.includes("Dumbbells") ? "DB shoulder press" : "Push-up variation";
}

function getPullName() {
  if (state.equipment.includes("Pull-up bar") || state.equipment.includes("Bands")) return "Assisted pull-up";
  if (state.equipment.includes("Dumbbells")) return "One arm DB row";
  return "Backpack row";
}

function getSquatName() {
  return state.equipment.includes("Dumbbells") ? "Goblet squat" : "Bodyweight squat";
}

function getSplitName() {
  return "Split squat";
}

function getHingeName() {
  if (state.equipment.includes("Barbell")) return "Romanian deadlift";
  if (state.equipment.includes("Dumbbells")) return "DB Romanian deadlift";
  return "Glute bridge / hip thrust";
}

function youthCompoundSets() {
  return state.age <= 15 ? 3 : 4;
}

function youthAccessorySets() {
  return 2;
}

function expOffset() {
  if (state.experienceLevel === "Beginner") return -1;
  if (state.experienceLevel === "Advanced") return 1;
  return 0;
}

function scaleSets(base, min = 2, max = 4) {
  return Math.max(min, Math.min(max, base + expOffset()));
}

function createExercise({
  id,
  name,
  sets,
  targetType,
  start,
  max,
  step,
  tempo,
  rest,
  progressionType,
  progressionSummary,
  readyRule,
  maxTestRule,
  loadLabel = "Weight / assistance / note"
}) {
  return {
    id,
    name,
    sets,
    targetType,
    start,
    max,
    step,
    tempo,
    rest,
    progressionType,
    progressionSummary,
    readyRule,
    maxTestRule,
    loadLabel
  };
}

function buildStrengthSessions() {
  const compoundSets = scaleSets(youthCompoundSets());
  const accessorySets = youthAccessorySets();

  const pull = getPullName();
  const push = getPushName();
  const overhead = getOverheadName();
  const squat = getSquatName();
  const split = getSplitName();
  const hinge = getHingeName();

  return {
    A: {
      sessionName: "Strength A",
      warmup: [
        "Easy walk or bike — 3 min",
        "Scap push-ups — 1 x 8",
        "Bodyweight squats — 1 x 8",
        "Easy hang or arm hang — 10 to 20 sec"
      ],
      exercises: [
        createExercise({
          id: "pull_strength",
          name: pull,
          sets: 5,
          targetType: "reps",
          start: 2,
          max: 5,
          step: 1,
          tempo: "2-1-3-1",
          rest: "90 to 120 sec",
          progressionType: "ladder",
          progressionSummary: "Work from 5 x 2 up to 5 x 5. Then reduce assistance by 5 lb next time and restart at 5 x 2.",
          readyRule: "Ready when all 5 sets hit 5 clean reps.",
          maxTestRule: "Retest clean pull-up max after 6 successful pull sessions or 2 assistance drops.",
          loadLabel: "Assistance / load"
        }),
        createExercise({
          id: "push_main",
          name: push,
          sets: compoundSets,
          targetType: "reps",
          start: 4,
          max: 8,
          step: 1,
          tempo: "3-1-2-0",
          rest: "60 to 75 sec",
          progressionType: "double",
          progressionSummary: "Hit the top of the range on all sets clean, then add a little load or use a harder variation and restart low.",
          readyRule: "Ready when all sets hit the top of the range clean.",
          maxTestRule: "Retest max push-ups after 6 successful push sessions.",
          loadLabel: "Load / variation note"
        }),
        createExercise({
          id: "squat_main",
          name: squat,
          sets: compoundSets,
          targetType: "reps",
          start: 6,
          max: 10,
          step: 1,
          tempo: "3-1-2-1",
          rest: "75 sec",
          progressionType: "double",
          progressionSummary: "Hit the top of the range on all sets clean, then add a little load and restart low.",
          readyRule: "Ready when all sets hit the top clean.",
          maxTestRule: "No frequent max testing. Recheck every 6 weeks.",
          loadLabel: "Load note"
        }),
        createExercise({
          id: "plank_main",
          name: "Plank",
          sets: accessorySets,
          targetType: "seconds",
          start: 20,
          max: 60,
          step: 5,
          tempo: "steady",
          rest: "45 sec",
          progressionType: "hold",
          progressionSummary: "Add 5 seconds when the whole week stayed clean.",
          readyRule: "Ready to retest when holds reach about 80% of your old max.",
          maxTestRule: "Retest plank max every 6 to 8 weeks.",
          loadLabel: "Form note"
        })
      ],
      cooldown: [
        "Easy walk — 2 min",
        "Chest stretch — 20 sec each side",
        "Hip flexor stretch — 20 sec each side"
      ]
    },

    B: {
      sessionName: "Strength B",
      warmup: [
        "Easy walk — 3 min",
        "Reverse lunges — 1 x 6 each side",
        "Scap pulls — 1 x 5",
        "Glute bridge — 1 x 10"
      ],
      exercises: [
        createExercise({
          id: "push_main",
          name: push,
          sets: compoundSets,
          targetType: "reps",
          start: 4,
          max: 8,
          step: 1,
          tempo: "3-1-2-0",
          rest: "60 to 75 sec",
          progressionType: "double",
          progressionSummary: "Add reps first. When all sets hit the top clean, add a little load or harder variation and restart low.",
          readyRule: "Ready when all sets hit the top clean.",
          maxTestRule: "Retest max push-ups after 6 successful push sessions.",
          loadLabel: "Load / variation note"
        }),
        createExercise({
          id: "pull_volume",
          name: pull,
          sets: compoundSets,
          targetType: "reps",
          start: 3,
          max: 6,
          step: 1,
          tempo: "2-1-3-1",
          rest: "75 to 90 sec",
          progressionType: "double",
          progressionSummary: "Build reps at the same difficulty. When all sets hit 6 clean, make the variation harder or reduce assistance.",
          readyRule: "Ready when all sets hit 6 clean.",
          maxTestRule: "Retest pull-up max after 6 successful pull sessions.",
          loadLabel: "Assistance / load"
        }),
        createExercise({
          id: "split_main",
          name: split,
          sets: compoundSets,
          targetType: "reps",
          start: 6,
          max: 10,
          step: 1,
          tempo: "3-1-2-1",
          rest: "75 sec",
          progressionType: "double",
          progressionSummary: "Hit the top of the range on all sets clean, then add a little load and restart low.",
          readyRule: "Ready when all sets hit the top clean.",
          maxTestRule: "No frequent max testing. Recheck every 6 weeks.",
          loadLabel: "Load note"
        }),
        createExercise({
          id: "hinge_support",
          name: hinge,
          sets: accessorySets,
          targetType: "reps",
          start: 8,
          max: 12,
          step: 1,
          tempo: "2-1-2-1",
          rest: "60 to 75 sec",
          progressionType: "double",
          progressionSummary: "Hit the top of the range clean, then add load and restart low.",
          readyRule: "Ready when all sets hit the top clean.",
          maxTestRule: "No frequent max testing.",
          loadLabel: "Load note"
        })
      ],
      cooldown: [
        "Easy walk — 2 min",
        "Hamstring stretch — 20 sec each side",
        "Quad stretch — 20 sec each side"
      ]
    },

    C: {
      sessionName: "Strength C",
      warmup: [
        "Easy walk — 3 min",
        "Scap push-ups — 1 x 8",
        "Bodyweight squats — 1 x 8",
        "Easy glute bridge — 1 x 10"
      ],
      exercises: [
        createExercise({
          id: "pull_strength",
          name: pull,
          sets: 5,
          targetType: "reps",
          start: 2,
          max: 5,
          step: 1,
          tempo: "2-1-3-1",
          rest: "90 to 120 sec",
          progressionType: "ladder",
          progressionSummary: "Work from 5 x 2 up to 5 x 5. Then reduce assistance by 5 lb next time and restart at 5 x 2.",
          readyRule: "Ready when all 5 sets hit 5 clean reps.",
          maxTestRule: "Retest clean pull-up max after 6 successful pull sessions or 2 assistance drops.",
          loadLabel: "Assistance / load"
        }),
        createExercise({
          id: "push_overhead",
          name: overhead,
          sets: compoundSets,
          targetType: "reps",
          start: 6,
          max: 10,
          step: 1,
          tempo: "3-1-2-0",
          rest: "60 to 75 sec",
          progressionType: "double",
          progressionSummary: "Hit the top of the range on all sets clean, then add a little load or harder variation and restart low.",
          readyRule: "Ready when all sets hit the top clean.",
          maxTestRule: "Retest max push variation after 6 successful sessions.",
          loadLabel: "Load / variation note"
        }),
        createExercise({
          id: "hinge_main",
          name: hinge,
          sets: compoundSets,
          targetType: "reps",
          start: 8,
          max: 12,
          step: 1,
          tempo: "2-1-2-1",
          rest: "75 sec",
          progressionType: "double",
          progressionSummary: "Hit the top of the range on all sets clean, then add a little load and restart low.",
          readyRule: "Ready when all sets hit the top clean.",
          maxTestRule: "No frequent max testing.",
          loadLabel: "Load note"
        }),
        createExercise({
          id: "squat_support",
          name: squat,
          sets: accessorySets,
          targetType: "reps",
          start: 8,
          max: 10,
          step: 1,
          tempo: "3-1-2-1",
          rest: "60 sec",
          progressionType: "double",
          progressionSummary: "Hit the top of the range on all sets clean, then add a little load and restart low.",
          readyRule: "Ready when all sets hit the top clean.",
          maxTestRule: "No frequent max testing.",
          loadLabel: "Load note"
        })
      ],
      cooldown: [
        "Easy walk — 2 min",
        "Calf stretch — 20 sec each side",
        "Slow breathing — 30 sec"
      ]
    }
  };
}

function buildHardRunTemplate(variantIndex) {
  if (variantIndex % 2 === 0) {
    return {
      sessionName: "Hard Run",
      warmup: [
        "Easy jog — 8 to 10 min",
        "Leg swings — 10 each side",
        "2 short build-ups"
      ],
      exercises: [
        createExercise({
          id: "tempo_intervals",
          name: "Tempo intervals",
          sets: 3,
          targetType: "minutes",
          start: 5,
          max: 6,
          step: 1,
          tempo: "comfortably hard",
          rest: "2 min easy jog",
          progressionType: "static",
          progressionSummary: "Keep this session controlled. Once it feels consistently smooth, add a rep first, then eventually make the reps longer.",
          readyRule: "Ready when every rep stays controlled and repeatable.",
          maxTestRule: "Retest mile or 5K every 4 hard runs or about every 6 weeks.",
          loadLabel: "Notes"
        })
      ],
      cooldown: [
        "Easy jog or walk — 8 min"
      ]
    };
  }

  return {
    sessionName: "Hard Run",
    warmup: [
      "Easy jog — 8 to 10 min",
      "Leg swings — 10 each side",
      "2 short build-ups"
    ],
    exercises: [
      createExercise({
        id: "hard_repeats",
        name: "Hard repeats",
        sets: 6,
        targetType: "seconds",
        start: 60,
        max: 75,
        step: 15,
        tempo: "strong, repeatable",
        rest: "90 sec easy jog or walk",
        progressionType: "static",
        progressionSummary: "Keep these strong but controlled. Add 1 repeat before making reps longer if needed.",
        readyRule: "Ready when all reps stay strong without falling apart.",
        maxTestRule: "Retest mile or 5K every 4 hard runs or about every 6 weeks.",
        loadLabel: "Notes"
      })
    ],
    cooldown: [
      "Easy jog or walk — 8 min"
    ]
  };
}

function buildEasyRunTemplate() {
  return {
    sessionName: "Easy Run",
    warmup: [
      "Start very easy for the first 5 min"
    ],
    exercises: [
      createExercise({
        id: "easy_run",
        name: "Easy run",
        sets: 1,
        targetType: "minutes",
        start: 25,
        max: 35,
        step: 5,
        tempo: "full conversation",
        rest: "none",
        progressionType: "static",
        progressionSummary: "If the whole run stayed easy for 2 weeks, add 2 to 5 min.",
        readyRule: "Ready when the whole run feels relaxed and smooth.",
        maxTestRule: "No max test here.",
        loadLabel: "Notes"
      })
    ],
    cooldown: [
      "Walk 2 to 3 min"
    ]
  };
}

function buildSupportRunTemplate() {
  return {
    sessionName: "Support Run",
    warmup: [
      "Start easy"
    ],
    exercises: [
      createExercise({
        id: "support_run",
        name: "Easy support run",
        sets: 1,
        targetType: "minutes",
        start: 20,
        max: 30,
        step: 5,
        tempo: "full conversation",
        rest: "none",
        progressionType: "static",
        progressionSummary: "Add a little time only when the whole run stays easy.",
        readyRule: "Ready when the whole run feels easy and smooth.",
        maxTestRule: "No max test here.",
        loadLabel: "Notes"
      })
    ],
    cooldown: [
      "Walk 2 min"
    ]
  };
}

function buildMobilityTemplate() {
  return {
    sessionName: "Mobility",
    warmup: [
      "Easy walk — 2 min",
      "Shoulder rolls — 10"
    ],
    exercises: [
      createExercise({
        id: "mobility_flow",
        name: "Mobility flow",
        sets: 1,
        targetType: "minutes",
        start: 20,
        max: 30,
        step: 5,
        tempo: "slow and controlled",
        rest: "none",
        progressionType: "static",
        progressionSummary: "Add a little time only if everything stays controlled.",
        readyRule: "Ready when positions feel easier and less stiff.",
        maxTestRule: "No max test needed.",
        loadLabel: "Notes"
      })
    ],
    cooldown: [
      "Slow breathing — 30 sec"
    ]
  };
}

function getWeekBlueprint() {
  const days = Number(state.daysPerWeek);
  const blueprint = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    0: null
  };

  if (wantsRunning() && wantsStrength()) {
    if (days === 2) {
      blueprint[6] = "hardRun";
      blueprint[0] = "easyRun";
      return blueprint;
    }
    if (days === 3) {
      blueprint[1] = "A";
      blueprint[6] = "hardRun";
      blueprint[0] = "easyRun";
      return blueprint;
    }
    if (days === 4) {
      blueprint[1] = "A";
      blueprint[3] = "B";
      blueprint[6] = "hardRun";
      blueprint[0] = "easyRun";
      return blueprint;
    }
    if (days === 5) {
      blueprint[1] = "A";
      blueprint[3] = "B";
      blueprint[5] = "C";
      blueprint[6] = "hardRun";
      blueprint[0] = "easyRun";
      return blueprint;
    }
    blueprint[1] = "A";
    blueprint[2] = "supportRun";
    blueprint[3] = "B";
    blueprint[5] = "C";
    blueprint[6] = "hardRun";
    blueprint[0] = "easyRun";
    return blueprint;
  }

  if (wantsStrength()) {
    blueprint[1] = "A";
    blueprint[3] = "B";
    if (days >= 3) blueprint[5] = "C";
    if (days >= 4) blueprint[0] = wantsMobility() ? "mobility" : "A";
    if (days >= 5) blueprint[2] = wantsMobility() ? "mobility" : "B";
    if (days >= 6) blueprint[4] = wantsMobility() ? "mobility" : "C";
    return blueprint;
  }

  if (wantsRunning()) {
    blueprint[6] = "hardRun";
    blueprint[0] = "easyRun";
    if (days >= 3) blueprint[3] = "supportRun";
    if (days >= 4) blueprint[2] = "supportRun";
    if (days >= 5) blueprint[4] = "supportRun";
    if (days >= 6) blueprint[1] = "mobility";
    return blueprint;
  }

  if (wantsMobility()) {
    blueprint[1] = "mobility";
    blueprint[3] = "mobility";
    blueprint[5] = "mobility";
    return blueprint;
  }

  return blueprint;
}

function buildProgressionRules() {
  const rules = [];

  if (wantsStrength()) {
    rules.push("Pull-up progression: work from 5 x 2 up to 5 x 5 clean. Then reduce assistance by 5 lb next time and restart at 5 x 2.");
    rules.push("Push-up and pressing progression: build reps first. Once all sets hit the top clean, add a small load or use a harder variation and restart low.");
    rules.push("Lower body progression: hit the top of the range on all sets clean, then add a small load and restart low.");
  }

  if (wantsRunning()) {
    rules.push("Saturday is the hard run. Sunday is the easy run.");
    rules.push("Easy means full conversation. Tempo means short phrases only. Hard repeats mean strong but repeatable.");
    rules.push("For running, keep rhythm and control. Do not turn every run into a race.");
  }

  rules.push("Quality beats quantity. Clean reps count. Ugly reps do not.");
  return rules;
}

function buildSafetyNotes() {
  const notes = [
    "This plan is youth-appropriate and conservative with injury risk.",
    "Do not grind ugly reps for ego.",
    "If form breaks badly, stop the set there.",
    "If something feels sharp or wrong, stop that exercise."
  ];

  if (state.age < 13) {
    notes.push("A parent or guardian should stay involved.");
  }

  return notes;
}

function formatDate(dateObj) {
  return dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function addDays(dateText, count) {
  const d = new Date(`${dateText}T12:00:00`);
  d.setDate(d.getDate() + count);
  return d;
}

function buildPlanObject() {
  const blueprint = getWeekBlueprint();
  const strength = buildStrengthSessions();
  const schedule = [];
  let hardRunCount = 0;

  for (let i = 0; i < 14; i += 1) {
    const dateObj = addDays(state.startDate, i);
    const weekday = dateObj.getDay();
    const slot = blueprint[weekday];

    let session = null;

    if (slot === "A") session = strength.A;
    if (slot === "B") session = strength.B;
    if (slot === "C") session = strength.C;
    if (slot === "hardRun") {
      session = buildHardRunTemplate(hardRunCount);
      hardRunCount += 1;
    }
    if (slot === "easyRun") session = buildEasyRunTemplate();
    if (slot === "supportRun") session = buildSupportRunTemplate();
    if (slot === "mobility") session = buildMobilityTemplate();

    if (!session) {
      schedule.push({
        date: dateObj.toISOString().slice(0, 10),
        dateLabel: formatDate(dateObj),
        type: "rest",
        title: "Recovery day",
        goal: "Recovery",
        warmup: [],
        exercises: [],
        cooldown: [],
        note: "Keep this day easy so the next training day stays high quality."
      });
      continue;
    }

    schedule.push({
      date: dateObj.toISOString().slice(0, 10),
      dateLabel: formatDate(dateObj),
      type: "workout",
      title: session.sessionName,
      goal: session.sessionName,
      warmup: session.warmup,
      exercises: session.exercises,
      cooldown: session.cooldown,
      note: "Quality beats quantity. Clean reps and controlled effort matter more than ego."
    });
  }

  const summary = [
    `Age: ${state.age}`,
    `Age band: ${state.ageBand}`,
    `Goals: ${state.mainGoals.join(", ")}`,
    `Days per week: ${state.daysPerWeek}`,
    `Session length: ${state.sessionLength} minutes`,
    `Experience level: ${state.experienceLevel}`,
    `Start date: ${state.startDate}`,
    `Equipment: ${state.equipment.join(", ") || "No equipment selected"}`
  ].join("\n");

  return {
    planName: `${state.mainGoals.join(" + ")} Plan`,
    summary,
    progressionRules: buildProgressionRules(),
    safetyNotes: buildSafetyNotes(),
    schedule
  };
}

function renderList(targetId, items) {
  const target = document.getElementById(targetId);
  target.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

function formatExercisePreview(ex) {
  if (ex.targetType === "reps") return `${ex.sets} sets of ${ex.start} to ${ex.max} reps`;
  if (ex.targetType === "seconds") return `${ex.sets} sets of ${ex.start} to ${ex.max} sec`;
  if (ex.targetType === "minutes") return `${ex.sets} set(s) of ${ex.start} to ${ex.max} min`;
  return `${ex.sets} sets`;
}

function renderPlan(plan) {
  refs.planTitle.textContent = plan.planName;
  refs.planSubtitle.textContent = `Starts ${plan.schedule[0]?.dateLabel || state.startDate} and lays out your first 2 weeks by date.`;
  refs.summaryBox.textContent = plan.summary;
  renderList("progressionList", plan.progressionRules);
  renderList("safetyList", plan.safetyNotes);

  refs.scheduleWrap.innerHTML = "";

  plan.schedule.forEach((day) => {
    const card = document.createElement("div");
    card.className = `day-card ${day.type === "rest" ? "rest" : ""}`;

    card.innerHTML = `
      <div class="day-top">
        <div>
          <div class="day-date">${day.dateLabel}</div>
          <div class="helper">${day.title}</div>
        </div>
        <span class="badge ${day.type === "rest" ? "rest" : ""}">${day.goal}</span>
      </div>
    `;

    if (day.warmup.length) {
      const warm = document.createElement("div");
      warm.className = "session-block";
      warm.innerHTML = "<h4>Warm-up</h4>";
      const ul = document.createElement("ul");
      day.warmup.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      warm.appendChild(ul);
      card.appendChild(warm);
    }

    if (day.exercises.length) {
      const block = document.createElement("div");
      block.className = "session-block";
      block.innerHTML = "<h4>Main work</h4>";
      const ul = document.createElement("ul");
      day.exercises.forEach((ex) => {
        const li = document.createElement("li");
        li.textContent = `${ex.name}: ${formatExercisePreview(ex)} | Tempo ${ex.tempo} | Rest ${ex.rest}`;
        ul.appendChild(li);
      });
      block.appendChild(ul);
      card.appendChild(block);
    }

    if (day.cooldown.length) {
      const cool = document.createElement("div");
      cool.className = "session-block";
      cool.innerHTML = "<h4>Cooldown</h4>";
      const ul = document.createElement("ul");
      day.cooldown.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      cool.appendChild(ul);
      card.appendChild(cool);
    }

    const note = document.createElement("div");
    note.className = "helper";
    note.textContent = day.note;
    card.appendChild(note);

    refs.scheduleWrap.appendChild(card);
  });
}

async function savePlan(plan) {
  const token = localStorage.getItem("fitnessplan_token");
  refs.saveNote.className = "save-note";
  refs.loginSaveBox.classList.add("hidden");
  refs.resultDashboardBtn.classList.add("hidden");

  localStorage.setItem("fitnessplan_pending_plan", JSON.stringify({
    planName: plan.planName,
    startDate: state.startDate,
    plan
  }));
  localStorage.setItem("fitnessplan_latest_plan", JSON.stringify(plan));

  if (!token) {
    refs.saveNote.textContent = "Plan saved locally. Log in if you want it tied to your account too.";
    refs.resultDashboardBtn.classList.remove("hidden");
    refs.loginSaveBox.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch(`${API}/save-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        planName: plan.planName,
        startDate: state.startDate,
        plan
      })
    });

    const data = await res.json();

    if (data.ok) {
      refs.saveNote.textContent = "Plan saved. Open Dashboard to track it.";
      refs.saveNote.classList.add("ok");
      refs.resultDashboardBtn.classList.remove("hidden");
      localStorage.removeItem("fitnessplan_pending_plan");
    } else {
      refs.saveNote.textContent = "Plan saved locally. Account save did not finish, but Dashboard will still work in local preview.";
      refs.saveNote.classList.add("ok");
      refs.resultDashboardBtn.classList.remove("hidden");
      refs.loginSaveBox.classList.remove("hidden");
    }
  } catch {
    refs.saveNote.textContent = "Plan saved locally. Dashboard will still work in local preview.";
    refs.saveNote.classList.add("ok");
    refs.resultDashboardBtn.classList.remove("hidden");
    refs.loginSaveBox.classList.remove("hidden");
  }
}

function showLoadingSequence(callback) {
  refs.loadingOverlay.classList.remove("hidden");

  const stages = [
    { text: "Reading inputs...", pct: 20 },
    { text: "Building weekly structure...", pct: 50 },
    { text: "Writing workouts...", pct: 80 },
    { text: "Finishing plan...", pct: 100 }
  ];

  let i = 0;
  refs.loadingFill.style.width = "0%";
  refs.loadingText.textContent = stages[0].text;

  const timer = setInterval(() => {
    refs.loadingText.textContent = stages[i].text;
    refs.loadingFill.style.width = `${stages[i].pct}%`;
    i += 1;

    if (i >= stages.length) {
      clearInterval(timer);
      setTimeout(() => {
        refs.loadingOverlay.classList.add("hidden");
        callback();
      }, 180);
    }
  }, 200);
}

function updateAccountButtons() {
  const token = localStorage.getItem("fitnessplan_token");
  refs.dashboardBtn.classList.toggle("hidden", !token && !localStorage.getItem("fitnessplan_latest_plan"));
}

document.getElementById("dobNext").addEventListener("click", () => {
  hideError();
  state.dob = document.getElementById("dobInput").value.trim();

  if (!state.dob) {
    showError("Enter your date of birth in YYYY-MM-DD.");
    return;
  }

  const info = getAgeData(state.dob);

  if (info.age < 9) {
    refs.dobHelper.textContent = info.countdown;
    showError(info.countdown);
    return;
  }

  if (!parseStrictDate(state.dob)) {
    showError("Use the date format YYYY-MM-DD.");
    return;
  }

  state.age = info.age;
  state.ageBand = info.ageBand;
  refs.dobHelper.textContent = `Age ${info.age}. Age band ${info.ageBand}.`;

  if (state.age < 13) showStep("parent");
  else showStep("goals");
});

document.getElementById("parentBack").addEventListener("click", () => showStep("dob"));

document.getElementById("parentNext").addEventListener("click", () => {
  hideError();
  if (!document.getElementById("parentConfirm").checked) {
    showError("Parent or guardian confirmation is required.");
    return;
  }
  state.parentConfirmed = true;
  showStep("goals");
});

document.getElementById("goalsBack").addEventListener("click", () => showStep(state.age < 13 ? "parent" : "dob"));

document.getElementById("goalsNext").addEventListener("click", () => {
  hideError();
  state.mainGoals = getSelectedCheckboxValues("mainGoal");
  if (!state.mainGoals.length) {
    showError("Choose at least one main goal.");
    return;
  }
  showStep("days");
});

document.getElementById("daysBack").addEventListener("click", () => showStep("goals"));

document.getElementById("daysNext").addEventListener("click", () => {
  hideError();
  state.daysPerWeek = document.getElementById("daysSelect").value;
  if (!state.daysPerWeek) {
    showError("Choose days per week.");
    return;
  }
  showStep("length");
});

document.getElementById("lengthBack").addEventListener("click", () => showStep("days"));

document.getElementById("lengthNext").addEventListener("click", () => {
  hideError();
  state.sessionLength = getSelectedRadioValue("sessionLength");
  if (!state.sessionLength) {
    showError("Choose a session length.");
    return;
  }
  showStep("experience");
});

document.getElementById("experienceBack").addEventListener("click", () => showStep("length"));

document.getElementById("experienceNext").addEventListener("click", () => {
  hideError();
  state.experienceLevel = getSelectedRadioValue("experienceLevel");
  if (!state.experienceLevel) {
    showError("Choose an experience level.");
    return;
  }
  showStep("equipment");
});

document.getElementById("equipmentBack").addEventListener("click", () => showStep("experience"));

document.getElementById("equipmentNext").addEventListener("click", () => {
  hideError();
  state.equipment = getSelectedCheckboxValues("equipment");
  showStep("start");
});

document.getElementById("startBack").addEventListener("click", () => showStep("equipment"));

document.getElementById("startNext").addEventListener("click", () => {
  hideError();
  state.startDate = document.getElementById("startDateInput").value.trim();

  if (!state.startDate) {
    showError("Enter a start date in YYYY-MM-DD.");
    return;
  }

  if (!parseStrictDate(state.startDate)) {
    showError("Use the date format YYYY-MM-DD.");
    return;
  }

  showLoadingSequence(async () => {
    const plan = buildPlanObject();
    renderPlan(plan);
    await savePlan(plan);
    showStep("result");
  });
});

document.getElementById("startOverBtn").addEventListener("click", () => {
  location.reload();
});

attachInputHelpers();
updateAccountButtons();
showStep("dob");
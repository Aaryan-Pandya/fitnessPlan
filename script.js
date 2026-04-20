const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

const stepOrder = [
  "dob",
  "parent",
  "goals",
  "focus",
  "days",
  "length",
  "experience",
  "equipment",
  "start",
  "baselines",
  "result"
];

const focusOptions = {
  Cardio: ["Running speed", "Swim speed", "Cycling speed", "Sport conditioning"],
  Strength: ["Upper body strength", "Lower body strength", "Core strength", "Full body strength", "Power"],
  Endurance: ["Stamina", "Longer distance", "Steady pacing", "General stamina"],
  Flexibility: ["Better range of motion", "Less stiffness", "Recovery", "Mobility"]
};

const state = {
  dob: "",
  age: 0,
  ageBand: "",
  parentConfirmed: false,
  mainGoals: [],
  focusAreas: [],
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
  focusWrap: document.getElementById("focusWrap"),
  dobHelper: document.getElementById("dobHelper"),
  pushupVariationWrap: document.getElementById("pushupVariationWrap"),
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
  dashboardBtn: document.getElementById("dashboardBtn")
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
  const index = stepOrder.indexOf(name);
  refs.progressLabel.textContent = `Question ${index + 1}`;
  refs.progressFill.style.width = `${((index + 1) / stepOrder.length) * 100}%`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getSelectedCheckboxValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
}

function getSelectedRadioValue(name) {
  const found = document.querySelector(`input[name="${name}"]:checked`);
  return found ? found.value : "";
}

function toTitleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getAgeData(dobText) {
  const dob = new Date(dobText);
  const today = new Date();

  if (Number.isNaN(dob.getTime())) {
    return { age: -1, ageBand: "unsupported", countdown: "" };
  }

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

function renderFocusAreas() {
  refs.focusWrap.innerHTML = "";
  state.mainGoals.forEach((goal) => {
    const block = document.createElement("div");
    block.className = "baseline-group";

    const title = document.createElement("h3");
    title.textContent = goal;
    block.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "choice-grid";

    focusOptions[goal].forEach((focus) => {
      const label = document.createElement("label");
      label.className = "choice-card";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "focusArea";
      input.value = focus;

      const span = document.createElement("span");
      span.textContent = focus;

      label.appendChild(input);
      label.appendChild(span);
      grid.appendChild(label);
    });

    block.appendChild(grid);
    refs.focusWrap.appendChild(block);
  });
}

function updateDynamicVisibility() {
  const focuses = state.focusAreas;

  const showRun = focuses.includes("Running speed") || focuses.includes("Sport conditioning");
  const showSwim = focuses.includes("Swim speed");
  const showUpper = focuses.includes("Upper body strength") || focuses.includes("Full body strength");
  const showLower = focuses.includes("Lower body strength") || focuses.includes("Full body strength") || focuses.includes("Power");
  const showCore = focuses.includes("Core strength") || focuses.includes("Full body strength");
  const showEndurance = state.mainGoals.includes("Endurance");
  const showFlexibility = state.mainGoals.includes("Flexibility");

  document.getElementById("baseline-run").classList.toggle("hidden", !showRun);
  document.getElementById("baseline-swim").classList.toggle("hidden", !showSwim);
  document.getElementById("baseline-upper").classList.toggle("hidden", !showUpper);
  document.getElementById("baseline-lower").classList.toggle("hidden", !showLower);
  document.getElementById("baseline-core").classList.toggle("hidden", !showCore);
  document.getElementById("baseline-endurance").classList.toggle("hidden", !showEndurance);
  document.getElementById("baseline-flexibility").classList.toggle("hidden", !showFlexibility);
}

function parseTimeToSeconds(text) {
  const trimmed = String(text || "").trim();
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(trimmed);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function avg(values) {
  if (!values.length) return 1;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function bandLowerBetter(value, thresholds) {
  if (value >= thresholds[0]) return 1;
  if (value >= thresholds[1]) return 2;
  if (value >= thresholds[2]) return 3;
  if (value >= thresholds[3]) return 4;
  return 5;
}

function bandHigherBetter(value, thresholds) {
  if (value <= thresholds[0]) return 1;
  if (value <= thresholds[1]) return 2;
  if (value <= thresholds[2]) return 3;
  if (value <= thresholds[3]) return 4;
  return 5;
}

function collectBands() {
  const bands = {};

  const mile = parseTimeToSeconds(document.getElementById("mileTime").value);
  const run400 = parseTimeToSeconds(document.getElementById("run400Time").value);
  const swim100 = parseTimeToSeconds(document.getElementById("swim100Time").value);

  const runBands = [];
  if (!Number.isNaN(mile)) runBands.push(bandLowerBetter(mile, [570, 480, 405, 330]));
  if (!Number.isNaN(run400)) runBands.push(bandLowerBetter(run400, [120, 90, 70, 55]));
  bands.run = avg(runBands);

  const swimBands = [];
  if (!Number.isNaN(swim100)) swimBands.push(bandLowerBetter(swim100, [150, 120, 95, 75]));
  bands.swim = avg(swimBands);

  const upperBands = [];
  const pushupAbility = document.getElementById("pushupAbility").value;
  const pushupVariation = document.getElementById("pushupVariation").value;
  const deadHang = Number(document.getElementById("deadHangSeconds").value || 0);
  const pullups = Number(document.getElementById("pullupReps").value || 0);

  if (pushupAbility === "No") {
    upperBands.push(1);
  } else if (pushupAbility === "Yes") {
    const map = { Wall: 1, Incline: 2, Knee: 2, Regular: 4, Decline: 5 };
    if (map[pushupVariation]) upperBands.push(map[pushupVariation]);
  }

  if (deadHang > 0) upperBands.push(bandHigherBetter(deadHang, [5, 15, 30, 45]));
  if (pullups > 0) upperBands.push(bandHigherBetter(pullups, [0, 2, 5, 10]));
  bands.upper = avg(upperBands);

  const lowerBands = [];
  const wallSit = Number(document.getElementById("wallSitSeconds").value || 0);
  const squats = Number(document.getElementById("squatReps").value || 0);
  if (wallSit > 0) lowerBands.push(bandHigherBetter(wallSit, [20, 45, 75, 120]));
  if (squats > 0) lowerBands.push(bandHigherBetter(squats, [10, 20, 35, 50]));
  bands.lower = avg(lowerBands);

  const coreBands = [];
  const plank = Number(document.getElementById("plankSeconds").value || 0);
  if (plank > 0) coreBands.push(bandHigherBetter(plank, [20, 45, 75, 120]));
  bands.core = avg(coreBands);

  const enduranceBands = [];
  const longest = Number(document.getElementById("longestContinuousMinutes").value || 0);
  const weekly = Number(document.getElementById("weeklyCardioMinutes").value || 0);
  if (longest > 0) enduranceBands.push(bandHigherBetter(longest, [10, 20, 35, 50]));
  if (weekly > 0) enduranceBands.push(bandHigherBetter(weekly, [30, 75, 150, 240]));
  bands.endurance = avg(enduranceBands);

  const flexibilityBands = [];
  const toeTouch = document.getElementById("toeTouch").value;
  const deepSquat = document.getElementById("deepSquat").value;
  const stiffness = document.getElementById("stiffness").value;

  if (toeTouch === "No") flexibilityBands.push(1);
  if (toeTouch === "Almost") flexibilityBands.push(3);
  if (toeTouch === "Yes") flexibilityBands.push(5);

  if (deepSquat === "No") flexibilityBands.push(1);
  if (deepSquat === "Somewhat") flexibilityBands.push(3);
  if (deepSquat === "Yes") flexibilityBands.push(5);

  if (stiffness === "High") flexibilityBands.push(1);
  if (stiffness === "Moderate") flexibilityBands.push(3);
  if (stiffness === "Low") flexibilityBands.push(5);

  bands.flexibility = avg(flexibilityBands);

  return bands;
}

function validateBaselines() {
  const focuses = state.focusAreas;
  const showRun = focuses.includes("Running speed") || focuses.includes("Sport conditioning");
  const showSwim = focuses.includes("Swim speed");
  const showUpper = focuses.includes("Upper body strength") || focuses.includes("Full body strength");
  const showLower = focuses.includes("Lower body strength") || focuses.includes("Full body strength") || focuses.includes("Power");
  const showCore = focuses.includes("Core strength") || focuses.includes("Full body strength");
  const showEndurance = state.mainGoals.includes("Endurance");
  const showFlexibility = state.mainGoals.includes("Flexibility");

  if (showRun) {
    if (Number.isNaN(parseTimeToSeconds(document.getElementById("mileTime").value))) {
      return "Enter mile time in mm:ss.";
    }
    if (Number.isNaN(parseTimeToSeconds(document.getElementById("run400Time").value))) {
      return "Enter 400m time in mm:ss.";
    }
  }

  if (showSwim && Number.isNaN(parseTimeToSeconds(document.getElementById("swim100Time").value))) {
    return "Enter 100m swim time in mm:ss.";
  }

  if (showUpper) {
    const ability = document.getElementById("pushupAbility").value;
    if (!ability) return "Choose whether you can do a push-up.";
    if (ability === "Yes" && !document.getElementById("pushupVariation").value) {
      return "Choose your hardest clean push-up variation.";
    }
  }

  if (showLower) {
    if (!document.getElementById("wallSitSeconds").value) return "Enter wall sit seconds.";
    if (!document.getElementById("squatReps").value) return "Enter squat reps.";
  }

  if (showCore && !document.getElementById("plankSeconds").value) {
    return "Enter plank hold in seconds.";
  }

  if (showEndurance && !document.getElementById("longestContinuousMinutes").value) {
    return "Enter your longest continuous cardio session in minutes.";
  }

  if (showFlexibility && !document.getElementById("toeTouch").value) {
    return "Choose whether you can touch your toes.";
  }

  return "";
}

function sessionScale(base, expOffset = 0, min = 2, max = 6) {
  return Math.max(min, Math.min(max, base + expOffset));
}

function expOffset() {
  if (state.experienceLevel === "Beginner") return -1;
  if (state.experienceLevel === "Advanced") return 1;
  return 0;
}

function getPushVariationText() {
  const ability = document.getElementById("pushupAbility").value;
  const variation = document.getElementById("pushupVariation").value;
  if (ability === "No") return "hands-elevated incline push-up or wall push-up";
  if (!variation) return "push-up variation";
  if (variation === "Wall") return "wall push-up";
  if (variation === "Incline") return "incline push-up";
  if (variation === "Knee") return "knee push-up";
  if (variation === "Regular") return "regular push-up";
  return "decline push-up";
}

function choosePullText() {
  const equipment = state.equipment;
  if (equipment.includes("Pull-up bar")) return "assisted pull-up / dead hang progression";
  if (equipment.includes("Bands")) return "band row";
  if (equipment.includes("Machines")) return "machine row";
  if (equipment.includes("Dumbbells")) return "one-arm dumbbell row";
  return "backpack row or towel row";
}

function buildStrengthTemplates(bands) {
  const focuses = state.focusAreas;
  const includeUpper = focuses.includes("Upper body strength") || focuses.includes("Full body strength");
  const includeLower = focuses.includes("Lower body strength") || focuses.includes("Full body strength") || focuses.includes("Power");
  const includeCore = focuses.includes("Core strength") || focuses.includes("Full body strength");
  const includePower = focuses.includes("Power");

  const upperBand = bands.upper || 2;
  const lowerBand = bands.lower || 2;
  const coreBand = bands.core || 2;

  const setAdj = expOffset();
  const upperSets = sessionScale(3, setAdj);
  const lowerSets = sessionScale(3, setAdj);
  const coreSets = sessionScale(3, 0, 2, 4);

  const upperRepRange = upperBand <= 2 ? "4-6 reps" : upperBand === 3 ? "6-8 reps" : "8-10 reps";
  const lowerRepRange = lowerBand <= 2 ? "6-8 reps" : lowerBand === 3 ? "8-10 reps" : "10-12 reps";
  const plankHold = coreBand <= 2 ? "20-30 sec" : coreBand === 3 ? "35-45 sec" : "50-70 sec";

  const squatText = state.equipment.includes("Dumbbells") ? "goblet squat" : "bodyweight squat";
  const splitText = state.equipment.includes("Bench/Box") ? "step-up or split squat" : "split squat";
  const hingeText = state.equipment.includes("Barbell") ? "Romanian deadlift" : state.equipment.includes("Dumbbells") ? "dumbbell Romanian deadlift" : "glute bridge / hip thrust";

  const templateA = {
    goal: "Strength",
    name: "Strength A",
    warmup: [
      "Dead hang or arm hang — 10-20 sec",
      "Scap pull-ups or band pulls — 1x5",
      "Scap push-ups — 1x8",
      "Bodyweight squats — 1x8",
      "Easy glute bridge — 1x10"
    ],
    mainWork: [],
    cooldown: [
      "Easy walk — 2 min",
      "Chest stretch — 20 sec each side",
      "Hip flexor stretch — 20 sec each side",
      "Slow breathing — 30 sec"
    ]
  };

  if (includeUpper) {
    templateA.mainWork.push(
      `${choosePullText()} — ${upperSets} sets of ${upperRepRange}. Rest 90 sec.`,
      `${getPushVariationText()} — ${upperSets + 1} sets of ${upperRepRange}. Rest 60-75 sec.`,
      `${state.equipment.includes("Dumbbells") ? "dumbbell shoulder press" : "pike press / shoulder press variation"} — ${upperSets} sets of ${upperRepRange}. Rest 75 sec.`
    );
  }

  if (includeLower) {
    templateA.mainWork.push(
      `${squatText} — ${lowerSets} sets of ${lowerRepRange}. Rest 75 sec.`,
      `${hingeText} — ${lowerSets} sets of 10-15 reps. Rest 75 sec.`
    );
  }

  if (includeCore) {
    templateA.mainWork.push(
      `Plank — ${coreSets} sets of ${plankHold}. Rest 45 sec.`,
      `Dead bug — ${coreSets} sets of 6-10 reps each side. Rest 30 sec.`
    );
  }

  if (includePower) {
    templateA.mainWork.push(
      `Low-volume jump or fast step-up — 3 sets of 4-6 reps. Rest 75 sec.`
    );
  }

  const templateB = {
    goal: "Strength",
    name: "Strength B",
    warmup: [
      "Easy march or walk — 2 min",
      "Scap push-ups — 1x8",
      "Reverse lunges — 1x6 each side",
      "Glute bridge — 1x10",
      "Light plank — 20 sec"
    ],
    mainWork: [],
    cooldown: [
      "Easy walk — 2 min",
      "Hamstring stretch — 20 sec each side",
      "Quad stretch — 20 sec each side",
      "Slow breathing — 30 sec"
    ]
  };

  if (includeUpper) {
    templateB.mainWork.push(
      `${choosePullText()} — ${upperSets} sets of ${upperRepRange}. Rest 90 sec.`,
      `${getPushVariationText()} — ${upperSets} sets of ${upperRepRange}. Rest 60-75 sec.`,
      `${state.equipment.includes("Bands") ? "band face pull" : "reverse fly / rear-delt raise"} — 2-3 sets of 10-15 reps. Rest 60 sec.`
    );
  }

  if (includeLower) {
    templateB.mainWork.push(
      `${splitText} — ${lowerSets} sets of ${lowerRepRange}. Rest 75 sec.`,
      `Wall sit — 3 sets of ${lowerBand <= 2 ? "20-30 sec" : lowerBand === 3 ? "35-45 sec" : "50-70 sec"}. Rest 45 sec.`,
      `Calf raise — 2-3 sets of 12-20 reps. Rest 45 sec.`
    );
  }

  if (includeCore) {
    templateB.mainWork.push(
      `Side plank — ${coreSets} sets of ${coreBand <= 2 ? "15-20 sec" : coreBand === 3 ? "25-35 sec" : "35-45 sec"} each side. Rest 30 sec.`,
      `Bird dog — ${coreSets} sets of 6-10 reps each side. Rest 30 sec.`
    );
  }

  return [templateA, templateB];
}

function buildCardioTemplates(bands) {
  const runBand = bands.run || 2;
  const swimBand = bands.swim || 2;
  const includeRun = state.focusAreas.includes("Running speed") || state.focusAreas.includes("Sport conditioning");
  const includeSwim = state.focusAreas.includes("Swim speed");
  const includeCycle = state.focusAreas.includes("Cycling speed");
  const intervalSecs = runBand <= 2 ? 20 : runBand === 3 ? 25 : 30;
  const intervalSets = state.sessionLength === "30" ? 6 : state.sessionLength === "60" ? 8 : 10;
  const steadyMinutes = state.sessionLength === "30" ? 8 : state.sessionLength === "60" ? 12 : 16;

  const templateA = {
    goal: "Cardio",
    name: "Cardio Speed",
    warmup: [
      "Easy walk or jog — 3 min",
      "Leg swings — 10 each side",
      "High knees — 2x15 sec",
      "2 build-up runs / efforts"
    ],
    mainWork: [],
    cooldown: [
      "Easy walk — 3 min",
      "Calf stretch — 20 sec each side",
      "Hamstring stretch — 20 sec each side"
    ]
  };

  if (includeRun) {
    templateA.mainWork.push(
      `Fast intervals — ${intervalSets} sets of ${intervalSecs} sec hard / ${runBand >= 4 ? 50 : 60} sec easy.`,
      `Strides — 4 sets of 15 sec smooth fast running. Rest 45 sec.`,
      `Easy aerobic finish — ${steadyMinutes} min relaxed pace.`,
      `Plank finisher — 2 sets of 20-40 sec.`
    );
  }

  if (includeSwim) {
    templateA.mainWork.push(
      `Strong swim efforts — ${Math.max(4, intervalSets - 2)} sets of ${swimBand <= 2 ? "20" : "25"} sec with easy swim rest.`,
      `Easy swim flush — 6-10 min.`
    );
  }

  if (includeCycle) {
    templateA.mainWork.push(
      `Bike surges — ${intervalSets} sets of ${intervalSecs} sec strong / 60 sec easy.`,
      `Steady ride block — ${steadyMinutes} min smooth pace.`
    );
  }

  const templateB = {
    goal: "Cardio",
    name: "Cardio Mixed",
    warmup: [
      "Easy walk or jog — 3 min",
      "Ankle hops — 2x10",
      "Dynamic lunges — 1x6 each side"
    ],
    mainWork: [
      `Tempo block — 2-3 sets of ${state.sessionLength === "30" ? "3" : "4"} min strong but controlled. Rest 2 min easy.`,
      `Change-of-direction efforts — 4-6 sets of 15 sec. Rest 45 sec.`,
      `Easy aerobic finish — ${steadyMinutes} min.`
    ],
    cooldown: [
      "Easy walk — 3 min",
      "Quad stretch — 20 sec each side",
      "Slow breathing — 30 sec"
    ]
  };

  return [templateA, templateB];
}

function buildEnduranceTemplates(bands) {
  const band = bands.endurance || 2;
  const blockMinutes = band <= 2 ? 8 : band === 3 ? 10 : 12;
  const blocks = state.sessionLength === "30" ? 2 : state.sessionLength === "60" ? 3 : 4;

  const templateA = {
    goal: "Endurance",
    name: "Endurance Steady",
    warmup: [
      "Easy walk or easy spin — 3 min",
      "Dynamic leg swing — 10 each side",
      "2 short relaxed pickups"
    ],
    mainWork: [
      `Steady blocks — ${blocks} blocks of ${blockMinutes} min. Rest 1 min easy.`,
      `Controlled pickups — 3 sets of 20 sec a little faster. Rest 60 sec.`,
      `Easy flush — 5-10 min relaxed pace.`,
      `Core reset — dead bug 2x8 each side.`
    ],
    cooldown: [
      "Easy walk — 3 min",
      "Calf stretch — 20 sec each side",
      "Hamstring stretch — 20 sec each side"
    ]
  };

  const templateB = {
    goal: "Endurance",
    name: "Endurance Mixed",
    warmup: [
      "Easy walk or jog — 3 min",
      "Dynamic lunge — 1x6 each side",
      "2 short relaxed pickups"
    ],
    mainWork: [
      `Long steady piece — ${blockMinutes * blocks} min at conversational pace.`,
      `Pace control — 2 sets of 3 min slightly faster, still controlled. Rest 90 sec easy.`,
      `Mobility finish — 2 rounds of ankle + hip mobility.`
    ],
    cooldown: [
      "Easy walk — 3 min",
      "Hip flexor stretch — 20 sec each side",
      "Slow breathing — 30 sec"
    ]
  };

  return [templateA, templateB];
}

function buildFlexibilityTemplates(bands) {
  const band = bands.flexibility || 2;
  const hold = band <= 2 ? "20 sec" : band === 3 ? "25 sec" : "30-35 sec";
  const rounds = state.sessionLength === "30" ? 2 : state.sessionLength === "60" ? 3 : 4;

  return [{
    goal: "Flexibility",
    name: "Mobility Flow",
    warmup: [
      "Easy walk — 2 min",
      "Shoulder rolls — 10",
      "Cat-cow — 6 reps"
    ],
    mainWork: [
      `Hamstring reach — ${rounds} rounds of ${hold}.`,
      `Hip flexor stretch — ${rounds} rounds of ${hold} each side.`,
      `Deep squat hold or supported squat hold — ${rounds} rounds of ${hold}.`,
      `Thoracic rotation — ${rounds} rounds of 6 reps each side.`,
      `Calf stretch — ${rounds} rounds of ${hold} each side.`
    ],
    cooldown: [
      "Child's pose — 20-30 sec",
      "Slow breathing — 30 sec"
    ]
  }];
}

function buildTemplates(bands) {
  const templates = [];

  state.mainGoals.forEach((goal) => {
    if (goal === "Strength") templates.push(...buildStrengthTemplates(bands));
    if (goal === "Cardio") templates.push(...buildCardioTemplates(bands));
    if (goal === "Endurance") templates.push(...buildEnduranceTemplates(bands));
    if (goal === "Flexibility") templates.push(...buildFlexibilityTemplates(bands));
  });

  return templates;
}

function buildWeekPattern(days) {
  const value = Number(days);
  if (value === 2) return [1, 0, 0, 1, 0, 0, 0];
  if (value === 3) return [1, 0, 1, 0, 1, 0, 0];
  if (value === 4) return [1, 0, 1, 0, 1, 0, 1];
  if (value === 5) return [1, 1, 0, 1, 1, 0, 1];
  return [1, 1, 1, 1, 1, 0, 1];
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

function buildProgressionRules() {
  const rules = [
    "If you complete all sets clean for 2 sessions in a row, add 1 rep per set or use a slightly harder variation.",
    "For cardio, first add 1 interval, then add 5 seconds to the hard work, then trim rest slightly if still comfortable.",
    "For endurance, add 2-5 total minutes before making the pace harder.",
    "Only change one variable at a time."
  ];

  if (state.mainGoals.includes("Flexibility")) {
    rules.push("For mobility and flexibility, add 5 seconds to a hold only when the current hold is easy and controlled.");
  }

  return rules;
}

function buildSafetyNotes() {
  const notes = [
    "Stop if something feels sharp, painful, or wrong.",
    "Keep form clean and controlled.",
    "Take water and rest breaks.",
    "Do not turn recovery days into extra hard training days."
  ];

  if (state.age < 13) {
    notes.push("A parent or guardian should stay involved.");
  }

  return notes;
}

function buildPlanObject() {
  const bands = collectBands();
  const templates = buildTemplates(bands);
  const pattern = buildWeekPattern(state.daysPerWeek);
  const schedule = [];
  let workoutIndex = 0;

  for (let i = 0; i < 14; i += 1) {
    const dateObj = addDays(state.startDate, i);
    const shouldTrain = pattern[i % 7] === 1;

    if (!shouldTrain) {
      schedule.push({
        date: dateObj.toISOString().slice(0, 10),
        dateLabel: formatDate(dateObj),
        type: "rest",
        title: "Recovery day",
        goal: "Recovery",
        warmup: [],
        mainWork: [
          "Easy walk, easy ride, or easy swim — 15-20 min optional.",
          "Light mobility — 5-10 min optional."
        ],
        cooldown: [],
        note: "Keep this day easy so the next session is better."
      });
      continue;
    }

    const template = templates[workoutIndex % templates.length];
    workoutIndex += 1;

    schedule.push({
      date: dateObj.toISOString().slice(0, 10),
      dateLabel: formatDate(dateObj),
      type: "workout",
      title: template.name,
      goal: template.goal,
      warmup: template.warmup,
      mainWork: template.mainWork,
      cooldown: template.cooldown,
      note: "Focus on clean reps and steady pacing."
    });
  }

  return {
    planName: `${state.mainGoals.join(" + ")} Plan`,
    summary: [
      `Age: ${state.age}`,
      `Age band: ${state.ageBand}`,
      `Goals: ${state.mainGoals.join(", ")}`,
      `Focus areas: ${state.focusAreas.join(", ") || "None selected"}`,
      `Days per week: ${state.daysPerWeek}`,
      `Session length: ${state.sessionLength} minutes`,
      `Experience level: ${state.experienceLevel}`,
      `Start date: ${state.startDate}`,
      `Equipment: ${state.equipment.join(", ") || "No equipment selected"}`
    ].join("\n"),
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

    const top = document.createElement("div");
    top.className = "day-top";
    top.innerHTML = `
      <div>
        <div class="day-date">${day.dateLabel}</div>
        <div class="helper">${day.title}</div>
      </div>
      <span class="badge ${day.type === "rest" ? "rest" : ""}">${day.goal}</span>
    `;
    card.appendChild(top);

    if (day.warmup.length) {
      const block = document.createElement("div");
      block.className = "session-block";
      block.innerHTML = "<h4>Warm-up</h4>";
      const ul = document.createElement("ul");
      day.warmup.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      block.appendChild(ul);
      card.appendChild(block);
    }

    const mainBlock = document.createElement("div");
    mainBlock.className = "session-block";
    mainBlock.innerHTML = "<h4>Main work</h4>";
    const mainUl = document.createElement("ul");
    day.mainWork.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      mainUl.appendChild(li);
    });
    mainBlock.appendChild(mainUl);
    card.appendChild(mainBlock);

    if (day.cooldown.length) {
      const block = document.createElement("div");
      block.className = "session-block";
      block.innerHTML = "<h4>Cooldown</h4>";
      const ul = document.createElement("ul");
      day.cooldown.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      block.appendChild(ul);
      card.appendChild(block);
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
  if (!token) {
    refs.saveNote.textContent = "Not signed in. Your plan is shown here, but it was not saved. Use Account to sign in, then generate again to save it.";
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
      refs.saveNote.textContent = "Plan saved to your account. Open Dashboard to view it anytime.";
      refs.saveNote.classList.add("ok");
    } else {
      refs.saveNote.textContent = data.error || "Plan could not be saved.";
      refs.saveNote.classList.add("bad");
    }
  } catch (error) {
    refs.saveNote.textContent = `Plan save failed.\n${String(error)}`;
    refs.saveNote.classList.add("bad");
  }
}

function showLoadingSequence(callback) {
  refs.loadingOverlay.classList.remove("hidden");
  const stages = [
    { text: "Reading inputs...", pct: 20 },
    { text: "Checking baselines...", pct: 45 },
    { text: "Building workouts...", pct: 72 },
    { text: "Laying out your dates...", pct: 92 },
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
      }, 200);
    }
  }, 220);
}

function updateAccountButtons() {
  const token = localStorage.getItem("fitnessplan_token");
  refs.dashboardBtn.classList.toggle("hidden", !token);
}

document.getElementById("pushupAbility").addEventListener("change", (e) => {
  refs.pushupVariationWrap.classList.toggle("hidden", e.target.value !== "Yes");
});

document.getElementById("dobNext").addEventListener("click", () => {
  hideError();
  state.dob = document.getElementById("dobInput").value;

  if (!state.dob) {
    showError("Enter your date of birth.");
    return;
  }

  const info = getAgeData(state.dob);
  if (info.age < 9) {
    refs.dobHelper.textContent = info.countdown;
    showError(info.countdown);
    return;
  }

  state.age = info.age;
  state.ageBand = info.ageBand;
  refs.dobHelper.textContent = `Age ${info.age}. Age band ${info.ageBand}.`;

  if (state.age < 13) {
    showStep("parent");
  } else {
    showStep("goals");
  }
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
  renderFocusAreas();
  showStep("focus");
});

document.getElementById("focusBack").addEventListener("click", () => showStep("goals"));
document.getElementById("focusNext").addEventListener("click", () => {
  hideError();
  state.focusAreas = getSelectedCheckboxValues("focusArea");
  updateDynamicVisibility();
  showStep("days");
});

document.getElementById("daysBack").addEventListener("click", () => showStep("focus"));
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
  state.startDate = document.getElementById("startDateInput").value;
  if (!state.startDate) {
    showError("Choose a plan start date.");
    return;
  }
  updateDynamicVisibility();
  showStep("baselines");
});

document.getElementById("baselineBack").addEventListener("click", () => showStep("start"));
document.getElementById("generateBtn").addEventListener("click", () => {
  hideError();
  const baselineError = validateBaselines();
  if (baselineError) {
    showError(baselineError);
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

updateAccountButtons();
showStep("dob");
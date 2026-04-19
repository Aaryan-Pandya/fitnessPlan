const MIN_CHILD_AGE = 9;
const UNDER_PARENT_AGE = 13;

const progressLabel = document.getElementById("progressLabel");
const progressFill = document.getElementById("progressFill");
const resultText = document.getElementById("resultText");

const steps = {
  age: document.getElementById("step-age"),
  tooYoung: document.getElementById("step-too-young"),
  parent: document.getElementById("step-parent"),
  categories: document.getElementById("step-categories"),
  baseline: document.getElementById("step-baseline"),
  schedule: document.getElementById("step-schedule"),
  parentReview: document.getElementById("step-parent-review"),
  result: document.getElementById("step-result")
};

const profile = {
  age: "",
  parentConfirmed: false,
  categories: []
};

function showStep(stepName, label, percent) {
  Object.values(steps).forEach((step) => step.classList.remove("active"));
  steps[stepName].classList.add("active");
  progressLabel.textContent = label;
  progressFill.style.width = percent + "%";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (item) => item.value
  );
}

function getSelectedRadio(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : "";
}

function filled(id) {
  const el = document.getElementById(id);
  return el && el.value.trim() !== "";
}

function countFilled(ids) {
  return ids.filter((id) => filled(id)).length;
}

function updateChoiceCards() {
  document.querySelectorAll(".choice-card").forEach((card) => {
    const input = card.querySelector("input");
    if (!input) return;
    card.classList.toggle("selected", input.checked);
  });
}

function hideAllErrors() {
  document.querySelectorAll(".error-box").forEach((box) => {
    box.textContent = "";
    box.classList.add("hidden");
  });
}

function showError(id, message) {
  const box = document.getElementById(id);
  box.textContent = message;
  box.classList.remove("hidden");
}

function toggleBlockByCheckbox(checkboxId, blockId) {
  const checkbox = document.getElementById(checkboxId);
  const block = document.getElementById(blockId);
  if (!checkbox || !block) return;

  function update() {
    block.classList.toggle("hidden", !checkbox.checked);
  }

  checkbox.addEventListener("change", update);
  update();
}

function numericAge(ageValue) {
  return parseInt(ageValue, 10);
}

function isTooYoung(ageValue) {
  return ageValue !== "18+" && numericAge(ageValue) < MIN_CHILD_AGE;
}

function isUnderParentAge(ageValue) {
  return ageValue !== "18+" && numericAge(ageValue) < UNDER_PARENT_AGE;
}

function showSelectedCategoryBlocks() {
  const selected = getCheckedValues("category");
  document.getElementById("baseline-cardio").classList.toggle("hidden", !selected.includes("Cardio"));
  document.getElementById("baseline-strength").classList.toggle("hidden", !selected.includes("Strength"));
  document.getElementById("baseline-endurance").classList.toggle("hidden", !selected.includes("Endurance"));
  document.getElementById("baseline-flexibility").classList.toggle("hidden", !selected.includes("Flexibility"));
}

function getStrengthSuggestions(equipment) {
  const suggestions = new Set();

  if (equipment.includes("Pull-up bar") || equipment.includes("Rings/TRX") || equipment.includes("Bench/Box")) {
    suggestions.add("Calisthenics");
    suggestions.add("Isometrics");
    suggestions.add("Hybrid");
  }

  if (equipment.includes("Bands")) {
    suggestions.add("Bands");
    suggestions.add("Isometrics");
    suggestions.add("Hybrid");
  }

  if (equipment.includes("Barbell") || equipment.includes("Dumbbells") || equipment.includes("Kettlebells")) {
    suggestions.add("Weightlifting");
    suggestions.add("Hybrid");
  }

  if (equipment.includes("Machines")) {
    suggestions.add("Machines");
    suggestions.add("Hybrid");
  }

  return Array.from(suggestions);
}

function updateStrengthSuggestions() {
  const equipment = getCheckedValues("strengthEquipment");
  const suggestions = getStrengthSuggestions(equipment);
  const box = document.getElementById("strengthSuggestions");

  if (suggestions.length === 0) {
    box.innerHTML = "Select equipment to see suggestions.";
  } else {
    box.innerHTML = suggestions
      .map((item) => `<span class="suggestion-chip">${item}</span>`)
      .join("");
  }

  document.querySelectorAll(".strength-style-card").forEach((card) => {
    const style = card.dataset.style;
    card.classList.toggle("recommended", suggestions.includes(style));
  });
}

function requireChecked(name) {
  return getCheckedValues(name).length > 0;
}

function requireText(id) {
  return document.getElementById(id).value.trim() !== "";
}

function requireSelect(id) {
  return document.getElementById(id).value !== "";
}

/* UI setup */
document.querySelectorAll(".choice-card input").forEach((input) => {
  input.addEventListener("change", updateChoiceCards);
});

document.querySelectorAll('input[name="category"]').forEach((input) => {
  input.addEventListener("change", showSelectedCategoryBlocks);
});

document.querySelectorAll('input[name="strengthEquipment"]').forEach((input) => {
  input.addEventListener("change", updateStrengthSuggestions);
});

toggleBlockByCheckbox("activityBackgroundOtherCheck", "activityBackgroundOtherBlock");
toggleBlockByCheckbox("trainingSettingOtherCheck", "trainingSettingOtherBlock");
toggleBlockByCheckbox("cardioFocusOtherCheck", "cardioFocusOtherBlock");
toggleBlockByCheckbox("cardioGoalOtherCheck", "cardioGoalOtherBlock");
toggleBlockByCheckbox("strengthEquipmentOtherCheck", "strengthEquipmentOtherBlock");
toggleBlockByCheckbox("strengthStyleOtherCheck", "strengthStyleOtherBlock");
toggleBlockByCheckbox("strengthGoalOtherCheck", "strengthGoalOtherBlock");
toggleBlockByCheckbox("enduranceFocusOtherCheck", "enduranceFocusOtherBlock");
toggleBlockByCheckbox("enduranceGoalOtherCheck", "enduranceGoalOtherBlock");
toggleBlockByCheckbox("flexFocusOtherCheck", "flexFocusOtherBlock");
toggleBlockByCheckbox("flexGoalOtherCheck", "flexGoalOtherBlock");

/* Step 1 */
document.getElementById("ageNext").addEventListener("click", () => {
  hideAllErrors();
  const ageValue = document.getElementById("age").value;

  if (!ageValue) {
    showError("ageError", "Choose an age to continue.");
    return;
  }

  profile.age = ageValue;
  profile.parentConfirmed = false;

  if (isTooYoung(ageValue)) {
    showStep("tooYoung", "Minimum age requirement", 25);
    return;
  }

  if (isUnderParentAge(ageValue)) {
    showStep("parent", "Parent or guardian confirmation", 25);
    return;
  }

  showStep("categories", "Question 2: Categories", 40);
});

document.getElementById("tooYoungBack").addEventListener("click", () => {
  hideAllErrors();
  showStep("age", "Question 1: Age", 12);
});

/* Step 2 */
document.getElementById("parentConfirm").addEventListener("click", () => {
  hideAllErrors();
  profile.parentConfirmed = true;
  showStep("categories", "Question 2: Categories", 40);
});

document.getElementById("parentBack").addEventListener("click", () => {
  hideAllErrors();
  showStep("age", "Question 1: Age", 12);
});

/* Step 3 */
document.getElementById("categoriesBack").addEventListener("click", () => {
  hideAllErrors();
  if (isUnderParentAge(profile.age)) {
    showStep("parent", "Parent or guardian confirmation", 25);
  } else {
    showStep("age", "Question 1: Age", 12);
  }
});

document.getElementById("categoriesNext").addEventListener("click", () => {
  hideAllErrors();
  const selectedCategories = getCheckedValues("category");

  if (selectedCategories.length === 0) {
    showError("categoriesError", "Choose at least one category.");
    return;
  }

  profile.categories = selectedCategories;
  showSelectedCategoryBlocks();
  showStep("baseline", "Question 3: Baseline", 58);
});

/* Validation */
function validateGeneralBaseline() {
  if (!requireChecked("activityBackground")) return "Choose at least one activity background.";
  if (document.getElementById("activityBackgroundOtherCheck").checked && !requireText("activityBackgroundOther")) {
    return "Fill in the other activity background.";
  }

  if (!requireChecked("trainingSetting")) return "Choose at least one training setting.";
  if (document.getElementById("trainingSettingOtherCheck").checked && !requireText("trainingSettingOther")) {
    return "Fill in the other training setting.";
  }

  if (!requireText("avoidNotes")) return "Complete the notes field or write none.";

  return "";
}

function validateCardio() {
  if (!requireChecked("cardioFocus")) return "Choose at least one cardio focus area.";
  if (document.getElementById("cardioFocusOtherCheck").checked && !requireText("cardioFocusOther")) {
    return "Fill in the other cardio focus.";
  }

  if (!requireChecked("cardioGoal")) return "Choose at least one cardio goal.";
  if (document.getElementById("cardioGoalOtherCheck").checked && !requireText("cardioGoalOther")) {
    return "Fill in the other cardio goal.";
  }

  const cardioBenchmarkCount = countFilled([
    "cardio200m",
    "cardio400m",
    "cardio50swim",
    "cardio100swim",
    "cardioSprintRepeats",
    "cardioFastMinutes"
  ]);

  if (cardioBenchmarkCount < 2) {
    return "Fill in at least 2 cardio benchmark fields.";
  }

  return "";
}

function validateStrength() {
  if (!requireChecked("strengthEquipment")) return "Choose at least one strength equipment option.";
  if (document.getElementById("strengthEquipmentOtherCheck").checked && !requireText("strengthEquipmentOther")) {
    return "Fill in the other strength equipment.";
  }

  if (!requireChecked("strengthStyle")) return "Choose at least one strength style.";
  if (document.getElementById("strengthStyleOtherCheck").checked && !requireText("strengthStyleOther")) {
    return "Fill in the other strength style.";
  }

  if (!requireChecked("strengthGoal")) return "Choose at least one strength goal.";
  if (document.getElementById("strengthGoalOtherCheck").checked && !requireText("strengthGoalOther")) {
    return "Fill in the other strength goal.";
  }

  if (!requireSelect("strengthExperience")) return "Choose strength experience.";

  const strengthBenchmarkCount = countFilled([
    "pushups",
    "pullups",
    "plankSeconds",
    "wallSitSeconds",
    "squatReps",
    "deadHangSeconds"
  ]);

  if (strengthBenchmarkCount < 3) {
    return "Fill in at least 3 strength benchmark fields.";
  }

  return "";
}

function validateEndurance() {
  if (!requireChecked("enduranceFocus")) return "Choose at least one endurance focus area.";
  if (document.getElementById("enduranceFocusOtherCheck").checked && !requireText("enduranceFocusOther")) {
    return "Fill in the other endurance focus.";
  }

  if (!requireChecked("enduranceGoal")) return "Choose at least one endurance goal.";
  if (document.getElementById("enduranceGoalOtherCheck").checked && !requireText("enduranceGoalOther")) {
    return "Fill in the other endurance goal.";
  }

  if (!requireText("enduranceLongestSession")) return "Enter the longest steady session in minutes.";
  if (!requireSelect("enduranceDays")) return "Choose endurance days per week.";
  if (!requireText("enduranceWeeklyMinutes")) return "Enter total steady minutes per week.";
  if (!requireSelect("endurancePacing")) return "Choose pacing consistency.";

  return "";
}

function validateFlexibility() {
  if (!requireChecked("flexFocus")) return "Choose at least one flexibility focus area.";
  if (document.getElementById("flexFocusOtherCheck").checked && !requireText("flexFocusOther")) {
    return "Fill in the other flexibility focus.";
  }

  if (!requireChecked("flexGoal")) return "Choose at least one flexibility goal.";
  if (document.getElementById("flexGoalOtherCheck").checked && !requireText("flexGoalOther")) {
    return "Fill in the other flexibility goal.";
  }

  if (!requireSelect("stiffnessLevel")) return "Choose the stiffness level.";

  const movementChecks = [
    document.getElementById("toeTouch").value,
    document.getElementById("overheadReach").value,
    document.getElementById("deepSquat").value
  ].filter(Boolean).length;

  if (movementChecks < 1) {
    return "Answer at least 1 movement check for flexibility.";
  }

  return "";
}

/* Step 4 */
document.getElementById("baselineBack").addEventListener("click", () => {
  hideAllErrors();
  showStep("categories", "Question 2: Categories", 40);
});

document.getElementById("baselineNext").addEventListener("click", () => {
  hideAllErrors();

  let error = validateGeneralBaseline();
  if (!error && profile.categories.includes("Cardio")) error = validateCardio();
  if (!error && profile.categories.includes("Strength")) error = validateStrength();
  if (!error && profile.categories.includes("Endurance")) error = validateEndurance();
  if (!error && profile.categories.includes("Flexibility")) error = validateFlexibility();

  if (error) {
    showError("baselineError", error);
    return;
  }

  showStep("schedule", "Question 4: Schedule", 74);
});

/* Step 5 */
document.getElementById("scheduleBack").addEventListener("click", () => {
  hideAllErrors();
  showStep("baseline", "Question 3: Baseline", 58);
});

document.getElementById("scheduleNext").addEventListener("click", () => {
  hideAllErrors();

  const availableDays = document.getElementById("availableDays").value;
  const sessionLength = getSelectedRadio("sessionLength");

  if (!availableDays) {
    showError("scheduleError", "Choose available workout days.");
    return;
  }

  if (!sessionLength) {
    showError("scheduleError", "Choose one session length.");
    return;
  }

  if (isUnderParentAge(profile.age)) {
    showStep("parentReview", "Final parent review", 88);
  } else {
    buildAndShowResult();
  }
});

/* Step 6 */
document.getElementById("parentReviewBack").addEventListener("click", () => {
  showStep("schedule", "Question 4: Schedule", 74);
});

document.getElementById("parentReviewNext").addEventListener("click", () => {
  buildAndShowResult();
});

function getIntakePayload() {
  return {
    age_band: profile.age,
    parent_confirmed: isUnderParentAge(profile.age) ? profile.parentConfirmed : true,
    categories: profile.categories,
    available_days: document.getElementById("availableDays").value,
    session_length: getSelectedRadio("sessionLength"),
    activity_background: getCheckedValues("activityBackground"),
    activity_background_other: document.getElementById("activityBackgroundOther").value.trim(),
    training_setting: getCheckedValues("trainingSetting"),
    training_setting_other: document.getElementById("trainingSettingOther").value.trim(),
    avoid_notes: document.getElementById("avoidNotes").value.trim(),

    cardio: profile.categories.includes("Cardio")
      ? {
          focus: getCheckedValues("cardioFocus"),
          focus_other: document.getElementById("cardioFocusOther").value.trim(),
          goals: getCheckedValues("cardioGoal"),
          goal_other: document.getElementById("cardioGoalOther").value.trim(),
          metrics: {
            time_200m: document.getElementById("cardio200m").value.trim(),
            time_400m: document.getElementById("cardio400m").value.trim(),
            swim_50m: document.getElementById("cardio50swim").value.trim(),
            swim_100m: document.getElementById("cardio100swim").value.trim(),
            hard_repeats: document.getElementById("cardioSprintRepeats").value.trim(),
            fast_pace_minutes: document.getElementById("cardioFastMinutes").value.trim()
          },
          notes: document.getElementById("cardioNotes").value.trim()
        }
      : null,

    strength: profile.categories.includes("Strength")
      ? {
          equipment: getCheckedValues("strengthEquipment"),
          equipment_other: document.getElementById("strengthEquipmentOther").value.trim(),
          suggested_styles: getStrengthSuggestions(getCheckedValues("strengthEquipment")),
          styles: getCheckedValues("strengthStyle"),
          styles_other: document.getElementById("strengthStyleOther").value.trim(),
          goals: getCheckedValues("strengthGoal"),
          goal_other: document.getElementById("strengthGoalOther").value.trim(),
          experience: document.getElementById("strengthExperience").value,
          metrics: {
            pushups: document.getElementById("pushups").value.trim(),
            pullups: document.getElementById("pullups").value.trim(),
            plank_seconds: document.getElementById("plankSeconds").value.trim(),
            wall_sit_seconds: document.getElementById("wallSitSeconds").value.trim(),
            squat_reps: document.getElementById("squatReps").value.trim(),
            dead_hang_seconds: document.getElementById("deadHangSeconds").value.trim()
          },
          notes: document.getElementById("strengthNotes").value.trim()
        }
      : null,

    endurance: profile.categories.includes("Endurance")
      ? {
          focus: getCheckedValues("enduranceFocus"),
          focus_other: document.getElementById("enduranceFocusOther").value.trim(),
          goals: getCheckedValues("enduranceGoal"),
          goal_other: document.getElementById("enduranceGoalOther").value.trim(),
          metrics: {
            longest_session_minutes: document.getElementById("enduranceLongestSession").value.trim(),
            days_per_week: document.getElementById("enduranceDays").value,
            weekly_minutes: document.getElementById("enduranceWeeklyMinutes").value.trim(),
            pacing_consistency: document.getElementById("endurancePacing").value
          },
          notes: document.getElementById("enduranceNotes").value.trim()
        }
      : null,

    flexibility: profile.categories.includes("Flexibility")
      ? {
          focus: getCheckedValues("flexFocus"),
          focus_other: document.getElementById("flexFocusOther").value.trim(),
          goals: getCheckedValues("flexGoal"),
          goal_other: document.getElementById("flexGoalOther").value.trim(),
          checks: {
            toe_touch: document.getElementById("toeTouch").value,
            overhead_reach: document.getElementById("overheadReach").value,
            deep_squat: document.getElementById("deepSquat").value,
            stiffness_level: document.getElementById("stiffnessLevel").value
          },
          tight_areas: document.getElementById("flexTightAreas").value.trim()
        }
      : null
  };
}

function buildAndShowResult() {
  const intake = getIntakePayload();
  const parts = [];

  parts.push("FitPlan Intake Summary");
  parts.push("");
  parts.push(`Age: ${intake.age_band}`);
  if (isUnderParentAge(profile.age)) {
    parts.push(`Parent/guardian confirmed: ${profile.parentConfirmed ? "Yes" : "No"}`);
  }
  parts.push(`Selected categories: ${intake.categories.join(", ")}`);
  parts.push(`Available days per week: ${intake.available_days}`);
  parts.push(`Session length: ${intake.session_length}`);
  parts.push("");
  parts.push("This summary is ready for the AI plan step.");

  resultText.textContent = parts.join("\n");
  document.getElementById("aiPlanCard").classList.add("hidden");
  document.getElementById("aiStatus").classList.add("hidden");
  showStep("result", "Intake summary", 100);
}

function renderList(listId, items) {
  const ul = document.getElementById(listId);
  ul.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  });
}

function renderPlan(plan) {
  document.getElementById("aiPlanTitle").textContent = plan.title;
  document.getElementById("aiPlanSummary").textContent = plan.summary;
  renderList("aiWarmup", plan.warm_up);
  renderList("aiCooldown", plan.cool_down);
  renderList("aiSafety", plan.safety_notes);

  const mainBlocks = document.getElementById("aiMainBlocks");
  mainBlocks.innerHTML = "";

  plan.main_blocks.forEach((block) => {
    const wrapper = document.createElement("div");
    wrapper.className = "subcard";

    const h5 = document.createElement("h4");
    h5.textContent = block.name;
    wrapper.appendChild(h5);

    const ul = document.createElement("ul");
    block.exercises.forEach((exercise) => {
      const li = document.createElement("li");
      li.textContent = exercise;
      ul.appendChild(li);
    });

    wrapper.appendChild(ul);
    mainBlocks.appendChild(wrapper);
  });

  document.getElementById("aiPlanCard").classList.remove("hidden");
}

document.getElementById("generatePlanBtn").addEventListener("click", async () => {
  const status = document.getElementById("aiStatus");
  const intake = getIntakePayload();

  status.textContent = "Generating AI plan...";
  status.classList.remove("hidden");

  try {
    const response = await fetch("/api/make-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(intake)
    });

    const data = await response.json();

    if (!response.ok) {
      status.textContent = data.error || "Plan generation failed.";
      return;
    }

    status.textContent = "AI plan generated.";
    renderPlan(data);
  } catch (error) {
    status.textContent = "Could not connect to the AI server.";
  }
});

document.getElementById("startOver").addEventListener("click", () => {
  location.reload();
});

updateChoiceCards();
showSelectedCategoryBlocks();
updateStrengthSuggestions();
showStep("age", "Question 1: Age", 12);
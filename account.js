console.log("ACCOUNT.JS VERSION 10 LOADED");

const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

function setStatus(message, type = "") {
  const statusText = document.getElementById("statusText");

  if (!statusText) {
    console.error("statusText element not found");
    alert(message);
    return;
  }

  statusText.textContent = message;
  statusText.className = "status-line";

  if (type) {
    statusText.classList.add(type);
  }
}

function showOnly(cardId) {
  const homeCard = document.getElementById("homeCard");
  const signupCard = document.getElementById("signupCard");
  const loginCard = document.getElementById("loginCard");

  if (!homeCard || !signupCard || !loginCard) {
    console.error("One or more account cards are missing.");
    setStatus("Page setup error. Account cards are missing.", "bad");
    return;
  }

  homeCard.classList.add("hidden");
  signupCard.classList.add("hidden");
  loginCard.classList.add("hidden");

  document.getElementById(cardId).classList.remove("hidden");
}

function normalizeDateInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function isValidDob(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime());
}

async function apiPost(path, body, token = "") {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log("POST", `${API}${path}`, body);

  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const text = await response.text();
  console.log("Backend response:", response.status, text);

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      ok: false,
      error: text || `Request failed with status ${response.status}`
    };
  }

  return data;
}

async function trySavePendingPlan() {
  const pendingRaw = localStorage.getItem("fitnessplan_pending_plan");
  const token = localStorage.getItem("fitnessplan_token");

  if (!pendingRaw) {
    return;
  }

  try {
    const pending = JSON.parse(pendingRaw);

    if (pending.plan) {
      localStorage.setItem("fitnessplan_latest_plan", JSON.stringify(pending.plan));
    }

    if (!token) {
      return;
    }

    const data = await apiPost(
      "/save-plan",
      {
        planName: pending.planName,
        startDate: pending.startDate,
        plan: pending.plan
      },
      token
    );

    if (data.ok) {
      localStorage.removeItem("fitnessplan_pending_plan");
    }
  } catch (error) {
    console.error("Pending plan save failed:", error);
  }
}

async function finishAuth(data, message) {
  if (!data || !data.ok) {
    setStatus("Auth failed. Server did not return ok:true.", "bad");
    return;
  }

  if (!data.token || !data.user) {
    setStatus("Auth worked, but token or user is missing.", "bad");
    console.error("Bad auth response:", data);
    return;
  }

  localStorage.setItem("fitnessplan_token", data.token);
  localStorage.setItem("fitnessplan_user", JSON.stringify(data.user));

  setStatus(message, "ok");

  await trySavePendingPlan();

  window.location.href = "./dashboard.html";
}

async function handleSignup() {
  console.log("CREATE ACCOUNT CLICKED");

  const signupName = document.getElementById("signupName");
  const signupEmail = document.getElementById("signupEmail");
  const signupPassword = document.getElementById("signupPassword");
  const signupDob = document.getElementById("signupDob");

  if (!signupName || !signupEmail || !signupPassword || !signupDob) {
    setStatus("Signup form fields are missing. Check the input IDs.", "bad");
    console.error({
      signupName,
      signupEmail,
      signupPassword,
      signupDob
    });
    return;
  }

  const displayName = signupName.value.trim();
  const email = signupEmail.value.trim().toLowerCase();
  const password = signupPassword.value;
  const dob = signupDob.value.trim();

  if (!displayName || !email || !password || !dob) {
    setStatus("Please fill out username, email, password, and date of birth.", "bad");
    return;
  }

  if (!isValidDob(dob)) {
    setStatus("Date of birth must be in YYYY-MM-DD format.", "bad");
    return;
  }

  setStatus("Creating account...");

  const signupBtn = document.getElementById("signupBtn");
  if (signupBtn) signupBtn.disabled = true;

  try {
    const data = await apiPost("/signup", {
      displayName,
      email,
      password,
      dob
    });

    if (data.ok) {
      await finishAuth(data, `Account created. Signed in as ${data.user.username}.`);
      return;
    }

    setStatus(data.details || data.error || "Signup failed.", "bad");
  } catch (error) {
    console.error("Signup failed:", error);
    setStatus(`Signup failed: ${error.message}`, "bad");
  } finally {
    if (signupBtn) signupBtn.disabled = false;
  }
}

async function handleLogin() {
  console.log("LOGIN CLICKED");

  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");

  if (!loginEmail || !loginPassword) {
    setStatus("Login form fields are missing. Check the input IDs.", "bad");
    return;
  }

  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;

  if (!email || !password) {
    setStatus("Please enter email and password.", "bad");
    return;
  }

  setStatus("Logging in...");

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.disabled = true;

  try {
    const data = await apiPost("/login", {
      email,
      password
    });

    if (data.ok) {
      await finishAuth(data, `Logged in as ${data.user.username}.`);
      return;
    }

    setStatus(data.details || data.error || "Login failed.", "bad");
  } catch (error) {
    console.error("Login failed:", error);
    setStatus(`Login failed: ${error.message}`, "bad");
  } finally {
    if (loginBtn) loginBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("ACCOUNT DOM READY");

  const signupDob = document.getElementById("signupDob");

  if (signupDob) {
    signupDob.addEventListener("input", (event) => {
      event.target.value = normalizeDateInput(event.target.value);
    });
  }

  const savedUserRaw = localStorage.getItem("fitnessplan_user");

  if (savedUserRaw) {
    try {
      const user = JSON.parse(savedUserRaw);
      setStatus(`Already signed in as ${user.username}.`, "ok");
    } catch {
      setStatus("Not signed in.");
    }
  }
});

document.addEventListener("click", async (event) => {
  const target = event.target;

  if (!target) return;

  if (target.id === "showSignup") {
    console.log("SHOW SIGNUP CLICKED");
    showOnly("signupCard");
    setStatus("Create your account.");
    return;
  }

  if (target.id === "showLogin") {
    console.log("SHOW LOGIN CLICKED");
    showOnly("loginCard");
    setStatus("Log in to your account.");
    return;
  }

  if (target.id === "back1" || target.id === "back2") {
    console.log("BACK CLICKED");
    showOnly("homeCard");
    setStatus("Not signed in.");
    return;
  }

  if (target.id === "signupBtn") {
    event.preventDefault();
    await handleSignup();
    return;
  }

  if (target.id === "loginBtn") {
    event.preventDefault();
    await handleLogin();
  }
});

document.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;

  const signupCard = document.getElementById("signupCard");
  const loginCard = document.getElementById("loginCard");

  const signupOpen = signupCard && !signupCard.classList.contains("hidden");
  const loginOpen = loginCard && !loginCard.classList.contains("hidden");

  if (signupOpen) {
    event.preventDefault();
    await handleSignup();
  }

  if (loginOpen) {
    event.preventDefault();
    await handleLogin();
  }
});
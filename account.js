const API = "https://fitnessplan-backend.cosmowind2013.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
  const homeCard = document.getElementById("homeCard");
  const signupCard = document.getElementById("signupCard");
  const loginCard = document.getElementById("loginCard");
  const statusText = document.getElementById("statusText");

  const showSignupBtn = document.getElementById("showSignup");
  const showLoginBtn = document.getElementById("showLogin");
  const signupBtn = document.getElementById("signupBtn");
  const loginBtn = document.getElementById("loginBtn");
  const back1Btn = document.getElementById("back1");
  const back2Btn = document.getElementById("back2");

  const signupName = document.getElementById("signupName");
  const signupEmail = document.getElementById("signupEmail");
  const signupPassword = document.getElementById("signupPassword");
  const signupDob = document.getElementById("signupDob");

  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");

  console.log("account.js loaded");

  function setStatus(message, type = "") {
    if (!statusText) return;

    statusText.textContent = message;
    statusText.className = "status-line";

    if (type) {
      statusText.classList.add(type);
    }
  }

  function showHome() {
    homeCard.classList.remove("hidden");
    signupCard.classList.add("hidden");
    loginCard.classList.add("hidden");
  }

  function showSignup() {
    homeCard.classList.add("hidden");
    signupCard.classList.remove("hidden");
    loginCard.classList.add("hidden");
    setStatus("Create your account.");
  }

  function showLogin() {
    homeCard.classList.add("hidden");
    signupCard.classList.add("hidden");
    loginCard.classList.remove("hidden");
    setStatus("Log in to your account.");
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

  async function apiRequest(path, body, token = "") {
    const headers = {
      "Content-Type": "application/json"
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        ok: false,
        error: text || `Request failed with status ${response.status}`
      };
    }

    if (!response.ok && data.ok !== true) {
      return {
        ok: false,
        error: data.error || `Request failed with status ${response.status}`,
        details: data.details || ""
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

      const data = await apiRequest(
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
      console.error("Could not save pending plan:", error);
    }
  }

  async function finishAuth(data, message) {
    if (!data.token || !data.user) {
      setStatus("Login worked, but the server did not return a token/user.", "bad");
      return;
    }

    localStorage.setItem("fitnessplan_token", data.token);
    localStorage.setItem("fitnessplan_user", JSON.stringify(data.user));

    setStatus(message, "ok");

    await trySavePendingPlan();

    window.location.href = "./dashboard.html";
  }

  async function handleSignup() {
    console.log("Create Account clicked");

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

    signupBtn.disabled = true;

    try {
      const data = await apiRequest("/signup", {
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
      console.error("Signup error:", error);
      setStatus(`Signup failed: ${error.message}`, "bad");
    } finally {
      signupBtn.disabled = false;
    }
  }

  async function handleLogin() {
    console.log("Login clicked");

    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;

    if (!email || !password) {
      setStatus("Please enter email and password.", "bad");
      return;
    }

    setStatus("Logging in...");

    loginBtn.disabled = true;

    try {
      const data = await apiRequest("/login", {
        email,
        password
      });

      if (data.ok) {
        await finishAuth(data, `Logged in as ${data.user.username}.`);
        return;
      }

      setStatus(data.details || data.error || "Login failed.", "bad");
    } catch (error) {
      console.error("Login error:", error);
      setStatus(`Login failed: ${error.message}`, "bad");
    } finally {
      loginBtn.disabled = false;
    }
  }

  if (showSignupBtn) {
    showSignupBtn.addEventListener("click", showSignup);
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", showLogin);
  }

  if (back1Btn) {
    back1Btn.addEventListener("click", () => {
      showHome();
      setStatus("Not signed in.");
    });
  }

  if (back2Btn) {
    back2Btn.addEventListener("click", () => {
      showHome();
      setStatus("Not signed in.");
    });
  }

  if (signupDob) {
    signupDob.addEventListener("input", (event) => {
      event.target.value = normalizeDateInput(event.target.value);
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", handleSignup);
  } else {
    console.error("signupBtn was not found.");
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", handleLogin);
  } else {
    console.error("loginBtn was not found.");
  }

  [signupName, signupEmail, signupPassword, signupDob].forEach((input) => {
    if (!input) return;

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSignup();
      }
    });
  });

  [loginEmail, loginPassword].forEach((input) => {
    if (!input) return;

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleLogin();
      }
    });
  });

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
// Folu Executive Interior — admin login page

const AUTH_KEY = "folu_admin_auth";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const authToast = document.getElementById("authToast");

// Already signed in this session? Skip straight to the dashboard.
if (sessionStorage.getItem(AUTH_KEY)) {
  window.location.replace("dashboard.html");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = loginForm.username.value;
  const pass = loginForm.password.value;
  const candidate = "Basic " + btoa(`${user}:${pass}`);
  const submitBtn = loginForm.querySelector("button[type=submit]");

  loginError.textContent = "Signing in…";
  submitBtn.disabled = true;

  let res;
  try {
    res = await fetch("/api/consultations", { headers: { Authorization: candidate } });
  } catch (err) {
    loginError.textContent = "Could not reach the server — try again.";
    submitBtn.disabled = false;
    return;
  }

  if (res.status === 401) {
    loginError.textContent = "Incorrect username or password.";
    submitBtn.disabled = false;
    return;
  }
  if (!res.ok) {
    loginError.textContent = "Could not reach the server — try again.";
    submitBtn.disabled = false;
    return;
  }

  sessionStorage.setItem(AUTH_KEY, candidate);
  authToast.classList.add("show");
  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 900);
});

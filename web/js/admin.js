// Folu Executive Interior — admin dashboard

const STATUSES = ["New", "Contacted", "Booked", "Closed"];
const AUTH_KEY = "folu_admin_auth";

let allRecords = [];
let authHeader = sessionStorage.getItem(AUTH_KEY) || null;

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const tableBody = document.getElementById("adminTableBody");
const emptyState = document.getElementById("adminEmpty");
const tableWrap = document.querySelector(".admin-table-wrap");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

function authedFetch(url, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: authHeader };
  return fetch(url, { ...options, headers });
}

function showLogin(message) {
  authHeader = null;
  sessionStorage.removeItem(AUTH_KEY);
  loginView.hidden = false;
  dashboardView.hidden = true;
  logoutBtn.hidden = true;
  loginError.textContent = message || "";
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  logoutBtn.hidden = false;
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function statusClass(status) {
  return "status-" + (status || "New").toLowerCase();
}

function render(records) {
  tableBody.innerHTML = "";

  if (records.length === 0) {
    tableWrap.classList.add("is-empty");
    emptyState.classList.add("show");
    return;
  }
  tableWrap.classList.remove("is-empty");
  emptyState.classList.remove("show");

  records.forEach(rec => {
    const tr = document.createElement("tr");
    if (rec.status === "New") tr.classList.add("is-new");

    tr.innerHTML = `
      <td class="cell-name">${escapeHtml(rec.name)}</td>
      <td class="cell-contact">${escapeHtml(rec.phone || "—")}<br>${escapeHtml(rec.email || "—")}</td>
      <td class="cell-message">${escapeHtml(rec.message || "—")}</td>
      <td class="cell-date">${formatDate(rec.createdAt)}</td>
      <td></td>
      <td><button class="delete-btn" data-id="${rec.id}">Remove</button></td>
    `;

    const statusCell = tr.children[4];
    const select = document.createElement("select");
    select.className = "status-select " + statusClass(rec.status);
    STATUSES.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      if (rec.status === s) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => updateStatus(rec.id, select.value, select));
    statusCell.appendChild(select);

    tr.querySelector(".delete-btn").addEventListener("click", () => removeRecord(rec.id, tr));

    tableBody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updateStats(records) {
  document.getElementById("statTotal").textContent = records.length;
  document.getElementById("statNew").textContent = records.filter(r => r.status === "New").length;
  document.getElementById("statBooked").textContent = records.filter(r => r.status === "Booked").length;
}

async function loadRecords() {
  try {
    const res = await authedFetch("/api/consultations");
    if (res.status === 401) return showLogin("Session expired — please sign in again.");
    if (!res.ok) throw new Error("Failed to load");
    allRecords = await res.json();
    updateStats(allRecords);
    applyFilter();
  } catch (err) {
    tableBody.innerHTML = "";
    emptyState.textContent = "Could not load consultations. Refresh to try again.";
    emptyState.classList.add("show");
  }
}

function applyFilter() {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q
    ? allRecords.filter(r =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q))
    : allRecords;
  render(filtered);
}

async function updateStatus(id, status, selectEl) {
  selectEl.className = "status-select " + statusClass(status);
  const res = await authedFetch(`/api/consultations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (res.status === 401) return showLogin("Session expired — please sign in again.");
  const rec = allRecords.find(r => r.id === id);
  if (rec) rec.status = status;
  updateStats(allRecords);
}

async function removeRecord(id, rowEl) {
  if (!confirm("Remove this consultation request?")) return;
  const res = await authedFetch(`/api/consultations/${id}`, { method: "DELETE" });
  if (res.status === 401) return showLogin("Session expired — please sign in again.");
  allRecords = allRecords.filter(r => r.id !== id);
  updateStats(allRecords);
  applyFilter();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = loginForm.username.value;
  const pass = loginForm.password.value;
  const candidate = "Basic " + btoa(`${user}:${pass}`);

  loginError.textContent = "Signing in…";
  const res = await fetch("/api/consultations", { headers: { Authorization: candidate } });

  if (res.status === 401) {
    loginError.textContent = "Incorrect username or password.";
    return;
  }
  if (!res.ok) {
    loginError.textContent = "Could not reach the server — try again.";
    return;
  }

  authHeader = candidate;
  sessionStorage.setItem(AUTH_KEY, candidate);
  loginForm.reset();
  showDashboard();
  loadRecords();
});

logoutBtn.addEventListener("click", () => showLogin());

refreshBtn.addEventListener("click", loadRecords);
searchInput.addEventListener("input", applyFilter);

if (authHeader) {
  showDashboard();
  loadRecords();
} else {
  showLogin();
}

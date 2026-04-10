const SUPABASE_URL = "https://aavzsvurygojkoxxvssd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_At0pbd5rRAbdWUF6gL0Kgw_O0QPSx0-";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== PASSWORD SYSTEM =====
// Password is SHA-256 hashed and compared against Supabase table:
//   app_config (key TEXT PK, value TEXT)
//   INSERT INTO app_config VALUES ('password_hash', sha256('yourPassword'));
// Default password is "liefde" (sha256 below). Change it in Supabase!
const DEFAULT_PASSWORD_HASH = "9d36e1511c8be2a73e8e33e19a5e9c960c6d64ebcc56ee15d74c6c8e12a0ef30";

let isAuthenticated = false;
let sessionId = null;

function getSessionId() {
  let sid = sessionStorage.getItem("cb_session_id");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("cb_session_id", sid);
  }
  return sid;
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getPasswordHash() {
  try {
    const { data, error } = await supabaseClient
      .from("app_config")
      .select("value")
      .eq("key", "password_hash")
      .single();
    if (!error && data?.value) return data.value;
  } catch (_) {}
  return DEFAULT_PASSWORD_HASH;
}

async function checkPassword(pw) {
  const hash = await sha256(pw);
  const stored = await getPasswordHash();
  return hash === stored;
}

function askPassword(reason) {
  return new Promise((resolve) => {
    const overlay   = document.getElementById("pwModal");
    const input     = document.getElementById("pwInput");
    const label     = document.getElementById("pwLabel");
    const okBtn     = document.getElementById("pwOk");
    const cancelBtn = document.getElementById("pwCancel");
    const err       = document.getElementById("pwError");

    label.innerText = reason || "Voer het wachtwoord in";
    input.value = "";
    err.classList.add("hidden");
    overlay.classList.remove("hidden");
    setTimeout(() => input.focus(), 80);

    async function attempt() {
      const ok = await checkPassword(input.value);
      if (ok) {
        isAuthenticated = true;
        overlay.classList.add("hidden");
        cleanup();
        resolve(true);
      } else {
        err.classList.remove("hidden");
        input.value = "";
        input.focus();
      }
    }

    function cancel() {
      overlay.classList.add("hidden");
      cleanup();
      resolve(false);
    }

    function onKey(e) {
      if (e.key === "Enter") attempt();
      if (e.key === "Escape") cancel();
    }

    function cleanup() {
      okBtn.removeEventListener("click", attempt);
      cancelBtn.removeEventListener("click", cancel);
      input.removeEventListener("keydown", onKey);
    }

    okBtn.addEventListener("click", attempt);
    cancelBtn.addEventListener("click", cancel);
    input.addEventListener("keydown", onKey);
  });
}

async function requireAuth(reason) {
  if (isAuthenticated) return true;
  return await askPassword(reason);
}

// ===== ELEMENT REFS =====
const titleInput       = document.getElementById("title");
const descInput        = document.getElementById("description");
const categoryInput    = document.getElementById("category");
const budgetInput      = document.getElementById("budget");
const locationInput    = document.getElementById("location");
const durationInput    = document.getElementById("duration");
const addBtn           = document.getElementById("addBtn");
const addBtnLabel      = document.getElementById("addBtnLabel");
const cancelBtn        = document.getElementById("cancelBtn");
const addTitleEl       = document.getElementById("addTitle");
const list             = document.getElementById("dateList");
const doneList         = document.getElementById("doneList");
const toast            = document.getElementById("toast");
const ideaCount        = document.getElementById("ideaCount");
const doneCount        = document.getElementById("doneCount");
const searchInput      = document.getElementById("searchInput");
const loadingOverlay   = document.getElementById("loadingOverlay");
const confirmModal     = document.getElementById("confirmModal");
const confirmDeleteBtn = document.getElementById("confirmDelete");
const cancelDeleteBtn  = document.getElementById("cancelDelete");
const favOnlyCheck     = document.getElementById("favOnlyCheck");
const favOnlyIdeas     = document.getElementById("favOnlyIdeas");
const hideDoneCheck    = document.getElementById("hideDoneCheck");
const activeFiltersEl  = document.getElementById("activeFilters");

let editId       = null;
let deleteId     = null;
let allIdeas     = [];
let toastTimeout = null;
let activeTab    = "ideas";

// ===== PREFERENCES (server-side via Supabase) =====
// Required table:
//   CREATE TABLE IF NOT EXISTS user_preferences (
//     session_id TEXT PRIMARY KEY,
//     prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
//     updated_at TIMESTAMPTZ DEFAULT now()
//   );
// Enable RLS with policy: allow all for anon if desired, or leave open.

const PREFS_DEBOUNCE_MS = 600;
let prefsSaveTimer = null;

async function loadPrefs() {
  sessionId = getSessionId();
  try {
    const { data, error } = await supabaseClient
      .from("user_preferences")
      .select("prefs")
      .eq("session_id", sessionId)
      .single();

    if (!error && data?.prefs) {
      applyPrefs(data.prefs);
    }
  } catch (_) {}
}

function applyPrefs(prefs) {
  if (favOnlyCheck  && prefs.favOnlyRandom  != null) favOnlyCheck.checked  = prefs.favOnlyRandom;
  if (hideDoneCheck && prefs.hideDoneIdeas  != null) hideDoneCheck.checked = prefs.hideDoneIdeas;
  if (favOnlyIdeas  && prefs.favOnlyIdeas   != null) favOnlyIdeas.checked  = prefs.favOnlyIdeas;
  const hideDoneRandEl = document.getElementById("hideDoneRandom");
  if (hideDoneRandEl && prefs.hideDoneRandom != null) hideDoneRandEl.checked = prefs.hideDoneRandom;
}

function collectPrefs() {
  const hideDoneRandEl = document.getElementById("hideDoneRandom");
  return {
    favOnlyRandom:  favOnlyCheck  ? favOnlyCheck.checked  : false,
    hideDoneIdeas:  hideDoneCheck ? hideDoneCheck.checked  : false,
    favOnlyIdeas:   favOnlyIdeas  ? favOnlyIdeas.checked   : false,
    hideDoneRandom: hideDoneRandEl ? hideDoneRandEl.checked : true,
  };
}

function schedulePrefsave() {
  clearTimeout(prefsSaveTimer);
  prefsSaveTimer = setTimeout(savePrefs, PREFS_DEBOUNCE_MS);
}

async function savePrefs() {
  if (!sessionId) return;
  const prefs = collectPrefs();
  try {
    await supabaseClient
      .from("user_preferences")
      .upsert({ session_id: sessionId, prefs, updated_at: new Date().toISOString() });
  } catch (_) {}
}

// ===== LOADING =====
function setLoading(on) {
  loadingOverlay.classList.toggle("hidden", !on);
}

// ===== TOAST =====
function showToast(msg) {
  toast.innerText = msg;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2200);
}

// ===== DROPDOWN PORTAL =====
function positionDrop(drop, btn) {
  const r      = btn.getBoundingClientRect();
  const vpW    = window.innerWidth;
  const vpH    = window.innerHeight;
  const gap    = 6;
  const margin = 8;

  drop.style.top     = (r.bottom + gap + window.scrollY) + "px";
  drop.style.left    = (r.left   + window.scrollX) + "px";
  drop.style.right   = "auto";
  drop.style.bottom  = "auto";
  drop.style.minWidth = r.width + "px";

  requestAnimationFrame(() => {
    const dW = drop.offsetWidth;
    const dH = drop.offsetHeight;
    if (r.left + dW > vpW - margin) {
      drop.style.left = (r.right + window.scrollX - dW) + "px";
    }
    if (r.bottom + gap + dH > vpH - margin) {
      drop.style.top = (r.top + window.scrollY - gap - dH) + "px";
    }
  });
}

function closeAllDrops(except) {
  document.querySelectorAll(".multi-select-drop").forEach(d => {
    if (d !== except) d.classList.add("hidden");
  });
}

function toggleDropdown(id) {
  const drop = document.getElementById(id);
  const btn  = drop.dataset.portalBtn
    ? document.querySelector(`[data-portal-for="${id}"]`)
    : drop.closest(".multi-select-wrap")?.querySelector(".multi-select-btn");

  if (drop.parentElement !== document.body) {
    const wrap = drop.closest(".multi-select-wrap");
    wrap.dataset.dropId = id;
    drop.dataset.wrapId = wrap.id || (wrap.id = "wrap-" + id);
    drop.style.position = "absolute";
    drop.style.zIndex   = "99999";
    document.body.appendChild(drop);
  }

  if (!drop.classList.contains("hidden")) {
    drop.classList.add("hidden");
    closeAllDrops(drop);
    return;
  }

  closeAllDrops(drop);

  const triggerBtn = document.querySelector(
    `.multi-select-wrap[data-drop-id="${id}"] .multi-select-btn`
  ) || btn;

  drop.classList.remove("hidden");
  if (triggerBtn) positionDrop(drop, triggerBtn);
}

function repositionOpenDropdowns() {
  document.querySelectorAll(".multi-select-drop:not(.hidden)").forEach(drop => {
    const id  = drop.id;
    const btn = document.querySelector(`.multi-select-wrap[data-drop-id="${id}"] .multi-select-btn`);
    if (btn) positionDrop(drop, btn);
  });
}
window.addEventListener("scroll", repositionOpenDropdowns, { passive: true });
window.addEventListener("resize", repositionOpenDropdowns, { passive: true });

document.addEventListener("click", (e) => {
  if (!e.target.closest(".multi-select-wrap") && !e.target.closest(".multi-select-drop")) {
    document.querySelectorAll(".multi-select-drop").forEach(d => d.classList.add("hidden"));
  }
});

// ===== GET CHECKED VALUES =====
function getChecked(className) {
  return Array.from(document.querySelectorAll(`.${className}:checked`)).map(el => el.value);
}

// ===== UPDATE FILTER LABELS =====
function updateFilterLabel(labelId, values, defaultText) {
  const el = document.getElementById(labelId);
  if (!el) return;
  el.innerText = values.length === 0 ? defaultText : values.join(", ");
}

// ===== WIRE UP MULTI-SELECT CHANGE EVENTS =====
function setupMultiSelectListeners() {
  document.querySelectorAll(".filt-cat, .filt-budget, .filt-loc, .filt-dur").forEach(cb => {
    cb.addEventListener("change", () => {
      const cats    = getChecked("filt-cat");
      const budgets = getChecked("filt-budget");
      const locs    = getChecked("filt-loc");
      const durs    = getChecked("filt-dur");

      updateFilterLabel("filterCatLabel",    cats,    "📂 Categorieën");
      updateFilterLabel("filterBudgetLabel", budgets, "💸 Budget");
      updateFilterLabel("filterLocLabel",    locs,    "📍 Locatie");
      updateFilterLabel("filterDurLabel",    durs,    "⏱️ Tijdsduur");

      ["filterCatDrop","filterBudgetDrop","filterLocDrop","filterDurDrop"].forEach(dropId => {
        const btn = document.querySelector("#" + dropId)?.closest(".multi-select-wrap")?.querySelector(".multi-select-btn");
        if (btn) btn.classList.toggle("has-selection", btn.querySelector("input:checked") !== null);
      });

      applyFilters();
    });
  });

  document.querySelectorAll(".rand-cat, .rand-budget, .rand-loc, .rand-dur").forEach(cb => {
    cb.addEventListener("change", () => {
      const randCats    = getChecked("rand-cat");
      const randBudgets = getChecked("rand-budget");
      const randLocs    = getChecked("rand-loc");
      const randDurs    = getChecked("rand-dur");

      updateFilterLabel("randomFilterCategoryLabel", randCats,    "📂 Alle categorieën");
      updateFilterLabel("randomFilterBudgetLabel",   randBudgets, "💸 Alle budgetten");
      updateFilterLabel("randomFilterLocLabel",      randLocs,    "📍 Alle locaties");
      updateFilterLabel("randomFilterDurLabel",      randDurs,    "⏱️ Alle tijdsduren");

      ["randomFilterCategoryDrop","randomFilterBudgetDrop","randomFilterLocDrop","randomFilterDurDrop"].forEach(dropId => {
        const btn = document.querySelector("#" + dropId)?.closest(".multi-select-wrap")?.querySelector(".multi-select-btn");
        if (btn) btn.classList.toggle("has-selection", btn.querySelector("input:checked") !== null);
      });
    });
  });

  if (hideDoneCheck) hideDoneCheck.addEventListener("change", () => { applyFilters(); schedulePrefsave(); });
  if (favOnlyIdeas)  favOnlyIdeas.addEventListener("change",  () => { applyFilters(); schedulePrefsave(); });
  if (favOnlyCheck)  favOnlyCheck.addEventListener("change",  schedulePrefsave);
  const hideDoneRandEl = document.getElementById("hideDoneRandom");
  if (hideDoneRandEl) hideDoneRandEl.addEventListener("change", schedulePrefsave);
}

// ===== TOGGLE PANELS =====
function setupToggle(toggleId, boxId, chevronId) {
  document.getElementById(toggleId).onclick = async () => {
    if (toggleId === "toggleAdd") {
      const box = document.getElementById(boxId);
      if (!box.classList.contains("open")) {
        const ok = await requireAuth("🔒 Wachtwoord nodig om dates toe te voegen of te bewerken");
        if (!ok) return;
      }
    }
    const box     = document.getElementById(boxId);
    const chevron = document.getElementById(chevronId);
    box.classList.toggle("open");
    chevron.classList.toggle("open");
  };
}

setupToggle("toggleAdd",   "addBox",   "chevronAdd");
setupToggle("toggleIdeas", "ideasBox", "chevronIdeas");

// ===== TAB SWITCHING =====
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.getElementById("tab-ideas").classList.toggle("hidden", tab !== "ideas");
  document.getElementById("tab-done").classList.toggle("hidden",  tab !== "done");
  if (tab === "done") renderDoneList();
}

// ===== CANCEL EDIT =====
cancelBtn.onclick = () => resetForm();

function resetForm() {
  titleInput.value    = "";
  descInput.value     = "";
  categoryInput.value = "";
  budgetInput.value   = "";
  locationInput.value = "";
  durationInput.value = "";
  editId              = null;
  addBtnLabel.innerText = "💾 Opslaan";
  addTitleEl.innerText  = "Voeg date toe";
}

// ===== RENDER LIST =====
async function renderList() {
  setLoading(true);

  const { data, error } = await supabaseClient
    .from("date_ideas")
    .select("*")
    .order("favorite", { ascending: false })
    .order("id",       { ascending: false });

  setLoading(false);

  if (error) { showToast("❌ Fout bij laden"); return; }

  allIdeas = data || [];
  if (doneCount) doneCount.innerText = allIdeas.filter(i => i.done).length;

  applyFilters();
  if (activeTab === "done") renderDoneList();
}

// ===== APPLY FILTERS =====
function applyFilters() {
  const search    = searchInput.value.toLowerCase();
  const cats      = getChecked("filt-cat");
  const budgets   = getChecked("filt-budget");
  const locations = getChecked("filt-loc");
  const durations = getChecked("filt-dur");
  const hideDone  = hideDoneCheck ? hideDoneCheck.checked : false;
  const favOnly   = favOnlyIdeas  ? favOnlyIdeas.checked  : false;

  const filtered = allIdeas.filter(idea => {
    if (hideDone && idea.done) return false;
    if (favOnly  && !idea.favorite) return false;
    const matchSearch = !search          || idea.title?.toLowerCase().includes(search) || idea.description?.toLowerCase().includes(search);
    const matchCat    = !cats.length     || cats.includes(idea.category);
    const matchBudget = !budgets.length  || budgets.includes(idea.budget);
    const matchLoc    = !locations.length || locations.includes(idea.location);
    const matchDur    = !durations.length || durations.includes(idea.duration);
    return matchSearch && matchCat && matchBudget && matchLoc && matchDur;
  });

  renderActiveFilterChips(cats, budgets, locations, durations);
  renderItems(filtered);
  ideaCount.innerText = allIdeas.length;
}

// ===== ACTIVE FILTER CHIPS =====
function renderActiveFilterChips(cats, budgets, locations, durations) {
  const all = [
    ...cats.map(v     => ({ label: v, class: "filt-cat",    value: v })),
    ...budgets.map(v  => ({ label: v, class: "filt-budget", value: v })),
    ...locations.map(v=> ({ label: v, class: "filt-loc",    value: v })),
    ...durations.map(v=> ({ label: v, class: "filt-dur",    value: v })),
  ];

  if (!all.length) {
    activeFiltersEl.classList.add("hidden");
    activeFiltersEl.innerHTML = "";
    return;
  }

  activeFiltersEl.classList.remove("hidden");
  activeFiltersEl.innerHTML = all.map(f =>
    `<span class="filter-chip" onclick="removeFilter('${f.class}','${f.value}')">${f.label} ✕</span>`
  ).join("");
}

function removeFilter(className, value) {
  const cb = document.querySelector(`.${className}[value="${value}"]`);
  if (cb) { cb.checked = false; cb.dispatchEvent(new Event("change")); }
}

searchInput.addEventListener("input", applyFilters);

// ===== RENDER ITEMS =====
function renderItems(ideas) {
  list.innerHTML = "";
  if (!ideas.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">💭</span><p>Geen ideeën gevonden</p></div>`;
    return;
  }
  ideas.forEach(idea => list.appendChild(buildIdeaItem(idea, false)));
}

// ===== RENDER DONE LIST =====
function renderDoneList() {
  if (!doneList) return;
  doneList.innerHTML = "";
  const done = allIdeas.filter(i => i.done);
  if (doneCount) doneCount.innerText = done.length;

  if (!done.length) {
    doneList.innerHTML = `<div class="empty-state"><span class="empty-icon">🎯</span><p>Nog niets gedaan — ga een date plannen! 💖</p></div>`;
    return;
  }
  done.forEach(idea => doneList.appendChild(buildIdeaItem(idea, true)));
}

// ===== BUILD IDEA ITEM =====
function buildIdeaItem(idea, isDoneTab) {
  const li = document.createElement("li");
  li.className  = "date-item" + (isDoneTab ? " done-item" : "");
  li.dataset.id = idea.id;

  li.innerHTML = `
    <div class="item-content">
      <strong>${idea.title} ${idea.favorite ? "⭐" : ""}</strong>
      <small>${idea.description || ""}</small>
      <div class="item-badges">
        ${isDoneTab ? `<span class="done-badge">✅ Gedaan</span>` : ""}
        ${idea.category ? `<span class="badge badge-cat">${categoryEmoji(idea.category)} ${idea.category}</span>` : ""}
        ${idea.budget   ? `<span class="badge badge-budget">${budgetEmoji(idea.budget)} ${idea.budget}</span>`   : ""}
        ${idea.location ? `<span class="badge badge-loc">📍 ${idea.location}</span>`                            : ""}
        ${idea.duration ? `<span class="badge badge-dur">⏱️ ${idea.duration}</span>`                            : ""}
      </div>
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "actions";

  // ⭐ Favorite — requires auth
  const fav = document.createElement("button");
  fav.className = "iconBtn" + (idea.favorite ? " is-fav" : "");
  fav.title     = idea.favorite ? "Verwijder favoriet" : "Markeer als favoriet";
  fav.innerText = idea.favorite ? "💖" : "🤍";
  fav.onclick   = async () => {
    const ok = await requireAuth("🔒 Wachtwoord nodig om favorieten te beheren");
    if (!ok) return;

    const newVal = !idea.favorite;
    const { error } = await supabaseClient.from("date_ideas").update({ favorite: newVal }).eq("id", idea.id);
    if (error) { showToast("❌ Fout bij opslaan"); return; }

    idea.favorite = newVal;
    const idx = allIdeas.findIndex(i => i.id === idea.id);
    if (idx !== -1) allIdeas[idx].favorite = newVal;

    fav.innerText = newVal ? "💖" : "🤍";
    fav.title     = newVal ? "Verwijder favoriet" : "Markeer als favoriet";
    fav.classList.toggle("is-fav", newVal);

    const titleEl = li.querySelector("strong");
    if (titleEl) titleEl.innerText = `${idea.title} ${newVal ? "⭐" : ""}`;

    showToast(newVal ? "Favoriet toegevoegd ⭐" : "Favoriet verwijderd");
    applyFilters();
    if (activeTab === "done") renderDoneList();
  };

  // ✅ Done toggle — requires auth
  const done = document.createElement("button");
  done.className = "iconBtn done-btn" + (idea.done ? " is-done" : "");
  done.title     = idea.done ? "Zet terug naar ideeën" : "Markeer als gedaan";
  done.innerHTML = idea.done
    ? `<span class="done-icon-wrap done-active"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7.5" stroke="#2a7a50" stroke-width="1.5" fill="rgba(60,180,100,0.15)"/><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#2a7a50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
    : `<span class="done-icon-wrap"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7.5" stroke="#aaa" stroke-width="1.5" fill="none"/><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

  done.onclick = async () => {
    const ok = await requireAuth("🔒 Wachtwoord nodig om dates als gedaan te markeren");
    if (!ok) return;

    const newVal = !idea.done;
    const { error } = await supabaseClient.from("date_ideas").update({ done: newVal }).eq("id", idea.id);
    if (error) { showToast("❌ Fout bij opslaan"); return; }

    idea.done = newVal;
    const idx = allIdeas.findIndex(i => i.id === idea.id);
    if (idx !== -1) allIdeas[idx].done = newVal;

    showToast(newVal ? "Gemarkeerd als gedaan ✅" : "Terug gezet naar ideeën 💭");
    if (doneCount) doneCount.innerText = allIdeas.filter(i => i.done).length;

    const hideDone = hideDoneCheck ? hideDoneCheck.checked : false;

    if (hideDone && newVal) {
      li.classList.add("removing");
      setTimeout(() => { applyFilters(); if (activeTab === "done") renderDoneList(); }, 280);
    } else {
      done.className = "iconBtn done-btn" + (newVal ? " is-done" : "");
      done.title     = newVal ? "Zet terug naar ideeën" : "Markeer als gedaan";
      done.innerHTML = newVal
        ? `<span class="done-icon-wrap done-active"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7.5" stroke="#2a7a50" stroke-width="1.5" fill="rgba(60,180,100,0.15)"/><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#2a7a50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
        : `<span class="done-icon-wrap"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7.5" stroke="#aaa" stroke-width="1.5" fill="none"/><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

      li.classList.toggle("done-item", newVal);

      const badgesEl = li.querySelector(".item-badges");
      if (badgesEl) {
        const existingDone = badgesEl.querySelector(".done-badge");
        if (newVal && !existingDone) badgesEl.insertAdjacentHTML("afterbegin", `<span class="done-badge">✅ Gedaan</span>`);
        else if (!newVal && existingDone) existingDone.remove();
      }

      if (activeTab === "done") renderDoneList();
    }
  };

  // ✏️ Edit — requires auth
  const edit = document.createElement("button");
  edit.className = "iconBtn";
  edit.title     = "Bewerken";
  edit.innerText = "✏️";
  edit.onclick   = async () => {
    const ok = await requireAuth("🔒 Wachtwoord nodig om ideeën te bewerken");
    if (!ok) return;

    titleInput.value    = idea.title;
    descInput.value     = idea.description;
    categoryInput.value = idea.category;
    budgetInput.value   = idea.budget;
    locationInput.value = idea.location || "";
    durationInput.value = idea.duration || "";
    editId              = idea.id;
    addBtnLabel.innerText = "💾 Bijwerken";
    addTitleEl.innerText  = "Idee bewerken";

    const addBox  = document.getElementById("addBox");
    const chevron = document.getElementById("chevronAdd");
    if (!addBox.classList.contains("open")) {
      addBox.classList.add("open");
      chevron.classList.add("open");
    }
    document.getElementById("addSection").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Bewerkmodus ✏️");
  };

  // 🗑 Delete — requires auth
  const del = document.createElement("button");
  del.className = "iconBtn";
  del.title     = "Verwijderen";
  del.innerText = "🗑️";
  del.onclick   = async () => {
    const ok = await requireAuth("🔒 Wachtwoord nodig om ideeën te verwijderen");
    if (!ok) return;

    deleteId = idea.id;
    confirmModal.classList.remove("hidden");
  };

  actions.appendChild(fav);
  actions.appendChild(done);
  actions.appendChild(edit);
  actions.appendChild(del);
  li.appendChild(actions);
  return li;
}

// ===== DELETE MODAL =====
confirmDeleteBtn.onclick = async () => {
  if (!deleteId) return;

  const item = document.querySelector(`[data-id="${deleteId}"]`);
  if (item) {
    item.classList.add("removing");
    await new Promise(r => setTimeout(r, 280));
  }

  await supabaseClient.from("date_ideas").delete().eq("id", deleteId);
  deleteId = null;
  confirmModal.classList.add("hidden");
  showToast("Verwijderd 🗑️");
  renderList();
};

cancelDeleteBtn.onclick = () => { deleteId = null; confirmModal.classList.add("hidden"); };

confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) { deleteId = null; confirmModal.classList.add("hidden"); }
});

// ===== SAVE / EDIT =====
addBtn.onclick = async () => {
  const title = titleInput.value.trim();
  if (!title) { showToast("Vul een titel in 📝"); titleInput.focus(); return; }

  const payload = {
    title:       title,
    description: descInput.value.trim(),
    category:    categoryInput.value,
    budget:      budgetInput.value,
    location:    locationInput.value,
    duration:    durationInput.value,
  };

  setLoading(true);

  if (editId) {
    await supabaseClient.from("date_ideas").update(payload).eq("id", editId);
    showToast("Aangepast ✏️");
  } else {
    await supabaseClient.from("date_ideas").insert([payload]);
    showToast("Toegevoegd 💖");
  }

  setLoading(false);
  resetForm();

  const addBox  = document.getElementById("addBox");
  const chevron = document.getElementById("chevronAdd");
  addBox.classList.remove("open");
  chevron.classList.remove("open");

  renderList();
};

// ===== RANDOM =====
document.getElementById("generateBtn").onclick = async () => {
  const favOnly      = favOnlyCheck.checked;
  const hideDoneRand = document.getElementById("hideDoneRandom")?.checked ?? true;
  const randCats    = getChecked("rand-cat");
  const randBudgets = getChecked("rand-budget");
  const randLocs    = getChecked("rand-loc");
  const randDurs    = getChecked("rand-dur");

  let pool = allIdeas.filter(i => !hideDoneRand || !i.done);
  if (favOnly) pool = pool.filter(i => i.favorite);
  if (randCats.length)    pool = pool.filter(i => randCats.includes(i.category));
  if (randBudgets.length) pool = pool.filter(i => randBudgets.includes(i.budget));
  if (randLocs.length)    pool = pool.filter(i => randLocs.includes(i.location));
  if (randDurs.length)    pool = pool.filter(i => randDurs.includes(i.duration));

  const hasAnyFilter = randCats.length || randBudgets.length || randLocs.length || randDurs.length;
  if (hasAnyFilter) {
    pool = allIdeas
      .filter(i => (!hideDoneRand || !i.done) && (!favOnly || i.favorite))
      .filter(i =>
        (randCats.length    && randCats.includes(i.category))  ||
        (randBudgets.length && randBudgets.includes(i.budget)) ||
        (randLocs.length    && randLocs.includes(i.location))  ||
        (randDurs.length    && randDurs.includes(i.duration))
      );
  }

  if (!allIdeas.length) { showToast("Nog geen ideeën! Voeg er eerst wat toe 💭"); return; }
  if (!pool.length)     { showToast("Geen ideeën gevonden met deze filters ✨");  return; }

  const rand = pool[Math.floor(Math.random() * pool.length)];

  document.getElementById("randomTitle").innerText       = rand.title;
  document.getElementById("randomDescription").innerText = rand.description || "";

  document.getElementById("randomCategory").innerText = rand.category ? `${categoryEmoji(rand.category)} ${rand.category}` : "";
  document.getElementById("randomBudget").innerText   = rand.budget   ? `${budgetEmoji(rand.budget)} ${rand.budget}`       : "";
  document.getElementById("randomLocation").innerText = rand.location ? `📍 ${rand.location}` : "";
  document.getElementById("randomDuration").innerText = rand.duration ? `⏱️ ${rand.duration}` : "";

  const card = document.getElementById("randomCard");
  card.classList.add("hidden");
  void card.offsetWidth;
  card.classList.remove("hidden");
};

// ===== HELPERS =====
function categoryEmoji(cat) {
  return { Buiten: "🌿", Thuis: "🏠", Eten: "🍽️", Avontuur: "⚡" }[cat] || "📂";
}
function budgetEmoji(budget) {
  return { Gratis: "🆓", Goedkoop: "💚", Gemiddeld: "💛", Duur: "❤️" }[budget] || "💸";
}

// ===== INIT =====
setupMultiSelectListeners();
loadPrefs().then(() => applyFilters());
renderList();

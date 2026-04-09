const SUPABASE_URL = "https://aavzsvurygojkoxxvssd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_At0pbd5rRAbdWUF6gL0Kgw_O0QPSx0-";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const hideDoneCheck    = document.getElementById("hideDoneCheck");
const activeFiltersEl  = document.getElementById("activeFilters");

let editId       = null;
let deleteId     = null;
let allIdeas     = [];
let toastTimeout = null;
let activeTab    = "ideas";

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

// ===== DROPDOWN TOGGLE (viewport-aware) =====
function toggleDropdown(id) {
  const drop = document.getElementById(id);
  const allDrops = document.querySelectorAll(".multi-select-drop");
  allDrops.forEach(d => { if (d.id !== id) d.classList.add("hidden"); });

  const isHidden = drop.classList.contains("hidden");
  drop.classList.toggle("hidden");

  if (isHidden) {
    // Reset positioning before measuring
    drop.style.left  = "0";
    drop.style.right = "auto";
    drop.style.minWidth = "";

    // Let browser paint, then reposition if needed
    requestAnimationFrame(() => {
      const rect      = drop.getBoundingClientRect();
      const vpWidth   = window.innerWidth;
      const margin    = 8;

      if (rect.right > vpWidth - margin) {
        // Overflows right edge → align to right side of button
        drop.style.left  = "auto";
        drop.style.right = "0";
      }
      if (rect.left < margin) {
        // Overflows left edge → pin to left
        drop.style.left  = "0";
        drop.style.right = "auto";
      }
    });
  }
}

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".multi-select-wrap")) {
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

      // Update button active states
      ["filterCatDrop","filterBudgetDrop","filterLocDrop","filterDurDrop"].forEach(dropId => {
        const btn = document.querySelector("#" + dropId)?.closest(".multi-select-wrap")?.querySelector(".multi-select-btn");
        if (btn) {
          const hasVal = btn.querySelector("input:checked") !== null;
          btn.classList.toggle("has-selection", hasVal);
        }
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
        if (btn) {
          const hasVal = btn.querySelector("input:checked") !== null;
          btn.classList.toggle("has-selection", hasVal);
        }
      });
    });
  });

  if (hideDoneCheck) {
    hideDoneCheck.addEventListener("change", applyFilters);
  }
}

// ===== TOGGLE PANELS =====
function setupToggle(toggleId, boxId, chevronId) {
  document.getElementById(toggleId).onclick = () => {
    const box     = document.getElementById(boxId);
    const chevron = document.getElementById(chevronId);
    box.classList.toggle("open");
    chevron.classList.toggle("open");
  };
}

setupToggle("toggleAdd",    "addBox",    "chevronAdd");
setupToggle("toggleIdeas",  "ideasBox",  "chevronIdeas");

// ===== TAB SWITCHING =====
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.getElementById("tab-ideas").classList.toggle("hidden", tab !== "ideas");
  document.getElementById("tab-done").classList.toggle("hidden", tab !== "done");

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

  if (error) {
    showToast("❌ Fout bij laden");
    return;
  }

  allIdeas = data || [];

  const doneItems = allIdeas.filter(i => i.done);
  if (doneCount) doneCount.innerText = doneItems.length;

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

  const filtered = allIdeas.filter(idea => {
    if (idea.done) return false;
    const matchSearch = !search       || idea.title?.toLowerCase().includes(search) || idea.description?.toLowerCase().includes(search);
    const matchCat    = !cats.length     || cats.includes(idea.category);
    const matchBudget = !budgets.length  || budgets.includes(idea.budget);
    const matchLoc    = !locations.length || locations.includes(idea.location);
    const matchDur    = !durations.length || durations.includes(idea.duration);
    return matchSearch && matchCat && matchBudget && matchLoc && matchDur;
  });

  renderActiveFilterChips(cats, budgets, locations, durations);
  renderItems(filtered);

  // FIX: show filtered count, not total
  ideaCount.innerText = filtered.length;
}

// ===== ACTIVE FILTER CHIPS =====
function renderActiveFilterChips(cats, budgets, locations, durations) {
  const all = [
    ...cats.map(v => ({ label: v, class: "filt-cat", value: v })),
    ...budgets.map(v => ({ label: v, class: "filt-budget", value: v })),
    ...locations.map(v => ({ label: v, class: "filt-loc", value: v })),
    ...durations.map(v => ({ label: v, class: "filt-dur", value: v })),
  ];

  if (!all.length) {
    activeFiltersEl.classList.add("hidden");
    activeFiltersEl.innerHTML = "";
    return;
  }

  activeFiltersEl.classList.remove("hidden");
  activeFiltersEl.innerHTML = all.map(f =>
    `<span class="filter-chip" onclick="removeFilter('${f.class}','${f.value}')">
      ${f.label} ✕
    </span>`
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
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">💭</span>
        <p>Geen ideeën gevonden</p>
      </div>`;
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
    doneList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎯</span>
        <p>Nog niets gedaan — ga een date plannen! 💖</p>
      </div>`;
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
        ${idea.budget   ? `<span class="badge badge-budget">${budgetEmoji(idea.budget)} ${idea.budget}</span>` : ""}
        ${idea.location ? `<span class="badge badge-loc">📍 ${idea.location}</span>` : ""}
        ${idea.duration ? `<span class="badge badge-dur">⏱️ ${idea.duration}</span>` : ""}
      </div>
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "actions";

  // ⭐ Favorite
  const fav = document.createElement("button");
  fav.className = "iconBtn" + (idea.favorite ? " is-fav" : "");
  fav.title     = idea.favorite ? "Verwijder favoriet" : "Markeer als favoriet";
  fav.innerText = idea.favorite ? "💖" : "🤍";
  fav.onclick   = async () => {
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
  };

  // ✅ Done toggle — optimistic update, syncs both tabs
  const done = document.createElement("button");
  done.className = "iconBtn done-btn" + (idea.done ? " is-done" : "");
  done.title     = idea.done ? "Zet terug naar ideeën" : "Markeer als gedaan";
  done.innerHTML = idea.done
    ? `<span class="done-icon-wrap done-active"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7.5" stroke="#2a7a50" stroke-width="1.5" fill="rgba(60,180,100,0.15)"/><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#2a7a50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
    : `<span class="done-icon-wrap"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7.5" stroke="#aaa" stroke-width="1.5" fill="none"/><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

  done.onclick   = async () => {
    const newVal = !idea.done;
    const { error } = await supabaseClient.from("date_ideas").update({ done: newVal }).eq("id", idea.id);
    if (error) { showToast("❌ Fout bij opslaan"); return; }

    // Update local state immediately — no full re-fetch
    idea.done = newVal;
    const idx = allIdeas.findIndex(i => i.id === idea.id);
    if (idx !== -1) allIdeas[idx].done = newVal;

    showToast(newVal ? "Gemarkeerd als gedaan ✅" : "Terug gezet naar ideeën 💭");

    // Animate out, then re-render whichever view is active
    li.classList.add("removing");
    setTimeout(() => {
      applyFilters();              // refreshes ideas tab + count
      if (activeTab === "done") renderDoneList(); // refreshes done tab
      if (doneCount) doneCount.innerText = allIdeas.filter(i => i.done).length;
    }, 280);
  };

  // ✏️ Edit
  const edit = document.createElement("button");
  edit.className = "iconBtn";
  edit.title     = "Bewerken";
  edit.innerText = "✏️";
  edit.onclick   = () => {
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

  // 🗑 Delete
  const del = document.createElement("button");
  del.className = "iconBtn";
  del.title     = "Verwijderen";
  del.innerText = "🗑️";
  del.onclick   = () => {
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

cancelDeleteBtn.onclick = () => {
  deleteId = null;
  confirmModal.classList.add("hidden");
};

confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) {
    deleteId = null;
    confirmModal.classList.add("hidden");
  }
});

// ===== SAVE / EDIT =====
addBtn.onclick = async () => {
  const title = titleInput.value.trim();
  if (!title) {
    showToast("Vul een titel in 📝");
    titleInput.focus();
    return;
  }

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
  const favOnly     = favOnlyCheck.checked;
  const randCats    = getChecked("rand-cat");
  const randBudgets = getChecked("rand-budget");
  const randLocs    = getChecked("rand-loc");
  const randDurs    = getChecked("rand-dur");

  let pool = allIdeas.filter(i => !i.done);

  if (favOnly) pool = pool.filter(i => i.favorite);

  // OR-logic: an item matches if it satisfies at least one value per active filter group.
  // Between groups it's still AND (you chose category AND budget constraints separately).
  // Within each group it's OR (selecting "Buiten" + "Thuis" shows both).
  if (randCats.length)    pool = pool.filter(i => randCats.includes(i.category));
  if (randBudgets.length) pool = pool.filter(i => randBudgets.includes(i.budget));
  if (randLocs.length)    pool = pool.filter(i => randLocs.includes(i.location));
  if (randDurs.length)    pool = pool.filter(i => randDurs.includes(i.duration));

  // OR across ALL active filter groups combined: item matches if it satisfies any selected value
  const hasAnyFilter = randCats.length || randBudgets.length || randLocs.length || randDurs.length;
  if (hasAnyFilter) {
    pool = allIdeas.filter(i => !i.done && (!favOnly || i.favorite)).filter(i =>
      (randCats.length    && randCats.includes(i.category))  ||
      (randBudgets.length && randBudgets.includes(i.budget)) ||
      (randLocs.length    && randLocs.includes(i.location))  ||
      (randDurs.length    && randDurs.includes(i.duration))
    );
  }

  if (!allIdeas.length) {
    showToast("Nog geen ideeën! Voeg er eerst wat toe 💭");
    return;
  }

  if (!pool.length) {
    showToast("Geen ideeën gevonden met deze filters ✨");
    return;
  }

  const rand = pool[Math.floor(Math.random() * pool.length)];

  document.getElementById("randomTitle").innerText       = rand.title;
  document.getElementById("randomDescription").innerText = rand.description || "";

  const catEl = document.getElementById("randomCategory");
  const budEl = document.getElementById("randomBudget");
  const locEl = document.getElementById("randomLocation");
  const durEl = document.getElementById("randomDuration");

  catEl.innerText = rand.category ? `${categoryEmoji(rand.category)} ${rand.category}` : "";
  budEl.innerText = rand.budget   ? `${budgetEmoji(rand.budget)} ${rand.budget}`       : "";
  locEl.innerText = rand.location ? `📍 ${rand.location}` : "";
  durEl.innerText = rand.duration ? `⏱️ ${rand.duration}` : "";

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
renderList();

// =====================
// SUPABASE SETUP
// =====================
const SUPABASE_URL = "https://aavzsvurygojkoxxvssd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_At0pbd5rRAbdWUF6gL0Kgw_O0QPSx0-";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// ELEMENTS
// =====================
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const budgetInput = document.getElementById("budget");

const addBtn = document.getElementById("addBtn");
const dateList = document.getElementById("dateList");

const generateBtn = document.getElementById("generateBtn");
const randomCard = document.getElementById("randomCard");
const randomTitle = document.getElementById("randomTitle");
const randomDescription = document.getElementById("randomDescription");

const filterCategory = document.getElementById("filterCategory");
const filterBudget = document.getElementById("filterBudget");

// toggle
const toggleIdeas = document.getElementById("toggleIdeas");
const ideasContent = document.getElementById("ideasContent");
const arrow = document.getElementById("arrow");

let open = false;

// =====================
// TOGGLE IDEAS (FIXED)
// =====================
toggleIdeas.addEventListener("click", () => {
  open = !open;

  if (open) {
    ideasContent.classList.remove("collapsed");
    ideasContent.classList.add("expanded");
    arrow.innerText = "▲";
  } else {
    ideasContent.classList.add("collapsed");
    ideasContent.classList.remove("expanded");
    arrow.innerText = "▼";
  }
});

// =====================
// FETCH IDEAS
// =====================
async function fetchIdeas() {
  const { data } = await supabaseClient
    .from("date_ideas")
    .select("*")
    .order("id", { ascending: false });

  return data || [];
}

// =====================
// RENDER LIST
// =====================
async function renderList() {
  const ideas = await fetchIdeas();

  dateList.innerHTML = "";

  ideas.forEach((idea) => {
    if (filterCategory.value && idea.category !== filterCategory.value) return;
    if (filterBudget.value && idea.budget !== filterBudget.value) return;

    const li = document.createElement("li");
    li.className = "date-item";

    li.innerHTML = `
      <span>${idea.title} (${idea.category || "-"}, ${idea.budget || "-"})</span>
    `;

    const del = document.createElement("button");
    del.innerText = "🗑";

    del.onclick = async () => {
      await supabaseClient.from("date_ideas").delete().eq("id", idea.id);
      renderList();
    };

    li.appendChild(del);
    dateList.appendChild(li);
  });
}

// =====================
// ADD IDEA
// =====================
addBtn.addEventListener("click", async () => {
  if (!titleInput.value || !descInput.value) {
    alert("Vul alles in!");
    return;
  }

  const { error } = await supabaseClient.from("date_ideas").insert([
    {
      title: titleInput.value,
      description: descInput.value,
      category: categoryInput.value,
      budget: budgetInput.value,
    },
  ]);

  if (error) {
    alert("Error bij opslaan");
    console.log(error);
    return;
  }

  titleInput.value = "";
  descInput.value = "";
  categoryInput.value = "";
  budgetInput.value = "";

  renderList();
});

// =====================
// RANDOM DATE
// =====================
generateBtn.addEventListener("click", async () => {
  const ideas = await fetchIdeas();

  let filtered = ideas;

  if (filterCategory.value)
    filtered = filtered.filter(i => i.category === filterCategory.value);

  if (filterBudget.value)
    filtered = filtered.filter(i => i.budget === filterBudget.value);

  if (!filtered.length) {
    alert("Geen ideeën gevonden!");
    return;
  }

  const rand = filtered[Math.floor(Math.random() * filtered.length)];

  randomTitle.innerText = rand.title;
  randomDescription.innerText = rand.description;

  randomCard.classList.remove("hidden");
});

// =====================
// FILTERS
// =====================
filterCategory.addEventListener("change", renderList);
filterBudget.addEventListener("change", renderList);

// =====================
// START
// =====================
renderList();

console.log("Script loaded");

// --- Supabase setup ---
const SUPABASE_URL = "https://aavzsvurygojkoxxvssd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_At0pbd5rRAbdWUF6gL0Kgw_O0QPSx0-";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Elements ---
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

const toggleHeader = document.getElementById("toggleIdeas");
const ideasContent = document.getElementById("ideasContent");

// --- Toggle jouw ideeën ---
toggleHeader.addEventListener("click", () => {
  if (ideasContent.classList.contains("collapsed")) {
    ideasContent.classList.remove("collapsed");
    toggleHeader.textContent = "Jouw ideeën ▲";
  } else {
    ideasContent.classList.add("collapsed");
    toggleHeader.textContent = "Jouw ideeën ▼";
  }
});

// --- Fetch ---
async function fetchIdeas() {
  const { data, error } = await supabaseClient
    .from("date_ideas")
    .select("*")
    .order("id", { ascending: false });
  if (error) console.log(error);
  return data || [];
}

// --- Render list ---
async function renderList() {
  const ideas = await fetchIdeas();
  dateList.innerHTML = "";

  ideas.forEach((idea) => {
    if (filterCategory.value && idea.category !== filterCategory.value) return;
    if (filterBudget.value && idea.budget !== filterBudget.value) return;

    const li = document.createElement("li");
    li.className = "date-item";

    li.innerHTML = `<span>${idea.title} (${idea.category || "-"}, ${idea.budget || "-"})</span>`;

    const delBtn = document.createElement("button");
    delBtn.innerText = "X";

    delBtn.onclick = async () => {
      await supabaseClient.from("date_ideas").delete().eq("id", idea.id);
      renderList();
    };

    li.appendChild(delBtn);
    dateList.appendChild(li);
  });
}

// --- Add ---
addBtn.addEventListener("click", async () => {
  if (!titleInput.value || !descInput.value) {
    alert("Vul titel en beschrijving in");
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
    console.log(error);
    alert("Error bij opslaan");
    return;
  }

  titleInput.value = "";
  descInput.value = "";
  categoryInput.value = "";
  budgetInput.value = "";

  renderList();
});

// --- Random ---
generateBtn.addEventListener("click", async () => {
  const ideas = await fetchIdeas();
  let filtered = ideas;

  if (filterCategory.value) filtered = filtered.filter(i => i.category === filterCategory.value);
  if (filterBudget.value) filtered = filtered.filter(i => i.budget === filterBudget.value);

  if (!filtered.length) {
    alert("Geen ideeën gevonden!");
    return;
  }

  const rand = filtered[Math.floor(Math.random() * filtered.length)];

  randomTitle.innerText = rand.title;
  randomDescription.innerText = rand.description;
  randomCard.classList.remove("hidden");
});

// --- Filters ---
filterCategory.addEventListener("change", renderList);
filterBudget.addEventListener("change", renderList);

// --- Start ---
renderList();

const SUPABASE_URL = "https://aavzsvurygojkoxxvssd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_At0pbd5rRAbdWUF6gL0Kgw_O0QPSx0-";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// elements
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const budgetInput = document.getElementById("budget");

const addBtn = document.getElementById("addBtn");
const generateBtn = document.getElementById("generateBtn");

const randomTitle = document.getElementById("randomTitle");
const randomDescription = document.getElementById("randomDescription");
const randomCard = document.getElementById("randomCard");

const toast = document.getElementById("toast");
const list = document.getElementById("dateList");

// toast
function showToast(msg) {
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// fetch
async function fetchIdeas() {
  const { data } = await supabaseClient.from("date_ideas").select("*");
  return data || [];
}

// add
addBtn.addEventListener("click", async () => {
  await supabaseClient.from("date_ideas").insert([{
    title: titleInput.value,
    description: descInput.value,
    category: categoryInput.value,
    budget: budgetInput.value
  }]);

  titleInput.value = "";
  descInput.value = "";

  showToast("💖 Toegevoegd!");
});

// random (Apple feel animation)
generateBtn.addEventListener("click", async () => {
  const ideas = await fetchIdeas();

  randomTitle.innerText = "Denk... 🤔";
  randomDescription.innerText = "";
  randomCard.classList.remove("hidden");

  setTimeout(() => {
    const rand = ideas[Math.floor(Math.random() * ideas.length)];
    randomTitle.innerText = rand.title;
    randomDescription.innerText = rand.description;
  }, 600);
});

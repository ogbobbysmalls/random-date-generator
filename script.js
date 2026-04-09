const SUPABASE_URL = "https://aavzsvurygojkoxxvssd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_At0pbd5rRAbdWUF6gL0Kgw_O0QPSx0-";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// inputs
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const budgetInput = document.getElementById("budget");

const addBtn = document.getElementById("addBtn");
const generateBtn = document.getElementById("generateBtn");

const list = document.getElementById("dateList");

// UI
const toast = document.getElementById("toast");
const addBox = document.getElementById("addBox");
const ideasBox = document.getElementById("ideasBox");

document.getElementById("toggleAdd").onclick = () => {
  addBox.classList.toggle("open");
};

document.getElementById("toggleIdeas").onclick = () => {
  ideasBox.classList.toggle("open");
};

// toast
function showToast(msg) {
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// 🔥 RENDER IDEAS (FIX)
async function renderList() {
  const { data } = await supabaseClient
    .from("date_ideas")
    .select("*")
    .order("id", { ascending: false });

  list.innerHTML = "";

  if (!data || data.length === 0) {
    list.innerHTML = "<p>Geen ideeën 💭</p>";
    return;
  }

  data.forEach((idea) => {
    const li = document.createElement("li");
    li.className = "date-item";

    li.innerHTML = `
      <div>
        <strong>${idea.title}</strong><br/>
        <small>${idea.description}</small>
      </div>
    `;

    const del = document.createElement("button");
    del.innerText = "🗑";
    del.className = "deleteBtn";

    del.onclick = async () => {
      await supabaseClient
        .from("date_ideas")
        .delete()
        .eq("id", idea.id);

      showToast("Verwijderd 🗑");
      renderList();
    };

    li.appendChild(del);
    list.appendChild(li);
  });
}

// ➕ ADD
addBtn.addEventListener("click", async () => {
  await supabaseClient.from("date_ideas").insert([{
    title: titleInput.value,
    description: descInput.value,
    category: categoryInput.value,
    budget: budgetInput.value
  }]);

  titleInput.value = "";
  descInput.value = "";

  showToast("Toegevoegd 💖");
  renderList();
});

// 🎲 RANDOM
generateBtn.addEventListener("click", async () => {
  const { data } = await supabaseClient.from("date_ideas").select("*");

  const rand = data[Math.floor(Math.random() * data.length)];

  alert(rand.title + "\n\n" + rand.description);
});

renderList();

const ideas=[

{
title:"Picnic in the Park",
description:"Bring snacks, a blanket, and enjoy nature together."
},

{
title:"Movie Night",
description:"Choose a romantic movie and make popcorn."
},

{
title:"Try a New Restaurant",
description:"Pick a cuisine you never tried before."
},

{
title:"Sunset Walk",
description:"Take a walk during sunset and talk."
},

{
title:"Game Night",
description:"Play board games or card games together."
}

]

const button=document.getElementById("generateBtn")

button.addEventListener("click",()=>{

button.innerText="🎰 Choosing..."

setTimeout(()=>{

const random=ideas[Math.floor(Math.random()*ideas.length)]

document.getElementById("title").innerText=random.title
document.getElementById("description").innerText=random.description

document.getElementById("card").classList.remove("hidden")

button.innerText="🎲 Pick Another Date"

},800)

})

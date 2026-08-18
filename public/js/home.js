const form = document.getElementById("home-search");
const input = document.getElementById("home-search-input");

const placeholders = [
"wat for lunch teach?",
    "thats so true man",
    "im gay",
    "powered by estrogen and hrt",
    "BOOBS?!?!?! WHERE?!?!"
];

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const url = input.value.trim();
    if (!url) return;
    sessionStorage.setItem("pendingUrl", url);
    location.href = "/education";
});

let phIndex = 0;
setInterval(() => {
    phIndex = (phIndex + 1) % placeholders.length;
    input.placeholder = placeholders[phIndex];
}, 5000);

const form = document.getElementById("home-search");
const input = document.getElementById("home-search-input");

const placeholders = [
    "welcome back.",
    "enter a url...",
    "what are we browsing today?",
    "type a url or search...",
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
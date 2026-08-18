const frame = document.getElementById("iframeid");
const fadeout = document.getElementById("fadeout");
frame.addEventListener("load", () => {
    fadeout.style = "opacity: 0;";
    frame.style.display = "block";
    setTimeout(() => fadeout.remove(), 500);
});
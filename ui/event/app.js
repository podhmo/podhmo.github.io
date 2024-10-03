console.log("2. on defer");
window.addEventListener("DOMContentLoaded", (ev) => {
    console.log(`4. ${ev.type}: on defer`);
})
window.addEventListener("load", (ev) => {
    console.log(`6. ${ev.type}: on defer`); // ev.type == "" みたい
})

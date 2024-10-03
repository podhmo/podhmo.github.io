import { log } from "./log.js";

log("2. toplevel, on defer", { selector: "#log" });
window.addEventListener("DOMContentLoaded", (ev) => {
    log(`4. ${ev.type}: on defer`, { selector: "#log" });
})
window.addEventListener("load", (ev) => {
    log(`6. ${ev.type}: on defer`, { selector: "#log" }); // ev.type == "" みたい
})

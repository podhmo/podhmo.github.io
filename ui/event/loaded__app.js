import { bind } from "./log.js";

const log = bind("#log");

log("2. toplevel, on defer");
window.addEventListener("DOMContentLoaded", (ev) => {
    log(`4. ${ev.type}: on defer`);
})
window.addEventListener("load", (ev) => {
    log(`6. ${ev.type}: on defer`); // ev.type == "" みたい
})

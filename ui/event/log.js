export function log(msg, { selector = "", tag = "li" } = {}) {
    console.log(`%c${msg}`, "color: blue");
    if (selector !== "") {
        const li = document.createElement(tag);
        li.textContent = msg;
        document.querySelector(selector).appendChild(li)
    }
}

// the log function which logs a message to the console and optionally appends it to a selector.
// @param {string} msg - The message to log
// @param {object} [options] - The options object
// @param {string} [options.selector] - The selector to append the message to
// @param {string} [options.tag] - The tag to use for the message element
// @returns {void}
export function log(msg, { selector = "", tag = "li" } = {}) {
    console.log(`%c${msg}`, "color: blue");
    if (selector !== "") {
        const li = document.createElement(tag);
        li.textContent = msg;
        document.querySelector(selector).appendChild(li)
    }
}

// partially apply the log function to bind it to a selector
export function bind(selector) {
    return function (msg) {
        log(msg, { selector });
    }
}

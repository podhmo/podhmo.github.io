import { h, Fragment } from "preact";
export function App() {
  return /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("h1", { class: "title" }, "GitHub Notifications"), /* @__PURE__ */ h("form", { method: "POST", id: "auth-form" }, /* @__PURE__ */ h("details", { open: true }, /* @__PURE__ */ h("summary", { role: "button", class: "secondary" }, "form"), /* @__PURE__ */ h("div", { style: { paddingLeft: "2rem" } }, /* @__PURE__ */ h("label", { htmlFor: "username" }, "username"), /* @__PURE__ */ h(
    "input",
    {
      type: "text",
      id: "username",
      autoComplete: "username",
      tabIndex: -1,
      defaultValue: "github-notifications"
    }
  ), /* @__PURE__ */ h("label", { htmlFor: "password" }, "apikey"), /* @__PURE__ */ h(
    "input",
    {
      type: "password",
      id: "apikey",
      autoComplete: "current-password",
      tabIndex: -1
    }
  ), /* @__PURE__ */ h("label", { htmlFor: "query" }, "query"), /* @__PURE__ */ h(
    "input",
    {
      type: "search",
      id: "query",
      tabIndex: -1,
      defaultValue: "is:unread"
    }
  ), /* @__PURE__ */ h("div", { class: "grid" }, /* @__PURE__ */ h("fieldset", null, /* @__PURE__ */ h("legend", null, "participating"), /* @__PURE__ */ h("label", { htmlFor: "participating" }, /* @__PURE__ */ h(
    "input",
    {
      type: "checkbox",
      id: "participating",
      defaultChecked: true,
      role: "switch"
    }
  ))), /* @__PURE__ */ h("fieldset", null, /* @__PURE__ */ h("legend", null, "debug"), /* @__PURE__ */ h("label", { htmlFor: "debugStatus" }, /* @__PURE__ */ h("input", { type: "checkbox", id: "debugStatus", role: "switch" })))))), /* @__PURE__ */ h("button", { type: "submit", tabIndex: -1 }, "fetch")), /* @__PURE__ */ h("a", { href: "https://github.com/settings/tokens", target: "_blank" }, "please set PAT(personal access token)"), /* @__PURE__ */ h("pre", { id: "output" }, "\n", "        "));
}

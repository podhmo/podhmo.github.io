import { h } from "preact";
export const Avatar = ({ src }) => {
  return /* @__PURE__ */ h("img", { src, style: { "border-radius": "50%" } });
};
export function GroupedRepositoryCard({ author, children }) {
  return /* @__PURE__ */ h("article", { style: { marginRight: "0%", paddingRight: "0%" } }, /* @__PURE__ */ h("div", { className: "grid", style: { grid: "auto-flow / 1fr 8fr 2fr" } }, /* @__PURE__ */ h(Avatar, { src: author.url || "" }), /* @__PURE__ */ h("h2", null, author.name)), children);
}
export function NotificationCard({ title, link, message, typ, children }) {
  const a = link.tab ? /* @__PURE__ */ h("a", { href: link.href, target: "_blank", rel: "noopener noreferrer" }, link.text) : /* @__PURE__ */ h("a", { href: link.href }, link.text);
  return /* @__PURE__ */ h("article", { style: { marginRight: "0%", paddingRight: "0%" } }, /* @__PURE__ */ h("div", { className: "grid", style: { grid: "auto-flow / 1fr 8fr 2fr" } }, /* @__PURE__ */ h(Avatar, { src: message.author.url || "" }), /* @__PURE__ */ h("hgroup", null, /* @__PURE__ */ h("h3", null, title, a), /* @__PURE__ */ h("h4", null, message.text, /* @__PURE__ */ h("code", { style: { marginLeft: "1rem" } }, /* @__PURE__ */ h("small", null, typ)))), /* @__PURE__ */ h("p", null, /* @__PURE__ */ h("small", null, message.cdate))), children);
}
export function CommentCard({ message }) {
  return /* @__PURE__ */ h("article", { style: { margin: 0 } }, /* @__PURE__ */ h("div", { className: "grid", style: { grid: "auto-flow / 1fr 8fr 2fr" } }, /* @__PURE__ */ h(Avatar, { src: message.author.url || "" }), /* @__PURE__ */ h("hgroup", null, /* @__PURE__ */ h("h4", null, message.author.name), /* @__PURE__ */ h("p", null, "commented ", message.cdate))), /* @__PURE__ */ h("pre", { style: { padding: "1rem", "white-space": "pre-wrap" } }, message.text));
}
export function SectionHeader({ title, id }) {
  return /* @__PURE__ */ h("h2", { id }, /* @__PURE__ */ h("a", { href: "#" + id }, title, /* @__PURE__ */ h("svg", { class: "octicon octicon-link", viewBox: "0 0 16 16", version: "1.1", width: "1.5rem", height: "1.5rem", "aria-hidden": "true" }, /* @__PURE__ */ h("path", { d: "m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z" }))));
}

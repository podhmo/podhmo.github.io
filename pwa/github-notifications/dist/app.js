import { h, Fragment, Component } from "preact";
import { useCallback, useState } from "preact/hooks";
import { NotificationCard } from "./components.js";
import { REPOSITORY, STATE } from "./state.js";
export function App() {
  const [version, setVersion] = useState(1);
  const [rawrows, setRawRows] = useState(void 0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(void 0);
  const handleSubmit = useCallback(async (ev) => {
    ev.preventDefault();
    setVersion((prev) => prev + 1);
    try {
      setError(void 0);
      const { raw, data } = await REPOSITORY.fetchNotification({ query: STATE.input.query.value, participating: STATE.input.participating.value, setLoading });
      setRawRows(() => STATE.input.debug.value ? raw : void 0);
      setRows(() => data);
    } catch (err) {
      setError(err);
      setRows(() => []);
      throw err;
    }
  }, []);
  return /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("h1", { class: "title" }, "GitHub Notifications"), /* @__PURE__ */ h(InputFormPanel, { onSubmit: handleSubmit, loading }), /* @__PURE__ */ h("p", null, /* @__PURE__ */ h("a", { href: "https://github.com/settings/tokens", target: "_blank" }, "please set PAT(personal access token)")), /* @__PURE__ */ h(ErrorBoundary, { error }, /* @__PURE__ */ h(
    RawOutputPanel,
    {
      input: STATE.input,
      data: rawrows || rows,
      version
    }
  ), rows && /* @__PURE__ */ h(CardListPanel, { rows })));
}
class ErrorBoundary extends Component {
  componentDidCatch(err) {
    this.setState({ error: err });
  }
  render() {
    const err = this.state.error || this.props.error;
    if (err) {
      let errorMessage = "";
      if (err instanceof Error) {
        errorMessage = `${err}
${err.stack}`;
      } else {
        errorMessage = `ng: {err}`;
      }
      return /* @__PURE__ */ h("details", { open: true }, /* @__PURE__ */ h("summary", null, " error is occured"), /* @__PURE__ */ h("pre", { id: "output", style: { padding: "1rem", "background-color": "#fee" } }, errorMessage));
    }
    return this.props.children;
  }
}
export function InputFormPanel({
  onSubmit,
  loading
}) {
  const input = STATE.input;
  const handleUsernameChange = useCallback(
    (ev) => {
      if (ev.currentTarget) {
        input.username.value = ev.currentTarget.value;
      }
    },
    []
  );
  const handleApikeyChange = useCallback(
    (ev) => {
      if (ev.currentTarget) {
        STATE.apikey.value = ev.currentTarget.value;
      }
    },
    []
  );
  const handleQueryChange = useCallback(
    (ev) => {
      if (ev.currentTarget) {
        input.query.value = ev.currentTarget.value;
      }
    },
    []
  );
  const handleParticipatingChange = useCallback(
    (ev) => {
      if (ev.currentTarget) {
        input.participating.value = ev.currentTarget.checked;
      }
    },
    []
  );
  const handleDebugChange = useCallback(
    (ev) => {
      if (ev.currentTarget) {
        input.debug.value = ev.currentTarget.checked;
      }
    },
    []
  );
  return /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("form", { method: "POST", id: "auth-form", onSubmit }, /* @__PURE__ */ h("details", { open: true }, /* @__PURE__ */ h("summary", { role: "button", class: "secondary" }, "form"), /* @__PURE__ */ h("div", { style: { paddingLeft: "2rem" } }, /* @__PURE__ */ h("label", { htmlFor: "username" }, "username"), /* @__PURE__ */ h(
    "input",
    {
      type: "text",
      id: "username",
      autoComplete: "username",
      tabIndex: -1,
      onInput: handleUsernameChange,
      value: input.username.value
    }
  ), /* @__PURE__ */ h("label", { htmlFor: "password" }, "apikey"), /* @__PURE__ */ h(
    "input",
    {
      type: "password",
      id: "apikey",
      autoComplete: "current-password",
      tabIndex: -1,
      onInput: handleApikeyChange,
      value: STATE.apikey.value
    }
  ), /* @__PURE__ */ h("label", { htmlFor: "query" }, "query"), /* @__PURE__ */ h(
    "input",
    {
      type: "search",
      id: "query",
      tabIndex: -1,
      onInput: handleQueryChange,
      value: input.query.value
    }
  ), /* @__PURE__ */ h("div", { class: "grid" }, /* @__PURE__ */ h("fieldset", null, /* @__PURE__ */ h("legend", null, "participating"), /* @__PURE__ */ h("label", { htmlFor: "participating" }, /* @__PURE__ */ h(
    "input",
    {
      type: "checkbox",
      id: "participating",
      checked: input.participating.value,
      onClick: handleParticipatingChange,
      role: "switch"
    }
  ))), /* @__PURE__ */ h("fieldset", null, /* @__PURE__ */ h("legend", null, "debug"), /* @__PURE__ */ h("label", { htmlFor: "debugStatus" }, /* @__PURE__ */ h(
    "input",
    {
      type: "checkbox",
      id: "debugStatus",
      checked: input.debug.value,
      onClick: handleDebugChange,
      role: "switch"
    }
  )))))), /* @__PURE__ */ h("button", { type: "submit", tabIndex: -1, "aria-busy": loading ? "true" : "false" }, "fetch")));
}
export function RawOutputPanel({ input, data, version }) {
  const style = { padding: "1rem" };
  return /* @__PURE__ */ h("details", null, /* @__PURE__ */ h("summary", null, " raw response"), /* @__PURE__ */ h("pre", { id: "output", style }, "version", version, ": ", JSON.stringify(data, null, 2)));
}
function CardListPanel({ rows, children }) {
  const props = rows.map((row) => {
    const html_url = apiURLtohtmlURL(row.url || "");
    const avatar_url = row.owner.avatar_url.includes("?") ? `${row.owner.avatar_url}&s=80` : `${row.owner.avatar_url}?s=80&v=4`;
    const parts = html_url.split("/");
    return {
      "title": row.repository,
      "typ": row.subjectType,
      "link": { "href": html_url, "text": `#${parts[parts.length - 1]}`, "tab": true },
      "message": { "text": row.title, author: { name: row.owner.name, url: avatar_url }, "cdate": row.updated_at }
    };
  });
  return /* @__PURE__ */ h("details", { open: true }, /* @__PURE__ */ h("summary", null, "notifications"), props.map((p) => /* @__PURE__ */ h(NotificationCard, { key: p.title, ...p })));
}
function apiURLtohtmlURL(url) {
  return url ? url.replace(/https:\/\/api\.github\.com\/repos\/([^\/]+)\/([^\/]+)\/(issues|pulls)\/(\d+)/, "https://github.com/$1/$2/$3/$4").replace("pulls/", "pull/") : "";
}

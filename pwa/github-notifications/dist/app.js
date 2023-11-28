import { h, Fragment, Component } from "preact";
import { useCallback, useState } from "preact/hooks";
import { NotificationCard } from "./components.js";
const STATE = {
  input: {
    username: "github-notifications",
    query: "",
    debug: false,
    participating: true
  },
  apikey: ""
};
const DEBUG = false;
export function App() {
  const [version, setVersion] = useState(1);
  const [rawrows, setRawRows] = useState(void 0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleSubmit = useCallback(async (ev) => {
    ev.preventDefault();
    setVersion((prev) => prev + 1);
    try {
      setError(null);
      const state = STATE.input;
      const { raw, data } = await REPOSITORY.fetchNotification({ query: state.query, participating: state.participating, setLoading });
      setRawRows(() => state.debug ? raw : void 0);
      setRows(() => data);
    } catch (err) {
      setError(err);
      setRows(() => []);
      throw err;
    }
  }, [version]);
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
        errorMessage = `${err.stack}`;
      } else {
        errorMessage = `ng: {err}`;
      }
      return /* @__PURE__ */ h("details", { open: true }, /* @__PURE__ */ h("summary", null, " error is occured"), /* @__PURE__ */ h("pre", { id: "output", style: { padding: "1rem", "background-color": "#fee" } }, errorMessage));
    }
    return this.props.children;
  }
}
export function InputFormPanel({ onSubmit, loading }) {
  const [username, setusername] = useState(STATE.input.username);
  const [apikey, setapikey] = useState(STATE.apikey);
  const [query, setquery] = useState(STATE.input.query);
  const [participating, setparticipating] = useState(STATE.input.participating);
  const [debug, setdebug] = useState(STATE.input.debug);
  const params = { username, apikey, query, participating, debug };
  return /* @__PURE__ */ h(Fragment, null, DEBUG && /* @__PURE__ */ h("pre", null, "input: ", JSON.stringify(params, null, 2)), DEBUG && /* @__PURE__ */ h("pre", null, "state: ", JSON.stringify(STATE.input, null, 2)), /* @__PURE__ */ h("form", { method: "POST", id: "auth-form", onSubmit }, /* @__PURE__ */ h("details", { open: true }, /* @__PURE__ */ h("summary", { role: "button", class: "secondary" }, "form"), /* @__PURE__ */ h("div", { style: { paddingLeft: "2rem" } }, /* @__PURE__ */ h("label", { htmlFor: "username" }, "username"), /* @__PURE__ */ h(
    "input",
    {
      type: "text",
      id: "username",
      autoComplete: "username",
      tabIndex: -1,
      onInput: (ev) => setusername((prev) => {
        const v = ev.currentTarget.value;
        STATE.input.username = v;
        return v;
      }),
      value: username
    }
  ), /* @__PURE__ */ h("label", { htmlFor: "password" }, "apikey"), /* @__PURE__ */ h(
    "input",
    {
      type: "password",
      id: "apikey",
      autoComplete: "current-password",
      onInput: (ev) => setapikey((prev) => {
        const v = ev.currentTarget.value;
        STATE.apikey = v;
        return v;
      }),
      value: apikey,
      tabIndex: -1
    }
  ), /* @__PURE__ */ h("label", { htmlFor: "query" }, "query"), /* @__PURE__ */ h(
    "input",
    {
      type: "search",
      id: "query",
      tabIndex: -1,
      onInput: (ev) => setquery((prev) => {
        const v = ev.currentTarget.value;
        STATE.input.query = v;
        return v;
      }),
      value: query
    }
  ), /* @__PURE__ */ h("div", { class: "grid" }, /* @__PURE__ */ h("fieldset", null, /* @__PURE__ */ h("legend", null, "participating"), /* @__PURE__ */ h("label", { htmlFor: "participating" }, /* @__PURE__ */ h(
    "input",
    {
      type: "checkbox",
      id: "participating",
      checked: participating,
      onClick: (ev) => setparticipating((prev) => {
        const v = ev.currentTarget.checked;
        STATE.input.participating = v;
        return v;
      }),
      role: "switch"
    }
  ))), /* @__PURE__ */ h("fieldset", null, /* @__PURE__ */ h("legend", null, "debug"), /* @__PURE__ */ h("label", { htmlFor: "debugStatus" }, /* @__PURE__ */ h(
    "input",
    {
      type: "checkbox",
      id: "debugStatus",
      checked: debug,
      onClick: (ev) => setdebug((prev) => {
        const v = ev.currentTarget.checked;
        STATE.input.debug = v;
        return v;
      }),
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
    const html_url = apiURLtohtmlURL(row.url);
    const avatar_url = row.owner.avatar_url.includes("?") ? `${row.owner.avatar_url}&s=80` : `${row.owner.avatar_url}?s=80&v=4`;
    const parts = html_url.split("/");
    return {
      "title": row.repository,
      "typ": row.subjectType,
      "link": { "href": html_url, "text": `#${parts[parts.length - 1]}`, "tab": true },
      "message": { "text": row.title, author: { name: row.owner.name, url: avatar_url }, "cdate": row.updated_at }
    };
  });
  return /* @__PURE__ */ h(Fragment, null, props.map((p) => /* @__PURE__ */ h(NotificationCard, { key: p.title, ...p })));
}
const REPOSITORY = {
  fetchNotification: async ({ query, participating, setLoading }) => {
    setLoading(() => true);
    let res;
    try {
      res = await CLIENT.fetchNotificationsAPI({ query, participating });
    } finally {
      setLoading(() => false);
    }
    if (res.status !== 200) {
      const errorMessage = await res.text();
      throw new Error(`ng: ${res.status} ${res.statusText}: ${errorMessage}`);
    }
    let rows = await res.json();
    if (query !== "") {
      query.split(/\s+/).forEach((q) => {
        if (q === "") {
          return;
        }
        let [k, v] = q.split(":");
        let isExclude = false;
        if (v.startsWith("-")) {
          isExclude = true;
          v = v.slice(1);
        }
        if (k === "is") {
          if (v === "unread") {
            rows = rows.filter((d) => d.unread);
          } else if (v === "read") {
            rows = rows.filter((d) => !d.unread);
          } else if (v === "issue-or-pull-request") {
            rows = rows.filter((d) => d.subject.type === "Issue" || d.subject.type === "PullRequest");
          } else if (v === "issue") {
            rows = rows.filter((d) => d.subject.type === "Issue");
          } else if (v === "pull-request") {
            rows = rows.filter((d) => d.subject.type === "PullRequest");
          } else {
            throw new Error(`unknown query: ${q}`);
          }
        } else if (k === "org") {
          rows = isExclude ? rows.filter((d) => d.repository.owner.login !== v) : rows.filter((d) => d.repository.owner.login === v);
        } else if (k === "repo") {
          rows = isExclude ? rows.filter((d) => d.repository.full_name !== v) : rows.filter((d) => d.repository.full_name === v);
        } else if (k === "author") {
        } else {
          throw new Error(`unknown query: ${q}`);
        }
      });
    }
    return {
      raw: rows,
      data: rows.map((d) => {
        const id = d.id;
        const last_read_at = d.last_read_at;
        const latest_comment_url = d.subject.latest_comment_url;
        const title = d.subject.title;
        const repository = d.repository.full_name;
        const subjectType = d.subject.type;
        const url = d.subject.url;
        const owner = { name: d.repository.owner.login, avatar_url: d.repository.owner.avatar_url };
        return { id, title, repository, url, subjectType, owner, reason: d.reason, updated_at: d.updated_at, last_read_at, latest_comment_url };
      })
    };
  }
};
export const apiClient = {
  fetchNotificationsAPI: async ({ query, participating }) => {
    const headers = apiHeaders(STATE.apikey);
    let url = "https://api.github.com/notifications";
    const qs = ["per_page=50", "all=false"];
    if (query !== "") {
      qs.push(`query=${encodeURIComponent(query)}`);
    }
    if (participating) {
      qs.push(`participating=${participating}`);
    }
    if (qs.length > 0) {
      url += "?" + qs.join("&");
    }
    const res = await fetch(url, { headers });
    return res;
  }
};
let CLIENT = apiClient;
export function setAPIClient(client) {
  const prev = CLIENT;
  CLIENT = client;
  return prev;
}
function apiHeaders(apikey) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `token ${apikey}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}
function apiURLtohtmlURL(url) {
  return url ? url.replace(/https:\/\/api\.github\.com\/repos\/([^\/]+)\/([^\/]+)\/(issues|pulls)\/(\d+)/, "https://github.com/$1/$2/$3/$4").replace("pulls/", "pull/") : "";
}

import { h, Fragment } from "preact";
import { useCallback, useState } from "preact/hooks";
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
export function InputForm({ onSubmit, loading }) {
  const [username, setusername] = useState(STATE.input.username);
  const [apikey, setapikey] = useState(STATE.apikey);
  const [query, setquery] = useState(STATE.input.query);
  const [participating, setparticipating] = useState(STATE.input.participating);
  const [debug, setdebug] = useState(STATE.input.debug);
  const params = { username, apikey, query, participating, debug };
  return /* @__PURE__ */ h(Fragment, null, DEBUG && /* @__PURE__ */ h("pre", null, "input: ", JSON.stringify(params, null, null)), DEBUG && /* @__PURE__ */ h("pre", null, "state: ", JSON.stringify(STATE.input, null, null)), /* @__PURE__ */ h("form", { method: "POST", id: "auth-form", onSubmit }, /* @__PURE__ */ h("details", { open: true }, /* @__PURE__ */ h("summary", { role: "button", class: "secondary" }, "form"), /* @__PURE__ */ h("div", { style: { paddingLeft: "2rem" } }, /* @__PURE__ */ h("label", { htmlFor: "username" }, "username"), /* @__PURE__ */ h(
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
export function OutputPanel({ input, output, version, errorMessage }) {
  const style = { padding: "1rem" };
  if (errorMessage !== "") {
    return /* @__PURE__ */ h("pre", { id: "output", style: { ...style, "background-color": "#fee" } }, errorMessage);
  }
  return /* @__PURE__ */ h("pre", { id: "output", style }, "version", version, ": ", output);
}
export function App() {
  const [version, setversion] = useState(1);
  const [output, setoutput] = useState("");
  const [loading, setloading] = useState(false);
  const [errorMessage, seterrorMessage] = useState("");
  const handleSubmit = useCallback(async (ev) => {
    ev.preventDefault();
    setversion((prev) => prev + 1);
    try {
      const state = STATE.input;
      const query = state.query;
      setloading(() => true);
      const res = await fetchNotifications({ query, apikey: STATE.apikey, participating: state.participating });
      setloading(() => false);
      if (res.status !== 200) {
        seterrorMessage(`ng: ${res.status} ${res.statusText}: ${await res.text()}`);
        return;
      }
      let rows = await res.json();
      rows = filterResponseData({ rows, query, debug: state.debug });
      setoutput(JSON.stringify(rows, null, 2));
      seterrorMessage("");
    } catch (err) {
      seterrorMessage(`err: ${err}

${err.stack}`);
      throw err;
    }
  }, [version]);
  return /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("h1", { class: "title" }, "GitHub Notifications"), /* @__PURE__ */ h(InputForm, { onSubmit: handleSubmit, loading }), /* @__PURE__ */ h("p", null, /* @__PURE__ */ h("a", { href: "https://github.com/settings/tokens", target: "_blank" }, "please set PAT(personal access token)")), /* @__PURE__ */ h(OutputPanel, { input: STATE.input, output, version, errorMessage }));
}
async function fetchNotifications({ apikey, query, participating }) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": `token ${apikey}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
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
export function filterResponseData({ rows, query, debug }) {
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
  if (!debug) {
    rows = rows.map((d) => {
      const id = d.id;
      const last_read_at = d.last_read_at;
      const latest_comment_url = d.subject.latest_comment_url;
      const title = d.subject.title;
      const repository = d.repository.full_name;
      const subjectType = d.subject.type;
      const url = d.subject.url;
      const owner = { name: d.repository.owner.login, avatar_url: d.repository.owner.avatar_url };
      return { id, title, repository, url, subjectType, owner, reason: d.reason, updated_at: d.updated_at, last_read_at, latest_comment_url };
    });
  }
  return rows;
}

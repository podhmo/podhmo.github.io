import { signal } from "@preact/signals";
export const STATE = {
  input: {
    username$: signal("github-notifications"),
    query$: signal(""),
    participating$: signal(true),
    debug$: signal(false)
  },
  apikey$: signal("")
};
export const REPOSITORY = {
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
        if (v === void 0) {
          return;
        }
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
    const headers = apiHeaders(STATE.apikey$.value);
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

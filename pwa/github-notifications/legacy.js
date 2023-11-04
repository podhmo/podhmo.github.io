async function fetchNotifications({ apikey, query, participating }) {
    // https://docs.github.com/en/rest/activity/notifications?apiVersion=2022-11-28
    const headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${apikey}`,
        "X-GitHub-Api-Version": "2022-11-28"
    };

    let url = "https://api.github.com/notifications";
    const qs = ["per_page=50", "all=false"];
    if (query !== "") {
        qs.push(`query=${encodeURIComponent(query)}`)
    }
    if (participating) {
        qs.push(`participating=${participating}`)
    }
    if (qs.length > 0) {
        url += "?" + qs.join("&")
    }
    const res = await fetch(url, { headers });
    return res
}

function setOutput(text) {
    document.querySelector("#output").innerHTML = text;
}

document.querySelector("#auth-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    // console.log("submit ev:%o", ev);

    try {
        const state = {
            apikey: ev.target.querySelector("#apikey").value,
            query: ev.target.querySelector("#query").value,
            debug: ev.target.querySelector("#debugStatus").checked,
            participating: ev.target.querySelector("#participating").checked
        };

        const res = await fetchNotifications({ query: state.query, apikey: state.apikey, participating: state.participating })
        if (res.status !== 200) {
            setOutput(`ng: ${res.status} ${res.statusText}: ${await res.text()}`);
            return;
        }

        let rows = await res.json();

        if (state.query !== "") { // 手抜きの query
            // e.g. `is:unread org:encode`
            state.query.split(/\s+/).forEach((q) => {
                if (q === "") {
                    return
                }

                let [k, v] = q.split(":")
                let isExclude = false;
                if (v.startsWith("-")) {
                    isExclude = true;
                    v = v.slice(1)
                }

                if (k === "is") { // TODO: done,check-suite,commit,gist,release
                    if (v === "unread") {
                        rows = rows.filter((d) => d.unread)
                    } else if (v === "read") {
                        rows = rows.filter((d) => !d.unread)
                    } else if (v === "issue-or-pull-request") {
                        rows = rows.filter((d) => d.subject.type === "Issue" || d.subject.type === "PullRequest")
                    } else if (v === "issue") {
                        row = rows.filter((d) => d.subject.type === "Issue")
                    } else if (v === "pull-request") {
                        rows = rows.filter((d) => d.subject.type === "PullRequest")
                    } else {
                        throw new Error(`unknown query: ${q}`)
                    }
                } else if (k === "org") {
                    rows = isExclude ? rows.filter((d) => d.repository.owner.login !== v) : rows.filter((d) => d.repository.owner.login === v)
                } else if (k === "repo") {
                    rows = isExclude ? rows.filter((d) => d.repository.full_name !== v) : rows.filter((d) => d.repository.full_name === v)
                } else if (k === "author") {
                    // not supported
                    //  rows = rows.filter((d) => d.subject.latest_comment_url.includes(v))
                } else {
                    // TODO: reason
                    throw new Error(`unknown query: ${q}`)
                }
            })
        }

        if (!state.debug) {
            rows = rows.map((d) => {
                const id = d.id
                const last_read_at = d.last_read_at;
                const latest_comment_url = d.subject.latest_comment_url;
                const title = d.subject.title;
                const repository = d.repository.full_name;
                const subjectType = d.subject.type;
                const url = d.subject.url; // null if d.subject.type === "Discussion"
                const owner = { name: d.repository.owner.login, avatar_url: d.repository.owner.avatar_url };
                return { id, title, repository, url, subjectType, owner: owner, reason: d.reason, updated_at: d.updated_at, last_read_at, latest_comment_url };
            })
        }
        setOutput(JSON.stringify(rows, null, 2));
    } catch (err) {
        setOutput(`err: ${err}\n\n${err.stack}`);
        throw err;
    }
})

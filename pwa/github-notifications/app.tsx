import { h, Fragment } from 'preact';
import { useCallback, useState } from 'preact/hooks'
import type { ComponentChildren } from "preact";

const STATE = {
    input: {
        username: "github-notifications",
        query: "",
        debug: false,
        participating: true,
    },
    apikey: ""
}

const DEBUG = false;
type todofixSubmitHandler = any

export function InputForm({ onSubmit, loading }: { onSubmit: todofixSubmitHandler; loading: boolean }) {
    const [username, setusername] = useState(STATE.input.username);
    const [apikey, setapikey] = useState(STATE.apikey);
    const [query, setquery] = useState(STATE.input.query);
    const [participating, setparticipating] = useState(STATE.input.participating);
    const [debug, setdebug] = useState(STATE.input.debug); // todo: rename to verbose

    const params = { username, apikey, query, participating, debug };
    return (<>
        {DEBUG && <pre>input: {JSON.stringify(params, null, null)}</pre>}
        {DEBUG && <pre>state: {JSON.stringify(STATE.input, null, null)}</pre>}
        <form method="POST" id="auth-form" onSubmit={onSubmit}>
            <details open>
                <summary role="button" class="secondary">form</summary>
                <div style={{ paddingLeft: "2rem" }}>
                    <label htmlFor="username">username</label>
                    <input
                        type="text"
                        id="username"
                        autoComplete="username"
                        tabIndex={-1}
                        onInput={(ev) => setusername((prev) => { const v = ev.currentTarget.value; STATE.input.username = v; return v })}
                        value={username}
                    />
                    <label htmlFor="password">apikey</label>
                    <input
                        type="password"
                        id="apikey"
                        autoComplete="current-password"
                        onInput={(ev) => setapikey((prev) => { const v = ev.currentTarget.value; STATE.apikey = v; return v })}
                        value={apikey}
                        tabIndex={-1}
                    />
                    <label htmlFor="query">query</label>
                    <input
                        type="search"
                        id="query"
                        tabIndex={-1}
                        onInput={(ev) => setquery((prev) => { const v = ev.currentTarget.value; STATE.input.query = v; return v })}
                        value={query}
                    />
                    <div class="grid">
                        <fieldset>
                            <legend>participating</legend>
                            <label htmlFor="participating">
                                <input
                                    type="checkbox"
                                    id="participating"
                                    checked={participating}
                                    onClick={(ev) => setparticipating((prev) => { const v = ev.currentTarget.checked; STATE.input.participating = v; return v })}
                                    role="switch"
                                />
                            </label>
                        </fieldset>
                        <fieldset>
                            <legend>debug</legend>
                            <label htmlFor="debugStatus">
                                <input
                                    type="checkbox"
                                    id="debugStatus"
                                    checked={debug}
                                    onClick={(ev) => setdebug((prev) => { const v = ev.currentTarget.checked; STATE.input.debug = v; return v })}
                                    role="switch" />
                            </label>
                        </fieldset>
                    </div>
                </div>
            </details>
            <button type="submit" tabIndex={-1} aria-busy={loading ? "true" : "false"}>
                fetch
            </button>
        </form>
    </>
    )
}

export function OutputPanel({ input, output, version, errorMessage }: { input?: any; output?: string; version: number; errorMessage?: string }) {
    const style = { padding: "1rem" };
    if (errorMessage !== "") {
        return (<pre id="output" style={{ ...style, "background-color": "#fee" }}>{errorMessage}</pre>)
    }
    // return (<pre id="output" style={style}>version{version}: {JSON.stringify(input, null, null)}</pre>)
    return (<pre id="output" style={style}>version{version}: {output}</pre>)
}



export function App() {
    const [version, setversion] = useState(1);
    const [output, setoutput] = useState("");
    const [loading, setloading] = useState(false);
    const [errorMessage, seterrorMessage] = useState("");

    const handleSubmit = useCallback(async (ev) => {
        ev.preventDefault()
        // console.log("submit ev:%o", ev);

        setversion((prev) => prev + 1) // TODO: cache
        // console.log("state: ", JSON.stringify(STATE, null, null));
        try {
            const state = STATE.input;
            const query = state.query

            setloading(() => true);
            const res = await fetchNotifications({ query, apikey: STATE.apikey, participating: state.participating })
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
            seterrorMessage(`err: ${err}\n\n${err.stack}`);
            throw err;
        }
    }, [version])
    return (
        <>
            <h1 class="title">GitHub Notifications</h1>
            <InputForm onSubmit={handleSubmit} loading={loading}></InputForm>
            <p><a href="https://github.com/settings/tokens" target="_blank">please set PAT(personal access token)</a></p>
            <OutputPanel input={STATE.input} output={output} version={version} errorMessage={errorMessage}></OutputPanel>
        </>
    );
}

// ----------------------------------------
// helpers
// ----------------------------------------
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
    // TODO: abort controller
    const res = await fetch(url, { headers });
    return res
}


export function filterResponseData({ rows, query, debug }) {
    if (query !== "") { // 手抜きの query
        // e.g. `is:unread org:encode`
        query.split(/\s+/).forEach((q) => {
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
                    rows = rows.filter((d) => d.subject.type === "Issue")
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
    
    if (!debug) {
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
    return rows
}

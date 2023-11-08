import { h, Fragment } from 'preact';
import { useCallback, useState } from 'preact/hooks'

import type { ComponentChildren } from "preact";
import type { StateUpdater } from 'preact/hooks';

// my components
import { NotificationCard } from './components.js';

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


export function App() {
    const [version, setVersion] = useState<number>(1);

    const [rawrows, setRawRows] = useState<Array<any> | undefined>(undefined);
    const [rows, setRows] = useState<Array<NotificationType>>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const onError = useCallback((err: Error) => {
        setErrorMessage(() => `err: ${err}\n\n${err.stack}`);
    }, [])

    const handleSubmit = useCallback(async (ev) => {
        ev.preventDefault()
        // console.log("submit ev:%o", ev);

        setVersion((prev) => prev + 1)
        // console.log("state: ", JSON.stringify(STATE, null, null));

        try {
            const state = STATE.input;
            const { raw, data } = await REPOSITORY.fetchNotification({ query: state.query, participating: state.participating, setLoading });
            setRawRows(() => state.debug ? raw : undefined)
            setRows(() => data);
            setErrorMessage(() => "");
        } catch (err) {
            onError(err);
            setRows(() => []);
            throw err;
        }
    }, [version])


    return (
        <>
            <h1 class="title">GitHub Notifications</h1>
            <InputFormPanel onSubmit={handleSubmit} loading={loading}></InputFormPanel>
            <p><a href="https://github.com/settings/tokens" target="_blank">please set PAT(personal access token)</a></p>

            <RawOutputPanel input={STATE.input} data={rawrows || rows} version={version} errorMessage={errorMessage}></RawOutputPanel>

            {rows && <CardListPanel rows={rows} onError={onError}></CardListPanel>}
        </>
    );
}

export function InputFormPanel({ onSubmit, loading }: { onSubmit: todofixSubmitHandler; loading: boolean }) {
    const [username, setusername] = useState<string>(STATE.input.username);
    const [apikey, setapikey] = useState<string>(STATE.apikey);
    const [query, setquery] = useState<string>(STATE.input.query);
    const [participating, setparticipating] = useState<boolean>(STATE.input.participating);
    const [debug, setdebug] = useState<boolean>(STATE.input.debug); // todo: rename to verbose

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

export function RawOutputPanel({ input, data, version, errorMessage }: { input?: any; data?: Array<any>; version: number; errorMessage?: string }) {
    const style = { padding: "1rem" };
    if (errorMessage !== "") {
        return (
            <details open>
                <summary> raw response</summary>
                <pre id="output" style={{ ...style, "background-color": "#fee" }}>{errorMessage}</pre>
            </details>
        );
    }

    // return (<pre id="output" style={style}>version{version}: {JSON.stringify(input, null, null)}</pre>)
    return (
        <details>
            <summary> raw response</summary>
            <pre id="output" style={style}>version{version}: {JSON.stringify(data, null, 2)}</pre>
        </details>
    );
}

function CardListPanel({ rows, onError, children }: { rows: Array<any>, onError: (err: Error) => void, children?: ComponentChildren }) {
    try {
        const props = rows.map((row) => {
            const html_url = apiURLtohtmlURL(row.url);
            const avatar_url = row.owner.avatar_url.includes("?") ? `${row.owner.avatar_url}&s=80` : `${row.owner.avatar_url}?s=80&v=4`;
            const parts = html_url.split("/");
            return {
                "title": row.repository,
                "typ": row.subjectType,
                "link": { "href": html_url, "text": `#${parts[parts.length - 1]}`, "tab": true },
                "message": { "text": row.title, author: { name: row.owner.name, url: avatar_url }, "cdate": row.updated_at }
            }
        });
        return (<>{props.map((p) => <NotificationCard key={p.title} {...p}></NotificationCard>)}</>)
    } catch (err) {
        onError(err);
        return
    }
}


// ----------------------------------------
// model
// ----------------------------------------

type NotificationType = {
    id: string;
    title: string;
    repository: string;
    url: string;
    subjectType: string;
    owner: { name: string; avatar_url: string; };
    reason: string;
    updated_at: string;
    last_read_at: string;
    latest_comment_url: string;
}


const REPOSITORY = {
    fetchNotification: async ({ query, participating, setLoading }: { query: string, participating: boolean, setLoading: StateUpdater<boolean | undefined> }): Promise<{ raw: any[], data: NotificationType[] }> => {
        setLoading(() => true);
        let res: Response;
        try {
            res = await CLIENT.fetchNotificationsAPI({ query, participating })
            setLoading(() => false);
        } catch (err) {
            setLoading(() => false);
            throw err;
        }

        if (res.status !== 200) {
            const errorMessage = await res.text();
            throw new Error(`ng: ${res.status} ${res.statusText}: ${errorMessage}`);
        }

        let rows = await res.json() as any[]; // xxx:
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

        return {
            raw: rows, data: rows.map((d: any): NotificationType => {
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
    }
}

// ----------------------------------------
// APIClient
// ----------------------------------------

interface IAPIClient {
    fetchNotificationsAPI({ query, participating }: { query: string; participating: boolean }): Promise<Response>;
}

export const apiClient: IAPIClient = {
    fetchNotificationsAPI: async ({ query, participating }: { query: string; participating: boolean }): Promise<Response> => {
        const headers = apiHeaders(STATE.apikey);
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
}

let CLIENT = apiClient;
export function setAPIClient(client: IAPIClient): IAPIClient {
    const prev = CLIENT;
    CLIENT = client;
    return prev;
}

// ----------------------------------------
// helpers
// ----------------------------------------
function apiHeaders(apikey: string): Record<string, string> {
    // https://docs.github.com/en/rest/activity/notifications?apiVersion=2022-11-28
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${apikey}`,
        "X-GitHub-Api-Version": "2022-11-28"
    };
}

function apiURLtohtmlURL(url: string): string {
    // TODO: support discussion
    // https://api.github.com/repos/<owner>/<repository>/pulls/<number> => https://github.com/<owner>/<repository>/pull/<number>
    // https://api.github.com/repos/<owner>/<repository>/issuess/<number> => https://github.com/<owner>/<repository>/issues/<number>
    return url ? url.replace(/https:\/\/api\.github\.com\/repos\/([^\/]+)\/([^\/]+)\/(issues|pulls)\/(\d+)/, "https://github.com/$1/$2/$3/$4").replace("pulls/", "pull/") : "";
}

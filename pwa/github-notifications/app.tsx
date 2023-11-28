import { h, Fragment, Component } from 'preact';
import { useCallback, useState } from 'preact/hooks'
import { signal } from '@preact/signals'

import type { ComponentChildren } from "preact";
import type { StateUpdater } from 'preact/hooks';
import type { JSX } from "preact";

// my components
import { NotificationCard } from './components.js';

const STATE = {
    input: {
        username: signal<string>("github-notifications"),
        query: signal<string>(""),
        participating: signal<boolean>(true),
        debug: signal<boolean>(false)
    },
    apikey: signal<string>(""),
}

const DEBUG = false;


export function App() {
    const [version, setVersion] = useState(1);

    const [rawrows, setRawRows] = useState<Array<any> | undefined>(undefined);
    const [rows, setRows] = useState<Array<NotificationType>>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | undefined>(undefined)

    const handleSubmit = useCallback(async (ev: JSX.TargetedEvent<HTMLFormElement>) => {
        ev.preventDefault()
        // console.log("submit ev:%o", ev);

        setVersion((prev) => prev + 1)
        // console.log("state: ", JSON.stringify(STATE, null, null));
        try {
            setError(undefined);
            const { raw, data } = await REPOSITORY.fetchNotification({ query: STATE.input.query.value, participating: STATE.input.participating.value, setLoading });
            setRawRows(() => STATE.input.debug ? raw : undefined)
            setRows(() => data);
        } catch (err) {
            setError(err)
            setRows(() => []);
            throw err;
        }
    }, [])


    return (
        <>
            <h1 class="title">GitHub Notifications</h1>
            <InputFormPanel onSubmit={handleSubmit} loading={loading}></InputFormPanel>
            <p>
                <a href="https://github.com/settings/tokens" target="_blank">
                    please set PAT(personal access token)
                </a>
            </p>

            <ErrorBoundary error={error}>
                <RawOutputPanel
                    input={STATE.input}
                    data={rawrows || rows}
                    version={version}></RawOutputPanel>
                {rows && <CardListPanel rows={rows}></CardListPanel>}
            </ErrorBoundary>
        </>
    );
}

class ErrorBoundary extends Component<{ error?: Error }, { error?: Error }> {
    componentDidCatch(err: Error) {
        this.setState({ error: err })
    }
    render() {
        const err = this.state.error || this.props.error;
        if (err) {
            let errorMessage = "";
            if (err instanceof Error) {
                errorMessage = `${err}\n${err.stack}`;
            } else {
                errorMessage = `ng: {err}`;
            }
            return (
                <details open>
                    <summary> error is occured</summary>
                    <pre id="output" style={{ padding: "1rem", "background-color": "#fee" }}>{errorMessage}</pre>
                </details>
            )
        }
        return this.props.children
    }
}

export function InputFormPanel({
    onSubmit,
    loading,
}: {
    onSubmit: (ev: JSX.TargetedEvent<HTMLFormElement>) => void,
    loading: boolean;
}) {
    const input = STATE.input; // signals

    const handleUsernameChange = useCallback(
        (ev: JSX.TargetedEvent<HTMLInputElement>) => {
            if (ev.currentTarget) { input.username.value = ev.currentTarget.value; }
        },
        []
    );

    const handleApikeyChange = useCallback(
        (ev: JSX.TargetedEvent<HTMLInputElement>) => {
            if (ev.currentTarget) { STATE.apikey.value = ev.currentTarget.value; }
        },
        []
    );

    const handleQueryChange = useCallback(
        (ev: JSX.TargetedEvent<HTMLInputElement>) => {
            if (ev.currentTarget) { input.query.value = ev.currentTarget.value; }
        },
        []
    );

    const handleParticipatingChange = useCallback(
        (ev: JSX.TargetedEvent<HTMLInputElement>) => {
            if (ev.currentTarget) { input.participating.value = ev.currentTarget.checked; }
        },
        []
    );

    const handleDebugChange = useCallback(
        (ev: JSX.TargetedEvent<HTMLInputElement>) => {
            if (ev.currentTarget) { input.debug.value = ev.currentTarget.checked; }
        },
        []
    );

    return (<>
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
                        onInput={handleUsernameChange}
                        value={input.username.value}
                    />
                    <label htmlFor="password">apikey</label>
                    <input
                        type="text"
                        id="apikey"
                        autoComplete="current-password"
                        tabIndex={-1}
                        onInput={handleApikeyChange}
                        value={STATE.apikey.value}
                    />
                    <label htmlFor="query">query</label>
                    <input
                        type="search"
                        id="query"
                        tabIndex={-1}
                        onInput={handleQueryChange}
                        value={input.query.value}
                    />
                    <div class="grid">
                        <fieldset>
                            <legend>participating</legend>
                            <label htmlFor="participating">
                                <input
                                    type="checkbox"
                                    id="participating"
                                    checked={input.participating.value}
                                    onClick={handleParticipatingChange}
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
                                    checked={input.debug.value}
                                    onClick={handleDebugChange}
                                    role="switch"
                                />
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
    );
}


export function RawOutputPanel({ input, data, version }: { input: typeof STATE.input; data?: Array<any>; version: number }) {
    const style = { padding: "1rem" };
    // return (<pre id="output" style={style}>version{version}: {JSON.stringify(input, null, null)}</pre>)
    return (
        <details>
            <summary> raw response</summary>
            <pre id="output" style={style}>version{version}: {JSON.stringify(data, null, 2)}</pre>
        </details>
    );
}

function CardListPanel({ rows, children }: { rows: Array<any>, children?: ComponentChildren }) {
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
    return (
        <details open>
            <summary>notifications</summary>
            {props.map((p) => <NotificationCard key={p.title} {...p}></NotificationCard>)}
        </details>
    );
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
    fetchNotification: async ({ query, participating, setLoading }: { query: string, participating: boolean, setLoading: StateUpdater<boolean> }): Promise<{ raw: any[], data: NotificationType[] }> => {
        setLoading(() => true);
        let res: Response;
        try {
            res = await CLIENT.fetchNotificationsAPI({ query, participating })
        } finally {
            setLoading(() => false);
        }

        if (res.status !== 200) {
            const errorMessage = await res.text();
            throw new Error(`ng: ${res.status} ${res.statusText}: ${errorMessage}`);
        }

        let rows = await res.json(); // xxx:
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
        const headers = apiHeaders(STATE.apikey.value);
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

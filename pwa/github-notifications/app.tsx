import { h, Fragment, Component } from 'preact';
import { useCallback, useState } from 'preact/hooks'

import type { ComponentChildren } from "preact";
import type { JSX } from "preact";
import type { Type as NotificationResponseType} from "./types/notification.ts"

// my components
import { NotificationCard } from './components.js';

// repository
import { REPOSITORY, STATE } from './state.js';
import type { NotificationType } from './state.js';

export function App() {
    const [version, setVersion] = useState(1);

    const [rawrows, setRawRows] = useState<Array<NotificationResponseType> | undefined>(undefined);
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


export function RawOutputPanel({ input, data, version }: { input: typeof STATE.input; data?: Array<NotificationType | NotificationResponseType>; version: number }) {
    const style = { padding: "1rem" };
    // return (<pre id="output" style={style}>version{version}: {JSON.stringify(input, null, null)}</pre>)
    return (
        <details>
            <summary> raw response</summary>
            <pre id="output" style={style}>version{version}: {JSON.stringify(data, null, 2)}</pre>
        </details>
    );
}

function CardListPanel({ rows, children }: { rows: NotificationType[], children?: ComponentChildren }) {
    const props = rows.map((row) => {
        const html_url = apiURLtohtmlURL(row.url || "");
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
// helpers
// ----------------------------------------

function apiURLtohtmlURL(url: string): string {
    // TODO: support discussion
    // https://api.github.com/repos/<owner>/<repository>/pulls/<number> => https://github.com/<owner>/<repository>/pull/<number>
    // https://api.github.com/repos/<owner>/<repository>/issuess/<number> => https://github.com/<owner>/<repository>/issues/<number>
    return url ? url.replace(/https:\/\/api\.github\.com\/repos\/([^\/]+)\/([^\/]+)\/(issues|pulls)\/(\d+)/, "https://github.com/$1/$2/$3/$4").replace("pulls/", "pull/") : "";
}


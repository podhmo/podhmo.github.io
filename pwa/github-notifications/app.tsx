import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks'
import type { ComponentChildren } from "preact";

const state = {
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

export function InputForm({ onSubmit }: { onSubmit: todofixSubmitHandler }) {
    const [username, setusername] = useState(state.input.username);
    const [apikey, setapikey] = useState(state.apikey);
    const [query, setquery] = useState(state.input.query);
    const [participating, setparticipating] = useState(state.input.participating);
    const [debug, setdebug] = useState(state.input.debug); // todo: rename to verbose

    const params = { username, apikey, query, participating, debug };
    return (<>
        {DEBUG && <pre>input: {JSON.stringify(params, null, null)}</pre>}
        {DEBUG && <pre>state: {JSON.stringify(state.input, null, null)}</pre>}
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
                        onInput={(ev) => setusername((prev) => { const v = ev.currentTarget.value; state.input.username = v; return v })}
                        value={username}
                    />
                    <label htmlFor="password">apikey</label>
                    <input
                        type="password"
                        id="apikey"
                        autoComplete="current-password"
                        onInput={(ev) => setapikey((prev) => { const v = ev.currentTarget.value; state.apikey = v; return v })}
                        value={apikey}
                        tabIndex={-1}
                    />
                    <label htmlFor="query">query</label>
                    <input
                        type="search"
                        id="query"
                        tabIndex={-1}
                        onInput={(ev) => setquery((prev) => { const v = ev.currentTarget.value; state.input.query = v; return v })}
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
                                    onClick={(ev) => setparticipating((prev) => { const v = ev.currentTarget.checked; state.input.participating = v; return v })}
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
                                    onClick={(ev) => setdebug((prev) => { const v = ev.currentTarget.checked; state.input.debug = v; return v })}
                                    role="switch" />
                            </label>
                        </fieldset>
                    </div>
                </div>
            </details>
            <button type="submit" tabIndex={-1}>
                fetch
            </button>
        </form>
    </>
    )
}

export function App() {
    const handleSubmit = (ev) => {
        ev.preventDefault()
        console.log("ababa: ", JSON.stringify(state, null, null));
    }
    return (
        <>
            <h1 class="title">GitHub Notifications</h1>
            <InputForm onSubmit={handleSubmit}></InputForm>
            <p><a href="https://github.com/settings/tokens" target="_blank">please set PAT(personal access token)</a></p>
            <pre id="output"></pre>
        </>
    );
}
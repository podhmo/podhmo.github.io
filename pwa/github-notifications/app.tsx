import { h, Fragment } from 'preact';
import type { ComponentChildren } from "preact";

export function App() {
    return (
        <>
            <h1 class="title">GitHub Notifications</h1>
            <form method="POST" id="auth-form">
                <details open>
                    <summary role="button" class="secondary">
                        form
                    </summary>
                    <div style={{ paddingLeft: "2rem" }}>
                        <label htmlFor="username">username</label>
                        <input
                            type="text"
                            id="username"
                            autoComplete="username"
                            tabIndex={-1}
                            defaultValue="github-notifications"
                        />
                        <label htmlFor="password">apikey</label>
                        <input
                            type="password"
                            id="apikey"
                            autoComplete="current-password"
                            tabIndex={-1}
                        />
                        <label htmlFor="query">query</label>
                        <input
                            type="search"
                            id="query"
                            tabIndex={-1}
                            defaultValue="is:unread"
                        />
                        <div class="grid">
                            <fieldset>
                                <legend>participating</legend>
                                <label htmlFor="participating">
                                    <input
                                        type="checkbox"
                                        id="participating"
                                        defaultChecked={true}
                                        role="switch"
                                    />
                                </label>
                            </fieldset>
                            <fieldset>
                                <legend>debug</legend>
                                <label htmlFor="debugStatus">
                                    <input type="checkbox" id="debugStatus" role="switch" />
                                </label>
                            </fieldset>
                        </div>
                    </div>
                </details>
                <button type="submit" tabIndex={-1}>
                    fetch
                </button>
            </form>
            <a href="https://github.com/settings/tokens" target="_blank">
                please set PAT(personal access token)
            </a>
            <pre id="output">
                {"\n"}
                {"        "}
            </pre>
        </>
    );
}
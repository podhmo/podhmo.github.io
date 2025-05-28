# Go Simple Static File Server with CORS and GitHub OAuth Proxy

This is a simple static file server written in Go, similar in basic functionality to `python -m http.server`.
It is designed with Single Page Applications (SPAs) in mind, providing:
1.  Cross-Origin Resource Sharing (CORS) headers for serving static assets.
2.  An optional proxy for GitHub OAuth token endpoint to help SPAs with PKCE flow by avoiding direct browser-to-GitHub CORS issues.

## Features

-   Serves static files from a specified directory (defaults to the current directory).
-   Configurable port (defaults to 3333).
-   CORS headers for static assets.
-   Handles `OPTIONS` (preflight) requests for static assets.
-   Structured logging using Go's standard `log/slog` package.
-   **Optional GitHub OAuth Token Proxy**:
    -   When enabled, provides an endpoint (default: `/api/github/token`) that proxies requests to `https://github.com/login/oauth/access_token`.
    -   This helps SPAs perform the token exchange part of the OAuth PKCE flow without running into CORS problems.
-   **Debug Logging**: Includes a `-debug-http` flag to enable detailed logging of requests and responses for the GitHub proxy.

## Prerequisites

-   Go 1.21 or later (for `log/slog` package).

## Build

```bash
go build -o static-server main.go
```

## Usage

### Basic usage:

```bash
./static-server
```

### Enable GitHub OAuth Token Proxy:

```bash
./static-server -enable-github-proxy
```
Your SPA should send its token request to `http://localhost:<port>/api/github/token`.

### Enable Detailed HTTP Debugging for Proxy:

If you are troubleshooting issues with the GitHub proxy, use the `-debug-http` flag. This will output detailed information about the requests sent to GitHub and the responses received.
Make sure your logger level is set to Debug to see these messages. The `-debug-http` flag now automatically sets the log level to Debug.

```bash
./static-server -enable-github-proxy -debug-http
```

This will produce logs like:
-   Headers and body of the request received by the proxy from your client.
-   Headers and body of the request sent by the proxy to GitHub.
-   Headers and body of the response received by the proxy from GitHub.

### Other Flags:

-   `-port <number>`: Port to serve on (default: 3333 or `PORT` env var).
-   `-dir <path>`: Directory to serve files from (default: current directory).
-   `-github-proxy-path <path>`: Local path for the proxy endpoint (default: `/api/github/token`).
-   `-github-token-url <url>`: Target GitHub token URL (default: `https://github.com/login/oauth/access_token`).

## How to Use the Debug Logs

1.  Run the server with `-enable-github-proxy -debug-http`.
2.  Trigger the OAuth flow in your SPA so it makes a request to the proxy endpoint.
3.  Observe the console output from the `static-server`.
    -   Look for logs prefixed with `GitHub proxy: Sending request to GitHub`. This will show the exact headers and body being sent by the proxy.
    -   Compare this to the request details that work when you "directly call" the GitHub API (e.g., from Postman or a browser's network tab if that specific direct call was successful without CORS issues).
    -   Pay close attention to `Content-Type`, `Accept` headers, and the request `body`. Ensure the `client_id`, `code`, `redirect_uri`, and `code_verifier` in the body are exactly as expected by GitHub.
    -   Check the logs for `GitHub proxy: Received response details from GitHub`. This will show GitHub's exact response (status, headers, body), which led to the `incorrect_client_credentials` error.

This detailed logging should help identify any discrepancies between what your SPA intends to send, what the proxy actually sends, and what GitHub expects.
The most common reasons for `incorrect_client_credentials` in a PKCE flow are:
-   Incorrect `client_id`.
-   `code` is invalid (expired, already used, or doesn't match the `client_id` and `redirect_uri`).
-   `redirect_uri` in the token request does not exactly match the `redirect_uri` used in the authorization request.
-   `code_verifier` does not match the `code_challenge` that was sent in the initial authorization request.
-   The request body is not correctly formatted as `application/x-www-form-urlencoded` (or `application/json` if GitHub supports that for this endpoint and your client is configured for it).
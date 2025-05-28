# Go Simple Static File Server with CORS and GitHub OAuth Proxy

This is a simple static file server written in Go, similar in basic functionality to `python -m http.server`.
It is designed with Single Page Applications (SPAs) in mind, providing:
1.  Cross-Origin Resource Sharing (CORS) headers for serving static assets.
2.  An optional proxy for GitHub OAuth token endpoint to help SPAs with PKCE flow by avoiding direct browser-to-GitHub CORS issues.

## Features

-   Serves static files from a specified directory (defaults to the current directory).
-   Configurable port (defaults to 3333).
-   CORS headers for static assets:
    -   `Access-Control-Allow-Origin: *` (configurable in code for production)
    -   `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
    -   `Access-Control-Allow-Headers: Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Origin`
    -   `Access-Control-Allow-Credentials: true`
-   Handles `OPTIONS` (preflight) requests for static assets.
-   Structured logging using Go's standard `log/slog` package.
-   **Optional GitHub OAuth Token Proxy**:
    -   When enabled, provides an endpoint (default: `/api/github/token`) that proxies requests to `https://github.com/login/oauth/access_token`.
    -   This helps SPAs perform the token exchange part of the OAuth PKCE flow without running into CORS problems, as the request to GitHub is made server-to-server.

## Prerequisites

-   Go 1.21 or later (for `log/slog` package).

## Build

To build the server, navigate to the directory containing `main.go` and run:

```bash
go build -o static-server main.go
```

This will create an executable named `static-server` (or `static-server.exe` on Windows).

## Usage

You can run the server from the command line.

### Basic usage (serves current directory on port 3333, proxy disabled):

```bash
./static-server
```
or
```bash
go run main.go
```

### Specify port:

```bash
./static-server -port 8080
```
or set the `PORT` environment variable:
```bash
PORT=8080 ./static-server
```

### Specify directory to serve:

```bash
./static-server -dir /path/to/your/spa/build
```

### Enable GitHub OAuth Token Proxy:

To enable the proxy, use the `-enable-github-proxy` flag. Your SPA should then send its token request (typically a POST request with `code`, `client_id`, `redirect_uri`, `code_verifier`, etc.) to the local proxy endpoint.

```bash
./static-server -enable-github-proxy
```

Your SPA would then make a POST request to `http://localhost:3333/api/github/token` (or the port you are using).

### Customize Proxy Settings (Optional):

-   `-github-proxy-path`: Change the local path for the proxy endpoint (default: `/api/github/token`).
    ```bash
    ./static-server -enable-github-proxy -github-proxy-path /my-oauth-proxy
    ```
-   `-github-token-url`: Change the target GitHub token URL (default: `https://github.com/login/oauth/access_token`). *Usually, you don't need to change this.*

### Combined options:

```bash
./static-server -port 8000 -dir ./public -enable-github-proxy
```

The server will log requests, startup information, and proxy activity to the console.

Example output with proxy enabled:
```
time=2023-10-27T11:00:00.123Z level=INFO msg="GitHub OAuth token proxy enabled" path=/api/github/token target_url="https://github.com/login/oauth/access_token"
time=2023-10-27T11:00:00.124Z level=INFO msg="Starting server" address="http://localhost:3333" serving_directory="/path/to/current/directory"
...
time=2023-10-27T11:00:10.456Z level=INFO msg="GitHub proxy: Forwarding request" target_url="https://github.com/login/oauth/access_token" client_content_type="application/x-www-form-urlencoded"
time=2023-10-27T11:00:11.123Z level=INFO msg="GitHub proxy: Received response from GitHub" status_code=200
time=2023-10-27T11:00:11.123Z level=INFO msg="request processed" method=POST path=/api/github/token remote_addr="[::1]:54322" user_agent="curl/7.79.1" status_code=200 duration=680ms
```

## CORS Configuration Notes (for static assets)

-   The `Access-Control-Allow-Origin` header for static assets is set to `*` by default in `corsMiddleware`. This is convenient for development but is insecure for production environments. For production, you should modify the `corsMiddleware` function in `main.go` to specify the exact origin(s) that are allowed to access your resources.
    Example: `w.Header().Set("Access-Control-Allow-Origin", "https://your-spa-domain.com")`
-   The GitHub proxy endpoint itself is also covered by this CORS policy, meaning your SPA running on `http://localhost:3333` can call `http://localhost:3333/api/github/token`. If your SPA is on a different origin during development (e.g. a webpack dev server on a different port), ensure that origin is allowed or keep `*` for development.

## GitHub Proxy Notes

-   The proxy forwards POST requests from the specified `-github-proxy-path` to the `-github-token-url`.
-   It copies the client's request body and `Content-Type` header to the request sent to GitHub.
-   It sets the `Accept: application/json` header for the request to GitHub, as token responses are typically JSON.
-   It then streams the response (status, headers, body) from GitHub back to the client.
-   This is primarily intended for the OAuth **token exchange** step where a `code` is exchanged for an `access_token`.
-   **Important**: The client (your SPA) is responsible for constructing the correct request body (e.g., with `grant_type`, `client_id`, `code`, `redirect_uri`, `code_verifier` as required by GitHub's PKCE flow). The proxy simply relays this.

## Development

To modify or extend the server:
1.  Edit `main.go`.
2.  Rebuild using `go build -o static-server main.go`.
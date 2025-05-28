# Go Simple Static File Server with CORS

This is a simple static file server written in Go, similar in basic functionality to `python -m http.server`.
It is designed with Single Page Applications (SPAs) in mind, providing Cross-Origin Resource Sharing (CORS) headers necessary for features like GitHub PKCE authentication flows or API interactions from different origins during development.

## Features

-   Serves static files from a specified directory (defaults to the current directory).
-   Configurable port (defaults to 3333).
-   CORS headers included:
    -   `Access-Control-Allow-Origin: *` (configurable in code for production)
    -   `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
    -   `Access-Control-Allow-Headers: Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Origin`
    -   `Access-Control-Allow-Credentials: true`
-   Handles `OPTIONS` (preflight) requests.
-   Structured logging using Go's standard `log/slog` package.

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

### Basic usage (serves current directory on port 3333):

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
or
```bash
./static-server -dir ./my-project/dist
```

### Combined options:

```bash
./static-server -port 8000 -dir ./public
```

The server will log requests and startup information to the console.

Example output:
```
time=2023-10-27T10:00:00.123456789Z level=INFO msg="Starting server" address="http://localhost:3333" serving_directory="/path/to/current/directory"
time=2023-10-27T10:00:05.987654321Z level=INFO msg="request processed" method=GET path=/ remote_addr="[::1]:54321" user_agent="Mozilla/5.0..." status_code=200 duration=1.234ms
```

## CORS Configuration Notes

-   The `Access-Control-Allow-Origin` header is set to `*` by default. This is convenient for development but is insecure for production environments. For production, you should modify the `corsMiddleware` function in `main.go` to specify the exact origin(s) that are allowed to access your resources.
    Example: `w.Header().Set("Access-Control-Allow-Origin", "https://your-spa-domain.com")`
-   The `Access-Control-Allow-Credentials` header is set to `true`. This is typically needed if your SPA sends cookies or HTTP authentication information. If not, it can be set to `false` or removed.

## Development

To modify or extend the server:
1.  Edit `main.go`.
2.  Rebuild using `go build -o static-server main.go`.

## Why standard library?

This server aims to use only the Go standard library to keep it lightweight and easy to understand/deploy, without external dependencies. The `log/slog` package is part of the standard library since Go 1.21.
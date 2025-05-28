package main

import (
	"bytes"
	"flag"
	"io"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var (
	port    int
	dir     string
	logger  *slog.Logger

	enableGithubProxy bool
	githubProxyPath   string
	githubTokenURL    string
	debugHTTP         bool
)

func init() {
	logLevel := slog.LevelInfo
	flag.BoolVar(&debugHTTP, "debug-http", false, "Enable detailed HTTP request/response logging for proxy")

	defaultPort := 3333
	if p, err := strconv.Atoi(os.Getenv("PORT")); err == nil {
		defaultPort = p
	}
	flag.IntVar(&port, "port", defaultPort, "Port to serve on")
	flag.StringVar(&dir, "dir", ".", "Directory to serve files from")

	flag.BoolVar(&enableGithubProxy, "enable-github-proxy", false, "Enable GitHub OAuth token proxy")
	flag.StringVar(&githubProxyPath, "github-proxy-path", "/api/github/token", "Path for the GitHub token proxy endpoint")
	flag.StringVar(&githubTokenURL, "github-token-url", "https://github.com/login/oauth/access_token", "GitHub OAuth token endpoint URL")

	flag.Parse()

	if debugHTTP {
		logLevel = slog.LevelDebug
	}

	logHandler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey {
				a.Value = slog.StringValue(a.Value.Time().Format(time.RFC3339Nano))
			}
			return a
		},
	})
	logger = slog.New(logHandler)
	slog.SetDefault(logger)

	absDir, err := filepath.Abs(dir)
	if err != nil {
		logger.Error("Failed to get absolute path for directory", "directory", dir, "error", err)
		os.Exit(1)
	}
	dir = absDir
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Origin")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)
		logger.LogAttrs(r.Context(), slog.LevelInfo, "request processed",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.String("remote_addr", r.RemoteAddr),
			slog.Int("status_code", rw.statusCode),
			slog.String("duration", time.Since(start).String()),
		)
	})
}

func githubProxyHandlerFunc(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if r.Method != http.MethodPost {
		logger.WarnContext(ctx, "GitHub proxy: Method not allowed", "method", r.Method)
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		logger.ErrorContext(ctx, "GitHub proxy: Failed to read request body from client", "error", err)
		http.Error(w, "Failed to read request body", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close() // Close client request body

	if debugHTTP {
		clientReqDump, dumpErr := httputil.DumpRequest(r, false) // false = do not dump body here, already read
		if dumpErr == nil {
			logger.DebugContext(ctx, "GitHub proxy: Received request from client",
				slog.String("client_request_headers", string(clientReqDump)),
				slog.String("client_request_body_raw", string(bodyBytes)), // Log the body we read
			)
		} else {
			logger.WarnContext(ctx, "GitHub proxy: Failed to dump client request for logging", "error", dumpErr)
		}
	}

	proxyReq, err := http.NewRequestWithContext(ctx, http.MethodPost, githubTokenURL, bytes.NewReader(bodyBytes)) // Use bodyBytes for new request
	if err != nil {
		logger.ErrorContext(ctx, "GitHub proxy: Failed to create new request to GitHub", "error", err)
		http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
		return
	}

	// Set headers for GitHub request
	if clientContentType := r.Header.Get("Content-Type"); clientContentType != "" {
		proxyReq.Header.Set("Content-Type", clientContentType)
	} else {
		proxyReq.Header.Set("Content-Type", "application/x-www-form-urlencoded") // Default
		logger.WarnContext(ctx, "GitHub proxy: Client did not send Content-Type, defaulting to application/x-www-form-urlencoded for GitHub request")
	}
	proxyReq.Header.Set("Accept", "application/json") // GitHub token endpoint expects JSON response

	if debugHTTP {
		// Log the request that will be sent to GitHub
		// httputil.DumpRequestOut can be tricky with bodies that have been "consumed" by NewRequest
		// So, we log the headers from DumpRequestOut and the body (bodyBytes) separately for clarity.
		outgoingReqDump, dumpErr := httputil.DumpRequestOut(proxyReq, false) // false = do not attempt to dump body from proxyReq internals
		if dumpErr == nil {
			logger.DebugContext(ctx, "GitHub proxy: Sending request to GitHub",
				slog.String("github_request_headers", string(outgoingReqDump)),
				slog.String("github_request_body_raw", string(bodyBytes)), // This is the body being sent
			)
		} else {
			logger.WarnContext(ctx, "GitHub proxy: Failed to dump outgoing GitHub request headers for logging", "error", dumpErr)
			// Still log the body if header dump failed
			logger.DebugContext(ctx, "GitHub proxy: Sending request body to GitHub (header dump failed)",
                slog.String("github_request_body_raw", string(bodyBytes)),
            )
		}
	}

	logger.InfoContext(ctx, "GitHub proxy: Forwarding request",
		slog.String("target_url", githubTokenURL),
		slog.String("content_type_to_github", proxyReq.Header.Get("Content-Type")),
		slog.String("accept_to_github", proxyReq.Header.Get("Accept")))

	httpClient := &http.Client{Timeout: 15 * time.Second}
	resp, err := httpClient.Do(proxyReq)
	if err != nil {
		logger.ErrorContext(ctx, "GitHub proxy: Failed to send request to GitHub", "error", err, "target_url", githubTokenURL)
		http.Error(w, "Failed to contact GitHub authentication server: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close() // Close GitHub response body

	logger.InfoContext(ctx, "GitHub proxy: Received response from GitHub", "status_code", resp.StatusCode)

	githubRespBodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.ErrorContext(ctx, "GitHub proxy: Failed to read response body from GitHub", "error", err)
		w.WriteHeader(resp.StatusCode) // Still try to send status
		http.Error(w, "Failed to read GitHub response body", http.StatusInternalServerError)
		return
	}

	if debugHTTP {
		var headersBuilder strings.Builder
		for k, v := range resp.Header {
			headersBuilder.WriteString(k + ": " + strings.Join(v, ", ") + "\n")
		}
		logger.DebugContext(ctx, "GitHub proxy: Received response details from GitHub",
			slog.Int("github_response_status_code", resp.StatusCode),
			slog.String("github_response_headers", headersBuilder.String()),
			slog.String("github_response_body_raw", string(githubRespBodyBytes)),
		)
	}

	// Forward relevant headers and body from GitHub to client
	if contentType := resp.Header.Get("Content-Type"); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.WriteHeader(resp.StatusCode)
	_, copyErr := w.Write(githubRespBodyBytes)
	if copyErr != nil {
		logger.ErrorContext(ctx, "GitHub proxy: Failed to write GitHub response to client", "error", copyErr)
	}
}

func main() {
	mux := http.NewServeMux()

	if enableGithubProxy {
		mux.HandleFunc(githubProxyPath, githubProxyHandlerFunc)
		logger.Info("GitHub OAuth token proxy enabled", "path", githubProxyPath, "target_url", githubTokenURL)
		if debugHTTP {
			logger.Debug("GitHub Proxy HTTP debugging is enabled. Requests and responses will be logged with more detail.")
		}
	}

	fileServer := http.FileServer(http.Dir(dir))
	mux.Handle("/", fileServer)

	handler := loggingMiddleware(corsMiddleware(mux))

	addr := ":" + strconv.Itoa(port)
	server := &http.Server{
		Addr:     addr,
		Handler:  handler,
		ErrorLog: slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	logger.Info("Starting server", "address", "http://localhost"+addr, "serving_directory", dir)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
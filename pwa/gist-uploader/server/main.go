package main

import (
	"bytes"
	"flag"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

var (
	port    int
	dir     string
	logger  *slog.Logger

	// Proxy flags
	enableGithubProxy bool
	githubProxyPath   string
	githubTokenURL    string
)

func init() {
	// Setup logger
	logHandler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey {
				a.Value = slog.StringValue(a.Value.Time().Format(time.RFC3339Nano))
			}
			return a
		},
	})
	logger = slog.New(logHandler)
	slog.SetDefault(logger)

	// Parse command line flags
	defaultPort := 3333
	if p, err := strconv.Atoi(os.Getenv("PORT")); err == nil {
		defaultPort = p
	}
	flag.IntVar(&port, "port", defaultPort, "Port to serve on")
	flag.StringVar(&dir, "dir", ".", "Directory to serve files from")

	// Proxy related flags
	flag.BoolVar(&enableGithubProxy, "enable-github-proxy", false, "Enable GitHub OAuth token proxy")
	flag.StringVar(&githubProxyPath, "github-proxy-path", "/api/github/token", "Path for the GitHub token proxy endpoint")
	flag.StringVar(&githubTokenURL, "github-token-url", "https://github.com/login/oauth/access_token", "GitHub OAuth token endpoint URL")

	flag.Parse()

	absDir, err := filepath.Abs(dir)
	if err != nil {
		logger.Error("Failed to get absolute path for directory", "directory", dir, "error", err)
		os.Exit(1)
	}
	dir = absDir
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // For development. For production, specify allowed origins.
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

// responseWriter is a wrapper around http.ResponseWriter to capture the status code
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
		logger.Info("request processed",
			"method", r.Method,
			"path", r.URL.Path,
			"remote_addr", r.RemoteAddr,
			"user_agent", r.UserAgent(),
			"status_code", rw.statusCode,
			"duration", time.Since(start).String(),
		)
	})
}

func githubProxyHandlerFunc(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		logger.Warn("GitHub proxy: Method not allowed", "method", r.Method)
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		logger.Error("GitHub proxy: Failed to read request body", "error", err)
		http.Error(w, "Failed to read request body", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	proxyReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, githubTokenURL, bytes.NewReader(bodyBytes))
	if err != nil {
		logger.Error("GitHub proxy: Failed to create request to GitHub", "error", err)
		http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
		return
	}

	// Copy necessary headers from original request to proxy request
	// GitHub token endpoint expects 'application/json' or 'application/x-www-form-urlencoded'
	// It's important that the client sends the correct Content-Type.
	if clientContentType := r.Header.Get("Content-Type"); clientContentType != "" {
		proxyReq.Header.Set("Content-Type", clientContentType)
	} else {
		// Default or based on typical PKCE flow client behavior
		proxyReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	proxyReq.Header.Set("Accept", "application/json") // We expect JSON response from GitHub

	logger.Info("GitHub proxy: Forwarding request", "target_url", githubTokenURL, "client_content_type", proxyReq.Header.Get("Content-Type"))

	httpClient := &http.Client{Timeout: 10 * time.Second} // Use a client with timeout
	resp, err := httpClient.Do(proxyReq)
	if err != nil {
		logger.Error("GitHub proxy: Failed to send request to GitHub", "error", err, "target_url", githubTokenURL)
		http.Error(w, "Failed to contact GitHub authentication server", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	logger.Info("GitHub proxy: Received response from GitHub", "status_code", resp.StatusCode)

	// Copy headers from GitHub response to our client response
	// Only copy Content-Type, others might not be relevant or could be problematic
	if contentType := resp.Header.Get("Content-Type"); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}

	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		logger.Error("GitHub proxy: Failed to write GitHub response to client", "error", err)
		// Headers already sent, cannot send a new http.Error
	}
}

func main() {
	mux := http.NewServeMux()

	if enableGithubProxy {
		mux.HandleFunc(githubProxyPath, githubProxyHandlerFunc)
		logger.Info("GitHub OAuth token proxy enabled", "path", githubProxyPath, "target_url", githubTokenURL)
	}

	// File server should be registered after specific API routes to avoid overriding them.
	// http.FileServer handles serving files from the 'dir' directory.
	// For SPA, you might want a more sophisticated handler that serves index.html for non-file paths.
	// But for python -m http.server equivalent, this is fine.
	fileServer := http.FileServer(http.Dir(dir))
	mux.Handle("/", fileServer)

	// Chain middlewares: logging -> cors -> mux (which includes fileServer and potentially proxy)
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
package main

import (
	"flag"
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
	slog.SetDefault(logger) // Set for global logging if any other package uses slog.Info etc.

	// Parse command line flags
	defaultPort := 3333
	if p, err := strconv.Atoi(os.Getenv("PORT")); err == nil {
		defaultPort = p
	}
	flag.IntVar(&port, "port", defaultPort, "Port to serve on")
	flag.StringVar(&dir, "dir", ".", "Directory to serve files from")
	flag.Parse()

	// Ensure the directory is absolute and clean
	absDir, err := filepath.Abs(dir)
	if err != nil {
		logger.Error("Failed to get absolute path for directory", "directory", dir, "error", err)
		os.Exit(1)
	}
	dir = absDir
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // For development. For production, specify allowed origins.
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Origin")
		w.Header().Set("Access-Control-Allow-Credentials", "true") // If your SPA sends credentials (cookies, auth headers)

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		// Custom response writer to capture status code
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

// responseWriter is a wrapper around http.ResponseWriter to capture the status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}


func main() {
	fileServer := http.FileServer(http.Dir(dir))
	
	// Chain middlewares: logging -> cors -> fileServer
	handler := loggingMiddleware(corsMiddleware(fileServer))

	addr := ":" + strconv.Itoa(port)
	server := &http.Server{
		Addr:    addr,
		Handler: handler,
		// Pass slog logger to http.Server for its internal error logging
		ErrorLog: slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	logger.Info("Starting server", "address", "http://localhost"+addr, "serving_directory", dir)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
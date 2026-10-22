// Command payment-service consumes OrderCreated events, decides on payment,
// and publishes PaymentProcessed events.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/kirthikesh/shopflow-app/services/payment-service/internal/broker"
	"github.com/kirthikesh/shopflow-app/services/payment-service/internal/payment"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", "payment-service")

	cfg := broker.Config{
		ConnectionString: os.Getenv("SERVICEBUS_CONNECTION_STRING"),
		OrderQueue:       envOr("ORDER_CREATED_QUEUE", "order-created"),
		PaymentTopic:     envOr("PAYMENT_EVENTS_TOPIC", "payment-events"),
	}
	if cfg.ConnectionString == "" {
		log.Error("SERVICEBUS_CONNECTION_STRING is required")
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	var ready atomic.Bool
	worker := broker.NewWorker(cfg, payment.New(), log, ready.Store)
	done := make(chan struct{})
	go func() {
		worker.Run(ctx)
		close(done)
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("GET /ready", func(w http.ResponseWriter, _ *http.Request) {
		if !ready.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"not connected to service bus"}`))
			return
		}
		_, _ = w.Write([]byte(`{"status":"ready"}`))
	})
	mux.Handle("GET /metrics", promhttp.Handler())

	srv := &http.Server{
		Addr:              ":" + envOr("PORT", "8083"),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		log.Info("http listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("http server failed", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	<-done
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

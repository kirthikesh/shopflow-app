// Package metrics defines the Prometheus metrics this service exposes on /metrics.
package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// PaymentsProcessed counts payments by result: APPROVED or DECLINED.
	PaymentsProcessed = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "shopflow_payments_processed_total",
		Help: "Payments processed, by status.",
	}, []string{"status"})

	// MessagesFailed counts messages that could not be handled, by reason.
	MessagesFailed = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "shopflow_payment_messages_failed_total",
		Help: "Messages that failed, by reason (invalid, publish_error).",
	}, []string{"reason"})

	// ProcessingSeconds measures time from receiving a message to completing it.
	ProcessingSeconds = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "shopflow_payment_processing_seconds",
		Help:    "Time taken to process one OrderCreated message.",
		Buckets: prometheus.DefBuckets,
	})
)

// Package broker connects the payment logic to Azure Service Bus.
package broker

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/messaging/azservicebus"

	"github.com/kirthikesh/shopflow-app/services/payment-service/internal/events"
	"github.com/kirthikesh/shopflow-app/services/payment-service/internal/metrics"
	"github.com/kirthikesh/shopflow-app/services/payment-service/internal/payment"
)

// Config holds the Service Bus settings.
type Config struct {
	ConnectionString string
	OrderQueue       string // consumed: OrderCreated
	PaymentTopic     string // published: PaymentProcessed
}

// Worker receives OrderCreated messages and publishes PaymentProcessed messages.
type Worker struct {
	cfg       Config
	processor *payment.Processor
	log       *slog.Logger
	ready     func(bool)
}

// NewWorker builds a Worker. ready is called with true once connected, false when the connection drops.
func NewWorker(cfg Config, p *payment.Processor, log *slog.Logger, ready func(bool)) *Worker {
	return &Worker{cfg: cfg, processor: p, log: log, ready: ready}
}

// Run blocks until ctx is cancelled, reconnecting with backoff if the broker is unavailable.
// The local emulator takes a while to start, so the first attempts usually fail.
func (w *Worker) Run(ctx context.Context) {
	backoff := time.Second
	for ctx.Err() == nil {
		err := w.runOnce(ctx)
		w.ready(false)
		if ctx.Err() != nil {
			return
		}
		w.log.Warn("service bus connection lost, retrying", "error", err, "in", backoff)
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		backoff = min(backoff*2, 30*time.Second)
	}
}

func (w *Worker) runOnce(ctx context.Context) error {
	client, err := azservicebus.NewClientFromConnectionString(w.cfg.ConnectionString, nil)
	if err != nil {
		return err
	}
	defer client.Close(context.Background())

	receiver, err := client.NewReceiverForQueue(w.cfg.OrderQueue, nil)
	if err != nil {
		return err
	}
	defer receiver.Close(context.Background())

	sender, err := client.NewSender(w.cfg.PaymentTopic, nil)
	if err != nil {
		return err
	}
	defer sender.Close(context.Background())

	// ReceiveMessages waits until a message arrives, so it can't tell us we're connected.
	// A peek is a quick round trip to the broker that proves the queue is reachable.
	peekCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	_, err = receiver.PeekMessages(peekCtx, 1, nil)
	cancel()
	if err != nil {
		return err
	}
	w.ready(true)
	w.log.Info("connected to service bus", "queue", w.cfg.OrderQueue, "topic", w.cfg.PaymentTopic)

	for {
		messages, err := receiver.ReceiveMessages(ctx, 10, nil)
		if err != nil {
			return err
		}
		for _, msg := range messages {
			w.handle(ctx, receiver, sender, msg)
		}
	}
}

func (w *Worker) handle(ctx context.Context, receiver *azservicebus.Receiver, sender *azservicebus.Sender,
	msg *azservicebus.ReceivedMessage) {
	start := time.Now()
	defer func() { metrics.ProcessingSeconds.Observe(time.Since(start).Seconds()) }()

	var order events.OrderCreated
	if err := json.Unmarshal(msg.Body, &order); err != nil {
		w.deadLetter(ctx, receiver, msg, "malformed JSON", err)
		return
	}

	result, err := w.processor.Process(order)
	if errors.Is(err, payment.ErrInvalidEvent) {
		w.deadLetter(ctx, receiver, msg, "invalid event", err)
		return
	}

	body, err := json.Marshal(result)
	if err != nil {
		w.deadLetter(ctx, receiver, msg, "encode failed", err)
		return
	}

	contentType := "application/json"
	subject := events.TypePaymentProcessed
	messageID := result.OrderID + "-payment" // stable id, so a retry is a duplicate, not a second payment
	out := &azservicebus.Message{
		Body:        body,
		ContentType: &contentType,
		Subject:     &subject,
		MessageID:   &messageID,
	}
	if err := sender.SendMessage(ctx, out, nil); err != nil {
		// Abandon: Service Bus redelivers, and dead-letters after MaxDeliveryCount attempts.
		metrics.MessagesFailed.WithLabelValues("publish_error").Inc()
		w.log.Error("publish failed, abandoning message", "orderId", order.OrderID, "error", err)
		_ = receiver.AbandonMessage(ctx, msg, nil)
		return
	}

	if err := receiver.CompleteMessage(ctx, msg, nil); err != nil {
		w.log.Error("complete failed", "orderId", order.OrderID, "error", err)
		return
	}

	metrics.PaymentsProcessed.WithLabelValues(result.Status).Inc()
	w.log.Info("payment processed", "orderId", result.OrderID, "status", result.Status,
		"amountCents", result.AmountCents)
}

func (w *Worker) deadLetter(ctx context.Context, receiver *azservicebus.Receiver,
	msg *azservicebus.ReceivedMessage, reason string, cause error) {
	metrics.MessagesFailed.WithLabelValues("invalid").Inc()
	description := cause.Error()
	w.log.Error("dead-lettering message", "messageId", msg.MessageID, "reason", reason, "error", cause)
	if err := receiver.DeadLetterMessage(ctx, msg, &azservicebus.DeadLetterOptions{
		Reason:           &reason,
		ErrorDescription: &description,
	}); err != nil {
		w.log.Error("dead-letter failed", "error", err)
	}
}

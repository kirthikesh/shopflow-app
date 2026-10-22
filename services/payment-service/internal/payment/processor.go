// Package payment holds the (fake) payment rules. It has no I/O, so it is easy to test.
package payment

import (
	"errors"
	"strings"
	"time"

	"github.com/kirthikesh/shopflow-app/services/payment-service/internal/events"
)

// DefaultLimitCents is the largest amount approved without manual review: EUR 2,000.
const DefaultLimitCents int64 = 200_000

// ErrInvalidEvent means the message can never succeed and should be dead-lettered.
var ErrInvalidEvent = errors.New("invalid OrderCreated event")

// Processor decides whether a payment is approved.
type Processor struct {
	LimitCents int64
	Now        func() time.Time
}

// New returns a Processor with the default limit.
func New() *Processor {
	return &Processor{LimitCents: DefaultLimitCents, Now: time.Now}
}

// Process turns an OrderCreated event into a PaymentProcessed event.
//
// Rules (a stand-in for a real payment provider):
//   - totals above the limit are declined
//   - emails containing "+decline" are declined, so failures are easy to demo
//   - everything else is approved
func (p *Processor) Process(order events.OrderCreated) (events.PaymentProcessed, error) {
	if order.OrderID == "" || order.TotalCents <= 0 || order.CustomerEmail == "" {
		return events.PaymentProcessed{}, ErrInvalidEvent
	}

	status, reason := events.StatusApproved, ""
	switch {
	case order.TotalCents > p.LimitCents:
		status, reason = events.StatusDeclined, "amount exceeds limit"
	case strings.Contains(strings.ToLower(order.CustomerEmail), "+decline"):
		status, reason = events.StatusDeclined, "card declined by issuer"
	}

	return events.PaymentProcessed{
		EventType:     events.TypePaymentProcessed,
		OrderID:       order.OrderID,
		Status:        status,
		Reason:        reason,
		CustomerEmail: order.CustomerEmail,
		AmountCents:   order.TotalCents,
		Currency:      order.Currency,
		Items:         order.Items,
		ProcessedAt:   p.Now().UTC(),
	}, nil
}

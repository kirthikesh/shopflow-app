package payment

import (
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/kirthikesh/shopflow-app/services/payment-service/internal/events"
)

func fixedProcessor() *Processor {
	return &Processor{
		LimitCents: DefaultLimitCents,
		Now:        func() time.Time { return time.Date(2026, 10, 16, 12, 0, 0, 0, time.UTC) },
	}
}

func order(total int64, email string) events.OrderCreated {
	return events.OrderCreated{
		EventType:     events.TypeOrderCreated,
		OrderID:       "4f1c2d1e-0000-4000-8000-000000000001",
		CustomerEmail: email,
		TotalCents:    total,
		Currency:      "EUR",
	}
}

func TestProcess(t *testing.T) {
	tests := []struct {
		name       string
		order      events.OrderCreated
		wantStatus string
		wantReason string
	}{
		{"normal order is approved", order(12_498, "kiki@example.com"), events.StatusApproved, ""},
		{"exactly at the limit is approved", order(DefaultLimitCents, "kiki@example.com"), events.StatusApproved, ""},
		{"over the limit is declined", order(DefaultLimitCents+1, "kiki@example.com"), events.StatusDeclined, "amount exceeds limit"},
		{"test email is declined", order(1_000, "Kiki+DECLINE@example.com"), events.StatusDeclined, "card declined by issuer"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := fixedProcessor().Process(tt.order)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.Status != tt.wantStatus || got.Reason != tt.wantReason {
				t.Errorf("got (%s, %q), want (%s, %q)", got.Status, got.Reason, tt.wantStatus, tt.wantReason)
			}
			if got.OrderID != tt.order.OrderID || got.AmountCents != tt.order.TotalCents {
				t.Errorf("order id or amount not carried over: %+v", got)
			}
			if got.EventType != events.TypePaymentProcessed {
				t.Errorf("eventType = %q", got.EventType)
			}
		})
	}
}

func TestProcessRejectsInvalidEvents(t *testing.T) {
	bad := []events.OrderCreated{
		order(1000, ""),
		order(0, "kiki@example.com"),
		{CustomerEmail: "kiki@example.com", TotalCents: 1000},
	}
	for _, o := range bad {
		if _, err := fixedProcessor().Process(o); !errors.Is(err, ErrInvalidEvent) {
			t.Errorf("Process(%+v) error = %v, want ErrInvalidEvent", o, err)
		}
	}
}

// The order service is written in Java. This checks we can read exactly what it sends.
func TestDecodesJavaOrderCreatedJSON(t *testing.T) {
	raw := `{"eventType":"OrderCreated","orderId":"4f1c2d1e-0000-4000-8000-000000000001",
	  "customerEmail":"kiki@example.com","totalCents":12498,"currency":"EUR",
	  "items":[{"productId":1,"productName":"Mechanical Keyboard","quantity":1,"unitPriceCents":8999}],
	  "createdAt":"2026-10-16T11:59:59.123456Z"}`

	var o events.OrderCreated
	if err := json.Unmarshal([]byte(raw), &o); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if o.TotalCents != 12498 || len(o.Items) != 1 || o.Items[0].ProductName != "Mechanical Keyboard" {
		t.Fatalf("decoded wrong values: %+v", o)
	}
}

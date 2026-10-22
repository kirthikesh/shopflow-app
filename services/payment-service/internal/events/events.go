// Package events holds the message contracts shared with the other services.
// Field names match the JSON the Java order service and Node notification service use.
package events

import "time"

// OrderCreated is published by the order service to the "order-created" queue.
type OrderCreated struct {
	EventType     string    `json:"eventType"`
	OrderID       string    `json:"orderId"`
	CustomerEmail string    `json:"customerEmail"`
	TotalCents    int64     `json:"totalCents"`
	Currency      string    `json:"currency"`
	Items         []Item    `json:"items"`
	CreatedAt     time.Time `json:"createdAt"`
}

// Item is one order line.
type Item struct {
	ProductID      int64  `json:"productId"`
	ProductName    string `json:"productName"`
	Quantity       int    `json:"quantity"`
	UnitPriceCents int64  `json:"unitPriceCents"`
}

// PaymentProcessed is published by this service to the "payment-events" topic.
type PaymentProcessed struct {
	EventType     string    `json:"eventType"`
	OrderID       string    `json:"orderId"`
	Status        string    `json:"status"`
	Reason        string    `json:"reason"`
	CustomerEmail string    `json:"customerEmail"`
	AmountCents   int64     `json:"amountCents"`
	Currency      string    `json:"currency"`
	Items         []Item    `json:"items"`
	ProcessedAt   time.Time `json:"processedAt"`
}

const (
	TypeOrderCreated     = "OrderCreated"
	TypePaymentProcessed = "PaymentProcessed"
	StatusApproved       = "APPROVED"
	StatusDeclined       = "DECLINED"
)

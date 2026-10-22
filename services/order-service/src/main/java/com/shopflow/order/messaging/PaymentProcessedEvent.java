package com.shopflow.order.messaging;

import java.time.Instant;
import java.util.UUID;

/** Received from the "payment-events" topic, published by the payment service. */
public record PaymentProcessedEvent(
        String eventType,
        UUID orderId,
        String status,
        String reason,
        String customerEmail,
        long amountCents,
        Instant processedAt) {

    public static final String APPROVED = "APPROVED";

    public boolean approved() {
        return APPROVED.equals(status);
    }
}

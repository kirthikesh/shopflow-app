package com.shopflow.order.domain;

public enum OrderStatus {
    /** Order saved, waiting for the payment service. */
    PENDING_PAYMENT,
    /** Payment approved. */
    PAID,
    /** Payment declined. */
    PAYMENT_FAILED
}

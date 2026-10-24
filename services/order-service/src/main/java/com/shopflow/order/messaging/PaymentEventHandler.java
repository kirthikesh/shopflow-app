package com.shopflow.order.messaging;

import com.shopflow.order.service.OrderService;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

/** Turns a raw Service Bus message body into a domain call. Kept separate so it is easy to test. */
@Component
public class PaymentEventHandler {

    private final ObjectMapper objectMapper;
    private final OrderService orderService;

    public PaymentEventHandler(ObjectMapper objectMapper, OrderService orderService) {
        this.objectMapper = objectMapper;
        this.orderService = orderService;
    }

    public void handle(byte[] body) {
        PaymentProcessedEvent event;
        try {
            event = objectMapper.readValue(body, PaymentProcessedEvent.class);
        } catch (JacksonException e) {
            // A message we cannot parse will never succeed: fail loudly so it is dead-lettered.
            throw new IllegalArgumentException("invalid PaymentProcessed message", e);
        }
        orderService.applyPaymentResult(event);
    }
}

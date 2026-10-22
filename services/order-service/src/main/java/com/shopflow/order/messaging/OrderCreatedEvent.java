package com.shopflow.order.messaging;

import com.shopflow.order.domain.Order;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Published to the "order-created" queue. Consumed by the payment service. */
public record OrderCreatedEvent(
        String eventType,
        UUID orderId,
        String customerEmail,
        long totalCents,
        String currency,
        List<Item> items,
        Instant createdAt) {

    public static final String TYPE = "OrderCreated";

    public record Item(long productId, String productName, int quantity, long unitPriceCents) {
    }

    public static OrderCreatedEvent from(Order order) {
        List<Item> items = order.getItems().stream()
                .map(i -> new Item(i.getProductId(), i.getProductName(), i.getQuantity(), i.getUnitPriceCents()))
                .toList();
        return new OrderCreatedEvent(
                TYPE,
                order.getId(),
                order.getCustomerEmail(),
                order.getTotalCents(),
                order.getCurrency(),
                items,
                order.getCreatedAt());
    }
}

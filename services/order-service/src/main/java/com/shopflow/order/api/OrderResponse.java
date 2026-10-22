package com.shopflow.order.api;

import com.shopflow.order.domain.Order;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        String customerEmail,
        String status,
        String statusReason,
        long totalCents,
        String currency,
        List<Item> items,
        Instant createdAt,
        Instant updatedAt) {

    public record Item(long productId, String productName, int quantity, long unitPriceCents) {
    }

    public static OrderResponse from(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getCustomerEmail(),
                order.getStatus().name(),
                order.getStatusReason(),
                order.getTotalCents(),
                order.getCurrency(),
                order.getItems().stream()
                        .map(i -> new Item(i.getProductId(), i.getProductName(), i.getQuantity(),
                                i.getUnitPriceCents()))
                        .toList(),
                order.getCreatedAt(),
                order.getUpdatedAt());
    }
}

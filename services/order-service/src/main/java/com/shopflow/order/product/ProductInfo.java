package com.shopflow.order.product;

import com.fasterxml.jackson.annotation.JsonProperty;

/** The fields the order service needs from the product service. */
public record ProductInfo(
        long id,
        String name,
        @JsonProperty("price_cents") long priceCents,
        int stock) {
}

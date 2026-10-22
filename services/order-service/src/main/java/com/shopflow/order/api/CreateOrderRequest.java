package com.shopflow.order.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateOrderRequest(
        @NotBlank @Email @Size(max = 254) String customerEmail,
        @NotEmpty @Size(max = 50) List<@Valid Item> items) {

    public record Item(@Positive long productId, @Min(1) @Max(20) int quantity) {
    }
}

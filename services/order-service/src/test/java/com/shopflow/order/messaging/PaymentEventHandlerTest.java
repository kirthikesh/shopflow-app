package com.shopflow.order.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.shopflow.order.service.OrderService;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class PaymentEventHandlerTest {

    private final OrderService orderService = mock(OrderService.class);
    private final PaymentEventHandler handler =
            new PaymentEventHandler(new ObjectMapper().registerModule(new JavaTimeModule()), orderService);

    @Test
    void parsesTheJsonThePaymentServiceSends() {
        UUID orderId = UUID.randomUUID();
        // Same shape the Go payment service publishes.
        String json = """
                {"eventType":"PaymentProcessed","orderId":"%s","status":"APPROVED","reason":"",
                 "customerEmail":"kiki@example.com","amountCents":12498,
                 "processedAt":"2026-10-16T12:00:00Z"}
                """.formatted(orderId);

        handler.handle(json.getBytes(StandardCharsets.UTF_8));

        ArgumentCaptor<PaymentProcessedEvent> event = ArgumentCaptor.forClass(PaymentProcessedEvent.class);
        verify(orderService).applyPaymentResult(event.capture());
        assertThat(event.getValue().orderId()).isEqualTo(orderId);
        assertThat(event.getValue().approved()).isTrue();
        assertThat(event.getValue().amountCents()).isEqualTo(12498);
    }

    @Test
    void invalidJsonFailsSoTheMessageIsDeadLettered() {
        assertThatThrownBy(() -> handler.handle("not json".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

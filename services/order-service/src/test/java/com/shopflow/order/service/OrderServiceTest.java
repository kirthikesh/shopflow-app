package com.shopflow.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shopflow.order.api.CreateOrderRequest;
import com.shopflow.order.domain.Order;
import com.shopflow.order.domain.OrderRepository;
import com.shopflow.order.domain.OrderStatus;
import com.shopflow.order.messaging.OrderCreatedEvent;
import com.shopflow.order.messaging.OrderEventPublisher;
import com.shopflow.order.messaging.PaymentProcessedEvent;
import com.shopflow.order.product.ProductClient;
import com.shopflow.order.product.ProductInfo;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OrderServiceTest {

    private OrderRepository repository;
    private ProductClient productClient;
    private OrderEventPublisher publisher;
    private SimpleMeterRegistry meterRegistry;
    private OrderService service;

    @BeforeEach
    void setUp() {
        repository = mock(OrderRepository.class);
        productClient = mock(ProductClient.class);
        publisher = mock(OrderEventPublisher.class);
        meterRegistry = new SimpleMeterRegistry();
        service = new OrderService(repository, productClient, publisher, meterRegistry);
        when(repository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(productClient.findById(1L)).thenReturn(Optional.of(new ProductInfo(1, "Keyboard", 8999, 10)));
        when(productClient.findById(2L)).thenReturn(Optional.of(new ProductInfo(2, "Mouse", 3499, 1)));
    }

    private static CreateOrderRequest request(CreateOrderRequest.Item... items) {
        return new CreateOrderRequest("kiki@example.com", List.of(items));
    }

    @Test
    void pricesComeFromTheProductServiceAndTheEventIsPublished() {
        Order order = service.createOrder(request(
                new CreateOrderRequest.Item(1, 2),
                new CreateOrderRequest.Item(2, 1)));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(order.getTotalCents()).isEqualTo(2 * 8999 + 3499);

        ArgumentCaptor<OrderCreatedEvent> event = ArgumentCaptor.forClass(OrderCreatedEvent.class);
        verify(publisher).publishOrderCreated(event.capture());
        assertThat(event.getValue().orderId()).isEqualTo(order.getId());
        assertThat(event.getValue().totalCents()).isEqualTo(order.getTotalCents());
        assertThat(event.getValue().items()).hasSize(2);
        assertThat(meterRegistry.get("shopflow.orders.created").counter().count()).isEqualTo(1.0);
    }

    @Test
    void duplicateLinesForTheSameProductAreMerged() {
        Order order = service.createOrder(request(
                new CreateOrderRequest.Item(1, 1),
                new CreateOrderRequest.Item(1, 2)));

        assertThat(order.getItems()).hasSize(1);
        assertThat(order.getItems().getFirst().getQuantity()).isEqualTo(3);
    }

    @Test
    void unknownProductIsRejectedAndNothingIsPublished() {
        when(productClient.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createOrder(request(new CreateOrderRequest.Item(99, 1))))
                .isInstanceOf(UnknownProductException.class);
        verify(repository, never()).save(any());
        verify(publisher, never()).publishOrderCreated(any());
    }

    @Test
    void notEnoughStockIsRejected() {
        assertThatThrownBy(() -> service.createOrder(request(new CreateOrderRequest.Item(2, 5))))
                .isInstanceOf(InsufficientStockException.class);
        verify(publisher, never()).publishOrderCreated(any());
    }

    @Test
    void approvedPaymentMarksTheOrderPaid() {
        Order order = Order.create("kiki@example.com", "EUR");
        when(repository.findById(order.getId())).thenReturn(Optional.of(order));

        service.applyPaymentResult(payment(order, "APPROVED", null));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    void duplicatePaymentEventIsIgnored() {
        Order order = Order.create("kiki@example.com", "EUR");
        when(repository.findById(order.getId())).thenReturn(Optional.of(order));

        service.applyPaymentResult(payment(order, "DECLINED", "amount over limit"));
        service.applyPaymentResult(payment(order, "APPROVED", null));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAYMENT_FAILED);
        assertThat(order.getStatusReason()).isEqualTo("amount over limit");
    }

    @Test
    void paymentForAnOrderNotYetVisibleIsRetried() {
        Order order = Order.create("kiki@example.com", "EUR");
        when(repository.findById(order.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.applyPaymentResult(payment(order, "APPROVED", null)))
                .isInstanceOf(IllegalStateException.class);
    }

    private static PaymentProcessedEvent payment(Order order, String status, String reason) {
        return new PaymentProcessedEvent("PaymentProcessed", order.getId(), status, reason,
                order.getCustomerEmail(), order.getTotalCents(), Instant.now());
    }
}

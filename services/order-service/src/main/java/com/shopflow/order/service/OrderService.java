package com.shopflow.order.service;

import com.shopflow.order.api.CreateOrderRequest;
import com.shopflow.order.domain.Order;
import com.shopflow.order.domain.OrderRepository;
import com.shopflow.order.messaging.OrderCreatedEvent;
import com.shopflow.order.messaging.OrderEventPublisher;
import com.shopflow.order.messaging.PaymentProcessedEvent;
import com.shopflow.order.product.ProductClient;
import com.shopflow.order.product.ProductInfo;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final String CURRENCY = "EUR";

    private final OrderRepository orderRepository;
    private final ProductClient productClient;
    private final OrderEventPublisher publisher;
    private final Counter ordersCreated;
    private final MeterRegistry meterRegistry;

    public OrderService(
            OrderRepository orderRepository,
            ProductClient productClient,
            OrderEventPublisher publisher,
            MeterRegistry meterRegistry) {
        this.orderRepository = orderRepository;
        this.productClient = productClient;
        this.publisher = publisher;
        this.meterRegistry = meterRegistry;
        this.ordersCreated = Counter.builder("shopflow.orders.created")
                .description("Orders accepted by the order service")
                .register(meterRegistry);
    }

    /**
     * Creates an order. Prices always come from the product service, never from the client.
     * The save and the publish share one transaction: if publishing fails, the order is rolled back.
     * (A transactional outbox would remove the remaining edge case; it is on the roadmap.)
     */
    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        request.items().forEach(i -> quantities.merge(i.productId(), i.quantity(), Integer::sum));

        Order order = Order.create(request.customerEmail(), CURRENCY);
        quantities.forEach((productId, quantity) -> {
            ProductInfo product = productClient.findById(productId)
                    .orElseThrow(() -> new UnknownProductException(productId));
            if (product.stock() < quantity) {
                throw new InsufficientStockException(productId, quantity, product.stock());
            }
            order.addItem(product.id(), product.name(), quantity, product.priceCents());
        });

        Order saved = orderRepository.save(order);
        publisher.publishOrderCreated(OrderCreatedEvent.from(saved));
        ordersCreated.increment();
        log.info("created order id={} items={} totalCents={}",
                saved.getId(), saved.getItems().size(), saved.getTotalCents());
        return saved;
    }

    @Transactional(readOnly = true)
    public Optional<Order> findOrder(UUID id) {
        return orderRepository.findWithItemsById(id);
    }

    /**
     * Idempotent: a redelivered or duplicate payment event changes nothing.
     *
     * <p>The payment reply can arrive before the order's transaction has committed. Throwing
     * here makes Service Bus redeliver the message a moment later instead of losing it.
     */
    @Transactional
    public void applyPaymentResult(PaymentProcessedEvent event) {
        Order order = orderRepository.findById(event.orderId())
                .orElseThrow(() -> new IllegalStateException(
                        "order " + event.orderId() + " not found yet, message will be retried"));
        if (order.applyPaymentResult(event.approved(), event.reason())) {
            meterRegistry.counter("shopflow.orders.payment.results", "status", order.getStatus().name())
                    .increment();
            log.info("order id={} is now {}", order.getId(), order.getStatus());
        } else {
            log.info("ignoring duplicate payment event for order id={} (already {})",
                    order.getId(), order.getStatus());
        }
    }
}

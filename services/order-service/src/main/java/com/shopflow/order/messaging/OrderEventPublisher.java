package com.shopflow.order.messaging;

public interface OrderEventPublisher {

    void publishOrderCreated(OrderCreatedEvent event);
}

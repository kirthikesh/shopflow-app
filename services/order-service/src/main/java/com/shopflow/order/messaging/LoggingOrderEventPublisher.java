package com.shopflow.order.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Used when messaging is switched off, for example when running the service on its own. */
public class LoggingOrderEventPublisher implements OrderEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(LoggingOrderEventPublisher.class);

    @Override
    public void publishOrderCreated(OrderCreatedEvent event) {
        log.warn("messaging disabled, not publishing OrderCreated orderId={}", event.orderId());
    }
}

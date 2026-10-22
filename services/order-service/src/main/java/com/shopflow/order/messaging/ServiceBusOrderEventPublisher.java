package com.shopflow.order.messaging;

import com.azure.core.util.BinaryData;
import com.azure.messaging.servicebus.ServiceBusMessage;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ServiceBusOrderEventPublisher implements OrderEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(ServiceBusOrderEventPublisher.class);

    private final ServiceBusSenderClient sender;
    private final ObjectMapper objectMapper;

    public ServiceBusOrderEventPublisher(ServiceBusSenderClient sender, ObjectMapper objectMapper) {
        this.sender = sender;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publishOrderCreated(OrderCreatedEvent event) {
        try {
            ServiceBusMessage message = new ServiceBusMessage(
                    BinaryData.fromBytes(objectMapper.writeValueAsBytes(event)));
            message.setContentType("application/json");
            // MessageId = orderId lets Service Bus duplicate detection drop accidental re-sends.
            message.setMessageId(event.orderId().toString());
            message.setSubject(OrderCreatedEvent.TYPE);
            sender.sendMessage(message);
            log.info("published OrderCreated orderId={}", event.orderId());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("could not serialise OrderCreated event", e);
        }
    }
}

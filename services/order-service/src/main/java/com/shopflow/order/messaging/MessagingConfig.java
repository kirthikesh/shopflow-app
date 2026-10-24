package com.shopflow.order.messaging;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusProcessorClient;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

@Configuration(proxyBeanMethods = false)
public class MessagingConfig {

    private static final Logger log = LoggerFactory.getLogger(MessagingConfig.class);

    /** Real Azure Service Bus (or the local emulator). Enabled with MESSAGING_ENABLED=true. */
    @Configuration
    @ConditionalOnProperty(prefix = "shopflow.messaging", name = "enabled", havingValue = "true")
    static class ServiceBusMessaging {

        @Value("${shopflow.messaging.connection-string}")
        private String connectionString;

        @Bean(destroyMethod = "close")
        ServiceBusSenderClient orderCreatedSender(
                @Value("${shopflow.messaging.order-created-queue}") String queue) {
            return new ServiceBusClientBuilder()
                    .connectionString(connectionString)
                    .sender()
                    .queueName(queue)
                    .buildClient();
        }

        @Bean
        OrderEventPublisher serviceBusOrderEventPublisher(
                ServiceBusSenderClient orderCreatedSender, ObjectMapper objectMapper) {
            return new ServiceBusOrderEventPublisher(orderCreatedSender, objectMapper);
        }

        @Bean(initMethod = "start", destroyMethod = "close")
        ServiceBusProcessorClient paymentEventsProcessor(
                @Value("${shopflow.messaging.payment-events-topic}") String topic,
                @Value("${shopflow.messaging.payment-events-subscription}") String subscription,
                PaymentEventHandler handler) {
            // Auto-complete is on: a message is completed when handle() returns,
            // and abandoned (then retried, then dead-lettered) when it throws.
            return new ServiceBusClientBuilder()
                    .connectionString(connectionString)
                    .processor()
                    .topicName(topic)
                    .subscriptionName(subscription)
                    .maxConcurrentCalls(1)
                    .processMessage(ctx -> handler.handle(ctx.getMessage().getBody().toBytes()))
                    .processError(ctx -> log.error("payment-events processor error: {}",
                            ctx.getException().getMessage()))
                    .buildProcessorClient();
        }
    }

    /** No broker: log instead of publishing. Lets the service run and be tested on its own. */
    @Configuration
    @ConditionalOnProperty(prefix = "shopflow.messaging", name = "enabled", havingValue = "false",
            matchIfMissing = true)
    static class NoMessaging {

        @Bean
        OrderEventPublisher loggingOrderEventPublisher() {
            return new LoggingOrderEventPublisher();
        }
    }
}

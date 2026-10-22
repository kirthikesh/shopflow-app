package com.shopflow.order.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Persistable;

@Entity
@Table(name = "orders")
public class Order implements Persistable<UUID> {

    @Id
    private UUID id;

    @Column(name = "customer_email", nullable = false)
    private String customerEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(name = "total_cents", nullable = false)
    private long totalCents;

    @Column(nullable = false)
    private String currency;

    @Column(name = "status_reason")
    private String statusReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    // The id is generated in code, so tell Spring Data when an order is new.
    // Without this, save() would run a SELECT and a merge instead of a plain INSERT.
    @Transient
    private boolean isNew = true;

    protected Order() {
        // for JPA
    }

    public static Order create(String customerEmail, String currency) {
        Order order = new Order();
        order.id = UUID.randomUUID();
        order.customerEmail = customerEmail;
        order.currency = currency;
        order.status = OrderStatus.PENDING_PAYMENT;
        order.createdAt = Instant.now();
        order.updatedAt = order.createdAt;
        return order;
    }

    public void addItem(long productId, String productName, int quantity, long unitPriceCents) {
        items.add(new OrderItem(this, productId, productName, quantity, unitPriceCents));
        totalCents += unitPriceCents * quantity;
    }

    /**
     * Applies a payment result. Returns false if the order was already settled,
     * so a redelivered message never flips a final status.
     */
    public boolean applyPaymentResult(boolean approved, String reason) {
        if (status != OrderStatus.PENDING_PAYMENT) {
            return false;
        }
        status = approved ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;
        statusReason = reason;
        updatedAt = Instant.now();
        return true;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        isNew = false;
    }

    @Override
    public UUID getId() {
        return id;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public long getTotalCents() {
        return totalCents;
    }

    public String getCurrency() {
        return currency;
    }

    public String getStatusReason() {
        return statusReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }
}

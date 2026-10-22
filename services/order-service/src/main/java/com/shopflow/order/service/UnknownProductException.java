package com.shopflow.order.service;

public class UnknownProductException extends RuntimeException {

    public UnknownProductException(long productId) {
        super("product " + productId + " does not exist");
    }
}

package com.shopflow.order.service;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(long productId, int requested, int available) {
        super("product " + productId + ": requested " + requested + ", only " + available + " in stock");
    }
}

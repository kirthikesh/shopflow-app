package com.shopflow.order.product;

import java.util.Optional;

public interface ProductClient {

    /**
     * Looks up a product by id.
     *
     * @return empty if the product does not exist
     * @throws ProductServiceUnavailableException if the product service cannot be reached
     */
    Optional<ProductInfo> findById(long productId);
}

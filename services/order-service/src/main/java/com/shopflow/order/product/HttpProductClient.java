package com.shopflow.order.product;

import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class HttpProductClient implements ProductClient {

    private final RestClient restClient;

    public HttpProductClient(@Value("${shopflow.product-service-url}") String baseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(3));
        // Plain Spring Framework builder: picks up Jackson from the classpath and needs
        // no extra Boot starter.
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    @Override
    public Optional<ProductInfo> findById(long productId) {
        try {
            ProductInfo product = restClient.get()
                    .uri("/products/{id}", productId)
                    .retrieve()
                    .body(ProductInfo.class);
            return Optional.ofNullable(product);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (RestClientException e) {
            throw new ProductServiceUnavailableException("product service call failed", e);
        }
    }
}

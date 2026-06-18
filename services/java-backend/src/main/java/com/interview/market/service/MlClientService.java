package com.interview.market.service;

import com.interview.market.model.PredictionRequest;
import com.interview.market.model.PredictionResponse;
import com.interview.market.model.WhatIfRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Client for the Python ML service.
 * Uses RestTemplate for a simple, reliable HTTP call.
 */
@Service
public class MlClientService {

    private static final Logger logger = LoggerFactory.getLogger(MlClientService.class);

    private final RestTemplate restTemplate;
    private final String mlServiceUrl;

    public MlClientService(@Value("${ml.service.url}") String mlServiceUrl) {
        this.restTemplate = new RestTemplate();
        this.mlServiceUrl = mlServiceUrl.endsWith("/") ? mlServiceUrl.substring(0, mlServiceUrl.length() - 1) : mlServiceUrl;
    }

    /**
     * Predict the price for a hypothetical property.
     *
     * @param request the property features
     * @return predicted price
     * @throws IllegalStateException if the ML service is unreachable
     */
    public double predict(WhatIfRequest request) {
        PredictionRequest payload = new PredictionRequest(request);
        logger.debug("Calling ml-service /predict at {} with request: {}", mlServiceUrl, payload);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<PredictionRequest> entity = new HttpEntity<>(payload, headers);

        try {
            PredictionResponse response = restTemplate.postForObject(
                    mlServiceUrl + "/predict",
                    entity,
                    PredictionResponse.class
            );

            if (response == null) {
                throw new IllegalStateException("ML service returned empty response");
            }
            return response.getPredictedPrice();
        } catch (RestClientException e) {
            logger.error("Failed to call ml-service /predict", e);
            throw new IllegalStateException("ML service is unavailable", e);
        }
    }
}

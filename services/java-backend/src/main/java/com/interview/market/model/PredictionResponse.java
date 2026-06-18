package com.interview.market.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response body received from the ml-service /predict endpoint.
 */
public class PredictionResponse {

    @JsonProperty("predicted_price")
    private double predictedPrice;

    public double getPredictedPrice() {
        return predictedPrice;
    }

    public void setPredictedPrice(double predictedPrice) {
        this.predictedPrice = predictedPrice;
    }
}

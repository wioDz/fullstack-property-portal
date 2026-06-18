package com.interview.market.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request body sent to the ml-service /predict endpoint.
 * Field names must exactly match the JSON keys expected by the Python API,
 * which uses snake_case. @JsonProperty maps Java camelCase fields to snake_case.
 */
public class PredictionRequest {

    @JsonProperty("square_footage")
    private double squareFootage;

    @JsonProperty("bedrooms")
    private double bedrooms;

    @JsonProperty("bathrooms")
    private double bathrooms;

    @JsonProperty("year_built")
    private int yearBuilt;

    @JsonProperty("lot_size")
    private double lotSize;

    @JsonProperty("distance_to_city_center")
    private double distanceToCityCenter;

    @JsonProperty("school_rating")
    private double schoolRating;

    public PredictionRequest() {
    }

    public PredictionRequest(WhatIfRequest source) {
        this.squareFootage = source.getSquareFootage();
        this.bedrooms = source.getBedrooms();
        this.bathrooms = source.getBathrooms();
        this.yearBuilt = source.getYearBuilt();
        this.lotSize = source.getLotSize();
        this.distanceToCityCenter = source.getDistanceToCityCenter();
        this.schoolRating = source.getSchoolRating();
    }

    public double getSquareFootage() {
        return squareFootage;
    }

    public void setSquareFootage(double squareFootage) {
        this.squareFootage = squareFootage;
    }

    public double getBedrooms() {
        return bedrooms;
    }

    public void setBedrooms(double bedrooms) {
        this.bedrooms = bedrooms;
    }

    public double getBathrooms() {
        return bathrooms;
    }

    public void setBathrooms(double bathrooms) {
        this.bathrooms = bathrooms;
    }

    public int getYearBuilt() {
        return yearBuilt;
    }

    public void setYearBuilt(int yearBuilt) {
        this.yearBuilt = yearBuilt;
    }

    public double getLotSize() {
        return lotSize;
    }

    public void setLotSize(double lotSize) {
        this.lotSize = lotSize;
    }

    public double getDistanceToCityCenter() {
        return distanceToCityCenter;
    }

    public void setDistanceToCityCenter(double distanceToCityCenter) {
        this.distanceToCityCenter = distanceToCityCenter;
    }

    public double getSchoolRating() {
        return schoolRating;
    }

    public void setSchoolRating(double schoolRating) {
        this.schoolRating = schoolRating;
    }
}

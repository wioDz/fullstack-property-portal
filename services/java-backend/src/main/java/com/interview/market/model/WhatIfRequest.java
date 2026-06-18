package com.interview.market.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for the what-if analysis endpoint.
 * Describes a hypothetical property and returns its predicted price from the ML model.
 * @JsonProperty annotations allow the frontend to send snake_case keys.
 */
public class WhatIfRequest {

    @NotNull
    @Min(1)
    @JsonProperty("square_footage")
    private Double squareFootage;

    @NotNull
    @Min(0)
    @JsonProperty("bedrooms")
    private Double bedrooms;

    @NotNull
    @Min(0)
    @JsonProperty("bathrooms")
    private Double bathrooms;

    @NotNull
    @Min(1800)
    @Max(2100)
    @JsonProperty("year_built")
    private Integer yearBuilt;

    @NotNull
    @Min(1)
    @JsonProperty("lot_size")
    private Double lotSize;

    @NotNull
    @Min(0)
    @JsonProperty("distance_to_city_center")
    private Double distanceToCityCenter;

    @NotNull
    @Min(0)
    @Max(10)
    @JsonProperty("school_rating")
    private Double schoolRating;

    public Double getSquareFootage() {
        return squareFootage;
    }

    public void setSquareFootage(Double squareFootage) {
        this.squareFootage = squareFootage;
    }

    public Double getBedrooms() {
        return bedrooms;
    }

    public void setBedrooms(Double bedrooms) {
        this.bedrooms = bedrooms;
    }

    public Double getBathrooms() {
        return bathrooms;
    }

    public void setBathrooms(Double bathrooms) {
        this.bathrooms = bathrooms;
    }

    public Integer getYearBuilt() {
        return yearBuilt;
    }

    public void setYearBuilt(Integer yearBuilt) {
        this.yearBuilt = yearBuilt;
    }

    public Double getLotSize() {
        return lotSize;
    }

    public void setLotSize(Double lotSize) {
        this.lotSize = lotSize;
    }

    public Double getDistanceToCityCenter() {
        return distanceToCityCenter;
    }

    public void setDistanceToCityCenter(Double distanceToCityCenter) {
        this.distanceToCityCenter = distanceToCityCenter;
    }

    public Double getSchoolRating() {
        return schoolRating;
    }

    public void setSchoolRating(Double schoolRating) {
        this.schoolRating = schoolRating;
    }
}
